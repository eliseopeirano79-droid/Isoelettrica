/* Catalog and reversible previews. A localization marker is not a lesion mesh. */
(function(root){'use strict';
root.IsoPathologyUI={create(api,lab){
 const $=id=>document.getElementById(id),C=root.IsoConduction,cases=root.IsoPathologyCatalog.catalog(root.ISO_DATA.SCENARIOS),scenarios=new Map(root.ISO_DATA.SCENARIOS.map(s=>[s.id,s]));
 let current=null,params={},marker=null;const family=$('pathology-family'),choice=$('pathology-case'),search=$('pathology-search'),detail=$('pathology-detail');
 function option(value,text){const o=document.createElement('option');o.value=value;o.textContent=text;return o;}
 family.append(option('','Tutte le famiglie'));[...new Set(cases.map(c=>c.family))].sort((a,b)=>a.localeCompare(b,'it')).forEach(f=>family.append(option(f,f)));
 function filter(){const q=search.value.trim().toLocaleLowerCase('it'),rows=cases.filter(c=>(!family.value||family.value===c.family)&&(!q||(c.name+' '+c.description+' '+c.family).toLocaleLowerCase('it').includes(q)));choice.replaceChildren(option('','— scegli un quadro —'),...rows.map(c=>option(c.id,c.name)));if(rows.some(c=>c.id===current?.id))choice.value=current.id;$('pathology-count').textContent=rows.length+' quadri nel filtro · '+cases.length+' nel catalogo';}
 function clearMarker(){if(marker){api.anatomy.remove(marker);marker.geometry.dispose();marker.material.dispose();marker=null;}}
 function preview(){
  clearMarker();if(!current)return;
  if(current.scenario){lab.clearClinicalOverlay();api.setClinicalCase(current.scenario,params);api.setView('conduction');return;}
  api.clearClinicalCase();let overlay={};
  if(current.preview==='duct')overlay={'botallo.patent':1,'botallo.diameter':params.diameter??4};
  if(current.preview==='valve-stenosis')overlay['valve.'+current.valve+'.open']=params.open??.35;
  if(current.preview==='valve-regurgitation')overlay['valve.'+current.valve+'.gap']=params.gap??.3;
  lab.clinicalOverlay(overlay);api.setView(current.preview.startsWith('valve')?'valves':current.preview==='duct'?'surface':'section');
  const target=api.meshes.find(m=>m.userData.sourceName===current.target);if(!target)return;
  // An explicit location halo, not a fake hole, shunt or malformed geometry.
  api.selectPart(target);
  if(current.preview==='localization'){
   target.geometry.computeBoundingSphere();const p=target.geometry.boundingSphere.center.clone().applyMatrix4(target.matrixWorld);
   marker=new api.T.Mesh(new api.T.SphereGeometry(.12,16,12),new api.T.MeshBasicMaterial({color:'#be668b',transparent:true,opacity:.65,wireframe:true,depthTest:false}));marker.position.copy(p);marker.renderOrder=8;api.anatomy.add(marker);
  }
 }
 function line(text,tag='p',cls){const p=document.createElement(tag);p.textContent=text;if(cls)p.className=cls;detail.append(p);return p;}
 function selectControl(label,key,options,value){const l=document.createElement('label');l.textContent=label;const s=document.createElement('select');s.setAttribute('aria-label',label);options.forEach(([v,t])=>s.append(option(v,t)));s.value=value;s.onchange=()=>{params[key]=s.value;preview();};l.append(s);detail.append(l);}
 function numberControl(label,key,value,min,max,step,unit=''){const l=document.createElement('label');l.textContent=label;const r=document.createElement('input'),n=document.createElement('input');r.type='range';n.type='number';for(const el of [r,n]){el.min=min;el.max=max;el.step=step;el.value=value;el.setAttribute('aria-label',label+(el===n?' · valore':' · cursore'));}const update=(from,to)=>{if(!from.validity.valid||from.value==='')return;const v=+from.value;if(params[key]===v)return;params[key]=v;to.value=v;preview();};r.oninput=()=>update(r,n);n.oninput=n.onchange=()=>update(n,r);l.append(n,document.createTextNode(unit),r);detail.append(l);}
 function render(){detail.replaceChildren();if(!current){line('Scegli un quadro per vedere il meccanismo disponibile.');return;}
  line(current.name,'h3');line({ecg:'ECG e conduzione sincronizzati',localization:'Localizzazione · geometria patologica da sviluppare',duct:'Dotto pervio · calibro modificabile','valve-stenosis':'Lembi animati · apertura limitata','valve-regurgitation':'Lembi animati · coaptazione incompleta'}[current.preview],'span','pathology-status');line(current.description);
  if(current.preview==='localization')line('L’alone indica la sede sul cuore di riferimento. Non riproduce ancora la malformazione né i suoi flussi.','p','pathology-limit');
  if(current.scenario){const sc=scenarios.get(current.scenario);for(const p of sc.params){if(p.type==='select')selectControl(p.label,p.k,p.opts,params[p.k]);else numberControl(p.label,p.k,params[p.k],p.min,p.max,p.step,p.unit||'');}
   if(['wpw','avrt','avrtanti','fapreeccitata'].includes(sc.id)){selectControl('Sede della via di Kent','kentSite',C.sites.map(s=>[s.id,s.label]),params.kentSite||'left-lateral');line('Le varianti ECG per sede sono qualitative; non usare il modello per localizzare clinicamente una via.','p','pathology-limit');}
   if(sc.id==='lgl')selectControl('Meccanismo illustrativo','jamesModel',[['nodal','Conduzione nodale accelerata'],['james','Fibre di James · ipotesi atrionodale']],params.jamesModel||'nodal');
   const zoom=document.createElement('button');zoom.textContent='Ingrandisci il circuito';zoom.onclick=()=>api.focusConduction();detail.append(zoom);
   const open=document.createElement('button');open.textContent='Apri questo caso nei Tracciati';open.onclick=()=>{if(parent!==window)parent.postMessage({type:'iso-lab-scenario',id:sc.id,params},location.origin);else location.href='../?scenario='+encodeURIComponent(sc.id);};detail.append(open);
   line('Rapida: azzurro · Lenta: arancio · Kent: viola. Nei quadri senza un circuito specifico disponibile si osservano gli eventi elettrici del caso; non viene inventata una lesione anatomica.','p','pathology-limit');
  }
  if(current.preview==='duct')numberControl('Diametro del dotto','diameter',params.diameter??4,1,12,.5,'mm');
  if(current.preview==='valve-stenosis')numberControl('Apertura relativa dei lembi','open',params.open??.35,.1,1,.05);
  if(current.preview==='valve-regurgitation')numberControl('Apertura residua in chiusura','gap',params.gap??.3,0,.8,.05);
  if(current.source){const a=document.createElement('a');a.href=current.source;a.textContent='Riferimento della famiglia ↗';a.target='_blank';a.rel='noopener';detail.append(a);}
 }
 function choose(){current=cases.find(c=>c.id===choice.value)||null;params=current?.scenario?Object.fromEntries(scenarios.get(current.scenario).params.map(p=>[p.k,p.def])):{};if(!current){reset();return;}render();preview();}
 function reset(){current=null;params={};choice.value='';clearMarker();lab.clearClinicalOverlay();api.clearClinicalCase();api.setView('surface');api.selectPart(null);render();}
 family.onchange=filter;search.oninput=filter;choice.onchange=choose;$('pathology-reset').onclick=reset;document.addEventListener('iso-atlas-loaded',()=>{if(current)preview();});filter();render();
}};
})(window);
