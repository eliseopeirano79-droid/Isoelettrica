/* Local feasibility prototype. See ATTRIBUZIONI.md for source and known gaps. */
(function () {
'use strict';
const $ = id => document.getElementById(id), T = window.THREE;
const sourceLabels = {
 'Right atrium':'Atrio destro','Left atrium':'Atrio sinistro','Right ventricle':'Ventricolo destro','Left ventricle':'Ventricolo sinistro',
 'Anterior papillary muscle of right ventricle':'Muscolo papillare anteriore · VD','Inferior papillary muscle of right ventricle':'Muscolo papillare inferiore · VD','Septal papillary muscle of right ventricle':'Muscolo papillare settale · VD','Inferior papillary muscle of left ventricle':'Muscolo papillare inferiore · VS',
 'Inferior leaflet of right atrioventricular valve':'Tricuspide · lembo inferiore','Septal leaflet of right atrioventricular valve':'Tricuspide · lembo settale','Posterior leaflet of left atrioventricular valve':'Mitrale · lembo posteriore',
 'Left coronary leaflet':'Aortica · lembo coronarico sinistro','Right coronary leaflet':'Aortica · lembo coronarico destro','Non-coronary leaflet':'Aortica · lembo non coronarico',
 'Anterior semilunar leaflet of pulmonary valve':'Polmonare · lembo anteriore','Left semilunar leaflet of pulmonary valve':'Polmonare · lembo sinistro','Right semilunar leaflet of pulmonary valve':'Polmonare · lembo destro',
 'Right coronary artery':'Arteria coronaria destra','Left coronary artery':'Tronco comune sinistro','Circumflex artery of heart':'Arteria circonflessa','Anterior interventricular artery':'Interventricolare anteriore · IVA','Right inferolateral branch of right coronary artery':'Ramo inferolaterale della coronaria destra','Septal branches of anterior interventricular artery':'Rami settali dell’IVA',
 'Great cardiac vein':'Vena cardiaca magna','Middle cardiac vein':'Vena cardiaca media',"Inferior vein of left ventricle (//Posterior '')":'Vena inferiore del VS · ramo posteriore','Inferior vein of left ventricle':'Vena inferiore del ventricolo sinistro','Coronary sinus':'Seno coronarico',
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
const uniforms={uAtr:{value:0},uVent:{value:0},uFibr:{value:0},uTime:{value:0}};
// Shared displacement field keeps vessels attached to the contracting surface.
// Illustrative motion, not a patient-specific mechanical model or valve rig.
const deformGLSL=`
uniform float uRegion; uniform float uAtr; uniform float uVent; uniform float uFibr; uniform float uTime;
vec3 cardiacMotion(vec3 p) {
 float a=uRegion>1.5?0.0:(uRegion>0.5?1.0:smoothstep(-0.05,0.65,p.y)); float base=1.0-smoothstep(0.55,1.15,p.y);
 float v=(1.0-a)*uVent*base; float at=a*uAtr*base;
 vec3 c=vec3(0.15,-0.32,0.2); vec3 d=p-c;
 float angle=v*0.035; float cs=cos(angle);float sn=sin(angle);
 d.xz=mat2(cs,-sn,sn,cs)*d.xz;
 d.xz*=1.0-0.075*v-0.04*at; d.y*=1.0-0.025*v-0.025*at;
 p=c+d;
 p.x+=uFibr*0.009*base*sin(uTime*0.032+p.y*9.0);
 p.z+=uFibr*0.007*base*sin(uTime*0.047+p.x*11.0);
 return p;
}`;
function movingMaterial(mat,region=0){
 mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms,{uRegion:{value:region}});shader.vertexShader=deformGLSL+"\n"+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','vec3 transformed = cardiacMotion(position);');};
 mat.customProgramCacheKey=()=> 'iso-heart-prototype-v1';return mat;
}
const cutPlane=new T.Plane(new T.Vector3(0,0,-1),.12);
let view='surface',selected=null,loaded=false,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,slow=false,t=4500,lastTime=0,available=true;
const orbit={theta:.10,phi:1.43,r:9.2,target:new T.Vector3(.12,.24,0)};
function updateCamera(){camera.position.set(orbit.target.x+orbit.r*Math.sin(orbit.phi)*Math.sin(orbit.theta),orbit.target.y+orbit.r*Math.cos(orbit.phi),orbit.target.z+orbit.r*Math.sin(orbit.phi)*Math.cos(orbit.theta));camera.lookAt(orbit.target);}
const description={surface:'Camere, coronarie e vene: le strutture dell’atlante nello stesso spazio.',section:'Una sezione delle pareti rende visibili cavità, lembi e muscoli papillari.',valves:'Lembi originali isolati. Mitrale e tricuspide sono incomplete; le valvole sono statiche.',conduction:'Vie elettriche illustrative aggiunte al modello: il tracciato guida l’animazione.'};
function applyView(){
 for(const mesh of meshes){
  const layer=mesh.userData.layer,m=mesh.material;
  mesh.visible=$(layer).checked;
  let opacity=1;
  if(layer==='wall' && view==='valves')opacity=.055;
  if(layer==='wall' && view==='conduction')opacity=.11;
  if(layer==='vessels' && (view==='valves'||view==='conduction'))opacity=.10;
  m.opacity=opacity;m.transparent=opacity<1;m.depthWrite=opacity===1;
  m.clippingPlanes=layer==='wall'&&view==='section'?[cutPlane]:[];
  m.needsUpdate=true;
 }
 circuit.visible=$('conduction').checked;
 $('cut-control').hidden=view!=='section';
 $('view-description').textContent=description[view];
 document.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));
 if(selected&&!selected.visible)selectPart(null);
}
function setView(next){
 view=next;
 for(const k of ['wall','valves','vessels'])$(k).checked=true;
 $('coronaries').checked=next==='surface'||next==='section';$('veins').checked=next==='surface';$('conduction').checked=next==='conduction';
 applyView();
}
function selectPart(mesh){
 if(selected){selected.material.emissive.setHex(0);selected.material.emissiveIntensity=0;}
 selected=mesh;
 if(!mesh){$('part').value='';$('selection').innerHTML='<b>32 strutture separate</b><p>Scegli una parte dal menu o tocca direttamente il cuore.</p>';return;}
 mesh.material.emissive.set('#ffd8a2');mesh.material.emissiveIntensity=.18;
 $('part').value=mesh.uuid;
 const b=document.createElement('b'),p=document.createElement('p');
 b.textContent=mesh.userData.label;p.textContent=layerLabels[mesh.userData.layer]+' · '+mesh.userData.sourceName;
 $('selection').replaceChildren(b,p);
}
new T.GLTFLoader().load('heart-z-anatomy.glb',gltf=>{
 gltf.scene.traverse(o=>{
  if(!o.isMesh)return;
  const name=o.userData.sourceName||o.name;
  let layer=o.userData.layer;
  if(layer==='heart')layer=/leaflet|papillary/i.test(name)?'valves':'wall';
  let color={wall:'#a85c67',coronaries:'#ed8860',veins:'#527aac',valves:'#d8c4a0',vessels:'#b86d79'}[layer];
  if(layer==='vessels'&&/cava|Pulmonary/.test(name))color='#6084a2';
  if(/papillary/.test(name))color='#b47a76';
  o.material=movingMaterial(new T.MeshStandardMaterial({color,roughness:layer==='valves'?.56:.62,metalness:0,side:T.DoubleSide,emissiveIntensity:0}),/atrium/.test(name)?1:/ventricle/.test(name)&&layer==='wall'?2:0);
  o.material.color.convertSRGBToLinear();
  Object.assign(o.userData,{sourceName:name,layer,label:sourceLabels[name]||name});meshes.push(o);
 });
 anatomy.add(gltf.scene);
 const sorted=[...meshes].sort((a,b)=>a.userData.label.localeCompare(b.userData.label,'it'));
 for(const m of sorted){const option=document.createElement('option');option.value=m.uuid;option.textContent=m.userData.label;$('part').appendChild(option);}
 loaded=true;$('load').hidden=true;applyView();
},undefined,error=>{$('load').textContent='Il modello non è stato caricato. Ricarica la pagina per riprovare.';console.error('Heart asset load failed',error);});
// Approximate landmarks in the atlas coordinate frame. These are deliberately
// labelled illustrative; the source atlas has no conduction geometry.
const SA=[-.82,.79,-.12],AV=[-.29,-.12,.04],HIS=[.0,-.28,.27],RV=[.36,-.95,.73],LV=[.91,-1.04,.2];
function addPath(kind,points){
 const curve=new T.CatmullRomCurve3(points.map(p=>new T.Vector3(...p)));
 const tube=new T.Mesh(new T.TubeGeometry(curve,48,.012,6,false),movingMaterial(new T.MeshBasicMaterial({color:'#c3a05d',transparent:true,opacity:.66,depthWrite:false,depthTest:false})));tube.renderOrder=5;circuit.add(tube);
 const spark=new T.Mesh(new T.SphereGeometry(.034,10,8),new T.MeshBasicMaterial({color:'#fff0b4',depthTest:false}));spark.renderOrder=6;circuit.add(spark);
 paths.push({kind,curve,spark,tube});
}
addPath('atr',[SA,[-.68,.40,.25],[-.48,.10,.20],AV]);
addPath('atr',[SA,[-.21,.71,-.23],[.3,.48,-.48]]);
addPath('his',[AV,[-.12,-.19,.16],HIS]);
addPath('branch',[HIS,[.12,-.56,.48],RV]);
addPath('branch',[HIS,[.35,-.48,.25],LV]);
addPath('branch',[HIS,[.29,-.53,-.08],[.61,-.83,-.25]]);
for(const [key,p] of [['Nodo senoatriale',SA],['Nodo AV',AV]]){
 const node=new T.Mesh(new T.SphereGeometry(.054,16,12),new T.MeshBasicMaterial({color:'#e8ce88',depthTest:false}));node.position.set(...p);node.renderOrder=7;circuit.add(node);nodes.push(node);
}
const scenarios=Object.fromEntries(ISO_DATA.SCENARIOS.map(sc=>[sc.id,sc]));
let stream,cfg;
function resetRhythm(){const sc=scenarios[$('rhythm').value];const params=Object.fromEntries(sc.params.map(p=>[p.k,p.def]));cfg=sc.build(params);stream=new ECG.Stream(cfg,17);t=4500;stream.ensure(t+1000);}
resetRhythm();
function animateHeart(){
 stream.ensure(t+500);stream.prune(t-6500);
 const ev=stream.eventsAround(t),motion=HeartPreviewMotion.sample(ev,t,cfg),{da,dv}=motion;
 uniforms.uAtr.value=motion.atr;uniforms.uVent.value=motion.vent;uniforms.uFibr.value=motion.fibr;uniforms.uTime.value=t;
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
 ctx.strokeStyle='#203931';ctx.lineWidth=.5;ctx.beginPath();
 for(let x=0;x<w;x+=16){ctx.moveTo(x,0);ctx.lineTo(x,h);}for(let y=0;y<h;y+=16){ctx.moveTo(0,y);ctx.lineTo(w,y);}ctx.stroke();
 ctx.beginPath();ctx.strokeStyle='#b4dfc0';ctx.lineWidth=1.5;
 for(let x=0;x<=w;x+=2){const tau=t-4200+x/w*4200;stream.vec(tau,vec);stream.leads(tau,vec,leads);const y=h*.62-leads[1]*32;x?ctx.lineTo(x,y):ctx.moveTo(x,y);}
 ctx.stroke();
}
function resize(){
 const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h,false);camera.aspect=w/h;camera.fov=w<600?43:35;camera.updateProjectionMatrix();
 const dpr=Math.min(devicePixelRatio||1,2);ecgWidth=ecg.clientWidth;ecg.width=Math.round(ecgWidth*dpr);ecg.height=Math.round(ecgHeight*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);drawECG();
}
new ResizeObserver(resize).observe(stage);new ResizeObserver(resize).observe(ecg);
const pts=new Map();let moved=0,down=null,pinch=null;
stage.addEventListener('pointerdown',e=>{stage.setPointerCapture(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);down=[e.clientX,e.clientY];moved=0;if(pts.size===2){const a=[...pts.values()];pinch={d:Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]),r:orbit.r};}});
stage.addEventListener('pointermove',e=>{if(!pts.has(e.pointerId))return;const old=pts.get(e.pointerId);pts.set(e.pointerId,[e.clientX,e.clientY]);moved+=Math.abs(e.clientX-old[0])+Math.abs(e.clientY-old[1]);if(pts.size===1){orbit.theta-=(e.clientX-old[0])*.007;orbit.phi=Math.max(.15,Math.min(3,orbit.phi+(old[1]-e.clientY)*.007));}else if(pinch){const a=[...pts.values()],d=Math.hypot(a[0][0]-a[1][0],a[0][1]-a[1][1]);orbit.r=Math.max(3,Math.min(13,pinch.r*pinch.d/Math.max(d,1)));}});
function endPointer(e){
 if(e.type==='pointerup'&&pts.size===1&&moved<6&&down&&loaded){
  const rect=stage.getBoundingClientRect(),ray=new T.Raycaster();ray.setFromCamera(new T.Vector2((e.clientX-rect.left)/rect.width*2-1,1-(e.clientY-rect.top)/rect.height*2),camera);
  const hits=ray.intersectObjects(meshes.filter(m=>m.visible&&m.material.opacity>.3),false).filter(h=>!(h.object.userData.layer==='wall'&&view==='section'&&h.point.z>cutPlane.constant));selectPart(hits.length?hits[0].object:null);
 }
 pts.delete(e.pointerId);if(pts.size<2)pinch=null;down=null;
}
stage.addEventListener('pointerup',endPointer);stage.addEventListener('pointercancel',endPointer);
stage.addEventListener('wheel',e=>{e.preventDefault();orbit.r=Math.max(3,Math.min(13,orbit.r*Math.exp(e.deltaY*.001)));},{passive:false});
stage.addEventListener('keydown',e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','+','-','=','Home'].includes(e.key))return;e.preventDefault();if(e.key==='ArrowLeft')orbit.theta-=.1;if(e.key==='ArrowRight')orbit.theta+=.1;if(e.key==='ArrowUp')orbit.phi=Math.max(.15,orbit.phi-.1);if(e.key==='ArrowDown')orbit.phi=Math.min(3,orbit.phi+.1);if(e.key==='+'||e.key==='=')orbit.r=Math.max(3,orbit.r-.4);if(e.key==='-')orbit.r=Math.min(13,orbit.r+.4);if(e.key==='Home')resetCamera();});
function resetCamera(){orbit.theta=.10;orbit.phi=1.43;orbit.r=9.2;}
$('reset').addEventListener('click',resetCamera);
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
Object.keys(layerLabels).forEach(k=>$(k).addEventListener('change',applyView));
$('cut').addEventListener('input',()=>{cutPlane.constant=Number($('cut').value);});
$('part').addEventListener('change',()=>{const m=meshes.find(o=>o.uuid===$('part').value);if(m){$(m.userData.layer).checked=true;applyView();}selectPart(m||null);});
$('rhythm').addEventListener('change',()=>{resetRhythm();drawECG();});
function updatePlayback(){$('play').setAttribute('aria-pressed',String(playing));$('play').textContent=playing?'Ⅱ Pausa':'▶ Riprendi';}
$('play').addEventListener('click',()=>{playing=!playing;updatePlayback();});updatePlayback();
$('slow').addEventListener('click',()=>{slow=!slow;$('slow').setAttribute('aria-pressed',String(slow));$('slow').textContent=slow?'¼× Attivo':'¼× Rallenta';});
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();available=false;$('load').hidden=false;$('load').textContent='Vista 3D interrotta. Ricarica la pagina per ripristinarla.';});
document.addEventListener('visibilitychange',()=>{lastTime=0;});
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden||!available)return;
 if(lastTime&&playing)t+=Math.min(80,now-lastTime)*(slow?.25:1);lastTime=now;
 animateHeart();updateCamera();renderer.render(scene,camera);
 if(now-lastTrace>33){drawECG();lastTrace=now;}
}
resize();requestAnimationFrame(frame);
})();
