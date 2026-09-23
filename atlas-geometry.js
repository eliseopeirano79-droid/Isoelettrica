/* Shared anatomy, without altering the Z-Anatomy source GLB. See ATTRIBUZIONI.md. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./three.min.js'),require('./pulmonary-arteries.js'));else root.HeartAtlasGeometry=factory(root.THREE,root.PulmonaryArteries);})(typeof window!=='undefined'?window:globalThis,function(T,P){
'use strict';
const V=p=>new T.Vector3(...p);
function pulmonaryJunction(){return P.build().junction.clone();}
function pulmonaryAssembly(){return P.build();}
function material(name,layer){
 let color={wall:'#a85c67',coronaries:'#ed8860',veins:'#527aac',valves:'#d8c4a0',vessels:'#b86d79'}[layer]||'#a85c67';
 if(layer==='vessels'&&/cava|pulmonary artery|pulmonary trunk|Bifurcatio/i.test(name))color='#6084a2';if(/papillary/.test(name))color='#b47a76';
 const m=new T.MeshStandardMaterial({color,roughness:layer==='valves'?.56:.62,metalness:0,side:T.DoubleSide});m.color.convertSRGBToLinear();return m;
}
function sourceMeshes(scene){scene.updateMatrixWorld(true);const meshes=[];scene.traverse(o=>{if(!o.isMesh)return;const name=o.userData.sourceName||o.name;let layer=o.userData.layer;if(layer==='heart')layer=/leaflet|papillary/i.test(name)?'valves':'wall';const m=new T.Mesh(o.geometry.clone().applyMatrix4(o.matrixWorld),material(name,layer));m.name=name;m.userData={...o.userData,sourceName:name,layer};meshes.push(m);});return meshes;}
function junctionMesh(){const m=new T.Mesh(pulmonaryJunction(),material('Bifurcatio trunci pulmonalis','vessels'));m.name='Bifurcatio trunci pulmonalis';m.userData={sourceName:m.name,layer:'vessels',label:'Biforcazione del tronco polmonare',origin:'Biforcazione a lume continuo ricostruita sui riferimenti dell’atlante',reconstruction:true};return m;}
function setupRenderer(r){r.outputEncoding=T.sRGBEncoding;r.toneMapping=T.ACESFilmicToneMapping;r.toneMappingExposure=.94;}
function lighting(scene){scene.add(new T.HemisphereLight(0xd3e5ed,0x52323b,.85));for(const [col,p,x,y,z]of[[0xffe5d9,1.55,-3,4,5],[0xa7cde9,.85,4,1,-3],[0xffb7a5,.45,-4,-1,-2]]){const l=new T.DirectionalLight(col,p);l.position.set(x,y,z);scene.add(l);}}
return {pulmonaryJunction,pulmonaryAssembly,junctionMesh,sourceMeshes,material,setupRenderer,lighting};
});
