const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { read, app } = require('./harness.cjs');
const P = require('../ptbxl.js');
const E = require('../engine.js');
const catalog = JSON.parse(read('atlante-reale/indice.json'));
const fixture = JSON.parse(read('tests/fixtures/ptbxl-1.json'));
const bytes = () => Uint8Array.from(Buffer.from(fixture.data, 'base64')).buffer;

test('Il catalogo copre tutti i 21.799 ECG e conserva validazione, codici e provenienza', () => {
  const records = P.expandCatalog(catalog).voci;
  assert.equal(records.length, 21799);
  assert.equal(new Set(records.map(r => r.id)).size, 21799);
  assert.equal(records.filter(r => r.validated).length, 16056);
  assert.equal(Object.keys(catalog.codes).length, 71);
  const detailDir = path.join(__dirname, '../atlante-reale/dettagli');
  const details = Object.assign({}, ...fs.readdirSync(detailDir).map(f => JSON.parse(fs.readFileSync(path.join(detailDir,f)))));
  assert.equal(Object.keys(details).length, 21799);
  for (const r of records) {
    const d = details[r.id]; assert.ok(d, r.id);
    assert.deepEqual(r.codes, d.codes); assert.equal(r.validated, d.validated);
    assert.equal(d.sha.length, 2); d.sha.forEach(s => assert.match(s,/^[a-f0-9]{64}$/));
    assert.match(d.path, /^records500\/\d{5}\/\d{5}_hr$/);
    assert.ok(d.age === null || d.age === '>89' || d.age <= 89);
    assert.equal(r.q, null); // Le etichette non diventano diagnosi simulate più specifiche.
  }
});

test('Un ECG originale conserva ogni campione di tutte le 12 derivazioni, tempi e microvolt', async () => {
  const raw = bytes(); await P.verify(raw, fixture.sha[1]);
  await P.verify(new TextEncoder().encode(fixture.header), fixture.sha[0]);
  const rec = P.decodeWFDB(fixture.header, raw), st = new E.Sampled(rec);
  assert.equal(st.fs,500); assert.equal(st.dur,10000); assert.equal(st.availableLeads.length,12);
  const view = new DataView(raw);
  for (let sample=0;sample<5000;sample++) E.LEADS.forEach((lead,c) => {
    assert.ok(Math.abs(st.campiona(c,sample*2) - view.getInt16((sample*12+c)*2,true)/1000) < 1e-11,lead.id+' '+sample);
  });
  assert.equal(st.sig[0][0],-.115); assert.equal(st.sig[1][0],-.05);
  const broken = bytes(); new Uint8Array(broken)[31] ^= 1;
  await assert.rejects(P.verify(broken,fixture.sha[1]),/non corrisponde/);
  assert.throws(() => P.decodeWFDB(fixture.header, raw.slice(2)),/Dimensioni/);
  assert.throws(() => P.decodeWFDB(fixture.header.replace('1000.0(0)/mV','0(0)/mV'),raw),/Calibrazione/);
});

test('Calibrazione WFDB con baseline e derivazioni reali: nessuna ricostruzione o centratura', () => {
  const calibrated = fixture.header.replace('1000.0(0)/mV','2000.0(10)/mV');
  const rec = P.decodeWFDB(calibrated,bytes());
  assert.equal(rec.d.I[0],(-115-10)/2000);
  assert.equal(rec.d.II[0],-.05);
  assert.equal(rec.d.aVR[0],.082); // L'originale arrotondato non viene sostituito da .0825.
});

test('La ripetizione non interpola l’ultimo campione con il primo né collega i segmenti', () => {
  const st = new E.Sampled({fs:500,n:3,encoding:'mv',d:{II:[1,2,10]}});
  assert.equal(st.campiona(1,5),10); assert.equal(st.campiona(1,6),1);
  assert.equal(st.crossesBoundary(5,6),true); assert.equal(st.crossesBoundary(1,2),false);
  const h=app();try {
    const { A,w }=h; A.apriDigitalizzato('fixture',{fs:500,n:3,encoding:'mv',d:{II:[1,2,10]}});
    const segments=[];let point;
    A.mon.ctx.moveTo=(x,y)=>{point=[x,y];};A.mon.ctx.lineTo=(x,y)=>segments.push([point,[x,y]]);
    A.mon.mode='monitor';A.mon.layout();A.mon.t=10;A.mon.draw();
    assert.equal(segments.length,3); // Nessun segmento unisce 4 ms a 6 ms, al riavvio.
    const step=A.mon.speed*A.mon.pxmm*A.mon.dpr/1000;
    assert.ok(segments.every(([a,b])=>Math.abs((a[0]+2*step)-b[0])<1e-7));
    assert.equal(h.errors.length,0);
  } finally {h.close();}
});

test('Segmenti piatti e campioni WFDB mancanti non creano falsi picchi stimati', () => {
  for(const level of [0,.15]) {
    const st=new E.Sampled({fs:500,n:5000,encoding:'mv',d:{II:new Float64Array(5000).fill(level)}});
    assert.equal(st.battiti.length,0);
  }
  const raw=bytes();new DataView(raw).setInt16(12*50*2,-32768,true);
  const st=new E.Sampled(P.decodeWFDB(fixture.header,raw));
  assert.ok(Number.isNaN(st.campiona(0,100)));
  assert.ok(st.battiti.length>0);
});

test('Segnali e referto validati si riaprono senza rete; una copia corrotta è rifiutata', async () => {
  const maps=new Map(), calls=[];
  const mockCache={match:async k=>maps.get(k)?.clone(),put:async(k,r)=>maps.set(k,r.clone()),delete:async k=>maps.delete(k),keys:async()=>[...maps.keys()].map(url=>({url}))};
  const context={module:{exports:{}},crypto:globalThis.crypto,caches:{open:async()=>mockCache},URL,Response,TextDecoder,TextEncoder,DataView,Float64Array,Uint8Array,AbortController,DOMException,setTimeout,clearTimeout};
  let offline=false;
  const detail=JSON.parse(read('atlante-reale/dettagli/0.json'));
  context.fetch=async url=>{
    calls.push(url); if(offline) throw Error('offline');
    if(url.endsWith('/0.json'))return new Response(JSON.stringify(detail));
    if(url.endsWith('.hea'))return new Response(fixture.header);
    if(url.endsWith('.dat'))return new Response(bytes());
    throw Error('URL inatteso '+url);
  };
  vm.runInNewContext(read('ptbxl.js'),context);
  const p=context.module.exports, entry=p.expandCatalog(catalog).voci[0];
  const rec=await p.load(entry);assert.equal(rec.offline,true);assert.equal(calls.length,3);
  assert.deepEqual(Array.from(await p.offlineIds()),[1]);
  offline=true;const before=calls.length; const again=await p.load(entry);
  assert.equal(calls.length,before);assert.equal(again.d.I[0],-.115);
  const datKey=[...maps.keys()].find(u=>u.endsWith('.dat'));maps.set(datKey,new Response(new Uint8Array(120000)));
  await assert.rejects(p.load(entry),/offline/);
});

test('Atlante completo: paginazione limitata, filtri combinati, ID esatto e apertura animata', async t => {
  const h=app();t.after(h.close);const {A,w}=h;
  w.fetch=async()=>({ok:true,json:async()=>catalog});
  A.showView('atlas');await A.caricaIndiceReale();await new Promise(resolve=>setImmediate(resolve));
  [...w.document.querySelectorAll('.afonte')].find(b=>b.textContent.startsWith('PTB-XL')).click();
  assert.equal(w.document.querySelectorAll('.areale').length,60);
  assert.match(w.document.querySelector('#realSummary').textContent,/21.799/);
  const validation=w.document.querySelector('#realValidation');validation.value='validated';validation.dispatchEvent(new w.Event('change'));
  assert.match(w.document.querySelector('#agrid .ahead').textContent,/16.056/);
  const search=w.document.querySelector('#aSearch');search.value='#1';search.dispatchEvent(new w.Event('input'));h.advance(180);
  assert.equal(w.document.querySelectorAll('.areale').length,1);
  const rec=Object.assign(P.decodeWFDB(fixture.header,bytes()),{ptb:JSON.parse(read('atlante-reale/dettagli/0.json'))['1'],offline:true});
  w.ISO_PTBXL.load=async()=>rec;
  await A.apriReale(A.real.voci[0]);
  assert.equal(A.S.view,'trace');assert.equal(A.S.playing,true);assert.equal(A.stream.fs,500);
  assert.equal(w.document.querySelector('#recordBar').hidden,false);
  assert.match(w.document.querySelector('#p-card').textContent,/Validazione umana/);
  w.document.querySelector('#playBtn').click();assert.equal(A.S.playing,false);
  w.document.querySelector('#slowSeg [data-t="0.25"]').click();assert.equal(A.S.slow,.25);
  A.mon.t=7000;w.document.querySelector('#recordRestart').click();assert.equal(A.mon.t,0);assert.equal(A.S.playing,true);
  assert.equal(h.errors.length,0);
});

test('Una registrazione lenta non riapre il Tracciato dopo la navigazione altrove', async t => {
  const h=app();t.after(h.close);const {A,w}=h;
  w.fetch=async()=>({ok:true,json:async()=>catalog});await A.caricaIndiceReale();
  let finish;w.ISO_PTBXL.load=()=>new Promise(resolve=>{finish=resolve;});
  const loading=A.apriReale(A.real.voci[0]);A.showView('theory');
  finish(Object.assign(P.decodeWFDB(fixture.header,bytes()),{offline:false}));await loading;
  assert.equal(A.S.view,'theory');assert.notEqual(A.stream.cfg.mode,'sampled');assert.equal(h.errors.length,0);
});
