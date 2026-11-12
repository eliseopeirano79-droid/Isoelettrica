/* Same anatomy, probe pose and cutting planes in WebGL and the CPU renderer. */
(function(){'use strict';
const T=window.THREE,C=window.EchoCore,V=a=>new T.Vector3(...a);
function create(stage,onMove){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(35,1,.04,80),heart=new T.Group(),body=new T.Group(),ribs=new T.Group(),beam=new T.Group();
 scene.add(body,ribs,heart,beam);window.HeartAtlasGeometry.lighting(scene);
 const orbit={yaw:.20,pitch:1.43,r:10.6,target:new T.Vector3(0,.35,0)},size={w:600,h:520};
 const options={skin:true,ribs:true,vessels:true,plane:true,ghost:false,opacity:1,cut:false,skinOpacity:.12,boneOpacity:.68};
 const uniforms={uAmpA:{value:.06},uAmpV:{value:.1},uLong:{value:.04},uTwist:{value:5*Math.PI/180},uAtr:{value:0},uVent:{value:0},uFibr:{value:0},uTime:{value:0}};
 let renderer,canvas,ctx,software=false,models=[],heartRaster=[],bodyRaster=[],skeletonRaster=[],probeRaster=[],currentPose=null,secondPose=null,reference=null,motion={atr:0,vent:0},dragMode='orbit',dirty=true,bodyData=null,bodyMesh=null,highlight=null,lastRef='',anatomyMode='thorax',valveSystem=null,valveFocus=null;
 try{renderer=new T.WebGLRenderer({alpha:true,antialias:true});window.HeartAtlasGeometry.setupRenderer(renderer);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.6));renderer.localClippingEnabled=true;canvas=renderer.domElement;}
 catch(_){software=true;canvas=document.createElement('canvas');ctx=canvas.getContext('2d');}
 const raster=software?window.EchoRaster.create():null,bodyCanvas=document.createElement('canvas');let bodyCacheKey='',skeletonCacheKey='',skeletonCache=null;
 stage.appendChild(canvas);canvas.setAttribute('aria-label','Torace anatomico e sonda: trascina per interagire');canvas.style.touchAction='none';
 const skinMaterial=new T.MeshStandardMaterial({color:'#a9816a',roughness:.74,transparent:true,opacity:options.skinOpacity,side:T.DoubleSide,depthWrite:false});
 function setThorax(data){while(ribs.children.length)ribs.remove(ribs.children[0]);for(const m of window.EchoThorax.meshes(data))ribs.add(m);scene.updateMatrixWorld(true);skeletonRaster=software?ribs.children.map(m=>window.EchoRaster.prepare(m,{grid:.025})):[];skeletonCacheKey='';setLayers(options);dirty=true;}
 function makeProbe(ghost=false){
  const group=new T.Group(),white=new T.MeshStandardMaterial({color:ghost?'#8be2d9':'#e9eee9',roughness:.29,metalness:.04,transparent:ghost,opacity:ghost?.22:1,depthWrite:!ghost});
  const shell=new T.Mesh(new T.SphereGeometry(.215,24,20),white);shell.scale.set(1,2.35,.72);shell.position.y=.53;group.add(shell);
  const foot=new T.Mesh(new T.BoxGeometry(.30,.11,.18),new T.MeshStandardMaterial({color:'#263b42',roughness:.5,transparent:ghost,opacity:ghost?.2:1}));foot.position.y=.05;group.add(foot);
  const neck=new T.Mesh(new T.CylinderGeometry(.07,.09,.3,16),new T.MeshStandardMaterial({color:'#17272f',roughness:.5,transparent:ghost,opacity:ghost?.2:1}));neck.position.y=1.07;group.add(neck);
  const marker=new T.Mesh(new T.SphereGeometry(.047,12,10),new T.MeshBasicMaterial({color:'#79e3d2',transparent:ghost,opacity:ghost?.3:1}));marker.position.set(.19,.45,0);group.add(marker);
  if(!ghost){const cable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V([0,1.2,0]),V([-.04,1.7,0]),V([-.45,2.35,-.12])]),28,.04,7,false),new T.MeshStandardMaterial({color:'#17262e',roughness:.6}));group.add(cable);}
  scene.add(group);return group;
 }
 const liveProbe=makeProbe(),ghostProbe=makeProbe(true),fans=[];
 for(const color of ['#84dbc8','#e5b26b']){
  const fan=new T.Mesh(new T.BufferGeometry(),new T.MeshBasicMaterial({color,transparent:true,opacity:.11,side:T.DoubleSide,depthTest:false,depthWrite:false}));fan.renderOrder=6;
  const edge=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color,transparent:true,opacity:.7,depthTest:false}));edge.renderOrder=7;beam.add(fan,edge);fans.push({fan,edge});
 }
 const pin=new T.Mesh(new T.SphereGeometry(.055,14,12),new T.MeshBasicMaterial({color:'#a9ffdb',depthTest:false}));pin.renderOrder=9;pin.visible=false;scene.add(pin);
 function orient(group,p){group.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(V(p.u),V(C.mul(p.d,-1)),V(C.mul(p.n,-1))));group.position.copy(V(p.origin));}
 function plane(item,p){item.fan.visible=item.edge.visible=!!p;if(!p)return;const pos=[],lines=[];let prev=p.origin;
  for(let i=0;i<=40;i++){const a=-p.halfAngle+i/40*p.halfAngle*2,q=C.world(Math.sin(a)*p.depth,Math.cos(a)*p.depth,p);if(i){pos.push(...p.origin,...prev,...q);lines.push(...prev,...q);}if(i===0||i===40)lines.push(...p.origin,...q);prev=q;}
  item.fan.geometry.setAttribute('position',new T.Float32BufferAttribute(pos,3));item.fan.geometry.computeBoundingSphere();item.edge.geometry.setAttribute('position',new T.Float32BufferAttribute(lines,3));item.edge.geometry.computeBoundingSphere();
 }
 function setPose(p,ref,second=null){
  const key=ref.origin.join(',');if(key!==lastRef){lastRef=key;if(anatomyMode==='thorax'){orbit.target.set(-.25,ref.origin[1]>2?1.1:-.8,0);orbit.r=ref.origin[1]>2?12.7:15.3;}}
  currentPose=p;reference=ref;secondPose=second;orient(liveProbe,p);orient(ghostProbe,ref);plane(fans[0],p);plane(fans[1],second);dirty=true;
 }
 function setBody(data){bodyData=data;while(body.children.length)body.remove(body.children[0]);
  for(const [key,color]of [['skin','#b48c73'],['hair','#3d3029'],['eyes','#e0ded4']]){
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(data.positions,3));g.setIndex(new T.BufferAttribute(data[key],1));g.computeVertexNormals();
   const material=key==='skin'?skinMaterial:new T.MeshStandardMaterial({color,roughness:.8,transparent:true,opacity:options.skinOpacity,depthWrite:false});
   const m=new T.Mesh(g,material);if(key==='hair'){const ns=g.attributes.normal;for(let i=0;i<g.attributes.position.count;i++){const pp=g.attributes.position;pp.setXYZ(i,pp.getX(i)+ns.getX(i)*.028,pp.getY(i)+ns.getY(i)*.028,pp.getZ(i)+ns.getZ(i)*.028);}}
   body.add(m);if(key==='skin')bodyMesh=m;
  }
  scene.updateMatrixWorld(true);if(software)bodyRaster=body.children.map(m=>window.EchoRaster.prepare(m,{grid:0}));bodyCacheKey='';dirty=true;
 }
 function registerViews(views){
  if(!bodyMesh)return views.map(v=>({...v}));scene.updateMatrixWorld(true);
  return views.map(v=>{
   if(v.id==='ssn'){const sf=bodyData.surface.point(-.44,2.12);if(sf)return {...v,origin:sf.position,depth:4.1};}
   const f=C.pose(v),ray=new T.Raycaster(V(v.target),V(C.mul(f.d,-1))),hits=ray.intersectObject(bodyMesh),hit=hits.find(h=>h.point.z>0);
   if(!hit)return {...v};
   const sf=bodyData.surface.point(hit.point.x,hit.point.y);if(!sf)return {...v};
   const delta=C.dot(C.sub(sf.position,v.origin),C.mul(f.d,-1));return {...v,origin:sf.position,target:[...v.target],right:[...v.right],depth:Math.max(2,v.depth+delta)};
  });
 }
 function setModel(ms,valves=null){for(const m of models)heart.remove(m);models=ms;valveSystem=valves;
  for(const m of ms){m.material.onBeforeCompile=s=>window.CardiacMechanics.shader(s,uniforms);m.material.customProgramCacheKey=()=> 'echo-shared-mechanics-v47.2';m.material.roughness=.58;heart.add(m);}
  heartRaster=software?ms.map(m=>window.EchoRaster.prepare(m,{deform:true,grid:m.userData.layer==='wall'?.028:0})):[];
  if(software){scene.updateMatrixWorld(true);liveProbe.traverse(m=>{if(m.isMesh)probeRaster.push(window.EchoRaster.prepare(m));});}
  setLayers(options);dirty=true;
 }
 function setLayers(next){Object.assign(options,next);body.visible=options.skin&&anatomyMode==='thorax';ribs.visible=options.ribs&&anatomyMode==='thorax';beam.visible=options.plane&&anatomyMode!=='valve';liveProbe.visible=anatomyMode==='thorax';ghostProbe.visible=options.ghost&&anatomyMode==='thorax';
  body.traverse(m=>{if(m.material)m.material.opacity=options.skinOpacity;});
  ribs.traverse(m=>{if(m.material)m.material.opacity=options.boneOpacity;});
  for(const m of models){m.visible=options.vessels||m.userData.layer!=='vessels';if(anatomyMode==='valve'){const name=m.userData.sourceName,right=['tricuspid','pulmonary'].includes(valveFocus?.id);m.visible=m.userData.dynamicValve?m.userData.valveId===valveFocus?.id:right?/Right ventricle|papillary.*right ventricle/i.test(name):/Left ventricle|papillary.*left ventricle/i.test(name);}
   m.material.opacity=options.opacity;m.material.transparent=options.opacity<1;m.material.depthWrite=options.opacity>=1;}dirty=true;
 }
 function cameraUpdate(){const o=orbit;camera.position.set(o.target.x+o.r*Math.sin(o.pitch)*Math.sin(o.yaw),o.target.y+o.r*Math.cos(o.pitch),o.target.z+o.r*Math.sin(o.pitch)*Math.cos(o.yaw));camera.lookAt(o.target);camera.updateMatrixWorld();dirty=true;}
 function point(q){const v=V(q).project(camera);return [(v.x+1)*size.w/2,(1-v.y)*size.h/2,v.z];}
 function path(points,close=false){ctx.beginPath();points.forEach((p,i)=>{const q=point(p);i?ctx.lineTo(q[0],q[1]):ctx.moveTo(q[0],q[1]);});if(close)ctx.closePath();}
 function clipPlane(){if(anatomyMode==='valve'&&valveFocus){const n=valveFocus.n.toArray(),center=window.CardiacMechanics.deform(valveFocus.center,motion);return {normal:n,constant:-C.dot(n,center)-.035};}if(!options.cut||!currentPose)return null;let n=[...currentPose.n];if(C.dot(C.sub(camera.position.toArray(),currentPose.origin),n)<0)n=C.mul(n,-1);return {normal:n,constant:-C.dot(n,currentPose.origin)};}
 function softwareDraw(){
  const W=Math.max(1,Math.round(size.w)),H=Math.max(1,Math.round(size.h));ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
  if(body.visible&&bodyRaster.length){const key=[W,H,...camera.position.toArray(),...orbit.target.toArray()].join(',');if(key!==bodyCacheKey){bodyCanvas.width=W;bodyCanvas.height=H;bodyCanvas.getContext('2d').drawImage(raster.render(bodyRaster,W,H,camera,motion),0,0);bodyCacheKey=key;}ctx.globalAlpha=options.skinOpacity;ctx.drawImage(bodyCanvas,0,0);ctx.globalAlpha=1;}
  if(ribs.visible&&skeletonRaster.length){const key=[W,H,...camera.position.toArray(),...orbit.target.toArray()].join(',');if(key!==skeletonCacheKey){raster.render(skeletonRaster,W,H,camera,motion);skeletonCache=raster.snapshot();skeletonCacheKey=key;}}
  if(heartRaster.length){ctx.globalAlpha=options.opacity;const img=raster.render(heartRaster,W,H,camera,motion,{clip:clipPlane(),keepValves:anatomyMode==='valve',highlight});ctx.drawImage(ribs.visible?raster.overlay(skeletonCache,options.boneOpacity):img,0,0);ctx.globalAlpha=1;}
  if(beam.visible)for(const [i,p]of [currentPose,secondPose].entries()){if(!p)continue;const qs=[p.origin];for(let j=0;j<=40;j++){const a=-p.halfAngle+j/40*p.halfAngle*2;qs.push(C.world(Math.sin(a)*p.depth,Math.cos(a)*p.depth,p));}path(qs,true);ctx.fillStyle=i?'#efbc771a':'#7ce0c91c';ctx.fill();ctx.strokeStyle=i?'#efbc7788':'#8de7d388';ctx.lineWidth=1;ctx.stroke();}
  if(currentPose&&liveProbe.visible){if(options.ghost&&reference){const a=point(reference.origin),b=point(C.add(reference.origin,C.mul(reference.d,-1.15)));ctx.lineCap='round';ctx.strokeStyle='#9affda50';ctx.lineWidth=19;ctx.beginPath();ctx.moveTo(...a.slice(0,2));ctx.lineTo(...b.slice(0,2));ctx.stroke();}ctx.drawImage(raster.render(probeRaster,W,H,camera,motion),0,0);}
  if(pin.visible){const p=point(pin.position.toArray());ctx.strokeStyle='#a9ffdb';ctx.fillStyle='#102d29';ctx.lineWidth=2;ctx.beginPath();ctx.arc(p[0],p[1],5,0,Math.PI*2);ctx.fill();ctx.stroke();}
 }
 function resize(){size.w=Math.max(1,stage.clientWidth);size.h=Math.max(1,stage.clientHeight);camera.aspect=size.w/size.h;camera.updateProjectionMatrix();if(renderer)renderer.setSize(size.w,size.h);else{canvas.width=Math.round(size.w);canvas.height=Math.round(size.h);}dirty=true;draw();}
 function draw(){if(!dirty)return;cameraUpdate();scene.updateMatrixWorld(true);const cp=clipPlane();
  if(renderer){for(const m of models)m.material.clippingPlanes=cp&&!(anatomyMode==='valve'&&m.userData.dynamicValve)?[new T.Plane(V(C.mul(cp.normal,-1)),-cp.constant)]:[];renderer.render(scene,camera);}else if(ctx)softwareDraw();dirty=false;
 }
 function setMotion(value,t){motion=value;valveSystem?.update(value.valves);uniforms.uAtr.value=value.atr;uniforms.uVent.value=value.vent;uniforms.uTime.value=t;dirty=true;}
 function anatomyView(mode,id='mitral'){
  anatomyMode=mode;valveFocus=valveSystem?.rigs.find(r=>r.id===id)||null;highlight=null;pin.visible=false;
  if(mode==='valve'&&valveFocus){const r=valveFocus,d=r.n.clone().addScaledVector(r.axis,.20).addScaledVector(r.side,.12).normalize();orbit.target.copy(r.c).addScaledVector(r.n,-.09);orbit.yaw=Math.atan2(d.x,d.z);orbit.pitch=Math.acos(d.y);orbit.r=r.kind==='semilunar'?1.9:2.3;}
  else if(mode==='heart'){orbit.target.set(.05,.12,-.08);orbit.yaw=.45;orbit.pitch=1.33;orbit.r=6.5;}
  else{orbit.target.set(-.25,-.65,0);orbit.yaw=.20;orbit.pitch=1.43;orbit.r=15.3;}
  setLayers(options);cameraUpdate();draw();
 }
 const pointers=new Map();let drag=null,pinch=null;const ray=new T.Raycaster(),ndc=new T.Vector2();
 function hit(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);return bodyMesh?ray.intersectObject(bodyMesh)[0]?.point:null;}
 canvas.addEventListener('pointerdown',e=>{if(!currentPose)return;canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY,yaw:orbit.yaw,pitch:orbit.pitch,hit:hit(e.clientX,e.clientY),origin:[...currentPose.origin]};if(pointers.size===2){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),r:orbit.r};}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2&&pinch){const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);orbit.r=C.clamp(pinch.r*pinch.distance/Math.max(20,d),anatomyMode==='valve'?1.4:4.5,22);cameraUpdate();draw();return;}if(!drag)return;
  if(dragMode==='probe'&&anatomyMode==='thorax'){const q=hit(e.clientX,e.clientY);if(q&&drag.hit)onMove(drag.origin[0]+q.x-drag.hit.x,drag.origin[1]+q.y-drag.hit.y);}else{orbit.yaw=drag.yaw+(e.clientX-drag.x)*.007;orbit.pitch=C.clamp(drag.pitch-(e.clientY-drag.y)*.0045,.08,3.05);cameraUpdate();draw();}});
 function end(e){pointers.delete(e.pointerId);drag=null;pinch=null;}for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.r=C.clamp(orbit.r*Math.exp(e.deltaY*.001),anatomyMode==='valve'?1.4:4.5,22);cameraUpdate();draw();},{passive:false});
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(stage);cameraUpdate();resize();
 return {software,scene,camera,setModel,setBody,setThorax,anatomyView,registerViews,setPose,setLayers,setMotion,draw,resize,get surface(){return bodyData?.surface;},setDragMode(v){dragMode=v;},
  highlight(name,position){highlight=name;for(const m of models){if(m.material.emissive)m.material.emissive.set(m.userData.sourceName===name?'#144b3f':'#000000');}pin.visible=!!position;if(position)pin.position.copy(V(position));dirty=true;},
  cameraView(which='front'){Object.assign(orbit,which==='left'?{yaw:.95,pitch:1.5,r:10.6}:which==='apex'?{yaw:.45,pitch:2.05,r:10.5}:{yaw:.20,pitch:1.43,r:10.6});cameraUpdate();draw();},
  resetCamera(){anatomyView(anatomyMode,valveFocus?.id);},dispose(){observer?.disconnect();renderer?.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});canvas.remove();}};
}
window.EchoScene={create};
})();
