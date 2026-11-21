const test = require('node:test');
const assert = require('node:assert/strict');
const C = require('../eco-bmode-core.js');
const L = require('../eco-localizzatore2d.js');
const E = require('../eco.js');
const { creaRenderer } = require('../eco-bmode.js');

test('B-mode: conversione polare, bordo e punti fuori settore', () => {
  assert.deepEqual(C.polari(100, 120, 100, 20, 10, 20, Math.PI/4), {r:10,a:0,u:.5,v:.5});
  for (const [x,y] of [[100,19],[400,20],[100,221]]) assert.equal(C.polari(x,y,100,20,10,20,Math.PI/4), null);
  const p = C.polari(200,120,100,20,10,20,Math.PI/4); assert.ok(Math.abs(p.u-1)<1e-10);
});
test('B-mode: guadagno e attenuazione a doppio percorso, nero e saturazione', () => {
  assert.equal(C.attenuazione(4,2,.5), 8);
  assert.equal(C.attenuazione(0,2,.5), 0);
  assert.equal(C.luminosita(0,60,50,0,0),0);
  assert.equal(C.luminosita(2,60,100,0,0),1);
  const a=C.luminosita(.1,60,0,0,0); assert.ok(C.luminosita(.1,60,6,0,0)>a); assert.ok(C.luminosita(.1,60,0,6,0)<a);
  assert.ok(Math.abs(C.luminosita(.1,60,0,6,6)-a)<1e-12);
});
test('B-mode: otto controlli TGC interpolano senza salti e rispettano gli estremi', () => {
  const a=[-7,-5,-3,-1,1,3,5,7]; assert.equal(C.tgc(a,0),-7); assert.equal(C.tgc(a,1),7); assert.equal(C.tgc(a,.5),0); assert.equal(C.tgc(a,-1),-7);
  for(let k=0;k<=7;k++)assert.ok(Math.abs(C.tgc(a,k/7)-a[k])<1e-10);
});
test('B-mode: diffusori deterministici e continui in coordinate materiali', () => {
  const p=[.35,-1.7,2.49], a=C.diffusori(p);
  assert.deepEqual(a,C.diffusori(p)); assert.notDeepEqual(a,C.diffusori(p,80));
  assert.ok(Math.abs(C.diffusori([p[0]+1e-6,p[1],p[2]])[0]-a[0])<1e-5);
  assert.ok(Math.abs(C.campo([1-1e-8,2,3],79)-C.campo([1+1e-8,2,3],79))<1e-6);
});
test('B-mode: PSF simmetrica normalizzata conserva un campo uniforme', () => {
  const k=C.psf(1.2,4); assert.ok(Math.abs(k.reduce((a,b)=>a+b,0)-1)<1e-12); assert.ok(k[4]>k[0]);
  for(let i=0;i<k.length;i++)assert.equal(k[i],k[k.length-1-i]);
});
const G = {L:8,Rm:2,apice:[0,0,0],axb:[0,1,0],terrIVA:[1,0,0],Tr:{cm:1},q:{}};
test('B-mode: inversa recupera il riferimento e i diffusori lungo la sistole normale', () => {
  for(const fase of [0,.1,.22,.34,.7,.95])for(const p of [[1,4,.4],[2.4,4,.5],[.2,2,.1],[-2,6,.3],[1,9,1]]){
    const c=E.contrazione(fase), y=[0,0,0]; E.deforma(G,p,c,y);
    const i=C.inversa(G,y,c,E.deforma,1e-6,60); assert.ok(i.convergente,JSON.stringify({p,fase,i}));
    assert.ok(Math.hypot(...p.map((v,j)=>v-i.punto[j]))<1e-4);
    const a=C.diffusori(p), b=C.diffusori(i.punto); assert.ok(Math.hypot(a[0]-b[0],a[1]-b[1])<1e-4);
  }
});
test('B-mode: mancata convergenza viene dichiarata e non mascherata', () => {
  const i=C.inversa(G,[2,5,1],1,E.deforma,1e-12,1); assert.equal(i.convergente,false); assert.ok(i.residuo>0);
});
test('Localizzatore 2D: superficie anteriore e coordinate di contatto sono coerenti', () => {
  const tr={a:14,b:10,cm:1,x0:0,zc:-8,hc:[1,0,0],basso:-20,giugulo:12};
  for(const [x,y]of [[300,200],[100,600],[550,50],[0,1000]]){
    const p=L.puntoCute(x,y,tr,600,800), e=((p[0]-tr.x0)/tr.a)**2+((p[2]-tr.zc)/tr.b)**2;
    assert.ok(Math.abs(e-1)<1e-12); assert.ok(p[1]>=tr.basso&&p[1]<=tr.giugulo); assert.ok(p[2]>=tr.zc);
    const q=L.proietta(p,tr,600,800); assert.ok(q.every(Number.isFinite));
  }
});
test('Renderer: assenza WebGL usa la riserva CPU; freeze deterministico e dispose', () => {
  function canvas(){const c={width:8,height:8,addEventListener(){}}; c.getContext=t=>t==='2d'?{drawImage(){},getImageData(){return {data:new Uint8ClampedArray(8*8*4).fill(128)};},putImageData(im){c.result=im.data.slice();}}:null;return c;}
  const doc={createElement:canvas}, r=creaRenderer(doc,E.deforma), input=canvas();
  const s={G,P:{o:[0,-2,0],u:[1,0,0],d:[0,1,0],n:[0,0,1],prof:12},fase:0,contr:0,ox:4,oy:0,scala:1,gammaDb:60,gain:0,focus:6,riverbero:false,tgc:[0,0,0,0,0,0,0,0],geometryKey:'a'};
  const a=r.render(input,s), pixels=a.canvas.result.slice();assert.equal(a.motore,'CPU di riferimento');assert.equal(r.stato().webgl2,false);assert.equal(r.stato().elaborati,1);
  assert.equal(r.render(input,s),a);assert.deepEqual(a.canvas.result,pixels);assert.equal(r.stato().elaborati,1);
  r.render(input,{...s,gain:5});assert.equal(r.stato().elaborati,2);r.dispose();assert.equal(r.stato().webgl2,false);
});
