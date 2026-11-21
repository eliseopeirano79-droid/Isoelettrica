/* Ambulatorio valvolare. I tracciati usano i profili ECG già presenti nel simulatore. */
(function (root) {
'use strict';
const casi = {
  sa: { titolo: 'Un mancamento in salita', storia: 'Uomo di 76 anni. Da sei mesi deve fermarsi camminando in salita. La settimana scorsa ha sentito venir meno le forze durante una passeggiata.', fc: 72, ecg: 'stenosi-aortica', vista: 'a5c', grado: 'severa', conclusione: 'Stenosi aortica', sintesi: 'Il soffio eiettivo cresce e decresce tra S1 e S2. È più intenso alla base destra e si trasmette alle carotidi. L’ECG del caso mostra sovraccarico ventricolare sinistro. In cinque camere puoi esplorare efflusso e valvola aortica.' },
  im: { titolo: 'Il fiato si accorcia', storia: 'Donna di 65 anni. Riferisce dispnea progressiva salendo le scale e, negli ultimi mesi, una minore tolleranza alle attività quotidiane.', fc: 80, ecg: 'insufficienza-mitralica', vista: 'a4c', grado: 'severa', conclusione: 'Insufficienza mitralica', sintesi: 'Il soffio occupa la sistole, con massimo alla punta e irradiazione ascellare sinistra nel caso simulato. L’ECG presenta segni di ingrandimento atriale sinistro. In quattro camere il Color mostra il getto sistolico diretto verso l’atrio sinistro.' }
};
const torace = {
  V1:[370,415,'IV spazio intercostale, margine sternale destro'], V2:[470,415,'IV spazio intercostale, margine sternale sinistro'],
  V3:[518,460,'A metà tra V2 e V4'], V4:[566,505,'V spazio intercostale, emiclaveare sinistra'],
  V5:[640,505,'Ascellare anteriore sinistra, alla stessa altezza di V4'], V6:[690,505,'Ascellare media sinistra, alla stessa altezza di V4']
};
const arti = {RA:'Polso destro', LA:'Polso sinistro', RL:'Caviglia destra', LL:'Caviglia sinistra'};
const sedi = Object.keys(arti).concat(Object.keys(torace));
const foci = {aorta:[370,316,'Aortico'], polm:[470,316,'Polmonare'], erb:[470,365,'Erb'], tric:[470,437,'Tricuspidale'], punta:[566,505,'Mitrale'], car:[373,82,'Carotide destra'], asc:[694,450,'Ascella sinistra']};
function vicino(x,y,tab) {
  let id=null, dist=Infinity;
  for (const [k,p] of Object.entries(tab)) {
    const d=Math.hypot(x-p[0],y-p[1]); if(d<dist){id=k;dist=d;}
  }
  return {id,dist};
}
function intensita(id,x,y) {
  const pesi=id==='sa'?[[370,316,1],[373,82,.61],[472,82,.54]]:[[566,505,1],[694,450,.62]];
  return Math.max(...pesi.map(([a,b,v])=>v*Math.exp(-((x-a)**2+(y-b)**2)/(2*85**2))));
}
function pronti(mappa){return sedi.every(k=>mappa[k]===k);}
function segnale(id,fc,frequenza) {
  const n=Math.round(frequenza*60/fc), a=new Float32Array(n), soffio=new Float32Array(n);
  const sis=Math.min(.34, .42*60/fc); let seed=31, lenta=0, rapida=0;
  function tono(t,f){return t<0||t>.14?0:Math.sin(2*Math.PI*f*t)*Math.exp(-34*t)*(1-Math.exp(-170*t));}
  for(let i=0;i<n;i++){
    const t=i/frequenza; a[i]=.64*tono(t,48)+.5*tono(t-sis,69);
    const u=t/sis; if(u>1)continue;
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;const z=seed/2147483648-1;
    lenta+=(1-Math.exp(-2*Math.PI*95/frequenza))*(z-lenta);
    rapida+=(1-Math.exp(-2*Math.PI*(id==='sa'?380:620)/frequenza))*(z-rapida);
    const inv=id==='sa'?Math.pow(Math.sin(Math.PI*Math.pow(u,1.35)),1.4):Math.min(1,u/.05,(1-u)/.06);
    soffio[i]=2.8*(rapida-lenta)*inv;
  }
  return [a,soffio];
}
function crea(host,app,esci) {
  const $=s=>host.querySelector(s);
  let id=null,c=null,pagina='',mappa={},attivo='V1',pos=foci.punta.slice(0,2),ctx=null,gain=null,registrato=false,eco=false,timer=0,visibile=true,monitor=null;
  const btn=(azione,testo)=>'<button type="button" class="btn" data-azione="'+azione+'">'+testo+'</button>';
  const punto=(el,p)=>{el.style.left=p[0]/840*100+'%';el.style.top=p[1]/700*100+'%';};
  const annuncia=t=>{$('[role=status]').textContent=t;};
  function spegni(){if(ctx){ctx.close().catch(()=>{});ctx=null;gain=null;}cancelAnimationFrame(timer);timer=0;}
  function paginaBase(k){
    spegni(); monitor=null; pagina=k;
    host.innerHTML='<button type="button" class="btn" data-azione="esci">← Casi clinici</button><h2>'+c.titolo+'</h2><p>'+c.storia+'</p>'+
      '<div class="amb-tabs" aria-label="Esami">'+[['ascolto','Auscultazione'],['ecg','ECG'],['eco','Ecocardiografia'],['referto','Conclusione']].map(([v,t])=>'<button type="button" class="btn" data-tab="'+v+'" aria-pressed="'+(v===k)+'">'+t+'</button>').join('')+'</div><section class="amb-esame"></section><p class="amb-msg" role="status" aria-live="polite"></p>';
    if(k==='ascolto')ascolto(); if(k==='ecg')ecg(); if(k==='eco')sonda(); if(k==='referto')referto();
  }
  function figura(){return '<div class="amb-fig"><span class="amb-lato">D</span><span class="amb-lato sx">S</span></div>';}
  function coord(e,el){const b=el.getBoundingClientRect();return [(e.clientX-b.left)*840/b.width,(e.clientY-b.top)*700/b.height];}
  function ascolto(){
    $('.amb-esame').innerHTML='<h3>Auscultazione</h3><p>Attiva l’audio, poi fai scorrere il fonendoscopio dalla base alla punta, al collo e all’ascella.</p>'+figura()+
      '<div class="amb-controlli">'+btn('audio','Attiva audio')+'<label>Sede <select class="amb-sedi" aria-label="Sede di auscultazione"><option value="">Esplorazione libera</option>'+Object.entries(foci).map(([k,p])=>'<option value="'+k+'">'+p[2]+'</option>').join('')+'</select></label></div><small>Toni e soffi sintetici. La posizione modifica l’intensità del soffio.</small>';
    const fig=$('.amb-fig'),disco=document.createElement('span');disco.className='amb-disco';fig.append(disco);
    function sposta(p){pos=p;punto(disco,p);if(gain)gain.gain.setTargetAtTime(intensita(id,...pos),ctx.currentTime,.025);}
    fig.onpointerdown=e=>{fig.setPointerCapture(e.pointerId);sposta(coord(e,fig));$('.amb-sedi').value='';};
    fig.onpointermove=e=>{if(fig.hasPointerCapture(e.pointerId))sposta(coord(e,fig));};
    $('.amb-sedi').onchange=e=>{if(e.target.value)sposta(foci[e.target.value].slice(0,2));};
    sposta(pos);
  }
  async function audio(){
    const b=$('[data-azione=audio]');if(ctx){spegni();b.textContent='Attiva audio';return;}
    const Audio=root.AudioContext||root.webkitAudioContext;if(!Audio){annuncia('Audio non disponibile in questo browser.');return;}
    const ac=ctx=new Audio();
    try {
      await ac.resume();if(ctx!==ac)return;
      const serie=segnale(id,c.fc,ac.sampleRate),inizio=ac.currentTime+.03;
      serie.forEach((v,i)=>{const bfr=ac.createBuffer(1,v.length,ac.sampleRate);bfr.copyToChannel(v,0);const src=ac.createBufferSource();src.buffer=bfr;src.loop=true;const g=ac.createGain();g.gain.value=i?intensita(id,...pos):.64;if(i)gain=g;src.connect(g);g.connect(ac.destination);src.start(inizio);});
      b.textContent='Ferma audio';annuncia('Auscultazione attiva · '+c.fc+' battiti/min.');
    } catch(e){if(ctx===ac){spegni();annuncia('Riproduzione audio non disponibile.');}}
  }
  function ecg(){
    $('.amb-esame').innerHTML='<h3>ECG a 12 derivazioni</h3><p>Trascina ciascun elettrodo sul torace o sull’arto. Puoi anche selezionarlo e poi toccare la sede.</p><div class="amb-palette">'+sedi.map(k=>'<button type="button" class="btn" data-el="'+k+'">'+k+'</button>').join('')+'</div>'+figura()+
      '<div class="amb-arti">'+Object.entries(arti).map(([k,v])=>'<button class="btn" data-sede="'+k+'">'+v+'</button>').join('')+'</div><details><summary>Posizionamento da tastiera e reperi</summary><div class="amb-arti">'+Object.entries(torace).map(([k,p])=>'<button class="btn" data-sede="'+k+'">'+p[2]+'</button>').join('')+'</div></details><div class="amb-controlli">'+btn('controlla','Controlla posizione')+btn('registra','Registra 10 s')+'</div><div class="amb-carta" hidden><canvas></canvas><canvas></canvas></div>';
    const fig=$('.amb-fig');
    fig.onpointerdown=e=>{const p=coord(e,fig),v=vicino(...p,torace);colloca(v.dist<27?v.id:'fuori',p);};
    host.querySelectorAll('[data-el]').forEach(b=>{
      let origine=null, presa=null;
      function rilascia(){origine=null;if(presa)presa.remove();presa=null;}
      b.onpointerdown=e=>{attivo=b.dataset.el;seleziona();origine=[e.clientX,e.clientY];b.setPointerCapture(e.pointerId);};
      b.onpointermove=e=>{
        if(!origine || Math.hypot(e.clientX-origine[0],e.clientY-origine[1])<4)return;
        if(!presa){presa=document.createElement('i');presa.className='amb-elettrodo amb-in-mano';presa.textContent=b.dataset.el;presa.setAttribute('aria-hidden','true');host.append(presa);}
        presa.style.left=e.clientX+'px';presa.style.top=e.clientY+'px';
      };
      b.onpointercancel=b.onlostpointercapture=rilascia;
      b.onpointerup=e=>{rilascia();const dst=document.elementFromPoint(e.clientX,e.clientY);if(!dst)return;const limb=dst.closest('[data-sede]');if(limb){colloca(limb.dataset.sede);return;}if(fig.contains(dst)){const p=coord(e,fig),v=vicino(...p,torace);colloca(v.dist<27?v.id:'fuori',p);}};
    });
    seleziona();mostraPunti();
    if(registrato)traccia(false);
  }
  const punti={};
  function seleziona(){host.querySelectorAll('[data-el]').forEach(b=>{b.setAttribute('aria-pressed',b.dataset.el===attivo);b.textContent=b.dataset.el+(mappa[b.dataset.el]?' •':'');});}
  function colloca(sede,p){if(timer){annuncia('Attendi la fine della registrazione.');return;}mappa[attivo]=sede;punti[attivo]=p||torace[sede];registrato=false;$('.amb-carta').hidden=true;mostraPunti();seleziona();annuncia(attivo+' applicato. '+Object.keys(mappa).length+' di 10 elettrodi.');}
  function mostraPunti(){
    const fig=$('.amb-fig');fig.querySelectorAll('i').forEach(e=>e.remove());
    for(const [k,s] of Object.entries(mappa)){if(!punti[k])continue;const e=document.createElement('i');e.textContent=k;e.className='amb-elettrodo';punto(e,punti[k]);fig.append(e);}
    host.querySelectorAll('.amb-arti [data-sede]').forEach(b=>{if(arti[b.dataset.sede]){const kk=Object.keys(mappa).filter(k=>mappa[k]===b.dataset.sede);b.textContent=arti[b.dataset.sede]+(kk.length?' · '+kk.join(', '):'');}});
  }
  function controlla(){
    const err=sedi.filter(k=>mappa[k]&&mappa[k]!==k),manc=sedi.filter(k=>!mappa[k]);
    annuncia([manc.length?'Mancano '+manc.join(', '):'',err.length?'Riposiziona '+err.join(', '):'',pronti(mappa)?'Dieci elettrodi corretti. Puoi registrare.':''].filter(Boolean).join('. '));return pronti(mappa);
  }
  function traccia(anima){
    if(anima&&!controlla()||timer)return;
    const carta=$('.amb-carta');carta.hidden=false;
    const cv=carta.querySelectorAll('canvas'),sc=app.byId[c.ecg];if(!monitor)monitor=new app.Monitor(cv[0],cv[1],{});
    const st=new app.Stream(app.configura(sc,Object.assign(app.defaultParams(sc),{hr:c.fc})),71);
    monitor.setStream(st,false);
    function fine(){monitor.t=9999;monitor.redrawAll();registrato=true;timer=0;annuncia('ECG acquisito · 12 derivazioni · 10 s · 25 mm/s · 10 mm/mV.');}
    if(!anima){fine();return;}annuncia('Registrazione in corso…');
    const inizio=performance.now();function frame(ora){if(ora-inizio>=10000){fine();return;}monitor.t=Math.max(0,ora-inizio);monitor.draw();timer=requestAnimationFrame(frame);}timer=requestAnimationFrame(frame);
  }
  function sonda(){
    $('.amb-esame').innerHTML='<h3>Ecocardiografia al letto</h3><p>Trova la proiezione '+(c.vista==='a5c'?'apicale cinque camere':'apicale quattro camere')+'. Trascina la sonda sul torace e regola ruota, ventaglio e bascula. Quando la guida indica che sei in asse, acquisisci il fotogramma.</p><iframe class="amb-eco" title="Ecocardiografo del caso"></iframe><div class="amb-controlli">'+btn('acquisisci','Acquisisci fotogramma')+'</div><img class="amb-fermo" alt="Fotogramma acquisito in asse" hidden>';
    const f=$('iframe');f.src='ambulatorio-eco.html#'+id;
    if(eco){$('.amb-fermo').src=eco;$('.amb-fermo').hidden=false;}
  }
  function referto(){
    $('.amb-esame').innerHTML='<h3>Conclusione clinica</h3><p>'+ (registrato?'ECG acquisito. ':'ECG da acquisire. ')+(eco?'Fotogramma ecografico acquisito.':'Fotogramma ecografico da acquisire.')+'</p><p>Quale lesione integra meglio storia, auscultazione e reperti strumentali?</p><div class="amb-controlli">'+btn('dx-sa','Stenosi aortica')+btn('dx-im','Insufficienza mitralica')+'</div><p class="amb-esito"></p><details><summary>Riferimenti clinici</summary><p><a href="https://doi.org/10.1016/j.echo.2018.06.004">ASE · acquisizione ecocardiografica</a> · <a href="https://pmc.ncbi.nlm.nih.gov/articles/PMC2861980/">Mayo Clinic Proceedings · semeiotica valvolare</a> · <a href="https://criticalcaretraining.ie/wp-content/uploads/2022/04/SCST_ECG_Recording_Guidelines_2017am.pdf">SCST · registrazione ECG standard</a></p></details>';
  }
  host.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
    if(b.dataset.tab){paginaBase(b.dataset.tab);return;}if(b.dataset.el){attivo=b.dataset.el;seleziona();return;}if(b.dataset.sede){colloca(b.dataset.sede);return;}
    const a=b.dataset.azione;if(a==='audio')audio();if(a==='controlla')controlla();if(a==='registra')traccia(true);
    if(a==='acquisisci'){const f=$('iframe'),es=f.contentWindow.ISO_ECO,im=es&&es.acquisisciCaso();if(!im){annuncia('Acquisizione sospesa. Controlla l’allineamento e la guida sulla sonda.');return;}eco=im;$('.amb-fermo').src=im;$('.amb-fermo').hidden=false;annuncia('Fotogramma acquisito in asse.');}
    if(a==='esci'){chiudi();esci();}
    if(a==='dx-sa'||a==='dx-im')$('.amb-esito').textContent=(a==='dx-'+id?'Corretto. ':'Rivedi i reperti. ')+c.sintesi;
  });
  function visibilitaEco(on){const f=$('iframe');if(!f)return;f.hidden=!on;if(f.contentWindow.ISO_ECO)f.contentWindow.ISO_ECO.visibilitaCaso(on);}
  function chiudi(){spegni();id=null;monitor=null;host.hidden=true;host.replaceChildren();}
  root.addEventListener('resize',()=>{if(visibile&&id&&pagina==='ecg'&&monitor)monitor.layout();});
  function sospendi(){spegni();if(pagina==='ascolto'&&$('[data-azione=audio]'))$('[data-azione=audio]').textContent='Attiva audio';if(pagina==='ecg'&&!registrato&&$('.amb-carta')){$('.amb-carta').hidden=true;annuncia('Riprendi quando sei pronto per acquisire.');}if(pagina==='eco')visibilitaEco(false);}
  document.addEventListener('visibilitychange',()=>{if(!id)return;if(document.hidden)sospendi();else if(visibile&&pagina==='eco')visibilitaEco(true);});
  return {apri(k){if(!casi[k])return;id=k;c=casi[k];mappa={};Object.keys(punti).forEach(k=>delete punti[k]);attivo='V1';eco=false;registrato=false;pos=foci.punta.slice(0,2);host.hidden=false;paginaBase('ascolto');},attivo:()=>!!id,chiudi,vista(on){visibile=on;if(!id)return;if(!on)sospendi();else if(pagina==='eco')visibilitaEco(true);}};
}
const api={crea,casi,pronti,torace,arti,viste:foci,intensita,segnale,vicino};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.ISO_AMBULATORIO=api;
})(typeof window==='undefined'?this:window);
