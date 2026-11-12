#!/usr/bin/env python3
"""Derive an illustrative tissue volume from the existing atlas.

Needs NumPy and SciPy only at build time, never at runtime. Triangles are sampled
along three orthogonal axes. Rays with odd intersection counts are discarded;
the majority of the remaining parity tests reconstructs tissue. Open junctions
are therefore approximations, explicitly documented in the resulting metadata.
No patient volume, acoustic wave solver or physiological length calibration.
"""
import sys, json, struct, hashlib, time
from pathlib import Path
import numpy as np
from scipy.ndimage import gaussian_filter
from scipy.spatial import cKDTree

src, target = map(Path, sys.argv[1:3])
meshes = json.loads(src.read_text())
step = 0.024
points = np.concatenate([np.asarray(m['positions']).reshape(-1, 3) for m in meshes])
lo = np.floor((points.min(0) - .12) / step) * step
hi = np.ceil((points.max(0) + .12) / step) * step
dims = np.ceil((hi-lo)/step).astype(int) + 1
shape = tuple(dims)
votes = np.zeros(shape, np.uint8)
valid = np.zeros(shape, np.uint8)
surface_points, surface_labels, definitions = [], [], []
triangles = []
for k, m in enumerate(meshes):
    p = np.asarray(m['positions']).reshape(-1, 3)
    f = np.asarray(m['indices'], dtype=int).reshape(-1, 3)
    t = p[f]
    definitions.append(dict(m['definition'], name=m['name'], layer=m['layer']))
    surface_points.extend([p, t.mean(1)])
    surface_labels.extend([np.full(len(p), k+1, np.uint8), np.full(len(t), k+1, np.uint8)])
    if m['layer'] == 'wall': triangles.extend(t)
triangles = np.asarray(triangles)
statistics = []
for axis in range(3):
    started = time.monotonic()
    uv = [a for a in range(3) if a != axis]
    diff = np.zeros(shape, np.uint8)
    for t in triangles:
        a,b,c = t[:,uv]
        det = (b[1]-c[1])*(a[0]-c[0]) + (c[0]-b[0])*(a[1]-c[1])
        if abs(det) < 1e-12: continue
        low = np.maximum(0,np.ceil((t[:,uv].min(0)-lo[uv])/step).astype(int))
        high = np.minimum(dims[uv]-1,np.floor((t[:,uv].max(0)-lo[uv])/step).astype(int))
        if np.any(low>high): continue
        ii,jj = np.meshgrid(np.arange(low[0],high[0]+1),np.arange(low[1],high[1]+1),indexing='ij')
        x,y = lo[uv[0]]+ii*step,lo[uv[1]]+jj*step
        wa = ((b[1]-c[1])*(x-c[0])+(c[0]-b[0])*(y-c[1]))/det
        wb = ((c[1]-a[1])*(x-c[0])+(a[0]-c[0])*(y-c[1]))/det
        wc = 1-wa-wb
        keep = (wa>=0)&(wb>=0)&(wc>=0)
        if not keep.any(): continue
        kk = np.clip(np.ceil((wa[keep]*t[0,axis]+wb[keep]*t[1,axis]+wc[keep]*t[2,axis]-lo[axis])/step).astype(int),0,dims[axis]-1)
        ix = [None]*3; ix[axis]=kk;ix[uv[0]]=ii[keep];ix[uv[1]]=jj[keep]
        np.add.at(diff,tuple(ix),1)
    parity = (np.cumsum(diff,axis=axis,dtype=np.uint16)&1).astype(np.uint8)
    good = np.take(parity,-1,axis=axis)==0
    good = np.expand_dims(good,axis)
    votes += parity*good; valid += good
    statistics.append({'axis':axis,'closed_ray_fraction':round(float(good.mean()),5)})
    print('axis',axis,'seconds',round(time.monotonic()-started,1),flush=True)

tissue = (votes > valid/2) & (valid>0)
density = gaussian_filter(tissue.astype(np.float32),.65)
tree = cKDTree(np.concatenate(surface_points))
ids = np.concatenate(surface_labels)
labels = np.zeros(shape,np.uint8)
for ix in range(dims[0]):
    yy,zz = np.meshgrid(np.arange(dims[1]),np.arange(dims[2]),indexing='ij')
    q = np.column_stack([np.full(yy.size,lo[0]+ix*step),lo[1]+yy.ravel()*step,lo[2]+zz.ravel()*step])
    distance, nearest = tree.query(q)
    ll = ids[nearest].reshape(yy.shape)
    labels[ix] = ll
    # Vessel meshes in this atlas mix solid lumen models and wall surfaces.
    # Never fill their solid interiors as myocardium: use a declared surface
    # shell for their echo appearance. Bound uncertain wall closures by their
    # distance from actual source geometry.
    distance = distance.reshape(yy.shape)
    density[ix] *= np.clip((.19-distance)/.045,0,1)
    vessel_ids = np.array([i+1 for i,d in enumerate(definitions) if d['layer']=='vessels'])
    vessel = np.isin(ll,vessel_ids)
    density[ix][vessel] = np.maximum(density[ix][vessel],np.exp(-(distance[vessel]/.024)**2)*.9)
    # The atlas valve surfaces can be thinner than a voxel. Retain their
    # surface, with a declared one-voxel display thickness.
    valve_ids = np.array([i+1 for i,d in enumerate(definitions) if d['layer']=='valves'])
    thin = np.isin(ll,valve_ids) & (distance<step*.75)
    density[ix][thin] = np.maximum(density[ix][thin],.85)

# Runtime layout: x fastest, then y, then z. RLE pairs use a uint16 run length
# and uint8 density + semantic label. The format has no external dependencies.
dens = np.round(np.clip(density,0,1)*255).astype(np.uint8).transpose(2,1,0).ravel()
lab = labels.transpose(2,1,0).ravel(); lab[dens<3]=0
pairs = dens.astype(np.uint16) | (lab.astype(np.uint16)<<8)
starts = np.r_[0,np.flatnonzero(pairs[1:]!=pairs[:-1])+1,len(pairs)]
body=bytearray()
for a,b in zip(starts[:-1],starts[1:]):
    n=int(b-a); value=int(pairs[a])
    while n:
        count=min(n,65535);body.extend(struct.pack('<HBB',count,value&255,value>>8));n-=count
meta={'version':1,'dims':dims.tolist(),'min':lo.tolist(),'step':step,'structures':definitions,
      'source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'method':'three-axis wall parity consensus; open junctions approximated and bounded by source surface distance; vessels as surface shells; one-voxel valve surfaces',
      'units':'atlas, not clinical length','axes':statistics,'voxels':int(np.prod(dims)),'tissue_fraction':round(float(tissue.mean()),6),
      'license':'Z-Anatomy CC BY-SA 4.0 / BodyParts3D CC BY-SA 2.1 JP; Isoelettrica derived educational volume'}
header=json.dumps(meta,ensure_ascii=False,separators=(',',':')).encode()
target.parent.mkdir(parents=True,exist_ok=True)
target.write_bytes(b'EVOL'+struct.pack('<I',len(header))+header+body)
target.with_suffix('.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
np.savez_compressed(src.parent/'volume-inspect.npz',density=density,labels=labels,lo=lo,step=step)
print('volume',dims.tolist(),'bytes',target.stat().st_size,'tissue',meta['tissue_fraction'],flush=True)
