const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const T=require('../three.min.js'),Thorax=require('../ecocardio/thorax.js'),Body=require('../ecocardio/body.js'),Volume=require('../ecocardio/volume.js'),Valves=require('../ecocardio/valves.js'),Imaging=require('../ecocardio/imaging.js'),Views=require('../ecocardio/views.js'),C=require('../ecocardio/core.js');
const binary=name=>{const b=fs.readFileSync(path.join(__dirname,'..',name));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
const near=(a,b,tol=1e-5)=>assert.ok(Math.abs(a-b)<tol,`${a} vs ${b}`);

test('Thorax contains the complete paired ribs, separate cartilages, sternum and thoracic spine from the pinned source',()=>{
 const d=Thorax.decode(binary('ecocardio/thorax.bin')),count=kind=>d.parts.filter(p=>p.kind===kind).length;
 assert.equal(count('rib'),24);assert.equal(count('cartilage'),20);assert.equal(count('sternum'),3);assert.equal(count('vertebra'),12);assert.equal(count('disc'),11);assert.equal(count('clavicle'),2);
 assert.equal(d.meta.revision,'2b652413b1116c9119e616eabc1e63af3cc6267d');
 for(let n=1;n<=12;n++)for(const side of ['dextra','sinistra'])assert.ok(d.parts.some(p=>p.id===`costa_${n}_${side}`));
 assert.equal(d.parts.some(p=>p.id.startsWith('cartilago_costalis_11_')||p.id.startsWith('cartilago_costalis_12_')),false);
 for(const p of d.parts){assert.ok(p.vertices>100,p.name);assert.ok(p.positions.every(Number.isFinite));assert.equal(p.indices.length%3,0);assert.ok(p.indices.every(i=>i<p.vertices));}
 assert.throws(()=>Thorax.decode(binary('ecocardio/thorax.bin').slice(0,-16)),/incompleta/);
});

test('The skeleton extraction uses the original heart coordinate transform, not a visual rescaling of the ribs',()=>{
 const d=Thorax.decode(binary('ecocardio/thorax.bin')),b=Buffer.from(binary('prototipo-cuore/heart-z-anatomy.glb')),j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)));
 for(const [name,check]of Object.entries(d.meta.registrationChecks)){
  const node=j.nodes.find(n=>n.name===name+'.001'),accessor=j.accessors[j.meshes[node.mesh].primitives[0].attributes.POSITION];
  for(let k=0;k<3;k++){near(check.min[k],accessor.min[k],.000003);near(check.max[k],accessor.max[k],.000003);}
 }
});

test('The registered display skin stays in front of the sampled rib surfaces',()=>{
 const d=Thorax.decode(binary('ecocardio/thorax.bin')),body=Body.decode(binary('ecocardio/body.bin'));let checked=0;
 for(const part of d.parts)for(let i=0;i<part.positions.length;i+=9){const[x,y,z]=part.positions.slice(i,i+3),p=body.surface.point(x,y);if(p){checked++;assert.ok(z<=p.position[2]+.03,`${part.name}: ${z-p.position[2]}`);}}
 assert.ok(checked>25000);
});

test('All four valves really change leaflet geometry; closed coaptation edges meet and imaging samples the same moving surfaces',()=>{
 const volume=Volume.decode(binary('ecocardio/tissue.bin')),before=new Uint8Array(volume.density),labels=new Uint8Array(volume.labels),system=Valves.create([],volume);
 let cleared=0,preserved=0;
 for(let i=0;i<labels.length;i++){if(system.staticLeafLabels.has(labels[i])){assert.equal(volume.density[i],0);cleared++;}else if(before[i]){assert.equal(volume.density[i],before[i]);preserved++;}}
 assert.ok(cleared>1000);assert.ok(preserved>10000);
 for(const r of system.rigs){
  const closed=r.parts.map(p=>new Float32Array(p.mesh.geometry.attributes.position.array));system.update({[r.id]:1});
  for(let j=0;j<r.parts.length;j++){
   const p=r.parts[j],positions=p.mesh.geometry.attributes.position.array;assert.notDeepEqual(positions,closed[j]);assert.ok(positions.every(Number.isFinite));
   let hits=0,total=0;for(let k=0;k<positions.length;k+=39){const s={rho:0,label:0};system.sample(...positions.slice(k,k+3),s);total++;if(s.rho>.25)hits++;}assert.ok(hits/total>.9,`${r.id}: surface sampling ${hits}/${total}`);
  }
  if(r.kind==='semilunar')for(let leaf=0;leaf<3;leaf++)for(const u of [.1,.25,.4]){const a=Valves.point(r,leaf,u,1,0),b=Valves.point(r,(leaf+2)%3,1-u,1,0);near(a.distanceTo(b),0);}
  if(r.kind==='mitral')for(const u of [.1,.25,.5,.75,.9])near(Valves.point(r,0,u,1,0).distanceTo(Valves.point(r,1,1-u,1,0)),0);
  system.update({});
 }
});

test('ECG-locked valve sequence includes two all-closed intervals and does not overlap AV opening with ejection',()=>{
 const clock=age=>({organized:true,events:{V:{t:1000}},onsetQRS:1000,endT:1380,sinceQRS:age,sinceP:age+160,RR:850});
 for(let age=0;age<850;age+=3){const s=Valves.state(clock(age));assert.ok(!(s.mitral>.001&&s.aortic>.001));for(const key of ['mitral','tricuspid','aortic','pulmonary'])assert.ok(s[key]>=0&&s[key]<=1);}
 for(const age of [65,410]){const s=Valves.state(clock(age));assert.equal(s.mitral,0);assert.equal(s.aortic,0);assert.match(s.phase,/isovolumetric/);}
 assert.equal(Valves.state(clock(200)).aortic,1);assert.ok(Valves.state(clock(550)).mitral>.5);
 assert.equal(Valves.state({organized:false}).aortic,0);
});

test('Valve motion alone changes both the ultrasound image and M-mode; reference planes intersect the reconstructed valves',()=>{
 const volume=Volume.decode(binary('ecocardio/tissue.bin')),system=Valves.create([],volume),imager=Imaging.create(volume,system),views=Views.alignValves(Views.views,system.rigs),p=C.pose(views.find(v=>v.id==='plax'));
 for(const name of ['mitral','aortic'])near(C.project(system.rigs.find(r=>r.id===name).center,p)[2],0);
 const a4=C.pose(views.find(v=>v.id==='a4c'));for(const name of ['mitral','tricuspid'])near(C.project(system.rigs.find(r=>r.id===name).center,a4)[2],0);
 const open={atr:0,vent:0,valves:{mitral:1,tricuspid:1,aortic:0,pulmonary:0}},closed={atr:0,vent:0,valves:{mitral:0,tricuspid:0,aortic:1,pulmonary:1}};
 const a=imager.render(p,open,{},400,360),b=imager.render(p,closed,{},400,360);assert.notDeepEqual(a.pixels,b.pixels);
 const mv=system.rigs[0],screen=C.project(mv.center,p),angle=Math.atan2(screen[0],screen[1])*180/Math.PI;
 assert.notDeepEqual(imager.line(p,open,{},angle,480),imager.line(p,closed,{},angle,480));
 for(const name of mv.names){const id=imager.definitions.findIndex(d=>d.name===name)+1;assert.ok(a.counts[id]>25,`${name}: absent from PLAX`);}
});
