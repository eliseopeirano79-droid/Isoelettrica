/* Coupled, reduced-order elastic mechanics for the educational atlas.
 * Not a pressure/volume solver or a calibrated finite-element heart.
 * Numerical stiffness, mass, damping and geometric constraints are display
 * parameters. ECG time is read-only. Constraint projection: Müller et al. 2007.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardiacMechanics=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x)),smooth=x=>{x=clamp(x,0,1);return x*x*(3-2*x);};
const defaults={'muscle.atrial':.06,'muscle.vent':.1,'muscle.long':.04,'muscle.twist':5,'mechanics.stiffness':1,'mechanics.damping':1};
const STEP=4,KEYS=['atr','vent','mitral','tricuspid','aortic','pulmonary'];
// Backward-Euler mass-spring step: finite at any dt; forces retain velocity.
function spring(x,v,target,dt,omega,damping=1){const k=omega*omega,c=2*damping*omega,v1=(v+dt*k*(target-x))/(1+dt*c+dt*dt*k);return {x:x+dt*v1,v:v1};}
function createDynamics(){let at=null,state=null,signature=null;
 function values(m){return [m.atr||0,m.vent||0,...KEYS.slice(2).map(k=>m.valves?.[k]??0)];}
 function initial(m){return values(m).map(x=>({x,v:0}));}
 function advance(s,m,p,dt){const target=values(m);return s.map((q,i)=>{
   const speed=i<2?24:(p['valve.'+KEYS[i]+'.speed']||20),omega=(i<2?1000/speed:3000/speed)*Math.sqrt(p['mechanics.stiffness']||1);
   const r=spring(q.x,q.v,target[i],dt/1000,omega,p['mechanics.damping']||1);
   const lo=i<2?0:(p['valve.'+KEYS[i]+'.gap']||0),hi=i<2?1:(p['valve.'+KEYS[i]+'.open']??1);
   // Contact stops: coaptation at the lower limit, annular opening at the upper.
   if(r.x<lo||r.x>hi){r.x=clamp(r.x,lo,hi);r.v=0;}
   if((m.silent||m.fibr)&&i>=2){r.x=0;r.v=0;}
   return r;
  });}
 return {reset(){at=null;state=null;signature=null;},sample(t,target,p=defaults,revision=''){
   const key=revision+'|'+JSON.stringify(p),end=Math.floor(t/STEP)*STEP;
   if(!state||key!==signature||t<at||end-at>1000){at=Math.floor((t-1600)/STEP)*STEP;state=initial(target(at));signature=key;}
   while(at<end){at+=STEP;state=advance(state,target(at),p,STEP);}
   const m=target(t),s=t>at?advance(state,m,p,t-at):state;
   return {...m,atr:s[0].x,vent:s[1].x,valves:Object.fromEntries(KEYS.slice(2).map((k,i)=>[k,m.valves?.[k]===null?null:s[i+2].x])),elastic:{energy:s.reduce((sum,q)=>sum+q.v*q.v,0),step:STEP}};
 }};
}
// Damage suppresses active shortening but adjacent tissue still tethers the
// region. Smooth strain spread avoids a tiny painted spot tearing the surface.
function loss(q,p,regions=[]){let sum=0,weight=0;for(const r of regions){const radius=Math.max(1.4,r.radius),d=Math.hypot(...q.map((v,i)=>v-r.center[i]))/radius,w=1-smooth(d),a=w*w*r.strength*(p['tissue.'+r.type]||0);sum+=a**4;weight+=a**3;}return 1/(1+1.5*sum/Math.max(1e-8,weight));}
function deform(q,m,p=defaults,regions=[],t=0){
 const [x,y,z]=q,a=smooth((y+.05)/.7),base=1-smooth((y-.55)/.9),v=(1-a)*(m.vent||0)*base*loss(q,p,regions),at=a*(m.atr||0)*base;
 const dx=x-.15,dy=y+.32,dz=z-.2,angle=v*(p['muscle.twist']??5)*Math.PI/180,cs=Math.cos(angle),sn=Math.sin(angle),k=1-(p['muscle.vent']??.1)*v-(p['muscle.atrial']??.06)*at;
 const out=[.15+(cs*dx+sn*dz)*k,-.32+dy*(1-(p['muscle.long']??.04)*v-.025*at),.2+(-sn*dx+cs*dz)*k];
 out[0]+=(m.fibr||0)*.009*base*Math.sin(t*.032+y*9);out[2]+=(m.fibr||0)*.007*base*Math.sin(t*.047+x*11);return out;
}
function normal(q,n,m,p,regions=[],t=0){const e=.0005,seed=Math.abs(n[1])<.85?[0,1,0]:[1,0,0],cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],unit=a=>{const l=Math.hypot(...a)||1;return a.map(v=>v/l);};const a=unit(cross(seed,n)),b=cross(n,a),der=d=>{const hi=deform(q.map((v,i)=>v+d[i]*e),m,p,regions,t),lo=deform(q.map((v,i)=>v-d[i]*e),m,p,regions,t);return hi.map((v,i)=>v-lo[i]);};return unit(cross(der(a),der(b)));}
const glsl=`
uniform float uAmpA,uAmpV,uLong,uTwist,uAtr,uVent,uFibr,uTime;
float cardiacLoss(vec3 p){return 1.0;}
vec3 cardiacInput(vec3 p){return p;}
vec3 cardiacMotion(vec3 rest){
 vec3 p=cardiacInput(rest);float a=smoothstep(-.05,.65,p.y),base=1.0-smoothstep(.55,1.45,p.y);
 float v=(1.0-a)*uVent*base*cardiacLoss(p),at=a*uAtr*base;
 vec3 d=p-vec3(.15,-.32,.2);float angle=v*uTwist,cs=cos(angle),sn=sin(angle);
 d.xz=mat2(cs,-sn,sn,cs)*d.xz;d.xz*=1.0-uAmpV*v-uAmpA*at;d.y*=1.0-uLong*v-.025*at;
 vec3 outp=vec3(.15,-.32,.2)+d;
 outp.x+=uFibr*.009*base*sin(uTime*.032+p.y*9.0);
 outp.z+=uFibr*.007*base*sin(uTime*.047+p.x*11.0);return outp;
}
vec3 cardiacNormal(vec3 p,vec3 n){
 vec3 seed=abs(n.y)<.85?vec3(0,1,0):vec3(1,0,0);vec3 a=normalize(cross(seed,n)),b=cross(n,a);
 vec3 da=cardiacMotion(p+a*.0005)-cardiacMotion(p-a*.0005),db=cardiacMotion(p+b*.0005)-cardiacMotion(p-b*.0005);
 return normalize(cross(da,db));
}
`;
function shader(s,uniforms){Object.assign(s.uniforms,uniforms);s.vertexShader=glsl+'\n'+s.vertexShader;s.vertexShader=s.vertexShader.replace('#include <begin_vertex>','vec3 transformed = cardiacMotion(position);').replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nobjectNormal = cardiacNormal(position, objectNormal);');}
// Clamp the free edge against an inextensible chord and the ventricular side
// of the annulus. This is a point constraint, not a full leaflet collision solver.
function tether(point,papillary,maxLength,center,n,side=-1){let q=[...point];for(let pass=0;pass<12;pass++){const d=q.map((v,i)=>v-papillary[i]),len=Math.hypot(...d);if(len>maxLength)q=papillary.map((v,i)=>v+d[i]*maxLength/len);const h=q.reduce((s,v,i)=>s+(v-center[i])*n[i],0);if(h*side<0)q=q.map((v,i)=>v-h*n[i]);}return q;}
return {defaults,STEP,spring,createDynamics,loss,deform,normal,glsl,shader,tether};
});
