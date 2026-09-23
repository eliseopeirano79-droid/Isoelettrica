/* Reversible illustrative structural morphologies. No pressure/flow solver.
 * Septal positions and slider dimensions are atlas registrations, not mm.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'),require('./anatomy-refinements.js'));else root.CongenitalAnatomy=factory(root.THREE,root.AnatomyRefinements);})(typeof window!=='undefined'?window:globalThis,function(T,R){
'use strict';
const V=a=>new T.Vector3(...a);
const definitions={
 asd2:{label:'DIA ostium secundum',center:[-.31,.17,-.33],normal:[1,0,.12],radius:.13,depth:.65,targets:['Right atrium','Left atrium'],control:'Ampiezza relativa del difetto',min:.5,max:1.7,def:1,view:'section'},
 vsdperi:{label:'DIV perimembranoso',center:[-.06,-.31,.12],normal:[.83,.15,-.54],radius:.10,depth:.58,targets:['Right ventricle','Left ventricle'],control:'Ampiezza relativa del difetto',min:.5,max:1.7,def:1,view:'section'},
 vsdmuscle:{label:'DIV muscolare',center:[.2,-.65,.27],normal:[.83,.15,-.54],radius:.12,depth:.64,targets:['Right ventricle','Left ventricle'],control:'Ampiezza relativa del difetto',min:.5,max:1.7,def:1,view:'section'},
 coarct:{focus:[-.04,.96,-1.27],label:'Coartazione iuxtaduttale',control:'Restringimento relativo',min:.15,max:.85,def:.6,view:'surface'},
 iaa:{focus:[-.05,1.65,-.70],label:'Interruzione dell’arco · tipo B',control:'Ampiezza relativa dell’interruzione',min:.6,max:1.4,def:1,view:'surface'},
 bicuspid:{label:'Valvola aortica bicuspide',control:'Apertura relativa',min:.15,max:1,def:.85,view:'valves'},
 cortriat:{membrane:true,focus:[-.12,.08,-.61],direction:[0,1,-.4],distance:2.7,label:'Cor triatriatum sinistro',control:'Apertura relativa della membrana',min:.2,max:.8,def:.4,view:'valves'}
};
function deformAorta(point,severity){const q=point.clone(),w=Math.exp(-(((q.y-.96)/.16)**2)),k=1-severity*w;q.x=-.04+(q.x+.04)*k;q.z=-1.27+(q.z+1.27)*k;return q;}
function insideDefect(point,d,scale=1){if(!d?.center)return false;const q=point.clone().sub(V(d.center)),n=V(d.normal).normalize(),axial=q.dot(n);return Math.abs(axial)<d.depth/2&&q.addScaledVector(n,-axial).length()<d.radius*scale;}
function create(api){
 let current=null,amount=1;const bases=new Map(),extras=[];
 const uniform={uDefectCenter:{value:new T.Vector3()},uDefectNormal:{value:new T.Vector3(1,0,0)},uDefectRadius:{value:0},uDefectDepth:{value:0},uArchGap:{value:0}};
 function decorate(shader,material){Object.assign(shader.uniforms,uniform,{uDefectTarget:{value:0},uArchTarget:{value:material.userData.anatomyName==='Aortic arch'?1:0}});material.userData.pathologyShader=shader;
  shader.fragmentShader='uniform vec3 uDefectCenter,uDefectNormal;uniform float uDefectRadius,uDefectDepth,uDefectTarget,uArchGap,uArchTarget;\n'+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>
if(uDefectTarget>.5&&uDefectRadius>0.0){vec3 d=vLocalHeart-uDefectCenter;float axial=dot(d,uDefectNormal);if(abs(axial)<uDefectDepth*.5&&length(d-axial*uDefectNormal)<uDefectRadius)discard;}
if(uArchTarget>.5&&uArchGap>0.0&&abs(vLocalHeart.z+.70)<uArchGap)discard;`);
  shader.uniforms.uDefectTarget.value=definitions[current]?.targets?.includes(material.userData.anatomyName)?1:0;
 }
 function add(geometry,name,color='#d3a89d',opacity=1){const material=api.movingMaterial(new T.MeshStandardMaterial({color,side:T.DoubleSide,roughness:.65,transparent:opacity<1,opacity}));material.color.convertSRGBToLinear();const mesh=new T.Mesh(geometry,material);mesh.userData={label:name,layer:'wall',pathologyExtra:true};api.anatomy.add(mesh);extras.push(mesh);return mesh;}
 function clear(){for(const m of extras){api.anatomy.remove(m);m.geometry.dispose();m.material.dispose();}extras.length=0;for(const [m,g]of bases){m.geometry.dispose();m.geometry=g.clone();}uniform.uDefectRadius.value=0;uniform.uArchGap.value=0;for(const m of api.meshes)if(m.material.userData.pathologyShader)m.material.userData.pathologyShader.uniforms.uDefectTarget.value=0;}
 function set(id,value){clear();current=definitions[id]?id:null;amount=Number.isFinite(value)?value:(definitions[current]?.def??1);const d=definitions[current];if(!d)return;
  if(d.center){
   for(const m of api.meshes.filter(m=>d.targets.includes(m.userData.sourceName))){
    if(!bases.has(m))bases.set(m,m.geometry.clone());
    const cut=R.openOstium(m.geometry,V(d.center),V(d.normal),d.radius*amount,d.depth/2);m.geometry.dispose();m.geometry=cut.geometry;
    if(cut.ring){const curve=new T.CatmullRomCurve3(cut.ring,true),rim=new T.TubeGeometry(curve,Math.max(48,cut.ring.length),.007,6,true);add(rim,'Margine del difetto · '+d.label,'#b77761');}
   }
  }
  if(current==='coarct'){for(const m of api.meshes.filter(m=>['Aortic arch','Aorta thoracica descendens'].includes(m.userData.sourceName))){if(!bases.has(m))bases.set(m,m.geometry.clone());const p=m.geometry.attributes.position;for(let i=0;i<p.count;i++){const q=deformAorta(new T.Vector3().fromBufferAttribute(p,i),amount);p.setXYZ(i,q.x,q.y,q.z);}p.needsUpdate=true;m.geometry.computeVertexNormals();m.geometry.computeBoundingSphere();}}
  if(current==='iaa')uniform.uArchGap.value=.07*amount;
  if(current==='cortriat'){const atrium=api.meshes.find(m=>m.userData.sourceName==='Left atrium'),center=V([-.12,.08,-.61]),points=[],indices=[],N=64,L=5;for(let i=0;i<=L;i++)for(let j=0;j<N;j++){const a=j/N*Math.PI*2,radial=V([Math.cos(a),0,Math.sin(a)]),inner=center.clone().addScaledVector(radial,.31*amount),outer=R.nearestSurface(atrium,center.clone().addScaledVector(radial,.42));points.push(...inner.lerp(outer,i/L).toArray());}for(let i=0;i<L;i++)for(let j=0;j<N;j++){const a=i*N+j,b=(i+1)*N+j,c=i*N+(j+1)%N,d=(i+1)*N+(j+1)%N;indices.push(a,b,c,c,b,d);}const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(points,3));g.setIndex(indices);g.computeVertexNormals();add(g,'Membrana fenestrata · atrio sinistro','#d0b6a5',.9);}
 }
 function acceptHit(h){const d=definitions[current],p=h.restPoint;if(!p)return true;if(d?.targets?.includes(h.object.userData.sourceName)&&insideDefect(p,d,amount))return false;if(current==='iaa'&&h.object.userData.sourceName==='Aortic arch'&&Math.abs(p.z+.70)<uniform.uArchGap.value)return false;return true;}
 return {decorate,set,acceptHit,get current(){return current;},valveCount:id=>current==='bicuspid'&&id==='aortic'?2:null,extras};
}
return {definitions,deformAorta,insideDefect,create};
});
