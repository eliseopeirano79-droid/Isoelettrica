/* Smooth hollow pulmonary arterial tree. The display surface is sampled from
 * the union of rounded centreline tubes, rather than a fan stretched between
 * three differently oriented source polygons. Anatomy atlas units, not mm.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'),require('./vascular-cuffs.js'));else root.PulmonaryArteries=factory(root.THREE,root.VascularCuffs);})(typeof window!=='undefined'?window:globalThis,function(T,C){
'use strict';
const V=a=>new T.Vector3(...a),normal=V([.226,.974,0]).normalize(),root=V([.179,.629,.385]);let cached;
const mainPoints=[root.clone().addScaledVector(normal,-.22).toArray(),root.toArray(),root.clone().addScaledVector(normal,.15).toArray(),[.24,1.00,.10],[.22,1.03,-.38],[.47,1.00,-.76],[.80,.97,-.99],[1.27,.94,-1.16],[1.50,.925,-1.24]];
const branchPoints=[[.18,1.0,-.44],[-.19,.93,-.50],[-.58,.83,-.56],[-1.16,.77,-.70],[-1.50,.73,-.78]];
const outlets=[{center:root,normal:normal.clone().negate()},{center:V([1.18,.945,-1.13]),normal:V([.94,-.06,-.34]).normalize()},{center:V([-1.16,.77,-.70]),normal:V([-.97,-.11,-.22]).normalize()}];
function segments(points,radii){const curve=new T.CatmullRomCurve3(points.map(V)),rows=curve.getPoints(100);return rows.slice(1).map((b,i)=>{const a=rows[i],v=b.clone().sub(a),k=i/100*(radii.length-1),j=Math.floor(k),r=radii[j]+(radii[Math.min(j+1,radii.length-1)]-radii[j])*(k-j),k1=(i+1)/100*(radii.length-1),j1=Math.floor(k1),r1=radii[j1]+(radii[Math.min(j1+1,radii.length-1)]-radii[j1])*(k1-j1);return {a:a.toArray(),v:v.toArray(),l:v.lengthSq(),r,dr:r1-r};});}
const main=segments(mainPoints,[.315,.305,.295,.275,.245,.225,.215,.205,.20]),branch=segments(branchPoints,[.213,.207,.20,.185,.18]);
function distance(x,y,z,segs,thickness){let best=Infinity;for(const s of segs){const ax=x-s.a[0],ay=y-s.a[1],az=z-s.a[2],t=Math.max(0,Math.min(1,(ax*s.v[0]+ay*s.v[1]+az*s.v[2])/s.l)),dx=ax-t*s.v[0],dy=ay-t*s.v[1],dz=az-t*s.v[2];best=Math.min(best,Math.sqrt(dx*dx+dy*dy+dz*dz)-s.r-s.dr*t+thickness);}return best;}
function field(x,y,z,thickness=0){const a=distance(x,y,z,main,thickness),b=distance(x,y,z,branch,thickness),h=Math.max(.10-Math.abs(a-b),0)/.10;return Math.min(a,b)-h*h*.025;}
function isosurface(thickness){
 const step=.045,min=[-1.73,.18,-1.51],max=[1.74,1.37,.79],size=min.map((v,i)=>Math.ceil((max[i]-v)/step)+1),[nx,ny,nz]=size,values=new Float32Array(nx*ny*nz),at=(i,j,k)=>(i*ny+j)*nz+k;
 for(let i=0;i<nx;i++)for(let j=0;j<ny;j++)for(let k=0;k<nz;k++)values[at(i,j,k)]=field(min[0]+i*step,min[1]+j*step,min[2]+k*step,thickness);
 const cube=[[0,0,0],[1,0,0],[1,1,0],[0,1,0],[0,0,1],[1,0,1],[1,1,1],[0,1,1]],tetra=[[0,5,1,6],[0,1,2,6],[0,2,3,6],[0,3,7,6],[0,7,4,6],[0,4,5,6]],points=[],faces=[];
 function emit(poly,direction){for(let j=1;j<poly.length-1;j++){const tri=[poly[0],poly[j],poly[j+1]],cross=new T.Vector3().crossVectors(tri[1].clone().sub(tri[0]),tri[2].clone().sub(tri[0]));if(cross.lengthSq()<1e-30)continue;if(cross.dot(direction)<0)[tri[1],tri[2]]=[tri[2],tri[1]];const first=points.length;points.push(...tri);faces.push([first,first+1,first+2]);}}
 for(let i=0;i<nx-1;i++)for(let j=0;j<ny-1;j++)for(let k=0;k<nz-1;k++){
  const f=cube.map(([a,b,c])=>values[at(i+a,j+b,k+c)]);if(f.every(v=>v>=0)||f.every(v=>v<0))continue;
  const ps=cube.map(([a,b,c])=>V([min[0]+(i+a)*step,min[1]+(j+b)*step,min[2]+(k+c)*step]));
  for(const t of tetra){const inside=t.filter(q=>f[q]<0),outside=t.filter(q=>f[q]>=0);if(!inside.length||!outside.length)continue;const cut=(a,b)=>ps[a].clone().lerp(ps[b],f[a]/(f[a]-f[b])),direction=outside.reduce((v,a)=>v.add(ps[a]),new T.Vector3()).divideScalar(outside.length).sub(inside.reduce((v,a)=>v.add(ps[a]),new T.Vector3()).divideScalar(inside.length));
   if(inside.length===1)emit(outside.map(b=>cut(inside[0],b)),direction);
   else if(outside.length===1)emit(inside.map(a=>cut(a,outside[0])),direction);
   else emit([cut(inside[0],outside[0]),cut(inside[0],outside[1]),cut(inside[1],outside[1]),cut(inside[1],outside[0])],direction);
  }
 }
 // Remove terminal caps at three anatomical section planes. The lumen is open.
 let clipped=faces.map(f=>f.map(i=>points[i]));for(const o of outlets){const next=[];for(const tri of clipped){const poly=[];for(let j=0;j<3;j++){const a=tri[j],b=tri[(j+1)%3],fa=(o===outlets[0]&&a.z<.05?-1:a.clone().sub(o.center).dot(o.normal)),fb=(o===outlets[0]&&b.z<.05?-1:b.clone().sub(o.center).dot(o.normal));if(fa<=0)poly.push(a);if((fa<=0)!==(fb<=0))poly.push(a.clone().lerp(b,fa/(fa-fb)));}for(let j=1;j<poly.length-1;j++)next.push([poly[0],poly[j],poly[j+1]]);}clipped=next;}
 const p=clipped.flat(),g=C.geometry(p,clipped.map((_,i)=>[i*3,i*3+1,i*3+2]));
 // Analytic field normals eliminate tetrahedral shading facets without moving
 // the surface, and remain identical where separately selectable parts meet.
 const pos=g.attributes.position,n=g.attributes.normal,e=.001;for(let i=0;i<pos.count;i++){const x=pos.getX(i),y=pos.getY(i),z=pos.getZ(i),v=V([field(x+e,y,z,thickness)-field(x-e,y,z,thickness),field(x,y+e,z,thickness)-field(x,y-e,z,thickness),field(x,y,z+e,thickness)-field(x,y,z-e,thickness)]).normalize();if(thickness)v.negate();n.setXYZ(i,...v.toArray());}
 if(thickness){const ix=g.index.array;for(let i=0;i<ix.length;i+=3)[ix[i+1],ix[i+2]]=[ix[i+2],ix[i+1]];}return g;
}
function build(){
 if(cached)return cached;
 const outer=isosurface(0),inner=isosurface(.025),outerLoops=C.boundaries(outer),innerLoops=C.boundaries(inner),rootRing=loops=>loops.find(r=>r.every(p=>Math.abs(p.clone().sub(root).dot(normal))<1e-4));
 if(outerLoops.length!==3||innerLoops.length!==3||!rootRing(outerLoops)||!rootRing(innerLoops))throw new Error('Pulmonary tree must have three open, continuous lumens');
 const rims=outlets.slice(1).map(o=>{const find=loops=>loops.find(r=>r.every(p=>Math.abs(p.clone().sub(o.center).dot(o.normal))<1e-4));return C.transition(find(outerLoops),find(innerLoops),o.normal,0);});
 const groups={trunk:[],left:[],right:[],junction:[]},positions=[],normals=[];
 for(const g of[outer,inner,...rims]){const offset=positions.length,p=g.attributes.position,n=g.attributes.normal,ix=g.index.array;for(let i=0;i<p.count;i++){positions.push(new T.Vector3().fromBufferAttribute(p,i));normals.push(new T.Vector3().fromBufferAttribute(n,i));}for(let i=0;i<ix.length;i+=3){const f=[ix[i],ix[i+1],ix[i+2]].map(j=>j+offset),c=f.reduce((v,j)=>v.add(positions[j]),new T.Vector3()).divideScalar(3),part=c.x<-.20?'right':c.z<-.58?'left':c.z<-.13?'junction':'trunk';groups[part].push(f);}}
 cached={roots:{outer:rootRing(outerLoops),inner:rootRing(innerLoops)},outlets,field,mainPoints,branchPoints};
 for(const [name,faces]of Object.entries(groups)){const g=C.geometry(positions,faces),p=g.attributes.position,n=g.attributes.normal,map=new Map(positions.map((p,i)=>[p.toArray().map(v=>Math.round(v*1e6)).join(','),normals[i]]));for(let i=0;i<p.count;i++){const v=map.get([p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*1e6)).join(','));if(v)n.setXYZ(i,...v.toArray());}g.userData={reconstruction:true,openings:3,smoothLumen:true};cached[name]=g;}
 for(const g of[outer,inner,...rims])g.dispose();return cached;
}
return {build,field,root,normal,mainPoints,branchPoints,outlets};
});
