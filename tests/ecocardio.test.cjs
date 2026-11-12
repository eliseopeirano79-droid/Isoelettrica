const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const C=require('../ecocardio/core.js'),D=require('../ecocardio/views.js'),T=require('../three.min.js'),G=require('../atlas-geometry.js'),R=require('../anatomy-refinements.js'),M=require('../cardiac-mechanics.js');
const {environment,read}=require('./harness.cjs');
const Volume=require('../ecocardio/volume.js'),Imaging=require('../ecocardio/imaging.js'),Body=require('../ecocardio/body.js'),Training=require('../ecocardio/training.js');
const binary=file=>{const b=fs.readFileSync(path.join(__dirname,'..',file));return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);};
let volume;const getVolume=()=>volume||=Volume.decode(binary('ecocardio/tissue.bin'));
const near=(a,b,tol=1e-6)=>assert.ok(Math.abs(a-b)<tol,`${a} ≠ ${b}`);
let sourcePromise;
function source(){return sourcePromise ||= new Promise((resolve,reject)=>{
 vm.runInNewContext(read('gltfloader.js'),{THREE:T,TextDecoder,console});
 const b=fs.readFileSync(path.join(__dirname,'../prototipo-cuore/heart-z-anatomy.glb'));
 new T.GLTFLoader().parse(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'',g=>{const meshes=G.sourceMeshes(g.scene);R.apply(meshes,G.material);resolve({g,meshes:meshes.filter(m=>['wall','valves','vessels'].includes(m.userData.layer))});},reject);
});}
function records(ms){return ms.map(m=>({name:m.userData.sourceName,id:D.dictionary[m.userData.sourceName]?.id||m.name,layer:m.userData.layer,positions:m.geometry.attributes.position.array,indices:m.geometry.index?.array}));}

test('Echo pose: all axes remain orthonormal and screen/world coordinates are reciprocal',()=>{
 for(const view of D.views)for(const state of [C.defaults,{slideX:.2,slideY:-.3,rotation:169,fan:25,rock:-31,depth:140}]){
  const p=C.pose(view,state);for(const a of [p.u,p.d,p.n])near(C.norm(a),1);
  near(C.dot(p.u,p.d),0);near(C.dot(p.n,p.d),0);near(C.dot(p.u,p.n),0);
  for(const [x,y]of [[0,1],[.4,1.7],[-.35,2]]){const back=C.project(C.world(x,y,p),p);near(back[0],x);near(back[1],y);near(back[2],0);}
 }
});
test('A real cube section closes; a genuinely open contour stays open across snap bucket boundaries',()=>{
 const geometry=new T.BoxGeometry(2,2,2),p=C.pose({origin:[0,0,0],target:[0,1,0],right:[1,0,0],depth:3});
 const lines=C.intersect(geometry.attributes.position.array,geometry.index.array,p),paths=C.contours(lines);
 assert.equal(paths.length,1);assert.equal(paths[0].closed,true);assert.ok(lines.flat().every(([x,y])=>Math.abs(x)<=1&&Math.abs(y)<=1));
 const open=C.contours([[[0,0],[1.000009,0]],[[2,1],[2,0]],[[1.000011,0],[2,0]]]);
 assert.equal(open.length,1);assert.equal(open[0].closed,false);assert.equal(open[0].points.length,4);
});
test('Depth changes the field of view; rotation and fan change the cut; rock preserves its plane',()=>{
 const v=D.views[0],base=C.pose(v),depth=C.pose(v,{depth:150}),rock=C.pose(v,{rock:20}),fan=C.pose(v,{fan:20}),rot=C.pose(v,{rotation:45});
 near(depth.depth/base.depth,1.5);near(C.dot(base.n,depth.n),1);near(C.dot(base.n,rock.n),1);
 assert.ok(Math.abs(C.dot(base.n,fan.n))<.99);assert.ok(Math.abs(C.dot(base.n,rot.n))<.9);
 assert.equal(C.inside(0,base.depth*1.1,base),false);assert.equal(C.inside(0,base.depth*1.1,depth),true);
 assert.equal(C.inside(0,-1,base),false);assert.equal(C.inside(100,1,base),false);
});
test('Real atlas cuts include expected structures and A2C excludes the bulk of the right ventricle',async()=>{
 const {meshes}=await source(),ms=records(meshes);const count=(id,name)=>C.slice(ms,C.pose(D.views.find(v=>v.id===id))).find(s=>s.name===name)?.lines.length||0;
 for(const v of D.views){const slices=C.slice(ms,C.pose(v));assert.ok(slices.length>2,v.id);for(const id of v.focus)assert.ok(slices.some(s=>s.id===id&&s.lines.flat().some(([x,y])=>C.inside(x,y,C.pose(v)))),`${v.id}: ${id}`);}
 assert.ok(count('a2c','Right ventricle')<.05*count('a2c','Left ventricle'));
 assert.ok(count('a4c','Right ventricle')>100);assert.ok(count('a4c','Right atrium')>100);
 const a=C.slice(ms,C.pose(D.views[0])),b=C.slice(ms,C.pose(D.views[0],{fan:25}));assert.notEqual(JSON.stringify(a.map(s=>s.lines)),JSON.stringify(b.map(s=>s.lines)));
});
test('CPU sections and the 3D plane share positions, including the existing cardiac deformation',async()=>{
 const {meshes}=await source(),ms=records(meshes),p=C.pose(D.views[0]),deformed=C.slice(ms,p,q=>M.deform(q,{atr:.4,vent:.8})),rest=C.slice(ms,p);
 assert.notEqual(JSON.stringify(deformed.map(s=>s.lines)),JSON.stringify(rest.map(s=>s.lines)));
 for(const s of deformed)for(const line of s.lines)for(const [x,y]of line)near(C.project(C.world(x,y,p),p)[2],0);
});
test('Exercise cannot be completed by matching only one movement or the depth',()=>{
 assert.equal(C.alignment(C.defaults).reached,true);
 for(const key of ['slideX','slideY','rotation','fan','rock','depth'])assert.equal(C.alignment({...C.defaults,[key]:key.startsWith('slide')?.4:key==='depth'?140:30}).reached,false,key);
 for(let seed=1;seed<12;seed++)assert.equal(C.alignment(C.perturbed(seed)).reached,false);
});
async function app(){
 const {g}=await source(),h=environment('ecocardio/index.html'),w=h.w;
 w.THREE={...T,GLTFLoader:class{load(url,done){queueMicrotask(()=>done(g));}}};
 Object.assign(w,{EchoCore:C,EchoViews:D,EchoVolume:Volume,EchoBody:Body,EchoImaging:Imaging,EchoTraining:Training,HeartAtlasGeometry:G,AnatomyRefinements:R,CardiacMechanics:M,CardiacClock:require('../cardiac-clock.js'),HeartPreviewMotion:require('../prototipo-cuore/motion.js'),ECG:require('../engine.js'),ISO_DATA:require('../data.js')});
 w.HTMLElement.prototype.scrollIntoView=()=>{};
 w.fetch=async url=>({ok:true,arrayBuffer:async()=>binary('ecocardio/'+url.split('?')[0])});
 const getContext=w.HTMLCanvasElement.prototype.getContext;w.HTMLCanvasElement.prototype.getContext=function(type){const ctx=getContext.call(this,type);if(ctx)ctx.createImageData=(width,height)=>({data:new Uint8ClampedArray(width*height*4),width,height});return ctx;};
 for(const id of ['stage','scan-area','scan','scan-b','mmode']){const el=w.document.getElementById(id);Object.defineProperty(el,'clientWidth',{get:()=>320});Object.defineProperty(el,'clientHeight',{get:()=>280});el.getBoundingClientRect=()=>({left:0,top:0,width:320,height:280});}
 w.eval(read('ecocardio/raster.js'));w.eval(read('ecocardio/scene.js'));w.eval(read('ecocardio/app.js'));await new Promise(resolve=>setImmediate(resolve));return h;
}
test('Studio loads without WebGL, changes the real section and cannot credit a reset as independent training',async()=>{
 const h=await app(),w=h.w,d=w.document;try{
  assert.equal(w.EchoLab.ready,true);assert.equal(w.EchoLab.renderer,'canvas');assert.equal(d.getElementById('load').hidden,true);
  const initial=JSON.stringify(w.EchoLab.slices.map(s=>s.lines));d.getElementById('fan').value=25;d.getElementById('fan').dispatchEvent(new w.Event('input'));
  h.frames.shift()(500);
  assert.equal(w.EchoLab.state.fan,25);assert.notEqual(JSON.stringify(w.EchoLab.slices.map(s=>s.lines)),initial);
  d.getElementById('reset').click();assert.equal(w.EchoLab.state.fan,0);
  d.querySelector('[data-group="apical"]').click();assert.equal(w.EchoLab.view,'a4c');d.querySelector('[data-view="a2c"]').click();assert.equal(w.EchoLab.view,'a2c');
  d.querySelector('[data-render="anatomy"]').click();assert.equal(d.getElementById('scan-kind').textContent,'SEZIONE ANATOMICA');
  d.querySelector('[data-mission="plax-align"]').click();assert.equal(d.getElementById('practice').hidden,false);assert.equal(C.alignment(w.EchoLab.state).reached,false);
  h.frames.shift()(1000);
  d.getElementById('check').click();assert.match(d.getElementById('practice-result').textContent,/non è ancora/);
  d.getElementById('reset').click();h.frames.shift()(1200);
  d.getElementById('check').click();assert.match(d.getElementById('practice-result').textContent,/raggiunto/);
  assert.equal(w.EchoLab.progress['plax-align'].independent,false);
  const before=w.EchoLab.time;h.frames.shift()(1400);assert.notEqual(w.EchoLab.time,before);
  d.getElementById('play').click();const time=w.EchoLab.time;h.frames.shift()(1600);assert.equal(w.EchoLab.time,time);
  d.querySelector('[data-layout="biplane"]').click();h.frames.shift()(1800);assert.equal(w.EchoLab.layout,'biplane');assert.equal(d.getElementById('secondary').hidden,false);
  d.getElementById('cine').value=700;d.getElementById('cine').dispatchEvent(new w.Event('input'));h.frames.shift()(2000);assert.equal(w.EchoLab.playing,false);assert.equal(d.getElementById('cine').value,'700');
  d.getElementById('gain').value=76;d.getElementById('gain').dispatchEvent(new w.Event('input'));
  d.getElementById('capture').click();assert.equal(w.EchoLab.captures.length,1);assert.equal(w.EchoLab.captures[0].view,'plax');assert.equal(w.EchoLab.captures[0].settings.gain,76);
  d.getElementById('gain').value=80;d.getElementById('gain').dispatchEvent(new w.Event('input'));h.frames.shift()(2200);assert.equal(w.EchoLab.settings.gain,80);
  d.getElementById('info').click();assert.equal(d.getElementById('info-dialog').hasAttribute('open'),true);d.getElementById('info-close').click();assert.equal(d.getElementById('info-dialog').hasAttribute('open'),false);
  assert.equal(h.errors.length,0,h.errors.map(e=>e.message).join('\n'));
 }finally{h.close();}
});
test('Volume decoder checks completeness, reconstructs tissue and gives reproducible spatial texture',()=>{
 const v=getVolume();assert.equal(v.density.length,v.meta.dims.reduce((a,b)=>a*b));assert.ok(v.density.some(x=>x>200));assert.ok(v.labels.some(x=>x>0));assert.equal(v.sample(90,90,90).rho,0);
 const b=binary('ecocardio/tissue.bin');assert.throws(()=>Volume.decode(b.slice(0,b.byteLength-12)),/incompleto/);
 const im=Imaging.create(v),p=C.pose(D.views[0]),motion={atr:0,vent:.3};const a=im.render(p,motion,{},160,150),again=im.render(p,motion,{},160,150),moved=im.render(C.pose(D.views[0],{fan:22}),motion,{},160,150);
 assert.deepEqual(a.pixels,again.pixels);assert.notDeepEqual(a.pixels,moved.pixels);assert.ok(a.labels.some(Boolean));
 const bright=im.render(p,motion,{gain:85},160,150);assert.deepEqual(a.labels,bright.labels);assert.ok(bright.pixels.reduce((s,x,i)=>s+(i%4===0?x:0),0)>a.pixels.reduce((s,x,i)=>s+(i%4===0?x:0),0));
});
test('The volume inverse follows the actual 3D myocardial deformation within voxel resolution',()=>{
 for(const motion of [{atr:0,vent:0},{atr:1,vent:0},{atr:0,vent:1},{atr:.7,vent:.65}]){
  const inverse=Volume.inverseMotion(motion);
  for(let x=-1.2;x<1.3;x+=.4)for(let y=-1.5;y<2.3;y+=.13)for(let z=-1.3;z<1.2;z+=.5){const rest=[x,y,z],world=M.deform(rest,motion),back=inverse(...world,[0,0,0]);for(let i=0;i<3;i++)near(rest[i],back[i],.00012);}
 }
});
test('Biplane preserves a shared origin and beam axis and really cuts a different plane',()=>{
 for(const view of D.views){const p=C.pose(view,{rotation:36,fan:14,rock:-7}),b=Volume.orthogonal(p,90);assert.deepEqual(p.origin,b.origin);assert.deepEqual(p.d,b.d);near(C.dot(p.n,b.n),0);near(C.dot(p.u,b.u),0);near(C.norm(b.u),1);near(C.norm(b.n),1);near(C.dot(b.u,b.d),0);}
});
test('Surface contact changes z and transports a nondegenerate orthonormal probe frame',()=>{
 const body=Body.decode(binary('ecocardio/body.bin')),v={...D.views[0],origin:[.3,.6,1.2]};
 const a=C.surfacePose(v,C.defaults,body.surface),b=C.surfacePose(v,{slideX:.35,slideY:.15},body.surface);assert.equal(a.contact,true);assert.equal(b.contact,true);assert.notEqual(a.origin[2],b.origin[2]);
 const surfacePoint=body.surface.point(.65,.75).position;for(let i=0;i<3;i++)near(b.origin[i],surfacePoint[i]);for(const axis of [b.d,b.n,b.u])near(C.norm(axis),1);near(C.dot(b.d,b.u),0);assert.equal(body.surface.point(20,20),null);
});
test('M-mode samples move with cardiac time and change when the sampling line changes',()=>{
 const im=Imaging.create(getVolume()),p=C.pose(D.views.find(x=>x.id==='psax-pm')),rest=im.line(p,{atr:0,vent:0},{},0),systole=im.line(p,{atr:0,vent:1},{},0),angled=im.line(p,{atr:0,vent:0},{},25);
 assert.ok(rest.some(x=>x>20));assert.notDeepEqual(rest,systole);assert.notDeepEqual(rest,angled);assert.deepEqual(rest,im.line(p,{atr:0,vent:0},{},0));
});
test('Exercises require observed actions and assistance cannot be undone by later matching controls',()=>{
 let s=Training.start('plax-align',97);assert.equal(Training.check(s,{view:'plax',state:s.initial}).success,false);Training.observe(s,'help');const r=Training.check(s,{view:'plax',state:C.defaults});assert.equal(r.success,true);assert.equal(r.assisted,true);
 s=Training.start('identify-lv');Training.observe(s,'select','atrium_dextrum');assert.equal(Training.check(s,{view:'a4c'}).success,false);Training.observe(s,'select','ventriculus_sinister');assert.equal(Training.check(s,{view:'a4c'}).success,true);
 s=Training.start('mmode');assert.equal(Training.check(s,{view:'psax-pm',layout:'mmode',mDuration:3000,mSamples:40}).success,false);Training.observe(s,'line');assert.equal(Training.check(s,{view:'psax-pm',layout:'mmode',mDuration:3000,mSamples:40}).success,true);
 s=Training.start('cine');Training.observe(s,'phase',.1);Training.observe(s,'phase',.7);assert.equal(Training.check(s,{view:'a4c',playing:false}).success,false);Training.observe(s,'capture');assert.equal(Training.check(s,{view:'a4c',playing:false}).success,true);
});
test('Host is lazy and preserves one iframe and its state across navigation',async()=>{
 const h=environment(),d=h.w.document;try{h.w.eval(read('ecocardio/host.js'));assert.equal(d.querySelectorAll('#echoFrame').length,0);
 const section=d.getElementById('v-echo');section.classList.add('on');await new Promise(r=>setImmediate(r));const frame=d.getElementById('echoFrame');assert.equal(frame.getAttribute('src'),'ecocardio/index.html');
 section.classList.remove('on');section.classList.add('on');await new Promise(r=>setImmediate(r));assert.equal(d.getElementById('echoFrame'),frame);
 }finally{h.close();}
});
test('Every laboratory dependency is precached at its exact URL; vascular prerequisites load first',()=>{
 const html=read('ecocardio/index.html'),urls=[...html.matchAll(/(?:src|href)="([^"#]+\.(?:js|css)(?:\?[^\"]+)?)"/g)].map(m=>m[1]);
 const ctx={URL,Set,Map,self:{location:{href:'https://example.test/Isoelettrica/sw.js'},addEventListener(){}},setTimeout,clearTimeout};vm.runInNewContext(read('sw.js')+';this.precache=CORE;',ctx);
 for(const url of urls){const resolved=new URL(url,'https://example.test/Isoelettrica/ecocardio/index.html').href;assert.ok(ctx.precache.some(x=>new URL(x,ctx.self.location.href).href===resolved),url);}
 assert.ok(html.indexOf('vascular-cuffs.js')<html.indexOf('pulmonary-arteries.js'));
 assert.ok(ctx.precache.includes('./ecocardio/index.html'));
});
