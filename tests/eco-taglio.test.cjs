const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../eco.js');
const mesh = (p,t) => E.salda(new Float32Array(p.flat()),new Uint32Array(t.flat()));
const punti = c => Array.from({length:c.p.length/3},(_,i)=>Array.from(c.p.slice(3*i,3*i+3)));
function segmenti(cs) {
  const out=[];
  for(const c of cs){const p=punti(c);for(let i=1;i<p.length;i++)out.push([p[i-1],p[i]]);if(c.chiusa)out.push([p.at(-1),p[0]]);}
  return out;
}
const chiave = (a,b) => [a.join(','),b.join(',')].sort().join('|');

test('Taglio: un piano degenere non restituisce la superficie intera',()=>{
  const m=mesh([[0,0,-1],[0,0,1],[2,0,1]],[[0,1,2]]);
  for(const n of [[0,0,0],[NaN,0,1],[Infinity,0,1]])assert.deepEqual(E.taglia(m,[0,0,0],n,true),[]);
});

test('Taglio: un bordo condiviso da tre facce conserva tutti i rami senza chiuderli',()=>{
  const m=mesh([[0,0,-1],[0,0,1],[2,0,1],[0,2,1],[-2,0,1]],[[0,1,2],[0,1,3],[0,1,4]]);
  const cs=E.taglia(m,[0,0,0],[0,0,1],true),s=segmenti(cs);
  assert.equal(s.length,3,'una intersezione per ogni triangolo, anche nel nodo a tre rami');
  assert.ok(cs.every(c=>!c.chiusa));
  assert.deepEqual(new Set(s.map(([a,b])=>chiave(a,b))),new Set([[1,0,0],[0,1,0],[-1,0,0]].map(p=>chiave([0,0,0],p))));
});

test('Taglio: facce duplicate non cancellano un segmento reale',()=>{
  const m=mesh([[0,0,-1],[0,0,1],[2,0,1]],[[0,1,2],[0,1,2]]);
  const s=segmenti(E.taglia(m,[0,0,0],[0,0,1],true));
  assert.equal(s.length,1);assert.equal(chiave(...s[0]),chiave([0,0,0],[1,0,0]));
});

test('Taglio: un vertice esattamente sul piano non genera NaN né un falso anello',()=>{
  const m=mesh([[0,0,0],[2,0,1],[0,2,-1]],[[0,1,2]]);
  const cs=E.taglia(m,[0,0,0],[0,0,1],true),s=segmenti(cs);
  assert.equal(s.length,1);assert.equal(cs[0].chiusa,false);
  assert.equal(chiave(...s[0]),chiave([0,0,0],[1,1,0]));
  assert.ok(cs[0].p.every(Number.isFinite));
});

test('Taglio: una faccia coplanare usa il perimetro senza la diagonale di triangolazione',()=>{
  const m=mesh([[0,0,0],[1,0,0],[1,1,0],[0,1,0]],[[0,1,2],[0,2,3]]);
  const cs=E.taglia(m,[0,0,0],[0,0,1],true),s=segmenti(cs);
  assert.equal(cs.length,1);assert.equal(cs[0].chiusa,true);assert.equal(s.length,4);
  assert.ok(!s.some(([a,b])=>chiave(a,b)===chiave([0,0,0],[1,1,0])));
});
