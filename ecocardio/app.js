(function(){'use strict';
const C=window.EchoCore,D=window.EchoViews,M=window.CardiacMechanics,$=id=>document.getElementById(id);
let view=D.views[0],state={...C.defaults},mode='explore',renderMode='echo',labels=true,playing=false,ready=false,available=true,t=4500,previous=0,lastDraw=0,dirty=true,sections=[],meshes=[],motion={atr:0,vent:0},currentPose=C.pose(view);
const stage=window.EchoScene.create($('stage'),(x,y)=>{state.slideX=C.clamp(x-view.origin[0],-.6,.6);state.slideY=C.clamp(y-view.origin[1],-.6,.6);syncControls();changed();});
const canvas=$('scan'),ctx=canvas.getContext('2d');let width=600,height=375,texture=null;
const sc=window.ISO_DATA.SCENARIOS.find(s=>s.id==='normale'),params=Object.fromEntries(sc.params.map(p=>[p.k,p.def])),cfg=sc.build(params);cfg.noise=0;
const stream=new window.ECG.Stream(cfg,17);stream.ensure(t+1200);
if(window.parent!==window)document.body.classList.add('embedded');
try{const theme=localStorage.getItem('iso-echo-theme');if(theme==='light'||theme==='dark')document.documentElement.dataset.theme=theme;}catch(_){}

function makeTexture(){const n=document.createElement('canvas');n.width=n.height=96;const c=n.getContext('2d'),data=c?.createImageData(96,96);if(!data?.data)return;let seed=19287;for(let i=0;i<data.data.length;i+=4){seed=(Math.imul(1664525,seed)+1013904223)>>>0;const value=40+seed%210;data.data[i]=data.data[i+1]=data.data[i+2]=value;data.data[i+3]=255;}c.putImageData(data,0,0);texture=ctx.createPattern(n,'repeat');}
makeTexture();
function resize(){width=Math.max(240,canvas.clientWidth);height=Math.max(220,canvas.clientHeight);const dpr=Math.min(devicePixelRatio||1,1.75);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);dirty=true;if(ready)render();}
function chart(){const p=currentPose,top=20,bottom=height-43,scale=Math.min((bottom-top)/p.depth,(width-54)/(2*p.depth*Math.sin(p.halfAngle)));return {x:width/2,y:top,scale};}
function sector(q,p){ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.arc(q.x,q.y,p.depth*q.scale,Math.PI/2-p.halfAngle,Math.PI/2+p.halfAngle);ctx.closePath();}
function paths(items,q,closedOnly=false){ctx.beginPath();for(const path of items){if(closedOnly&&!path.closed)continue;path.points.forEach((p,i)=>{const x=q.x+p[0]*q.scale,y=q.y+p[1]*q.scale;if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);});if(path.closed)ctx.closePath();}}
function label(text,x,y,color){ctx.font='600 10px -apple-system, sans-serif';const w=ctx.measureText(text).width+12;ctx.fillStyle='#0d191cde';ctx.fillRect(x-w/2,y-10,w,17);ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y+2);ctx.textAlign='left';}
function render(){
 if(!ready)return;const dpr=canvas.width/width;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,width,height);ctx.fillStyle='#080d11';ctx.fillRect(0,0,width,height);const q=chart(),p=currentPose;
 sector(q,p);ctx.fillStyle=renderMode==='echo'?'#131a1c':'#101c24';ctx.fill();ctx.save();ctx.clip();
 if(texture&&renderMode==='echo'){ctx.globalAlpha=.065;ctx.fillStyle=texture;ctx.fillRect(0,0,width,height);ctx.globalAlpha=1;}
 const visible=[];
 for(const s of sections){
  const points=s.lines.flat().filter(v=>C.inside(v[0],v[1],p));if(!points.length)continue;visible.push({s,points});
  // Una superficie chiusa isolata può delimitare un lume: le pareti vengono
  // tracciate, senza riempire arbitrariamente le cavità dell'atlante.
  if(s.layer==='valves'&&s.paths.some(x=>x.closed)){
   paths(s.paths,q,true);ctx.fillStyle=renderMode==='echo'?(s.layer==='valves'?'#bcc4bc':'#666e6c'):s.color;ctx.fill('evenodd');
   if(texture&&renderMode==='echo'){ctx.save();ctx.clip('evenodd');ctx.fillStyle=texture;ctx.globalAlpha=.35;ctx.fillRect(0,0,width,height);ctx.restore();}
  }
  paths(s.paths,q);ctx.strokeStyle=renderMode==='echo'?(s.layer==='valves'?'#e6e9dd':'#b1b9b6'):s.color;ctx.lineWidth=renderMode==='echo'?(s.layer==='vessels'?2.2:2.0):1.4;
  if(renderMode==='echo'){ctx.shadowColor='#e0e7d455';ctx.shadowBlur=2;}ctx.stroke();ctx.shadowBlur=0;
 }
 if(labels){const used=new Set(),placed=[];for(const {s,points}of visible){const def=D.dictionary[s.name];if(!def||!view.focus.includes(def.id)||used.has(def.short))continue;used.add(def.short);const c=points.reduce((a,p)=>[a[0]+p[0]/points.length,a[1]+p[1]/points.length],[0,0]);let x=q.x+c[0]*q.scale,y=q.y+c[1]*q.scale;for(const prev of placed)if(Math.abs(x-prev[0])<42&&Math.abs(y-prev[1])<22)y+=23;placed.push([x,y]);label(def.short,x,y,renderMode==='echo'?'#d0e7dc':def.color);}}
 ctx.restore();
 // Il marker a destra del settore corrisponde al lato +u della sonda 3D.
 ctx.fillStyle='#7ad1df';ctx.beginPath();ctx.arc(q.x+15,q.y+5,3,0,Math.PI*2);ctx.fill();
 ctx.strokeStyle='#465e66';ctx.lineWidth=1;ctx.fillStyle='#8ca4a9';ctx.font='9px -apple-system, sans-serif';
 for(const fraction of [.25,.5,.75,1]){const r=p.depth*q.scale*fraction,a=Math.PI/2+p.halfAngle,x=q.x+r*Math.cos(a),y=q.y+r*Math.sin(a);ctx.beginPath();ctx.moveTo(x-5,y);ctx.lineTo(x,y);ctx.stroke();ctx.textAlign='right';ctx.fillText(Math.round(fraction*state.depth)+'%',x-8,y+3);}ctx.textAlign='left';
 // Derivazione II del motore ECG esistente, letta senza alterarne i dati.
 const vec=[0,0,0],leads=new Array(12),y=height-15,w=Math.min(175,width*.33);ctx.beginPath();ctx.strokeStyle='#85cbb8';ctx.lineWidth=1.2;
 for(let x=0;x<=w;x+=1.5){const at=t-2400+x/w*2400;stream.vec(at,vec);stream.leads(at,vec,leads);const yy=y-leads[1]*10;x?ctx.lineTo(24+x,yy):ctx.moveTo(24+x,yy);}ctx.stroke();ctx.fillStyle='#769b96';ctx.font='8px -apple-system, sans-serif';ctx.fillText('DII · '+(playing?'sinusale':'fermo'),24+w+8,y+2);
 const legend=visible.filter(({s})=>D.dictionary[s.name]&&view.focus.includes(D.dictionary[s.name].id));const keys=new Set();$('legend').replaceChildren();for(const {s}of legend){const def=D.dictionary[s.name];if(keys.has(def.label))continue;keys.add(def.label);const span=document.createElement('span'),i=document.createElement('i');i.style.background=def.color;span.append(i,document.createTextNode(def.label));$('legend').append(span);}if(!keys.size)$('legend').textContent='Il piano attuale non attraversa le strutture bersaglio: prova a riorientare la sonda.';
}
function calculate(){currentPose=C.pose(view,state);const clock=window.CardiacClock.read(stream,t,cfg);motion=window.HeartPreviewMotion.sample(clock.events,t,cfg);sections=C.slice(meshes,currentPose,q=>M.deform(q,motion));stage.setPose(currentPose,C.pose(view));stage.setMotion(motion,t);stage.draw();render();dirty=false;}
function feedback(){const a=C.alignment(state);$('alignment').value=a.score;$('alignment-text').textContent=a.score+'%';if(mode!=='practice'){$('hint').textContent=C.alignment(state).reached?'Vista di riferimento. Muovi un cursore per esplorare i piani vicini.':'Il piano e la sezione seguono la tua sonda. Ripristina il riferimento per confrontare.';return;}
 const names={slideX:'spostamento laterale',slideY:'spostamento verticale',rotation:'rotazione del marker',fan:'inclinazione fuori piano',rock:'basculamento nel piano',depth:'profondità'};
 $('hint').textContent=a.reached?'Posizione vicina al riferimento: verifica l’allineamento.':'Lavora su '+names[a.largest]+'. Puoi attivare la sonda di riferimento in Livelli.';
}
function changed(){dirty=true;feedback();$('practice-result').textContent='';if(ready)calculate();}
function syncControls(){for(const key of Object.keys(C.defaults)){const n=key.startsWith('slide')?Math.round(state[key]*100):Math.round(state[key]);$(key).value=n;$(key+'-out').value=n+(key.startsWith('slide')||key==='depth'?'%':'°');}}
function select(id){const next=D.views.find(v=>v.id===id);if(!next)return;view=next;state=mode==='practice'?C.perturbed(D.views.indexOf(view)+1):{...C.defaults};syncControls();$('view-code').textContent=view.code;$('view-title').textContent=view.title;$('tip').textContent=view.tip;$('learn').textContent=view.learn;$('practice-target').textContent='Ritrova '+view.code;
 $('groups').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===view.group)));$('views').replaceChildren();
 for(const item of D.views.filter(v=>v.group===view.group)){const b=document.createElement('button');b.dataset.view=item.id;b.textContent=item.code;b.setAttribute('aria-pressed',String(item.id===view.id));b.addEventListener('click',()=>select(item.id));$('views').append(b);}changed();
}
for(const group of D.groups){const b=document.createElement('button');b.textContent=group.name;b.dataset.group=group.id;b.setAttribute('aria-pressed',String(group.id===view.group));b.addEventListener('click',()=>select(D.views.find(v=>v.group===group.id).id));$('groups').append(b);}
for(const key of Object.keys(C.defaults))$(key).addEventListener('input',()=>{state[key]=Number($(key).value)/(key.startsWith('slide')?100:1);syncControls();changed();});
$('reset').addEventListener('click',()=>{state={...C.defaults};syncControls();changed();if(mode==='practice')$('practice-result').textContent='Riferimento mostrato. Scegli di nuovo la vista per iniziare un nuovo esercizio.';});
document.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{mode=b.dataset.mode;document.querySelectorAll('[data-mode]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.mode===mode)));$('practice').hidden=mode!=='practice';$('ghost').checked=false;stage.setLayers({ghost:false});select(view.id);}));
document.querySelectorAll('[data-render]').forEach(b=>b.addEventListener('click',()=>{renderMode=b.dataset.render;document.querySelectorAll('[data-render]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.render===renderMode)));$('scan-kind').textContent=renderMode==='echo'?'ECO SINTETICA':'SEZIONE ANATOMICA';render();}));
$('labels').addEventListener('click',()=>{labels=!labels;$('labels').setAttribute('aria-pressed',String(labels));render();});
$('play').addEventListener('click',()=>{playing=!playing;$('play').textContent=playing?'Ⅱ Ferma':'▷ Anima';$('play').setAttribute('aria-pressed',String(playing));dirty=true;});
$('layers').addEventListener('click',()=>{$('layer-panel').hidden=!$('layer-panel').hidden;$('layers').setAttribute('aria-expanded',String(!$('layer-panel').hidden));});
for(const key of ['skin','ribs','vessels','plane','ghost'])$(key).addEventListener('change',()=>{stage.setLayers({[key]:$(key).checked});stage.draw();});
$('opacity').addEventListener('input',()=>{stage.setLayers({opacity:Number($('opacity').value)/100});stage.draw();});
document.querySelectorAll('[data-drag]').forEach(b=>b.addEventListener('click',()=>{stage.setDragMode(b.dataset.drag);document.querySelectorAll('[data-drag]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.drag===b.dataset.drag)));$('stage-note').textContent=b.dataset.drag==='probe'?'Trascina la sonda · cursori per movimenti precisi':'Trascina per ruotare · pizzica per ingrandire';}));
$('camera-reset').addEventListener('click',()=>stage.resetCamera());
$('check').addEventListener('click',()=>{const a=C.alignment(state);$('practice-result').textContent=a.reached?'Allineamento al riferimento raggiunto. Ora osserva le strutture della sezione.':'Il riferimento non è ancora raggiunto. '+$('hint').textContent;});
$('theme').addEventListener('click',()=>{const value=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=value;try{localStorage.setItem('iso-echo-theme',value);}catch(_){};});
$('info').addEventListener('click',()=>{if(typeof $('info-dialog').showModal==='function')$('info-dialog').showModal();else $('info-dialog').setAttribute('open','');});
$('info-close').addEventListener('click',()=>{if(typeof $('info-dialog').close==='function')$('info-dialog').close();else $('info-dialog').removeAttribute('open');});
for(const source of D.sources){const li=document.createElement('li'),a=document.createElement('a');a.href=source.href;a.textContent=source.title;a.target='_blank';a.rel='noopener';li.append(a);$('sources').append(li);}
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin||e.data?.type!=='iso-echo-visibility')return;available=!!e.data.active;if(['light','dark'].includes(e.data.theme))document.documentElement.dataset.theme=e.data.theme;if(available){stage.resize();resize();dirty=true;}});
document.addEventListener('visibilitychange',()=>{previous=0;if(!document.hidden)dirty=true;});
if(typeof ResizeObserver==='function')new ResizeObserver(resize).observe(canvas);else window.addEventListener('resize',resize);
function loadAtlas(){
 $('load').hidden=false;$('load').textContent='Caricamento dell’atlante anatomico…';
 const failed=()=>{ready=false;$('load').hidden=false;$('load').textContent='Atlante non disponibile. Controlla la connessione e riprova.';const button=document.createElement('button');button.textContent='Riprova il caricamento';button.className='quiet';button.addEventListener('click',loadAtlas,{once:true});$('load').append(button);};
 new window.THREE.GLTFLoader().load('../prototipo-cuore/heart-z-anatomy.glb',gltf=>{try{
  const source=window.HeartAtlasGeometry.sourceMeshes(gltf.scene);window.AnatomyRefinements.apply(source,window.HeartAtlasGeometry.material);
  const displayed=source.filter(m=>['wall','valves','vessels'].includes(m.userData.layer));
  meshes=displayed.map(m=>{const name=m.userData.sourceName,def=D.dictionary[name];return {name,id:def?.id||name,label:def?.label||m.userData.label||name,color:def?.color||'#b8c3bd',layer:m.userData.layer,positions:new Float32Array(m.geometry.attributes.position.array),indices:m.geometry.index?.array};});
  stage.setModel(displayed);ready=true;$('load').hidden=true;$('stage').dataset.ready='true';$('stage').dataset.renderer=stage.software?'canvas':'webgl';resize();calculate();window.parent.postMessage({type:'iso-echo-ready'},location.origin);
 }catch(error){console.error('Ecocardio: caricamento anatomico non riuscito',error);failed();}},undefined,failed);
}
function tick(now){const dt=previous?Math.min(80,now-previous):0;previous=now;if(ready&&available&&!document.hidden){if(playing){t+=dt;stream.ensure(t+1200);stream.prune(t-5000);dirty=true;}if(dirty&&now-lastDraw>(stage.software?100:50)){calculate();lastDraw=now;}}requestAnimationFrame(tick);}
select('plax');loadAtlas();requestAnimationFrame(tick);
// Read-only stato per verifiche riproducibili; i comandi utente passano dal DOM.
window.EchoLab={get ready(){return ready;},get view(){return view.id;},get state(){return {...state};},get pose(){return currentPose;},get slices(){return sections;},get time(){return t;},get playing(){return playing;},get mode(){return mode;},get renderer(){return stage.software?'canvas':'webgl';}};
})();
