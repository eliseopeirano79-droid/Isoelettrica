"""Estrae da Z-Anatomy (Startup.blend, revisione 2b652413) lo scheletro toracico e i visceri di contesto
per il localizzatore del laboratorio Eco. Stessa trasformazione di prototipo-cuore/export-source.py:
coste, sterno e cuore restano nella posizione relativa dell'atlante.
Uso: python3 export-torace.py /percorso/Startup.blend /cartella/uscita   (bpy come modulo, oppure blender --background --python)"""
import bpy, json, sys, re
from mathutils import Matrix, Vector
from pathlib import Path
args = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else sys.argv[1:]
src, out = Path(args[0]).resolve(), Path(args[1]).resolve(); out.mkdir(exist_ok=True, parents=True)
bpy.ops.wm.open_mainfile(filepath=str(src), load_ui=False, use_scripts=False)
transform = Matrix.Scale(20, 4) @ Matrix.Translation(Vector((-.022, .028, -1.30)))   # identica al cuore

def mesh_di(coll, gruppo, minv=60, escludi=None):
    c = bpy.data.collections[coll]
    return [(o, gruppo) for o in c.all_objects if o.type == 'MESH' and len(o.data.vertices) >= minv and not (escludi and re.search(escludi, o.name, re.I))]
parti = []
parti += [(o, 'osso') for o, _ in mesh_di('Ribs', 'osso')]
parti += mesh_di('Costal cartilages', 'cartilagine')
parti += mesh_di('Sternum', 'osso')
parti += mesh_di('Thoracic vertebrae', 'vertebra')
for n in ['Clavicle.l', 'Clavicle.r', 'Scapula.l', 'Scapula.r']: parti.append((bpy.data.objects[n], 'osso'))
parti += mesh_di('Lungs', 'polmone')
parti += [(o, 'fegato') for o, _ in mesh_di('Liver', 'fegato')]
parti.append((bpy.data.objects['Diaphragm'], 'diaframma'))
PELLE = r'^(pectoral|presternal|mammary|inframammary|infraclavicular|deltopectoral|lateral region of (thorax|abdomen|neck)|epigastric|hypochondriac|umbilical|hypogastric|scapular|interscapular|infrascapular|vertebral region|lumbar|posterior region of neck|carotid|muscular triangle|sternocleidomastoid|greater supra|submandibular|submental|deltoid region|frontal|parietal|temporal|occipital|orbital|nasal|oral|buccal|zygomatic|infra-orbital|mental region|parotideo|mastoid|auricular region)'
parti += [(o, 'pelle') for o in bpy.data.collections['9: Regions of human body'].all_objects if o.type == 'MESH' and len(o.data.vertices) >= 20 and re.search(PELLE, o.name, re.I)]
bersaglio = {'osso': 900, 'vertebra': 350, 'cartilagine': 300, 'polmone': 900, 'fegato': 500, 'diaframma': 1200, 'pelle': 4000}

dg = bpy.context.evaluated_depsgraph_get(); oggetti = []; inventario = []
for s, g in parti:
    s.hide_set(False); s.hide_viewport = False
    dg.update(); nv = len(s.evaluated_get(dg).data.vertices)      # dopo i modificatori dell'atlante (suddivisioni)
    r = 0.35 if g == 'pelle' else min(1, bersaglio[g] / max(1, nv))
    if r < 1: m = s.modifiers.new('riduzione', 'DECIMATE'); m.ratio = r
    dg.update(); ev = s.evaluated_get(dg)
    me = bpy.data.meshes.new_from_object(ev, preserve_all_data_layers=False, depsgraph=dg)
    if not len(me.polygons): continue
    me.transform(transform @ s.matrix_world); me.materials.clear()
    for p in me.polygons: p.use_smooth = True
    nome = s.name; s.name = nome + ' (sorgente)'   # evita i suffissi .001 di Blender sul nome esportato
    o = bpy.data.objects.new(nome, me); o['layer'] = g; oggetti.append(o)
    inventario.append({'name': s.name, 'layer': g, 'vertici_origine': len(s.data.vertices), 'vertici': len(me.vertices)})
sc = bpy.data.scenes.new('Torace'); bpy.context.window.scene = sc
for o in oggetti: sc.collection.objects.link(o); o.select_set(True)
bpy.context.view_layer.objects.active = oggetti[0]
bpy.ops.export_scene.gltf(filepath=str(out / 'torace-z-anatomy.glb'), export_format='GLB', use_selection=True, export_animations=False, export_cameras=False, export_lights=False,
    export_materials='NONE', export_extras=True, export_yup=True, export_normals=False, export_texcoords=False,
    export_copyright='BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan; Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0. Adapted for Isoelettrica: extracted, transformed, decimated. CC BY-SA 4.0.')
json.dump({'source': 'https://github.com/Z-Anatomy/Models-of-human-anatomy', 'revision': '2b652413b1116c9119e616eabc1e63af3cc6267d', 'transform': 'Scale(20) @ Translation(-0.022, 0.028, -1.30), Z-up → Y-up (come heart-z-anatomy.glb)', 'parts': inventario}, open(out / 'torace-parts.json', 'w'), indent=1, ensure_ascii=False)
print('ESPORTATI', len(inventario), 'oggetti', sum(x['vertici'] for x in inventario), 'vertici', (out / 'torace-z-anatomy.glb').stat().st_size, 'byte')
