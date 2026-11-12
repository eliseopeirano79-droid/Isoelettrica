/* Sezioni geometriche del medesimo atlante mostrato in 3D. Nessuna fisica
 * acustica, misura clinica o dato di paziente. Coordinate in unità dell'atlante.
 * Il nucleo è indipendente da DOM, WebGL e motore ECG. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EchoCore=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const add=(a,b)=>a.map((v,i)=>v+b[i]),sub=(a,b)=>a.map((v,i)=>v-b[i]),mul=(a,s)=>a.map(v=>v*s);
const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
const norm=a=>Math.sqrt(dot(a,a)),unit=a=>{const l=norm(a);if(l<1e-10)throw Error('Asse geometrico nullo');return mul(a,1/l);};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),rad=x=>x*Math.PI/180;
function rotate(v,axis,degrees){const a=rad(degrees),c=Math.cos(a),s=Math.sin(a),n=unit(axis);return add(add(mul(v,c),mul(cross(n,v),s)),mul(n,dot(n,v)*(1-c)));}
function frame(origin,target,right){const d=unit(sub(target,origin)),u=unit(sub(right,mul(d,dot(right,d))));return {origin:[...origin],d,u,n:unit(cross(u,d))};}
const defaults=Object.freeze({slideX:0,slideY:0,rotation:0,fan:0,rock:0,depth:100});
function pose(view,state=defaults){
 const s={...defaults,...state},f=frame(view.origin,view.target,view.right);
 f.origin=add(f.origin,[s.slideX,s.slideY,0]);
 f.u=rotate(f.u,f.d,s.rotation);f.n=unit(cross(f.u,f.d));
 f.d=rotate(f.d,f.u,s.fan);f.n=unit(cross(f.u,f.d));
 f.d=rotate(f.d,f.n,s.rock);f.u=unit(cross(f.d,f.n));
 f.depth=view.depth*clamp(s.depth,50,180)/100;f.halfAngle=rad(view.sector||43);return f;
}
// Parallel-transport the probe frame along the actual torso surface. Reference
// presets keep their cut plane; sliding changes contact and local orientation.
function surfacePose(view,state=defaults,surface){
 const p=pose(view,state);if(!surface)return p;
 const ref=surface.point(view.origin[0],view.origin[1]),hit=surface.point(p.origin[0],p.origin[1]);
 if(!ref||!hit){p.contact=false;return p;}
 p.origin=hit.position;p.contact=true;p.surfaceNormal=hit.normal;
 const axis=cross(ref.normal,hit.normal),length=norm(axis),cos=clamp(dot(ref.normal,hit.normal),-1,1);
 if(length>1e-6){const angle=Math.atan2(length,cos)*180/Math.PI;p.d=rotate(p.d,axis,angle);p.u=rotate(p.u,axis,angle);p.n=unit(cross(p.u,p.d));}
 return p;
}
function project(point,p){const q=sub(point,p.origin);return [dot(q,p.u),dot(q,p.d),dot(q,p.n)];}
function world(x,y,p){return add(p.origin,add(mul(p.u,x),mul(p.d,y)));}
function inside(x,y,p){return y>=0&&x*x+y*y<=p.depth*p.depth&&Math.abs(Math.atan2(x,y))<=p.halfAngle;}

// Interseca spigoli reali. Le distanze vengono calcolate una volta per vertice;
// triangoli complanari non vengono inventati come contorni chiusi.
function intersect(positions,indices,p){
 const n=positions.length/3,dist=new Float64Array(n),uu=new Float64Array(n),vv=new Float64Array(n),lines=[];
 for(let i=0;i<n;i++){const x=positions[i*3]-p.origin[0],y=positions[i*3+1]-p.origin[1],z=positions[i*3+2]-p.origin[2];dist[i]=x*p.n[0]+y*p.n[1]+z*p.n[2];uu[i]=x*p.u[0]+y*p.u[1]+z*p.u[2];vv[i]=x*p.d[0]+y*p.d[1]+z*p.d[2];}
 const count=indices?indices.length:n;
 for(let k=0;k<count;k+=3){
  const ia=indices?indices[k]:k,ib=indices?indices[k+1]:k+1,ic=indices?indices[k+2]:k+2;
  const a=dist[ia],b=dist[ib],c=dist[ic];
  if((a>=0&&b>=0&&c>=0)||(a<=0&&b<=0&&c<=0))continue;
  const ids=[ia,ib,ic],points=[];
  for(let j=0;j<3;j++){const i=ids[j],l=ids[(j+1)%3],di=dist[i],dj=dist[l];if((di>=0)===(dj>=0))continue;const t=di/(di-dj);points.push([uu[i]+t*(uu[l]-uu[i]),vv[i]+t*(vv[l]-vv[i])]);}
  if(points.length===2&&Math.hypot(points[0][0]-points[1][0],points[0][1]-points[1][1])>1e-8)lines.push(points);
 }
 return lines;
}
// L'atlante contiene anche superfici aperte: si riempiono esclusivamente i
// contorni che si richiudono davvero. Nessun tappo artificiale sui vasi.
function contours(lines,tolerance=2e-5){
 const buckets=new Map(),nodes=[],edges=[];
 function node(p){
  const bx=Math.floor(p[0]/tolerance),by=Math.floor(p[1]/tolerance);
  for(let x=bx-1;x<=bx+1;x++)for(let y=by-1;y<=by+1;y++)for(const n of buckets.get(x+','+y)||[])
   if(Math.hypot(n.p[0]-p[0],n.p[1]-p[1])<=tolerance)return n;
  const n={p,edges:[]},key=bx+','+by;if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(n);nodes.push(n);return n;
 }
 for(const line of lines){const a=node(line[0]),b=node(line[1]);if(a===b)continue;const e={a,b,used:false};a.edges.push(e);b.edges.push(e);edges.push(e);}
 const paths=[];
 function walk(start,e){let current=start;const points=[start.p];let closed=false;
  while(e&&!e.used){e.used=true;current=e.a===current?e.b:e.a;points.push(current.p);if(current===start){closed=true;break;}e=current.edges.find(q=>!q.used);}
  if(points.length>1)paths.push({points,closed});
 }
 // Segui prima le estremità aperte, senza spezzare una catena a metà.
 for(const n of nodes)if(n.edges.length===1&&!n.edges[0].used)walk(n,n.edges[0]);
 for(const e of edges)if(!e.used)walk(e.a,e);
 return paths;
}
function slice(meshes,p,deform){return meshes.map(mesh=>{
 let positions=mesh.positions;
 if(deform){positions=new Float32Array(mesh.positions.length);for(let i=0;i<positions.length;i+=3){const q=deform([mesh.positions[i],mesh.positions[i+1],mesh.positions[i+2]]);positions.set(q,i);}}
 const lines=intersect(positions,mesh.indices,p);return {id:mesh.id,name:mesh.name,label:mesh.label,color:mesh.color,layer:mesh.layer,lines,paths:contours(lines)};
}).filter(s=>s.lines.length);}
function alignment(state){
 const s={...defaults,...state},position=Math.hypot(s.slideX,s.slideY),angle=Math.max(Math.abs(s.rotation),Math.abs(s.fan),Math.abs(s.rock)),depth=Math.abs(s.depth-100);
 const reached=position<.055&&angle<5&&depth<=15;
 const candidates=[['slideX',Math.abs(s.slideX)/.35],['slideY',Math.abs(s.slideY)/.35],['rotation',Math.abs(s.rotation)/35],['fan',Math.abs(s.fan)/25],['rock',Math.abs(s.rock)/25],['depth',depth/45]].sort((a,b)=>b[1]-a[1]);
 const score=Math.round(clamp(100-32*Math.hypot(position/.35,angle/35,depth/45),0,100));
 return {reached,position,angle,depth,score,largest:candidates[0][0]};
}
function perturbed(seed=1){const sign=seed%2?1:-1;return {...defaults,slideX:.22*sign,slideY:-.14,rotation:sign*24,fan:-12,rock:8};}
return {add,sub,mul,dot,cross,norm,unit,rotate,frame,pose,surfacePose,project,world,inside,intersect,contours,slice,alignment,perturbed,defaults,clamp};
});
