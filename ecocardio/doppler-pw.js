/* Campione PW ridotto ai getti simulati nelle coordinate del modello. */
(function(root,factory) {
  if(typeof module==='object' && module.exports)module.exports=factory();
  else root.EcoPW=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  function alias(v,limite) {
    if(Math.abs(v)<=limite)return v;
    const periodo=2*limite;
    return ((v+limite)%periodo+periodo)%periodo-limite;
  }
  function campiona(getti,origine,raggio,profondita,larghezza) {
    const segnali=[];
    for(const j of getti) {
      let max=0;
      for(const frazione of [-.5,0,.5]) {
        const p=raggio.map((k,i)=>origine[i]+k*(profondita+frazione*larghezza)-j.o[i]);
        const z=p.reduce((s,x,i)=>s+x*j.d[i],0);
        if(z<0 || z>j.L)continue;
        const distanza=Math.hypot(...p.map((x,i)=>x-z*j.d[i]));
        const r=(j.w0+(j.w1-j.w0)*z/j.L)/2;
        if(r>0 && distanza<r)max=Math.max(max,1-(distanza/r)**2);
      }
      if(max>0)segnali.push(-j.v*max*raggio.reduce((s,x,i)=>s+x*j.d[i],0));
    }
    return segnali;
  }
  return {alias,campiona};
});
