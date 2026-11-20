/* GLSL originale. Le superfici macroscopiche sono ancora sezioni Canvas: F1 in corso. */
(function(root){
'use strict';
const vert = `#version 300 es
precision highp float;
out vec2 uv;
void main(){ vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2)); uv=p; gl_Position=vec4(p*2.-1.,0.,1.); }`;
const frag = `#version 300 es
precision highp float;
precision highp sampler3D;
in vec2 uv;
out vec4 colore;
uniform sampler2D macro;
uniform sampler3D diffusori;
uniform vec2 dimensioni, origine;
uniform float scala, prof, cm, contr, gammaDb, gain, focus, frequenza, alpha, riverbero;
uniform vec3 sonda, asseU, asseD, asseN, centro, asse, territorio;
uniform vec4 geom; // L, Rm, dilatazione, acinesia
uniform float tgcA[8];
vec3 deforma(vec3 p){
 vec3 w=p-centro; float z=dot(w,asse),rho=length(w-z*asse),L=geom.x;
 vec3 r=w-z*asse; float R=0.,z0=.06*L;
 if(z>z0&&z<=L){float t=(L-z)/(L-z0);R=geom.y*sqrt(max(0.,1.-.9*t*t));}
 else if(z>L)R=geom.y*max(0.,1.-(z-L)/(.22*L));
 float reg=1.;if(geom.w>0.&&rho>1e-6){float co=dot(r,territorio)/rho;float v=max(z<.32*L?1.:0.,clamp((co-.15)/.3,0.,1.));reg=1.-geom.w*v*1.12;}
 float k=.52*contr*reg,f=1.;if(rho>1e-6&&R>0.)f=rho<R?sqrt(max(.05,1.-k)):sqrt(max(rho*rho-k*R*R,0.))/rho;
 if(geom.z!=0.&&R>0.&&z>0.&&z<1.08*L){float v=rho<1.2*R?1.:max(0.,1.-(rho-1.2*R)/(.5*R));f*=1.+geom.z*v;}
 float m=.13*contr,zz=z<=L?z*(1.-m*max(0.,z)/L):z-m*L*max(0.,1.-(z-L)/(.9*L));
 if(geom.z!=0.)zz-=.18*geom.z*L*max(0.,1.-z/L);
 return centro+zz*asse+r*f;
}
vec2 segnale(vec2 pixel){
 float a=texture(macro,pixel/dimensioni).r;
 if(a<.002)return vec2(0.);
 vec3 p=sonda+asseU*((pixel.x-origine.x)/scala)+asseD*((pixel.y-origine.y)/scala),X=p;
 for(int i=0;i<16;i++)X-=.85*(deforma(X)-p);
 vec3 coord=(X/(cm*.12)+vec3(.5))/64.;
 vec2 n=texture(diffusori,coord).rg*2.-1.;
 return pow(a,1.4)*n*2.;
}
void main(){
 vec2 pixel=vec2(uv.x,1.-uv.y)*dimensioni,delta=pixel-origine;
 float r=length(delta),z=r/(scala*cm),ang=atan(delta.x,delta.y);
 if(delta.y<0.||r>prof*scala||abs(ang)>.7853981634){colore=vec4(0.,0.,0.,1.);return;}
 vec2 d=normalize(delta),u=vec2(d.y,-d.x),sum=vec2(0.);float total=0.;
 float larg=clamp(1.+abs(z-focus)*.12,1.,3.);
 for(int k=-1;k<=1;k++)for(int j=-1;j<=1;j++){
  float w=(k==0?2.:1.)*(j==0?2.:1.);sum+=w*segnale(pixel+d*float(k)+u*float(j)*larg);total+=w;
 }
 float amp=length(sum/total),loss=2.*alpha*frequenza*z;
 float zz=clamp(z/(prof/cm),0.,1.)*7.;int i=int(floor(zz));float tc=mix(tgcA[i],tgcA[min(i+1,7)],fract(zz));
 float v=amp<=0.?0.:clamp(1.+(20.*log(max(amp,1e-8)/2.)/log(10.)+gain-.2*loss+tc)/gammaDb,0.,1.);
 v+=riverbero*.035*exp(-z/2.)*pow(.5+.5*cos(z*22.),6.);
 colore=vec4(vec3(clamp(v,0.,1.)),1.);
}`;
const api={vert,frag};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ISO_ECO_BMODE_SHADERS=api;
})(typeof self!=='undefined'?self:this);
