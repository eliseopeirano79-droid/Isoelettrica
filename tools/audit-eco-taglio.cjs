/* Audit geometrico: segmenti della sezione confrontati con le intersezioni dei triangoli.
   node tools/audit-eco-taglio.cjs [modulo-precedente] [json-di-output] */
const fs=require('fs'),path=require('path'),E=require('../eco.js');
function leggiGLB(nome){
  const b=fs.readFileSync(path.join(__dirname,'../prototipo-cuore',nome)),n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  const acc=i=>{const a=j.accessors[i],v=j.bufferViews[a.bufferView],s=(v.byteOffset||0)+(a.byteOffset||0),C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],k=a.type==='VEC3'?3:1;return new C(bin.buffer.slice(bin.byteOffset+s,bin.byteOffset+s+a.count*k*C.BYTES_PER_ELEMENT));};
  return j.nodes.filter(n=>n.mesh!==undefined).map(n=>{const p=j.meshes[n.mesh].primitives[0];return Object.assign(E.salda(acc(p.attributes.POSITION),acc(p.indices)),{nome:n.name.replace(/_/g,' '),tipo:E.tipoDi(n.name),layer:n.extras&&n.extras.layer});});
}
const key=p=>p.map(x=>Math.round(x*1e4)).join(','),edge=(a,b)=>[key(a),key(b)].sort().join('|');
function attesi(m,P){
  const p=m.pos,d=Array.from({length:m.nv},(_,i)=>(p[3*i]-P.o[0])*P.n[0]+(p[3*i+1]-P.o[1])*P.n[1]+(p[3*i+2]-P.o[2])*P.n[2]);
  const out=new Set();let coplanari=0;
  for(let i=0;i<m.tri.length;i+=3){const ids=Array.from(m.tri.slice(i,i+3)),hits=[];
    if(ids.every(v=>Math.abs(d[v])<=1e-9)){coplanari++;continue;}
    for(let k=0;k<3;k++){let a=ids[k],b=ids[(k+1)%3];if(a>b)[a,b]=[b,a];
      for(const v of [a,b])if(Math.abs(d[v])<=1e-9)hits.push(Array.from(p.slice(3*v,3*v+3)));
      if(d[a]*d[b]<0&&Math.abs(d[a])>1e-9&&Math.abs(d[b])>1e-9){const t=d[a]/(d[a]-d[b]);hits.push([0,1,2].map(c=>p[3*a+c]+t*(p[3*b+c]-p[3*a+c])));}}
    const unici=[...new Map(hits.map(v=>[key(v),v])).values()];if(unici.length===2&&key(unici[0])!==key(unici[1]))out.add(edge(...unici));
  }
  return {out,coplanari};
}
function prodotti(modulo,m,P){m._d=null;const out=new Set();for(const c of modulo.taglia(m,P.o,P.n,true)){
  const p=Array.from({length:c.p.length/3},(_,i)=>Array.from(c.p.slice(3*i,3*i+3)));
  for(let i=1;i<p.length;i++)if(key(p[i-1])!==key(p[i]))out.add(edge(p[i-1],p[i]));
  if(c.chiusa&&key(p.at(-1))!==key(p[0]))out.add(edge(p.at(-1),p[0]));
}return out;}
if(require.main!==module){module.exports={leggiGLB};return;}
const precedente=process.argv[2]?require(path.resolve(process.argv[2])):null;
const M=leggiGLB('heart-z-anatomy.glb'),T=leggiGLB('torace-z-anatomy.glb'),G=E.reperi(M);E.correggiSetto(M,G);G.V=E.valvole(M,G);G.Tr=E.torace(G);G.ossa=T.filter(m=>m.layer==='osso'||m.layer==='cartilagine');
const righe=[];
for(const v of E.VISTE){const P=E.orienta(E.piano(G,v.id),0,0);for(const m of M){const {out:veri,coplanari}=attesi(m,P);
  if(coplanari)continue; // la prova coplanare ha un test dedicato: non si sommano diagonali interne.
  for(const [versione,modulo]of [['attuale',E],...(precedente?[['precedente',precedente]]:[])]){
    const s=prodotti(modulo,m,P),mancanti=[...veri].filter(e=>!s.has(e)),aggiunti=[...s].filter(e=>!veri.has(e));
    // Float64 nell'intersezione analitica e Float32 nelle catene possono cadere su celle adiacenti.
    const dec=k=>k.split('|').map(p=>p.split(',').map(Number));
    const vicini=(a,b)=>{a=dec(a);b=dec(b);const v=(p,q)=>p.every((x,i)=>Math.abs(x-q[i])<=1);return v(a[0],b[0])&&v(a[1],b[1])||v(a[0],b[1])&&v(a[1],b[0]);};
    let entroTolleranza=0;
    for(let i=mancanti.length-1;i>=0;i--){const k=aggiunti.findIndex(e=>vicini(mancanti[i],e));if(k>=0){mancanti.splice(i,1);aggiunti.splice(k,1);entroTolleranza++;}}
    righe.push({vista:v.id,mesh:m.nome,versione,attesi:veri.size,prodotti:s.size,mancanti:mancanti.length,aggiunti:aggiunti.length,entroTolleranza});
  }
}}
const totali={};for(const r of righe){const t=totali[r.versione]||(totali[r.versione]={attesi:0,prodotti:0,mancanti:0,aggiunti:0,entroTolleranza:0});for(const k of Object.keys(t))t[k]+=r[k];}
const result={metodo:'Intersezioni dei triangoli contro contorni; coordinate quantizzate a 1e-4 unità del modello, non misura clinica',viste:9,totali,righe};
if(process.argv[3])fs.writeFileSync(path.resolve(process.argv[3]),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify({viste:9,totali}));
