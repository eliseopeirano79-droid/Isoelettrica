const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const E = require('../engine.js'), D = require('../data.js'), Q = require('../quiz.js'), IP = require('../ipertrofie.js');
const { read, environment, app } = require('./harness.cjs');
const byId = Object.fromEntries(D.SCENARIOS.map(s => [s.id, s]));
const defaults = sc => Object.fromEntries(sc.params.map(p => [p.k, p.def]));

test('1.260 casi di quiz generati senza errori, con criteri diagnostici stabili', () => {
  for (const sc of D.SCENARIOS.filter(s => s.quiz)) for (let seed = 1; seed <= 15; seed++) {
    const c = Q.create(sc, seed * 71);
    assert.ok(Q.valid(sc, c.p, c.cfg, c.seed), sc.id);
    assert.equal(c.cfg.varSeed, undefined);
  }
});
test('Mille ECG normali del quiz restano nei limiti dichiarati', () => {
  for (let seed = 1; seed <= 1000; seed++) {
    const c = Q.create(byId.normale, seed);
    assert.ok(c.cfg.rate >= 60 && c.cfg.rate <= 100);
    assert.ok(c.p.axP >= 0 && c.p.axP <= 75);
    assert.ok(c.p.axis >= -30 && c.p.axis <= 90);
    assert.ok(Math.abs(c.p.axis - c.p.axT) <= 45);
  }
});
test('Quiz clinici con dati pertinenti e immagini approvate senza figure teoriche', () => {
  const valves = D.SCENARIOS.filter(s => s.cat === 'Valvulopatie' && s.quiz);
  assert.equal(valves.length, 6);
  for (const sc of valves) assert.ok(Q.context(sc).includes(sc.card.soffio));
  const images = D.ATLAS.filter(a => a.quizApproved);
  assert.equal(images.length, 78); // Approved atlas already present on main before the anatomical integration.
  assert.equal(D.ATLAS.find(a => a.id === 'lett020').quizApproved, false);
  for (const a of images) {
    assert.ok(byId[a.q]);
    if (a.quizCrop) { const [x,y,w,h] = a.quizCrop; assert.ok(x >= 0 && y >= 0 && x + w <= a.w && y + h <= a.h); }
  }
});

for (const type of ['pvc', 'pac']) for (const [pattern, normalCount, ectCount] of [
  ['bigeminismo',1,1],['trigeminismo',2,1],['quadrigeminismo',3,1],['coppie',4,2],['triplette',4,3],['salve',4,6]
]) test(type + ': ' + pattern + ' rispetta il numero di battiti', () => {
  const st = new E.Stream({rate:72,pr:160,ectopy:{type,pattern}},7); st.ensure(60000);
  const sequence = st.ev.filter(e => e.kind === 'V' && e.t > 10000 && e.t < 50000).map(e => e.meta.type === 'pvc' || e.meta.pac ? 'E' : 'N').join('');
  const groups = [...sequence.matchAll(/N+(E+)/g)];
  // Ignore the first/last group because the observation window can cut a run.
  assert.ok(groups.length >= 3);
  for (const g of groups.slice(1, -1)) { assert.equal(g[1].length, ectCount); assert.equal(g[0].length - g[1].length, normalCount); }
});

for (const id of ['normale', 'precordiali-scambiate', 'inv-braccia', 'destrocardia']) test('Voltaggi misurati sul segnale visualizzato: ' + id, () => {
  const sc = byId[id], st = new E.Stream({...sc.build(defaults(sc)),noise:0},7); st.ensure(24000);
  const amp = st.qrsAmplitudes(16000);
  const sample = t => { const v=[0,0,0], l=[]; st.vec(t,v); st.leads(t,v,l); return l; };
  const base = sample(amp.t - 40), rows = [];
  for (let dt = -10; dt <= amp.qrsMs + 14; dt += 1.5) rows.push(sample(amp.t + dt));
  E.LEADS.forEach((l,i) => {
    assert.ok(Math.abs(amp.R[l.id] - Math.max(0,...rows.map(row => row[i] - base[i]))) < .01);
    assert.ok(Math.abs(amp.S[l.id] - Math.max(0,...rows.map(row => base[i] - row[i]))) < .01);
  });
});

test('Tutti i 59 tracciati campionati distinguono canali assenti e zero reale', () => {
  const context={window:{}}; vm.runInNewContext(read('atlante-digitale.js'), context);
  const records=Object.entries(context.window.ISO_ATLANTE_DIG); assert.equal(records.length,59);
  let incomplete=0;
  for (const [id,rec] of records) {
    const st=new E.Sampled(rec), output=[];
    st.leads(1500,[0,0,0],output);
    if (st.availableLeads.length<12) incomplete++;
    E.LEADS.forEach((l,i) => assert.equal(Number.isFinite(output[i]), st.availableLeads.includes(l.id), id + ' ' + l.id));
    assert.equal(st.qrsAmplitudes(5000),null);
    const t=st.dur*30; st.ensure(t);
    if (st.battiti.length) assert.ok(st.ev.some(e=>e.t>t-st.dur && e.t<t+st.dur),id);
  }
  assert.equal(incomplete,11);
});
test('Indici indisponibili con derivazioni incomplete o QRS ignoto', () => {
  const sc=byId.ivs, st=new E.Stream(sc.build(defaults(sc)),7), amp=st.qrsAmplitudes(16000);
  assert.ok(IP.calcola(amp));
  assert.equal(IP.calcola({...amp,qrsMs:0}),null);
  delete amp.S.V3; assert.equal(IP.calcola(amp),null);
});
test('Asse -60° è sinistro e la teoria a 50 mm/s usa i fattori corretti', () => {
  const sc=byId.normale, text=sc.params.find(p=>p.k==='axis').nota({...defaults(sc),axis:-60});
  assert.match(text.testo,/sinistr/i); assert.doesNotMatch(text.testo,/nord.?ovest/i);
  const all=D.THEORY.map(t=>t.html).join('\n');
  assert.match(all,/600/); assert.match(all,/3000/); assert.match(all,/20 ms/);
  assert.doesNotMatch(all,/ERC 2021/);
});

test('Orbitali parte senza WebGL e rispetta Einthoven e Goldberger', t => {
  const h=environment('anatomia.html'); t.after(h.close); const {w}=h;
  const scripts=[...w.document.scripts].filter(s=>!s.src);
  scripts.forEach((s,i)=>w.eval(i===scripts.length-1?s.textContent.replace(/\}\)\(\);\s*$/, 'window.__signals=sig;})();'):s.textContent));
  const s=w.__signals;
  assert.ok(s); assert.match(w.document.querySelector('[role="status"]').textContent,/3D non disponibile/);
  for(let i=0;i<s.I.length;i++) {
    assert.ok(Math.abs(s.III[i]-(s.II[i]-s.I[i]))<1e-6);
    assert.ok(Math.abs(s.aVR[i]+(s.I[i]+s.II[i])/2)<1e-6);
    assert.ok(Math.abs(s.aVL[i]-(s.I[i]-s.II[i]/2))<1e-6);
    assert.ok(Math.abs(s.aVF[i]-(s.II[i]-s.I[i]/2))<1e-6);
  }
  assert.equal(h.errors.length,0);
});
test('Coronarie resta esplorabile senza WebGL', t => {
  const h=app(); t.after(h.close);
  h.w.eval(read('cuore3d.js')); h.w.eval(read('coronarie.js')); h.A.showView('cor');
  assert.match(h.w.document.querySelector('#v-cor').textContent,/3D non disponibile/);
  assert.equal(h.errors.length,0);
});
test('La carta del monoderivazione mantiene la velocità anche in modo monitor', t => {
  const h=app(); t.after(h.close); h.A.apriDigitalizzato('ari141'); const m=h.A.mon;
  for(const mode of ['print','monitor']) for(const speed of [25,50]) {
    m.mode=mode;m.speed=speed;m.layout();
    assert.ok(Math.abs(m.groups[0].w/m.pxmm - m.pageMs()/1000*speed)<1e-8);
  }
});
