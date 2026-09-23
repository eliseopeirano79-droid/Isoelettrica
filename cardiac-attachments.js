/* Geometric attachment helpers. Derived display meshes only; source GLB unchanged. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'));else root.CardiacAttachments=factory(root.THREE);})(typeof window!=='undefined'?window:globalThis,function(T){
'use strict';
function nearestPoint(mesh,point){const p=mesh.geometry.attributes.position,ix=mesh.geometry.index,tri=new T.Triangle(),q=new T.Vector3(),best=point.clone();let distance=Infinity;for(let j=0;j<(ix?ix.count:p.count);j+=3){const ids=[0,1,2].map(k=>ix?ix.getX(j+k):j+k);tri.set(...ids.map(i=>new T.Vector3().fromBufferAttribute(p,i)));tri.closestPointToPoint(point,q);const d=q.distanceToSquared(point);if(d<distance){distance=d;best.copy(q);}}return best;}
// Average coincident seam normals only within the great-vessel assembly.
// Separate labels/materials and open vessel ends are preserved.
function seamNormals(meshes){const buckets=new Map();for(const m of meshes.filter(m=>m.userData.layer==='vessels')){const p=m.geometry.attributes.position,n=m.geometry.attributes.normal;if(!n)continue;for(let i=0;i<p.count;i++){const key=[p.getX(i),p.getY(i),p.getZ(i)].map(x=>Math.round(x*1e4)).join(',');if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push({m,i,n});}}
 let joined=0;for(const entries of buckets.values()){if(new Set(entries.map(e=>e.m)).size<2)continue;const normal=new T.Vector3();for(const e of entries)normal.add(new T.Vector3().fromBufferAttribute(e.n,e.i));if(normal.lengthSq()<1e-8)continue;normal.normalize();for(const e of entries){e.n.setXYZ(e.i,...normal.toArray());e.n.needsUpdate=true;}joined++;}return joined;}
function visible(mesh){for(let m=mesh;m;m=m.parent)if(!m.visible)return false;return true;}
function pick(ray,meshes,deform){const hits=[];for(const mesh of meshes){if(!visible(mesh)||mesh.material.opacity<=.1)continue;if(mesh.userData.worldDeformed){hits.push(...ray.intersectObject(mesh,false));continue;}if(!mesh.isMesh)continue;
 const original=mesh.geometry,p=original.attributes.position;if(!p)continue;const geometry=new T.BufferGeometry();geometry.setIndex(original.index);const points=new Float32Array(p.count*3);for(let i=0;i<p.count;i++){const q=deform(new T.Vector3().fromBufferAttribute(p,i),mesh);points.set(q.toArray(),i*3);}geometry.setAttribute('position',new T.BufferAttribute(points,3));geometry.computeBoundingSphere();const proxy=new T.Mesh(geometry,mesh.material);proxy.matrixWorld.copy(mesh.matrixWorld);const found=ray.intersectObject(proxy,false);
 for(const h of found){if(h.face){const ids=[h.face.a,h.face.b,h.face.c],tri=new T.Triangle(...ids.map(i=>new T.Vector3().fromBufferAttribute(geometry.attributes.position,i))),local=mesh.worldToLocal(h.point.clone()),bary=tri.getBarycoord(local,new T.Vector3());h.restPoint=new T.Vector3();ids.forEach((id,i)=>h.restPoint.addScaledVector(new T.Vector3().fromBufferAttribute(p,id),bary.getComponent(i)));}h.object=mesh;hits.push(h);}geometry.dispose();}
 return hits.sort((a,b)=>a.distance-b.distance);
}
function valvePoint(rig,leaf,u,v,open){const angle=(leaf+u)*Math.PI*2/rig.count,rad=rig.radius*(1-v+.8*open*v);return rig.center.clone().addScaledVector(rig.axis,rad*Math.cos(angle)).addScaledVector(rig.side,rad*Math.sin(angle)).addScaledVector(rig.n,(rig.pap?-1:1)*rig.radius*(.1*Math.sin(Math.PI*v)+.9*open*v));}
function constrainedLeaf(rig,leaf,u,v,open,deform,tether){const q=deform(valvePoint(rig,leaf,u,v,open));if(!rig.pap||v===0||u===0||u===1)return q;
 const pap=deform(new T.Vector3(...rig.pap[leaf%rig.pap.length])),closed=deform(valvePoint(rig,leaf,u,v,0)),length=closed.distanceTo(pap),center=deform(rig.center),eps=.0005;
 const axis=deform(rig.center.clone().addScaledVector(rig.axis,eps)).sub(center),side=deform(rig.center.clone().addScaledVector(rig.side,eps)).sub(center),normal=axis.cross(side).normalize();
 return new T.Vector3(...tether(q.toArray(),pap.toArray(),length,center.toArray(),normal.toArray(),-1));
}
return {nearestPoint,seamNormals,pick,valvePoint,constrainedLeaf};
});
