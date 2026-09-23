/* Display-only reconstructions registered to the source atlas. Distances are
 * atlas units, not patient measurements. Original GLB is never modified.
 * Standard branching: brachiocephalic, left common carotid, left subclavian.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'),require('./atlas-geometry.js'));else root.AnatomyRefinements=factory(root.THREE,root.HeartAtlasGeometry);})(typeof window!=='undefined'?window:globalThis,function(T,G){
'use strict';
const V=a=>new T.Vector3(...a),lerp=(a,b,t)=>a+(b-a)*t;
const names={brachiocephalic:['Truncus brachiocephalicus','Tronco brachiocefalico'],carotid:['Arteria carotis communis sinistra','Arteria carotide comune sinistra'],subclavian:['Arteria subclavia sinistra','Arteria succlavia sinistra'],descending:['Aorta thoracica descendens','Aorta toracica discendente']};
const aorticPoints=[[-.049,.328,-.174],[-.23,.53,-.06],[-.32,.84,.026],[-.323,1.204,.011],[-.22,1.55,-.19],[-.085,1.7,-.57],[-.039,1.56,-.98],[-.055,1.208,-1.226],[-.045,.85,-1.28],[-.02,.43,-1.3],[.01,.03,-1.29]];
const pulmonaryVeins=[
 {name:'Left superior pulmonary vein',points:[[.366,.335,-.786],[.48,.40,-1.08],[.94,.52,-1.30]],radius:.10},
 {name:'Left inferior pulmonary vein',points:[[.327,-.109,-1.028],[.44,-.12,-1.28],[.91,-.22,-1.53]],radius:.095},
 {name:'Right superior pulmonary vein',points:[[-.731,.202,-.778],[-.90,.28,-1.07],[-1.30,.48,-1.35]],radius:.105},
 {name:'Right inferior pulmonary vein',points:[[-.503,-.089,-.977],[-.66,-.14,-1.24],[-1.18,-.24,-1.48]],radius:.095}
];
function geometry(points,indices){const used=new Map(),pos=[],ix=indices.map(i=>{const key=points[i].toArray().map(x=>Math.round(x*1e6)).join(',');if(!used.has(key)){used.set(key,pos.length/3);pos.push(...points[i].toArray());}return used.get(key);});const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(pos,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;}
function sweep(points,radius,segments=48,sides=32){
 const curve=new T.CatmullRomCurve3(points.map(V)),frames=curve.computeFrenetFrames(segments,false),rows=[],positions=[];
 for(let i=0;i<=segments;i++){const t=i/segments,c=curve.getPointAt(t),r=typeof radius==='function'?radius(t):radius;const row=[];for(let j=0;j<sides;j++){const a=j/sides*Math.PI*2,q=c.clone().addScaledVector(frames.normals[i],r*Math.cos(a)).addScaledVector(frames.binormals[i],r*Math.sin(a));row.push(positions.length);positions.push(q);}rows.push(row);}
 return {curve,frames,rows,positions,segments,sides};
}
function indicesFor(s,skip=()=>false,start=0,end=s.segments){const ix=[];for(let i=start;i<end;i++)for(let j=0;j<s.sides;j++){if(skip(i,j))continue;const a=s.rows[i][j],b=s.rows[i+1][j],c=s.rows[i][(j+1)%s.sides],d=s.rows[i+1][(j+1)%s.sides];ix.push(a,c,b,c,d,b);}return ix;}
function vessel(points,radius,segments=48){const s=sweep(points,t=>radius*(1-.12*t),segments);return geometry(s.positions,indicesFor(s));}
function nearestSurface(mesh,point){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,tri=new T.Triangle(),q=new T.Vector3();let distance=Infinity,best=point.clone();for(let i=0;i<(ix?ix.count:p.count);i+=3){tri.set(...[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(p,ix?ix.getX(i+j):i+j)));tri.closestPointToPoint(point,q);if(q.distanceToSquared(point)<distance){distance=q.distanceToSquared(point);best.copy(q);}}return best;}
function smoothOstialBeds(source){
 // Remove the folded, closed ostial cuffs embedded in the atlas atrial surface
 // before forming shared open venous rims. Keep the AV boundaries pinned.
 const p=source.attributes.position,ix=source.index,points=Array.from({length:p.count},(_,i)=>new T.Vector3().fromBufferAttribute(p,i)),ids=ix?Array.from(ix.array):points.map((_,i)=>i),g=geometry(points,ids),pos=g.attributes.position,faces=g.index.array,rows=Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i)),neighbors=rows.map(()=>new Set()),edges=new Map();
 for(let i=0;i<faces.length;i+=3)for(let j=0;j<3;j++){const a=faces[i+j],b=faces[i+(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');neighbors[a].add(b);neighbors[b].add(a);edges.set(key,(edges.get(key)||0)+1);}
 const pinned=new Set();for(const [key,count]of edges)if(count===1)key.split(':').forEach(x=>pinned.add(+x));
 const weights=rows.map((p,i)=>pinned.has(i)?0:Math.max(...pulmonaryVeins.map(d=>Math.max(0,1-p.distanceTo(V(d.points[0]))/.40)**2)));
 for(let k=0;k<16;k++){const prev=rows.map(p=>p.clone());rows.forEach((p,i)=>{if(!weights[i]||!neighbors[i].size)return;const avg=new T.Vector3();neighbors[i].forEach(j=>avg.add(prev[j]));p.lerp(avg.divideScalar(neighbors[i].size),.72*weights[i]);});}
 rows.forEach((p,i)=>pos.setXYZ(i,...p.toArray()));g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function openOstium(source,center,normal,radius,depth=.42){
 const pos=source.attributes.position,ix=source.index,points=[],indices=[],cuts=[],normalUnit=normal.clone().normalize();
 const f=p=>{const d=p.clone().sub(center),a=d.dot(normalUnit);return Math.max(d.addScaledVector(normalUnit,-a).length()-radius,Math.abs(a)-depth);};
 const put=poly=>{const start=points.length;points.push(...poly);for(let i=1;i<poly.length-1;i++)indices.push(start,start+i,start+i+1);};
 function clip(tri,level){const edge=Math.max(tri[0].distanceTo(tri[1]),tri[1].distanceTo(tri[2]),tri[2].distanceTo(tri[0]));if(level&&tri.some(p=>p.distanceTo(center)<radius+depth+edge)&&edge>radius*.45){const [a,b,c]=tri,ab=a.clone().lerp(b,.5),bc=b.clone().lerp(c,.5),ca=c.clone().lerp(a,.5);for(const child of [[a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]])clip(child,level-1);return;}
  const poly=[],crossings=[];for(let i=0;i<3;i++){const a=tri[i],b=tri[(i+1)%3],fa=f(a),fb=f(b);if(fa>=0)poly.push(a);if((fa>=0)!==(fb>=0)){let lo=0,hi=1;for(let k=0;k<24;k++){const mid=(lo+hi)/2;if((f(a.clone().lerp(b,mid))>=0)===(fa>=0))lo=mid;else hi=mid;}const p=a.clone().lerp(b,(lo+hi)/2);poly.push(p);crossings.push(p);}}
  if(poly.length>=3)put(poly);if(crossings.length===2)cuts.push(crossings);
 }
 for(let i=0;i<(ix?ix.count:pos.count);i+=3)clip([0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,ix?ix.getX(i+j):i+j)),3);
 const key=p=>p.toArray().map(x=>Math.round(x*1e5)).join(','),nodes=new Map(),adj=new Map();for(const [a,b]of cuts){const ka=key(a),kb=key(b);nodes.set(ka,a);nodes.set(kb,b);for(const [x,y]of[[ka,kb],[kb,ka]]){if(!adj.has(x))adj.set(x,new Set());adj.get(x).add(y);}}
 const seen=new Set(),loops=[];for(const start of nodes.keys()){if(seen.has(start))continue;const ordered=[],stack=[start];let previous=null,k=start;while(k&&!seen.has(k)){seen.add(k);ordered.push(nodes.get(k));const next=[...(adj.get(k)||[])].find(n=>n!==previous&&!seen.has(n));previous=k;k=next;}if(ordered.length>8&&adj.get(previous)?.has(start))loops.push(ordered);}
 loops.sort((a,b)=>b.length-a.length);return {geometry:geometry(points,indices),ring:loops[0]||null};
}
function loft(ring,targets,radius,segments=32){
 const center=ring.reduce((c,p)=>c.add(p),new T.Vector3()).divideScalar(ring.length),curve=new T.CatmullRomCurve3([center,...targets.map(V)]),frames=curve.computeFrenetFrames(segments,false),N=ring.length,pos=[],ix=[];
 const offsets=ring.map(p=>p.clone().sub(center)),area=new T.Vector3(),lengths=[0];for(let j=0;j<N;j++){area.add(new T.Vector3().crossVectors(offsets[j],offsets[(j+1)%N]));lengths.push(lengths[j]+ring[j].distanceTo(ring[(j+1)%N]));}const winding=area.dot(frames.tangents[0])<0?-1:1,first=Math.atan2(offsets[0].dot(frames.binormals[0]),offsets[0].dot(frames.normals[0])),angles=ring.map((_,j)=>first+winding*Math.PI*2*lengths[j]/lengths[N]);
 for(let i=0;i<=segments;i++){const t=i/segments,c=curve.getPointAt(t),b=Math.min(1,t*4);for(let j=0;j<N;j++){const a=angles[j],offset=frames.normals[i].clone().multiplyScalar(radius*Math.cos(a)).addScaledVector(frames.binormals[i],radius*Math.sin(a));offset.multiplyScalar(1-.1*t);const startOffset=ring[j].clone().sub(center);pos.push(c.clone().add(startOffset.lerp(offset,b)));}}
 for(let i=0;i<segments;i++)for(let j=0;j<N;j++){const a=i*N+j,b=(i+1)*N+j,c=i*N+(j+1)%N,d=(i+1)*N+(j+1)%N;ix.push(a,c,b,c,d,b);}
 // Source ostia have independent winding. Orient each reconstructed wall outward.
 const c=curve.getPointAt(1-.5/segments);let sign=0;for(let k=ix.length-N*6;k<ix.length;k+=3){const a=pos[ix[k]],b=pos[ix[k+1]],d=pos[ix[k+2]],n=new T.Vector3().crossVectors(b.clone().sub(a),d.clone().sub(a));sign+=n.dot(a.clone().add(b).add(d).divideScalar(3).sub(c));}if(sign<0)for(let k=0;k<ix.length;k+=3)[ix[k+1],ix[k+2]]=[ix[k+2],ix[k+1]];
 return geometry(pos,ix);
}
function valveRoots(){const curve=new T.CatmullRomCurve3(aorticPoints.map(V)),an=curve.getTangentAt(0).normalize(),pn=V([.2263304,.9740476,-.0024246]).normalize();return {aortic:{center:V(aorticPoints[0]).addScaledVector(an,-.145).toArray(),normal:an.toArray(),radius:.25},pulmonary:{center:V([.133,.557,.391]).addScaledVector(pn,-.145).toArray(),normal:pn.toArray(),radius:.25}};}
function aorta(){
 const s=sweep(aorticPoints,t=>lerp(.30,.205,t),120,40),ports=[];
 // Origins are placed by anatomical position on the convexity, not by screen x.
 for(const [id,target,end,r]of [['brachiocephalic',[-.25,1.55,-.16],[-.65,2.53,.02],.115],['carotid',[-.1,1.70,-.49],[.01,2.68,-.45],.082],['subclavian',[-.04,1.56,-.95],[.62,2.36,-1.0],.095]]){
  let center=0,best=Infinity;for(let i=1;i<s.segments;i++){const d=s.curve.getPointAt(i/s.segments).distanceTo(V(target));if(d<best){center=i;best=d;}}
  let top=0;for(let j=1;j<s.sides;j++)if(s.positions[s.rows[center][j]].y>s.positions[s.rows[center][top]].y)top=j;
  const lo=center-2,hi=center+2,left=top-2,right=top+2,at=(i,j)=>s.rows[i][(j+s.sides)%s.sides],ring=[];
  for(let j=left;j<right;j++)ring.push(s.positions[at(lo,j)]);
  for(let i=lo;i<hi;i++)ring.push(s.positions[at(i,right)]);
  for(let j=right;j>left;j--)ring.push(s.positions[at(hi,j)]);
  for(let i=hi;i>lo;i--)ring.push(s.positions[at(i,left)]);
  const centerPoint=ring.reduce((q,p)=>q.add(p),new T.Vector3()).divideScalar(ring.length),tip=V(end),axis=tip.clone().sub(centerPoint).normalize(),seed=ring[0].clone().sub(centerPoint).projectOnPlane(axis).normalize(),side=new T.Vector3().crossVectors(axis,seed);
  // Preserve the parent opening exactly. Loft into a round, tapering branch.
  const pos=[],ix=[],N=ring.length,L=18;const winding=new T.Vector3().crossVectors(ring[1].clone().sub(centerPoint),ring[0].clone().sub(centerPoint)).dot(axis)>0?-1:1;
  for(let k=0;k<=L;k++){const t=k/L,c=centerPoint.clone().lerp(tip,t),blend=Math.min(1,t*4);for(let j=0;j<N;j++){const a=winding*j/N*Math.PI*2,round=seed.clone().multiplyScalar(r*Math.cos(a)).addScaledVector(side,r*Math.sin(a));const offset=ring[j].clone().sub(centerPoint).lerp(round,blend).multiplyScalar(1-.10*t);pos.push(c.clone().add(offset));}}
  for(let k=0;k<L;k++)for(let j=0;j<N;j++){const a=k*N+j,b=(k+1)*N+j,c=k*N+(j+1)%N,d=(k+1)*N+(j+1)%N;ix.push(a,c,b,c,d,b);}
  ports.push({id,lo,hi,left,right,geometry:geometry(pos,ix),ring:ring.map(p=>p.clone())});
 }
 const skip=(i,j)=>ports.some(p=>i>=p.lo&&i<p.hi&&((j-p.left+s.sides)%s.sides)<p.right-p.left);
 const nearest=point=>{let k=0,d=Infinity;for(let i=0;i<=s.segments;i++){const dist=s.curve.getPointAt(i/s.segments).distanceTo(V(point));if(dist<d){d=dist;k=i;}}return k;};
 const split=nearest(aorticPoints[3]),endArch=nearest(aorticPoints[7]);
 return {ascending:geometry(s.positions,indicesFor(s,skip,0,split)),arch:geometry(s.positions,indicesFor(s,skip,split,endArch)),descending:geometry(s.positions,indicesFor(s,skip,endArch)),ports,split,endArch};
}
function ductGeometry(meshes,radius){
 const aorta=meshes.find(m=>m.userData.sourceName==='Aortic arch'),pulmonary=meshes.find(m=>m.userData.sourceName==='Left pulmonary artery');if(!aorta||!pulmonary)return null;
 let a=nearestSurface(aorta,V([-.01,1.22,-.98])),p;for(let k=0;k<5;k++){p=nearestSurface(pulmonary,a);a=nearestSurface(aorta,p);}const axis=p.clone().sub(a).normalize(),u=new T.Vector3(0,1,0).projectOnPlane(axis).normalize(),v=new T.Vector3().crossVectors(axis,u),rings=[];
 for(const [mesh,c]of[[aorta,a],[pulmonary,p]])rings.push(Array.from({length:32},(_,i)=>nearestSurface(mesh,c.clone().addScaledVector(u,radius*Math.cos(i/32*Math.PI*2)).addScaledVector(v,radius*Math.sin(i/32*Math.PI*2)))));
 const pos=[],ix=[],N=32,L=16;for(let k=0;k<=L;k++)for(let j=0;j<N;j++)pos.push(rings[0][j].clone().lerp(rings[1][j],k/L));
 for(let k=0;k<L;k++)for(let j=0;j<N;j++){const x=k*N+j,y=(k+1)*N+j,z=k*N+(j+1)%N,w=(k+1)*N+(j+1)%N;ix.push(x,z,y,z,w,y);}
 return {geometry:geometry(pos,ix),a,p,axis,rings};
}
function apply(meshes,material){
 if(meshes.some(m=>m.userData.refined))return meshes;
 const ao=aorta();for(const [name,g]of [['Ascending aorta',ao.ascending],['Aortic arch',ao.arch]]){const m=meshes.find(m=>m.userData.sourceName===name);if(!m){g.dispose();continue;}m.geometry.dispose();m.geometry=g;m.userData.refined=true;m.userData.origin='Superficie ricostruita sui riferimenti Z-Anatomy';}
 for(const [name,index,targets,r]of [['Left pulmonary artery',1,[[.37,.93,-.97],[.75,.92,-1.08],[1.18,.90,-1.16]],.21],['Right pulmonary artery',2,[[-.52,.84,-.59],[-.85,.79,-.64],[-1.12,.76,-.66]],.18]]){const m=meshes.find(m=>m.userData.sourceName===name);if(!m)continue;m.geometry.dispose();m.geometry=loft(G.pulmonaryRings[index].map(V),targets,r);m.userData.refined=true;m.userData.origin='Tratto ilare ricostruito sul margine della biforcazione';}
 const atrium=meshes.find(m=>m.userData.sourceName==='Left atrium');if(atrium){const bed=smoothOstialBeds(atrium.geometry);atrium.geometry.dispose();atrium.geometry=bed;}
for(const d of pulmonaryVeins){const m=meshes.find(m=>m.userData.sourceName===d.name);if(!m||!atrium)continue;const center=nearestSurface(atrium,V(d.points[0])),normal=V(d.points[1]).sub(center).normalize(),cut=openOstium(atrium.geometry,center,normal,d.radius*1.2,.20);if(!cut.ring){cut.geometry.dispose();continue;}atrium.geometry.dispose();atrium.geometry=cut.geometry;atrium.userData.refined=true;atrium.userData.origin='Atlante con raccordi degli osti polmonari ricostruiti';m.geometry.dispose();m.geometry=loft(cut.ring,d.points.slice(1),d.radius);m.userData.ostium=cut.ring.map(p=>p.toArray());m.userData.refined=true;m.userData.origin='Vena raccordata al margine atriale ricostruito';}
 for(const [id,g]of [['descending',ao.descending],...ao.ports.map(p=>[p.id,p.geometry])]){const [name,label]=names[id],m=new T.Mesh(g,material(name,'vessels'));m.name=name;m.userData={sourceName:name,label,layer:'vessels',reconstruction:true,refined:true,origin:'Ricostruzione didattica · anatomia standard'};meshes.push(m);}
 const duct=ductGeometry(meshes,.018);if(duct){const m=new T.Mesh(duct.geometry,material('Legamento arterioso','vessels'));m.material.color.set('#b9aa91').convertSRGBToLinear();m.name='botallo';m.userData={sourceName:'botallo',label:'Legamento arterioso (Botallo)',layer:'vessels',reconstruction:true,refined:true,origin:'Ricostruzione didattica · inserzioni sui vasi'};meshes.push(m);}
 return meshes;
}
return {names,aorticPoints,pulmonaryVeins,sweep,vessel,aorta,apply,nearestSurface,openOstium,loft,valveRoots,ductGeometry};
});
