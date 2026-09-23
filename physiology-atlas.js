/* Replaces only the optional anatomical overlay in the independent vector lab.
 * The reference heart, vectors, traces and their coordinate system are untouched.
 */
(function(root){'use strict';
root.PhysiologyAtlas={build({opacity=.6}={}){
 const T=root.THREE,G=root.HeartAtlasGeometry,group=new T.Group();let meshes=[],value=opacity;
 const setOpacity=v=>{value=v;for(const m of meshes){m.material.opacity=v;m.material.transparent=v<1;m.material.depthWrite=v===1;}};
 const ready=new Promise((resolve,reject)=>new T.GLTFLoader().load('prototipo-cuore/heart-z-anatomy.glb',gltf=>{
  meshes=G.sourceMeshes(gltf.scene);root.AnatomyRefinements.apply(meshes,G.material);meshes.push(G.junctionMesh());root.CardiacAttachments.seamNormals(meshes);
  for(const m of meshes){m.material.color.convertLinearToSRGB();group.add(m);}
  // Rigid registration plus uniform scale. NAV is the existing vector origin.
  const from=new T.Vector3(-.54,1.07,-.04).normalize(),to=new T.Vector3(-.38,.46,.10).normalize();group.quaternion.setFromUnitVectors(from,to);group.scale.setScalar(.68);
  const origin=new T.Vector3(-.28,-.24,-.09).multiplyScalar(.68).applyQuaternion(group.quaternion);group.position.copy(origin.negate());setOpacity(value);resolve();
 },undefined,reject));
 return {group,ready,setOpacity};
}};
})(window);
