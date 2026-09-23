/* One anatomical asset shared by ECG and Coronarie. Source geometry is immutable. */
(function(){
'use strict';
const T=window.THREE,G=window.HeartAtlasGeometry,base=new URL('.',document.currentScript.src),SCALE=.65;
let pending;
function load(){
 if(!pending){const model=new Promise((resolve,reject)=>new T.GLTFLoader().load(new URL('prototipo-cuore/heart-z-anatomy.glb',base).href,resolve,undefined,reject));
 pending=Promise.all([model,fetch(new URL('prototipo-cuore/atlas-coronary-map.json',base)).then(r=>{if(!r.ok)throw Error('Mappa anatomica non disponibile');return r.json();})]).catch(e=>{pending=null;throw e;});}
 return pending;
}
// Atlas long axis from the mitral region towards the apex. This is an
// approximate geometric allocation, not a patient-specific AHA segmentation.
const lvBase=new T.Vector3(.17,.26,-.31),lvApex=new T.Vector3(.84,-1.25,.45),axis=lvApex.clone().sub(lvBase),axisLength=axis.length();axis.normalize();
const anterior=new T.Vector3(0,0,1).addScaledVector(axis,-axis.z).normalize(),lateral=new T.Vector3().crossVectors(axis,anterior).normalize();if(lateral.x<0)lateral.negate();
function segment(x,y,z){const d=new T.Vector3(x,y,z).sub(lvBase),u=d.dot(axis)/axisLength,theta=(Math.atan2(d.dot(lateral),d.dot(anterior))*180/Math.PI+360)%360;
 if(u>.84)return 17;if(u>.61)return [13,16,15,14][Math.floor((theta+45)%360/90)];return (u>.32?7:1)+[0,5,4,3,2,1][Math.floor((theta+30)%360/60)];}
function split(mesh,assign){const geo=mesh.geometry,ix=geo.index?.array||Array.from({length:geo.attributes.position.count},(_,i)=>i),p=geo.attributes.position,n=geo.attributes.normal,groups=new Map();
 for(let i=0;i<ix.length;i+=3){const ids=[ix[i],ix[i+1],ix[i+2]],tag=typeof assign==='function'?assign(...[0,1,2].map(k=>ids.reduce((sum,j)=>sum+p.array[j*3+k],0)/3)):assign[i/3];if(!groups.has(tag))groups.set(tag,{p:[],n:[]});const dst=groups.get(tag);for(const j of ids){dst.p.push(p.getX(j),p.getY(j),p.getZ(j));if(n)dst.n.push(n.getX(j),n.getY(j),n.getZ(j));}}
 return [...groups].map(([tag,d])=>{const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(d.p,3));if(d.n.length)g.setAttribute('normal',new T.Float32BufferAttribute(d.n,3));else g.computeVertexNormals();return [tag,g];});
}
function build(options={}){
 const group=new T.Group();group.scale.setScalar(SCALE);const seg={},coro={},meshes=[],M=window.CardiacMechanics,parameters={...M.defaults};
 const uniforms={uAmpA:{value:.06},uAmpV:{value:.1},uLong:{value:.04},uTwist:{value:5*Math.PI/180},uAtr:{value:0},uVent:{value:0},uFibr:{value:0},uTime:{value:0}},dynamics=M.createDynamics();let currentMotion={atr:0,vent:0,fibr:0},lastStream=null,opacity=options.opacity??1;
 const blank=(name,layer)=>{const m=new T.Mesh(new T.BufferGeometry(),G.material(name,layer));m.userData.layer=layer;return m;};
 for(let n=1;n<=17;n++){seg[n]=blank('Left ventricle','wall');seg[n].userData.seg=n;}
 const rv=blank('Right ventricle','wall');for(const id of Object.keys(ISO_CUORE.CORO))if(!ISO_CUORE.CORO[id].vena)coro[id]=blank(id,'coronaries');
 function movingMaterial(mat){mat.onBeforeCompile=s=>M.shader(s,uniforms);mat.customProgramCacheKey=()=> 'atlas-coupled-mechanics-v1';return mat;}
 function add(m){meshes.push(m);group.add(m);if(!options.coronary)m.material=movingMaterial(m.material);return m;}
 function deformPoint(p){return new T.Vector3(...M.deform(p.toArray(),currentMotion,parameters,[],uniforms.uTime.value));}
 const out={group,seg,coro,rv,movingMaterial,deformPoint,setTissueOpacity(v,xray=false){for(const m of meshes){const vessel=m.userData.layer==='coronaries';if(!vessel){m.material.opacity=v;m.material.transparent=v<1;m.material.depthWrite=v===1;}else{m.material.depthTest=!xray;m.renderOrder=xray?4:0;}}},SEG:ISO_CUORE.SEG,meshes,loaded:false,setOpacity(v){opacity=v;for(const m of meshes){m.material.opacity=v;m.material.transparent=v<1;m.material.depthWrite=v===1;}},update(t,stream,cfg){
  if(lastStream!==stream){lastStream=stream;dynamics.reset();}
  const target=at=>{const e=stream.eventsAround(at),a=e.A?at-e.A.t:Infinity,v=e.V?at-e.V.t:Infinity,rr=e.V?.meta.rr||800;
   const pulse=(x,start,d)=>x>=start&&x<start+d?Math.sin(Math.PI*(x-start)/d)**2:0,silent=cfg.mode==='continuous'&&!cfg.cont,vf=cfg.cont==='vf';
   return {atr:silent||vf||cfg.cont==='af'||cfg.cont==='flutter'?0:pulse(a,35,Math.min(140,rr*.22)),vent:silent||vf?0:pulse(v,40,Math.min(300,rr*.55)),fibr:vf?1:0,silent};};
  currentMotion=dynamics.sample(t,target,parameters);uniforms.uAtr.value=currentMotion.atr;uniforms.uVent.value=currentMotion.vent;uniforms.uFibr.value=currentMotion.fibr;uniforms.uTime.value=t;
 }};

 out.ready=load().then(([gltf,map])=>{
  const source=G.sourceMeshes(gltf.scene);for(const mesh of source){const name=mesh.userData.sourceName;
   if(options.coronary&&name==='Left ventricle'){for(const [n,geometry]of split(mesh,segment)){seg[n].geometry=geometry;seg[n].name=name;seg[n].userData={...mesh.userData,seg:n};add(seg[n]);}continue;}
   if(options.coronary&&name==='Right ventricle'){rv.geometry=mesh.geometry;rv.name=name;rv.userData=mesh.userData;add(rv);continue;}
   if(options.coronary&&map.faces[name]){for(const [index,geometry]of split(mesh,map.faces[name])){const id=map.keys[index],target=coro[id];const part=new T.Mesh(geometry,target.material);part.name=id;part.userData={...mesh.userData,branch:id};add(part);}continue;}
   add(mesh);
  }
  add(G.junctionMesh());
  if(options.coronary){
   // The existing artery selectors, collateral tree and clinical territory data
   // retain their IDs. Only their display paths now follow the atlas.
   for(const [id,line]of Object.entries(map.paths)){const data=ISO_CUORE.CORO[id];if(!data)continue;data.via=line.map(p=>[...p.map(v=>v*SCALE),'w']);data.r=.015*SCALE;
    if(map.reconstructed.includes(id)){const curve=new T.CatmullRomCurve3(line.map(p=>new T.Vector3(...p)));coro[id].geometry=new T.TubeGeometry(curve,48,.012,8,false);coro[id].userData.reconstruction=true;coro[id].name=id;add(coro[id]);}
   }
  }
  window.CardiacAttachments?.seamNormals(meshes);out.setOpacity(opacity);out.loaded=true;return out;
 });return out;
}
window.HeartAtlas={build,load,segment,SCALE};
})();
