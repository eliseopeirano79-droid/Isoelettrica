// Work in registered atlas coordinates. Each boundary edge retains its tissue owner.
'use strict';
function repair(T, cuffs) {
  const key = p => p.toArray().map(x=>Math.round(x*1e6)).join(',');
  function boundaries(meshes) {
    const edges = new Map(), points = new Map();
    for (const mesh of meshes) {
      const attribute = mesh.geometry.attributes.position;
      const vertices = Array.from({length:attribute.count},(_,i)=>new T.Vector3().fromBufferAttribute(attribute,i));
      const keys = vertices.map(p=>{const k=key(p);points.set(k,p);return k;});
      const ix=mesh.geometry.index.array;
      for(let i=0;i<ix.length;i+=3) {
        const face=[keys[ix[i]],keys[ix[i+1]],keys[ix[i+2]]];
        if(new Set(face).size<3) continue;
        for(let j=0;j<3;j++) {
          const a=face[j],b=face[(j+1)%3],k=a<b?a+'/'+b:b+'/'+a;
          const edge=edges.get(k);
          if(edge)edge.count++;
          else edges.set(k,{a,b,mesh,count:1});
        }
      }
    }
    const adj=new Map(), remaining=new Set();
    for(const e of edges.values()) if(e.count===1){
      for(const p of [e.a,e.b]){if(!adj.has(p))adj.set(p,[]);adj.get(p).push(e);}
      remaining.add(e);
    }
    const result=[];
    for(const first of remaining){
      const component=[],todo=[first];remaining.delete(first);
      while(todo.length){const e=todo.pop();component.push(e);for(const v of [e.a,e.b])for(const n of adj.get(v))if(remaining.delete(n))todo.push(n);}
      if(!component.every(e=>adj.get(e.a).length===2&&adj.get(e.b).length===2))continue;
      let e=first,v=first.b;
      const ring=[];
      do{ring.push(points.get(v));const next=e.b===v?e.a:e.b;e=adj.get(next).find(x=>x!==e);v=next;}while(e!==first);
      result.push({ring,owners:[...new Set(component.map(e=>e.mesh))]});
    }
    return result;
  }
  function append(mesh, points, faces) {
    if(!faces.length)return;
    const patch=cuffs.geometry(points,faces);
    const joined=cuffs.merge([mesh.geometry,patch]);mesh.geometry.dispose();patch.dispose();mesh.geometry=joined;
  }
  function cap(mesh,ring) {
    const mid=cuffs.centroid(ring);
    const normal=new T.Vector3();
    ring.forEach((p,i)=>normal.add(new T.Vector3().crossVectors(p.clone().sub(mid),ring[(i+1)%ring.length].clone().sub(mid))));
    if(normal.lengthSq()<1e-20)return;
    normal.normalize();
    const u=ring[0].clone().sub(mid).projectOnPlane(normal).normalize(),v=new T.Vector3().crossVectors(normal,u);
    const xy=ring.map(p=>new T.Vector2(p.clone().sub(mid).dot(u),p.clone().sub(mid).dot(v)));
    const faces=T.ShapeUtils.triangulateShape(xy,[]);
    // The source atlas contains narrow, almost collinear cracks. A fan limited
    // to this tiny contour preserves even collinear boundary vertices.
    if(faces.length!==ring.length-2)append(mesh,[...ring,mid],ring.map((_,i)=>[i,(i+1)%ring.length,ring.length]));
    else append(mesh,ring,faces);
  }
  function at(mesh, point) {
    const q=new T.Vector3(...point);
    return boundaries([mesh]).map(r=>({r:r.ring,d:cuffs.centroid(r.ring).distanceTo(q)})).sort((a,b)=>a.d-b.d)[0].r;
  }
  function bridge(mesh,ring,other) {
    // An ordered, minimum-length zipper between the *edges* of the two sleeves.
    // It never spans either lumen, including where the two meshes share vertices.
    const a=ring.slice();let j=0;
    other.forEach((p,i)=>{if(p.distanceToSquared(a[0])<other[j].distanceToSquared(a[0]))j=i;});
    let b=[...other.slice(j),...other.slice(0,j)];
    const area=r=>r.reduce((sum,p,i)=>sum.add(new T.Vector3().crossVectors(p,r[(i+1)%r.length])),new T.Vector3());
    if(area(a).dot(area(b))<0)b=[b[0],...b.slice(1).reverse()];
    const n=a.length,m=b.length,width=m+1,cost=new Float64Array((n+1)*width),step=new Uint8Array(cost.length);
    cost.fill(Infinity);cost[0]=0;
    for(let i=0;i<=n;i++)for(let k=0;k<=m;k++){
      if(!i&&!k)continue;
      const left=i?cost[(i-1)*width+k]:Infinity,up=k?cost[i*width+k-1]:Infinity;
      cost[i*width+k]=Math.min(left,up)+a[i%n].distanceToSquared(b[k%m]);step[i*width+k]=left<up?1:2;
    }
    const faces=[];let i=n,k=m;
    while(i||k){if(step[i*width+k]===1){faces.push([(i-1)%n,i%n,n+k%m]);i--;}else{faces.push([i%n,n+k%m,n+(k-1)%m]);k--;}}
    append(mesh,[...a,...b],faces);
  }
  return {boundaries,cap,bridge,at};
}
module.exports=repair;
