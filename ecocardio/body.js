(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.EchoBody=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
function decode(buffer){
 const u=new Uint8Array(buffer),dv=new DataView(buffer);
 if(String.fromCharCode(...u.subarray(0,4))!=='EBOD')throw Error('Torace non valido');
 const n=dv.getUint32(4,true),meta=JSON.parse(new TextDecoder().decode(u.subarray(8,n+8)));let at=8+n;
 const floats=count=>{const a=new Float32Array(buffer.slice(at,at+count*4));at+=count*4;return a;};
 const indices=count=>{const a=new Uint16Array(buffer.slice(at,at+count*2));at+=count*2;return a;};
 const positions=floats(meta.vertices*3),skin=indices(meta.skin_indices),hair=indices(meta.hair_indices),eyes=indices(meta.eye_indices);
 const sf=meta.surface,[nx,ny]=sf.dims,height=floats(nx*ny),valid=new Uint8Array(buffer.slice(at,at+nx*ny));
 function point(x,y){
  const fx=(x-sf.min[0])/sf.step,fy=(y-sf.min[1])/sf.step;
  if(fx<0||fy<0||fx>=nx-1||fy>=ny-1)return null;
  const ix=fx|0,iy=fy|0,dx=fx-ix,dy=fy-iy,k=ix+iy*nx;
  if(!valid[k]||!valid[k+1]||!valid[k+nx]||!valid[k+nx+1])return null;
  const z=(height[k]*(1-dx)+height[k+1]*dx)*(1-dy)+(height[k+nx]*(1-dx)+height[k+nx+1]*dx)*dy;
  const zx=((height[k+1]-height[k])*(1-dy)+(height[k+nx+1]-height[k+nx])*dy)/sf.step;
  const zy=((height[k+nx]-height[k])*(1-dx)+(height[k+nx+1]-height[k+1])*dx)/sf.step,l=Math.hypot(zx,zy,1);
  return {position:[x,y,z+.015],normal:[-zx/l,-zy/l,1/l]};
 }
 return {meta,positions,skin,hair,eyes,surface:{point}};
}
return {decode};
});
