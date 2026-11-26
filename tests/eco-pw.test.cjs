const test=require('node:test');
const assert=require('node:assert/strict');
const {alias,campiona,interseca,velocitaTessuto}=require('../ecocardio/doppler-pw.js');
const {velocita}=require('../eco.js');
test('PW: profondità, bordo del getto, angolo, segno e aliasing',()=>{
  const getti=[{o:[0,0,2],d:[0,0,1],L:4,w0:2,w1:2,v:1.5}];
  const misura=(o,d,z)=>campiona(getti,o,d,z,.3);
  assert.deepEqual(misura([0,0,0],[0,0,1],3),[-1.5]);
  assert.deepEqual(misura([0,0,7],[0,0,-1],3),[1.5]);
  assert.deepEqual(misura([3,0,0],[0,0,1],3),[]);
  assert.deepEqual(misura([0,0,0],[0,0,1],7),[]);
  assert.deepEqual(misura([0,0,0],[0,0,1],1),[]);
  assert.equal(Math.abs(misura([-2,0,3],[1,0,0],2)[0]),0);
  assert.equal(alias(1.5,1),-.5);assert.equal(alias(-1.5,1),.5);
  assert.equal(alias(5.5,1),-.5);assert.equal(alias(.75,1),.75);
  assert.ok(velocita('polmonare',null,.18)[0].v>.7);
  assert.deepEqual(velocita('polmonare',null,.6),[]);
});
test('Color: sezione distale del getto, flusso parallelo fuori piano e incidenza obliqua',()=>{
  const P={o:[0,0,0],n:[0,1,0]},j={o:[0,2,0],d:[0,-1,0],L:4,w0:1,w1:1};
  assert.deepEqual(interseca(j,P,.4),{min:.45,max:.55});
  assert.equal(interseca({...j,d:[1,0,0]},P,.4),null);
  assert.deepEqual(interseca({...j,o:[0,.1,0],d:[1,0,0]},P,.4),{min:0,max:1});
  const ob=interseca({...j,d:[Math.SQRT1_2,-Math.SQRT1_2,0]},P,.4);
  assert.ok(ob.min>0 && ob.max<1 && ob.min<ob.max);
});
test('TDI: velocità del tessuto proporzionale alla frequenza e proiettata sul fascio',()=>{
  const p=[0,0,0], pos=(_,f)=>[0,0,Math.sin(f*2*Math.PI)];
  const m=velocitaTessuto(p,0,60,1,[0,0,1],pos);
  assert.ok(Math.abs(m+2*Math.PI/100)<1e-6);
  assert.equal(Math.abs(velocitaTessuto(p,0,60,1,[1,0,0],pos)),0);
  assert.equal(velocitaTessuto(p,0,120,1,[0,0,1],pos),2*m);
});
