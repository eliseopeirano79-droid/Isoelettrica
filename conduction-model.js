/* Atlas-frame landmarks and read-only ECG animation plan.
 * Coordinates are an educational registration, not histological segmentation.
 * AV inputs: Li 2008 (PMC2650269). Accessory locations: ESC 2021.
 * All transit fractions below are display interpolation within ECG events, not
 * measured conduction velocities or an electrophysiological solver. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IsoConduction=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const A={sa:[-.82,.83,-.13],upper:[-.38,-.04,-.16],av:[-.28,-.24,-.09],his:[-.12,-.33,.11],bif:[.05,-.48,.23],rb:[.19,-.97,.64],laf:[.56,-.93,.31],lpf:[.43,-.92,-.18]};
const sites=[
 ['left-lateral','Laterale sinistra',[.79,-.1,-.4],[.89,-.42,-.31]],
 ['left-anterolateral','Anterolaterale sinistra',[.67,.07,-.08],[.82,-.24,.04]],
 ['left-posterolateral','Posterolaterale sinistra',[.58,-.27,-.75],[.72,-.58,-.59]],
 ['left-posterior','Posteriore sinistra',[.18,-.38,-.77],[.36,-.64,-.64]],
 ['posteroseptal','Inferoparasettale (posterosettale)',[-.43,-.45,-.38],[-.18,-.64,-.22]],
 ['right-posterior','Posteriore destra',[-.8,-.53,-.26],[-.5,-.75,-.15]],
 ['right-lateral','Laterale destra',[-.96,-.32,.25],[-.7,-.55,.45]],
 ['right-anterior','Anteriore destra',[-.74,.03,.56],[-.43,-.2,.73]],
 ['anteroseptal','Superoparasettale (anterosettale)',[-.42,.02,.18],[-.16,-.21,.39]],
 ['midseptal','Mesosettale',[-.45,-.22,.1],[-.15,-.41,.25]]
].map(([id,label,atrial,ventricular])=>Object.freeze({id,label,atrial,ventricular}));
const names={atr:'Via internodale anteriore',middle:'Via internodale media · Wenckebach',posterior:'Via internodale posteriore · Thorel',bachmann:'Fascio interatriale di Bachmann',fast:'Ingresso nodale rapido',slow:'Ingresso nodale lento',his:'Fascio di His · tratto penetrante',rb:'Branca destra · setto e banda moderatrice',laf:'Fascicolo anteriore sinistro',lpf:'Fascicolo posteriore sinistro',lsf:'Fascicolo settale sinistro',kent:'Via atrioventricolare di Kent',james:'Fibre di James · ipotesi atrionodale',flutter:'Istmo cavo-tricuspidale · circuito di flutter','ventricular-return':'Collegamento miocardico ventricolare del rientro'};
const paths=[
 {id:'atr',points:[A.sa,[-.64,.62,.10],[-.48,.24,.07],A.upper]},
 {id:'middle',points:[A.sa,[-.76,.66,-.46],[-.52,.33,-.48],[-.37,.12,-.34],A.upper]},
 {id:'posterior',points:[A.sa,[-1.00,.45,-.22],[-1.02,.03,-.28],[-.82,-.42,-.32],[-.49,-.44,-.24],A.av]},
 {id:'bachmann',points:[A.sa,[-.48,.67,-.38],[.12,.58,-.68],[.51,.27,-.7]]},
 {id:'fast',points:[A.upper,[-.3,-.06,-.16],[-.24,-.14,-.1],A.av]},
 {id:'slow',points:[A.upper,[-.56,-.25,-.3],[-.49,-.44,-.24],[-.35,-.4,-.14],A.av]},
 {id:'his',points:[A.av,[-.22,-.28,.03],A.his,A.bif]},
 {id:'rb',points:[A.bif,[.01,-.67,.34],[.08,-.85,.45],A.rb]},
 {id:'laf',points:[A.bif,[.22,-.65,.26],[.42,-.83,.3],A.laf]},
 {id:'lpf',points:[A.bif,[.16,-.61,.01],[.3,-.81,-.15],A.lpf]},
 {id:'lsf',points:[A.bif,[.19,-.6,.17],[.32,-.74,.18]]},
 {id:'delay-rb',points:[[.3,-.66,.18],[.12,-.7,.28],[.03,-.78,.46],A.rb]},
 {id:'delay-laf',points:[[.03,-.67,.4],[.2,-.69,.24],[.4,-.82,.2],A.laf]},
 {id:'delay-lpf',points:[[.03,-.67,.4],[.13,-.65,.14],[.29,-.8,-.02],A.lpf]},
 {id:'james',points:[A.upper,[-.43,-.13,-.32],[-.43,-.31,-.2],A.av]},
 {id:'flutter',points:[[-.7,-.12,.38],[-.98,-.4,.18],[-.76,-.74,-.15],[-.39,-.46,-.13],[-.42,-.17,.25],[-.7,-.12,.38]]}
];
for(const id of ['rb','laf','lpf'])for(let i=0;i<5;i++){const s=A[id],a=i/4*Math.PI,r=id==='rb'?.17:.2;paths.push({id:'pk-'+id+'-'+i,branch:id,points:[s,[s[0]+r*Math.cos(a)*.5,s[1]+.08,s[2]+r*Math.sin(a)*.5],[s[0]+r*Math.cos(a),s[1]+.2+i*.02,s[2]+r*Math.sin(a)]]});}
function site(id){return sites.find(s=>s.id===id)||sites[0];}
function kent(id){const s=site(id),a=s.atrial,b=s.ventricular;return {id:'kent',points:[a,a.map((v,i)=>v*.5+b[i]*.5),b]};}
function blocked(cfg){const id=cfg.isoScenario||'',v=cfg.via;let b=v==='rbbb'?['rb']:v==='lbbb'?['laf','lpf','lsf']:v==='lafb'?['laf']:v==='lpfb'?['lpf']:[];if(/^(bi|tri)fascicolare$/.test(id))b=['rb','laf'];return b;}
function mode(cfg){const id=cfg.isoScenario;return id==='avrtanti'?'antidromic':id==='avrt'?'orthodromic':cfg.mode==='svt'?'avnrt':cfg.via==='wpw'||id==='fapreeccitata'?'wpw':id==='lgl'&&cfg.isoJames?'james':'normal';}
function plan(clock,cfg){
 const {time:t,events:{A:a,V:v},nextQRS:n}=clock,active={},b=blocked(cfg),kind=mode(cfg);let phase='Diastole elettrica',nodeBlocked=false;
 const put=(id,u,reverse=false)=>{if(u>=0&&u<=1)active[id]={u,reverse};};
 const da=a?t-a.t:Infinity,dv=v?t-v.t:Infinity,w=v?.meta.w||94;
 const visible={kent:['wpw','orthodromic','antidromic'].includes(kind),james:kind==='james',flutter:cfg.cont==='flutter'};
 if(cfg.cont==='vf'||cfg.cont==='torsade'||cfg.mode==='continuous')return {active,blocked:b,visible,phase:cfg.cont==='vf'?'FV · attivazione disorganizzata, nessun percorso unico':cfg.cont==='torsade'?'Torsione di punta · nessun circuito anatomico univoco':'Asistolia · nessun impulso',nodeBlocked:false};
 if(['avnrt','orthodromic','antidromic'].includes(kind)&&v){
  const rr=n?n.t-v.t:clock.RR||v.meta.rr;if(rr>0&&dv>=0&&dv<rr){
   const rp=kind==='avnrt'?(cfg.rp||58):cfg.rp||130,ret=Math.min(rr*.48,rp);
   if(kind==='avnrt'){put('fast',dv/ret,true);put('slow',(dv-ret)/(rr*.9-ret));put('his',(dv-rr*.9)/(rr*.1));phase='AVNRT · discesa lenta → risalita rapida';}
   if(kind==='orthodromic'){put('ventricular-return',dv/(ret*.28));put('kent',(dv-ret*.28)/(ret*.72),true);const remaining=rr-ret;put('return',(dv-ret)/(remaining*.45));put('fast',(dv-ret-remaining*.45)/(remaining*.4));put('his',(dv-ret-remaining*.85)/(remaining*.15));phase='AVRT ortodromica · NAV/His ↓ · Kent ↑';}
   if(kind==='antidromic'){put('ventricular-return',dv/(ret*.3),true);put('his',(dv-ret*.3)/(ret*.4),true);put('fast',(dv-ret*.7)/(ret*.3),true);put('return',(dv-ret)/((rr-ret)*.55),true);put('kent',(dv-ret-(rr-ret)*.55)/((rr-ret)*.45));phase='AVRT antidromica · Kent ↓ · NAV/His ↑';}
  }
 }else if(a&&['sinus','pac','atrial'].includes(a.meta.type)){
  const pr=cfg.pr||160,atr=Math.min(90,pr*.55),linked=e=>e?.meta.type==='conducted'&&Math.abs(e.t-a.t-(e.meta.pr||pr))<5,target=linked(n)?n:linked(v)?v:null;
  put('atr',da/atr);put('middle',da/atr);put('posterior',da/atr);put('bachmann',da/atr);if(da<atr)phase='Onda P · attivazione atriale dal nodo del seno';
  if(a.meta.blocked){nodeBlocked=da>=atr&&da<Math.min(pr+160,450);if(nodeBlocked){put('fast',(da-atr)/Math.max(1,pr-atr));phase='P non condotta · '+(cfg.avBlockSite||'blocco AV');}}
  else if(target){const lead=target.t-a.t,hv=Math.min(45,lead*.3),start=atr,end=lead-hv;
   put(kind==='james'?'james':'fast',(da-start)/Math.max(1,end-start));
   if(kind==='wpw')put('kent',(da-atr)/Math.max(1,lead-atr));
   put('his',(t-(target.t-hv))/hv);if(da>=start&&da<end)phase=kind==='james'?'PR corto · schema ipotetico di James':'Transito nel nodo atrioventricolare';
  }
 }
 if(v&&dv>=0&&dv<w){
  const ectopic=v.meta.paced||['pvc','vt','escape-v'].includes(v.meta.type);
  if(!ectopic)for(const id of b)put('delay-'+id,(dv-w*.22)/(w*.78));
  if(!ectopic&&kind!=='antidromic')for(const id of ['rb','laf','lpf','lsf'])if(!b.includes(id)){put(id,dv/(w*.48));for(let i=0;i<5;i++)put('pk-'+id+'-'+i,(dv-w*.2)/(w*.65));}
  if(v.meta.type==='escape-j')put('his',dv/Math.min(30,w*.3));

  if(ectopic)phase=v.meta.paced?'Stimolazione ventricolare · origine dallo spike':v.meta.type==='escape-v'?'Scappamento ventricolare indipendente':'Attivazione ventricolare da focus / substrato aritmico';
  else if(!['avnrt','orthodromic','antidromic'].includes(kind))phase=b.length?'QRS · ramo bloccato, propagazione miocardica ritardata':'QRS · setto → branche → Purkinje';
 }
 if(cfg.cont==='flutter'&&a)put('flutter',da/(60000/(cfg.fRate||300)));
 if(cfg.av==='III'&&phase==='Diastole elettrica')phase='BAV III · atri e ventricoli indipendenti';
 if(cfg.cont==='af'&&phase==='Diastole elettrica')phase='FA · attività atriale disorganizzata';
 return {active,blocked:b,visible,phase,nodeBlocked};
}
function configure(id,cfg,params={}){
 const next={...cfg,isoScenario:id,isoKent:site(params.kentSite).id,isoJames:params.jamesModel==='james'};
 // Additional morphology data through the engine's existing qrs API. The old
 // left-lateral preset is preserved exactly; other sites are directional demos.
 if(['wpw','avrtanti','fapreeccitata'].includes(id)&&next.isoKent!==sites[0].id&&cfg.qrs?.delta){
  const p=site(next.isoKent).ventricular,d=[.3-p[0],-.7-p[1],.25-p[2]],len=Math.hypot(...d);next.qrs={...cfg.qrs,c:cfg.qrs.c.map((c,i)=>i===0?{...c,d:d.map(x=>x/len)}:{...c})};
 }
 return next;
}
return {anchors:A,paths,names,sites,site,kent,blocked,mode,plan,configure};
});
