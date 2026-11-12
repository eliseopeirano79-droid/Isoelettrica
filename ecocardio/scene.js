/* Torace illustrativo, sonda e piano nello spazio dell'atlante.
 * Fallback Canvas 2D: proiezione delle stesse superfici, semplificate solo
 * per il disegno. Il calcolo delle sezioni usa sempre la geometria completa. */
(function(){'use strict';
const T=window.THREE,C=window.EchoCore,V=a=>new T.Vector3(...a);
function create(stage,onMove){
 const scene=new T.Scene(),camera=new T.PerspectiveCamera(36,1,.05,80),heart=new T.Group(),body=new T.Group(),ribs=new T.Group(),beam=new T.Group();
 scene.add(body,ribs,heart,beam);window.HeartAtlasGeometry.lighting(scene);
 const orbit={yaw:.08,pitch:1.43,r:12,target:new T.Vector3(0,.3,0)},size={w:600,h:450};
 let renderer,canvas,ctx,software=false,models=[],lod=[],currentPose=null,reference=null,referenceKey='',motion={atr:0,vent:0},time=0,dragMode='orbit',dirty=true;
 const options={skin:true,ribs:true,vessels:true,plane:true,ghost:false,opacity:.95};
 const uniforms={uAmpA:{value:.06},uAmpV:{value:.1},uLong:{value:.04},uTwist:{value:5*Math.PI/180},uAtr:{value:0},uVent:{value:0},uFibr:{value:0},uTime:{value:0}};
 try{renderer=new T.WebGLRenderer({alpha:true,antialias:true});window.HeartAtlasGeometry.setupRenderer(renderer);renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.75));canvas=renderer.domElement;}
 catch(_){software=true;canvas=document.createElement('canvas');ctx=canvas.getContext('2d');}
 stage.appendChild(canvas);canvas.setAttribute('aria-label',software?'Torace e sonda: proiezione semplificata senza WebGL':'Torace, cuore e sonda tridimensionali');
 const skinMaterial=new T.MeshStandardMaterial({color:'#b59884',roughness:.85,transparent:true,opacity:.13,side:T.DoubleSide,depthWrite:false});
 const profile=[[-3.8,1.4],[-3.1,1.5],[-2.2,1.67],[-1.1,1.96],[.2,2.4],[1.65,2.6],[2.25,2.3],[2.55,1.5],[2.85,.68],[3.9,.61]];
 const torso=new T.Mesh(new T.LatheGeometry(profile.map(([y,r])=>new T.Vector2(r,y)),56),skinMaterial);torso.scale.z=.73;torso.renderOrder=3;body.add(torso);
 const ribLines=[],bone=new T.MeshStandardMaterial({color:'#e3d7ba',roughness:.8,transparent:true,opacity:.27,depthWrite:false});
 function tube(points,r=.052){const curve=new T.CatmullRomCurve3(points.map(V)),m=new T.Mesh(new T.TubeGeometry(curve,28,r,6,false),bone);ribs.add(m);ribLines.push(points);}
 for(let j=0;j<8;j++)for(const sign of [-1,1]){const y=1.95-j*.45,r=2.24-j*.045,points=[];for(let k=0;k<=18;k++){const a=k/18*Math.PI*.95;points.push([sign*r*Math.sin(a),y-.28*Math.sin(a)-.05*a,r*.66*Math.cos(a)]);}tube(points);}
 tube([[0,2.2,1.65],[0,1.4,1.67],[0,.65,1.52],[0,-.45,1.3]],.095);
 for(const sign of [-1,1])tube([[0,2.2,1.65],[sign*.65,2.38,1.55],[sign*1.5,2.45,1.2],[sign*2.35,2.22,.65]],.075);
 function probe(ghost=false){const group=new T.Group(),white=new T.MeshStandardMaterial({color:ghost?'#77d2df':'#e5e9e1',roughness:.36,transparent:ghost,opacity:ghost?.24:1,depthWrite:!ghost});
  const shell=new T.Mesh(new T.SphereGeometry(.21,20,16),white);shell.scale.set(1,2.5,.69);shell.position.y=.55;group.add(shell);
  const foot=new T.Mesh(new T.BoxGeometry(.29,.10,.18),new T.MeshStandardMaterial({color:'#243840',roughness:.4,transparent:ghost,opacity:ghost?.18:1}));foot.position.y=.06;group.add(foot);
  const neck=new T.Mesh(new T.CylinderGeometry(.065,.09,.35,12),new T.MeshStandardMaterial({color:'#15252c',roughness:.55,transparent:ghost,opacity:ghost?.18:1}));neck.position.y=1.09;group.add(neck);
  const marker=new T.Mesh(new T.SphereGeometry(.055,12,8),new T.MeshBasicMaterial({color:'#69c5e5',transparent:ghost,opacity:ghost?.3:1}));marker.position.set(.19,.45,0);group.add(marker);
  if(!ghost){const cable=new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3([V([0,1.2,0]),V([-.04,1.65,0]),V([-.2,2.15,-.1])]),22,.043,7,false),new T.MeshStandardMaterial({color:'#17262e',roughness:.6}));group.add(cable);}
  scene.add(group);return group;
 }
 const liveProbe=probe(),ghostProbe=probe(true),fanGeo=new T.BufferGeometry(),fanMat=new T.MeshBasicMaterial({color:'#7ed4e3',transparent:true,opacity:.18,side:T.DoubleSide,depthTest:false,depthWrite:false});
 const fan=new T.Mesh(fanGeo,fanMat);fan.renderOrder=6;beam.add(fan);
 const edge=new T.LineSegments(new T.BufferGeometry(),new T.LineBasicMaterial({color:'#a0ecf1',transparent:true,opacity:.63,depthTest:false}));edge.renderOrder=7;beam.add(edge);
 function orient(group,p){const matrix=new T.Matrix4().makeBasis(V(p.u),V(C.mul(p.d,-1)),V(C.mul(p.n,-1)));group.quaternion.setFromRotationMatrix(matrix);group.position.copy(V(p.origin));}
 function setPose(p,ref){const key=ref.origin.join(',');if(key!==referenceKey){referenceKey=key;orbit.target.y=ref.origin[1]>2?1.0:.3;}currentPose=p;reference=ref;orient(liveProbe,p);orient(ghostProbe,ref);const pos=[],line=[];let previous=p.origin;
  for(let i=0;i<=32;i++){const a=-p.halfAngle+i/32*p.halfAngle*2,q=C.world(Math.sin(a)*p.depth,Math.cos(a)*p.depth,p);if(i){pos.push(...p.origin,...previous,...q);line.push(...previous,...q);}if(i===0||i===32)line.push(...p.origin,...q);previous=q;}
  fanGeo.setAttribute('position',new T.Float32BufferAttribute(pos,3));fanGeo.computeBoundingSphere();edge.geometry.setAttribute('position',new T.Float32BufferAttribute(line,3));edge.geometry.computeBoundingSphere();dirty=true;
 }
 function cameraUpdate(){const o=orbit;camera.position.set(o.target.x+o.r*Math.sin(o.pitch)*Math.sin(o.yaw),o.target.y+o.r*Math.cos(o.pitch),o.target.z+o.r*Math.sin(o.pitch)*Math.cos(o.yaw));camera.lookAt(o.target);camera.updateMatrixWorld();dirty=true;}
 function simplify(mesh){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index?.array,nodes=new Map(),remap=new Uint32Array(p.count),points=[],faces=[],seen=new Set();
  for(let i=0;i<p.count;i++){const point=[p.getX(i),p.getY(i),p.getZ(i)],key=point.map(x=>Math.round(x/.105)).join(',');if(!nodes.has(key)){nodes.set(key,points.length);points.push(point);}remap[i]=nodes.get(key);}
  for(let i=0;i<(ix?ix.length:p.count);i+=3){const f=[0,1,2].map(j=>remap[ix?ix[i+j]:i+j]);if(new Set(f).size<3)continue;const key=[...f].sort((a,b)=>a-b).join(',');if(!seen.has(key)){seen.add(key);faces.push(f);}}
  return {points,faces,layer:mesh.userData.layer,color:mesh.material.color.clone().convertLinearToSRGB()};
 }
 function setModel(meshes){for(const m of models)heart.remove(m);models=meshes;
  for(const m of meshes){m.material.onBeforeCompile=s=>window.CardiacMechanics.shader(s,uniforms);m.material.customProgramCacheKey=()=> 'echo-shared-mechanics';heart.add(m);}
  lod=software?meshes.filter(m=>m.userData.layer!=='valves').map(simplify):[];setLayers(options);dirty=true;
 }
 function setLayers(next){Object.assign(options,next);body.visible=options.skin;ribs.visible=options.ribs;beam.visible=options.plane;ghostProbe.visible=options.ghost;
  for(const m of models){m.visible=options.vessels||m.userData.layer!=='vessels';m.material.opacity=options.opacity;m.material.transparent=options.opacity<1;m.material.depthWrite=options.opacity>=1;}
  dirty=true;
 }
 function point(q){const v=V(q).project(camera);return [(v.x+1)*size.w/2,(1-v.y)*size.h/2,v.z];}
 function path(points,close=false){if(!points.length)return;ctx.beginPath();for(let i=0;i<points.length;i++){const p=point(points[i]);if(i)ctx.lineTo(p[0],p[1]);else ctx.moveTo(p[0],p[1]);}if(close)ctx.closePath();}
 function softwareProbe(p,ghost){const a=point(p.origin),b=point(C.add(p.origin,C.mul(p.d,-1.1))),tail=point(C.add(p.origin,C.mul(p.d,-1.8))),marker=point(C.add(C.add(p.origin,C.mul(p.d,-.45)),C.mul(p.u,.18)));ctx.save();ctx.globalAlpha=ghost?.28:1;ctx.lineCap='round';ctx.strokeStyle='#0a151d';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(b[0],b[1]);ctx.lineTo(tail[0],tail[1]);ctx.stroke();ctx.strokeStyle=ghost?'#8be6ed':'#e9ece6';ctx.lineWidth=17;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();ctx.fillStyle='#6ad1e7';ctx.beginPath();ctx.arc(marker[0],marker[1],4,0,Math.PI*2);ctx.fill();ctx.restore();}
 function softwareDraw(){
  const dpr=Math.min(devicePixelRatio||1,1.5);ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size.w,size.h);
  if(options.skin){const outline=[...profile.map(([y,r])=>[-r,y,0]),...profile.slice().reverse().map(([y,r])=>[r,y,0])];path(outline,true);ctx.fillStyle='#b3997e16';ctx.fill();ctx.strokeStyle='#c4b49c26';ctx.lineWidth=1;ctx.stroke();}
  if(options.ribs){ctx.strokeStyle='#e5d4b942';ctx.lineWidth=3;ctx.lineCap='round';for(const line of ribLines){path(line);ctx.stroke();}}
  const triangles=[],light=C.unit([-.6,1,2]);
  for(const m of lod){if(m.layer==='vessels'&&!options.vessels)continue;const world=m.points.map(q=>window.CardiacMechanics.deform(q,motion)),projected=world.map(point);
   for(const f of m.faces){const a=world[f[0]],b=world[f[1]],c=world[f[2]],n=C.cross(C.sub(b,a),C.sub(c,a)),len=C.norm(n);if(len<1e-9)continue;const shade=.45+.55*Math.abs(C.dot(n,light)/len),ps=f.map(i=>projected[i]);triangles.push({ps,z:(ps[0][2]+ps[1][2]+ps[2][2])/3,color:'rgb('+[m.color.r,m.color.g,m.color.b].map(x=>Math.round(x*shade*255)).join(',')+')'});}
  }
  triangles.sort((a,b)=>b.z-a.z);ctx.globalAlpha=options.opacity;
  for(const tri of triangles){ctx.beginPath();ctx.moveTo(tri.ps[0][0],tri.ps[0][1]);ctx.lineTo(tri.ps[1][0],tri.ps[1][1]);ctx.lineTo(tri.ps[2][0],tri.ps[2][1]);ctx.closePath();ctx.fillStyle=tri.color;ctx.fill();}
  ctx.globalAlpha=1;
  if(currentPose){if(options.plane){const p=currentPose,points=[p.origin];for(let i=0;i<=32;i++){const a=-p.halfAngle+i/32*p.halfAngle*2;points.push(C.world(Math.sin(a)*p.depth,Math.cos(a)*p.depth,p));}path(points,true);ctx.fillStyle='#83dcea30';ctx.fill();ctx.strokeStyle='#a0e9ef88';ctx.lineWidth=1;ctx.stroke();}if(options.ghost)softwareProbe(reference,true);softwareProbe(currentPose,false);}
  ctx.fillStyle='#abc0c8';ctx.font='9px -apple-system, sans-serif';ctx.fillText('ORIENTAMENTO 3D SEMPLIFICATO · WEBGL ASSENTE',14,size.h-13);
 }
 function resize(){size.w=Math.max(1,stage.clientWidth);size.h=Math.max(1,stage.clientHeight);camera.aspect=size.w/size.h;camera.updateProjectionMatrix();if(renderer)renderer.setSize(size.w,size.h);else{const dpr=Math.min(devicePixelRatio||1,1.5);canvas.width=Math.round(size.w*dpr);canvas.height=Math.round(size.h*dpr);}dirty=true;draw();}
 function draw(){if(!dirty)return;cameraUpdate();if(renderer)renderer.render(scene,camera);else if(ctx)softwareDraw();dirty=false;}
 function setMotion(value,t){motion=value;time=t;uniforms.uAtr.value=value.atr;uniforms.uVent.value=value.vent;uniforms.uTime.value=t;dirty=true;}
 const pointers=new Map();let drag=null,pinch=null;const ray=new T.Raycaster(),ndc=new T.Vector2();
 function hit(x,y){const r=canvas.getBoundingClientRect();ndc.set((x-r.left)/r.width*2-1,-(y-r.top)/r.height*2+1);ray.setFromCamera(ndc,camera);const p=new T.Vector3();return ray.ray.intersectPlane(new T.Plane(new T.Vector3(0,0,1),-(currentPose?.origin[2]||1.9)),p)?p:null;}
 canvas.addEventListener('pointerdown',e=>{if(!currentPose)return;canvas.setPointerCapture?.(e.pointerId);pointers.set(e.pointerId,[e.clientX,e.clientY]);drag={x:e.clientX,y:e.clientY,yaw:orbit.yaw,pitch:orbit.pitch,hit:hit(e.clientX,e.clientY),origin:[...currentPose.origin]};if(pointers.size===2){const p=[...pointers.values()];pinch={distance:Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]),r:orbit.r};}});
 canvas.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId))return;pointers.set(e.pointerId,[e.clientX,e.clientY]);if(pointers.size===2&&pinch){const p=[...pointers.values()],d=Math.hypot(p[0][0]-p[1][0],p[0][1]-p[1][1]);orbit.r=C.clamp(pinch.r*pinch.distance/Math.max(20,d),7,18);cameraUpdate();draw();return;}if(!drag)return;
  if(dragMode==='probe'){const q=hit(e.clientX,e.clientY);if(q&&drag.hit)onMove(drag.origin[0]+q.x-drag.hit.x,drag.origin[1]+q.y-drag.hit.y);}else{orbit.yaw=drag.yaw+(e.clientX-drag.x)*.008;orbit.pitch=C.clamp(drag.pitch-(e.clientY-drag.y)*.005,.5,2.35);cameraUpdate();draw();}});
 function end(e){pointers.delete(e.pointerId);drag=null;pinch=null;}
 for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,end);
 canvas.addEventListener('wheel',e=>{e.preventDefault();orbit.r=C.clamp(orbit.r*Math.exp(e.deltaY*.001),7,18);cameraUpdate();draw();},{passive:false});
 const observer=typeof ResizeObserver==='function'?new ResizeObserver(resize):null;observer?.observe(stage);cameraUpdate();resize();
 return {software,scene,camera,setModel,setPose,setLayers,setMotion,draw,resize,setDragMode(v){dragMode=v;},resetCamera(){Object.assign(orbit,{yaw:.08,pitch:1.43,r:12});cameraUpdate();draw();},dispose(){observer?.disconnect();renderer?.dispose();scene.traverse(o=>{o.geometry?.dispose();if(o.material)for(const m of [].concat(o.material))m.dispose();});canvas.remove();}};
}
window.EchoScene={create};
})();
