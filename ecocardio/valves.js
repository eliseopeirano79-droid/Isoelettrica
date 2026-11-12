/* Shared, moving leaflet surfaces for the 3D scene, B-mode and M-mode.
 * Display reconstruction in atlas units; NOT pressure-driven biomechanics.
 * The original GLB remains unchanged. Timing reads CardiacClock only.
 * Physiology sequence: OpenStax A&P 19.3 (see README and clinical notes).
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../three.min.js'),require('../anatomy-refinements.js'),require('./views.js'));else root.EchoValves=factory(root.THREE,root.AnatomyRefinements,root.EchoViews);})(typeof window!=='undefined'?window:globalThis,function(T,R,D){
'use strict';
const V=p=>new T.Vector3(...p),clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v)),smooth=x=>{x=clamp(x);return x*x*(3-2*x);},mix=(a,b,t)=>a+(b-a)*t;
const STEPS=32,FIELD_STEP=.014;
// Relative animation delays, not measured physiologic intervals. The end of T
// and RR are read from the original ECG; no synthetic beat is written to it.
const timing=Object.freeze({closeAV:.05,openSL:.12,openAVAfterT:.085,transition:.035,earlyFilling:.18});
function state(clock){
 if(!clock.organized||!clock.events?.V)return {mitral:0,tricuspid:0,aortic:0,pulmonary:0,phase:'Ciclo non organizzato'};
 const rr=clock.RR||clock.cycle?.duration||850,age=clock.sinceQRS||0,qt=clock.endT-clock.onsetQRS,closeSL=Number.isFinite(qt)&&qt>0?qt:rr*.43;
 const closeAV=rr*timing.closeAV,openSL=rr*timing.openSL,openAV=closeSL+rr*timing.openAVAfterT,transition=rr*timing.transition;
 const semilunar=smooth((age-openSL)/transition)*(1-smooth((age-(closeSL-transition))/transition));
 let av=1-smooth(age/closeAV);
 if(age>=openAV){const fill=age-openAV,E=Math.sin(Math.PI*clamp(fill/(rr*timing.earlyFilling)))**2,A=clock.sinceP>=0?Math.sin(Math.PI*clamp((clock.sinceP-rr*.04)/(rr*.16)))**2:0;av=smooth(fill/transition)*clamp(.48+.5*E+.48*A);}
 const phase=age<closeAV?'Chiusura atrioventricolare':age<openSL?'Contrazione isovolumetrica':age<closeSL?'Eiezione':age<openAV?'Rilasciamento isovolumetrico':clock.sinceP>=0&&clock.sinceP<rr*.23?'Sistole atriale':'Riempimento ventricolare';
 return {mitral:av,tricuspid:av,aortic:semilunar,pulmonary:semilunar,phase};
}
function definitions(){const roots=R.valveRoots();return [
 {id:'mitral',label:'Mitrale',center:[.35,-.07,-.28],normal:[-.58,1.13,-.70],radius:.34,aspect:.86,kind:'mitral',names:['Anterior leaflet of left atrioventricular valve','Posterior leaflet of left atrioventricular valve'],pap:[[.65,-.73,-.04],[.72,-.77,.33]]},
 {id:'tricuspid',label:'Tricuspide',center:[-.28,-.12,.15],normal:[-.53,1.08,-.55],radius:.36,aspect:.86,kind:'tricuspid',names:['Anterior leaflet of right atrioventricular valve','Inferior leaflet of right atrioventricular valve','Septal leaflet of right atrioventricular valve'],pap:[[.31,-.89,.71],[.01,-.81,.43],[.16,-.4,.25]]},
 {id:'aortic',label:'Aortica',...roots.aortic,aspect:1,kind:'semilunar',names:['Right coronary leaflet','Left coronary leaflet','Non-coronary leaflet']},
 {id:'pulmonary',label:'Polmonare',...roots.pulmonary,aspect:1,kind:'semilunar',names:['Anterior semilunar leaflet of pulmonary valve','Left semilunar leaflet of pulmonary valve','Right semilunar leaflet of pulmonary valve']}
 ];}
function frame(def){const n=V(def.normal).normalize();let axis=def.id==='mitral'?V(R.valveRoots().aortic.center).sub(V(def.center)):V([1,0,0]);axis.addScaledVector(n,-axis.dot(n)).normalize();const side=new T.Vector3().crossVectors(n,axis).normalize();return {...def,c:V(def.center),n,axis,side};}
function world(r,x,y,z,out=new T.Vector3()){return out.copy(r.c).addScaledVector(r.axis,x).addScaledVector(r.side,y).addScaledVector(r.n,z);}
function localPoint(r,leaf,u,v,open,out=[0,0,0]){
 const rad=r.radius,aspect=r.aspect;let hx,hy,hz,ex,ey,ez;
 if(r.kind==='mitral'){
  const theta=leaf===0?-Math.PI/3+u*2*Math.PI/3:Math.PI/3+u*4*Math.PI/3,s=Math.sin(Math.PI*u);
  hx=rad*Math.cos(theta);hy=rad*aspect*Math.sin(theta);hz=.10*rad*Math.cos(2*theta);
  ex=rad*(.5-.65*s);ey=rad*aspect*Math.sqrt(3)/2*(leaf===0?2*u-1:1-2*u);ez=-.05*rad-.005*rad*s;
  const f=open*Math.pow(s,.45);ex=mix(ex,hx*.85,f);ey=mix(ey,hy*.85,f);ez=mix(ez,-rad*(leaf===0?.98:.73),f);
  if(leaf===1)ez-=open*.035*rad*(1-Math.cos(6*Math.PI*u));
 }else{
  const bounds=r.kind==='tricuspid'?[0,2.42,4.48,Math.PI*2]:[0,Math.PI*2/3,Math.PI*4/3,Math.PI*2],a0=bounds[leaf],a1=bounds[leaf+1],theta=mix(a0,a1,u),s=Math.sin(Math.PI*u);
  hx=rad*Math.cos(theta);hy=rad*aspect*Math.sin(theta);
  const edgeAngle=u<=.5?a0:a1,k=Math.abs(2*u-1);ex=rad*k*Math.cos(edgeAngle);ey=rad*aspect*k*Math.sin(edgeAngle);
  if(r.kind==='semilunar'){
   hz=.55*rad*Math.cos(Math.PI*u)**2;ez=.55*rad-.05*rad*s*(1-open);
   ex=mix(ex,rad*(1-.12*s)*Math.cos(theta),open);ey=mix(ey,rad*aspect*(1-.12*s)*Math.sin(theta),open);
  }else{
   hz=.055*rad*Math.cos(2*theta);ez=-.05*rad*s;
   const f=open*Math.pow(s,.4);ex=mix(ex,hx*.84,f);ey=mix(ey,hy*.84,f);ez=mix(ez,-rad*.8,f);
  }
 }
 const belly=(r.kind==='semilunar'?.14:-.10)*rad*Math.sin(Math.PI*v)*Math.sin(Math.PI*u)*(1-.35*open);
 out[0]=mix(hx,ex,v);out[1]=mix(hy,ey,v);out[2]=mix(hz,ez,v)+belly;return out;
}
function point(r,leaf,u,v,open,out=new T.Vector3()){const q=localPoint(r,leaf,u,v,open);return world(r,...q,out);}
function indices(U,W){const ix=[];for(let j=0;j<W;j++)for(let i=0;i<U;i++){const a=j*(U+1)+i,b=a+U+1;ix.push(a,b,a+1,b,b+1,a+1);}return ix;}
function material(color){const m=new T.MeshStandardMaterial({color,roughness:.54,side:T.DoubleSide});m.color.convertSRGBToLinear();return m;}
function makeMesh(positions,ix,name,rig,part,color='#e3cba4'){
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(positions,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();
 const m=new T.Mesh(g,material(color));m.frustumCulled=false;m.name=name;m.userData={sourceName:name,layer:'valves',dynamicValve:true,valveId:rig.id,valvePart:part,reconstruction:true};return m;
}
function tubeData(points,radius,sides=6){const pos=[],ix=[];
 for(let i=0;i<points.length;i++){const axis=points[Math.min(points.length-1,i+1)].clone().sub(points[Math.max(0,i-1)]).normalize(),a=new T.Vector3(Math.abs(axis.x)<.9?1:0,Math.abs(axis.x)<.9?0:1,0).cross(axis).normalize(),b=new T.Vector3().crossVectors(axis,a);for(let j=0;j<sides;j++)pos.push(...points[i].clone().addScaledVector(a,radius*Math.cos(j/sides*Math.PI*2)).addScaledVector(b,radius*Math.sin(j/sides*Math.PI*2)).toArray());}
 for(let i=0;i<points.length-1;i++)for(let j=0;j<sides;j++){const a=i*sides+j,b=(i+1)*sides+j,c=i*sides+(j+1)%sides,d=(i+1)*sides+(j+1)%sides;ix.push(a,c,b,c,d,b);}return {pos,ix};
}
function create(source,volume){
 const defs=volume.meta.structures,meshes=[],rigs=definitions().map(frame),leafLabels=new Set();
 for(let i=0;i<defs.length;i++)if(/leaflet/i.test(defs[i].name))leafLabels.add(i+1);
 // Static leaflets must not survive underneath the moving ones in the volume.
 for(let i=0;i<volume.labels.length;i++)if(leafLabels.has(volume.labels[i])){volume.density[i]=0;volume.labels[i]=0;}
 const q=new T.Vector3();
 for(const r of rigs){
  r.parts=[];r.chords=[];r.cache=new Map();r.key=-1;r.field=null;r.open=0;
  for(let l=0;l<r.names.length;l++){
   const name=r.names[l];let label=defs.findIndex(d=>d.name===name)+1;if(!label){defs.push({...D.dictionary[name],name,layer:'valves'});label=defs.length;}
   const U=40,W=20,mesh=makeMesh(new Float32Array((U+1)*(W+1)*3),indices(U,W),name,r,'leaflet');
   const edge=tubeData(Array.from({length:41},(_,i)=>V([i/40,0,0])),.0035),margin=makeMesh(edge.pos,edge.ix,name+' · margo liber',r,'margin','#f6e6c5');r.parts.push({mesh,U,W,leaf:l,label,margin});meshes.push(mesh,margin);
  }
  const ring=[];for(let i=0;i<=128;i++){const a=i/128*Math.PI*2;ring.push(world(r,r.radius*Math.cos(a),r.radius*r.aspect*Math.sin(a),r.kind==='mitral'?.1*r.radius*Math.cos(2*a):0));}
  const tube=tubeData(ring,.013),annulus=makeMesh(tube.pos,tube.ix,'annulus_'+r.id,r,'annulus','#c6a77e');meshes.push(annulus);r.annulus=annulus;
  if(r.pap)for(let leaf=0;leaf<r.names.length;leaf++)for(let i=1;i<=6;i++){
   const u=i/7,pap=r.pap[r.kind==='mitral'?(u<.5?0:1):leaf%r.pap.length],anchor=V(pap),mesh=makeMesh(new Float32Array(3*6*3),tubeData([V([0,0,0]),V([0,.1,0]),V([0,.2,0])],.0045).ix,'chordae_'+r.id+'_'+leaf+'_'+i,r,'chordae','#d1bd95');
   r.chords.push({mesh,leaf,u,anchor});meshes.push(mesh);
  }
 }
 function buildField(r,key){
  if(r.cache.has(key)){const f=r.cache.get(key);r.cache.delete(key);r.cache.set(key,f);return f;}
  const open=key/STEPS,rad=r.radius,s=FIELD_STEP,min=[-rad-.045,-rad*r.aspect-.045,-rad*1.13-.045],max=[rad+.045,rad*r.aspect+.045,rad*.75+.045],dims=max.map((x,i)=>Math.ceil((x-min[i])/s)+1),[nx,ny,nz]=dims,stride=nx*ny,rho=new Uint8Array(nx*ny*nz),labels=new Uint8Array(rho.length),p=[0,0,0];
  function stamp(x,y,z,label){const fx=(x-min[0])/s,fy=(y-min[1])/s,fz=(z-min[2])/s,ix=Math.round(fx),iy=Math.round(fy),iz=Math.round(fz);
   for(let dz=-1;dz<=1;dz++)for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a=ix+dx,b=iy+dy,c=iz+dz;if(a<0||b<0||c<0||a>=nx||b>=ny||c>=nz)continue;const dist=(a-fx)**2+(b-fy)**2+(c-fz)**2,val=Math.round(255*Math.exp(-dist*1.7)),at=a+b*nx+c*stride;if(val>rho[at]){rho[at]=val;labels[at]=label;}}
  }
  for(const part of r.parts)for(let j=0;j<=40;j++)for(let i=0;i<=100;i++){localPoint(r,part.leaf,i/100,j/40,open,p);stamp(...p,part.label);}
  const field={min,dims,rho,labels,s,open};r.cache.set(key,field);while(r.cache.size>STEPS+1)r.cache.delete(r.cache.keys().next().value);return field;
 }
 function update(values={}){
  for(const r of rigs){const key=Math.round(clamp(values[r.id]||0)*STEPS);if(key===r.key)continue;r.key=key;r.open=key/STEPS;
   for(const part of r.parts){const p=part.mesh.geometry.attributes.position;for(let j=0;j<=part.W;j++)for(let i=0;i<=part.U;i++){point(r,part.leaf,i/part.U,j/part.W,r.open,q);p.setXYZ(j*(part.U+1)+i,q.x,q.y,q.z);}p.needsUpdate=true;part.mesh.geometry.computeVertexNormals();part.mesh.geometry.computeBoundingSphere();const edge=tubeData(Array.from({length:41},(_,i)=>point(r,part.leaf,i/40,1,r.open)),.0035),a=part.margin.geometry.attributes.position;a.array.set(edge.pos);a.needsUpdate=true;part.margin.geometry.computeVertexNormals();part.margin.geometry.computeBoundingSphere();}
   for(const c of r.chords){const tip=point(r,c.leaf,c.u,1,r.open),branch=c.anchor.clone().lerp(tip,.52),td=tubeData([c.anchor,branch,tip],.0045),p=c.mesh.geometry.attributes.position;p.array.set(td.pos);p.needsUpdate=true;c.mesh.geometry.computeVertexNormals();c.mesh.geometry.computeBoundingSphere();}
   r.field=buildField(r,key);
  }
 }
 function sample(x,y,z,out){
  for(const r of rigs){const dx=x-r.center[0],dy=y-r.center[1],dz=z-r.center[2],extent=r.radius*1.7;if(Math.abs(dx)>extent||Math.abs(dy)>extent||Math.abs(dz)>extent)continue;
   const f=r.field;if(!f)continue;const xx=(dx*r.axis.x+dy*r.axis.y+dz*r.axis.z-f.min[0])/f.s,yy=(dx*r.side.x+dy*r.side.y+dz*r.side.z-f.min[1])/f.s,zz=(dx*r.n.x+dy*r.n.y+dz*r.n.z-f.min[2])/f.s,[nx,ny,nz]=f.dims;
   if(xx<0||yy<0||zz<0||xx>=nx-1||yy>=ny-1||zz>=nz-1)continue;
   const ix=xx|0,iy=yy|0,iz=zz|0,fx=xx-ix,fy=yy-iy,fz=zz-iz,stride=nx*ny,at=ix+iy*nx+iz*stride;let density=0;
   for(let k=0;k<2;k++)for(let j=0;j<2;j++){const i=at+k*stride+j*nx;density+=(k?fz:1-fz)*(j?fy:1-fy)*(f.rho[i]*(1-fx)+f.rho[i+1]*fx)/255;}
   if(density>out.rho){out.rho=density;out.label=f.labels[at+(fx>.5?1:0)+(fy>.5?nx:0)+(fz>.5?stride:0)];}
  }return out;
 }
 update();return {rigs,meshes,definitions:defs,update,sample,staticLeafLabels:leafLabels};
}
return {state,timing,definitions,frame,point,localPoint,create};
});
