/* Smooth, depth-tested CPU renderer for devices without WebGL. Same atlas and
 * camera as the GPU path; lower display resolution only. No screenshot assets. */
(function(){'use strict';
const T=window.THREE,C=window.EchoCore;
function prepare(mesh,{deform=false,grid=0}={}){
 const pos=mesh.geometry.attributes.position,ix=mesh.geometry.index?.array,points=[],faces=[],keys=new Map(),map=new Uint32Array(pos.count);
 for(let i=0;i<pos.count;i++){
  const p=[pos.getX(i),pos.getY(i),pos.getZ(i)],key=grid?p.map(x=>Math.round(x/grid)).join(','):String(i);
  if(!keys.has(key)){keys.set(key,points.length);points.push(p);}map[i]=keys.get(key);
 }
 for(let i=0;i<(ix?ix.length:pos.count);i+=3){const f=[0,1,2].map(j=>map[ix?ix[i+j]:i+j]);if(f[0]!==f[1]&&f[1]!==f[2]&&f[0]!==f[2])faces.push(f);}
 const normals=points.map(()=>[0,0,0]);
 for(const f of faces){const n=C.cross(C.sub(points[f[1]],points[f[0]]),C.sub(points[f[2]],points[f[0]]));for(const i of f)for(let j=0;j<3;j++)normals[i][j]+=n[j];}
 for(const n of normals){const d=C.norm(n)||1;for(let j=0;j<3;j++)n[j]/=d;}
 const color=mesh.material.color.clone();if(color.convertLinearToSRGB)color.convertLinearToSRGB();
 return {points,faces,normals,color:[color.r*255,color.g*255,color.b*255],deform,mesh,name:mesh.userData.sourceName,layer:mesh.userData.layer};
}
function create(){
 const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');let pixels,depth,W=0,H=0;
 function render(items,w,h,camera,motion,options={}){
  if(w!==W||h!==H){W=w;H=h;canvas.width=w;canvas.height=h;pixels=ctx.createImageData(w,h);depth=new Float32Array(w*h);}
  pixels.data.fill(0);depth.fill(Infinity);
  const e=new T.Matrix4().multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse).elements,light=C.unit([-.45,.6,1]);
  const clip=options.clip,highlight=options.highlight;
  function triangle(a,b,c,col){
   const area=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);if(Math.abs(area)<.06)return;
   const minX=Math.max(0,Math.floor(Math.min(a[0],b[0],c[0]))),maxX=Math.min(W-1,Math.ceil(Math.max(a[0],b[0],c[0]))),minY=Math.max(0,Math.floor(Math.min(a[1],b[1],c[1]))),maxY=Math.min(H-1,Math.ceil(Math.max(a[1],b[1],c[1])));
   if(maxX<minX||maxY<minY)return;
   const inv=1/area;
   for(let y=minY;y<=maxY;y++)for(let x=minX;x<=maxX;x++){
    const wa=((b[0]-x)*(c[1]-y)-(b[1]-y)*(c[0]-x))*inv,wb=((c[0]-x)*(a[1]-y)-(c[1]-y)*(a[0]-x))*inv,wc=1-wa-wb;
    if(wa<-.001||wb<-.001||wc<-.001)continue;
    const z=a[2]*wa+b[2]*wb+c[2]*wc,at=x+y*W;if(z>=depth[at]||z<0||z>1)continue;depth[at]=z;
    const shade=a[3]*wa+b[3]*wb+c[3]*wc,k=at*4;for(let j=0;j<3;j++)pixels.data[k+j]=Math.min(255,col[j]*shade);pixels.data[k+3]=255;
   }
  }
  for(const item of items){
   if(item.mesh.visible===false)continue;
   const matrix=item.deform?null:item.mesh.matrixWorld?.elements;
   const projected=item.points.map((p,i)=>{
    let q=item.deform?window.CardiacMechanics.deform(p,motion):p,n=item.normals[i];
    if(matrix){const m=matrix;q=[m[0]*p[0]+m[4]*p[1]+m[8]*p[2]+m[12],m[1]*p[0]+m[5]*p[1]+m[9]*p[2]+m[13],m[2]*p[0]+m[6]*p[1]+m[10]*p[2]+m[14]];n=[m[0]*n[0]+m[4]*n[1]+m[8]*n[2],m[1]*n[0]+m[5]*n[1]+m[9]*n[2],m[2]*n[0]+m[6]*n[1]+m[10]*n[2]];}
    const x=q[0],y=q[1],z=q[2],cw=e[3]*x+e[7]*y+e[11]*z+e[15],px=(e[0]*x+e[4]*y+e[8]*z+e[12])/cw,py=(e[1]*x+e[5]*y+e[9]*z+e[13])/cw,pz=(e[2]*x+e[6]*y+e[10]*z+e[14])/cw;
    const nl=C.norm(n)||1,lambert=Math.max(0,C.dot(n,light)/nl),rim=Math.pow(1-Math.abs(n[2]/nl),2)*.13,shade=.38+lambert*.64+rim;
    return [(px+1)*W/2,(1-py)*H/2,(pz+1)/2,shade,clip?C.dot(q,clip.normal)+clip.constant:-1];
   });
   let color=item.color;if(highlight)color=item.name===highlight?[109,239,203]:color.map(x=>x*.64);
   for(const f of item.faces){let ps=f.map(i=>projected[i]);if(clip){const out=[];for(let i=0;i<3;i++){const a=ps[i],b=ps[(i+1)%3];if(a[4]<=0)out.push(a);if((a[4]<=0)!==(b[4]<=0)){const t=a[4]/(a[4]-b[4]);out.push(a.map((v,j)=>v+(b[j]-v)*t));}}ps=out;}if(ps.length<3)continue;for(let i=1;i<ps.length-1;i++)triangle(ps[0],ps[i],ps[i+1],color);}
  }
  ctx.putImageData(pixels,0,0);return canvas;
 }
 return {render};
}
window.EchoRaster={prepare,create};
})();
