const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs');
const C=require('../prototipo-cuore/lab-core.js'),F=require('../prototipo-cuore/fetal-core.js'),E=require('../engine.js'),D=require('../data.js');
const rawScenario=id=>{const s=D.SCENARIOS.find(s=>s.id===id);return s.build(Object.fromEntries(s.params.map(p=>[p.k,p.def])));};
function scenario(id,p=C.defaults()){const cfg=C.configure(rawScenario(id),p,E),stream=new E.Stream(cfg,17);stream.ensure(30000);return {cfg,stream};}
const near=(a,b,tol=1e-7)=>assert.ok(Math.abs(a-b)<tol,`${a} != ${b}`);
test('Seven phases stay linked to sinus timing and preserve order',()=>{
 const p=C.defaults();C.set(p,'phase.fastE',160);const {cfg,stream}=scenario('normale',p);near(cfg.rate,60000/850);const v=stream.ev.find(e=>e.kind==='V'&&e.t>5000);let offset=0;
 C.phases.forEach(([id],i)=>{const t=v.t-p['phase.atrial']+offset+p['phase.'+id]/2,m=C.sample(stream.eventsAround(t),t,cfg,p);assert.equal(m.phase,i,id);offset+=p['phase.'+id];});
});
test('Both valve pairs are shut and ventricular shortening constant during isovolumetric phases',()=>{
 const p=C.defaults(),{cfg,stream}=scenario('normale'),v=stream.ev.find(e=>e.kind==='V'&&e.t>5000);let offset=0;
 C.phases.forEach(([id],i)=>{const samples=[.2,.7].map(u=>{const t=v.t-p['phase.atrial']+offset+p['phase.'+id]*u;return C.sample(stream.eventsAround(t),t,cfg,p);});
  if([1,4].includes(i)){near(samples[0].vent,samples[1].vent);for(const m of samples)assert.ok(Object.values(m.valves).every(v=>v===0));}
  if([2,3].includes(i)){assert.ok(samples[1].valves.aortic>.9);assert.equal(samples[1].valves.mitral,0);}
  if([0,5,6].includes(i)){assert.ok(samples[1].valves.mitral>.9);assert.equal(samples[1].valves.aortic,0);}
  offset+=p['phase.'+id];
 });
});
test('Atrial phase and conduction times round-trip at every editable bound',()=>{
 const state=C.fresh();for(let repeat=0;repeat<4;repeat++)for(const key of ['phase.atrial','electric.atrial','electric.av','electric.his'])for(const v of [C.schema[key].min,C.schema[key].max]){C.set(state.params,key,v);near(state.params['phase.atrial'],state.params['electric.atrial']+state.params['electric.av']+state.params['electric.his']-40);assert.deepEqual(C.parse(JSON.stringify(state)),state);}
});
test('Valve aperture and coaptation edits never invert open and closed states',()=>{
 const s=C.fresh();C.set(s.params,'valve.mitral.gap',.7);C.set(s.params,'valve.mitral.open',.1);assert.equal(s.params['valve.mitral.gap'],.1);C.set(s.params,'valve.mitral.gap',.6);assert.equal(s.params['valve.mitral.open'],.6);assert.deepEqual(C.parse(s),s);
});
test('Complete AV block follows independent ECG events without inventing ventricular cycles',()=>{
 const p=C.defaults();C.set(p,'electric.blockAV',1);const {cfg,stream}=scenario('normale',p);assert.equal(cfg.av,'III');let dissociated=0,rest=0;
 for(let t=5000;t<25000;t+=10){const ev=stream.eventsAround(t),m=C.sample(ev,t,cfg,p);if(m.atr>.5&&m.dv>700)dissociated++;if(m.dv>C.total(p)){assert.equal(m.phase,6);rest++;}}
 assert.ok(dissociated>20);assert.ok(rest>20);assert.ok(stream.ev.filter(e=>e.kind==='V').every(e=>e.meta.type==='escape-j'));
});
test('Asystole and VF have no organized pumping or valve cycle',()=>{
 for(const id of ['asistolia','fv']){const {cfg,stream}=scenario(id),p=C.defaults();for(let t=5000;t<8000;t+=71){const m=C.sample(stream.eventsAround(t),t,cfg,p);assert.equal(m.vent,0);assert.equal(m.atr,0);assert.ok(Object.values(m.valves).every(v=>v===null));}}
});
test('Local damage retains passive tethered motion and leaves distant tissue unchanged',()=>{
 const p=C.defaults(),m={vent:1,atr:0,fibr:0},q=[.7,-.55,.6],r={center:q,radius:.28,strength:1,type:'necrosis'};
 assert.notDeepEqual(C.deformPoint(q,m,p),q);const moved=C.deformPoint(q,m,p,[r]);assert.notDeepEqual(moved,q);assert.ok(Math.hypot(...moved.map((x,i)=>x-q[i]))<Math.hypot(...C.deformPoint(q,m,p).map((x,i)=>x-q[i])));assert.deepEqual(C.deformPoint([-1,-1,0],m,p,[r]),C.deformPoint([-1,-1,0],m,p));
});
test('Configuration import validates bounds, colors, finite numbers, and GPU capacity atomically',()=>{
 const s=C.fresh();s.regions.push({type:'ischemia',center:[0,0,0],radius:.28,strength:.8,color:'#aabbcc'});assert.deepEqual(C.parse(JSON.stringify(s)),s);
 for(const change of [s=>s.params['muscle.vent']=Infinity,s=>s.params['phase.atrial']=599,s=>s.regions[0].color='<script>',s=>s.regions[0].center=[NaN,0,0],s=>s.regions=Array(33).fill(s.regions[0]),s=>s.occlusions=Array(17).fill({vessel:'A',spline:0,position:.5,severity:1,length:.1}),s=>s.params['valve.mitral.gap']=1.1]){const bad=structuredClone(s);change(bad);assert.throws(()=>C.parse(bad));}
 assert.throws(()=>C.parse(JSON.stringify(s).replace('"params":{','"params":{"__proto__":0,')));
 const bad=structuredClone(s);bad.structures=JSON.parse('{"__proto__":{"position":[0,0,0],"scale":1,"opacity":1,"color":"#ffffff"}}');assert.throws(()=>C.parse(bad));assert.equal({}.opacity,undefined);
});
test('Coronary point placement uses arc length rather than vertex indices',()=>{
 const points=[[0,0,0],[1,0,0],[1,3,0]];assert.deepEqual(C.pointOn(points,.5).point,[1,1,0]);const n=C.nearest(points,[1.1,2,0]);near(n.position,.75);near(n.distance,.1);assert.deepEqual(C.pointOn(points,1).point,[1,3,0]);
});
test('Atlas coronary network keeps all 41 branches and propagates proximal occlusion',()=>{
 const data=JSON.parse(fs.readFileSync(require.resolve('../prototipo-cuore/coronary-paths.json'))),tree=C.coronaryTree(data);assert.equal(tree.size,41);assert.equal([...tree.values()].filter(b=>!b.parent).length,2);
 const left='Left coronary artery',lad='Anterior interventricular artery',cx='Circumflex artery of heart',right='Right coronary artery',lesions=[{vessel:left,spline:0,position:.2,severity:1}];
 assert.equal(C.flowFactor(tree,lad,0,.8,lesions),0);assert.equal(C.flowFactor(tree,cx,4,.8,lesions),0);assert.equal(C.flowFactor(tree,right,0,.8,lesions),1);assert.equal(C.flowFactor(tree,left,0,.1,lesions),1);
});
test('Fetal network conserves every node in all presets and both duct directions',()=>{
 for(const preset of Object.values(F.presets))for(const direction of [1,-1])for(const fo of [0,.9])for(const dv of [0,1]){const p={...preset,direction,fo,dv},r=F.solve(p);for(const n of F.nodes){near(r.balance[n],0,1e-7);assert.ok(Number.isFinite(r.oxygen[n])&&r.oxygen[n]>=0&&r.oxygen[n]<=1);}near(r.mass.rv+r.mass.lv,100);for(const e of r.edges)assert.ok(Number.isFinite(e.flow)&&e.flow>=0);}
});
test('Neonatal preset excludes placenta and closes all three fetal shunts',()=>{
 const r=F.solve(F.presets.neonatal);for(const id of ['uv','dv','fo','da','uaR','uaL'])near(r.edges.find(e=>e.id===id).flow,0,1e-7);near(r.mass.rv,r.mass.lv,1e-7);near(r.mass.lungs,50,1e-7);assert.ok(r.edges.find(e=>e.id==='hepaticReturn').flow>0);assert.ok(r.edges.find(e=>e.id==='portal').flow>0);assert.ok(r.edges.find(e=>e.id==='coronary').flow>0);
});
test('PDA reverses the duct and adds pulmonary recirculation',()=>{
 const fetal=F.solve(F.presets.fetal),pda=F.solve(F.presets.pda),d=fetal.edges.find(e=>e.id==='da'),p=pda.edges.find(e=>e.id==='da');assert.equal(d.from,'pa');assert.equal(d.to,'descending');assert.equal(p.from,'descending');assert.equal(p.to,'pa');assert.ok(p.flow>0);assert.ok(pda.mass.lungs>pda.mass.rv);assert.ok(fetal.edges.find(e=>e.id==='uv').flow>0);
});
test('Fetal imports are independent of adult settings and reject invalid data',()=>{
 const config={format:'isoelettrica-fetal-lab',version:1,params:F.defaults};assert.deepEqual(F.parse(JSON.stringify(config)),F.defaults);assert.throws(()=>F.parse(C.fresh()));assert.throws(()=>C.parse(config));for(const params of [null,[],{fo:1},{pvr:NaN},{direction:0},{speed:Infinity},JSON.parse('{"__proto__":1}')])assert.throws(()=>F.parse({...config,params}));
});

test('Terminal conduction edits change ECG QRS duration as well as visual transit',()=>{const p=C.defaults(),before=scenario('normale',p);C.set(p,'electric.left',85);const after=scenario('normale',p);const width=s=>s.stream.ev.find(e=>e.kind==='V').meta.w;near(width(after)-width(before),50);});
test('Blocking both branches activates an independent ventricular escape',()=>{const p=C.defaults();C.set(p,'electric.blockL',1);C.set(p,'electric.blockR',1);const {cfg,stream}=scenario('normale',p);assert.equal(cfg.av,'III');assert.equal(cfg.escape,'ventricolare');assert.ok(stream.ev.filter(e=>e.kind==='V').every(e=>e.meta.type==='escape-v'));});
