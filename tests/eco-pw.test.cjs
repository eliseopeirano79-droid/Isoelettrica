const test=require('node:test');
const assert=require('node:assert/strict');
const {alias,campiona}=require('../ecocardio/doppler-pw.js');
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
