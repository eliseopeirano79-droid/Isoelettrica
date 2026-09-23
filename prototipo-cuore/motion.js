/* Timing for the illustrative anatomy preview; ECG events remain authoritative. */
(function (root) {
 'use strict';
 function pulse(age,start,duration){const u=(age-start)/duration;return u>0&&u<1?Math.sin(Math.PI*u)**2:0;}
 function sample(events,t,cfg){
  const da=events.A?t-events.A.t:Infinity,dv=events.V?t-events.V.t:Infinity;
  const vf=cfg.cont==='vf',silent=cfg.mode==='continuous'&&!cfg.cont;
  return {da,dv,atr:silent||vf?0:pulse(da,25,170),vent:silent||vf?0:pulse(dv,45,330),fibr:vf?1:0};
 }
 const api={sample};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HeartPreviewMotion=api;
})(typeof window!=='undefined'?window:this);
