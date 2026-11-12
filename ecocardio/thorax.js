/* Meshes from the original Z-Anatomy body, registered by the heart's transform.
 * Z-Anatomy CC BY-SA 4.0 / BodyParts3D CC BY-SA 2.1 JP. See thorax.json.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('../three.min.js'));else root.EchoThorax=factory(root.THREE);})(typeof window!=='undefined'?window:globalThis,function(T){
'use strict';
function decode(buffer){
 const bytes=new Uint8Array(buffer),dv=new DataView(buffer);
 if(bytes.length<8||String.fromCharCode(...bytes.subarray(0,4))!=='ETHX')throw Error('Scheletro toracico non valido');
 const n=dv.getUint32(4,true);if(n>bytes.length-8)throw Error('Scheletro toracico incompleto');
 const meta=JSON.parse(new TextDecoder().decode(bytes.subarray(8,8+n))),base=8+n;
 if(meta.version!==2||meta.positionStep!==.0005)throw Error('Versione dello scheletro non supportata');
 const parts=meta.parts.map(d=>{const start=base+d.offset,end=start+d.vertices*6+d.indices*2;if(end>bytes.length||d.vertices<3||d.indices%3)throw Error('Struttura toracica incompleta');const quantized=new Int16Array(buffer.slice(start,start+d.vertices*6)),positions=Float32Array.from(quantized,x=>x*meta.positionStep),indices=new Uint16Array(buffer.slice(start+d.vertices*6,end));for(const x of indices)if(x>=d.vertices)throw Error('Indice toracico non valido');return {...d,positions,indices};});
 return {meta,parts};
}
function meshes(data){return data.parts.map(d=>{
 const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(d.positions,3));g.setIndex(new T.BufferAttribute(d.indices,1));g.computeVertexNormals();g.computeBoundingSphere();
 const cartilage=d.kind==='cartilage'||d.kind==='disc',m=new T.MeshStandardMaterial({color:cartilage?'#98b8bc':'#e8ddc1',roughness:.68,side:T.DoubleSide,transparent:true,opacity:.72,depthWrite:true});m.color.convertSRGBToLinear();
 const mesh=new T.Mesh(g,m);mesh.name=d.label;mesh.userData={sourceName:d.name,id:d.id,label:d.label,layer:'skeleton',kind:d.kind};return mesh;
});}
return {decode,meshes};
});
