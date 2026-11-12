#!/usr/bin/env python3
"""Static upper-body derivative of our MakeHuman CC0 patient; no new source asset."""
import json, struct, sys
from pathlib import Path
import numpy as np
from scipy.ndimage import distance_transform_edt

src, out = map(Path,sys.argv[1:3])
b=src.read_bytes(); n=struct.unpack_from('<I',b,4)[0]; h=json.loads(b[8:8+n]); base=8+n
v=h['varianti']['M']['pos']; p=np.frombuffer(b,dtype='<f4',offset=base+v[0],count=v[1]//4).reshape(-1,3).copy()
p[:,0]*=1.5; p[:,1]=(p[:,1]-3.7)*1.5; p[:,2]=(p[:,2]-.75)*1.65
# Display registration around the real thoracic cage. This is an affine fit of
# an independent MakeHuman surface, not the atlas subject's skin.
p[:,0]=p[:,0]*1.50-.44; p[:,2]=p[:,2]*1.55+.55
groups={}; vertices=p.tolist(); boundary={}; cut_y=-5.3
def intersect(a,b):
    key=tuple(sorted((int(a),int(b))))
    if key not in boundary:
        pa,pb=p[a],p[b]; q=pa+(pb-pa)*((cut_y-pa[1])/(pb[1]-pa[1]));q[1]=cut_y
        boundary[key]=len(vertices);vertices.append(q.tolist())
    return boundary[key]
for name in ['pelle','camice','capelliCorti','occhi']:
    off,size=h['gruppi'][name]; f=np.frombuffer(b,dtype='<u2',offset=base+off,count=size//2).reshape(-1,3)
    clipped=[]
    for tri in f:
        polygon=[]
        for a,c in zip(np.roll(tri,1),tri):
            inside_a=p[a,1]>=cut_y;inside_c=p[c,1]>=cut_y
            if inside_a!=inside_c:polygon.append(intersect(a,c))
            if inside_c:polygon.append(int(c))
        for i in range(1,len(polygon)-1):clipped.append([polygon[0],polygon[i],polygon[i+1]])
    groups[name]=np.asarray(clipped,dtype=np.uint16)
p=np.asarray(vertices,dtype=np.float32)
# The scalp is also skin; the second draw is a slightly offset hair cap.
skin=np.concatenate([groups[k] for k in ['pelle','camice','capelliCorti']])
used=np.unique(np.concatenate([skin.ravel(),groups['occhi'].ravel()])); remap=np.zeros(len(p),np.uint16);remap[used]=np.arange(len(used));p0=p;p=p[used]
arrays=[p.astype('<f4').tobytes(),remap[skin].astype('<u2').tobytes(),remap[groups['capelliCorti']].astype('<u2').tobytes(),remap[groups['occhi']].astype('<u2').tobytes()]
step=.045; lo=np.array([-4.5,-5.3]); dims=np.array([190,220]); grid=np.full(tuple(dims),-99,dtype=np.float32)
for t in p0[skin]:
    a,bb,c=t[:,:2];det=(bb[1]-c[1])*(a[0]-c[0])+(c[0]-bb[0])*(a[1]-c[1])
    if abs(det)<1e-12:continue
    low=np.maximum(0,np.ceil((t[:,:2].min(0)-lo)/step).astype(int));high=np.minimum(dims-1,np.floor((t[:,:2].max(0)-lo)/step).astype(int))
    if np.any(low>high):continue
    ix,iy=np.meshgrid(np.arange(low[0],high[0]+1),np.arange(low[1],high[1]+1),indexing='ij');x=lo[0]+ix*step;y=lo[1]+iy*step
    wa=((bb[1]-c[1])*(x-c[0])+(c[0]-bb[0])*(y-c[1]))/det;wb=((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det;wc=1-wa-wb
    keep=(wa>=0)&(wb>=0)&(wc>=0);z=wa*t[0,2]+wb*t[1,2]+wc*t[2,2]
    np.maximum.at(grid,(ix[keep],iy[keep]),z[keep])
valid=grid>-90
nearest=distance_transform_edt(~valid,return_distances=False,return_indices=True)
filled=grid[tuple(nearest)]
arrays += [filled.T.astype('<f4').tobytes(),valid.T.astype('u1').tobytes()]
meta={'version':1,'vertices':len(p),'skin_indices':skin.size,'hair_indices':groups['capelliCorti'].size,'eye_indices':groups['occhi'].size,
      'surface':{'min':lo.tolist(),'dims':dims.tolist(),'step':step},'license':'MakeHuman base and macro target, CC0 1.0; derived Isoelettrica display torso, illustrative heart registration'}
header=json.dumps(meta,separators=(',',':')).encode();header+=b' '*((-len(header))%4)
out.write_bytes(b'EBOD'+struct.pack('<I',len(header))+header+b''.join(arrays))
print('body',len(p),'vertices;',out.stat().st_size,'bytes')
