/* B-mode appearance from volume samples. This is an illustrative image-formation
 * approximation, not acoustic propagation, calibrated attenuation or diagnosis.
 * Gain/TGC/contrast/focus are relative display controls, never measured dB/MHz.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./volume.js'));else root.EchoImaging=factory(root.EchoVolume);})(typeof window!=='undefined'?window:globalThis,function(V){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const defaults=Object.freeze({gain:52,contrast:52,focus:58,tgcNear:0,tgcMid:0,tgcFar:0,sector:86});
function chart(w,h,p){const top=30,bottom=h-32,scale=Math.min((bottom-top)/p.depth,(w-44)/(2*p.depth*Math.sin(p.halfAngle)));return {x:w/2,y:top+Math.max(0,bottom-top-p.depth*scale)/2,scale};}
function create(volume){
 const definitions=volume.meta.structures,colors=[[0,0,0],...definitions.map(d=>{const s=d.color?.replace('#','')||'b8c6bd';return [0,2,4].map(i=>parseInt(s.slice(i,i+2),16));})];
 const a={},b={},q=[0,0,0],q2=[0,0,0];
 function point(world,p,inverse,opts,depth,out={}){
  inverse(world[0],world[1],world[2],q);volume.sample(q[0],q[1],q[2],a);
  inverse(world[0]+p.d[0]*.022,world[1]+p.d[1]*.022,world[2]+p.d[2]*.022,q2);volume.sample(q2[0],q2[1],q2[2],b);
  const edge=Math.min(1,Math.abs(a.rho-b.rho)*3.0),scatter=Math.pow(clamp(a.noise*1.8-.35,0,1),1.3);
  const f=depth/p.depth,tgc=f<.5?opts.tgcNear*(1-f*2)+opts.tgcMid*f*2:opts.tgcMid*(2-f*2)+opts.tgcFar*(f*2-1);
  const gain=Math.pow(2,(opts.gain-52+tgc*.65)/26),attenuation=Math.exp(-f*.72),focus=.79+.21*Math.exp(-Math.pow((f-opts.focus/100)*4,2));
  let intensity=((a.rho*.66+edge*.48)*(.28+scatter*1.38)+(.01+Math.max(0,scatter-.46)*.095)*(1-a.rho))*attenuation*gain*focus;
  intensity=Math.pow(clamp(intensity,0,1),.65+(opts.contrast/100)*1.1);
  out.rho=a.rho;out.label=a.label;out.gray=clamp(Math.round(intensity*255),0,255);out.noise=scatter;return out;
 }
 function render(p,m,options={},width=400,height=360){
  const opts={...defaults,...options},inverse=V.inverseMotion(m),ch=chart(width,height,p),pixels=new Uint8ClampedArray(width*height*4),labels=new Uint8Array(width*height),world=[0,0,0],s={},counts=new Uint32Array(definitions.length+1);
  const rowStep=p.d.map(x=>x/ch.scale),colStep=p.u.map(x=>x/ch.scale),start=p.origin.map((v,i)=>v-colStep[i]*ch.x-rowStep[i]*ch.y),tan=Math.tan(p.halfAngle),depth2=p.depth*p.depth;
  for(let y=0;y<height;y++){
   const yy=(y-ch.y)/ch.scale; if(yy<0)continue;
   for(let x=0;x<width;x++){
    const xx=(x-ch.x)/ch.scale,at=x+y*width,k=at*4;
    pixels[k+3]=255;
    if(Math.abs(xx)>yy*tan||xx*xx+yy*yy>depth2)continue;
    world[0]=start[0]+colStep[0]*x+rowStep[0]*y;world[1]=start[1]+colStep[1]*x+rowStep[1]*y;world[2]=start[2]+colStep[2]*x+rowStep[2]*y;
    point(world,p,inverse,opts,Math.hypot(xx,yy),s);
    labels[at]=s.rho>.13?s.label:0;if(labels[at])counts[labels[at]]++;
    const color=colors[s.label]||[190,200,195];
    if(opts.mode==='anatomy'){
     const glow=.42+s.noise*.28;for(let c=0;c<3;c++)pixels[k+c]=Math.round(8+s.rho*color[c]*glow);
     if(s.rho>.03&&s.rho<.9)for(let c=0;c<3;c++)pixels[k+c]=Math.min(255,pixels[k+c]+s.rho*(1-s.rho)*color[c]*2);
    }else pixels[k]=pixels[k+1]=pixels[k+2]=s.gray;
    if(opts.selected&&s.label===opts.selected&&s.rho>.13){pixels[k]=Math.round(pixels[k]*.55+55);pixels[k+1]=Math.round(pixels[k+1]*.65+95);pixels[k+2]=Math.round(pixels[k+2]*.65+80);}
   }
  }
  return {pixels,labels,width,height,chart:ch,counts,pose:p,motion:{...m}};
 }
 function line(p,m,options,angle,count=240){
  const opts={...defaults,...options},inverse=V.inverseMotion(m),r=angle*Math.PI/180,d=p.d.map((v,i)=>v*Math.cos(r)+p.u[i]*Math.sin(r)),world=[0,0,0],s={},out=new Uint8Array(count);
  for(let i=0;i<count;i++){const depth=i/(count-1)*p.depth;for(let j=0;j<3;j++)world[j]=p.origin[j]+d[j]*depth;point(world,p,inverse,opts,depth,s);out[i]=s.gray;}
  return out;
 }
 return {render,line,definitions,volume};
}
return {defaults,chart,create};
});
