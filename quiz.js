/* Casi riproducibili: i limiti del laboratorio non sono i limiti del quiz. */
(function (root) {
'use strict';
const E = root.ECG || require('./engine.js');
const ranges = {
  'normale.hr': [64, 94], 'normale.pr': [140, 185], 'normale.qtc': [380, 430],
  'normale.axis': [20, 70], 'normale.axP': [25, 65], 'normale.axT': [15, 70],
  'iperk.k': [6.4, 8.6], 'ipok.k': [1.9, 2.9], 'qtlungo.qtc': [500, 620],
  'bav1.pr': [240, 380], 'wpw.pr': [88, 112], 'pericardite.st': [1.5, 3.5],
  'aritmiasinusale.sa': [12, 28], 'esa.prob': [18, 40]
};
function params(sc, random) {
  const p = {}, R = random || Math.random;
  sc.params.forEach(q => {
    if (q.type === 'select') {
      // Acute STEMI questions require an acute diagnostic pattern.
      p[q.k] = sc.id.startsWith('stemi') && q.k === 'fase' ? '1' : q.opts[Math.floor(R() * q.opts.length)][0];
      return;
    }
    let r = ranges[sc.id + '.' + q.k];
    if (!r && q.k === 'hr') r = [Math.max(q.min, q.def * 0.94), Math.min(q.max, q.def * 1.06)];
    if (!r && sc.id.startsWith('stemi') && q.k === 'st') r = [2.5, 5];
    // Unknown diagnostic parameters retain their validated typical value.
    p[q.k] = r ? Math.max(q.min, Math.min(q.max, Math.round((r[0] + R() * (r[1] - r[0])) / q.step) * q.step)) : q.def;
  });
  if (sc.id === 'normale') p.axT = Math.max(p.axis - 35, Math.min(p.axis + 35, p.axT));
  return p;
}
function valid(sc, p, cfg, seed) {
  if (sc.id === 'normale') {
    if (cfg.rate < 60 || cfg.rate > 100 || p.axP < 0 || p.axP > 75 || p.axis < -30 || p.axis > 90 || Math.abs(p.axT - p.axis) > 45) return false;
  }
  const st = new E.Stream(Object.assign({}, cfg, { noise: 0 }), seed), v = [0, 0, 0], lv = [];
  st.ensure(12000);
  for (let t = 7000; t < 10000; t += 23) { st.vec(t, v); st.leads(t, v, lv); if (!lv.every(Number.isFinite)) return false; }
  const amp = st.qrsAmplitudes(10000);
  if (sc.id === 'normale' && (!amp || amp.qrsMs >= 120)) return false;
  if (sc.id === 'ivs' || sc.id === 'ivs-eas' || sc.id === 'stenosi-aortica') {
    if (!amp || amp.S.V1 + Math.max(amp.R.V5, amp.R.V6) < 3.5) return false;
  }
  if (sc.id === 'bav1' && cfg.pr <= 200) return false;
  if (sc.id === 'wpw' && cfg.pr >= 120) return false;
  return true;
}
function create(sc, seed) {
  const R = E.rng(seed), defaults = Object.fromEntries(sc.params.map(q => [q.k, q.def]));
  for (let n = 0; n < 25; n++) {
    const p = n === 24 ? defaults : params(sc, R), cfg = sc.build(p);
    cfg.noise = 0;
    // No hidden axis/rate/voltage variation after diagnostic validation.
    if (valid(sc, p, cfg, seed)) return { p, cfg, seed };
  }
  throw new Error('Il caso non rispetta i criteri del quiz: ' + sc.id);
}
function context(sc) {
  if (sc.cat === 'Valvulopatie') return 'All’auscultazione: ' + sc.card.soffio + ' Integra questi dati con l’ECG: eziologia e gravità richiedono la valutazione clinica ed ecocardiografica.';
  if (sc.id === 'nstemi') return 'Dolore toracico compatibile con ischemia e aumento/calo della troponina sopra il limite di riferimento. Integra i dati clinici con il tracciato.';
  return '';
}
const API = { params, valid, create, context };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_QUIZ = API;
})(typeof window !== 'undefined' ? window : this);
