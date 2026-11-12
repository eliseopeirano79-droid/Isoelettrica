# Rendering CPU di una scena esportata da esporta-paziente.cjs.
# Uso: blender -b --factory-startup --python tools/render-paziente.py -- scena.json vista.png [--final]
# Usa geometria, posa, camera e monitor del modulo; la luce Blender è di verifica,
# perciò l'immagine non va descritta come uno screenshot WebGL o Safari.
import bpy, bmesh, sys, json, math, base64, os
from mathutils import Quaternion,Vector
args=sys.argv[sys.argv.index('--')+1:];data=json.load(open(args[0]));out=args[1]
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
# Three coordinates and the camera are transformed by the same rotation.
def xyz(p):return (p[0],-p[2],p[1])
for i,mesh in enumerate(data['meshes']):
 p=mesh['vertices'];verts=[xyz(p[j:j+3]) for j in range(0,len(p),3)];ix=mesh['indices'];faces=[];mi=[]
 for g in mesh['groups']:
  m=g.get('materialIndex',0)
  if not mesh['mats'][m]['visible'] or mesh['mats'][m]['opacity']<.02:continue
  for j in range(g['start'],min(g['start']+g['count'],len(ix)),3):faces.append(ix[j:j+3]);mi.append(m)
 if not faces:continue
 geo=bpy.data.meshes.new('geo');geo.from_pydata(verts,[],faces);geo.update();ob=bpy.data.objects.new(mesh['name'] or 'mesh'+str(i),geo);bpy.context.collection.objects.link(ob)
 for m in mesh['mats']:
  mat=bpy.data.materials.new(m['name'] or 'material');mat.use_nodes=True;bs=mat.node_tree.nodes.get('Principled BSDF');c=m['color'];bs.inputs['Base Color'].default_value=(*c,1);bs.inputs['Roughness'].default_value=m['roughness'];bs.inputs['Metallic'].default_value=m['metalness']
  if m['opacity']<1:bs.inputs['Alpha'].default_value=m['opacity']
  if m['emission']:bs.inputs['Emission Color'].default_value=(*c,1);bs.inputs['Emission Strength'].default_value=.7
  if m['vertexColors'] and mesh.get('colors'):
   # Multiply the original per-vertex tint by the material skin colour.
   vc=mat.node_tree.nodes.new('ShaderNodeVertexColor');vc.layer_name='Tint';mix=mat.node_tree.nodes.new('ShaderNodeMixRGB');mix.blend_type='MULTIPLY';mix.inputs[0].default_value=1;mix.inputs[2].default_value=(*c,1);mat.node_tree.links.new(vc.outputs['Color'],mix.inputs[1]);mat.node_tree.links.new(mix.outputs[0],bs.inputs['Base Color'])
  if m.get('textureData'):
   imfile=out.replace('.png','-material-'+str(i)+'.png');open(imfile,'wb').write(base64.b64decode(m['textureData'].split(',')[1]));tex=mat.node_tree.nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(imfile,check_existing=False);mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Base Color']);mat.node_tree.links.new(tex.outputs['Color'],bs.inputs['Emission Color']);bs.inputs['Emission Strength'].default_value=.8
  ob.data.materials.append(mat)
 for poly,m in zip(geo.polygons,mi):poly.material_index=m;poly.use_smooth=True
 if mesh.get('uv'):
  uv=geo.uv_layers.new(name='UVMap');coords=mesh['uv']
  for loop in geo.loops:uv.data[loop.index].uv=coords[loop.vertex_index*2:loop.vertex_index*2+2]
 if mesh.get('colors'):
  attr=geo.color_attributes.new(name='Tint',type='FLOAT_COLOR',domain='POINT');cols=mesh['colors']
  for j in range(len(verts)):attr.data[j].color=(*cols[j*3:j*3+3],1)
 if 'Camice' in mesh['name']:
  bm=bmesh.new();bm.from_mesh(geo);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=1e-6);bm.to_mesh(geo);bm.free()
# A neutral ground supports contact shadows, as in the browser scene.
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.012));ground=bpy.context.object;mat=bpy.data.materials.new('background');mat.diffuse_color=(.035,.055,.075,1);ground.data.materials.append(mat)
for name,loc,power,size,c in [('key',(2.2,-2.4,4),180,3,(1,.92,.83)),('fill',(-3,-1,2.4),90,3,(.72,.84,1)),('rim',(0,3,3.8),140,2,(.85,.94,1))]:
 ld=bpy.data.lights.new(name,'AREA');ld.energy=power;ld.shape='DISK';ld.size=size;ld.color=c;ob=bpy.data.objects.new(name,ld);bpy.context.collection.objects.link(ob);ob.location=loc;ob.rotation_euler=(Vector((0,0,.65))-ob.location).to_track_quat('-Z','Y').to_euler()
camd=bpy.data.cameras.new('Camera');cam=bpy.data.objects.new('Camera',camd);bpy.context.collection.objects.link(cam);cam.location=xyz(data['camera']['position']);q=data['camera']['quaternion'];cam.rotation_mode='QUATERNION';cam.rotation_quaternion=Quaternion((1,0,0),math.pi/2)@Quaternion((q[3],q[0],q[1],q[2]));camd.type='PERSP';camd.sensor_fit='VERTICAL';camd.angle_y=math.radians(data['camera']['fov']);scene=bpy.context.scene;scene.camera=cam
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=128 if '--final' in args else 48;scene.cycles.use_denoising=False;scene.render.resolution_x=1200;scene.render.resolution_y=900;scene.render.resolution_percentage=100;scene.world.color=(.14,.14,.14);scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-.6;scene.render.image_settings.file_format='PNG';scene.render.filepath=out;scene.render.film_transparent=False
bpy.ops.wm.save_as_mainfile(filepath=out.replace('.png','.blend')) if '--blend' in args else None
bpy.ops.render.render(write_still=True)
