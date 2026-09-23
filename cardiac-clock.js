/* Read-only adapter to existing engine events. No timers, no synthesized beats,
   no reference to engine mutators. Call after the owner has advanced the stream. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.CardiacClock=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const finite=x=>Number.isFinite(x)?x:null;
function event(e){if(!e)return null;const meta={};for(const [k,v]of Object.entries(e.meta||{}))if(v===null||['string','number','boolean','undefined'].includes(typeof v))meta[k]=v;return Object.freeze({t:e.t,kind:e.kind,meta:Object.freeze(meta)});}
function read(stream,t,cfg=stream?.cfg||{}){
 if(!Number.isFinite(t))throw TypeError('Tempo ECG non valido');
 const list=Array.isArray(stream?.ev)?stream.ev:[];let a=null,v=null,priorV=null,nextV=null;
 for(let i=list.length-1;i>=0;i--){const e=list[i];if(e.t>t){if(e.kind==='V')nextV=e;continue;}if(!a&&e.kind==='A')a=e;if(e.kind==='V'){if(!v)v=e;else if(!priorV)priorV=e;}if(a&&priorV)break;}
 const A=event(a),V=event(v),N=event(nextV),rr=V&&priorV?finite(V.t-priorV.t):finite(V?.meta.rr),qt=finite(V?.meta.qt),qrs=finite(V?.meta.w);
 const rhythm=cfg.cont||cfg.av||cfg.mode||'sinus';
 return Object.freeze({time:t,rhythm,events:Object.freeze({A,V}),nextQRS:N,onsetP:A?.t??null,onsetQRS:V?.t??null,endT:V&&qt!==null?V.t+qt:null,RR:rr,
  PR:V?.meta.type==='conducted'?finite(V.meta.pr):null,QRS:qrs,sinceP:A?t-A.t:null,sinceQRS:V?t-V.t:null,
  cycle:V&&rr>0?Object.freeze({elapsed:t-V.t,duration:rr,fraction:(t-V.t)/rr}):null,
  organized:!!V&&!['vf','torsade'].includes(cfg.cont)&&!(cfg.mode==='continuous'&&!cfg.cont),estimated:!!V?.meta.estimated});
}
return Object.freeze({read});
});
