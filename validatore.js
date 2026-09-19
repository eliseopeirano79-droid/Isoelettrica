/* Isoelettrica — validatore dei tracciati
   Genera ogni quadro della libreria con i valori tipici, misura quello che esce
   davvero dal motore e lo confronta con i criteri diagnostici.
   Uso:  node validatore.js            (tutti i quadri)
         node validatore.js wenck ivs  (solo alcuni)
*/
'use strict';
const E = require('./engine.js');
const D = require('./data.js');
const IP = require('./ipertrofie.js');
const { Stream, LEADS } = E;

const DUR = 24000;                       // ms di tracciato da analizzare
const f1 = x => (Math.round(x * 10) / 10).toString().replace('.', ',');

function genera(sc, p, seed) {
  const cfg = sc.build(p || valoriTipici(sc));
  cfg.noise = 0;
  const st = new Stream(cfg, seed || 11);
  st.ensure(DUR);
  return st;
}
function valoriTipici(sc) { const p = {}; (sc.params || []).forEach(q => { p[q.k] = q.def; }); return p; }

function eventi(st) {
  const V = st.ev.filter(e => e.kind === 'V' && e.t <= DUR).sort((a, b) => a.t - b.t);
  const A = st.ev.filter(e => e.kind === 'A' && e.t <= DUR).sort((a, b) => a.t - b.t);
  return { V, A };
}
// PR dei battiti condotti: distanza fra la P non bloccata e il QRS che la segue
function serieePR(st) {
  const { V, A } = eventi(st);
  const out = [];
  V.filter(v => v.meta.type === 'conducted').forEach(v => {
    const a = A.filter(x => x.t < v.t && v.t - x.t < 520 && x.meta.type === 'sinus' && !x.meta.blocked).slice(-1)[0];
    if (a) out.push({ t: v.t, pr: Math.round(v.t - a.t) });
  });
  return out;
}
const rrDi = ev => ev.slice(1).map((e, i) => Math.round(e.t - ev[i].t));

/* ---------- controlli ---------- */
const CHK = {};

CHK.wenck = st => {
  const pr = serieePR(st).map(x => x.pr);
  const { V, A } = eventi(st);
  const bloccate = A.filter(a => a.meta.blocked).length;
  const m = [];
  // raggruppa i PR in cicli: un nuovo ciclo inizia quando il PR torna al minimo
  const min = Math.min.apply(null, pr);
  const cicli = []; let cur = [];
  pr.forEach(x => { if (x === min && cur.length) { cicli.push(cur); cur = [x]; } else cur.push(x); });
  if (cur.length) cicli.push(cur);
  const pieni = cicli.filter(c => c.length >= 3);
  if (!pieni.length) return ['non ho trovato cicli completi di Wenckebach'];
  const c = pieni[0];
  for (let i = 1; i < c.length; i++) if (c[i] <= c[i - 1]) m.push('il PR non cresce: ' + c.join(' → ') + ' ms');
  const inc = c.slice(1).map((x, i) => x - c[i]);
  for (let i = 1; i < inc.length; i++) if (inc[i] >= inc[i - 1]) m.push('gli incrementi del PR non decrescono: ' + inc.join(', ') + ' ms');
  if (!bloccate) m.push('nessuna P bloccata');
  const rr = rrDi(V);
  const pausa = Math.max.apply(null, rr), breve = Math.min.apply(null, rr);
  if (pausa >= 2 * breve) m.push('la pausa (' + pausa + ' ms) non è inferiore al doppio del RR più breve (' + breve + ' ms)');
  m.push('INFO PR del ciclo: ' + c.join(' → ') + ' ms; incrementi ' + inc.join(', ') + ' ms; RR ' + breve + '–' + pausa + ' ms');
  return m;
};

CHK.mobitz2 = st => {
  const pr = serieePR(st).map(x => x.pr);
  const m = [];
  const span = Math.max.apply(null, pr) - Math.min.apply(null, pr);
  if (span > 12) m.push('il PR non è costante (variazione ' + span + ' ms)');
  if (!eventi(st).A.filter(a => a.meta.blocked).length) m.push('nessuna P bloccata');
  m.push('INFO PR ' + Math.round(pr.reduce((a, b) => a + b, 0) / pr.length) + ' ms costante');
  return m;
};

CHK.bav1 = st => {
  const pr = serieePR(st).map(x => x.pr); const m = [];
  const med = pr.reduce((a, b) => a + b, 0) / pr.length;
  if (med <= 200) m.push('PR medio ' + Math.round(med) + ' ms: sotto i 200 ms non è un BAV di I grado');
  if (eventi(st).A.filter(a => a.meta.blocked).length) m.push('ci sono P bloccate: non è un BAV di I grado puro');
  m.push('INFO PR ' + Math.round(med) + ' ms');
  return m;
};

CHK.bav3 = st => {
  const { V, A } = eventi(st); const m = [];
  const fa = 60000 / (rrDi(A).reduce((a, b) => a + b, 0) / (A.length - 1));
  const fv = 60000 / (rrDi(V).reduce((a, b) => a + b, 0) / (V.length - 1));
  if (fa <= fv) m.push('la frequenza atriale (' + Math.round(fa) + ') non supera la ventricolare (' + Math.round(fv) + ')');
  const pr = V.map(v => { const a = A.filter(x => x.t < v.t).slice(-1)[0]; return a ? v.t - a.t : null; }).filter(x => x != null);
  const span = Math.max.apply(null, pr) - Math.min.apply(null, pr);
  if (span < 120) m.push('il PR è troppo costante (' + Math.round(span) + ' ms): non sembra dissociazione');
  m.push('INFO atri ' + Math.round(fa) + '/min, ventricoli ' + Math.round(fv) + '/min');
  return m;
};

CHK.bsa2t1 = st => {
  const { A } = eventi(st); const m = [];
  const pp = rrDi(A);
  const pausa = Math.max.apply(null, pp), breve = Math.min.apply(null, pp);
  if (pausa >= 2 * breve) m.push('la pausa (' + pausa + ' ms) non è inferiore al doppio del PP più breve (' + breve + ' ms)');
  m.push('INFO PP ' + pp.slice(0, 8).join(', ') + ' ms');
  return m;
};

const larghezza = st => { const V = eventi(st).V.filter(v => v.meta.w); return V.length ? V[V.length - 1].meta.w : null; };
const qrsLargo = min => st => {
  const w = larghezza(st);
  return w >= min ? ['INFO QRS ' + Math.round(w) + ' ms'] : ['QRS ' + Math.round(w) + ' ms: sotto i ' + min + ' ms richiesti'];
};
CHK.bbdx = qrsLargo(120); CHK.bbsx = qrsLargo(120); CHK.tv = qrsLargo(120);
CHK.eas = st => { const w = larghezza(st); return w < 120 ? ['INFO QRS ' + Math.round(w) + ' ms'] : ['QRS ' + Math.round(w) + ' ms: negli emiblocchi deve restare < 120 ms']; };
CHK.eps = CHK.eas;

CHK.ivs = st => {
  const a = st.qrsAmplitudes(DUR - 2000); const m = [];
  if (!a) return ['non riesco a misurare il QRS'];
  const r = IP.calcola(a, { sesso: 'M' });
  const sl = r.sinistra[0];
  if (!sl.positivo) m.push('Sokolow-Lyon ' + f1(sl.valoreMm) + ' mm: sotto i 35 mm non soddisfa il criterio');
  m.push('INFO Sokolow ' + f1(sl.valoreMm) + ' mm, Cornell ' + f1(r.sinistra[2].valoreMm) + ' mm');
  return m;
};
CHK.ivd = st => {
  const a = st.qrsAmplitudes(DUR - 2000); const m = [];
  if (!a) return ['non riesco a misurare il QRS'];
  const r = IP.calcola(a, { sesso: 'M' });
  if (!r.destra[0].positivo) m.push('Sokolow destro ' + f1(r.destra[0].valoreMm) + ' mm: sotto 10,5 mm');
  if (!r.destra[1].positivo) m.push('R/S in V1 = ' + f1(r.destra[1].rapporto) + ': dovrebbe superare 1');
  m.push('INFO Sokolow dx ' + f1(r.destra[0].valoreMm) + ' mm, R/S V1 ' + f1(r.destra[1].rapporto));
  return m;
};

CHK.wpw = st => {
  const pr = serieePR(st).map(x => x.pr); const m = [];
  const med = pr.reduce((a, b) => a + b, 0) / pr.length;
  if (med >= 120) m.push('PR ' + Math.round(med) + ' ms: nella pre-eccitazione deve essere < 120 ms');
  const w = larghezza(st);
  if (w <= 110) m.push('QRS ' + Math.round(w) + ' ms: manca l’allargamento da onda delta');
  m.push('INFO PR ' + Math.round(med) + ' ms, QRS ' + Math.round(w) + ' ms');
  return m;
};

CHK.fa = st => {
  const rr = rrDi(eventi(st).V); const m = [];
  const med = rr.reduce((a, b) => a + b, 0) / rr.length;
  const cv = Math.sqrt(rr.reduce((s, x) => s + (x - med) * (x - med), 0) / rr.length) / med;
  if (cv < 0.08) m.push('gli RR sono troppo regolari (variabilità ' + Math.round(cv * 100) + '%) per una fibrillazione');
  if (eventi(st).A.filter(a => a.meta.type === 'sinus').length) m.push('ci sono onde P sinusali: incompatibile con la fibrillazione');
  m.push('INFO variabilità RR ' + Math.round(cv * 100) + '%');
  return m;
};

/* controllo generico: coerenza di frequenza e QT su tutti i quadri con ritmo */
function generico(sc, st) {
  const m = []; const { V } = eventi(st);
  if (st.cfg.mode === 'continuous') return m;
  if (V.length < 4) { m.push('meno di 4 complessi in ' + DUR / 1000 + ' s'); return m; }
  const rr = rrDi(V), med = rr.reduce((a, b) => a + b, 0) / rr.length;
  const fc = 60000 / med;
  if (fc < 12 || fc > 320) m.push('frequenza fuori scala: ' + Math.round(fc) + '/min');
  const b = V[V.length - 1];
  if (b.meta.qt && b.meta.qt > med * 0.95 && st.cfg.cont !== 'torsade' && sc.id !== 'flutterv') m.push('il QT (' + Math.round(b.meta.qt) + ' ms) occupa quasi tutto il ciclo (' + Math.round(med) + ' ms)');
  return m;
}

/* ---------- esecuzione ---------- */
const solo = process.argv.slice(2);
let nErr = 0, nOk = 0;
D.SCENARIOS.forEach(sc => {
  if (solo.length && solo.indexOf(sc.id) < 0) return;
  let st;
  try { st = genera(sc); } catch (err) { console.log('✗ ' + sc.id + ' — errore in build: ' + err.message); nErr++; return; }
  const msg = [].concat(generico(sc, st), CHK[sc.id] ? CHK[sc.id](st) : []);
  const err = msg.filter(x => x.indexOf('INFO') !== 0);
  const info = msg.filter(x => x.indexOf('INFO') === 0).map(x => x.slice(5));
  if (err.length) { nErr++; console.log('✗ ' + sc.id + ' — ' + sc.name); err.forEach(x => console.log('    ' + x)); info.forEach(x => console.log('    · ' + x)); }
  else { nOk++; console.log('✓ ' + sc.id + (info.length ? '  — ' + info.join(' | ') : '')); }
});
console.log('\n' + nOk + ' quadri conformi, ' + nErr + ' da rivedere.');
