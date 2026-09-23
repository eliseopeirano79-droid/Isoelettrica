/* Reproducible display mapping. Original clinical territories remain in coronarie.js. */
const fs=require('fs'),vm=require('vm'),path=require('path'),crypto=require('crypto');
const root=path.resolve(__dirname,'..');process.chdir(root);global.THREE=require('../three.min.js');global.window=global;vm.runInThisContext(fs.readFileSync('gltfloader.js','utf8'));vm.runInThisContext(fs.readFileSync('cuore3d.js','utf8'));
const sources=JSON.parse(fs.readFileSync('prototipo-cuore/coronary-paths.json')),by=Object.fromEntries(sources.map(x=>[x.name,x.splines]));
const R=by['Right coronary artery'],L=by['Anterior interventricular artery'],C=by['Circumflex artery of heart'],S=by['Septal branches of anterior interventricular artery'],PL=by['Right inferolateral branch of right coronary artery'];
const dist=(a,b)=>Math.hypot(a[0]-b[0],a[1]-b[1],a[2]-b[2]);
const sample=(p,u)=>{const lengths=[0];for(let i=1;i<p.length;i++)lengths.push(lengths.at(-1)+dist(p[i],p[i-1]));const d=u*lengths.at(-1);let i=1;while(i<lengths.length-1&&lengths[i]<d)i++;const f=(d-lengths[i-1])/(lengths[i]-lengths[i-1]||1);return p[i].map((v,k)=>p[i-1][k]+f*(v-p[i-1][k]));};
const slice=(p,a,b)=>Array.from({length:49},(_,i)=>sample(p,a+(b-a)*i/48));
const paths={lm:by['Left coronary artery'][0],lad1:slice(L[0],0,.34),lad2:slice(L[0],.34,.68),lad3:slice(L[0],.68,1),cx1:slice(C[0],0,.5),cx2:slice(C[0],.5,1),rca1:slice(R[0],0,.34),rca2:slice(R[0],.34,.68),rca3:slice(R[0],.68,1),s1:S[2],s2:S[0],s3:S[4],d1:L[2],d2:L[1],om1:C[3],om2:C[5],pla:C[4],plv:PL[0],am:R[4],am2:R[1],rvb:R[9],cono:R[12]};
// Branches not individually identified by this source are explicitly reconstructed.
const reconstructed={
 nsa:[sample(R[0],.08),[-.54,.48,.36],[-.77,.68,.10],[-.82,.79,-.12]],
 nav:[sample(R[0],.98),[-.30,-.63,-.58],[-.41,-.28,-.15]],
 pda:[R[0].at(-1),[.20,-1.0,-.46],[.51,-1.19,-.11],[.72,-1.24,.48]],
 ri:[paths.lm.at(-1),[.74,.15,.27],[1.10,-.18,.14],[1.18,-.49,.25]],
 sp1:[[.20,-1.0,-.46],[.09,-.72,-.20],[.16,-.51,.02]],
 sp2:[[.51,-1.19,-.11],[.40,-.90,.08],[.37,-.78,.23]]
};Object.assign(paths,reconstructed);
const assignments={
 'Right coronary artery':['rca', 'am2','am2','am2','am','am','am','am','am','rvb','rvb','rvb','cono','cono'],
 'Circumflex artery of heart':['cx','cx2','cx2','om1','pla','om2'],
 'Anterior interventricular artery':['lad','d2','d1','d1','lad2','lad1'],
 'Left coronary artery':['lm'],
 'Right inferolateral branch of right coronary artery':Array(8).fill('plv'),
 'Septal branches of anterior interventricular artery':['s2','s2','s1','s1','s3','s3']
};
const keys=Object.keys(paths),faces={};const raw=fs.readFileSync('prototipo-cuore/heart-z-anatomy.glb');
new THREE.GLTFLoader().parse(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength),'',g=>{
 g.scene.updateMatrixWorld(true);g.scene.traverse(o=>{const name=o.userData.sourceName;if(!o.isMesh||!by[name])return;const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),p=geo.attributes.position,idx=geo.index.array,points=[];
 by[name].forEach((line,i)=>{const tag=assignments[name][i],lengths=[0];for(let j=1;j<line.length;j++)lengths.push(lengths.at(-1)+dist(line[j],line[j-1]));for(let j=0;j<line.length;j++){const u=lengths[j]/lengths.at(-1);let id=tag;if(tag==='lad'||tag==='rca')id+=u<.34?'1':u<.68?'2':'3';if(tag==='cx')id+=u<.5?'1':'2';points.push({p:line[j],id:keys.indexOf(id)});}});
 const out=[];for(let i=0;i<idx.length;i+=3){let x=0,y=0,z=0;for(let j=0;j<3;j++){x+=p.getX(idx[i+j])/3;y+=p.getY(idx[i+j])/3;z+=p.getZ(idx[i+j])/3;}let best=Infinity,id=-1;for(const q of points){const d=(x-q.p[0])**2+(y-q.p[1])**2+(z-q.p[2])**2;if(d<best){best=d;id=q.id;}}out.push(id);}faces[name]=out;
 });
 fs.writeFileSync('prototipo-cuore/atlas-coronary-map.json',JSON.stringify({version:1,sourceSha256:crypto.createHash('sha256').update(raw).digest('hex'),note:'Identificazione dei rami minuti e territori illustrativa; non una segmentazione clinica validata. Coordinate in unità atlas; scala app 0.65.',keys,paths,reconstructed:Object.keys(reconstructed),faces}));console.log('Mapped',Object.values(faces).reduce((a,x)=>a+x.length,0),'triangles;',keys.length,'arterial branches.');
},console.error);
