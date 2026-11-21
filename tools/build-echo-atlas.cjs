// Bake the same registered surfaces used by the anatomy atlas once, off-device.
// The simulator and bedside cases section and display this exact GLB.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const dir = path.resolve(__dirname, '..');
const T = require(path.join(dir, 'three.min.js'));
const atlas = require(path.join(dir, 'atlas-geometry.js'));
const cuffs = require(path.join(dir, 'vascular-cuffs.js'));
const refine = require(path.join(dir, 'anatomy-refinements.js'));
const model = path.join(dir, 'prototipo-cuore');
function load(file) {
  const input = fs.readFileSync(path.join(model, file));
  const jsonSize = input.readUInt32LE(12);
  const source = JSON.parse(input.subarray(20, 20 + jsonSize));
  const binStart = 28 + jsonSize;
  function attribute(id) {
    const a = source.accessors[id], view = source.bufferViews[a.bufferView];
    const Type = { 5123: Uint16Array, 5125: Uint32Array, 5126: Float32Array }[a.componentType];
    const size = a.type === 'VEC3' ? 3 : 1;
    return new T.BufferAttribute(new Type(input.buffer, input.byteOffset + binStart + (view.byteOffset || 0) + (a.byteOffset || 0), a.count * size), size);
  }
  const scene = new T.Group();
  for (const node of source.nodes) {
    if (node.mesh === undefined) continue;
    if (node.matrix || node.translation || node.rotation || node.scale) throw Error('Atlas export requires registered model coordinates');
    const prim = source.meshes[node.mesh].primitives[0], g = new T.BufferGeometry();
    g.setAttribute('position', attribute(prim.attributes.POSITION));
    g.setIndex(attribute(prim.indices));
    const mesh = new T.Mesh(g);
    mesh.name = node.name;
    mesh.userData = { ...node.extras };
    scene.add(mesh);
  }
  return scene;
}
const meshes = atlas.sourceMeshes(load('heart-z-anatomy.glb'));
refine.apply(meshes, atlas.material);
// The two wall surfaces of the caval sleeve meet the right atrium at the
// registered ostium. Continue the lumen through that sleeve to the thoracic cut.
const ra = meshes.find(m => m.userData.sourceName === 'Right atrium');
const svc = meshes.find(m => m.userData.sourceName === 'Superior vena cava');
const cavalCut = cuffs.trim(ra.geometry,new T.Vector3(-.765,.774,-.2),new T.Vector3(0,1,0));
const caval = cuffs.extend(cavalCut,[[-.755,1.10,-.17],[-.732,1.48,-.10]],.251,.227,.065);
ra.geometry = caval.wall;
svc.geometry = caval.vessel;

const treeNames = ['Pulmonary trunk', 'Left pulmonary artery', 'Right pulmonary artery'];
const treeParts = treeNames.map(n => meshes.find(m => m.userData.sourceName === n));
const junction = atlas.junctionMesh();
const pulmonary = require(path.join(dir,'pulmonary-arteries.js'));
treeParts[0].userData.ecoTrunkAxis = pulmonary.mainPoints.slice(1,5);
treeParts[0].geometry = cuffs.merge([...treeParts.map(m => m.geometry), junction.geometry]);
const output = meshes.filter(m => !treeParts.slice(1).includes(m));

const seams = require('./echo-seams.cjs')(T,cuffs);
const find = name => output.find(m => m.userData.sourceName === name);
const lv=find('Left ventricle'),rv=find('Right ventricle'),la=find('Left atrium'),ao=find('Ascending aorta');
for (const [wall, target, other, source] of [
  [la,[.01,-.30,-.63],lv,[.03,-.29,-.64]],
  [ra,[-.68,-.32,.04],rv,[-.65,-.31,.04]],
  [ao,[-.05,.33,-.17],lv,[-.20,.32,-.09]]
]) seams.bridge(wall,seams.at(wall,target),seams.at(other,source));
const walls=[lv,rv,la,ra];
for(const {ring,owners} of seams.boundaries(walls)){
  const size=new T.Box3().setFromPoints(ring).getSize(new T.Vector3()).length();
  if(size<.31 && (owners.length>1 || (owners[0]===lv && ring.length===5)))seams.cap(owners[0],ring);
}
const leaflet=find('Right semilunar leaflet of pulmonary valve');
for(const {ring} of seams.boundaries([leaflet]))if(ring.length===7)seams.cap(leaflet,ring);

// Position-only surfaces keep the download small. Normals are computed once by the client.
function save(output, file) {
  const gltf = {asset: {version:'2.0', generator:'Isoelettrica · atlante Eco', copyright:'Z-Anatomy CC BY-SA 4.0 / BodyParts3D CC BY-SA 2.1 JP · adattamento Isoelettrica CC BY-SA 4.0'}, scene:0, scenes:[{nodes:[]}], nodes:[], meshes:[], accessors:[], bufferViews:[], buffers:[]};
  const chunks = [];
  let byteLength = 0;
  function accessor(array, type, componentType, target, bounds) {
    const length = array.byteLength, view = gltf.bufferViews.length;
    gltf.bufferViews.push({buffer:0, byteOffset:byteLength, byteLength:length, target});
    chunks.push(Buffer.from(array.buffer, array.byteOffset, length));
    const pad = (4 - length % 4) % 4;
    chunks.push(Buffer.alloc(pad));
    byteLength += length + pad;
    return gltf.accessors.push({bufferView:view, componentType, count:array.length / (type === 'VEC3' ? 3 : 1), type, ...bounds}) - 1;
  }
  for (const m of output) {
    const g = m.geometry, name = m.userData.sourceName || m.name;
    g.computeBoundingBox();
    const pos = accessor(g.attributes.position.array, 'VEC3', 5126, 34962, {min:g.boundingBox.min.toArray(), max:g.boundingBox.max.toArray()});
    const indices = g.index.array, idx = accessor(indices,'SCALAR',indices.BYTES_PER_ELEMENT === 4 ? 5125 : 5123,34963);
    const mesh = gltf.meshes.push({name, primitives:[{attributes:{POSITION:pos}, indices:idx}]}) - 1;
    gltf.scenes[0].nodes.push(gltf.nodes.length);
    gltf.nodes.push({name, mesh, extras:{sourceName:name, layer:m.userData.layer, ...(m.userData.ecoTrunkAxis ? {ecoTrunkAxis:m.userData.ecoTrunkAxis} : {})}});
  }
  gltf.buffers.push({byteLength});
  const json = Buffer.from(JSON.stringify(gltf)), padded = (json.length + 3) & ~3;
  const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
  header.write('glTF'); header.writeUInt32LE(2,4); header.writeUInt32LE(28+padded+byteLength,8);
  header.writeUInt32LE(padded,12); header.write('JSON',16);
  binHeader.writeUInt32LE(byteLength); binHeader.write('BIN\0',4);
  fs.writeFileSync(path.join(model,file), Buffer.concat([header,json,Buffer.alloc(padded-json.length,32),binHeader,...chunks]));
}
save(output, 'heart-eco.glb');

const chest = load('torace-z-anatomy.glb').children;
function cleanSkeleton(m) {
  const g=m.geometry, pos=g.attributes.position;
  const vertices=Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i));
  const keys=vertices.map(p=>p.toArray().map(x=>Math.round(x*1e6)).join(','));
  const edge=(a,b)=>keys[a]<keys[b]?keys[a]+'/'+keys[b]:keys[b]+'/'+keys[a];
  let faces=[];
  for(let i=0;i<g.index.count;i+=3)faces.push([g.index.getX(i),g.index.getX(i+1),g.index.getX(i+2)]);
  // The mirrored source retained internal coplanar faces along its midsagittal
  // join. Removing just those internal triangles leaves the outside intact.
  if(['Xiphoid process','Vertebra T8'].includes(m.name))
    faces=faces.filter(f=>!f.every(i=>Math.abs(vertices[i].x+.44)<1e-5));
  function incidence() {
    const counts=new Map();
    for(const f of faces)for(let j=0;j<3;j++){const k=edge(f[j],f[(j+1)%3]);counts.set(k,(counts.get(k)||0)+1);}
    return counts;
  }
  let counts=incidence();
  if(/^Costal cartilage of eighth rib/.test(m.name)){
    // Each side has one stray triangle attached by just one edge.
    faces=faces.filter(f=>{const n=f.map((a,j)=>counts.get(edge(a,f[(j+1)%3]))).sort();return n.join()!=='1,1,3';});
    counts=incidence();
  }
  if([...counts.values()].some(n=>n!==2))throw Error('Bordo osseo aperto o duplicato: '+m.name);
  if(faces.length*3!==g.index.count)m.geometry=cuffs.geometry(vertices,faces);
}
for(const m of chest) if(['osso','vertebra','cartilagine'].includes(m.userData.layer))cleanSkeleton(m);
save(chest,'torace-eco.glb');
