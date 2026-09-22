const test = require('node:test');
const assert = require('node:assert/strict');
const { app, environment } = require('./harness.cjs');

// Registra le coordinate davvero inviate al canvas, senza ricostruire il layout.
function canvasRecorder() {
  const paths = []; let points = [];
  const ctx = new Proxy({
    beginPath() { points = []; },
    moveTo(x, y) { points.push([x, y]); },
    lineTo(x, y) { points.push([x, y]); },
    stroke() { paths.push({ color: ctx.strokeStyle, points: [...points] }); },
    measureText() { return { width: 0 }; }
  }, { get: (o, k) => k in o ? o[k] : () => {} });
  return { ctx, paths };
}
function horizontalGrid(paths, color) {
  return paths.filter(p => p.color === color && p.points.length === 2 && p.points[0][1] === p.points[1][1]).map(p => p.points[0][1]);
}
const near = (a, b) => Math.abs(a - b) < 1e-7;

test('Zero e impulso di calibrazione coincidono con righe principali a ogni formato e densità', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  const gridColor = w.getComputedStyle(w.document.documentElement).getPropertyValue('--grid2').trim();
  const traceColor = w.getComputedStyle(w.document.documentElement).getPropertyValue('--trace').trim();
  A.cmpShow();
  const monitors = [A.mon, A.qmon, A.CMP.A.mon, A.CMP.B.mon];
  for (const mon of monitors) for (const mode of ['print', 'live']) for (const width of [390, 834, 1365]) for (const dpr of [1, 1.5, 2]) {
    Object.defineProperty(mon.cv.parentElement, 'clientWidth', { value: width, configurable: true });
    Object.defineProperty(w, 'devicePixelRatio', { value: dpr, configurable: true });
    for (const availableLeads of [undefined, ['II'], ['I', 'II', 'V1']]) {
      let voltage = 0;
      const st = { availableLeads, cfg: {}, ensure() {}, vec() {}, prune() {}, hasLead() { return true; }, leads(t, v, out) { out.fill(voltage); } };
      const bg = canvasRecorder(); mon.bg.getContext = () => bg.ctx; mon.mode = mode;
      mon.setStream(st);
      const grid = horizontalGrid(bg.paths, gridColor);
      const pulses = bg.paths.filter(p => p.color === traceColor && p.points.length === 6);
      assert.ok(pulses.length > 0);
      pulses.forEach(p => {
        assert.ok(grid.some(y => near(y, p.points[0][1])));
        assert.ok(near(p.points[1][1] - p.points[2][1], mon.gain * mon.pxmm * dpr));
      });
      // Un valore sopra/sotto lo zero deve conservare segno e ampiezza, mai essere appiattito.
      for (voltage of [0, 0.2, -0.2]) {
        mon.setStream(st); const seen = new Set();
        for (const fraction of mode === 'print' && !availableLeads ? [0.01, 0.26, 0.51, 0.76] : [0.01]) {
          mon.t = mon.pageMs() * fraction; mon.draw(true);
          mon.panels.forEach((p, i) => {
            if (!mon.last[i]) return;
            seen.add(i);
            assert.ok(grid.some(y => near(y, p.base * dpr)), `${mode}, ${width}px, DPR ${dpr}, ${p.id}: zero fuori griglia`);
            assert.ok(near(p.base * dpr - mon.last[i][1], voltage * mon.gain * mon.pxmm * dpr));
          });
        }
        assert.equal(seen.size, mon.panels.length);
      }
    }
  }
});

test('Striscia continua: ogni riga a zero coincide con una riga principale', t => {
  const h = app(); t.after(h.close); const { A, w } = h;
  A.stream.vec = () => {}; A.stream.leads = (t, v, out) => out.fill(0);
  A.mon.t = 45000;
  const recording = canvasRecorder(); w.document.querySelector('#stCv').getContext = () => recording.ctx;
  A.stripOn(true); h.frames.at(-1)();
  const style = w.getComputedStyle(w.document.documentElement);
  const grid = horizontalGrid(recording.paths, style.getPropertyValue('--grid2').trim());
  const traces = recording.paths.filter(p => p.color === style.getPropertyValue('--trace').trim() && p.points.length > 10);
  assert.ok(traces.length >= 3);
  traces.forEach(p => p.points.forEach(([, y]) => assert.ok(grid.some(gy => near(gy, y)))));
});

test('Revisione dei tracciati: zero sulla griglia anche con registrazioni a 12 derivazioni', t => {
  const h = environment('revisione.html'); t.after(h.close); const { w } = h;
  const d = Buffer.alloc(20).toString('base64');
  const leads = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
  w.ISO_ATLANTE_DIG = { zero: { t: 'Zero', f: 'Test', n: 10, fs: 100, d: Object.fromEntries(leads.map(l => [l, d])) } };
  const recording = canvasRecorder(); w.HTMLCanvasElement.prototype.getContext = () => recording.ctx;
  w.eval([...w.document.scripts].find(s => !s.src).textContent);
  h.frames.forEach(f => f());
  const style = w.getComputedStyle(w.document.documentElement);
  const grid = horizontalGrid(recording.paths, style.getPropertyValue('--grid2').trim());
  const traces = recording.paths.filter(p => p.color === style.getPropertyValue('--trace').trim() && p.points.length === 10);
  assert.equal(traces.length, 12);
  traces.forEach(p => p.points.forEach(([, y]) => assert.ok(grid.some(gy => near(gy, y)))));
});

test('Tracciato e quiz partono senza rumore artificiale', t => {
  const h = app(); t.after(h.close);
  assert.equal(h.A.S.noise, 0); assert.equal(h.A.stream.noise, 0);
  const sc = h.w.ISO_DATA.SCENARIOS.find(s => s.id === 'normale');
  assert.equal(h.w.ISO_QUIZ.create(sc, 42).cfg.noise, 0);
});
