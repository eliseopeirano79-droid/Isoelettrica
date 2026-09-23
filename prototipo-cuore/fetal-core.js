/* Topological circulation model. Flows are relative, not patient predictions. */
(function(root){'use strict';
const defaults={fo:.45,dv:.30,da:1,pvr:8,placenta:.35,upper:.45,direction:1,extraction:.17,oxygenation:0,speed:1,coronary:.04,hepatic:.08,splanchnic:.25};
const presets={fetal:{...defaults},transition:{...defaults,fo:.15,dv:.12,da:.5,pvr:2,placenta:.1,oxygenation:.6},neonatal:{...defaults,fo:0,dv:0,da:0,pvr:1,placenta:0,oxygenation:1,direction:-1},pda:{...defaults,fo:0,dv:0,da:.8,pvr:1,placenta:0,oxygenation:1,direction:-1}};
const nodes=['placenta','uv','liver','ivc','ra','rv','pa','lungs','la','lv','aorta','descending','upper','svc','lower','uaR','uaL','myocardium','gut'];
const edge=(id,from,to,weight)=>({id,from,to,weight});
function graph(p){
 const pulmonary=1/Math.max(.1,p.pvr),duct=Math.max(0,p.da),rightToLeft=p.direction>0,plac=Math.max(0,Math.min(.8,p.placenta)),fo=Math.max(0,Math.min(.9,p.fo)),dv=Math.max(0,Math.min(1,p.dv));
 const out=[edge('uv','placenta','uv',1),edge('dv','uv','ivc',dv),edge('hepatic','uv','liver',1-dv),edge('hepaticReturn','liver','ivc',1),edge('ivc','ivc','ra',1),edge('fo','ra','la',fo),edge('tricuspid','ra','rv',1-fo),edge('pulmonaryValve','rv','pa',1),edge('pulmonary','pa','lungs',rightToLeft?pulmonary/(pulmonary+duct||1):1),edge('pulmonaryVeins','lungs','la',1),edge('mitral','la','lv',1),edge('aorticValve','lv','aorta',1),edge('upper','aorta','upper',(1-p.coronary)*p.upper),edge('arch','aorta','descending',(1-p.coronary)*(1-p.upper)),edge('svc','upper','svc',1),edge('svcRA','svc','ra',1),edge('lower','descending','lower',(1-plac)*(1-p.hepatic-p.splanchnic)),edge('lowerReturn','lower','ivc',1),edge('uaR','descending','uaR',plac/2),edge('uaL','descending','uaL',plac/2),edge('placentaR','uaR','placenta',1),edge('placentaL','uaL','placenta',1)];
 out.push(edge('coronary','aorta','myocardium',p.coronary),edge('coronaryReturn','myocardium','ra',1),edge('hepaticArtery','descending','liver',(1-plac)*p.hepatic),edge('mesenteric','descending','gut',(1-plac)*p.splanchnic),edge('portal','gut','liver',1));
 if(rightToLeft)out.push(edge('da','pa','descending',duct/(pulmonary+duct||1)));
 else {const shunt=duct/(2+duct);for(const e of out)if(e.from==='descending')e.weight*=1-shunt;out.push(edge('da','descending','pa',shunt));}
 return out;
}
function solve(params){const p={...defaults,...params},edges=graph(p);let mass=Object.fromEntries(nodes.map(n=>[n,1/nodes.length]));
 // A lazy transition matrix converges even when all open paths are cyclic.
 for(let it=0;it<2000;it++){const next=Object.fromEntries(nodes.map(n=>[n,mass[n]*.5]));for(const e of edges)next[e.to]+=mass[e.from]*e.weight*.5;const change=nodes.reduce((s,n)=>s+Math.abs(next[n]-mass[n]),0);mass=next;if(change<1e-12)break;}
 const pump=mass.rv+mass.lv,scale=100/(pump||1);for(const e of edges)e.flow=mass[e.from]*e.weight*scale;
 let oxygen=Object.fromEntries(nodes.map(n=>[n,.5]));
 for(let it=0;it<300;it++){const next={...oxygen};for(const n of nodes){const incoming=edges.filter(e=>e.to===n),flow=incoming.reduce((s,e)=>s+e.flow,0);let v=flow?incoming.reduce((s,e)=>s+e.flow*oxygen[e.from],0)/flow:0;if(n==='placenta')v=.85;if(n==='lungs')v=v*(1-p.oxygenation)+.98*p.oxygenation;if(['upper','lower','liver','myocardium','gut'].includes(n))v=Math.max(.05,v-p.extraction);next[n]=v;}oxygen=next;}
 return {edges,oxygen,mass:Object.fromEntries(nodes.map(n=>[n,mass[n]*scale])),balance:Object.fromEntries(nodes.map(n=>[n,edges.filter(e=>e.to===n).reduce((s,e)=>s+e.flow,0)-edges.filter(e=>e.from===n).reduce((s,e)=>s+e.flow,0)]))};
}
function parse(raw){const data=typeof raw==='string'?JSON.parse(raw):raw;if(data?.format!=='isoelettrica-fetal-lab'||data.version!==1)throw Error('Formato fetale non riconosciuto');if(!data.params||typeof data.params!=='object'||Array.isArray(data.params))throw Error('Parametri mancanti');const p={...defaults};for(const [k,v] of Object.entries(data.params||{})){if(!Object.hasOwn(defaults,k)||typeof v!=='number'||!Number.isFinite(v))throw Error('Parametro non valido');const limits={fo:[0,.9],dv:[0,1],da:[0,1],pvr:[.1,20],placenta:[0,.8],upper:[.1,.9],direction:[-1,1],extraction:[0,.4],oxygenation:[0,1],speed:[.1,3],coronary:[0,.2],hepatic:[0,.2],splanchnic:[0,.4]}[k];if(v<limits[0]||v>limits[1]||k==='direction'&&![-1,1].includes(v))throw Error('Parametro fuori intervallo');p[k]=v;}return p;}
const api={defaults,presets,nodes,graph,solve,parse};root.FetalCore=api;if(typeof module!=='undefined'&&module.exports)module.exports=api;
})(typeof window!=='undefined'?window:{});
