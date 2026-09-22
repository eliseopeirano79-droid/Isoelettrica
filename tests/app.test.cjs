const test = require('node:test');
const assert = require('node:assert/strict');
const { app, environment, read } = require('./harness.cjs');

for (const onlyGuidelines of [false, true]) test('App utilizzabile senza WebGL, modalità linee guida=' + onlyGuidelines, t => {
  const h = app({ onlyGuidelines }); t.after(h.close);
  assert.equal(h.A.scene.available, false);
  assert.equal(h.w.document.querySelectorAll('#libList .item').length, 102);
  assert.match(h.w.document.querySelector('.scene-notice').textContent, /ECG/);
  h.A.loadScenario('fa', false); assert.equal(h.A.S.sc, 'fa');
  assert.equal(h.errors.length, 0);
});

test('Un parametro in attesa non sovrascrive il nuovo scenario o un ECG registrato', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  const normal = w.ISO_DATA.SCENARIOS.find(s => s.id === 'normale');
  A.setParam(normal, 'hr', 90); A.loadScenario('fa', true); const st = A.stream;
  h.advance(100); assert.equal(A.stream, st); assert.equal(A.S.sc, 'fa');
  A.loadScenario('normale', false); A.setParam(normal, 'hr', 80); A.apriDigitalizzato('ari141');
  h.advance(100); assert.equal(A.stream.cfg.mode, 'sampled');
});

test('Scariche manuali e code ICD vengono annullate al cambio di caso', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  A.loadScenario('dae', false); w.document.querySelector('#defBtn').click();
  A.loadScenario('normale', false); const st = A.stream;
  h.advance(2700); assert.equal(A.stream, st); assert.equal(st.scariche.length, 0);
  A.loadScenario('icd', false); assert.ok(A.DEF.coda.length);
  A.apriDigitalizzato('ari141'); assert.equal(A.DEF.coda.length, 0);
  A.mon.t = 20000; A.defTick(); assert.equal(A.stream.cfg.mode, 'sampled');
});

test('Il cambio PVC/PAC aggiorna lo schema ricorrente', t => {
  const h = app(); t.after(h.close); const { A } = h;
  A.S.ectPat = 'bigeminismo'; A.loadScenario('normale', false); A.ectopia('pac');
  assert.equal(A.curCfg.ectopy.type, 'pac'); assert.equal(A.curCfg.ectopy.pattern, 'bigeminismo');
});

test('La sede del blocco AV e la perdita del contesto grafico sono gestite', t => {
  const h=app({renderer:true});t.after(h.close);const {A,w}=h;
  assert.equal(A.scene.available,true);
  for(const [id,site] of [['wenck','nodale'],['mobitz2','infranodale'],['bav21','non definita']]) {
    const sc=w.ISO_DATA.SCENARIOS.find(s=>s.id===id);
    // Scenario identifiers are checked before exercising the actual scene update.
    assert.ok(sc,id);A.loadScenario(id,false);A.stream.ensure(15000);
    const blocked=A.stream.ev.find(e=>e.kind==='A'&&e.meta.blocked);assert.ok(blocked,id);
    A.scene.update(blocked.t+160,A.stream);assert.match(A.scene.phase,new RegExp(site));
  }
  A.scene.renderer.domElement.dispatchEvent(new w.Event('webglcontextlost',{cancelable:true}));
  assert.equal(A.scene.available,false);A.loadScenario('normale',false);assert.equal(A.S.sc,'normale');
});

test('Apri nel Tracciato conserva esattamente il caso del quiz', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  w.Math.random = w.ECG.rng(417); A.Q.mode = 'gen'; A.newQuestion();
  const qstream = A.Q.stream; qstream.ensure(12000);
  A.answer(w.document.querySelector('#qRight .opts button[data-id="' + A.Q.cur.sc.id + '"]'));
  w.document.querySelector('#qOpen').click(); A.stream.ensure(12000);
  for (let ms = 3000; ms < 9000; ms += 43) {
    const sample = st => { const v = [0,0,0], l = []; st.vec(ms, v); st.leads(ms, v, l); return l; };
    assert.deepEqual(sample(A.stream), sample(qstream));
  }
  assert.equal(A.mon.t, A.qmon.t); assert.equal(h.errors.length, 0);
});

test('Il confronto conserva parametri, tracciati e tempo durante scambio e ritorno', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  A.cmpShow(); A.CMP.A.p.hr = 140; A.cmpBuild('A', false);
  A.CMP.A.mon.t = 45000; A.CMP.A.mon.pageStart = 40000; A.CMP.A.st.ensure(45000); A.CMP.A.st.prune(43000);
  const st = A.CMP.A.st, selected = A.CMP.A.sel;
  w.document.querySelector('#cmpSwap').click();
  assert.equal(A.CMP.B.p.hr, 140); assert.equal(A.CMP.B.sel, selected); assert.equal(A.CMP.B.st, st);
  A.cmpShow(); assert.equal(A.CMP.B.mon.t, 45000); assert.equal(A.CMP.B.mon.pageStart, 40000);
  A.store.params.normale = { hr: 90 }; A.cmpLoad('A', 'normale');
  w.document.querySelector('#cmpParA .btn').click(); assert.equal(A.CMP.A.p.hr, 72);
});

test('Il monoderivazione mostra solo II e non produce indici automatici', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  A.apriDigitalizzato('ari141');
  assert.deepEqual(Array.from(A.mon.panels, p => p.id), ['II']);
  assert.equal(A.stream.qrsAmplitudes(5000), null);
  A.renderVolt(); assert.match(w.document.querySelector('#p-volt').textContent, /non disponibili|non applicabili|non sono disponibili/);
  assert.equal(h.errors.length, 0);
});

test('Le registrazioni PTB-XL in modalità file sono integrate senza fetch obbligatorio', async t => {
  const d = Buffer.from(new Int16Array([0,20,100,10,0,-10,0,30]).buffer).toString('base64');
  const rec = { i:'fixture', t:'Ritmo sinusale', f:'PTB-XL', q:null, g:'normali', fs:100, n:8, d:{ II:d } };
  const h = app({records:[rec]}); t.after(h.close);
  await h.A.caricaIndiceReale(); assert.equal(h.A.real.voci[0].i, 'fixture');
  h.A.apriReale(h.A.real.voci[0]); assert.equal(h.A.stream.cfg.mode, 'sampled');
  assert.equal(h.A.stream.cfg.quadro, null);
});

test('La revisione ridisegna gli stessi record dopo filtro e resize', t => {
  const h = environment('revisione.html'); t.after(h.close); const { w } = h;
  w.eval(read('atlante-digitale.js'));
  const id = Object.keys(w.ISO_ATLANTE_DIG).sort()[5];
  w.localStorage.setItem('isoelettrica.revisione', JSON.stringify({[id]:{v:'ok',nota:'<b>test</b>'}}));
  w.__drawn = [];
  const source = [...w.document.scripts].find(s => !s.src).textContent.replace('function disegna(cv, rec){', 'function disegna(cv, rec){ window.__drawn.push(rec);');
  w.eval(source); w.document.querySelector('[data-f="ok"]').click();
  w.__drawn = []; w.dispatchEvent(new w.Event('resize')); h.advance(500);
  assert.equal(w.__drawn.length, 1); assert.equal(w.__drawn[0], w.ISO_ATLANTE_DIG[id]);
  assert.equal(w.document.querySelector('textarea').value, '<b>test</b>');
  assert.equal(h.errors.length, 0);
});

test('La libreria raggruppa tutti i casi una sola volta e combina filtro e ricerca', t => {
  const h=app();t.after(h.close);const {w}=h;
  const ids=[...w.document.querySelectorAll('#libList .item')].map(b=>b.dataset.id);
  assert.equal(ids.length,102);assert.equal(new Set(ids).size,102);
  const select=w.document.querySelector('#libSection');select.value='conduzione';select.dispatchEvent(new w.Event('change'));
  const shown=[...w.document.querySelectorAll('#libList .item')];
  assert.ok(shown.length>0);assert.ok(shown.every(b=>['Blocchi AV','Conduzione intraventricolare'].includes(w.ISO_DATA.SCENARIOS.find(s=>s.id===b.dataset.id).cat)));
  const search=w.document.querySelector('#q');search.value='Wenckebach';search.dispatchEvent(new w.Event('input'));
  assert.ok(w.document.querySelector('#libList [data-id="wenck"]'));assert.equal(w.document.querySelector('#libList details').open,true);
});
