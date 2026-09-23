/* Interactive laboratory: explicit editable state, geometry and parameter UI. */
(function(root){'use strict';
root.HeartLab={create(api){
 const C=HeartLabCore,T=api.T,$=id=>document.getElementById(id),V=a=>new T.Vector3(...a);
 let state=C.fresh(),ready=false,mode='',selectedRegion=-1,arteries=[],valveRigs=[],botallo=null,lastPhase=-1,selectedMesh=null;
 try{const saved=localStorage.getItem('iso-heart-lab-v1');if(saved)state=C.parse(saved);}catch(e){$('data-status').textContent='Configurazione salvata non valida: caricati i valori iniziali.';}
 const inputs=[],labelNodes=new Map(),flowObjects=[],occlusionMarkers=[];
 const labelOverlay=document.createElement('div');labelOverlay.id='label-overlay';api.stage.after(labelOverlay);
 const modeNote=document.createElement('div');modeNote.id='lab-mode';labelOverlay.after(modeNote);
 const clips=[new T.Plane(),new T.Plane()];let cutActive=false,coronaryTree=new Map();
 const shared={uRCount:{value:0},uRPos:{value:Array.from({length:32},()=>new T.Vector4())},uRColor:{value:Array.from({length:32},()=>new T.Vector4())},uRDamage:{value:new Float32Array(32)},uOCount:{value:0},uOPos:{value:Array.from({length:16},()=>new T.Vector4())},uOTan:{value:Array.from({length:16},()=>new T.Vector4())},uOVessel:{value:new Float32Array(16)}};
 function status(text){$('data-status').textContent=text;}
 function serialize(){return JSON.stringify(state,null,2);}
 function saveDraft(){try{localStorage.setItem('iso-heart-lab-v1',serialize());}catch(e){status('Salvataggio locale non disponibile. Usa “Salva configurazione”.');}$('config-json').value=serialize();}
 function panel(name){document.querySelectorAll('[data-pane]').forEach(e=>e.hidden=e.dataset.pane!==name);document.querySelectorAll('[data-panel]').forEach(e=>e.setAttribute('aria-selected',String(e.dataset.panel===name)));}
 document.querySelectorAll('[data-panel]').forEach(e=>e.onclick=()=>{panel(e.dataset.panel);if(e.dataset.panel==='electric')api.setView('conduction');});
 function setMode(next){mode=mode===next?'':next;$('place-occlusion').setAttribute('aria-pressed',String(mode==='occlusion'));$('paint-region').setAttribute('aria-pressed',String(mode==='paint'));modeNote.textContent=mode==='paint'?'Tocca il miocardio per aggiungere una regione.':mode==='occlusion'?'Tocca una coronaria per posizionare l’ostruzione.':'';api.stage.style.cursor=mode?'crosshair':'';}
 function row(parent,label,value,min,max,step,unit,onChange){
  const div=document.createElement('div');div.className='param-row';const lab=document.createElement('label');lab.textContent=label;
  const wrap=document.createElement('div');wrap.className='param-inputs';const range=document.createElement('input'),num=document.createElement('input'),u=document.createElement('small');range.type='range';num.type='number';
  for(const el of [range,num]){el.min=min;el.max=max;el.step=step;el.value=value;el.setAttribute('aria-label',label+(el===range?' · cursore':' · valore'));}
  u.textContent=unit;wrap.append(range,num,u);div.append(lab,wrap);parent.appendChild(div);
  const change=e=>{if(e.target.value===''||!Number.isFinite(e.target.valueAsNumber))return;const n=Math.max(min,Math.min(max,e.target.valueAsNumber));range.value=num.value=n;onChange(n);};range.addEventListener('input',change);num.addEventListener('input',e=>{const v=e.target.valueAsNumber;if(v>=min&&v<=max)change(e);});num.addEventListener('change',change);
  return {div,range,num};
 }
 function registry(parent,key){const d=C.schema[key],control=row(parent,d.label,state.params[key],d.min,d.max,d.step,d.unit,value=>{C.set(state.params,key,value);syncParams();refresh();if(d.group==='cycle'||d.group==='electric')api.resetRhythm();});inputs.push({key,...control});}
 function syncParams(){for(const c of inputs)c.range.value=c.num.value=state.params[c.key];const total=C.total(state.params);$('cycle-total').textContent=Math.round(total)+' ms · '+(60000/total).toFixed(1)+' battiti/min nel ritmo sinusale';$('cycle-seek').max=total-1;
  for(const b of $('phase-timeline').children)b.style.flex=state.params['phase.'+b.dataset.phase];
 }
 for(const d of Object.values(C.schema)){
  const target={cycle:'phase-controls',mechanics:'mechanics-controls',electric:'electric-controls',valves:'valve-controls',anatomy:'botallo-controls',flow:'flow-controls',tissue:'tissue-controls'}[d.group];registry($(target),d.key);registry($('all-parameters'),d.key);
 }
 $('parameter-search').oninput=()=>{const q=$('parameter-search').value.toLocaleLowerCase('it');for(const c of inputs)if(c.div.parentElement===$('all-parameters'))c.div.hidden=!C.schema[c.key].label.toLocaleLowerCase('it').includes(q)&&!c.key.includes(q);};
 C.phases.forEach(([id,label],i)=>{const b=document.createElement('button');b.textContent=(i+1)+'. '+label;b.title=label;b.dataset.phase=id;b.onclick=()=>seekPhase(C.phases.slice(0,i).reduce((s,[k])=>s+state.params['phase.'+k],0)+1);$('phase-timeline').appendChild(b);});
 function seekPhase(offset){api.pause();const p=state.params,ev=api.stream.eventsAround(api.time);let v=ev.V||api.stream.ev.find(e=>e.kind==='V');if(!v||api.config.mode)return;const total=C.total(p);if(!api.config.av&&api.time-v.t>=total-p['phase.atrial'])v=api.stream.ev.find(e=>e.kind==='V'&&e.t>v.t)||v;api.seek(Math.max(0,v.t-p['phase.atrial']+Number(offset)));}
 $('cycle-seek').oninput=()=>seekPhase($('cycle-seek').value);
 function decorate(shader,mat){
  Object.assign(shader.uniforms,shared,{uWall:{value:mat.userData.wall?1:0},uVessel:{value:mat.userData.vessel??-1}});
  const decl=`uniform int uRCount;uniform vec4 uRPos[32];uniform vec4 uRColor[32];uniform float uRDamage[32];uniform float uWall;varying vec3 vLocalHeart;\n`;
  const vertex=`uniform int uOCount;uniform vec4 uOPos[16];uniform vec4 uOTan[16];uniform float uOVessel[16];uniform float uVessel;
float localFactor(vec3 p){float k=1.0;for(int i=0;i<32;i++){if(i>=uRCount)break;float a=(1.0-smoothstep(0.7,1.0,distance(p,uRPos[i].xyz)/uRPos[i].w))*uRColor[i].w;k*=1.0-a*uRDamage[i];}return k;}
vec3 coronaryNarrow(vec3 p){for(int i=0;i<16;i++){if(i>=uOCount)break;if(abs(uVessel-uOVessel[i])<0.1){vec3 d=p-uOPos[i].xyz;float axial=dot(d,uOTan[i].xyz);vec3 radial=d-axial*uOTan[i].xyz;float window=1.0-smoothstep(0.0,uOPos[i].w,abs(axial));if(length(radial)<0.09)p-=radial*window*uOTan[i].w;}}return p;}\n`;
  shader.vertexShader=decl+vertex+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('float v=(1.0-a)*uVent*base;','float v=(1.0-a)*uVent*base*localFactor(p);');
  shader.vertexShader=shader.vertexShader.replace('vec3 transformed = cardiacMotion(position);','vLocalHeart=position;vec3 transformed = cardiacMotion(coronaryNarrow(position));');
  shader.fragmentShader=decl+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
if(uWall>0.5){for(int i=0;i<32;i++){if(i>=uRCount)break;float a=(1.0-smoothstep(0.72,1.0,distance(vLocalHeart,uRPos[i].xyz)/uRPos[i].w))*uRColor[i].w;diffuseColor.rgb=mix(diffuseColor.rgb,uRColor[i].rgb,a);}}
`);
 }
 function refresh(){
  const p=state.params;api.uniforms.uAmpA.value=p['muscle.atrial'];api.uniforms.uAmpV.value=p['muscle.vent'];api.uniforms.uLong.value=p['muscle.long'];api.uniforms.uTwist.value=p['muscle.twist']*Math.PI/180;
  shared.uRCount.value=state.regions.length;state.regions.forEach((r,i)=>{shared.uRPos.value[i].set(...r.center,r.radius);const c=new T.Color(r.color).convertSRGBToLinear();shared.uRColor.value[i].set(c.r,c.g,c.b,r.strength);shared.uRDamage.value[i]=state.params['tissue.'+r.type]||0;});
  updateOcclusions();updateBotallo();applyStructures();api.applyView();saveDraft();
 }
 function applyVisibility(){
  cutActive=$('section-enabled').checked;const axis=$('section-axis').value,sign=$('section-flip').checked?1:-1,pos=Number($('cut').value),thick=Number($('section-thickness').value);const n=new T.Vector3();n[axis]=sign;clips[0].normal.copy(n);clips[0].constant=-sign*pos;clips[1].normal.copy(n).negate();clips[1].constant=sign*pos+thick;
  for(const m of api.meshes){
   if(m.userData.originalValve)m.visible=false;
   const target=$('section-target').value,affected=target==='all'||target==='wall'&&m.userData.layer==='wall'||target==='selected'&&m===api.selected;
   m.material.clippingPlanes=cutActive&&affected?($('section-slab').checked?clips:[clips[0]]):[];
   const s=state.structures[m.userData.sourceName];if(s){m.material.opacity=Math.min(m.material.opacity,s.opacity);m.visible=m.visible&&s.opacity>0;m.material.transparent=m.material.opacity<1;m.material.depthWrite=!m.material.transparent;}
   m.material.needsUpdate=true;
  }
  for(const path of api.paths){path.spark.material.clippingPlanes=path.tube.material.clippingPlanes||[];path.spark.material.needsUpdate=true;}
  for(const f of flowObjects)for(const dot of f.particles){dot.material.clippingPlanes=f.mesh?.material.clippingPlanes||[];dot.material.needsUpdate=true;}
  for(const marker of occlusionMarkers){marker.material.clippingPlanes=marker.userData.mesh?.material.clippingPlanes||[];marker.material.needsUpdate=true;}
  $('cut-control').hidden=false;
 }
 for(const id of ['section-enabled','section-axis','section-target','section-flip','section-slab','section-thickness','cut'])$(id).addEventListener('input',()=>{api.applyView();});
 function acceptHit(hit){const planes=hit.object.material.clippingPlanes||[];return planes.every(p=>p.distanceToPoint(hit.point)>=0);}
 function material(color,layer){const m=api.movingMaterial(new T.MeshStandardMaterial({color:new T.Color(color).convertSRGBToLinear(),roughness:.65,side:T.DoubleSide}));m.userData.wall=layer==='wall';return m;}
 function tube(id,label,points,r,color,layer='vessels',group=api.anatomy){const curve=new T.CatmullRomCurve3(points.map(V));const mesh=new T.Mesh(new T.TubeGeometry(curve,40,r,8,false),material(color,layer));group.add(mesh);api.addMesh(mesh,id,label,layer);return mesh;}
 const valveDefs=[
  {id:'mitral',label:'Mitrale',center:[.35,-.07,-.28],normal:[.08,.95,-.32],radius:.31,count:2,leaf:['anteriore','posteriore'],pap:[[.65,-.73,-.04],[.72,-.77,.33]]},
  {id:'tricuspid',label:'Tricuspide',center:[-.28,-.05,.15],normal:[-.3,.94,.12],radius:.34,count:3,leaf:['anteriore','inferiore','settale'],pap:[[.31,-.89,.71],[.01,-.81,.43],[.16,-.4,.25]]},
  {id:'aortic',label:'Aortica',center:[-.12,.41,-.04],normal:[-.12,.98,.15],radius:.18,count:3,leaf:['coronarico destro','coronarico sinistro','non coronarico']},
  {id:'pulmonary',label:'Polmonare',center:[.11,.5,.39],normal:[.2,.95,-.2],radius:.18,count:3,leaf:['anteriore','sinistro','destro']}
 ];
 function buildValves(){
  for(const d of valveDefs){
   const center=V(d.center),n=V(d.normal).normalize(),axis=new T.Vector3(1,0,0).addScaledVector(n,-n.x).normalize(),side=new T.Vector3().crossVectors(n,axis).normalize();
   const ringPoints=Array.from({length:65},(_,i)=>center.clone().addScaledVector(axis,d.radius*Math.cos(i/64*Math.PI*2)).addScaledVector(side,d.radius*Math.sin(i/64*Math.PI*2)).toArray());tube('annulus-'+d.id,'Anello '+d.label.toLowerCase(),ringPoints,.016,'#dec4a3','valves');
   const rig={...d,center,n,axis,side,leaves:[],last:-1};
   for(let leaf=0;leaf<d.count;leaf++){
    const N=12,R=8,pos=new Float32Array((N+1)*(R+1)*3),idx=[];
    for(let v=0;v<R;v++)for(let u=0;u<N;u++){const a=v*(N+1)+u,b=a+N+1;idx.push(a,b,a+1,b,b+1,a+1);}
    const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(pos,3));g.setIndex(idx);
    const mesh=new T.Mesh(g,material('#ead8b4','valves'));mesh.frustumCulled=false;api.anatomy.add(mesh);api.addMesh(mesh,'rig-'+d.id+'-'+leaf,d.label+' · lembo '+d.leaf[leaf]+' (animato)','valves');
    const chords=[];
    if(d.pap){for(let j=0;j<3;j++){const geo=new T.BufferGeometry().setFromPoints([V(d.pap[leaf%d.pap.length]),center]);const line=new T.Line(geo,api.movingMaterial(new T.LineBasicMaterial({color:'#d0c2a1'})));line.frustumCulled=false;api.anatomy.add(line);api.addMesh(line,'chord-'+d.id+'-'+leaf+'-'+j,'Corda '+(j+1)+' · '+d.label.toLowerCase()+' · '+d.leaf[leaf],'valves');chords.push(line);}}
    rig.leaves.push({mesh,N,R,leaf,chords});
   }
   valveRigs.push(rig);moveValve(rig,0);
  }
 }
 function leafPoint(rig,leaf,u,v,open){const a=(leaf+(u*.98+.01))*Math.PI*2/rig.count,free=rig.radius*(.035+.77*open),rad=rig.radius+(free-rig.radius)*v;
  return rig.center.clone().addScaledVector(rig.axis,rad*Math.cos(a)).addScaledVector(rig.side,rad*Math.sin(a)).addScaledVector(rig.n,(rig.pap?-1:1)*rig.radius*(.1*Math.sin(Math.PI*v)+.9*open*v));}
 function moveValve(rig,open){if(Math.abs(rig.last-open)<.0001)return;rig.last=open;for(const part of rig.leaves){const a=part.mesh.geometry.attributes.position;for(let v=0;v<=part.R;v++)for(let u=0;u<=part.N;u++){const p=leafPoint(rig,part.leaf,u/part.N,v/part.R,open);a.setXYZ(v*(part.N+1)+u,p.x,p.y,p.z);}a.needsUpdate=true;part.mesh.geometry.computeVertexNormals();part.mesh.geometry.computeBoundingSphere();part.chords.forEach((l,i)=>{const p=leafPoint(rig,part.leaf,(i+1)/4,1,open),a=l.geometry.attributes.position;a.setXYZ(1,p.x,p.y,p.z);a.needsUpdate=true;});}}
 function updateBotallo(){if(!botallo)return;const patent=state.params['botallo.patent']>0,diam=state.params['botallo.diameter'];botallo.scale.setScalar(1); // Geometry remains centered in the same anatomical frame.
  const r=patent?diam*.01:.024;if(botallo.userData.radius!==r){botallo.geometry.dispose();botallo.geometry=new T.TubeGeometry(botallo.userData.curve,32,r,10,false);botallo.userData.radius=r;}
  botallo.userData.label=patent?'Dotto arterioso di Botallo pervio':'Legamento arterioso (Botallo)';botallo.material.color.set(patent?'#d692ad':'#b9aa91').convertSRGBToLinear();const op=[...$('part').options].find(o=>o.value===botallo.uuid);if(op)op.textContent=botallo.userData.label;if(api.selected===botallo)$('selection').querySelector('b').textContent=botallo.userData.label;
 }
 function anatomicalAdditions(){
  botallo=tube('botallo','Legamento arterioso (Botallo)',[[.52,1.1,-.85],[.47,1.02,-.72],[.36,.86,-.52]],.024,'#b9aa91');botallo.userData.curve=new T.CatmullRomCurve3([[.52,1.1,-.85],[.47,1.02,-.72],[.36,.86,-.52]].map(V));
  const markers=[['septum-atrial','Setto interatriale',[-.29,.2,-.32]],['fossa-ovalis','Fossa ovale',[-.30,.23,-.25]],['septum-vent','Setto interventricolare',[.14,-.42,.24]],['apex','Apice cardiaco',[.91,-1.19,.62]],['endocardium','Endocardio · parete interna VS',[.7,-.54,.10]]];
  for(const [id,label,p] of markers){const mesh=new T.Mesh(new T.SphereGeometry(.023,10,8),new T.MeshBasicMaterial({color:'#b9cfbd',transparent:true,opacity:.8}));mesh.position.copy(V(p));api.anatomy.add(mesh);api.addMesh(mesh,id,label+' · riferimento','wall','Punto di riferimento indicativo');mesh.userData.landmark=true;}
 }
 function conductionAdditions(){
  const names=['Tratto atriale verso il nodo AV','Fascio interatriale di Bachmann','Fascio di His','Branca destra','Fascicolo anteriore sinistro','Fascicolo posteriore sinistro'];
  api.paths.forEach((p,i)=>{api.addMesh(p.tube,'conduction-'+i,names[i],'conduction');p.side=i===3?'right':'left';});
  api.nodes.forEach((n,i)=>api.addMesh(n,'node-'+i,i?'Nodo atrioventricolare':'Nodo senoatriale','conduction'));
  for(const [side,start] of [['right',[.36,-.95,.73]],['left',[.91,-1.04,.2]]])for(let i=0;i<6;i++){
   const a=i/6*Math.PI*2,from=V(start),end=from.clone().add(new T.Vector3(Math.cos(a)*.25,.28+Math.sin(a)*.13,Math.sin(a)*.2)),curve=new T.CatmullRomCurve3([from,from.clone().lerp(end,.5).add(new T.Vector3(0,-.05,0)),end]);
   const tubeMesh=new T.Mesh(new T.TubeGeometry(curve,24,.007,6,false),api.movingMaterial(new T.MeshBasicMaterial({color:'#d2b76b',depthTest:false})));tubeMesh.renderOrder=5;api.circuit.add(tubeMesh);api.addMesh(tubeMesh,'purkinje-'+side+'-'+i,'Purkinje '+(side==='right'?'destro':'sinistro')+' · ramo '+(i+1),'conduction');const spark=new T.Mesh(new T.SphereGeometry(.022,8,6),new T.MeshBasicMaterial({color:'#fff1a9',depthTest:false}));api.circuit.add(spark);api.paths.push({kind:'purkinje',side,curve,tube:tubeMesh,spark});
  }
 }
 function loaded(){
  ready=true;
  for(const m of api.meshes){m.userData.origin='Geometria Z-Anatomy';m.userData.originalValve=/leaflet/.test(m.userData.sourceName);m.material.userData.wall=m.userData.layer==='wall';m.userData.baseColor='#'+m.material.color.clone().convertLinearToSRGB().getHexString();}
  buildValves();anatomicalAdditions();conductionAdditions();
  for(const m of api.meshes){m.userData.basePosition=m.position.clone();m.userData.baseColor=m.userData.baseColor||'#'+m.material.color.clone().convertLinearToSRGB().getHexString();}
  for(const option of [...$('part').options])if(api.meshes.some(m=>m.userData.originalValve&&m.uuid===option.value))option.remove();
  api.selectPart(null);syncParams();refresh();
 }
 function selected(mesh){selectedMesh=mesh;const box=$('structure-controls');box.replaceChildren();if(!mesh){box.textContent='Seleziona una struttura sul cuore o dal menu.';return;}
  const info=document.createElement('p');info.textContent=mesh.userData.origin||'Ricostruzione didattica';box.append(info);
  const key=mesh.userData.sourceName;const value=state.structures[key]||{position:[0,0,0],scale:1,opacity:1,color:mesh.userData.baseColor||'#c9b896'};
  const change=()=>{state.structures[key]=value;refresh();};
  row(box,'Opacità',value.opacity,0,1,.01,'',v=>{value.opacity=v;api.applyView();change();});row(box,'Dimensione relativa',value.scale,.4,1.8,.02,'×',v=>{value.scale=v;change();});
  ['X','Y','Z'].forEach((axis,i)=>row(box,'Spostamento '+axis,value.position[i]*50,-30,30,1,'mm',v=>{value.position[i]=v/50;change();}));
  const label=document.createElement('label');label.textContent='Colore della struttura';const col=document.createElement('input');col.type='color';col.value=value.color;col.setAttribute('aria-label','Colore della struttura');col.oninput=()=>{value.color=col.value;change();};box.append(label,col);
 }
 function applyStructures(){if(!ready)return;for(const m of api.meshes){const s=state.structures[m.userData.sourceName];if(!m.userData.basePosition)continue;m.position.copy(m.userData.basePosition);m.scale.setScalar(s?s.scale:1);if(s)m.position.add(V(s.position));if(s){if(!m.geometry.boundingSphere)m.geometry.computeBoundingSphere();m.position.addScaledVector(m.geometry.boundingSphere.center,1-s.scale);}if(m!==botallo||s)m.material.color.set(s?s.color:m.userData.baseColor).convertSRGBToLinear();}}
 function regionList(){const box=$('region-list');box.replaceChildren();state.regions.forEach((r,index)=>{const card=document.createElement('div');card.className='lab-card';const title=document.createElement('h3');title.textContent=(index+1)+'. '+({ischemia:'Ischemia',necrosis:'Necrosi',fibrosis:'Fibrosi',custom:'Colore libero'}[r.type]);card.append(title);box.append(card);
  const changed=()=>{selectedRegion=index;refresh();};
  row(card,'Estensione della regione',r.radius*50,1,100,1,'mm',v=>{r.radius=v/50;changed();});row(card,'Intensità',r.strength*100,0,100,1,'%',v=>{r.strength=v/100;changed();});
  ['X','Y','Z'].forEach((key,i)=>row(card,'Centro '+key,r.center[i]*50,-150,150,1,'mm',v=>{r.center[i]=v/50;changed();}));
  const color=document.createElement('input');color.type='color';color.value=r.color;color.setAttribute('aria-label','Colore regione '+(index+1));color.oninput=()=>{r.color=color.value;changed();};const remove=document.createElement('button');remove.textContent='Rimuovi regione';remove.onclick=()=>{state.regions.splice(index,1);regionList();refresh();};card.append(color,remove);
 });}
 function addRegion(point){if(state.regions.length>=32){modeNote.textContent='Raggiunto il limite di 32 regioni simultanee.';return;}const type=$('tissue-type').value;state.regions.push({type,center:point,radius:.28,strength:.85,color:{ischemia:'#e6b84d',necrosis:'#69378e',fibrosis:'#e5ecdd',custom:'#34bde4'}[type]});regionList();refresh();}
 $('paint-region').onclick=()=>setMode('paint');$('add-region').onclick=()=>addRegion([.7,-.55,.6]);
 $('place-occlusion').onclick=()=>{setMode('occlusion');$('coronaries').checked=true;api.applyView();};
 function currentArtery(){return arteries[Number($('artery').value)];}
 function branches(){const a=currentArtery();$('artery-branch').replaceChildren();(a?.splines||[]).forEach((points,i)=>{const option=document.createElement('option');option.value=i;option.textContent='Ramo '+(i+1);$('artery-branch').append(option);});}
 $('artery').onchange=branches;
 function addOcclusion(vessel,spline,position){if(state.occlusions.length>=16){modeNote.textContent='Raggiunto il limite di 16 ostruzioni simultanee.';return;}state.occlusions.push({vessel,spline,position,severity:.7,length:.12});occlusionList();refresh();}
 $('add-occlusion').onclick=()=>{const a=currentArtery();if(a)addOcclusion(a.name,Number($('artery-branch').value),.5);};
 function occlusionList(){const box=$('occlusion-list');box.replaceChildren();state.occlusions.forEach((o,index)=>{const card=document.createElement('div');card.className='lab-card';const title=document.createElement('h3');title.textContent=(api.sourceLabels[o.vessel]||o.vessel)+' · ramo '+(o.spline+1);card.append(title);box.append(card);
  row(card,'Posizione lungo il ramo',o.position*100,0,100,1,'%',v=>{o.position=v/100;refresh();});row(card,'Riduzione del diametro',o.severity*100,0,100,1,'%',v=>{o.severity=v/100;refresh();});row(card,'Lunghezza della lesione',o.length*50,.5,40,.5,'mm',v=>{o.length=v/50;refresh();});const remove=document.createElement('button');remove.textContent='Rimuovi ostruzione';remove.onclick=()=>{state.occlusions.splice(index,1);occlusionList();refresh();};card.append(remove);
 });}
 function updateOcclusions(){
  shared.uOCount.value=0;let i=0;
  for(const o of state.occlusions){const vesselIndex=arteries.findIndex(a=>a.name===o.vessel),a=arteries[vesselIndex],points=a?.splines[o.spline];if(!points)continue;
   const q=C.pointOn(points,o.position);shared.uOPos.value[i].set(...q.point,o.length/2);shared.uOTan.value[i].set(...q.tangent,o.severity);shared.uOVessel.value[i]=vesselIndex;
   if(!occlusionMarkers[i]){const marker=new T.Mesh(new T.TorusGeometry(.065,.006,8,24),new T.MeshBasicMaterial({color:'#ffbc60',depthTest:false,transparent:true}));marker.renderOrder=8;api.scene.add(marker);occlusionMarkers[i]=marker;}
   const marker=occlusionMarkers[i];marker.userData.rest=q.point;marker.userData.mesh=api.meshes.find(m=>m.userData.sourceName===o.vessel);marker.position.copy(V(q.point));marker.quaternion.setFromUnitVectors(new T.Vector3(0,0,1),V(q.tangent).normalize());marker.material.opacity=.35+o.severity*.65;marker.visible=true;i++;
  }
  shared.uOCount.value=i;occlusionMarkers.forEach((m,j)=>{if(j>=i)m.visible=false;});
 }
 function bindArteries(data){arteries=data;coronaryTree=C.coronaryTree(data);for(const [i,a] of arteries.entries()){const option=document.createElement('option');option.value=i;option.textContent=api.sourceLabels[a.name]||a.name;$('artery').append(option);a.splines.forEach((points,spline)=>{
   const particles=[];for(let n=0;n<5;n++){const dot=new T.Mesh(new T.SphereGeometry(.018,6,5),new T.MeshBasicMaterial({color:'#ffdbae'}));api.scene.add(dot);particles.push(dot);}flowObjects.push({a,points,spline,particles});
  });}branches();
  function link(){flowObjects.forEach(f=>f.mesh=api.meshes.find(m=>m.userData.sourceName===f.a.name));api.meshes.forEach(m=>{m.material.userData.vessel=arteries.findIndex(a=>a.name===m.userData.sourceName);m.material.needsUpdate=true;});}
  if(ready)link();else pendingArteries=link;
  // Reject unmatched references rather than silently applying a lesion to the wrong branch.
  state.occlusions=state.occlusions.filter(o=>arteries.some(a=>a.name===o.vessel&&a.splines[o.spline]));occlusionList();refresh();
 }
 let pendingArteries=null;
 if(root.HEART_CORONARY_PATHS)bindArteries(root.HEART_CORONARY_PATHS);else fetch('coronary-paths.json').then(r=>{if(!r.ok)throw Error('paths');return r.json();}).then(bindArteries).catch(()=>{modeNote.textContent='Percorsi coronarici non disponibili. Ricarica la pagina.';$('add-occlusion').disabled=true;});
 function hit(h){if(!h)return false;
  if(mode==='paint'){if(h.object.userData.layer!=='wall')return false;addRegion(h.object.worldToLocal(h.point.clone()).toArray());return true;}
  if(mode==='occlusion'){const a=arteries.find(a=>a.name===h.object.userData.sourceName);if(!a)return false;let best={distance:Infinity};const p=h.object.worldToLocal(h.point.clone()).toArray();a.splines.forEach((points,spline)=>{const q=C.nearest(points,p);if(q.distance<best.distance)best={...q,spline};});addOcclusion(a.name,best.spline,best.position);return true;}
  return false;
 }
 function labelFrame(){const mode=$('label-mode').value,w=api.stage.clientWidth,h=api.stage.clientHeight;for(const m of api.meshes){let visible=m.visible&&!m.userData.originalValve&&mode!=='none'&&(mode==='all'||m===api.selected||mode==='major'&&(/atrium|ventricle|botallo|node-|annulus/.test(m.userData.sourceName)));
   let label=labelNodes.get(m);if(!label&&visible){label=document.createElement('div');label.className='anatomy-label';labelOverlay.append(label);labelNodes.set(m,label);}
   if(!label)continue;
   if(visible){if(!m.geometry.boundingSphere)m.geometry.computeBoundingSphere();const p=m.geometry.boundingSphere.center.clone().applyMatrix4(m.matrixWorld).project(api.camera);visible=p.z>-1&&p.z<1&&Math.abs(p.x)<.96&&Math.abs(p.y)<.92;if(visible){label.textContent=m.userData.label;label.classList.toggle('chosen',m===api.selected);label.style.left=(p.x*.5+.5)*w+'px';label.style.top=(-p.y*.5+.5)*h+'px';}}
   label.hidden=!visible;
  }
 }
 function animate(t,ev,cfg,m){
  const deform=(point,object)=>{const v=V(C.deformPoint(point,m,state.params,state.regions,0,t));if(object){object.updateWorldMatrix(true,false);v.applyMatrix4(object.matrixWorld);}return v;};
  const p=state.params;for(const rig of valveRigs){const op=m.valves[rig.id];if(op!==null)moveValve(rig,op);}
  const disabled=m.silent||m.fibr;let phase=disabled?(m.fibr?'FV · nessuna contrazione organizzata':'Asistolia · nessuna contrazione'):C.phases[m.phase][1];if(cfg.av==='III')phase+=' · atri indipendenti';$('phase').textContent=phase;
  if(lastPhase!==m.phase||disabled){[...$('phase-timeline').children].forEach((b,i)=>b.classList.toggle('active',!disabled&&i===m.phase));lastPhase=m.phase;}
  if(document.activeElement!==$('cycle-seek'))$('cycle-seek').value=C.phases.slice(0,m.phase).reduce((s,[id])=>s+p['phase.'+id],0)+m.u*p['phase.'+C.phases[m.phase][0]];
  for(const [i,b] of [...$('phase-timeline').children].entries())b.disabled=Boolean(cfg.mode||(cfg.av&&i===0));$('cycle-seek').disabled=Boolean(cfg.mode);
  $('cycle-position').textContent=Math.round(m.u*100)+'% della fase · '+Math.round(m.total)+' ms';
  for(const path of api.paths){let u=-1;const side=path.side==='right'?'right':'left',blocked=p['electric.'+(side==='right'?'blockR':'blockL')]>0;
   if(path.kind==='atr'&&ev.A)u=m.da/p['electric.atrial'];
   if(path.kind==='his'){
    if(ev.A&&!ev.A.meta.blocked&&!p['electric.blockAV']&&cfg.av!=='III')u=(m.da-p['electric.atrial']-p['electric.av'])/p['electric.his'];
    if(ev.V&&ev.V.meta.type==='escape-j')u=m.dv/p['electric.his'];
   }
   if(path.kind==='branch'&&ev.V&&!blocked)u=m.dv/p['electric.'+side];
   if(path.kind==='purkinje'&&ev.V&&!blocked)u=(m.dv-p['electric.'+side])/p['electric.purkinje'];
   path.spark.visible=!disabled&&api.circuit.visible&&u>=0&&u<=1;
   if(path.spark.visible){path.curve.getPointAt(Math.min(1,Math.max(0,u)),path.spark.position);path.spark.position.copy(deform(path.spark.position.toArray(),path.tube));}
   path.tube.material.color.set(blocked&&['branch','purkinje'].includes(path.kind)?'#ae4359':'#d1b064');
  }
  api.nodes[0].material.color.set(!disabled&&m.da<70?'#fff8cd':'#d5ad6d');api.nodes[1].material.color.set((cfg.av==='III'||p['electric.blockAV'])&&m.da<250?'#ff5575':'#d5ad6d');
  for(const f of flowObjects){for(const [i,dot] of f.particles.entries()){const u=((t*.00018*p['flow.speed']+i/5)%1),attenuation=C.flowFactor(coronaryTree,f.a.name,f.spline,u,state.occlusions);dot.visible=$('coronaries').checked&&!m.silent&&!m.fibr&&attenuation>.025;const q=C.pointOn(f.points,u);dot.position.copy(deform(q.point,f.mesh));dot.scale.setScalar(.4+.6*attenuation);}}
  occlusionMarkers.forEach((o,i)=>{o.visible=i<shared.uOCount.value&&$('coronaries').checked;if(o.userData.rest)o.position.copy(deform(o.userData.rest,o.userData.mesh));});labelFrame();
 }
 function importState(input){const parsed=C.parse(input);for(const o of parsed.occlusions)if(arteries.length&&!arteries.some(a=>a.name===o.vessel&&a.splines[o.spline]))throw Error('Coronaria o ramo non presenti nel modello');state=parsed;syncParams();regionList();occlusionList();refresh();api.resetRhythm();if(selectedMesh)selected(selectedMesh);}
 $('save-lab').onclick=()=>{const url=URL.createObjectURL(new Blob([serialize()],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='isoelettrica-cuore-configurazione.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);status('Configurazione esportata.');};
 $('import-lab').onchange=async()=>{try{const f=$('import-lab').files[0];if(!f)return;if(f.size>1e6)throw Error('File troppo grande');importState(await f.text());status('Configurazione caricata.');}catch(e){status('Importazione annullata: '+e.message);}};
 $('apply-json').onclick=()=>{try{importState($('config-json').value);status('Valori applicati.');}catch(e){status('Valori non applicati: '+e.message);}};
 $('reset-lab').onclick=()=>{importState(C.fresh());status('Parametri ripristinati.');};
 regionList();occlusionList();syncParams();saveDraft();
 return {decorate,configure:cfg=>C.configure(cfg,state.params,ECG),motion:(ev,t,cfg)=>C.sample(ev,t,cfg,state.params),animate,selected,hit,applyVisibility,acceptHit,loaded(){loaded();if(pendingArteries){pendingArteries();pendingArteries=null;}}};
}};
})(window);
