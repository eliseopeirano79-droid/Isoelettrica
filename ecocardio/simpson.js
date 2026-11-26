/* Planimetria e volumi biplani da punti in centimetri.
   La base è il segmento fra il primo e l'ultimo punto, alle inserzioni mitraliche. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.EcoSimpson=factory();
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  const cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
  function traccia(punti) {
    if(punti.length<5 || !punti.every(p=>p.length===2 && p.every(Number.isFinite)))return null;
    const n=punti.length, a=punti[0], b=punti[n-1], centro=a.map((x,i)=>(x+b[i])/2);
    let area=0, apice=centro, lungo=0;
    for(let i=0;i<n;i++) {
      const p=punti[i],q=punti[(i+1)%n];
      area+=p[0]*q[1]-p[1]*q[0];
      const r=Math.hypot(p[0]-centro[0],p[1]-centro[1]);
      if(r>lungo){lungo=r;apice=p;}
      for(let j=i+2;j<n;j++){
        if(i===0 && j===n-1)continue;
        const s=punti[j],t=punti[(j+1)%n];
        if(cross(p,q,s)*cross(p,q,t)<0 && cross(s,t,p)*cross(s,t,q)<0)return null;
      }
    }
    area=Math.abs(area/2);if(area<.05 || lungo<.2 || apice===a || apice===b)return null;
    const axis=apice.map((x,i)=>(x-centro[i])/lungo);
    const xy=punti.map(([x,y])=>[(x-centro[0])*-axis[1]+(y-centro[1])*axis[0],(x-centro[0])*axis[0]+(y-centro[1])*axis[1]]);
    const diametri=[];
    for(let i=0;i<20;i++) {
      const z=(i+.5)*lungo/20,xs=[];
      for(let j=0;j<n;j++) {
        const p=xy[j],q=xy[(j+1)%n];
        if((p[1]>z)!==(q[1]>z))xs.push(p[0]+(q[0]-p[0])*(z-p[1])/(q[1]-p[1]));
      }
      if(xs.length!==2)return null;
      diametri.push(Math.abs(xs[1]-xs[0]));
    }
    return {area,lungo,diametri};
  }
  function volume(a,b) {
    if(!a || !b)return null;
    return a.diametri.reduce((sum,d,i)=>sum+d*b.diametri[i],0)*Math.PI/4*Math.max(a.lungo,b.lungo)/20;
  }
  function collega(panel,api){
    const $=q=>panel.querySelector(q), selezione=$('#ecoSimScelta'), info=$('#ecoSimStato'), risultato=$('#ecoSimRis');
    let record={},draft=null, avviso='', caso='';
    function aggiorna() {
      const d=volume(record['a4c-d'],record['a2c-d']), s=volume(record['a4c-s'],record['a2c-s']);
      risultato.textContent=Object.entries(record).map(([k,v])=>k.toUpperCase()+' '+v.area.toFixed(1)+' cm²').join(' · ')+
        (d!==null?' · VTD '+d.toFixed(1)+' mL':'')+(s!==null?' · VTS '+s.toFixed(1)+' mL':'')+
        (d>0 && s!==null?(s<d?' · FE '+Math.round(100*(1-s/d))+'%':' · Controlla le fasi: VTS ≥ VTD'):'');
      info.textContent=avviso || (draft?'Punti inseriti: '+draft.punti.length:'');
      $('#ecoSimFine').disabled=!draft || draft.punti.length<5;$('#ecoSimIndietro').disabled=!draft?.punti.length;
    }
    function verifica() {
      const ora=api.caso();
      if(caso!==ora){record={};draft=null;caso=ora;avviso='';aggiorna();}
      if(draft && draft.id!==api.stato()){draft=null;avviso='Traccia interrotta dopo il cambio di posa o fase.';aggiorna();}
    }
    $('#ecoSimInizia').onclick=()=>{
      const [vista,f]=selezione.value.split('-');
      if(!api.prepara(vista,f==='d'?0:.34))return;
      verifica();draft={key:selezione.value,id:api.stato(),punti:[]};avviso='';aggiorna();
    };
    $('#ecoSimIndietro').onclick=()=>{if(draft){draft.punti.pop();avviso='';aggiorna();}};
    $('#ecoSimFine').onclick=()=>{
      verifica();if(!draft)return;
      const r=traccia(draft.punti);
      if(!r){avviso='Contorno non utilizzabile. Controlla apice, inserzioni e incroci.';aggiorna();return;}
      record[draft.key]=r;draft=null;avviso='Contorno acquisito.';aggiorna();
    };
    $('#ecoSimCancella').onclick=()=>{record={};draft=null;avviso='';aggiorna();};
    return {
      punto(p){verifica();if(!draft)return false;draft.punti.push(p);avviso='';aggiorna();return true;},
      attivo(){verifica();return !!draft;},
      disegna(ctx,px){verifica();if(!draft?.punti.length)return;
        ctx.save();ctx.strokeStyle='#62e5db';ctx.fillStyle='#62e5db';ctx.lineWidth=2;ctx.beginPath();
        draft.punti.forEach((p,i)=>{const [x,y]=px(p);if(!i)ctx.moveTo(x,y);else ctx.lineTo(x,y);});
        ctx.stroke();for(const p of draft.punti){const [x,y]=px(p);ctx.fillRect(x-2,y-2,4,4);}ctx.restore();}
    };
  }
  return {traccia,volume,collega};
});
