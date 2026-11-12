/* Export only for deriving the educational ultrasound volume. Original GLB unchanged. */
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '..'), T = require('../three.min.js');
const G = require('../atlas-geometry.js'), R = require('../anatomy-refinements.js'), D = require('../ecocardio/views.js');
vm.runInNewContext(fs.readFileSync(path.join(root, 'gltfloader.js'), 'utf8'), { THREE: T, TextDecoder, console });
const b = fs.readFileSync(path.join(root, 'prototipo-cuore/heart-z-anatomy.glb'));
new T.GLTFLoader().parse(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength), '', gltf => {
  const meshes = G.sourceMeshes(gltf.scene); R.apply(meshes, G.material);
  const out = meshes.filter(m => ['wall', 'vessels', 'valves'].includes(m.userData.layer)).map(m => ({
    name: m.userData.sourceName, layer: m.userData.layer,
    definition: D.dictionary[m.userData.sourceName] || { id: m.userData.sourceName, label: m.userData.label || m.userData.sourceName, color: '#b9c9c2' },
    positions: Array.from(m.geometry.attributes.position.array), indices: Array.from(m.geometry.index?.array || [])
  }));
  fs.writeFileSync(process.argv[2], JSON.stringify(out));
  console.log('Exported ' + out.length + ' atlas meshes; source untouched.');
}, e => { console.error(e); process.exitCode = 1; });
