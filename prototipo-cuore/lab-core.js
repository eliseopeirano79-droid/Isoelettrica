/* Parameter registry and deterministic educational cardiac mechanics. */
(function(root){
'use strict';
const Mechanics=root.CardiacMechanics||(typeof module!=='undefined'?require('../cardiac-mechanics.js'):null);
const phases=[['atrial','Sistole atriale',100],['isoC','Contrazione isovolumetrica',50],['fastE','Eiezione rapida',110],['slowE','Eiezione ridotta',140],['isoR','Rilasciamento isovolumetrico',80],['fastF','Riempimento rapido',120],['diastasis','Diastasi',200]];
const schema={};
function param(key,label,group,min,max,step,value,unit=''){schema[key]={key,label,group,min,max,step,value,unit};}
phases.forEach(([id,label,value])=>param('phase.'+id,label,'cycle',id==='atrial'?50:20,600,5,value,'ms'));
param('muscle.atrial','Accorciamento atriale','mechanics',0,.25,.005,.06,'quota');param('muscle.vent','Accorciamento ventricolare','mechanics',0,.30,.005,.10,'quota');param('muscle.long','Accorciamento longitudinale','mechanics',0,.20,.005,.04,'quota');param('muscle.twist','Torsione ventricolare','mechanics',0,20,.5,5,'°');
param('mechanics.stiffness','Rigidità elastica relativa','mechanics',.25,3,.05,1,'×');param('mechanics.damping','Smorzamento relativo','mechanics',.7,2,.05,1,'×');
param('electric.atrial','Transito negli atri','electric',10,180,5,50,'ms');param('electric.av','Permanenza nel nodo AV','electric',10,450,5,70,'ms');param('electric.his','Transito nel fascio di His','electric',5,80,5,20,'ms');param('electric.right','Transito branca destra','electric',10,180,5,35,'ms');param('electric.left','Transito branche sinistre','electric',10,180,5,35,'ms');param('electric.purkinje','Transito rete di Purkinje','electric',5,120,5,25,'ms');
param('electric.blockAV','Blocco AV completo','electric',0,1,1,0);param('electric.blockR','Blocco branca destra','electric',0,1,1,0);param('electric.blockL','Blocco branca sinistra','electric',0,1,1,0);
for(const [id,label] of [['mitral','Mitrale'],['tricuspid','Tricuspide'],['aortic','Aortica'],['pulmonary','Polmonare']]){param('valve.'+id+'.open',label+' · apertura massima','valves',.05,1,.01,1,'quota');param('valve.'+id+'.gap',label+' · difetto di coaptazione','valves',0,.75,.01,0,'quota');param('valve.'+id+'.speed',label+' · transizione','valves',5,80,5,20,'ms');}
param('botallo.patent','Dotto di Botallo pervio','anatomy',0,1,1,0);param('botallo.diameter','Diametro del dotto','anatomy',1,12,.5,4,'mm');
param('tissue.ischemia','Riduzione locale · ischemia','tissue',0,1,.01,.45,'quota');param('tissue.necrosis','Riduzione locale · necrosi','tissue',0,1,.01,1,'quota');param('tissue.fibrosis','Riduzione locale · fibrosi','tissue',0,1,.01,.7,'quota');
param('flow.speed','Velocità dei marcatori coronarici','flow',.1,3,.1,1,'×');
const defaults=()=>Object.fromEntries(Object.values(schema).map(s=>[s.key,s.value]));
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));const smooth=u=>{u=clamp(u,0,1);return u*u*(3-2*u);};
function total(p){return phases.reduce((n,[id])=>n+p['phase.'+id],0);}
function set(p,key,value){const d=schema[key];if(!Object.hasOwn(schema,key)||!d||!Number.isFinite(Number(value)))throw Error('Parametro non valido');p[key]=clamp(Number(value),d.min,d.max);if(d.min===0&&d.max===1&&d.step===1)p[key]=Math.round(p[key]);
 // Keep the P-to-QRS transit and atrial mechanical phase linked: atrial
 // mechanical delay is 40 ms. Editing either side updates its counterpart.
 if(key==='phase.atrial'){p['electric.av']=clamp(p[key]+40-p['electric.atrial']-p['electric.his'],10,450);p[key]=p['electric.atrial']+p['electric.av']+p['electric.his']-40;}
 if(/^electric\.(atrial|av|his)$/.test(key)){let a=p['electric.atrial']+p['electric.av']+p['electric.his']-40;if(a<50||a>600){p['electric.av']=clamp(p['electric.av']+clamp(a,50,600)-a,10,450);a=p['electric.atrial']+p['electric.av']+p['electric.his']-40;}p['phase.atrial']=clamp(a,50,600);}
 if(key.startsWith('valve.')&&key.endsWith('.gap'))p[key.replace('.gap','.open')]=Math.max(p[key],p[key.replace('.gap','.open')]);
 if(key.startsWith('valve.')&&key.endsWith('.open'))p[key.replace('.open','.gap')]=Math.min(p[key],p[key.replace('.open','.gap')]);
 return p;
}
function configure(cfg,p,E){const out={...cfg};if(!cfg.mode&&!cfg.av){out.rate=60000/total(p);out.sa=0;out.pr=p['electric.atrial']+p['electric.av']+p['electric.his'];}
 if(!cfg.mode&&p['electric.blockAV'])Object.assign(out,{av:'III',escape:'giunzionale',escRate:44});
 if(!cfg.mode&&p['electric.blockL'])Object.assign(out,{qrs:E.M.qrsLBBB(),via:'lbbb',T:{a:165,g:42,amp:.4}});
 else if(!cfg.mode&&p['electric.blockR'])Object.assign(out,{qrs:E.M.qrsRBBB(),via:'rbbb',T:{a:35,g:-30,amp:.3}});
 if(!cfg.mode&&p['electric.blockL']&&p['electric.blockR'])Object.assign(out,{av:'III',escape:'ventricolare',escRate:32,qrs:E.M.qrsEscapeV()});
 if(!cfg.mode){const width=(out.qrs||E.M.qrsNormal()).w;out.qrsScale=(width+Math.max(p['electric.right'],p['electric.left'])+p['electric.purkinje']-60)/width;}
 return out;
}
function sample(ev,t,cfg,p){
 const da=ev.A?t-ev.A.t:Infinity,dv=ev.V?t-ev.V.t:Infinity,baseT=total(p),rr=ev.V?.meta.rr,T=cfg.isoClinical&&Number.isFinite(rr)&&rr>0?rr:baseT,d=phases.map(([id])=>p['phase.'+id]*T/baseT);
 const silent=cfg.mode==='continuous'&&!cfg.cont,vf=cfg.cont==='vf';
 let x=dv+d[0],phase=6,u=1;
 if(!cfg.av&&Number.isFinite(dv))x=((x%T)+T)%T;
 let offset=0;for(let i=0;i<7;i++){if(x<offset+d[i]){phase=i;u=clamp((x-offset)/d[i],0,1);break;}offset+=d[i];}
 const s=smooth(u);let vent=[.08*(1-s),0,.70*s,.70+.30*s,1,1-.85*s,.15-.07*s][phase];
 let atr=(da>=40&&da<40+d[0])?Math.sin(Math.PI*(da-40)/d[0])**2:0;
 const valves={};
 for(const id of ['mitral','tricuspid','aortic','pulmonary']){
  const av=id==='mitral'||id==='tricuspid',open=av?[0,5,6].includes(phase):[2,3].includes(phase);
  let opening=open?1:0;
  if(open&&((av&&phase===5)||(!av&&phase===2)))opening=smooth(u*d[phase]/p['valve.'+id+'.speed']);
  if(open&&((av&&phase===0)||(!av&&phase===3)))opening*=smooth((1-u)*d[phase]/p['valve.'+id+'.speed']);
  valves[id]=p['valve.'+id+'.gap']+(p['valve.'+id+'.open']-p['valve.'+id+'.gap'])*opening;
 }
 if(silent||vf||!ev.V){vent=0;for(const id of Object.keys(valves))valves[id]=null;}
 if(silent||vf||cfg.cont==='af'||cfg.cont==='flutter'||cfg.atrial==='af')atr=0;
 return {da,dv,phase,u,atr,vent,fibr:vf?1:0,valves,total:T,silent};
}
function fresh(){return {format:'isoelettrica-heart-lab',version:1,params:defaults(),regions:[],occlusions:[],structures:{}};}
const colorOK=c=>typeof c==='string'&&/^#[0-9a-f]{6}$/i.test(c);
function finite(v,min,max){return typeof v==='number'&&Number.isFinite(v)&&v>=min&&v<=max;}
function vector(a,min=-5,max=5){return Array.isArray(a)&&a.length===3&&a.every(x=>finite(x,min,max));}
function parse(input){
 const o=typeof input==='string'?JSON.parse(input):input;
 if(!o||o.format!=='isoelettrica-heart-lab'||o.version!==1)throw Error('Formato della configurazione non riconosciuto');
 const result=fresh();if(!o.params||typeof o.params!=='object'||Array.isArray(o.params))throw Error('Parametri mancanti');
 for(const k of Object.keys(o.params)){const d=schema[k];if(!Object.hasOwn(schema,k)||!d||!finite(o.params[k],d.min,d.max))throw Error('Valore non valido: '+k);if(d.min===0&&d.max===1&&d.step===1&&!Number.isInteger(o.params[k]))throw Error('Selettore non valido: '+k);result.params[k]=o.params[k];}
 if(Math.abs(result.params['phase.atrial']-(result.params['electric.atrial']+result.params['electric.av']+result.params['electric.his']-40))>.01)throw Error('Tempi atriali e conduzione AV incoerenti');
 for(const id of ['mitral','tricuspid','aortic','pulmonary'])if(result.params['valve.'+id+'.gap']>result.params['valve.'+id+'.open'])throw Error('Coaptazione e apertura incoerenti');
 for(const type of ['regions','occlusions']){if(!Array.isArray(o[type])||o[type].length>(type==='regions'?32:16))throw Error('Numero di elementi non valido');}
 result.regions=o.regions.map(r=>{if(!r||!['ischemia','necrosis','fibrosis','custom'].includes(r.type)||!vector(r.center)||!finite(r.radius,.02,2)||!finite(r.strength,0,1)||!colorOK(r.color))throw Error('Regione tissutale non valida');return {type:r.type,center:[...r.center],radius:r.radius,strength:r.strength,color:r.color};});
 result.occlusions=o.occlusions.map(o=>{if(!o||typeof o.vessel!=='string'||o.vessel.length>100||!Number.isInteger(o.spline)||o.spline<0||o.spline>100||!finite(o.position,0,1)||!finite(o.severity,0,1)||!finite(o.length,.01,.8))throw Error('Ostruzione non valida');return {vessel:o.vessel,spline:o.spline,position:o.position,severity:o.severity,length:o.length};});
 if(!o.structures||typeof o.structures!=='object'||Array.isArray(o.structures)||Object.keys(o.structures).length>256)throw Error('Strutture non valide');
 for(const [key,s] of Object.entries(o.structures)){if(['__proto__','constructor','prototype'].includes(key)||key.length>150||!s||!vector(s.position,-.6,.6)||!finite(s.scale,.4,1.8)||!finite(s.opacity,0,1)||!colorOK(s.color))throw Error('Struttura non valida');result.structures[key]={position:[...s.position],scale:s.scale,opacity:s.opacity,color:s.color};}
 return result;
}
const measures=new WeakMap();
function measure(points){let lens=measures.get(points);if(!lens){lens=[0];for(let i=1;i<points.length;i++)lens.push(lens[i-1]+Math.hypot(...points[i].map((x,k)=>x-points[i-1][k])));measures.set(points,lens);}return lens;}
function pointOn(points,u){const lens=measure(points),target=clamp(u,0,1)*lens.at(-1);let low=1,high=lens.length-1;while(low<high){const mid=(low+high)>>1;if(lens[mid]<target)low=mid+1;else high=mid;}const i=low,span=lens[i]-lens[i-1],f=span?(target-lens[i-1])/span:0;const point=points[i-1].map((x,k)=>x+(points[i][k]-x)*f),tangent=points[i].map((x,k)=>(x-points[i-1][k])/(span||1));return {point,tangent,length:lens.at(-1)};}
function nearest(points,p){let best={distance:Infinity,position:0};const lens=[0];for(let i=1;i<points.length;i++)lens.push(lens.at(-1)+Math.hypot(...points[i].map((x,k)=>x-points[i-1][k])));for(let i=1;i<points.length;i++){const a=points[i-1],v=points[i].map((x,k)=>x-a[k]),l2=v.reduce((s,x)=>s+x*x,0),u=clamp(v.reduce((s,x,k)=>s+x*(p[k]-a[k]),0)/(l2||1),0,1),q=a.map((x,k)=>x+u*v[k]),dist=Math.hypot(...p.map((x,k)=>x-q[k]));if(dist<best.distance)best={distance:dist,position:(lens[i-1]+u*Math.sqrt(l2))/(lens.at(-1)||1),point:q};}return best;}
// Branch attachments inferred from adjacent source centerlines; educational only.
function coronaryTree(data){
 const names={right:'Right coronary artery',left:'Left coronary artery',lad:'Anterior interventricular artery',cx:'Circumflex artery of heart',inferior:'Right inferolateral branch of right coronary artery',septal:'Septal branches of anterior interventricular artery'};
 const branches=data.flatMap(a=>a.splines.map((points,spline)=>({vessel:a.name,spline,points,parent:null,attachment:0}))), key=b=>b.vessel+'|'+b.spline, map=new Map(branches.map(b=>[key(b),b]));
 for(const b of branches){let candidates=branches.filter(a=>a.vessel===b.vessel&&a.spline<b.spline);
  if([names.lad,names.cx].includes(b.vessel)&&b.spline===0)candidates=[map.get(names.left+'|0')];
  if(b.vessel===names.inferior&&b.spline===0)candidates=[map.get(names.right+'|0')];
  if(b.vessel===names.septal)candidates.push(...branches.filter(a=>a.vessel===names.lad));
  let best=null;for(const a of candidates.filter(Boolean)){const n=nearest(a.points,b.points[0]);if(!best||n.distance<best.distance)best={...n,parent:key(a)};}
  if(best&&best.distance<.12){b.parent=best.parent;b.attachment=best.position;}
 }return map;
}
function flowFactor(tree,vessel,spline,u,lesions){let b=tree.get(vessel+'|'+spline),factor=1;const visited=new Set();while(b&&!visited.has(b)){visited.add(b);for(const o of lesions)if(o.vessel===b.vessel&&o.spline===b.spline&&o.position<=u)factor*=1-o.severity;u=b.attachment;b=tree.get(b.parent);}return factor;}
// Same displacement as the vertex shader, used by moving flow markers.
function deformPoint(q,m,p,regions=[],region=0,t=0){return Mechanics.deform(q,m,p,regions,t);}
root.HeartLabCore={schema,phases,defaults,set,total,configure,sample,fresh,parse,pointOn,nearest,smooth,coronaryTree,flowFactor,deformPoint};if(typeof module!=='undefined'&&module.exports)module.exports=root.HeartLabCore;
})(typeof window!=='undefined'?window:{});
