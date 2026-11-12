"""Extract a registered thoracic skeleton from the same pinned atlas as the heart.

blender --factory-startup -b -Y --python tools/build-echo-thorax.py -- Startup.blend ecocardio/thorax.bin
Do not enable auto-execution in the downloaded .blend. Source revision and license
are recorded in the binary and companion JSON. No source mesh is modified.
"""
import bpy, sys, re, json, struct, hashlib
from pathlib import Path
from mathutils import Vector

source, target = map(Path, sys.argv[sys.argv.index('--')+1:])
numbers = ['First','Second','Third','Fourth','Fifth','Sixth','Seventh','Eighth','Ninth','Tenth','Eleventh','Twelfth']
rib_names = {f'{n} rib.{side}':(i+1,side) for i,n in enumerate(numbers) for side in ['l','r']}
cart_names = {f'Costal cartilage of {n.lower()} rib.{side}':(i+1,side) for i,n in enumerate(numbers[:10]) for side in ['l','r']}
fixed = {'Manubrium of sternum':('manubrium_sterni','Manubrio dello sterno'), 'Body of sternum':('corpus_sterni','Corpo dello sterno'), 'Xiphoid process':('processus_xiphoideus','Processo xifoideo'), 'Clavicle.l':('clavicula_sinistra','Clavicola sinistra'), 'Clavicle.r':('clavicula_dextra','Clavicola destra')}
for n in range(1,13):fixed[f'Vertebra T{n}']=(f'vertebra_thoracica_{n}',f'Vertebra T{n}')
for n in range(1,12):fixed[f'Intervertebral disc T{n}-T{n+1}']=(f'discus_intervertebralis_T{n}_T{n+1}',f'Disco T{n}–T{n+1}')
with bpy.data.libraries.load(str(source),link=False) as (src,dst):
    vertebra_names=[n for n in src.objects if re.search(r'(?i)vertebr',n) and not re.search(r'\.[a-z]$',n)]
    print('VERTEBRA_CANDIDATES',vertebra_names,flush=True)
    dst.objects=[n for n in src.objects if n in rib_names or n in cart_names or n in fixed or n in ['Right atrium','Left ventricle']]
for obj in dst.objects:
    if obj: bpy.context.collection.objects.link(obj)
bpy.context.view_layer.update()
payload=[];parts=[];offset=0;checks={}
for obj in sorted(dst.objects,key=lambda o:o.name):
    if obj.type!='MESH':continue
    mesh=obj.evaluated_get(bpy.context.evaluated_depsgraph_get()).data if obj.name in ['Right atrium','Left ventricle'] else obj.data
    pts=[obj.matrix_world @ v.co for v in mesh.vertices]
    # Exactly the existing heart export transform: metres in Blender, Y-up in glTF.
    points=[(p.x*20-.44,p.z*20-26,-p.y*20-.56) for p in pts]
    if obj.name in ['Right atrium','Left ventricle']:
        checks[obj.name]={'min':[min(p[k] for p in points) for k in range(3)],'max':[max(p[k] for p in points) for k in range(3)]}
        continue
    mesh.calc_loop_triangles()
    indices=[v for t in mesh.loop_triangles for v in t.vertices]
    if obj.name in rib_names:
        n,side=rib_names[obj.name];sid='sinistra' if side=='l' else 'dextra';ital='sinistra' if side=='l' else 'destra'
        ident=f'costa_{n}_{sid}';label=f'{n}ª costa {ital}';kind='rib'
    elif obj.name in cart_names:
        n,side=cart_names[obj.name];sid='sinistra' if side=='l' else 'dextra';ital='sinistra' if side=='l' else 'destra'
        ident=f'cartilago_costalis_{n}_{sid}';label=f'Cartilagine costale {n}ª {ital}';kind='cartilage'
    else:
        ident,label=fixed[obj.name];kind='clavicle' if 'Clavicle' in obj.name else 'vertebra' if obj.name.startswith('Vertebra') else 'disc' if obj.name.startswith('Intervertebral') else 'sternum'
    quantized=[round(v/.0005) for p in points for v in p]
    assert max(map(abs,quantized))<32768 and len(points)<65536
    raw=struct.pack('<%dh'%len(quantized),*quantized)+struct.pack('<%dH'%len(indices),*indices)
    parts.append(dict(id=ident,name=obj.name,label=label,kind=kind,vertices=len(points),indices=len(indices),offset=offset,bytes=len(raw)))
    offset+=len(raw);payload.append(raw)
meta=dict(version=2,positionStep=.0005,source='https://github.com/Z-Anatomy/Models-of-human-anatomy',revision='2b652413b1116c9119e616eabc1e63af3cc6267d',license='Z-Anatomy CC BY-SA 4.0; BodyParts3D CC BY-SA 2.1 Japan; derivative CC BY-SA 4.0',transform={'scale':20,'axes':['x','z','-y'],'translation':[-.44,-26,-.56]},registrationChecks=checks,parts=parts)
header=json.dumps(meta,separators=(',',':'),ensure_ascii=False).encode();header+=b' '*((-len(header))%4)
target.write_bytes(b'ETHX'+struct.pack('<I',len(header))+header+b''.join(payload))
meta['sha256']=hashlib.sha256(target.read_bytes()).hexdigest()
target.with_suffix('.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2)+'\n')
print('EXPORTED',len(parts),'parts',sum(p['vertices'] for p in parts),'vertices',target.stat().st_size,'bytes',checks,flush=True)
