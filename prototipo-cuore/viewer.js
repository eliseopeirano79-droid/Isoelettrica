/* Local feasibility prototype. See ATTRIBUZIONI.md for source and known gaps. */
(function () {
'use strict';
let lab=null;
const $ = id => document.getElementById(id), T = window.THREE;
const sourceLabels = {
 'Right atrium':'Atrio destro','Left atrium':'Atrio sinistro','Right ventricle':'Ventricolo destro','Left ventricle':'Ventricolo sinistro',
 'Anterior papillary muscle of right ventricle':'Muscolo papillare anteriore · VD','Inferior papillary muscle of right ventricle':'Muscolo papillare inferiore · VD','Septal papillary muscle of right ventricle':'Muscolo papillare settale · VD','Inferior papillary muscle of left ventricle':'Muscolo papillare inferiore · VS',
 'Inferior leaflet of right atrioventricular valve':'Tricuspide · lembo inferiore','Septal leaflet of right atrioventricular valve':'Tricuspide · lembo settale','Posterior leaflet of left atrioventricular valve':'Mitrale · lembo posteriore',
 'Left coronary leaflet':'Aortica · lembo coronarico sinistro','Right coronary leaflet':'Aortica · lembo coronarico destro','Non-coronary leaflet':'Aortica · lembo non coronarico',
 'Anterior semilunar leaflet of pulmonary valve':'Polmonare · lembo anteriore','Left semilunar leaflet of pulmonary valve':'Polmonare · lembo sinistro','Right semilunar leaflet of pulmonary valve':'Polmonare · lembo destro',
 'Right coronary artery':'Arteria coronaria destra','Left coronary artery':'Tronco comune sinistro','Circumflex artery of heart':'Arteria circonflessa','Anterior interventricular artery':'Interventricolare anteriore · IVA','Right inferolateral branch of right coronary artery':'Ramo inferolaterale della coronaria destra','Septal branches of anterior interventricular artery':'Rami settali dell’IVA',
 'Great cardiac vein':'Vena cardiaca magna','Middle cardiac vein':'Vena cardiaca media',"Inferior vein of left ventricle (//Posterior '')":'Vena inferiore del VS · ramo posteriore','Inferior vein of left ventricle':'Vena inferiore del ventricolo sinistro','Coronary sinus':'Seno coronarico',
 'Inferior vena cava (thoracic part)':'Vena cava inferiore · tratto toracico','Left pulmonary artery':'Arteria polmonare sinistra','Right pulmonary artery':'Arteria polmonare destra','Left superior pulmonary vein':'Vena polmonare superiore sinistra','Left inferior pulmonary vein':'Vena polmonare inferiore sinistra','Right superior pulmonary vein':'Vena polmonare superiore destra','Right inferior pulmonary vein':'Vena polmonare inferiore destra',
 'Ascending aorta':'Aorta ascendente','Aortic arch':'Arco aortico','Pulmonary trunk':'Tronco polmonare','Superior vena cava':'Vena cava superiore'
};
const layerLabels = {wall:'Pareti e camere',valves:'Valvole e muscoli papillari',coronaries:'Coronarie',veins:'Vene cardiache',vessels:'Grandi vasi',conduction:'Conduzione illustrativa'};
let renderer;
try { renderer = new T.WebGLRenderer({ antialias:true,alpha:true }); }
catch (e) { $('load').textContent='La vista 3D richiede WebGL. Apri l’anteprima in un browser con accelerazione grafica.'; return; }
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1,2));
renderer.outputEncoding=T.sRGBEncoding; renderer.toneMapping=T.ACESFilmicToneMapping; renderer.toneMappingExposure=.94;
renderer.localClippingEnabled=true;
const stage=$('stage');stage.appendChild(renderer.domElement);
const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.05,80);
scene.add(new T.HemisphereLight(0xd3e5ed,0x52323b,.85));
function light(color,power,x,y,z){const l=new T.DirectionalLight(color,power);l.position.set(x,y,z);scene.add(l);}
light(0xffe5d9,1.55,-3,4,5);light(0xa7cde9,.85,4,1,-3);light(0xffb7a5,.45,-4,-1,-2);
const anatomy=new T.Group(),circuit=new T.Group();scene.add(anatomy,circuit);circuit.visible=false;
const meshes=[],paths=[],nodes=[];
const uniforms={uAmpA:{value:.06},uAmpV:{value:.10},uLong:{value:.04},uTwist:{value:.087},uAtr:{value:0},uVent:{value:0},uFibr:{value:0},uTime:{value:0}};
// Shared displacement field keeps vessels attached to the contracting surface.
// Illustrative motion, not a patient-specific mechanical model or valve rig.
function movingMaterial(mat){
 mat.onBeforeCompile=shader=>{CardiacMechanics.shader(shader,uniforms);if(lab)lab.decorate(shader,mat);};
 mat.customProgramCacheKey=()=> 'iso-coupled-mechanics-v1';return mat;
}
const cutPlane=new T.Plane(new T.Vector3(0,0,-1),.12);
let view='surface',selected=null,loaded=false,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,slow=false,t=4500,lastTime=0,available=true;
const orbit={theta:.10,phi:1.43,r:7.2,target:new T.Vector3(.12,.62,0)};
function updateCamera(){const target=orbit.target,r=orbit.r;camera.position.set(target.x+r*Math.sin(orbit.phi)*Math.sin(orbit.theta),target.y+r*Math.cos(orbit.phi),target.z+r*Math.sin(orbit.phi)*Math.cos(orbit.theta));camera.lookAt(target);camera.updateMatrixWorld();}
const description={surface:'Camere, coronarie e vene: le strutture dell’atlante nello stesso spazio.',section:'Una sezione delle pareti rende visibili cavità, lembi e muscoli papillari.',valves:'Quattro apparati valvolari ricostruiti e animati; apertura e coaptazione modificabili.',conduction:'Vie elettriche illustrative aggiunte al modello: il tracciato guida l’animazione.'};
function applyView(){
 for(const mesh of meshes){
  const layer=mesh.userData.layer,m=mesh.material;
  mesh.visible=$(layer).checked;
  let opacity=1;
  if(layer==='wall' && view==='valves')opacity=.055;
  if(layer==='wall' && view==='conduction')opacity=.065;
  if(layer==='valves' && view==='conduction')opacity=.15;
  if(layer==='vessels' && (view==='valves'||view==='conduction'))opacity=.10;
  m.opacity=opacity;m.transparent=opacity<1||layer==='conduction';m.depthWrite=opacity===1&&layer!=='conduction';
  m.clippingPlanes=layer==='wall'&&view==='section'?[cutPlane]:[];
  m.needsUpdate=true;
 }
 circuit.visible=$('conduction').checked;
 $('cut-control').hidden=view!=='section';
 $('view-description').textContent=description[view];
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 if(lab)lab.applyVisibility();
 if(selected&&!selected.visible)selectPart(null);
}
function setView(next){
 view=next;$('section-enabled').checked=next==='section';
 for(const k of ['wall','valves','vessels'])$(k).checked=true;
 $('coronaries').checked=next==='surface'||next==='section';$('veins').checked=next==='surface';$('conduction').checked=next==='conduction';
 applyView();
}
function selectPart(mesh){
 if(selected?.material.emissive){selected.material.emissive.setHex(0);selected.material.emissiveIntensity=0;}
 selected=mesh;
 if(!mesh){$('part').value='';$('selection').innerHTML='<b>'+meshes.filter(m=>!m.userData.originalValve).length+' strutture selezionabili</b><p>Scegli una parte dal menu o tocca direttamente il cuore.</p>';if(lab)lab.selected(null);return;}
 if(mesh.material.emissive){mesh.material.emissive.set('#ffd8a2');mesh.material.emissiveIntensity=.18;}
 $('part').value=mesh.uuid;
 const b=document.createElement('b'),p=document.createElement('p');
 b.textContent=mesh.userData.label;p.textContent=layerLabels[mesh.userData.layer]+' · '+(mesh.userData.origin||'Atlante anatomico');
 $('selection').replaceChildren(b,p);if(lab)lab.selected(mesh);
}
new T.GLTFLoader().load('heart-z-anatomy.glb',gltf=>{
 const source=HeartAtlasGeometry.sourceMeshes(gltf.scene);AnatomyRefinements.apply(source,HeartAtlasGeometry.material);
 for(const o of source){const name=o.userData.sourceName;o.material=movingMaterial(o.material);o.userData.label=o.userData.label||sourceLabels[name]||name;anatomy.add(o);meshes.push(o);}
 if(window.HeartAtlasGeometry){const join=HeartAtlasGeometry.junctionMesh();join.material=movingMaterial(join.material);anatomy.add(join);meshes.push(join);}
 const sorted=[...meshes].sort((a,b)=>a.userData.label.localeCompare(b.userData.label,'it'));
 for(const m of sorted){const option=document.createElement('option');option.value=m.uuid;option.textContent=m.userData.label;$('part').appendChild(option);}
 CardiacAttachments.seamNormals(meshes);
 loaded=true;$('load').hidden=true;if(lab)lab.loaded();applyView();document.dispatchEvent(new Event('iso-atlas-loaded'));
},undefined,error=>{$('load').textContent='Il modello non è stato caricato. Ricarica la pagina per riprovare.';console.error('Heart asset load failed',error);});
// One registered graph shared with the ECG view, in unscaled atlas coordinates.
const electrical=IsoConductionView.create({material:m=>movingMaterial(m),deform:p=>lab&&lastMotion?lab.deformPoint(p):p});
circuit.add(electrical.group);electrical.xray(true);
const scenarios=Object.fromEntries(ISO_DATA.SCENARIOS.map(sc=>[sc.id,sc]));
let stream,cfg,clinicalCase=null,clinicalParams={},lastMotion=null;
function resetRhythm(){const sc=scenarios[clinicalCase||$('rhythm').value];const params={...Object.fromEntries(sc.params.map(p=>[p.k,p.def])),...clinicalParams};cfg=IsoConduction.configure(sc.id,sc.build(params),params);if(clinicalCase)cfg.isoClinical=true;if(lab&&!clinicalCase)cfg=lab.configure(cfg);stream=new ECG.Stream(cfg,17);t=4500;stream.ensure(t+1000);if(lab)lab.resetMechanics();}
resetRhythm();
function animateHeart(){
 stream.ensure(t+500);stream.prune(t-6500);
 const clock=window.CardiacClock?CardiacClock.read(stream,t,cfg):null,ev=clock?clock.events:stream.eventsAround(t),motion=lab?lab.motion(ev,t,cfg):HeartPreviewMotion.sample(ev,t,cfg),{da,dv}=motion;
 lastMotion=motion;uniforms.uAtr.value=motion.atr;uniforms.uVent.value=motion.vent;uniforms.uFibr.value=motion.fibr;uniforms.uTime.value=t;
 if(lab){lab.animate(t,ev,cfg,motion);const electric=electrical.update(clock,cfg);lab.updateLabels();if(view==='conduction'&&$('phase').textContent!==electric.phase)$('phase').textContent=electric.phase;return;}
 const isAsystole=$('rhythm').value==='asistolia';
 let phase=isAsystole?'Asistolia · nessuna contrazione':cfg.cont==='vf'?'FV · nessuna contrazione organizzata':uniforms.uVent.value>.05?'Sistole ventricolare':uniforms.uAtr.value>.05?'Contrazione atriale':'Diastole';
 if(cfg.av==='III')phase+=' · dissociazione AV';
 if($('phase').textContent!==phase)$('phase').textContent=phase;
 for(const p of paths){
  let u=-1;
  if(p.kind==='atr'&&ev.A&&da<110)u=da/110;
  if(p.kind==='his'&&ev.V&&dv<35)u=dv/35;
  if(p.kind==='branch'&&ev.V&&dv>=25&&dv<100)u=(dv-25)/75;
  p.spark.visible=u>=0&&u<=1&&cfg.cont!=='vf'&&!isAsystole;
  if(p.spark.visible)p.curve.getPointAt(u,p.spark.position);
 }
 nodes[0].material.color.set(da<80?'#ffffff':'#d8b873');
 nodes[1].material.color.set(cfg.av==='III'&&da>90&&da<270?'#ff526d':'#d8b873');
}
const ecg=$('ecg'),ctx=ecg.getContext('2d'),vec=[0,0,0],leads=new Array(12);
let ecgWidth=0,ecgHeight=84,lastTrace=0;
function drawECG(){
 const w=ecgWidth,h=ecgHeight;if(!w)return;ctx.clearRect(0,0,w,h);
 const light=document.documentElement.dataset.theme==='light';ctx.strokeStyle=light?'#d6e2d9':'#203931';ctx.lineWidth=.5;ctx.beginPath();
 for(let x=0;x<w;x+=16){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=0;y<h;y+=16){ctx.moveTo(0,y);ctx.lineTo(w,y);}ctx.stroke();
 ctx.beginPath();ctx.strokeStyle=light?'#214a3a':'#b4dfc0';ctx.lineWidth=1.5;
 for(let x=0;x<=w;x+=2){const tau=t-4200+x/w*4200;stream.vec(tau,vec);stream.leads(tau,vec,leads);const y=h*.62-leads[1]*32;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
 ctx.stroke();
 ctx.strokeStyle='#e4c680';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(w-1,0);ctx.lineTo(w-1,h);ctx.stroke();
}
function resize(){
 const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<600?43:35;camera.updateProjectionMatrix();
 const dpr=Math.min(devicePixelRatio||1,2);ecgWidth=ecg.clientWidth;ecg.width=Math.round(ecgWidth*dpr);ecg.height=Math.round(ecgHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);drawECG();
}
new ResizeObserver(resize).observe(stage);new ResizeObserver(resize).observe(ecg);
const pts=new Map();let moved=0,down=null,pinch=null;
stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);down=[e.clientX,e.clientY];moved=0;if(pts.size===2){const a=[...pts.values()];pinch={d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),r:orbit.r};}});
stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const old=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);moved+=Math.abs(e.clientX-old[0])+Math.abs(e.clientY-old[1]);if(pts.size===1){orbit.theta-=(e.clientX-old[0])*.007;orbit.phi=Math.max(.15,Math.min(3,orbit.phi+(old[1]-e.clientY)*.007));}else if(pinch){const a=[...pts.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);orbit.r=Math.max(1.2,Math.min(13,pinch.r*pinch.d/Math.max(d,1)));}});
function endPointer(e){
 if(e.type==='pointerup'&&pts.size===1&&moved<6&&down&&loaded){
  const rect=stage.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
  const hits=CardiacAttachments.pick(ray,meshes,(p,m)=>lab?lab.deformPoint(p,m,false):p).filter(h=>!lab||lab.acceptHit(h));if(!lab||!lab.hit(hits[0]))selectPart(hits.length?hits[0].object:null);
 }
 pts.delete(e.pointerId);if(pts.size<2)pinch=null;down=null;
}
stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
stage.addEventListener('wheel',e=>{e.preventDefault();orbit.r=Math.max(1.2,Math.min(13,orbit.r*Math.exp(e.deltaY*.001)));},{passive:false});
stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')orbit.theta-=.1;if(e.key==='ArrowRight')orbit.theta+=.1;if(e.key==='ArrowUp')orbit.phi=Math.max(.15,orbit.phi-.1);if(e.key==='ArrowDown')orbit.phi=Math.min(3,orbit.phi+.1);if(e.key==='+'||e.key==='=')orbit.r=Math.max(1.2,orbit.r-.4);if(e.key==='-')orbit.r=Math.min(13,orbit.r+.4);if(e.key==='Home')resetCamera();});
function resetCamera(){orbit.theta=.10;orbit.phi=1.43;orbit.r=7.2;orbit.target.set(.12,.62,0);}
$('reset').addEventListener('click',resetCamera);
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
Object.keys(layerLabels).forEach(k=>$(k).addEventListener('change',applyView));
$('cut').addEventListener('input',()=>{cutPlane.constant=Number($('cut').value);});
$('part').addEventListener('change',()=>{const m=meshes.find(o=>o.uuid===$('part').value);if(m){$(m.userData.layer).checked=true;applyView();}selectPart(m||null);});
$('rhythm').addEventListener('change',()=>{clinicalCase=$('rhythm').value==='normale'?null:$('rhythm').value;clinicalParams={};resetRhythm();drawECG();});
function updatePlayback(){$('play').setAttribute('aria-pressed',String(playing));$('play').textContent=playing?'Ⅱ Pausa':'▶ Riprendi';}
$('play').addEventListener('click',()=>{playing=!playing;updatePlayback();});updatePlayback();
$('slow').addEventListener('click',()=>{slow=!slow;$('slow').setAttribute('aria-pressed',String(slow));$('slow').textContent=slow?'¼× Attivo':'¼× Rallenta';});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();available=false;$('load').hidden=false;$('load').textContent='Vista 3D interrotta. Ricarica la pagina per ripristinarla.';});
document.addEventListener('visibilitychange',()=>{lastTime=0;});
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden||!available||window.IsoLabEmbedded?.active===false){lastTime=0;return;}
 if(lastTime&&playing)t+=Math.min(80,now-lastTime)*(slow?.25:1);lastTime=now;
 updateCamera();animateHeart();renderer.render(scene,camera);
 if(now-lastTrace>33){drawECG();lastTrace=now;}
}
const api={T,scene,camera,stage,anatomy,circuit,meshes,paths,nodes,electrical,uniforms,sourceLabels,movingMaterial,selectPart,applyView,setView,
 get clock(){return window.CardiacClock?CardiacClock.read(stream,t,cfg):null;},get view(){return view;},get selected(){return selected;},get time(){return t;},get stream(){return stream;},get config(){return cfg;},
 focusStructure(d){if(d.center){$('section-enabled').checked=true;$('section-axis').value='x';$('section-flip').checked=false;$('cut').value=d.center[0]+.10;$('valves').checked=false;$('vessels').checked=false;$('coronaries').checked=false;$('veins').checked=false;applyView();}else if(d.membrane){for(const id of ['valves','vessels','coronaries','veins'])$(id).checked=false;applyView();}$('view-description').textContent=d.label+' · geometria illustrativa modificabile.';orbit.target.set(...(d.center||d.focus||[-.03,1.3,-.9]));orbit.r=d.center?2.4:(d.distance||3.8);const n=new T.Vector3(...(d.normal||d.direction||[1,.2,-1])).normalize();orbit.theta=Math.atan2(n.x,n.z);orbit.phi=Math.acos(n.y);updateCamera();},
 focusDuct(){setView('surface');const d=AnatomyRefinements.ductGeometry(meshes,.02);orbit.target.copy(d.a).lerp(d.p,.5);orbit.r=3;orbit.theta=1.9;orbit.phi=1.25;d.geometry.dispose();updateCamera();},
 focusValve(id){setView('valves');const d=AnatomyRefinements.valveRoots()[id],n=new T.Vector3(...d.normal).normalize();orbit.target.set(...d.center);orbit.r=1.6;orbit.theta=Math.atan2(n.x,n.z);orbit.phi=Math.acos(n.y);updateCamera();},
 focusConduction(){orbit.r=3.8;orbit.theta=.1;orbit.phi=1.55;orbit.target.set(-.2,-.2,.1);updateCamera();},
 setClinicalCase(id,params={}){clinicalCase=scenarios[id]?id:null;clinicalParams={...params};if(clinicalCase&&!Array.from($('rhythm').options).some(o=>o.value===id)){const o=document.createElement('option');o.value=id;o.textContent=scenarios[id].name;$('rhythm').append(o);}if(clinicalCase)$('rhythm').value=id;resetRhythm();},
 clearClinicalCase(){clinicalCase=null;clinicalParams={};$('rhythm').value='normale';resetRhythm();},
 resetRhythm, pause(){playing=false;updatePlayback();},seek(value){t=value;animateHeart();drawECG();},
 addMesh(mesh,id,label,layer,origin='Ricostruzione didattica'){
  mesh.userData={...mesh.userData,sourceName:id,label,layer,origin};meshes.push(mesh);
  const op=document.createElement('option');op.value=mesh.uuid;op.textContent=label;$('part').appendChild(op);return mesh;
 }};
lab=window.HeartLab.create(api);resetRhythm();window.IsoPathologyUI?.create(api,lab);
resize();requestAnimationFrame(frame);
})();
