const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const E = require('../eco.js');

const catena = (punti, chiusa = false) => ({ p: new Float32Array(punti.flat()), chiusa });
const distanza = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const punti = c => Array.from({ length: c.p.length / 3 }, (_, i) => Array.from(c.p.slice(i * 3, i * 3 + 3)));

test('Sezioni: orifizi e frammenti distanti non diventano ponti di tessuto', () => {
  const a = catena([[0,0,0],[0,4,0],[1,5,0]]);
  const b = catena([[5,0,0],[5,4,0],[4,5,0]]);
  const r = E.unisci([a,b]);
  assert.equal(r.length,2);
  assert.ok(r.every(c => !c.chiusa));
  assert.deepEqual(r.map(punti),[punti(a),punti(b)]);
});

test('Sezioni: un singolo bordo aperto non viene chiuso attraverso la cavità', () => {
  const a=catena([[0,0,0],[0,4,0],[2,5,0],[4,4,0],[4,0,0]]);
  const [r]=E.unisci([a]);
  assert.equal(r.chiusa,false);
  assert.deepEqual(r.p,a.p);
});

test('Sezioni: raccordi entro la tolleranza numerica conservano un anello reale', () => {
  const a=catena([[0,0,0],[1,0,0],[1,1,0]]);
  const b=catena([[0,0,0],[0,1,0],[1,1,0]]);
  const r=E.unisci([a,b]);
  assert.equal(r.length,1);assert.equal(r[0].chiusa,true);
  assert.ok(punti(r[0]).every(p => p[0]>=0&&p[0]<=1&&p[1]>=0&&p[1]<=1));
});

function glb(name) {
  const b=fs.readFileSync(path.join(__dirname,'../prototipo-cuore',name));
  const n=b.readUInt32LE(12),j=JSON.parse(b.subarray(20,20+n)),bin=b.subarray(28+n);
  function acc(i) {
    const a=j.accessors[i],v=j.bufferViews[a.bufferView],start=(v.byteOffset||0)+(a.byteOffset||0);
    const C={5126:Float32Array,5125:Uint32Array,5123:Uint16Array}[a.componentType],k=a.type==='VEC3'?3:1;
    return new C(bin.buffer.slice(bin.byteOffset+start,bin.byteOffset+start+a.count*k*C.BYTES_PER_ELEMENT));
  }
  return j.nodes.filter(n=>n.mesh!==undefined).map(n=>{
    const p=j.meshes[n.mesh].primitives[0],m=E.salda(acc(p.attributes.POSITION),acc(p.indices));
    return Object.assign(m,{nome:n.name.replace(/_/g,' '),tipo:E.tipoDi(n.name),layer:n.extras&&n.extras.layer});
  });
}

test('Sezioni reali: nessun segmento inventato nelle nove proiezioni del cuore', () => {
  const M=glb('heart-z-anatomy.glb'),T=glb('torace-z-anatomy.glb'),G=E.reperi(M);
  E.correggiSetto(M,G);G.V=E.valvole(M,G);G.Tr=E.torace(G);G.ossa=T.filter(m=>m.layer==='osso'||m.layer==='cartilagine');
  const chiave=(a,b)=>[a.join(','),b.join(',')].sort().join('|');
  function segmenti(c) {const p=punti(c),r=[];for(let i=1;i<p.length;i++)r.push([p[i-1],p[i]]);if(c.chiusa)r.push([p.at(-1),p[0]]);return r;}
  let controllati=0;
  for(const v of E.VISTE) {
    const P=E.orienta(E.piano(G,v.id),0,0);
    for(const m of M) {
      const raw=E.taglia(m,P.o,P.n,true),noti=new Set(raw.flatMap(c=>segmenti(c).map(([a,b])=>chiave(a,b))));
      for(const c of E.taglia(m,P.o,P.n))for(const [a,b]of segmenti(c)) {
        assert.ok(noti.has(chiave(a,b))||distanza(a,b)<=1.001e-4,
          `${v.id}, ${m.nome}: ponte non presente nella mesh (${(distanza(a,b)/G.Tr.cm).toFixed(2)} cm)`);
        controllati++;
      }
    }
  }
  assert.ok(controllati>1000);
});
