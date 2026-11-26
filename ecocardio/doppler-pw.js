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
  // Intervallo assiale del getto che interseca la fetta. La componente
  // normale del disco diminuisce quando il getto è ortogonale al piano.
  function interseca(j,P,spessore) {
    const rel=j.o.map((x,i)=>x-P.o[i]);
    const dist=rel.reduce((s,x,i)=>s+x*P.n[i],0);
    const cos=j.d.reduce((s,x,i)=>s+x*P.n[i],0), sen=Math.sqrt(Math.max(0,1-cos*cos));
    const r0=j.w0/2,dr=(j.w1-j.w0)/2, margine=spessore/2;
    let min=0,max=1;
    for(const segno of [1,-1]) {
      const a=segno*dist-r0*sen-margine,b=segno*j.L*cos-dr*sen;
      if(Math.abs(b)<1e-12){if(a>0)return null;continue;}
      const t=-a/b;
      if(b>0)max=Math.min(max,t);else min=Math.max(min,t);
    }
    if(min>=max)return null;
    return {min,max};
  }
  // Velocità assiale del punto materiale, in m/s. Il campo è espresso in
  // unità anatomiche, la fase è adimensionale e fc è in cicli/minuto.
  function velocitaTessuto(p,fase,fc,cm,direzione,posizione) {
    const df=.0005, prima=posizione(p,(fase+1-df)%1), dopo=posizione(p,(fase+df)%1);
    return -dopo.reduce((s,x,i)=>s+(x-prima[i])*direzione[i],0)*fc/(2*df*60*cm*100);
  }
  return {alias,campiona,interseca,velocitaTessuto};
});
