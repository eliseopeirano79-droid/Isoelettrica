/* Educational tissue volume, derived from the same atlas as the 3D scene.
 * Tissue reconstruction at open junctions is approximate; no patient data.
 * Geometry is in atlas units. Shared ECG deformation is inverted, not replaced.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EchoVolume=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function decode(buffer){
 const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
 if(bytes.length<12||String.fromCharCode(...bytes.subarray(0,4))!=='EVOL')throw Error('Volume anatomico non valido');
 const len=dv.getUint32(4,true);if(len>bytes.length-8)throw Error('Intestazione del volume incompleta');
 const meta=JSON.parse(new TextDecoder().decode(bytes.subarray(8,8+len))),[nx,ny,nz]=meta.dims,N=nx*ny*nz;
 if(!Number.isSafeInteger(N)||N<1||N>12000000)throw Error('Dimensioni del volume non valide');
 const density=new Uint8Array(N),labels=new Uint8Array(N);let at=0;
 for(let i=8+len;i+3<bytes.length;i+=4){const count=dv.getUint16(i,true);if(!count||at+count>N)throw Error('Sequenza del volume non valida');density.fill(bytes[i+2],at,at+count);labels.fill(bytes[i+3],at,at+count);at+=count;}
 if(at!==N)throw Error('Volume anatomico incompleto');
 const stride=nx*ny,inv=1/meta.step,lo=meta.min,noise=new Uint8Array(N);let seed=671337;
 for(let i=0;i<N;i++){seed=(Math.imul(seed,1664525)+1013904223)>>>0;noise[i]=seed>>>24;}
 // Point queries return trilinear density and scatter in a reusable object.
 function sample(x,y,z,out={}){
  x=(x-lo[0])*inv;y=(y-lo[1])*inv;z=(z-lo[2])*inv;
  if(x<0||x>=nx-1||y<0||y>=ny-1||z<0||z>=nz-1){out.rho=0;out.noise=.45;out.label=0;return out;}
  const ix=x|0,iy=y|0,iz=z|0,fx=x-ix,fy=y-iy,fz=z-iz,i=ix+nx*iy+stride*iz;
  let rho=0,n=0;
  for(let dz=0;dz<2;dz++)for(let dy=0;dy<2;dy++){
   const j=i+dz*stride+dy*nx,w=(dz?fz:1-fz)*(dy?fy:1-fy);
   rho+=w*(density[j]*(1-fx)+density[j+1]*fx);n+=w*(noise[j]*(1-fx)+noise[j+1]*fx);
  }
  out.rho=rho/255;out.noise=n/255;
  out.label=labels[i+(fx>.5?1:0)+(fy>.5?nx:0)+(fz>.5?stride:0)];return out;
 }
 return {meta,density,labels,sample};
}
// Analytic x/z inverse; bounded fixed-point solve only for the y coefficient.
// This uses exactly CardiacMechanics defaults and its sinus illustration.
const smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
function inverseMotion(m){
 const N=1025,low=-4,step=9/(N-1),table=new Float64Array(N*4);
 for(let i=0;i<N;i++){
  const worldY=low+i*step;let y=worldY,v=0,a=0,k=1,angle=0;
  for(let pass=0;pass<10;pass++){
   const s=smooth((y+.05)/.7),b=1-smooth((y-.55)/.9);v=(1-s)*(m.vent||0)*b;a=s*(m.atr||0)*b;
   y=-.32+(worldY+.32)/(1-.04*v-.025*a);
  }
  const s=smooth((y+.05)/.7),b=1-smooth((y-.55)/.9);v=(1-s)*(m.vent||0)*b;a=s*(m.atr||0)*b;k=1-.1*v-.06*a;angle=v*5*Math.PI/180;
  table.set([y,Math.cos(angle)/k,Math.sin(angle)/k,1/k],i*4);
 }
 return function(x,y,z,out){
  const at=clamp((y-low)/step,0,N-1.000001),i=(at|0)*4,f=at-(at|0),cs=table[i+1]*(1-f)+table[i+5]*f,sn=table[i+2]*(1-f)+table[i+6]*f;
  out[0]=.15+(x-.15)*cs-(z-.2)*sn;out[1]=table[i]*(1-f)+table[i+4]*f;out[2]=.2+(x-.15)*sn+(z-.2)*cs;return out;
 };
}
function orthogonal(p,angle=90){
 const r=angle*Math.PI/180,c=Math.cos(r),s=Math.sin(r);
 // n = u × d, therefore rotation around d sends u toward -n.
 const u=p.u.map((v,i)=>v*c-p.n[i]*s),n=p.n.map((v,i)=>v*c+p.u[i]*s);
 return {...p,u,n,origin:[...p.origin],d:[...p.d]};
}
return {decode,inverseMotion,orthogonal};
});
