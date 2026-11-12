(function(){'use strict';
const C=window.EchoCore,D=window.EchoViews,M=window.CardiacMechanics,V=window.EchoVolume,I=window.EchoImaging,Training=window.EchoTraining,$=id=>document.getElementById(id);
let views=D.views.map(v=>({...v})),view=views[0],state={...C.defaults},settings={...I.defaults},renderMode='echo',layout='single',labels=false,playing=!matchMedia('(prefers-reduced-motion: reduce)').matches,ready=false,available=true;
let t=4500,cycleStart=0,cycleDuration=850,previous=0,lastDraw=0,dirty=true,speed=1,simElapsed=0,volume,imager,valves,meshes=[],motion={atr:0,vent:0},currentPose=C.pose(view),currentFrame=null,secondaryFrame=null,frameRecord=null;
let selected=0,selectedRest=null,tool='inspect',measure=[],planeAngle=90,mAngle=0,mHistory=[],lastM=-Infinity,session=null,comparison=null,legendKey='',feedbackPending=true,toastTimer;
const stage=window.EchoScene.create($('stage'),(x,y)=>{
 const nx=C.clamp(x-view.origin[0],-.6,.6),ny=C.clamp(y-view.origin[1],-.6,.6);
 if(stage.surface&&!stage.surface.point(view.origin[0]+nx,view.origin[1]+ny))return;
 state.slideX=nx;state.slideY=ny;syncControls();changed('pose');
});
const sc=window.ISO_DATA.SCENARIOS.find(s=>s.id==='normale'),params=Object.fromEntries(sc.params.map(p=>[p.k,p.def])),cfg=sc.build(params);cfg.noise=0;
const stream=new window.ECG.Stream(cfg,17);stream.ensure(7000);
const initialClock=window.CardiacClock.read(stream,t,cfg);cycleStart=initialClock.onsetQRS??4000;cycleDuration=initialClock.nextQRS?initialClock.nextQRS.t-cycleStart:initialClock.RR||850;
if(window.parent!==window)document.body.classList.add('embedded');
try{const theme=localStorage.getItem('iso-echo-theme');if(['dark','light'].includes(theme))document.documentElement.dataset.theme=theme;}catch(_){}
const STORAGE='iso-echo-studio-02';let progress={},captures=[];
try{const p=JSON.parse(localStorage.getItem(STORAGE+'-progress')||'{}');for(const m of Training.missions)if(p[m.id]&&typeof p[m.id].independent==='boolean')progress[m.id]=p[m.id];}catch(_){}
try{const a=JSON.parse(localStorage.getItem(STORAGE+'-captures')||'[]');if(Array.isArray(a))captures=a.filter(x=>x&&D.views.some(v=>v.id===x.view)&&typeof x.image==='string'&&x.image.startsWith('data:image/png;base64,')&&x.image.length<2400000&&x.state&&x.settings&&Number.isFinite(x.phase)).slice(-4);}catch(_){}
function toast(text){$('toast').textContent=text;$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
function observe(event,value){Training.observe(session,event,value);}
function saveProgress(){try{localStorage.setItem(STORAGE+'-progress',JSON.stringify(progress));}catch(_){toast('Progressi disponibili per questa sessione; salvataggio sul dispositivo non disponibile.');}}
function saveCaptures(){try{localStorage.setItem(STORAGE+'-captures',JSON.stringify(captures));}catch(_){toast('Acquisizione conservata per questa sessione. Esporta il PNG per salvarla.');}}
function showTab(name){document.querySelectorAll('[data-tab]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.tab===name)));for(const id of ['structures','image','training','archive'])$('tab-'+id).hidden=id!==name;}
function poseFor(v=view,s=state){const p=C.surfacePose(v,s,stage.surface);p.halfAngle=settings.sector*Math.PI/360;return p;}
function resetM(){mHistory=[];lastM=-Infinity;$('mmode-status').textContent='In attesa di campioni · avvia il ciclo';}
function clearSelection(){selected=0;selectedRest=null;stage.highlight(null,null);$('structure-title').textContent='Una sezione, tre modi di capirla.';$('structure-description').textContent='Tocca una parete nell’eco: la stessa struttura si illumina nel cuore 3D. Attiva Anatomia per vedere la distribuzione del tessuto, poi Seziona per guardare dentro il cuore.';$('clear-selection').hidden=true;legendKey='';}
function clearMeasure(){measure=[];$('measure-result').textContent='';$('clear-measure').hidden=true;}
function changed(kind='pose'){
 if(kind==='pose'||kind==='image'){resetM();clearMeasure();feedbackPending=true;}
 if(kind==='pose'){selectedRest=null;stage.highlight(selected?imager?.definitions[selected-1]?.name:null,null);observe('biplane',layout==='biplane'?state.rotation:0);}
 dirty=true;
}
function syncControls(){for(const key of Object.keys(C.defaults)){const n=key.startsWith('slide')?Math.round(state[key]*100):Math.round(state[key]);$(key).value=n;$(key+'-out').value=n+(key.startsWith('slide')||key==='depth'?'%':'°');}}
function syncImage(){for(const key of Object.keys(I.defaults)){$(key).value=settings[key];$(key+'-out').value=settings[key]+(key==='focus'?'%':key==='sector'?'°':'');}}
function select(id,{reset=true}={}){
 const next=views.find(v=>v.id===id);if(!next)return;view=next;if(reset)state={...C.defaults};comparison=null;clearSelection();clearMeasure();syncControls();
 $('view-code').textContent=view.code;$('view-title').textContent=view.title;$('tip').textContent=view.tip;$('learn').textContent=view.learn;
 $('groups').querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.group===view.group)));$('views').replaceChildren();
 for(const item of views.filter(v=>v.group===view.group)){const b=document.createElement('button');b.dataset.view=item.id;b.textContent=item.code;b.setAttribute('aria-pressed',String(item.id===view.id));b.addEventListener('click',()=>select(item.id));$('views').append(b);}
 changed('pose');
}
function setPlaying(value){playing=value;$('play').textContent=playing?'Ⅱ':'▷';$('play').setAttribute('aria-pressed',String(playing));$('play').setAttribute('aria-label',playing?'Ferma il ciclo':'Riproduci il ciclo');$('screen-status').textContent=playing?'CINE · MODELLO':'FERMO · MODELLO';dirty=true;}
function setLayout(value){layout=value;$('scan-area').dataset.layout=value;$('secondary').hidden=!['biplane','compare'].includes(value);$('mmode-box').hidden=value!=='mmode';$('plane-b-key').hidden=value!=='biplane';$('plane-angle-wrap').hidden=value!=='biplane';$('m-angle-wrap').hidden=value!=='mmode';document.querySelectorAll('[data-layout]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.layout===value)));
 $('interaction-note').textContent=value==='mmode'?'Tocca il settore per scegliere la linea M':tool==='caliper'?'Scegli due punti nel settore':'Tocca una parete per riconoscerla';
 if(value==='mmode')resetM();if(value==='compare'&&session?.mission.kind==='pose')observe('help');dirty=true;feedbackPending=true;
}
function setRender(value){renderMode=value;document.querySelectorAll('[data-render]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.render===value)));$('scan-kind').textContent=value==='anatomy'?'SEZIONE ANATOMICA':'B-MODE SINTETICO';if(value==='anatomy'&&session?.mission.kind==='identify')observe('help');dirty=true;}
function cue(){
 const a=C.alignment(state);$('alignment').value=a.score;$('alignment-text').textContent=a.score+'%';
 if(currentPose.contact===false){$('hint').textContent='Limite del torace: torna verso il punto di contatto.';return;}
 if(session?.mission.kind==='pose'&&!session.finished){const dir=state[a.largest]>0?'riduci':'aumenta';const names={slideX:'spostamento laterale',slideY:'spostamento verticale',rotation:'rotazione',fan:'inclinazione',rock:'basculamento',depth:'profondità'};$('hint').textContent=a.reached?'Vicino al riferimento: confronta le strutture e verifica.':'Scarto maggiore: '+names[a.largest]+'. '+dir[0].toUpperCase()+dir.slice(1)+' questo movimento.';}
 else $('hint').textContent=a.reached?'Vista di riferimento. La sonda e l’immagine condividono lo stesso piano.':'Esplorazione libera: osserva quali strutture entrano o escono dalla sezione.';
}
const off=document.createElement('canvas'),offctx=off.getContext('2d');
function dimensions(canvas){const w=Math.max(140,canvas.clientWidth||460),h=Math.max(32,canvas.clientHeight||360),factor=Math.min(1,420/w);return {w,h,rw:Math.max(140,Math.round(w*factor)),rh:Math.max(100,Math.round(h*factor))};}
function setCanvas(canvas){const {w,h}=dimensions(canvas),dpr=Math.min(devicePixelRatio||1,1.5);if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);}const ctx=canvas.getContext('2d');ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);ctx.fillStyle='#030706';ctx.fillRect(0,0,w,h);return {ctx,w,h};}
function tag(ctx,text,x,y,color){ctx.font='600 10px -apple-system,sans-serif';const width=ctx.measureText(text).width+12;ctx.fillStyle='#0c201beb';ctx.fillRect(x-width/2,y-9,width,17);ctx.fillStyle=color;ctx.textAlign='center';ctx.fillText(text,x,y+3);ctx.textAlign='left';}
function drawEcg(ctx,w,h,at){const vec=[0,0,0],leads=new Array(12),ww=Math.min(140,w*.40),base=h-12;ctx.strokeStyle='#719c82';ctx.lineWidth=1;ctx.beginPath();for(let x=0;x<=ww;x+=1.5){const tt=at-1700+x/ww*1700;stream.vec(tt,vec);stream.leads(tt,vec,leads);const yy=base-leads[1]*9;x?ctx.lineTo(14+x,yy):ctx.moveTo(14+x,yy);}ctx.stroke();ctx.fillStyle='#5b7765';ctx.font='7px -apple-system,sans-serif';ctx.fillText('DII',18+ww,base+2);}
function drawFrame(frame,canvas,{secondary=false}={}){
 const {ctx,w,h}=setCanvas(canvas);off.width=frame.width;off.height=frame.height;const data=offctx.createImageData(frame.width,frame.height);data.data.set(frame.pixels);offctx.putImageData(data,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(off,0,0,w,h);
 const fx=w/frame.width,fy=h/frame.height,q={x:frame.chart.x*fx,y:frame.chart.y*fy,scale:frame.chart.scale*fx},p=frame.pose;
 ctx.strokeStyle='#32463b';ctx.lineWidth=.7;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.arc(q.x,q.y,p.depth*q.scale,Math.PI/2-p.halfAngle,Math.PI/2+p.halfAngle);ctx.closePath();ctx.stroke();
 ctx.fillStyle=secondary&&layout==='biplane'?'#d6af71':'#99d9bf';ctx.beginPath();ctx.arc(q.x+12,q.y+3,2.5,0,Math.PI*2);ctx.fill();
 ctx.font='8px -apple-system,sans-serif';ctx.fillStyle='#69816f';ctx.textAlign='right';
 for(const f of [.25,.5,.75,1]){const x=q.x-Math.sin(p.halfAngle)*p.depth*q.scale*f,y=q.y+Math.cos(p.halfAngle)*p.depth*q.scale*f;ctx.fillText(Math.round(f*state.depth)+'%',x-7,y+3);ctx.beginPath();ctx.moveTo(x-3,y);ctx.lineTo(x,y);ctx.stroke();}ctx.textAlign='left';
 const grad=ctx.createLinearGradient(0,35,0,108);grad.addColorStop(0,'#e0e6df');grad.addColorStop(1,'#101810');ctx.fillStyle=grad;ctx.fillRect(w-15,36,4,70);
 const f=settings.focus/100,x=q.x-Math.sin(p.halfAngle)*p.depth*q.scale*f,y=q.y+Math.cos(p.halfAngle)*p.depth*q.scale*f;ctx.fillStyle='#a3cf99';ctx.beginPath();ctx.moveTo(x-1,y);ctx.lineTo(x-5,y-4);ctx.lineTo(x-5,y+4);ctx.closePath();ctx.fill();
 if(labels&&!(session?.mission.kind==='identify'&&!session.finished)){const positions=new Map();for(let i=0;i<frame.labels.length;i++){const id=frame.labels[i];if(!id||frame.counts[id]<28)continue;const def=imager.definitions[id-1];if(!view.focus.includes(def.id))continue;const a=positions.get(id)||[0,0,0];a[0]+=i%frame.width;a[1]+=(i/frame.width)|0;a[2]++;positions.set(id,a);}const placed=[];for(const [id,a]of positions){let x=a[0]/a[2]*fx,y=a[1]/a[2]*fy;for(const p of placed)if(Math.abs(p[0]-x)<30&&Math.abs(p[1]-y)<18)y+=18;placed.push([x,y]);tag(ctx,imager.definitions[id-1].short||imager.definitions[id-1].label,x,y,'#c6e4d2');}}
 if(!secondary&&layout==='mmode'){const a=mAngle*Math.PI/180;ctx.save();ctx.setLineDash([4,4]);ctx.strokeStyle='#dfc086';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(q.x,q.y);ctx.lineTo(q.x+Math.sin(a)*p.depth*q.scale,q.y+Math.cos(a)*p.depth*q.scale);ctx.stroke();ctx.restore();}
 if(!secondary&&measure.length){ctx.strokeStyle='#e1bd7f';ctx.fillStyle='#e1bd7f';ctx.lineWidth=1;const pts=measure.map(a=>[q.x+a[0]*q.scale,q.y+a[1]*q.scale]);ctx.beginPath();pts.forEach((a,i)=>{ctx.moveTo(a[0]-5,a[1]);ctx.lineTo(a[0]+5,a[1]);ctx.moveTo(a[0],a[1]-5);ctx.lineTo(a[0],a[1]+5);if(i){ctx.moveTo(...pts[0]);ctx.lineTo(...a);}});ctx.stroke();}
 drawEcg(ctx,w,h,t);return {q,w,h};
}
function drawM(){const canvas=$('mmode'),{ctx,w,h}=setCanvas(canvas),cols=Math.round(w),rows=Math.round(h),img=ctx.createImageData(cols,rows),span=Math.max(2400,cycleDuration*3),end=mHistory.at(-1)?.at||0,start=end-span;let j=0;
 for(let x=0;x<cols;x++){const at=start+x/(cols-1)*span;while(j<mHistory.length-1&&mHistory[j+1].at<=at)j++;if(!mHistory.length||at<mHistory[0].at)continue;const sample=mHistory[j].line;for(let y=0;y<rows;y++){const idx=Math.min(sample.length-1,Math.round(y/(rows-1)*(sample.length-1))),v=sample[idx],k=(x+y*cols)*4;img.data[k]=img.data[k+1]=img.data[k+2]=v;img.data[k+3]=255;}}
 off.width=cols;off.height=rows;offctx.putImageData(img,0,0);ctx.drawImage(off,0,0,w,h);ctx.strokeStyle='#79a99133';ctx.lineWidth=.5;for(let f=.25;f<1;f+=.25){ctx.beginPath();ctx.moveTo(0,h*f);ctx.lineTo(w,h*f);ctx.stroke();}
 const duration=mHistory.length>1?(end-mHistory[0].at)/1000:0;$('mmode-status').textContent=duration?duration.toFixed(1).replace('.',',')+' s campionati · '+mAngle+'°':'Avvia il ciclo per costruire la traccia';
}
function updateLegend(frame){
 const ids=[];for(let i=1;i<frame.counts.length;i++)if(frame.counts[i]>=24)ids.push(i);const key=ids.join(',')+'|'+selected+'|'+!!(session?.mission.kind==='identify'&&!session.finished);if(key===legendKey)return;legendKey=key;$('legend').replaceChildren();
 if(session?.mission.kind==='identify'&&!session.finished){$('legend').textContent='Nomi nascosti durante il riconoscimento.';return;}
 for(const id of ids){const def=imager.definitions[id-1],b=document.createElement('button'),dot=document.createElement('i');dot.style.background=def.color;b.append(dot,document.createTextNode(def.label));b.setAttribute('aria-pressed',String(selected===id));b.addEventListener('click',()=>{chooseStructure(id,null);if(session?.mission.kind==='identify')observe('help');});$('legend').append(b);}
 if(!ids.length)$('legend').textContent='Nessuna struttura attraversata: avvicinati al riferimento.';
}
function updateFeedback(frame){cue();const found=new Set();for(let i=1;i<frame.counts.length;i++)if(frame.counts[i]>=24)found.add(imager.definitions[i-1].id);const missed=view.focus.filter(id=>!found.has(id)).map(id=>Object.values(D.dictionary).find(d=>d.id===id)?.label).filter(Boolean);
 $('plane-feedback').textContent=missed.length?'Nel piano attuale manca una porzione sufficiente di: '+missed.join(', ')+'. Confronta il riferimento per capire quale movimento la recupera.':layout==='biplane'?'I due settori condividono origine e asse centrale. Il piano B è ruotato di '+planeAngle+'° rispetto ad A.':'Le strutture bersaglio attraversano questo piano. Questo riscontro geometrico non valuta la qualità di un esame clinico.';feedbackPending=false;
}
function calculate(){
 if(!ready)return;currentPose=poseFor();const clock=window.CardiacClock.read(stream,t,cfg);motion=window.HeartPreviewMotion.sample(clock.events,t,cfg);motion.valves=window.EchoValves.state(clock);const second=layout==='biplane'?V.orthogonal(currentPose,planeAngle):null;
 $('mechanical-phase').textContent=motion.valves.phase;for(const r of valves.rigs){const el=$('status-'+r.id),open=motion.valves[r.id]>.15;el.textContent=r.label+' · '+(open?'aperta':'chiusa');el.dataset.open=String(open);}
 stage.setPose(currentPose,poseFor(view,C.defaults),second);stage.setMotion(motion,t);if(selectedRest)stage.highlight(imager.definitions[selected-1]?.name,M.deform(selectedRest,motion));stage.draw();
 const d=dimensions($('scan'));currentFrame=imager.render(currentPose,motion,{...settings,mode:renderMode,selected},d.rw,d.rh);drawFrame(currentFrame,$('scan'));
 frameRecord={time:t,phase:(t-cycleStart)/cycleDuration,state:{...state},settings:{...settings},view:view.id,renderMode};
 if(layout==='biplane'){const d=dimensions($('scan-b'));secondaryFrame=imager.render(second,motion,{...settings,mode:renderMode,selected},d.rw,d.rh);drawFrame(secondaryFrame,$('scan-b'),{secondary:true});$('secondary-title').textContent='PIANO B · '+planeAngle+'°';$('secondary-phase').textContent='STESSO ISTANTE';}
 if(layout==='compare'){
  if(comparison){const {ctx,w,h}=setCanvas($('scan-b'));if(comparison.bitmap){const r=Math.min(w/comparison.bitmap.width,h/comparison.bitmap.height);ctx.drawImage(comparison.bitmap,(w-comparison.bitmap.width*r)/2,(h-comparison.bitmap.height*r)/2,comparison.bitmap.width*r,comparison.bitmap.height*r);} $('secondary-title').textContent=comparison.code+' · ACQUISITA';$('secondary-phase').textContent=Math.round(comparison.phase*100)+'% CICLO';}
  else{const d=dimensions($('scan-b'));secondaryFrame=imager.render(poseFor(view,C.defaults),motion,{...settings,mode:renderMode},d.rw,d.rh);drawFrame(secondaryFrame,$('scan-b'),{secondary:true});$('secondary-title').textContent='RIFERIMENTO · '+view.code;$('secondary-phase').textContent='STESSO ISTANTE';}
 }
 if(layout==='mmode'){if(playing&&simElapsed-lastM>=40){mHistory.push({at:simElapsed,line:imager.line(currentPose,motion,settings,mAngle)});lastM=simElapsed;while(mHistory.length>1&&mHistory[0].at<simElapsed-5000)mHistory.shift();}drawM();}
 $('cine').value=Math.round((t-cycleStart)/cycleDuration*1000);const phase=(t-cycleStart)/cycleDuration;$('cycle-phase').textContent=Math.round(phase*100)+'% del ciclo';
 updateLegend(currentFrame);if(feedbackPending)updateFeedback(currentFrame);dirty=false;
}
function chooseStructure(id,world){selected=id;const def=imager.definitions[id-1];if(!def)return;selectedRest=world?V.inverseMotion(motion)(...world,[0,0,0]):null;stage.highlight(def.name,world);observe('select',def.id);$('clear-selection').hidden=false;
 const testing=session?.mission.kind==='identify'&&!session.finished;
 $('structure-title').textContent=testing?'Selezione registrata':def.label;$('structure-description').textContent=testing?'Premi Verifica per controllare la tua risposta. Il punto scelto è evidenziato nel modello.':Training.explanations[def.id]||(def.layer==='valves'?'I lembi ricostruiti cambiano forma nello stesso ciclo del 3D e dell’eco. Apri “Valvole in movimento” e rallenta il ciclo per seguire apertura e coaptazione. La cinematica è didattica: non deriva da pressioni simulate.':'Ritrova questa struttura in 3D e osserva come cambia il suo profilo quando inclini o ruoti il piano.');legendKey='';dirty=true;
}
function imageClick(e){if(!currentFrame||!ready)return;const canvas=$('scan'),r=canvas.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*currentFrame.width,y=(e.clientY-r.top)/r.height*currentFrame.height,q=currentFrame.chart,xx=(x-q.x)/q.scale,yy=(y-q.y)/q.scale;
 if(!C.inside(xx,yy,currentPose))return;
 if(layout==='mmode'&&tool!=='caliper'){mAngle=C.clamp(Math.round(Math.atan2(xx,yy)*180/Math.PI),-40,40);$('m-angle').value=mAngle;$('m-angle-out').value=mAngle+'°';observe('line');resetM();dirty=true;return;}
 if(tool==='caliper'){setPlaying(false);if(measure.length===2)measure=[];measure.push([xx,yy]);$('clear-measure').hidden=false;$('measure-result').textContent=measure.length===2?Math.hypot(measure[1][0]-measure[0][0],measure[1][1]-measure[0][1]).toFixed(2).replace('.',',')+' u.a.':'Scegli il secondo punto';dirty=true;return;}
 let id=0,closest=Infinity,bx=0,by=0;const radius=12;
 for(let dy=-radius;dy<=radius;dy++)for(let dx=-radius;dx<=radius;dx++){const ix=Math.round(x+dx),iy=Math.round(y+dy);if(ix<0||iy<0||ix>=currentFrame.width||iy>=currentFrame.height)continue;const label=currentFrame.labels[ix+iy*currentFrame.width],dist=dx*dx+dy*dy;if(label&&dist<closest){id=label;closest=dist;bx=ix;by=iy;}}
 if(!id){toast('Tocca una parete o una superficie valvolare visibile.');return;}chooseStructure(id,C.world((bx-q.x)/q.scale,(by-q.y)/q.scale,currentPose));showTab('structures');
}
function capture(){if(!ready)return;if(dirty)calculate();if(!currentFrame)return;const rec={id:String(Date.now()),...frameRecord,code:view.code,title:view.title,image:$('scan').toDataURL('image/png'),date:new Date().toISOString()};captures.push(rec);captures=captures.slice(-4);saveCaptures();renderCaptures();observe('capture');toast('Acquisizione '+rec.code+' salvata. La trovi in Acquisizioni.');}
function compareCapture(rec){const target={...rec};comparison=target;const image=new Image();image.onload=()=>{if(comparison===target){target.bitmap=image;dirty=true;}};image.src=rec.image;setLayout('compare');}
function restoreCapture(rec){select(rec.view);for(const key of Object.keys(C.defaults)){const v=Number(rec.state[key]);state[key]=Number.isFinite(v)?C.clamp(v,key.startsWith('slide')?-.6:key==='depth'?65:-180,key.startsWith('slide')?.6:key==='depth'?150:180):C.defaults[key];}for(const key of Object.keys(I.defaults))settings[key]=Number.isFinite(+rec.settings[key])?+rec.settings[key]:I.defaults[key];setRender(rec.renderMode==='anatomy'?'anatomy':'echo');t=cycleStart+C.clamp(rec.phase,0,.9999)*cycleDuration;setPlaying(false);syncControls();syncImage();changed('pose');observe('help');toast('Ripristinati sonda, immagine e fase dell’acquisizione.');}
function renderCaptures(){ $('capture-count').textContent=String(captures.length);$('captures').replaceChildren();$('archive-empty').hidden=captures.length>0;
 for(const rec of captures.slice().reverse()){const card=document.createElement('article');card.className='capture-card';const img=document.createElement('img');img.src=rec.image;img.alt='Acquisizione '+rec.code;const content=document.createElement('div'),title=document.createElement('h4'),p=document.createElement('p');title.textContent=rec.title;p.textContent=Math.round(rec.phase*100)+'% del ciclo · '+new Date(rec.date).toLocaleTimeString('it-IT',{hour:'2-digit',minute:'2-digit'});content.append(title,p);
 for(const [text,fn]of [['Riapri',()=>restoreCapture(rec)],['Affianca',()=>compareCapture(rec)],['Elimina',()=>{captures=captures.filter(x=>x.id!==rec.id);if(comparison?.id===rec.id){comparison=null;dirty=true;}saveCaptures();renderCaptures();}]]){const b=document.createElement('button');b.textContent=text;b.addEventListener('click',fn);content.append(b);}card.append(img,content);$('captures').append(card);}
}
function download(name,type,data){const a=document.createElement('a'),url=URL.createObjectURL(new Blob([data],{type}));a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);}
function exportImage(){if(!ready)return;if(dirty)calculate();const source=$('scan'),c=document.createElement('canvas');c.width=source.width;c.height=source.height+66;const ctx=c.getContext('2d');ctx.fillStyle='#0d1913';ctx.fillRect(0,0,c.width,c.height);ctx.drawImage(source,0,0);ctx.fillStyle='#c8e8d5';ctx.font='14px sans-serif';ctx.fillText('Isoelettrica · Ecocardio Studio · '+view.code,16,source.height+24);ctx.fillStyle='#92ad9b';ctx.font='10px sans-serif';ctx.fillText('Immagine sintetica · modello didattico · misure in unità dell’atlante',16,source.height+46);const a=document.createElement('a');a.href=c.toDataURL('image/png');a.download='isoelettrica-ecocardio-'+view.id+'.png';a.click();toast('PNG esportato con indicazione del modello didattico.');}
function renderMissions(){ $('missions').replaceChildren();let completed=0;
 for(const m of Training.missions){const p=progress[m.id],done=p?.independent;if(done)completed++;const card=document.createElement('article');card.className='mission'+(done?' done':'');const eyebrow=document.createElement('span'),h=document.createElement('h4'),desc=document.createElement('p'),b=document.createElement('button');eyebrow.textContent=done?'✓ COMPLETATO':p?'PROVA ASSISTITA':m.level;h.textContent=m.title;desc.textContent=m.intro;b.textContent=p?'Ripeti':'Inizia';b.dataset.mission=m.id;b.addEventListener('click',()=>startMission(m.id));card.append(eyebrow,h,desc,b);$('missions').append(card);}$('progress-count').textContent=completed+'/8';
}
function startMission(id){session=Training.start(id,Math.floor(Date.now()/17)%997);settings={...I.defaults};select(session.mission.view);state={...session.initial};labels=false;$('labels').setAttribute('aria-pressed','false');setRender('echo');setLayout('single');$('ghost').checked=false;stage.setLayers({ghost:false});$('practice').hidden=false;$('practice-level').textContent=session.mission.level;$('practice-target').textContent=session.mission.title;$('practice-instruction').textContent=session.mission.instruction;$('practice-result').textContent='';$('alignment').parentElement.hidden=session.mission.kind!=='pose';if(session.mission.kind==='gain')settings.gain=94;syncControls();syncImage();setPlaying(true);showTab(session.mission.kind==='gain'?'image':'structures');changed('pose');$('practice').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}
function checkMission(){const duration=mHistory.length>1?mHistory.at(-1).at-mHistory[0].at:0,result=Training.check(session,{view:view.id,state,contact:currentPose.contact,hint:$('hint').textContent,layout,planeAngle,gain:settings.gain,mDuration:duration,mSamples:mHistory.length,playing});$('practice-result').textContent=result.message;
 if(result.success){const previous=progress[result.mission];progress[result.mission]={independent:!!previous?.independent||!result.assisted,completed:new Date().toISOString(),checks:result.checks};saveProgress();renderMissions();legendKey='';if(selected)chooseStructure(selected,null);dirty=true;}
}
for(const group of D.groups){const b=document.createElement('button');b.textContent=group.name;b.dataset.group=group.id;b.setAttribute('aria-pressed',String(group.id===view.group));b.addEventListener('click',()=>select(views.find(v=>v.group===group.id).id));$('groups').append(b);}
for(const key of Object.keys(C.defaults))$(key).addEventListener('input',()=>{const next=Number($(key).value)/(key.startsWith('slide')?100:1),old=state[key];state[key]=next;if(key.startsWith('slide')&&stage.surface&&!stage.surface.point(view.origin[0]+state.slideX,view.origin[1]+state.slideY))state[key]=old;syncControls();changed('pose');});
for(const key of Object.keys(I.defaults))$(key).addEventListener('input',()=>{settings[key]=Number($(key).value);syncImage();changed('image');});
$('reset').addEventListener('click',()=>{state={...C.defaults};syncControls();observe('help');changed('pose');if(session)$('practice-result').textContent='Riferimento mostrato: questo tentativo sarà registrato come assistito.';});
$('image-reset').addEventListener('click',()=>{settings={...I.defaults};syncImage();observe('help');changed('image');});
document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>showTab(b.dataset.tab)));
document.querySelectorAll('[data-layout]').forEach(b=>b.addEventListener('click',()=>setLayout(b.dataset.layout)));
document.querySelectorAll('[data-render]').forEach(b=>b.addEventListener('click',()=>setRender(b.dataset.render)));
document.querySelectorAll('[data-camera]').forEach(b=>b.addEventListener('click',()=>stage.cameraView(b.dataset.camera)));
function valveHint(){return ['mitral','tricuspid'].includes($('valve-choice').value)?'Vista dalla base · trascina per vedere le corde':'Vista dalla base · trascina per esplorare le cuspidi';}
document.querySelectorAll('[data-anatomy]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-anatomy]').forEach(a=>a.setAttribute('aria-pressed',String(a===b)));$('valve-choice').hidden=b.dataset.anatomy!=='valve';document.querySelector('.orientation').hidden=b.dataset.anatomy==='valve';stage.anatomyView(b.dataset.anatomy,$('valve-choice').value);$('stage-note').textContent=b.dataset.anatomy==='valve'?valveHint():'Trascina per orbitare · pizzica per zoom';dirty=true;}));
$('valve-choice').addEventListener('change',()=>{stage.anatomyView('valve',$('valve-choice').value);$('stage-note').textContent=valveHint();dirty=true;});
document.querySelectorAll('[data-drag]').forEach(b=>b.addEventListener('click',()=>{stage.setDragMode(b.dataset.drag);document.querySelectorAll('[data-drag]').forEach(x=>x.setAttribute('aria-pressed',String(x.dataset.drag===b.dataset.drag)));$('stage-note').textContent=b.dataset.drag==='probe'?'Trascina sul torace · la sonda segue la cute':'Trascina il torace · pizzica per zoom';}));
$('labels').addEventListener('click',()=>{labels=!labels;$('labels').setAttribute('aria-pressed',String(labels));if(labels&&session?.mission.kind==='identify')observe('help');dirty=true;});
$('play').addEventListener('click',()=>setPlaying(!playing));$('speed').addEventListener('change',()=>{speed=Number($('speed').value);resetM();});
function scrub(fraction){setPlaying(false);t=cycleStart+C.clamp(fraction,0,.9999)*cycleDuration;observe('phase',fraction);dirty=true;}
$('cine').addEventListener('input',()=>scrub(Number($('cine').value)/1000));$('prev-frame').addEventListener('click',()=>scrub(((t-cycleStart)/cycleDuration-1/48+1)%1));$('next-frame').addEventListener('click',()=>scrub(((t-cycleStart)/cycleDuration+1/48)%1));
$('plane-angle').addEventListener('input',()=>{planeAngle=Number($('plane-angle').value);$('plane-angle-out').value=planeAngle+'°';feedbackPending=true;dirty=true;});
$('m-angle').addEventListener('input',()=>{mAngle=Number($('m-angle').value);$('m-angle-out').value=mAngle+'°';observe('line');resetM();dirty=true;});
$('scan').addEventListener('pointerdown',imageClick);
$('inspect').addEventListener('click',()=>{tool='inspect';$('inspect').setAttribute('aria-pressed','true');$('caliper').setAttribute('aria-pressed','false');$('interaction-note').textContent=layout==='mmode'?'Tocca il settore per scegliere la linea M':'Tocca una parete per riconoscerla';});
$('caliper').addEventListener('click',()=>{tool='caliper';setPlaying(false);$('inspect').setAttribute('aria-pressed','false');$('caliper').setAttribute('aria-pressed','true');clearMeasure();$('interaction-note').textContent='Scegli due punti · lunghezza in unità dell’atlante';});
$('clear-measure').addEventListener('click',()=>{clearMeasure();dirty=true;});$('clear-selection').addEventListener('click',()=>{clearSelection();dirty=true;});
$('layers').addEventListener('click',()=>{$('layer-panel').hidden=!$('layer-panel').hidden;$('layers').setAttribute('aria-expanded',String(!$('layer-panel').hidden));});
for(const key of ['skin','ribs','vessels','plane','ghost'])$(key).addEventListener('change',()=>{stage.setLayers({[key]:$(key).checked});if(key==='ghost'&&$(key).checked)observe('help');stage.draw();});
$('opacity').addEventListener('input',()=>{stage.setLayers({opacity:Number($('opacity').value)/100});stage.draw();});$('skin-opacity').addEventListener('input',()=>{stage.setLayers({skinOpacity:Number($('skin-opacity').value)/100});stage.draw();});
$('bone-opacity').addEventListener('input',()=>{stage.setLayers({boneOpacity:Number($('bone-opacity').value)/100});stage.draw();});
$('cut').addEventListener('click',()=>{const on=$('cut').getAttribute('aria-pressed')!=='true';$('cut').setAttribute('aria-pressed',String(on));stage.setLayers({cut:on});stage.draw();});$('camera-reset').addEventListener('click',()=>stage.resetCamera());
$('check').addEventListener('click',checkMission);$('end-practice').addEventListener('click',()=>{session=null;$('practice').hidden=true;clearSelection();changed();});
$('capture').addEventListener('click',capture);$('download').addEventListener('click',exportImage);
$('export-progress').addEventListener('click',()=>download('ecocardio-percorso.json','application/json',JSON.stringify({schema:'isoelettrica-echo-training-v2',exported:new Date().toISOString(),scope:'Esercizi sul modello, non certificazione clinica',progress},null,2)));
$('theme').addEventListener('click',()=>{const theme=document.documentElement.dataset.theme==='light'?'dark':'light';document.documentElement.dataset.theme=theme;try{localStorage.setItem('iso-echo-theme',theme);}catch(_){}});
$('info').addEventListener('click',()=>{if(typeof $('info-dialog').showModal==='function')$('info-dialog').showModal();else $('info-dialog').setAttribute('open','');});$('info-close').addEventListener('click',()=>{if(typeof $('info-dialog').close==='function')$('info-dialog').close();else $('info-dialog').removeAttribute('open');});
for(const source of D.sources){const li=document.createElement('li'),a=document.createElement('a');a.href=source.href;a.textContent=source.title;a.target='_blank';a.rel='noopener';li.append(a);$('sources').append(li);}
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin||e.data?.type!=='iso-echo-visibility')return;available=!!e.data.active;if(['light','dark'].includes(e.data.theme))document.documentElement.dataset.theme=e.data.theme;previous=0;if(available){stage.resize();dirty=true;}});
document.addEventListener('visibilitychange',()=>{previous=0;if(!document.hidden)dirty=true;});
if(typeof ResizeObserver==='function')new ResizeObserver(()=>{dirty=true;}).observe($('scan-area'));else window.addEventListener('resize',()=>{dirty=true;});
async function loadAtlas(){
 $('load').hidden=false;$('load').textContent='Caricamento di torace, atlante e volume…';
 try{
  const array=async url=>{const r=await fetch(url);if(!r.ok)throw Error('Asset non disponibile: '+url);return r.arrayBuffer();};
  const [gltf,vol,bd,th]=await Promise.all([new Promise((resolve,reject)=>new window.THREE.GLTFLoader().load('../prototipo-cuore/heart-z-anatomy.glb',resolve,undefined,reject)),array('tissue.bin?v=47.2'),array('body.bin?v=47.2'),array('thorax.bin?v=47.2')]);
  const source=window.HeartAtlasGeometry.sourceMeshes(gltf.scene);window.AnatomyRefinements.apply(source,window.HeartAtlasGeometry.material);meshes=source.filter(m=>['wall','valves','vessels'].includes(m.userData.layer)&&!/leaflet/i.test(m.userData.sourceName));
  volume=V.decode(vol);volume.meta.structures=volume.meta.structures.map(d=>({...d,...D.dictionary[d.name]}));valves=window.EchoValves.create(meshes,volume);meshes.push(...valves.meshes);imager=I.create(volume,valves);stage.setBody(window.EchoBody.decode(bd));stage.setThorax(window.EchoThorax.decode(th));views=stage.registerViews(D.alignValves(D.views,valves.rigs));view=views.find(v=>v.id===view.id);stage.setModel(meshes,valves);
  ready=true;$('load').hidden=true;$('stage').dataset.ready='true';$('stage').dataset.renderer=stage.software?'canvas':'webgl';$('renderer-kind').textContent=stage.software?'RESA CPU':'WEBGL';stage.resize();calculate();window.parent.postMessage({type:'iso-echo-ready'},location.origin);
 }catch(error){console.error('Ecocardio Studio: caricamento non riuscito',error);ready=false;$('load').hidden=false;$('load').textContent='Il laboratorio non è stato caricato. Controlla la connessione e riprova.';const b=document.createElement('button');b.textContent='Riprova il caricamento';b.className='quiet';b.addEventListener('click',loadAtlas,{once:true});$('load').append(b);}
}
function tick(now){const dt=previous?Math.min(140,now-previous):0;previous=now;if(ready&&available&&!document.hidden){if(playing){t=cycleStart+((t-cycleStart+dt*speed)%cycleDuration);simElapsed+=dt*speed;dirty=true;}if(dirty&&now-lastDraw>(stage.software?85:45)){calculate();lastDraw=now;}}requestAnimationFrame(tick);}
renderMissions();renderCaptures();select('plax');syncImage();setPlaying(playing);loadAtlas();requestAnimationFrame(tick);
window.EchoLab={get ready(){return ready;},get view(){return view.id;},get state(){return {...state};},get settings(){return {...settings};},get pose(){return currentPose;},get time(){return t;},get playing(){return playing;},get mode(){return session?'practice':'explore';},get layout(){return layout;},get renderer(){return stage.software?'canvas':'webgl';},get selected(){return selected?imager?.definitions[selected-1]?.id:null;},get sampleCount(){return mHistory.length;},get captures(){return captures.map(({image,...rest})=>({...rest}));},get progress(){return JSON.parse(JSON.stringify(progress));},get slices(){return ready?C.slice(meshes.map(m=>({positions:m.geometry.attributes.position.array,indices:m.geometry.index?.array,name:m.userData.sourceName,layer:m.userData.layer})),currentPose,q=>M.deform(q,motion)):[];}};
})();
