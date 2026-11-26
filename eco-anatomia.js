/* Display colours and rotatable, depth-tested inspection of the exact Eco atlas. */
(function(root){
'use strict';
const T=root.THREE;
function colore(nome,layer) {
  if(/^Pulmonary trunk|pulmonary artery|vena cava/i.test(nome) || layer==='veins')return '#628daf';
  if(/aorta|aortic arch|truncus brachio|arteria (carotis|subclavia)|pulmonary vein/i.test(nome))return '#c86962';
  if(layer==='coronaries')return '#e8a478';
  if(/leaflet|botallo/i.test(nome))return '#dfba9a';
  if(/atrium/i.test(nome))return '#ba777a';
  return '#a75e63';
}
function prepara(dialog,model){
  const frame=dialog.querySelector('canvas'), ctx=frame.getContext('2d');
  const select=dialog.querySelector('select'),yawButtons=dialog.querySelectorAll('[data-angle]');
  const render=root.EchoRaster.create(), camera=new T.PerspectiveCamera(32,1,.1,40);
  const items=[], phase=dialog.querySelector('input'), percent=dialog.querySelector('output');
  let ultima=-1;
  function sincronizza() {
    const f=Number(phase.value)/1000;
    if(ultima===f)return;
    const dati=model.modelli(f);
    for(let i=0;i<dati.length;i++){
      const {nome,layer,valvola,m}=dati[i];
      let item=items[i],geo;
      if(!item){
        geo=new T.BufferGeometry();geo.setIndex(new T.BufferAttribute(m.tri,1));
        geo.setAttribute('position',new T.BufferAttribute(m.pos,3));geo.computeVertexNormals();
        const mesh=new T.Mesh(geo,new T.MeshBasicMaterial({color:colore(nome,layer),side:T.DoubleSide}));
        mesh.material.color.convertSRGBToLinear();mesh.userData={sourceName:nome,layer};
        item=root.EchoRaster.prepare(mesh);item.live=true;item.valvola=valvola;items.push(item);
      }else{
        geo=item.mesh.geometry;geo.setAttribute('position',new T.BufferAttribute(m.pos,3));geo.computeVertexNormals();
      }
    }
    percent.textContent=(100*f).toFixed(1)+'%';ultima=f;
  }
  let yaw=.24,pitch=.16,start=null,raf=0;
  function draw(){
    raf=0;if(!dialog.open)return;
    const b=frame.getBoundingClientRect(),scale=Math.min(1.35,820/Math.max(1,b.width),710/Math.max(1,b.height));
    const w=Math.max(100,Math.round(b.width*scale)),h=Math.max(100,Math.round(b.height*scale));
    sincronizza();
    const only=select.value==='polmonare', valve=select.value.startsWith('valvola-')?select.value.slice(8):null;
    const target=only?[0,.87,-.35]:[0,.42,-.24];let extent=only?4.1:8.7;
    if(valve) {
      const box=new T.Box3();
      for(const item of items.filter(x=>x.valvola===valve)){
        const g=item.mesh.geometry;g.computeBoundingBox();box.union(g.boundingBox);
      }
      if(!box.isEmpty()){box.getCenter(new T.Vector3()).toArray(target);extent=2.15*box.getSize(new T.Vector3()).length();}
    }
    const distance=extent*Math.max(1,1.20*h/w);
    camera.aspect=w/h;camera.updateProjectionMatrix();
    camera.position.set(target[0]+distance*Math.cos(pitch)*Math.sin(yaw),target[1]+distance*Math.sin(pitch),target[2]+distance*Math.cos(pitch)*Math.cos(yaw));
    camera.lookAt(...target);camera.updateMatrixWorld();
    for(const item of items)item.mesh.visible=valve?item.valvola===valve:!only || item.name==='Pulmonary trunk';
    const light=new T.Vector3(-.42,.64,1).applyQuaternion(camera.quaternion).toArray();
    const img=render.render(items,w,h,camera,{}, {lightDirection:light});if(frame.width!==w||frame.height!==h){frame.width=w;frame.height=h;}
    ctx.clearRect(0,0,w,h);ctx.drawImage(img,0,0);
  }
  function refresh(){if(!raf)raf=requestAnimationFrame(draw);}
  function orient(angle,elevation){yaw=angle;pitch=elevation;refresh();}
  for(const b of yawButtons)b.onclick=()=>orient(Number(b.dataset.angle),.17);
  select.onchange=()=>{if(select.value==='polmonare')orient(.18,.72);else orient(.24,.16);};
  frame.onpointerdown=e=>{if(start)return;frame.setPointerCapture(e.pointerId);start={id:e.pointerId,x:e.clientX,y:e.clientY,yaw,pitch};};
  frame.onpointermove=e=>{if(start&&e.pointerId===start.id)orient(start.yaw-(e.clientX-start.x)*.012,Math.max(-1.4,Math.min(1.4,start.pitch+(e.clientY-start.y)*.012)));};
  frame.onpointerup=frame.onpointercancel=frame.onlostpointercapture=e=>{if(start&&e.pointerId===start.id)start=null;};
  frame.onkeydown=e=>{const changes={ArrowLeft:[-.18,0],ArrowRight:[.18,0],ArrowUp:[0,.15],ArrowDown:[0,-.15]};if(changes[e.key]){e.preventDefault();const [a,b]=changes[e.key];orient(yaw+a,Math.max(-1.4,Math.min(1.4,pitch+b)));}};
  const observer=new ResizeObserver(refresh);observer.observe(frame);
  phase.oninput=refresh;
  return ()=>{ultima=-1;phase.value=Math.round(model.fase()*1000);refresh();};
}
function collega(button,model){
  const dialog=document.createElement('dialog');dialog.className='eco-ispezione';dialog.setAttribute('aria-label','Cuore e grossi vasi');
  dialog.innerHTML='<header><h3>Cuore e grossi vasi</h3><form method="dialog"><button type="submit" autofocus>Chiudi</button></form></header><canvas tabindex="0" aria-label="Modello anatomico. Trascina o usa le frecce per ruotarlo."></canvas><footer><label>Strutture <select data-native aria-label="Strutture anatomiche"><option value="tutte">Cuore e grossi vasi</option><option value="polmonare">Tronco e rami polmonari</option><option value="valvola-mitrale">Mitrale</option><option value="valvola-tricuspide">Tricuspide</option><option value="valvola-aortica">Aortica</option><option value="valvola-polmonare">Valvola polmonare</option></select></label><label>Fase <output></output><input type="range" min="0" max="999" value="0" aria-label="Fase del modello in ispezione"></label><div role="group" aria-label="Orientamento"><button type="button" data-angle="0">Anteriore</button><button type="button" data-angle="1.57">Sinistra</button><button type="button" data-angle="3.14">Posteriore</button></div></footer>';
  document.body.appendChild(dialog);
  let refresh;button.disabled=false;
  button.onclick=()=>{dialog.showModal();if(!refresh)refresh=prepara(dialog,model);refresh();};
}
root.ISO_ECO_ANATOMIA={colore,collega};
})(window);
