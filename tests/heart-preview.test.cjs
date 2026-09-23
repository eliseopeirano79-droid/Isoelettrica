const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const E=require('../engine.js'),D=require('../data.js'),motion=require('../prototipo-cuore/motion.js');
function scenario(id){const sc=D.SCENARIOS.find(s=>s.id===id);const cfg=sc.build(Object.fromEntries(sc.params.map(p=>[p.k,p.def])));const stream=new E.Stream(cfg,17);stream.ensure(30000);return {cfg,stream};}
test('Preview heart keeps all named anatomical parts, no external asset dependencies',()=>{
 const b=fs.readFileSync(path.join(__dirname,'../prototipo-cuore/heart-z-anatomy.glb'));
 assert.equal(b.toString('utf8',0,4),'glTF');assert.equal(b.readUInt32LE(4),2);assert.equal(b.readUInt32LE(8),b.length);assert.ok(b.length<5e6);
 const j=JSON.parse(b.toString('utf8',20,20+b.readUInt32LE(12)));
 assert.equal(j.nodes.length,39);assert.equal(new Set(j.nodes.map(n=>n.extras.sourceName)).size,39);
 assert.ok(j.asset.copyright.includes('CC BY-SA 4.0'));assert.equal(j.buffers.length,1);assert.equal(j.buffers[0].uri,undefined);
 assert.equal((j.images||[]).length,0);assert.equal((j.animations||[]).length,0);
 for(const n of j.nodes){const p=j.meshes[n.mesh].primitives[0],a=j.accessors[p.attributes.POSITION];assert.ok(a.count>10);assert.ok(j.accessors[p.indices].count>30);for(const v of [...a.min,...a.max])assert.ok(Number.isFinite(v)&&Math.abs(v)<4);}
});
test('Preview contraction follows separate ECG atrial and ventricular events',()=>{
 const {cfg,stream}=scenario('normale');const a=stream.ev.find(e=>e.kind==='A'&&e.t>5000),v=stream.ev.find(e=>e.kind==='V'&&e.t>a.t);
 const atr=motion.sample(stream.eventsAround(a.t+100),a.t+100,cfg);assert.ok(atr.atr>.9);assert.equal(atr.vent,0);
 const vent=motion.sample(stream.eventsAround(v.t+210),v.t+210,cfg);assert.ok(vent.vent>.99);assert.equal(vent.atr,0);
});
test('BAV III animation retains atrial activity without inventing conducted ventricular beats',()=>{
 const {cfg,stream}=scenario('bav3');let atrOnly=0,ventOnly=0;
 for(let t=5000;t<25000;t+=10){const ev=stream.eventsAround(t),m=motion.sample(ev,t,cfg);if(m.atr>.5&&m.vent===0)atrOnly++;if(m.vent>.5&&m.atr===0)ventOnly++;}
 assert.ok(atrOnly>20);assert.ok(ventOnly>20);assert.ok(stream.ev.filter(e=>e.kind==='V').every(e=>e.meta.type==='escape-j'));
});
test('Asystole stays motionless and VF never acquires an organized contraction',()=>{
 for(const id of ['asistolia','fv']){const {cfg,stream}=scenario(id);for(let t=5000;t<9000;t+=41){const m=motion.sample(stream.eventsAround(t),t,cfg);assert.equal(m.atr,0);assert.equal(m.vent,0);assert.equal(m.fibr,id==='fv'?1:0);}}
});
