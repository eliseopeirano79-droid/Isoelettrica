import bpy,json,math,sys,bmesh
from mathutils.geometry import interpolate_bezier
from mathutils import Vector,Matrix
from pathlib import Path
# Usage: blender --background --factory-startup --disable-autoexec --python
# export-source.py -- /path/to/Startup.blend /path/to/output-directory
args=sys.argv[sys.argv.index('--')+1:]
if len(args)!=2:raise SystemExit('Expected: Startup.blend output-directory')
source_file=Path(args[0]).resolve()
out=Path(args[1]).resolve()
out.mkdir(exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(source_file),load_ui=False,use_scripts=False)
parts=[]
for cname,group in [('Heart','heart'),('Arteries of heart','coronaries'),('Cardiac veins','veins')]:
 for o in bpy.data.collections[cname].all_objects:
  if o.type in {'MESH','CURVE'} and '?' not in o.name:parts.append((o,group))
vessels=['Ascending aorta','Aortic arch','Pulmonary trunk','Superior vena cava','Inferior vena cava (thoracic part)','Left pulmonary artery','Right pulmonary artery','Left superior pulmonary vein','Left inferior pulmonary vein','Right superior pulmonary vein','Right inferior pulmonary vein']
for name in vessels:
 o=bpy.data.objects.get(name)
 if o and o.type in {'MESH','CURVE'}:parts.append((o,'vessels'))
print('VESSEL CANDIDATES',[o.name for o in bpy.data.collections['5: Cardiovascular system'].all_objects if o.type in {'MESH','CURVE'} and any(k in o.name.lower() for k in ['arch','pulmonary arter','pulmonary vein','vena cava'])])
# Geometry only: do not export source scripts, expressions, linked libraries or UI.
# Source Z-up, anterior -Y; glTF conversion produces app's X-left,Y-up,Z-anterior.
# Fixed translation/scale maintains original relative anatomy without mirroring.
dg=bpy.context.evaluated_depsgraph_get()
meshes=[]
manifest=[]
transform=Matrix.Scale(20,4)@Matrix.Translation(Vector((-.022, .028,-1.30)))
arterial_paths=[]
for source,group in parts:
 if group=='coronaries' and source.type=='CURVE':
  matrix=transform@source.matrix_world
  lines=[]
  for spline in source.data.splines:
   pts=[]
   if spline.type=='BEZIER':
    bp=spline.bezier_points
    for i in range(len(bp)-1):
     pts.extend(interpolate_bezier(bp[i].co,bp[i].handle_right,bp[i+1].handle_left,bp[i+1].co,12)[:-1])
    if len(bp):pts.append(bp[-1].co)
   else:pts=[Vector(x.co[:3]) for x in spline.points]
   mapped=[]
   for q in pts:
    v=matrix@q;mapped.append([v.x,v.z,-v.y])
   if len(mapped)>1:lines.append(mapped)
  arterial_paths.append({'name':source.name,'splines':lines})

 source.hide_set(False); source.hide_viewport=False
 if source.type=='CURVE':
  source.data.resolution_u=6
  source.data.bevel_resolution=3
 dg.update()
 evaluated=source.evaluated_get(dg)
 mesh=bpy.data.meshes.new_from_object(evaluated,preserve_all_data_layers=False,depsgraph=dg)
 if len(mesh.polygons)==0:continue
 mesh.transform(transform@source.matrix_world)
 if source.name=='Inferior vena cava (thoracic part)':
  bm=bmesh.new();bm.from_mesh(mesh)
  bmesh.ops.bisect_plane(bm,geom=list(bm.verts)+list(bm.edges)+list(bm.faces),plane_co=(0,0,-1.7),plane_no=(0,0,1),clear_inner=True)
  bm.to_mesh(mesh);bm.free()
 mesh.materials.clear()
 for p in mesh.polygons:p.use_smooth=True
 o=bpy.data.objects.new(source.name,mesh)
 o['sourceName']=source.name
 o['layer']=group
 meshes.append(o)
 manifest.append({'name':source.name,'layer':group,'vertices':len(mesh.vertices),'faces':len(mesh.polygons)})
scene=bpy.data.scenes.new('Heart export')
bpy.context.window.scene=scene
for o in meshes:scene.collection.objects.link(o);o.select_set(True)
bpy.context.view_layer.objects.active=meshes[0]
bpy.ops.export_scene.gltf(filepath=str(out/'heart-z-anatomy.glb'),export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_materials='NONE',export_extras=True,export_yup=True,export_copyright='BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan; Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0. Adapted for Isoelettrica: extracted, transformed, curves tessellated. CC BY-SA 4.0.')
json.dump({'source':'https://github.com/Z-Anatomy/Models-of-human-anatomy','revision':'2b652413b1116c9119e616eabc1e63af3cc6267d','parts':manifest},open(out/'heart-parts.json','w'),indent=2)
print('EXPORTED',len(manifest),'objects',sum(x['vertices'] for x in manifest),'vertices', (out/'heart-z-anatomy.glb').stat().st_size,'bytes')

json.dump(arterial_paths,open(out/'coronary-paths.json','w'),separators=(',',':'))
