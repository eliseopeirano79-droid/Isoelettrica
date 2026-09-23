/* Shared anatomy, without altering the Z-Anatomy source GLB. See ATTRIBUZIONI.md. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'));else root.HeartAtlasGeometry=factory(root.THREE);})(typeof window!=='undefined'?window:globalThis,function(T){
'use strict';
const V=p=>new T.Vector3(...p);
const RINGS=[[[-0.13313236832618713,0.8997827172279358,0.027659177780151367],[-0.11626751720905304,0.9575353860855103,0.05406290292739868],[-0.09940266609191895,1.016575813293457,0.08239799737930298],[-0.04960694909095764,1.061975121498108,0.108584463596344],[0.0001887679100036621,1.1075236797332764,0.13499492406845093],[0.1362088918685913,1.1418122053146362,0.14903908967971802],[0.20933693647384644,1.1241958141326904,0.15575283765792847],[0.27971750497817993,1.1075239181518555,0.15123337507247925],[0.3322364091873169,1.0619752407073975,0.13076645135879517],[0.3847554326057434,1.0164265632629395,0.11029964685440063],[0.4053402543067932,0.954206109046936,0.07936954498291016],[0.4259251356124878,0.8919903039932251,0.0484466552734375],[0.4090602397918701,0.8319201469421387,0.018566668033599854],[0.39219552278518677,0.7747843265533447,-0.0069116950035095215],[0.3423997759819031,0.7352420091629028,-0.024312734603881836],[0.29260408878326416,0.6983927488327026,-0.03767406940460205],[0.2232203483581543,0.6859065294265747,-0.04403418302536011],[0.15383654832839966,0.6720895767211914,-0.05239039659500122],[0.08345592021942139,0.6899049282073975,-0.046155691146850586],[0.013075321912765503,0.7046728134155273,-0.04449218511581421],[-0.039443641901016235,0.7455669045448303,-0.031006991863250732],[-0.09196259081363678,0.7872771620750427,-0.016297638416290283],[-0.11254748702049255,0.8440263867378235,0.0064255595207214355]],[[0.053117215633392334,0.7881582975387573,-0.7161455154418945],[0.009110420942306519,0.9321644306182861,-0.732056200504303],[0.05269134044647217,1.0761704444885254,-0.7150136828422546],[0.16721364855766296,1.1651711463928223,-0.6715275645256042],[0.30893367528915405,1.1651711463928223,-0.618208110332489],[0.4237191677093506,1.0761704444885254,-0.5754215717315674],[0.467725932598114,0.9321643710136414,-0.5595108866691589],[0.4241449236869812,0.7881581783294678,-0.576553463935852],[0.3096226453781128,0.6991575360298157,-0.6200395822525024],[0.1679026484489441,0.6991575360298157,-0.6733589768409729]],[[-0.27864912152290344,0.6942925453186035,-0.3541661500930786],[-0.32002612948417664,0.8203978538513184,-0.3246268630027771],[-0.33236902952194214,0.9465029239654541,-0.3739449381828308],[-0.3109632730484009,1.0244402885437012,-0.48328256607055664],[-0.26398515701293945,1.0244402885437012,-0.6108766198158264],[-0.2093786895275116,0.9465030431747437,-0.707990288734436],[-0.1680017113685608,0.8203977346420288,-0.7375295162200928],[-0.1556588113307953,0.6942925453186035,-0.6882113814353943],[-0.17706453800201416,0.6163551807403564,-0.5788737535476685],[-0.22404268383979797,0.6163551807403564,-0.45127981901168823]]];
function pulmonaryJunction(){
 // Three open source boundaries joined by a pair-of-pants surface. No lumen cap.
 // The source endpoints stay fixed; only the added connecting wall is smoothed.
 const centers=RINGS.map(r=>r.reduce((c,p)=>c.add(V(p)),new T.Vector3()).divideScalar(r.length));
 const center=centers.reduce((c,p)=>c.add(p),new T.Vector3()).divideScalar(3);
 const normal=new T.Vector3().crossVectors(centers[1].clone().sub(centers[0]),centers[2].clone().sub(centers[0])).normalize();if(normal.y<0)normal.negate();
 const ref=centers[0].clone().sub(center).normalize(),side=new T.Vector3().crossVectors(normal,ref);
 const order=[0,1,2].sort((a,b)=>Math.atan2(centers[a].clone().sub(center).dot(side),centers[a].clone().sub(center).dot(ref))-Math.atan2(centers[b].clone().sub(center).dot(side),centers[b].clone().sub(center).dot(ref)));
 let pos=[center.clone().addScaledVector(normal,.21),center.clone().addScaledVector(normal,-.21)],faces=[],ends=[];const pinned=new Set([0,1]);
 for(const k of order){
  const r=RINGS[k].map(V),c=centers[k],tangent=new T.Vector3().crossVectors(normal,c.clone().sub(center)).normalize();
  let lo=0,hi=0;r.forEach((p,i)=>{if(p.clone().sub(c).dot(tangent)<r[lo].clone().sub(c).dot(tangent))lo=i;if(p.clone().sub(c).dot(tangent)>r[hi].clone().sub(c).dot(tangent))hi=i;});
  const ids=r.map(p=>{let i=pos.length;pos.push(p);pinned.add(i);return i;});let a=[],b=[];
  for(let i=lo;;i=(i+1)%r.length){a.push(i);if(i===hi)break;}
  for(let i=hi;;i=(i+1)%r.length){b.push(i);if(i===lo)break;}
  const front=a.reduce((sum,i)=>sum+r[i].clone().sub(c).dot(normal),0)>0?a:b,back=front===a?b:a;
  for(const [chain,hub] of [[front,0],[back,1]])for(let i=1;i<chain.length;i++)faces.push([hub,ids[chain[i-1]],ids[chain[i]]]);
  ends.push([ids[lo],ids[hi]]);
 }
 for(let i=0;i<3;i++){const a=ends[i][1],b=ends[(i+1)%3][0];faces.push([0,a,b],[1,b,a]);}
 // Uniform subdivisions with pinned source seams keep the join continuous.
 for(let pass=0;pass<3;pass++){
  const edgeCount=new Map();for(const f of faces)for(let i=0;i<3;i++){let a=f[i],b=f[(i+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');edgeCount.set(key,(edgeCount.get(key)||0)+1);}
  const cache=new Map(),mid=(a,b)=>{let key=[Math.min(a,b),Math.max(a,b)].join(':');if(!cache.has(key)){const i=pos.length;pos.push(pos[a].clone().add(pos[b]).multiplyScalar(.5));if(edgeCount.get(key)===1)pinned.add(i);cache.set(key,i);}return cache.get(key);};
  const next=[];for(const [a,b,c] of faces){const ab=mid(a,b),bc=mid(b,c),ca=mid(c,a);next.push([a,ab,ca],[ab,b,bc],[ca,bc,c],[ab,bc,ca]);}faces=next;
  const neighbors=pos.map(()=>new Set());for(const f of faces)for(let i=0;i<3;i++){neighbors[f[i]].add(f[(i+1)%3]);neighbors[f[(i+1)%3]].add(f[i]);}
  // Taubin smoothing avoids the shrinkage of repeated positive Laplacian steps.
  // Opposing hub anchors preserve the lumen height; all source seams stay fixed.
  for(const factor of [.5,-.53,.5,-.53]){const copy=pos.map(p=>p.clone());for(let i=0;i<pos.length;i++)if(!pinned.has(i)){const mean=new T.Vector3();neighbors[i].forEach(j=>mean.add(copy[j]));pos[i].lerp(mean.divideScalar(neighbors[i].size),factor);}}
 }
 // Orient the connected faces consistently (the three source loops have
 // independent winding), then choose outward orientation at the upper wall.
 const links=new Map();faces.forEach((f,i)=>f.forEach((a,j)=>{const b=f[(j+1)%3],key=[Math.min(a,b),Math.max(a,b)].join(':');if(!links.has(key))links.set(key,[]);links.get(key).push({i,dir:a<b?1:-1});}));
 const signs=new Map([[0,1]]),queue=[0];for(let q=0;q<queue.length;q++){const i=queue[q];for(let j=0;j<3;j++){const a=faces[i][j],b=faces[i][(j+1)%3],edge=links.get([Math.min(a,b),Math.max(a,b)].join(':'));for(const n of edge)if(!signs.has(n.i)){signs.set(n.i,-signs.get(i)*(a<b?1:-1)*n.dir);queue.push(n.i);}}}
 faces=faces.map((f,i)=>signs.get(i)===-1?[f[0],f[2],f[1]]:f);
 const score=faces.reduce((sum,f)=>{const [a,b,c]=f.map(i=>pos[i]),p=a.clone().add(b).add(c).divideScalar(3).sub(center),n=new T.Vector3().crossVectors(b.clone().sub(a),c.clone().sub(a));return sum+n.dot(normal)*p.dot(normal);},0);if(score<0)faces=faces.map(f=>[f[0],f[2],f[1]]);
 const geometry=new T.BufferGeometry();geometry.setAttribute('position',new T.Float32BufferAttribute(pos.flatMap(p=>p.toArray()),3));geometry.setIndex(faces.flat());geometry.computeVertexNormals();geometry.userData={reconstruction:true,openings:3,sourceSeamsUnchanged:true};return geometry;
}
function material(name,layer){
 let color={wall:'#a85c67',coronaries:'#ed8860',veins:'#527aac',valves:'#d8c4a0',vessels:'#b86d79'}[layer]||'#a85c67';
 if(layer==='vessels'&&/cava|pulmonary artery|pulmonary trunk|Bifurcatio/i.test(name))color='#6084a2';if(/papillary/.test(name))color='#b47a76';
 const m=new T.MeshStandardMaterial({color,roughness:layer==='valves'?.56:.62,metalness:0,side:T.DoubleSide});m.color.convertSRGBToLinear();return m;
}
function sourceMeshes(scene){scene.updateMatrixWorld(true);const meshes=[];scene.traverse(o=>{if(!o.isMesh)return;const name=o.userData.sourceName||o.name;let layer=o.userData.layer;if(layer==='heart')layer=/leaflet|papillary/i.test(name)?'valves':'wall';const m=new T.Mesh(o.geometry.clone().applyMatrix4(o.matrixWorld),material(name,layer));m.name=name;m.userData={...o.userData,sourceName:name,layer};meshes.push(m);});return meshes;}
function junctionMesh(){const m=new T.Mesh(pulmonaryJunction(),material('Bifurcatio trunci pulmonalis','vessels'));m.name='Bifurcatio trunci pulmonalis';m.userData={sourceName:m.name,layer:'vessels',label:'Biforcazione del tronco polmonare',origin:'Raccordo didattico ricostruito sui margini dell’atlante',reconstruction:true};return m;}
function setupRenderer(r){r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.94;}
function lighting(scene){scene.add(new T.HemisphereLight(0xd3e5ed,0x52323b,.85));for(const [col,p,x,y,z]of[[0xffe5d9,1.55,-3,4,5],[0xa7cde9,.85,4,1,-3],[0xffb7a5,.45,-4,-1,-2]]){const l=new T.DirectionalLight(col,p);l.position.set(x,y,z);scene.add(l);}}
return {pulmonaryJunction,junctionMesh,sourceMeshes,material,setupRenderer,lighting};
});
