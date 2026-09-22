const test = require('node:test');
const assert = require('node:assert/strict');
const E = require('../engine.js'), D = require('../data.js');
const { app } = require('./harness.cjs');
const byId = Object.fromEntries(D.SCENARIOS.map(s => [s.id, s]));
const cfg = id => byId[id].build(Object.fromEntries(byId[id].params.map(p => [p.k, p.def])));
const pick = (h, type) => h.w.document.querySelector('[data-device="' + type + '"]').click();
const status = h => h.w.document.querySelector('#defStato').textContent;
const tick = (h, dt) => { h.A.mon.t += dt; h.A.defTick(); h.A.stream.ensure(h.A.mon.t); };
const click = h => h.w.document.querySelector('#defBtn').click();

for (const type of ['pm', 'icd', 'crtd']) test(type + ': BAV III stimolato e rimozione reversibile', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  A.store.params.bav3 = { ar: 91, escape: 'v' }; A.loadScenario('bav3', false);
  const original = JSON.stringify(A.curCfg);
  pick(h, type); A.stream.ensure(16000);
  assert.equal(w.document.querySelector('#deviceBar').hidden, false);
  const events = A.stream.ev.filter(e => e.kind === 'V' && e.t > 5000);
  assert.ok(events.length > 5); assert.ok(events.every(e => e.meta.paced));
  assert.ok(A.stream.ev.some(e => e.kind === 'A' && e.meta.blocked));
  assert.equal(A.curCfg.pacing.type, type === 'crtd' ? 'crt' : 'vvi');
  assert.ok(events.every(e => e.meta.w === (type === 'crtd' ? 130 : 160)));
  assert.ok(events.every(e => e.comps.some(c => c.t === -2 && c.sl === 1.1)));
  tick(h, 20000); assert.equal(A.stream.scariche.length, 0);
  w.document.querySelector('#deviceRemove').click();
  // t0 follows the current monitor time; pathology and selected parameters remain identical.
  const restored = {...A.curCfg, t0:0}; assert.equal(JSON.stringify(restored), original);
  assert.equal(w.document.querySelector('#deviceBar').hidden, true);
  assert.equal(A.DEF.coda.length, 0); assert.equal(h.errors.length, 0);
});

test('VVI: i ventricoli spontanei più rapidi inibiscono tutti gli spike', () => {
  const st = new E.Stream({rate:95, pr:160, pacing:{type:'vvi',rate:60}}, 7); st.ensure(30000);
  assert.ok(st.ev.filter(e => e.kind === 'V').every(e => !e.meta.paced));
});

test('VVI: la frequenza minima copre le pause e non cancella le P native', () => {
  const base = cfg('arrestosinusale'), native = new E.Stream(base, 7);
  const st = new E.Stream({...base, pacing:{type:'vvi',rate:70}}, 7);
  native.ensure(30000); st.ensure(30000);
  const v = st.ev.filter(e => e.kind === 'V' && e.t < 30000);
  assert.ok(v.some(e => e.meta.paced));
  for (let i = 1; i < v.length; i++) assert.ok(v[i].t - v[i-1].t <= 60000/70 + .01);
  assert.deepEqual(st.ev.filter(e => e.kind === 'A' && e.t < 29000), native.ev.filter(e => e.kind === 'A' && e.t < 29000));
});

test('CRT: morfologia diversa dal VVI e tracking atriale con limite superiore', () => {
  const st = new E.Stream({...cfg('bav3'), rate:180, pacing:{type:'crt',rate:70}},7); st.ensure(16000);
  const v = st.ev.filter(e => e.kind === 'V' && e.t > 4000);
  assert.ok(v.every(e => e.meta.type === 'paced-crt'));
  for(let i=1;i<v.length;i++) assert.ok(v[i].t-v[i-1].t>=400);
  assert.notDeepEqual(E.M.qrsCRT().c, E.M.qrsPaced().c);
});

for (const id of ['asistolia','pea','bav3','fa']) test('DAE: '+id+' resta non defibrillabile', t => {
  const h=app();t.after(h.close);h.A.loadScenario(id,false);pick(h,'dae');
  click(h);assert.match(status(h),/Analisi/);assert.equal(h.w.document.querySelector('#defBtn').disabled,true);
  tick(h,2600);assert.match(status(h),/Ritmo non defibrillabile/);
  click(h);tick(h,10000);assert.equal(h.A.stream.scariche.length,0);
});

test('DAE: FV → analisi → scarica → nuova analisi del ritmo risultante', t => {
  const h=app();t.after(h.close);h.A.loadScenario('fv',false);pick(h,'dae');
  click(h);tick(h,2600);assert.match(status(h),/Ritmo defibrillabile/);
  assert.equal(h.A.stream.scariche.length,0);click(h);tick(h,1600);
  assert.equal(h.A.stream.scariche.length,1);tick(h,1800);
  assert.equal(h.A.stream.cfg.cont,undefined);click(h);tick(h,2600);
  assert.match(status(h),/Ritmo non defibrillabile/);assert.equal(h.A.stream.scariche.length,1);
});

test('DAE: TV con polso non autorizza la scarica; senza polso sì', t => {
  const h=app();t.after(h.close);h.A.loadScenario('tv',false);pick(h,'dae');
  click(h);tick(h,2600);assert.match(status(h),/Polso presente/);
  const pulse=h.w.document.querySelector('#devicePulse');pulse.value='absent';pulse.dispatchEvent(new h.w.Event('change'));
  click(h);tick(h,2600);assert.match(status(h),/Ritmo defibrillabile/);
});

for (const type of ['icd','crtd']) test(type+': FV riceve una scarica automatica, asistolia/PEA nessuna', t => {
  const h=app();t.after(h.close);h.A.loadScenario('fv',false);pick(h,type);
  tick(h,2400);tick(h,2200);tick(h,5800);assert.equal(h.A.stream.scariche.length,1);
  for(const id of ['asistolia','pea']) {
    h.A.loadScenario(id,false);pick(h,type);tick(h,15000);
    assert.equal(h.A.stream.scariche.length,0);assert.equal(h.A.stream.cfg.pacing,undefined);
    assert.equal(h.A.stream.cfg.mode,cfg(id).mode);
  }
});

test('Rimozione, cambio dispositivo/caso/parametro e registrazioni annullano la terapia', t => {
  const h=app();t.after(h.close);
  for(const cancel of [
    ()=>pick(h,'none'), ()=>pick(h,'pm'), ()=>h.A.loadScenario('bav3',false),
    ()=>{h.A.setParam(byId.fv,'amp','0.2');h.advance(100);},
    ()=>h.A.apriDigitalizzato('ari141')
  ]) {
    h.A.loadScenario('fv',false);pick(h,'dae');click(h);tick(h,2600);click(h);
    cancel();const st=h.A.stream;tick(h,20000);assert.equal(h.A.stream,st);
    assert.equal(st.scariche?.length||0,0);assert.equal(h.A.DEF.coda.length,0);
  }
});

test('Pausa e rallentamento: il tempo reale non fa partire la scarica', t => {
  const h=app();t.after(h.close);h.A.loadScenario('fv',false);pick(h,'icd');
  h.A.S.playing=false;h.advance(30000);h.A.defTick();assert.equal(h.A.stream.scariche.length,0);
  tick(h,2400);assert.match(status(h),/conferma/);
});

test('ATP limitata alla TV monomorfa: non converte artificialmente la FV', t => {
  const h=app();t.after(h.close);h.A.store.params.icd={ritmo:'fv',terapia:'atp'};
  h.A.loadScenario('icd',false);tick(h,15000);assert.match(status(h),/ATP non adatta/);
  assert.equal(h.A.stream.cfg.cont,'vf');assert.equal(h.A.stream.scariche.length,0);
  h.A.store.params.icd={ritmo:'tvsp',terapia:'auto'};h.A.loadScenario('icd',false);
  tick(h,5200);assert.equal(h.A.stream.cfg.vRate,250);tick(h,2700);
  assert.equal(h.A.stream.cfg.rate,74);assert.equal(h.A.stream.scariche.length,0);
});

test('Tutti i quadri con i dispositivi producono segnali finiti e nessun errore UI', t => {
  const h=app();t.after(h.close);
  for(const sc of D.SCENARIOS) for(const type of ['pm','dae','icd','crtd']) {
    h.A.loadScenario(sc.id,false);pick(h,type);h.A.stream.ensure(15000);
    const v=[0,0,0],l=[];h.A.stream.vec(10000,v);h.A.stream.leads(10000,v,l);
    assert.ok(l.every(Number.isFinite),sc.id+' '+type);
  }
  assert.equal(h.errors.length,0);
});
