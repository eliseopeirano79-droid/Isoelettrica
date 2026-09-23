/* Display geometry at a myocardial sleeve. Slice the existing sleeve, remove
 * only its distal connected component, and continue both surfaces of its wall.
 * Coordinates are atlas units. No change is made to the source GLB.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'));else root.VascularCuffs=factory(root.THREE);})(typeof window!=='undefined'?window:globalThis,function(T){
'use strict';
const V=a=>new T.Vector3(...a),key=p=>p.toArray().map(x=>Math.round(x*1e6)).join(',');
function geometry(points,faces){
 const map=new Map(),p=[],ix=[];
 for(const f of faces){const row=f.map(i=>{const q=points[i],k=key(q);if(!map.has(k)){map.set(k,p.length/3);p.push(...q.toArray().map(x=>Math.round(x*1e6)/1e6));}return map.get(k);});if(new Set(row).size===3)ix.push(...row);}
 const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g.computeVertexNormals();g.computeBoundingSphere();return g;
}
function merge(geometries){const p=[],faces=[];for(const g of geometries){const at=p.length,a=g.attributes.position,ix=g.index;for(let i=0;i<a.count;i++)p.push(new T.Vector3().fromBufferAttribute(a,i));for(let i=0;i<(ix?ix.count:a.count);i+=3)faces.push([0,1,2].map(j=>at+(ix?ix.getX(i+j):i+j)));}return geometry(p,faces);}
function reverse(g){const ix=g.index.array;for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];g.computeVertexNormals();return g;}
function smoothCollar(source,cuff,width){
 const pos=source.attributes.position,points=Array.from({length:pos.count},(_,i)=>new T.Vector3().fromBufferAttribute(pos,i)),r=Math.max(...cuff.outer.map(p=>p.distanceTo(cuff.center)))+.035;
 let faces=Array.from({length:source.index.count/3},(_,i)=>[0,1,2].map(j=>source.index.getX(i*3+j)));
 const near=p=>{const d=p.clone().sub(cuff.center),a=d.dot(cuff.normal);return Math.abs(a)<width&&d.addScaledVector(cuff.normal,-a).length()<r;};
 // Split edges conformingly, including the adjacent triangle, so no T junction
 // is introduced between the original atlas and the rounded continuation.
 for(let pass=0;pass<2;pass++){const mids=new Map();for(const f of faces)for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],k=[Math.min(a,b),Math.max(a,b)].join(':');if(mids.has(k)||points[a].distanceTo(points[b])<.055||!(near(points[a])||near(points[b])))continue;mids.set(k,points.length);points.push(points[a].clone().lerp(points[b],.5));}
  const next=[];for(const f of faces){const poly=[];for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3];poly.push(a);const mid=mids.get([Math.min(a,b),Math.max(a,b)].join(':'));if(mid!==undefined)poly.push(mid);}if(poly.length===3)next.push(f);else{const center=points.length;points.push(f.reduce((v,i)=>v.add(points[i]),new T.Vector3()).divideScalar(3));for(let j=0;j<poly.length;j++)next.push([center,poly[j],poly[(j+1)%poly.length]]);}}faces=next;
 }
 const adj=points.map(()=>new Set()),edges=new Map();for(const f of faces)for(let j=0;j<3;j++){const a=f[j],b=f[(j+1)%3],k=[Math.min(a,b),Math.max(a,b)].join(':');adj[a].add(b);adj[b].add(a);edges.set(k,(edges.get(k)||0)+1);}const pinned=new Set();for(const [k,count]of edges)if(count===1)k.split(':').forEach(i=>pinned.add(+i));
 const weights=points.map((p,i)=>!pinned.has(i)&&near(p)?Math.max(0,1-Math.abs(p.clone().sub(cuff.center).dot(cuff.normal))/width)**2:0);
 for(let pass=0;pass<8;pass++)for(const amount of[.42,-.44]){const old=points.map(p=>p.clone());for(let i=0;i<points.length;i++){if(!weights[i]||!adj[i].size)continue;const mean=new T.Vector3();adj[i].forEach(j=>mean.add(old[j]));points[i].lerp(mean.divideScalar(adj[i].size),amount*weights[i]);}}
 return geometry(points,faces);
}
function boundaries(g){
 const p=g.attributes.position,ix=g.index,edges=new Map(),adj=new Map();
 for(let i=0;i<ix.count;i+=3)for(let j=0;j<3;j++){const a=ix.getX(i+j),b=ix.getX(i+(j+1)%3),k=[Math.min(a,b),Math.max(a,b)].join(':');edges.set(k,(edges.get(k)||0)+1);}
 for(const [k,n]of edges)if(n===1){const [a,b]=k.split(':').map(Number);for(const [x,y]of[[a,b],[b,a]]){if(!adj.has(x))adj.set(x,[]);adj.get(x).push(y);}}
 const seen=new Set(),loops=[];for(const start of adj.keys()){if(seen.has(start))continue;const loop=[];let at=start,prev=-1;while(!seen.has(at)){seen.add(at);loop.push(new T.Vector3().fromBufferAttribute(p,at));const next=adj.get(at)?.find(x=>x!==prev);prev=at;at=next;if(at===undefined)break;}if(at===start&&loop.length>2)loops.push(loop);}
 return loops;
}
function area(ring){const sum=new T.Vector3();for(let i=0;i<ring.length;i++)sum.add(new T.Vector3().crossVectors(ring[i],ring[(i+1)%ring.length]));return sum.length()/2;}
function centroid(ring){let length=0;const c=new T.Vector3();for(let i=0;i<ring.length;i++){const a=ring[i],b=ring[(i+1)%ring.length],d=a.distanceTo(b);c.addScaledVector(a.clone().add(b),d/2);length+=d;}return c.divideScalar(length);}
function trim(source,center,normal){
 const n=normal.clone().normalize(),pos=source.attributes.position,ix=source.index,points=[],ids=new Map(),positive=[],negative=[],original=[],positiveSource=[],negativeSource=[];
 const put=(poly,to)=>{const row=poly.map(p=>{const k=key(p);if(!ids.has(k)){ids.set(k,points.length);points.push(p);}return ids.get(k);});for(let i=1;i<row.length-1;i++)if(new Set([row[0],row[i],row[i+1]]).size===3)to.push([row[0],row[i],row[i+1]]);};
 for(let i=0;i<(ix?ix.count:pos.count);i+=3){const tri=[0,1,2].map(j=>new T.Vector3().fromBufferAttribute(pos,ix?ix.getX(i+j):i+j));original.push(tri);for(const sign of[1,-1]){const poly=[],to=sign===1?positive:negative,origins=sign===1?positiveSource:negativeSource;for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],fa=a.clone().sub(center).dot(n)*sign,fb=b.clone().sub(center).dot(n)*sign;if(fa>=0)poly.push(a);if((fa>=0)!==(fb>=0))poly.push(a.clone().lerp(b,fa/(fa-fb)));}if(poly.length>=3)put(poly,to);while(origins.length<to.length)origins.push(i/3);}}
 const adj=points.map(()=>new Set());for(const f of positive)for(let j=0;j<3;j++){adj[f[j]].add(f[(j+1)%3]);adj[f[(j+1)%3]].add(f[j]);}
 const seen=new Set(),components=[];for(const f of positive)for(const start of f){if(seen.has(start))continue;const todo=[start],set=new Set(),c=new T.Vector3();while(todo.length){const at=todo.pop();if(seen.has(at))continue;seen.add(at);set.add(at);c.add(points[at]);todo.push(...adj[at]);}c.divideScalar(set.size);components.push({set,distance:c.distanceTo(center)});}
 components.sort((a,b)=>a.distance-b.distance);if(!components.length||components[0].distance>.12)throw new Error('No myocardial cuff at the registered section');
 const removed=components[0].set,cap=geometry(points,positive.filter(f=>removed.has(f[0]))),rings=boundaries(cap).filter(r=>r.every(p=>Math.abs(p.clone().sub(center).dot(n))<2e-5)).sort((a,b)=>area(b)-area(a));cap.dispose();
 if(rings.length!==2)throw new Error('A myocardial cuff must expose its outer wall and its lumen');
 // Keep every unaffected source triangle verbatim. Splitting the entire atrium
 // again for the next vein creates unnecessary cuts in already joined sleeves.
 const affected=new Set(positive.flatMap((f,i)=>removed.has(f[0])?[positiveSource[i]]:[])),kept=negative.filter((_,i)=>affected.has(negativeSource[i]));original.forEach((tri,i)=>{if(!affected.has(i))put(tri,kept);});
 return {geometry:geometry(points,kept),outer:rings[0],inner:rings[1],center:center.clone(),normal:n};
}
function circle(center,normal,radius,sides=64){const u=new T.Vector3(0,0,1).projectOnPlane(normal).normalize(),v=new T.Vector3().crossVectors(normal,u);return Array.from({length:sides},(_,i)=>center.clone().addScaledVector(u,radius*Math.cos(i/sides*Math.PI*2)).addScaledVector(v,radius*Math.sin(i/sides*Math.PI*2)));}
// The first loop is kept verbatim; all subsequent loops are sampled at the
// same angular positions. This avoids a twisted zipper at an irregular ostium.
function transition(ring,endRing,normal,steps=8){
 endRing=endRing.slice();const endArea=new T.Vector3();for(let j=0;j<endRing.length;j++)endArea.add(new T.Vector3().crossVectors(endRing[j],endRing[(j+1)%endRing.length]));if(endArea.dot(normal)<0)endRing=[endRing[0],...endRing.slice(1).reverse()];
 const center=centroid(ring),end=centroid(endRing),u=endRing[0].clone().sub(end).normalize(),v=new T.Vector3().crossVectors(normal,u),N=ring.length;
 const start=ring.slice(),areaVector=new T.Vector3();for(let j=0;j<N;j++)areaVector.add(new T.Vector3().crossVectors(start[j].clone().sub(center),start[(j+1)%N].clone().sub(center)));if(areaVector.dot(normal)<0)start.reverse();
 const angle=p=>{let a=Math.atan2(p.clone().sub(center).dot(v),p.clone().sub(center).dot(u));return a<0?a+Math.PI*2:a;};
 let first=0;for(let j=1;j<N;j++)if(angle(start[j])<angle(start[first]))first=j;const ordered=[...start.slice(first),...start.slice(0,first)],angles=ordered.map(angle),radius=endRing[0].distanceTo(end),points=[],faces=[];
 for(let k=0;k<=steps;k++){const t=k/(steps+1),s=t*t*(3-2*t),c=center.clone().lerp(end,t);for(let j=0;j<N;j++){const circular=u.clone().multiplyScalar(radius*Math.cos(angles[j])).addScaledVector(v,radius*Math.sin(angles[j]));points.push(c.clone().add(ordered[j].clone().sub(center).lerp(circular,s)));}}
 for(let k=0;k<steps;k++)for(let j=0;j<N;j++){const a=k*N+j,b=k*N+(j+1)%N,c=(k+1)*N+j,d=(k+1)*N+(j+1)%N;faces.push([a,b,c],[b,d,c]);}
 const offset=points.length;points.push(...endRing);const endAngles=endRing.map(p=>{let a=Math.atan2(p.clone().sub(end).dot(v),p.clone().sub(end).dot(u));return a< -1e-9?a+Math.PI*2:Math.max(0,a);});
 // Join circular loops with different numbers of vertices using their angles.
 let a=0,b=0;while(a<N||b<endRing.length){const nextA=a<N?(a+1<N?angles[a+1]:angles[0]+Math.PI*2):Infinity,nextB=b<endRing.length?(b+1<endRing.length?endAngles[b+1]:Math.PI*2):Infinity;
  const ia=steps*N+a%N,ib=offset+b%endRing.length;if(nextA<nextB){faces.push([ia,steps*N+(a+1)%N,ib]);a++;}else{faces.push([ia,offset+(b+1)%endRing.length,ib]);b++;}}
 return geometry(points,faces);
}
function tube(rings){const N=rings[0].length,p=rings.flat(),faces=[];for(let k=0;k<rings.length-1;k++)for(let j=0;j<N;j++){const a=k*N+j,b=k*N+(j+1)%N,c=(k+1)*N+j,d=(k+1)*N+(j+1)%N;faces.push([a,b,c],[b,d,c]);}return geometry(p,faces);}
function extend(cuff,points,outerRadius,innerRadius,collarLength=.10){
 const center=centroid(cuff.outer).lerp(centroid(cuff.inner),.5),neck=center.clone().addScaledVector(cuff.normal,collarLength),outer=circle(neck,cuff.normal,outerRadius),inner=circle(neck,cuff.normal,innerRadius);
 const a=transition(cuff.outer,outer,cuff.normal),b=reverse(transition(cuff.inner,inner,cuff.normal)),joined=merge([cuff.geometry,a,b]),wall=smoothCollar(joined,cuff,collarLength*.65);for(const g of[a,b,joined])g.dispose();
 const curve=new T.CatmullRomCurve3([neck,neck.clone().addScaledVector(cuff.normal,.12),...points.map(V)]),L=40,frames=curve.computeFrenetFrames(L,false),theta=Math.atan2(outer[0].clone().sub(neck).dot(frames.binormals[0]),outer[0].clone().sub(neck).dot(frames.normals[0]));
 const build=r=>Array.from({length:L+1},(_,k)=>{const t=k/L,c=curve.getPointAt(t),radius=r*(1-.08*t);return Array.from({length:64},(_,j)=>{const a=theta+j/64*Math.PI*2;return c.clone().addScaledVector(frames.normals[k],radius*Math.cos(a)).addScaledVector(frames.binormals[k],radius*Math.sin(a));});});
 const ro=build(outerRadius),ri=build(innerRadius);ro[0]=outer;ri[0]=inner;const out=tube(ro),inside=tube(ri.map(r=>r.slice().reverse())),rim=tube([ro.at(-1),ri.at(-1)]),vessel=merge([out,inside,rim]);out.dispose();inside.dispose();rim.dispose();
 return {wall,vessel,outer,inner,neck,sourceOuter:cuff.outer,sourceInner:cuff.inner};
}
return {geometry,merge,reverse,smoothCollar,boundaries,area,centroid,trim,circle,transition,tube,extend};
});
