/* Esporta la geometria Three.js effettiva e la posa senza una GPU.
   Uso: node tools/esporta-paziente.cjs scena.json [F|M] [eta] [semi|supino] [--rcp] [--side].
   La WebGLRenderer è sostituita solo qui per acquisire la scena; non è un test GPU. */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const repo = path.resolve(__dirname, '..');
const T = {...require(path.join(repo, 'three.min.js'))};
let capture;
const noop=()=>{};
const {createCanvas}=require(require.resolve('@napi-rs/canvas', {paths:[repo, process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES].filter(Boolean)}));
const fakeCanvas=()=>{const c=createCanvas(1,1);c.style={};c.setAttribute=noop;c.addEventListener=noop;return c;};
T.WebGLRenderer=class {
 constructor(){this.domElement=fakeCanvas();this.shadowMap={};this.capabilities={getMaxAnisotropy:()=>4};this.outputEncoding=0;this.info={render:{}};}
 setPixelRatio(){} setClearColor(){} setSize(){} dispose(){} render(scene,cam){capture={scene,cam};}
};
const window={THREE:T,devicePixelRatio:1,ISO_VERSIONE:'46.2',matchMedia:()=>({matches:true}),fetch:async()=>({ok:true,arrayBuffer:async()=>{let b=fs.readFileSync(path.join(repo,'paziente-corpo.bin'));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}})};
const {JSDOM}=require(path.join(repo,'node_modules/jsdom')); const document=new JSDOM('<!doctype html><body></body>').window.document; const element=document.createElement.bind(document); document.createElement=n=>n==='canvas'?fakeCanvas():element(n);
const context=vm.createContext({window,document,console,TextDecoder,Uint8Array,Uint16Array,Float32Array,DataView,ArrayBuffer,Math});
for(const file of ['casi-paziente-aspetto.js','casi-paziente.js'])if(fs.existsSync(path.join(repo,file)))vm.runInContext(fs.readFileSync(path.join(repo,file),'utf8').replace('.catch(() => { if (api.suErrore)', '.catch(error => { console.error(error); if (api.suErrore)'),context,{filename:file});
const el={clientWidth:1200,clientHeight:900,appendChild:noop};
const api=window.ISO_PAZIENTE.crea(el);
(async()=>{
 for(let i=0;i<100&&!api.pronto;i++)await new Promise(r=>setImmediate(r));
 if(!api.pronto)throw Error('Patient not loaded');
 const sex=process.argv[3]||'F',age=+(process.argv[4]||42),post=process.argv[5]||'semi';
 api.imposta({post,fr:process.argv.includes('--rcp')?0:18,polso:!process.argv.includes('--rcp'),rcp:process.argv.includes('--rcp'),cosc:process.argv.includes('--rcp')?'incosciente':'vigile'}, {sesso:sex,eta:age});
 api.vitali(process.argv.includes('--rcp') ? {fc:null,pa:'—',spo2:null,fr:0} : {fc:78,pa:'125/78',spo2:98,fr:18});
 for(let i=0;i<(process.argv.includes('--rcp')?86:90);i++)api.aggiorna(33.333);
 const {scene,cam}=capture;
 scene.updateMatrixWorld(true);cam.updateMatrixWorld(true);
 if(process.argv.includes('--front')){cam.position.set(0,2.2,2.6);cam.lookAt(0,0.84,-.1);cam.updateMatrixWorld(true);}
 if(process.argv.includes('--side')){cam.position.set(2.9,1.9,.0);cam.lookAt(0,0.8,-.05);cam.updateMatrixWorld(true);}
 const data={camera:{position:cam.position.toArray(),quaternion:cam.quaternion.toArray(),fov:cam.fov},meshes:[],lights:[]};
 const color=c=>c?c.toArray():[1,1,1];
 scene.traverse(o=>{
  if(!o.visible)return;for(let p=o.parent;p;p=p.parent)if(!p.visible)return;
  if(o.isLight){data.lights.push({type:o.type,color:color(o.color),groundColor:color(o.groundColor),position:o.getWorldPosition(new T.Vector3()).toArray(),intensity:o.intensity});return;}
  if(!o.isMesh || o.material.type==='ShadowMaterial')return;
  const g=o.geometry,p=g.attributes.position,n=p.count,vertices=[];
  if(o.isSkinnedMesh)o.skeleton.update();
  for(let i=0;i<n;i++){const v=new T.Vector3().fromBufferAttribute(p,i);if(o.isSkinnedMesh)o.boneTransform(i,v);v.applyMatrix4(o.matrixWorld);vertices.push(...v.toArray());}
  const mats=(Array.isArray(o.material)?o.material:[o.material]).map(m=>({name:m.name||'',color:color(m.color),roughness:m.roughness??.8,metalness:m.metalness||0,opacity:m.opacity??1,visible:m.visible!==false,emission:m.type==='MeshBasicMaterial',side:m.side,vertexColors:!!m.vertexColors,texture:!!m.map,textureData:m.map&&m.map.image&&m.map.image.toDataURL?m.map.image.toDataURL('image/png'):null}));
  const groups=g.groups.length?g.groups:[{start:0,count:g.index?g.index.count:n,materialIndex:0}];
  data.meshes.push({name:o.name||'',vertices,indices:g.index?Array.from(g.index.array):Array.from({length:n},(_,i)=>i),groups:groups.map(g=>({...g,materialIndex:Array.isArray(o.material)?g.materialIndex:0})),mats,colors:g.attributes.color?Array.from(g.attributes.color.array):null,uv:g.attributes.uv?Array.from(g.attributes.uv.array):null});
 });
 const out=process.argv[2];fs.writeFileSync(out,JSON.stringify(data));
 console.log(JSON.stringify({out,meshes:data.meshes.length,triangles:data.meshes.reduce((s,m)=>s+m.indices.length/3,0),sex,age,post}));
})();
