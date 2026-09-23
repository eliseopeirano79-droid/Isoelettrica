/* Rendered graph shared by Tracciato and Anatomia. Never writes ECG state. */
(function(root){'use strict';const T=root.THREE,C=root.IsoConduction,V=p=>new T.Vector3(...p);
function create(options={}){
 const group=new T.Group(),paths=new Map(),nodes=[],point=new T.Vector3(),deform=options.deform||((p)=>p),decorate=options.material||((m)=>m);
 group.scale.setScalar(options.scale||1);let cfg={},lastSite=null;
 const colors={fast:'#55abc3',slow:'#e69470',kent:'#b17ce2',james:'#c69937'};
 function add(d){const curve=new T.CatmullRomCurve3(d.points.map(V)),mat=decorate(new T.MeshBasicMaterial({color:new T.Color(colors[d.id]||'#9f762d').convertSRGBToLinear(),toneMapped:false,transparent:true,opacity:.8,depthWrite:false}));
  const tube=new T.Mesh(new T.TubeGeometry(curve,Math.max(16,Math.min(80,Math.round(curve.getLength()*36))),d.id==='his'?.014:.008,6,false),mat);tube.renderOrder=10;
  const spark=new T.Mesh(new T.SphereGeometry(.028,8,6),new T.MeshBasicMaterial({color:new T.Color(colors[d.id]||'#c48312').convertSRGBToLinear(),toneMapped:false,depthTest:false,depthWrite:false,transparent:true}));spark.renderOrder=12;spark.visible=false;group.add(tube,spark);
  const label=C.names[d.id]||(d.id==='return'?'Ritorno atriale dal Kent':'Rete subendocardica di Purkinje');tube.userData={sourceName:'conduction-'+d.id,label,layer:'conduction',reconstruction:true};
  const path={...d,curve,tube,spark,color:mat.color.clone(),label};paths.set(d.id,path);return path;
 }
 for(const d of C.paths)add(d);
 for(const [id,p,label]of [['sa',C.anchors.sa,'Nodo senoatriale'],['av',C.anchors.av,'Nodo atrioventricolare']]){const n=new T.Mesh(new T.SphereGeometry(id==='sa'?.042:.035,12,8),new T.MeshBasicMaterial({color:new T.Color('#9b691d').convertSRGBToLinear(),toneMapped:false,depthTest:false}));n.userData={sourceName:'node-'+id,label,layer:'conduction',rest:p,worldDeformed:true};n.renderOrder=11;n.material.transparent=true;n.material.depthWrite=false;n.position.copy(V(p));group.add(n);nodes.push(n);}
 function setScenario(next){cfg=next||{};if(lastSite!==cfg.isoKent){
   const k=C.kent(cfg.isoKent),site=C.site(cfg.isoKent),a=site.atrial,b=site.ventricular,branch=b[0]<0?C.anchors.rb:C.anchors.lpf;
   const defs=[k,{id:'return',points:[a,[(a[0]+C.anchors.upper[0])*.5,Math.max(a[1],C.anchors.upper[1])+.12,(a[2]+C.anchors.upper[2])*.5],C.anchors.upper]},{id:'ventricular-return',points:[C.anchors.bif,branch,[(branch[0]+b[0])*.5,b[1]-.15,(branch[2]+b[2])*.5],b]}];
   for(const d of defs){const p=paths.get(d.id);if(!p)add(d);else{p.points=d.points;p.curve=new T.CatmullRomCurve3(d.points.map(V));p.tube.geometry.dispose();p.tube.geometry=new T.TubeGeometry(p.curve,48,.008,6,false);}}
   lastSite=cfg.isoKent;
  }
 }
 setScenario({isoKent:C.sites[0].id});
 const focus=new T.Mesh(new T.SphereGeometry(.046,12,8),new T.MeshBasicMaterial({color:new T.Color('#d5678a').convertSRGBToLinear(),toneMapped:false,depthTest:false,depthWrite:false,transparent:true}));focus.renderOrder=9;group.add(focus);focus.visible=false;
 function update(clock,configuration=cfg){setScenario(configuration);const plan=C.plan(clock,cfg);for(const [id,p]of paths){const visible=id.startsWith('delay-')?plan.blocked.includes(id.slice(6)):['return','ventricular-return'].includes(id)?['orthodromic','antidromic'].includes(C.mode(cfg)):['kent','james','flutter'].includes(id)?plan.visible[id]:true;
   p.tube.visible=visible;const blocked=plan.blocked.includes(p.branch||id);p.tube.material.color.copy(blocked?new T.Color('#bf3659').convertSRGBToLinear():p.color);const run=plan.active[id];p.spark.visible=visible&&!blocked&&!!run&&group.visible;
   if(p.spark.visible){p.curve.getPointAt(run.reverse?1-run.u:run.u,point);p.tube.updateMatrix();p.spark.position.copy(deform(point.clone()).applyMatrix4(p.tube.matrix));}
  }
  const v=clock.events.V,dv=v?clock.time-v.t:Infinity;focus.visible=!!v&&(v.meta.paced||['pvc','vt','escape-v'].includes(v.meta.type))&&dv>=0&&dv<(v.meta.w||140);if(focus.visible){const p=/rv|right/i.test(v.meta.focus||'')?C.anchors.rb:C.anchors.lpf;focus.position.copy(deform(V(p)));focus.scale.setScalar(1+Math.sin(Math.PI*dv/(v.meta.w||140))*.6);}
  nodes.forEach(n=>n.position.copy(deform(V(n.userData.rest))));nodes[1].material.color.set(plan.nodeBlocked?'#dc3456':'#9b691d').convertSRGBToLinear();return plan;
 }
 function xray(on){for(const p of paths.values()){p.tube.material.depthTest=!on;}for(const n of nodes)n.material.depthTest=!on;}
 return {group,paths,nodes,setScenario,update,xray};
}
root.IsoConductionView={create};
})(window);
