const test=require('node:test'),assert=require('node:assert/strict');
const {traccia,volume}=require('../ecocardio/simpson.js');
function sezione(r,l){
 return Array.from({length:101},(_,i)=>{const a=Math.PI*i/100;return [r*Math.cos(a),l*Math.sin(a)];});
}
test('Simpson: due semiellissi, venti dischi, volume e FE su un riferimento analitico',()=>{
  const a=traccia(sezione(2.5,8)),b=traccia(sezione(2,8));
  assert.ok(Math.abs(a.area-Math.PI*2.5*8/2)<.02);
  const v=volume(a,b);assert.ok(Math.abs(v-2*Math.PI*2.5*2*8/3)<.12);
  const s=volume(traccia(sezione(2,6)),traccia(sezione(1.6,6)));
  assert.ok(Math.abs(100*(1-s/v)-52)<.02);
  assert.equal(volume(null,b),null);
  assert.equal(traccia([[0,0],[1,2],[0,2],[1,0],[.5,-1]]),null);
  assert.equal(traccia([[0,0],[1,1]]),null);
});
