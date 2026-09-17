/* Isoelettrica — motore vettoriale dell'ECG
   Coordinate: X sinistra del paziente, Y craniale, Z anteriore. 1 unità ≈ 1 mV sull'asse. */
(function (root) {
'use strict';
const DEG = Math.PI / 180;

function dirAG(a, g) { return [Math.cos(g * DEG) * Math.cos(a * DEG), -Math.cos(g * DEG) * Math.sin(a * DEG), Math.sin(g * DEG)]; }
function neg(d) { return [-d[0], -d[1], -d[2]]; }
function norm(d) { const l = Math.hypot(d[0], d[1], d[2]) || 1; return [d[0] / l, d[1] / l, d[2] / l]; }
function rng(seed) { let s = seed >>> 0; return function () { s = s + 0x6D2B79F5 | 0; let t = Math.imul(s ^ s >>> 15, 1 | s); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

const LEADS = [
  { id: 'I', p: 'F', ang: 0, g: 1 }, { id: 'II', p: 'F', ang: 60, g: 1 }, { id: 'III', p: 'F', ang: 120, g: 1 },
  { id: 'aVR', p: 'F', ang: -150, g: 0.866 }, { id: 'aVL', p: 'F', ang: -30, g: 0.866 }, { id: 'aVF', p: 'F', ang: 90, g: 0.866 },
  { id: 'V1', p: 'H', ang: 120, g: 1.0 }, { id: 'V2', p: 'H', ang: 90, g: 1.5 }, { id: 'V3', p: 'H', ang: 75, g: 1.65 },
  { id: 'V4', p: 'H', ang: 60, g: 1.6 }, { id: 'V5', p: 'H', ang: 30, g: 1.35 }, { id: 'V6', p: 'H', ang: 0, g: 1.1 }
];
LEADS.forEach(L => {
  const a = L.ang * DEG;
  L.dir = L.p === 'F' ? [Math.cos(a), -Math.sin(a), 0] : [Math.cos(a), 0, Math.sin(a)];
  L.w = [L.dir[0] * L.g, L.dir[1] * L.g, L.dir[2] * L.g];
});

/* ---------- componenti ---------- */
// bump gaussiano asimmetrico
function B(d, a, t, sl, sr) { return { k: 'b', d, a, t, sl, sr: sr == null ? sl : sr }; }
// plateau con fronti morbidi
function PL(d, a, t0, t1, e) { return { k: 'p', d, a, t0, t1, e: e || 12 }; }
function shift(comps, dt, scaleT) {
  const s = scaleT || 1;
  return comps.map(c => c.k === 'b' ? Object.assign({}, c, { t: c.t * s + dt, sl: c.sl * s, sr: c.sr * s })
    : Object.assign({}, c, { t0: c.t0 * s + dt, t1: c.t1 * s + dt, e: c.e * s }));
}
function extentOf(comps) {
  let lo = 1e9, hi = -1e9;
  comps.forEach(c => {
    if (c.k === 'b') { lo = Math.min(lo, c.t - 3.2 * c.sl); hi = Math.max(hi, c.t + 3.2 * c.sr); }
    else { lo = Math.min(lo, c.t0 - 4 * c.e); hi = Math.max(hi, c.t1 + 4 * c.e); }
  });
  return [lo, hi];
}
function sig(x) { return 1 / (1 + Math.exp(-x)); }
function evalComps(comps, tau, out) {
  for (let i = 0; i < comps.length; i++) {
    const c = comps[i]; let v;
    if (c.k === 'b') { const s = tau < c.t ? c.sl : c.sr; const x = (tau - c.t) / s; if (x > 3.4 || x < -3.4) continue; v = c.a * Math.exp(-0.5 * x * x); }
    else { if (tau < c.t0 - 5 * c.e || tau > c.t1 + 5 * c.e) continue; v = c.a * sig((tau - c.t0) / c.e * 4.4) * sig((c.t1 - tau) / c.e * 4.4); }
    out[0] += c.d[0] * v; out[1] += c.d[1] * v; out[2] += c.d[2] * v;
  }
}

/* ---------- morfologie ---------- */
const M = {};
// P sinusale: atrio destro (in avanti) poi sinistro (indietro)
M.pSinus = (amp = 1, wide = 1, ra = 1, la = 1) => [
  B(dirAG(62, 42), 0.115 * amp * ra, 34 * wide, 16 * wide, 15 * wide),
  B(dirAG(18, -48), 0.095 * amp * la, 72 * wide, 17 * wide, 17 * wide)
];
M.pWidth = (wide = 1) => 110 * wide;
M.pRetro = (amp = 1) => [B(dirAG(-95, 10), 0.11 * amp, 36, 16, 16)];
M.pLowAtrial = (amp = 1) => [B(dirAG(-80, 20), 0.12 * amp, 40, 18, 18)];
M.pLeftAtrial = (amp = 1) => [B(dirAG(40, -60), 0.13 * amp, 45, 20, 20)];

// QRS normale (onset = 0). Restituisce {c, w}
M.qrsNormal = (o = {}) => {
  const r = o.r == null ? 1 : o.r, q = o.q == null ? 1 : o.q, s = o.s == null ? 1 : o.s;
  const ax = o.aR == null ? 0 : o.aR - 50;
  return {
    w: 94, c: [
      B(dirAG(165, 45), 0.26 * q, 13, 7, 7),
      B(dirAG(40 + ax, 30), 0.62 * r, 32, 9, 9),
      B(dirAG(55 + ax, -30), 0.92 * r, 48, 10, 10),
      B(dirAG(-125, -55), 0.34 * s, 68, 9, 11)
    ]
  };
};
M.qrsRBBB = () => ({
  w: 138, c: [
    B(dirAG(165, 45), 0.26, 13, 7, 7),
    B(dirAG(40, 30), 0.55, 32, 9, 9),
    B(dirAG(55, -30), 0.85, 48, 10, 10),
    B(dirAG(178, 38), 0.66, 102, 18, 20)
  ]
});
M.qrsLBBB = () => ({
  w: 152, c: [
    B(dirAG(15, -15), 0.4, 28, 16, 16),
    B(dirAG(-5, -40), 0.9, 70, 22, 20),
    B(dirAG(-22, -32), 0.78, 110, 20, 26)
  ]
});
M.qrsLAFB = () => ({
  w: 104, c: [
    B(dirAG(120, 35), 0.3, 14, 8, 8),
    B(dirAG(-58, -8), 1.15, 46, 12, 13),
    B(dirAG(-100, -50), 0.3, 76, 10, 11)
  ]
});
M.qrsLPFB = () => ({
  w: 102, c: [
    B(dirAG(-40, 40), 0.28, 14, 8, 8),
    B(dirAG(118, -15), 1.15, 46, 12, 13),
    B(dirAG(-40, -55), 0.2, 76, 10, 11)
  ]
});
M.qrsWPW = () => ({
  w: 130, delta: 45, c: [
    B(dirAG(95, 55), 0.42, 20, 22, 20),      // onda delta: via accessoria sinistra laterale, verso destra-avanti
    B(dirAG(40, 20), 1.05, 70, 13, 12),
    B(dirAG(-110, -50), 0.3, 98, 10, 12)
  ]
});
M.qrsLVH = () => ({
  w: 100, c: [
    B(dirAG(160, 45), 0.22, 13, 7, 7),
    B(dirAG(35, -28), 2.0, 44, 13, 12),
    B(dirAG(-120, -60), 0.6, 72, 10, 12)
  ]
});
M.qrsRVH = () => ({
  w: 100, c: [
    B(dirAG(165, 45), 0.2, 13, 7, 7),
    B(dirAG(112, 38), 1.25, 42, 12, 12),
    B(dirAG(-160, -15), 0.55, 70, 11, 12)
  ]
});
M.qrsPVC_RVOT = () => ({
  w: 150, focus: 'rvot', c: [
    B(dirAG(95, -5), 0.7, 42, 26, 22),
    B(dirAG(80, -45), 1.25, 98, 24, 26)
  ]
});
M.qrsPVC_LV = () => ({
  w: 148, focus: 'lvLat', c: [
    B(dirAG(150, 40), 0.7, 40, 24, 22),
    B(dirAG(120, 55), 1.1, 96, 24, 26)
  ]
});
M.qrsVTscar = () => ({
  w: 170, focus: 'lvInf', c: [
    B(dirAG(-118, 22), 0.75, 48, 32, 28),
    B(dirAG(-150, 42), 1.15, 118, 30, 32)
  ]
});
M.qrsEscapeV = () => ({
  w: 160, focus: 'lvInf', c: [
    B(dirAG(-60, -10), 0.6, 44, 28, 26),
    B(dirAG(-40, -40), 1.0, 108, 30, 30)
  ]
});
M.qrsPaced = () => ({
  w: 160, focus: 'rvApex', spike: true, c: [
    B(dirAG(-80, -20), 0.9, 52, 30, 26),
    B(dirAG(-60, -45), 1.0, 116, 30, 30)
  ]
});

// ripolarizzazione: direzione della T di default in base al QRS
M.tNormal = { a: 42, g: 22, amp: 0.34 };

/* ---------- costruzione del battito ventricolare ---------- */
function buildV(tv, qrs, rr, opt) {
  const qt0 = (opt.qtc || 400) * Math.sqrt(Math.max(0.25, rr / 1000));
  const scale = opt.qrsScale || 1;
  const w = qrs.w * scale;
  const QT = Math.max(w + 150, Math.min(720, qt0 + (w - 92) * 0.5));
  const T = opt.T || M.tNormal;
  const peaked = opt.peaked || 0; // 0..1 T appuntita
  let sr = QT * (0.105 - 0.04 * peaked), sl = QT * (0.16 - 0.085 * peaked);
  if (opt.tShape === 'broad') { sl *= 1.4; sr *= 1.2; }
  if (opt.tShape === 'late') { sl *= 0.5; sr *= 0.85; }
  const tPeak = QT - 2.35 * sr;
  const comps = shift(qrs.c, 0, scale);
  if (qrs.spike) comps.push(B([0, -0.3, 0.95], 1.6, -2, 1.1, 1.1));
  if (opt.extra) opt.extra.forEach(c => comps.push(Object.assign({}, c)));
  if (opt.tShape === 'notched') {
    comps.push(B(dirAG(T.a, T.g), T.amp * 0.62, tPeak - 0.13 * QT, 0.07 * QT, 0.05 * QT));
    comps.push(B(dirAG(T.a, T.g), T.amp * 0.6, tPeak, 0.06 * QT, sr));
  } else comps.push(B(dirAG(T.a, T.g), T.amp, tPeak, sl, sr));
  if (opt.st && opt.st.amp) comps.push(PL(dirAG(opt.st.a, opt.st.g), opt.st.amp, w - 8, tPeak - 10, 14));
  if (opt.u) comps.push(B(dirAG(T.a, T.g), opt.u, QT + 70, 32, 38));
  return { t: tv, kind: 'V', comps, span: extentOf(comps), meta: Object.assign({ w, qt: QT, rr, focus: qrs.focus || null }, opt.meta || {}) };
}
function buildA(ta, comps, meta) {
  return { t: ta, kind: 'A', comps, span: extentOf(comps), meta: meta || {} };
}

/* ---------- generatore di ritmo ---------- */
function* rhythm(cfg, R) {
  const S = cfg;
  const pComps = S.pComps || M.pSinus(S.pAmp == null ? 1 : S.pAmp);
  const pVar = S.pVar || null;
  const vOpt = { qtc: S.qtc, T: S.T, st: S.st, u: S.u, peaked: S.peaked, qrsScale: S.qrsScale, extra: S.extra, tShape: S.tShape };
  const qrs = S.qrs || M.qrsNormal();
  let t = (S.t0 || 0) + 400;

  if (S.mode === 'continuous') { for (;;) { yield [{ t, kind: 'N', comps: [], span: [0, 0], meta: {} }]; t += 1000; } }

  if (S.mode === 'vt') {
    let tv = t + 300, ta = t + 80;
    const rrv = 60000 / S.vRate, rra = 60000 / (S.aRate || 75);
    for (;;) {
      const out = [];
      if (ta < tv) { out.push(buildA(ta, pComps, { type: 'sinus', dissociated: true })); ta += rra * (1 + 0.04 * (R() - 0.5)); }
      else {
        const ev = buildV(tv, S.vtQrs, rrv, Object.assign({}, vOpt, { T: S.vtT, st: null, meta: { type: 'vt' } }));
        out.push(ev); tv += rrv * (1 + 0.012 * (R() - 0.5));
      }
      yield out;
    }
  }

  if (S.atrial === 'af') {
    let tv = t;
    for (;;) {
      const mean = 60000 / S.vRate;
      const rr = mean * (0.55 + 0.9 * R()) ;
      const out = [buildV(tv, qrs, rr, Object.assign({}, vOpt, { meta: { type: 'conducted', via: S.via } }))];
      tv += rr; yield out;
    }
  }

  if (S.atrial === 'flutter') {
    const fl = 60000 / (S.fRate || 300);
    const ratio = S.ratio || 2;
    let ta = t, k = 0, lastV = t - 600;
    for (;;) {
      const out = [buildA(ta, [], { type: 'flutter' })];
      let n = ratio;
      if (S.variable) n = (Math.floor(k / 4) % 2 === 0) ? 2 : 4;
      if (k % n === 0) {
        const tv = ta + 0.72 * fl + 80;
        out.push(buildV(tv, qrs, tv - lastV, Object.assign({}, vOpt, { meta: { type: 'conducted' } })));
        lastV = tv;
      }
      k++; ta += fl; yield out;
    }
  }

  if (S.mode === 'svt') {
    let tv = t; const rr = 60000 / S.vRate;
    for (;;) {
      const out = [buildV(tv, qrs, rr, Object.assign({}, vOpt, { meta: { type: 'conducted', reentry: 'avnrt' } }))];
      if (S.rp !== 0) out.push(buildA(tv + (S.rp || 58), M.pRetro(S.rpAmp == null ? 0.8 : S.rpAmp), { type: 'retro' }));
      tv += rr; yield out;
    }
  }

  // --- base sinusale (con blocchi AV ed ectopie) ---
  const baseRR = 60000 / S.rate;
  const PR = S.pr || 160;
  const av = S.av || 'normal';

  if (av === 'III' || av === 'dissoc') {
    let ta = t, tv = t + 520, kb = 0;
    const rra = baseRR, rrv = 60000 / S.escRate;
    const eq = S.escQrs ? S.escQrs : (S.escape === 'ventricolare' ? M.qrsEscapeV() : qrs);
    const eT = S.escape === 'ventricolare' ? { a: 150, g: 30, amp: 0.38 } : S.T;
    for (;;) {
      const out = [];
      if (ta < tv) { out.push(buildA(ta, pComps, { type: 'sinus', blocked: av !== 'dissoc' })); ta += rra * (1 + 0.03 * (R() - 0.5)); }
      else { out.push(buildV(tv, eq, rrv, Object.assign({}, vOpt, { T: eT, meta: { type: S.escape === 'ventricolare' ? 'escape-v' : 'escape-j' } }))); tv += rrv; }
      yield out; kb++;
    }
  }

  let ta = t, beat = 0, wk = 0, sk = 0, lastV = t - baseRR;
  const ect = S.ectopy || null; // {type:'pvc'|'pac', pattern:'isolate'|'bigeminismo'|'trigeminismo'|'coppie', prob}
  let skipNextConduction = false;
  for (;;) {
    const out = [];
    const resp = S.sa ? S.sa * Math.sin(2 * Math.PI * ta / 4600) : 0;
    let rr = baseRR * (1 + resp) + (S.jit || 12) * (R() - 0.5);
    const tvNormal = ta + PR;

    // blocco seno-atriale in uscita: salta un intero ciclo, P compresa
    if (S.saBlock && beat > 1) {
      const n = S.saBlock.ratio || 4;
      if (S.saBlock.type === 'wenck') {
        const shr = [1, 0.93, 0.89, 0.87, 0.86];
        if (sk === n - 1) { sk = 0; beat++; ta += rr * 0.74; continue; }
        rr = rr * shr[Math.min(sk, shr.length - 1)]; sk++;
      } else {
        if (sk === n - 1) { sk = 0; beat++; ta += rr; continue; }
        sk++;
      }
    }

    // arresto sinusale: pausa lunga, con o senza battito di scappamento
    if (S.pause && beat > 0 && beat % (S.pause.after || 5) === 0) {
      const ms = S.pause.ms || 2600;
      if (S.pause.escape) {
        const teq = lastV + ms * 0.62;
        const eq = S.pause.escape === 'v' ? M.qrsEscapeV() : qrs;
        const eT = S.pause.escape === 'v' ? { a: 150, g: 30, amp: 0.38 } : S.T;
        out.push(buildV(teq, eq, ms * 0.62, Object.assign({}, vOpt, { T: eT, meta: { type: S.pause.escape === 'v' ? 'escape-v' : 'escape-j' } })));
        lastV = teq;
      }
      beat++; ta += Math.max(320, ms - rr);
      if (out.length) { yield out; }
      continue;
    }

    // ectopia: decide se questo ciclo contiene un battito prematuro dopo il QRS
    let ectHere = false;
    if (ect) {
      const k = beat + 1;
      if (ect.pattern === 'bigeminismo') ectHere = k % 2 === 0;
      else if (ect.pattern === 'trigeminismo') ectHere = k % 3 === 0;
      else if (ect.pattern === 'quadrigeminismo') ectHere = k % 4 === 0;
      else if (ect.pattern === 'coppie' || ect.pattern === 'triplette' || ect.pattern === 'salve') ectHere = k % 5 === 0;
      else ectHere = R() < (ect.prob || 0.14);
      if (beat < 2) ectHere = false;
    }

    if (skipNextConduction) {
      out.push(buildA(ta, pComps, { type: 'sinus', blocked: true, refractory: true }));
      skipNextConduction = false;
      beat++; ta += rr; yield out; continue;
    }

    // conduzione AV
    let conducted = true, pr = PR;
    if (av === 'I') pr = S.pr;
    else if (av === 'wenck') {
      const n = S.ratio || 4; // n:(n-1)
      const incs = [0, 110, 160, 190, 205, 215, 222];
      if (wk === n - 1) { conducted = false; wk = 0; }
      else { pr = PR + incs[Math.min(wk, incs.length - 1)]; wk++; }
    } else if (av === 'mobitz2') {
      const n = S.ratio || 4;
      if (wk === n - 1) { conducted = false; wk = 0; } else wk++;
    } else if (av === 'adv') {
      const n = S.ratio || 3;            // conduce una P ogni n: blocco avanzato
      if (wk % n !== 0) conducted = false;
      wk++;
    } else if (av === '2to1') {
      if (wk === 1) { conducted = false; wk = 0; } else wk++;
    }

    out.push(buildA(ta, pVar ? pVar[beat % pVar.length] : pComps, { type: 'sinus', blocked: !conducted }));
    if (conducted) {
      const tv = ta + pr;
      out.push(buildV(tv, qrs, tv - lastV, Object.assign({}, vOpt, { meta: { type: 'conducted', pr, via: S.via } })));
      lastV = tv;
      if (ectHere) {
        const coup = (ect.coupling || 0.52) * rr;
        const te = tv + coup;
        if (ect.type === 'pvc') {
          const eq = (ect.alt && (beat >> 1) % 2 === 1) ? ect.alt : (ect.qrs || M.qrsPVC_RVOT());
          out.push(buildV(te, eq, coup, Object.assign({}, vOpt, { T: ect.T || { a: -95, g: 35, amp: 0.45 }, st: null, meta: { type: 'pvc' } })));
          const extraN = ect.pattern === 'coppie' ? 1 : ect.pattern === 'triplette' ? 2 : ect.pattern === 'salve' ? 5 : 0;
          let tp = te;
          for (let z = 0; z < extraN; z++) {
            const gap = (ect.pattern === 'salve' ? 0.38 : 0.5) * rr;
            tp += gap;
            const qz = (ect.alt && z % 2 === 0) ? ect.alt : eq;
            const tz = (ect.alt && z % 2 === 0) ? (ect.altT || ect.T) : ect.T;
            out.push(buildV(tp, qz, gap, Object.assign({}, vOpt, { T: tz || { a: -95, g: 35, amp: 0.45 }, st: null, meta: { type: 'pvc' } })));
          }
          lastV = tp;
          // pausa compensatoria: la P successiva cade nella refrattarietà
          skipNextConduction = true;
          lastV = te;
        } else {
          // PAC: P prematura, QRS condotto, ciclo sinusale reimpostato
          const tp = tv - pr + 0.72 * rr;
          out.push(buildA(tp, M.pLowAtrial(0.9), { type: 'pac' }));
          const tvp = tp + pr + 10;
          out.push(buildV(tvp, qrs, tvp - lastV, Object.assign({}, vOpt, { meta: { type: 'conducted', pac: true } })));
          lastV = tvp;
          ta = tp + rr * 1.02; beat++; yield out; continue;
        }
      }
    }
    beat++; ta += rr; yield out;
  }
}

/* ---------- attività continue ---------- */
function makeContinuous(cfg, seed) {
  const R = rng(seed * 7 + 3);
  if (cfg.cont === 'af') {
    const waves = [];
    for (let i = 0; i < 5; i++) waves.push({ f: 5.2 + R() * 2.6, ph: R() * 6.28, d: norm([R() - 0.7, R() - 0.3, R() - 0.2]), a: (cfg.fAmp || 0.05) * (0.5 + R()), df: 0.2 + R() * 0.5 });
    return (tau, out) => {
      const s = tau / 1000;
      waves.forEach(w => { const v = w.a * Math.sin(2 * Math.PI * w.f * s + w.ph + 1.7 * Math.sin(2 * Math.PI * w.df * s)); out[0] += w.d[0] * v; out[1] += w.d[1] * v; out[2] += w.d[2] * v; });
    };
  }
  if (cfg.cont === 'flutter') {
    const T = 60000 / (cfg.fRate || 300), d = norm(dirAG(-92, 30)), a = cfg.fAmp || 0.26;
    return (tau, out) => {
      const ph = ((tau % T) + T) % T / T;
      // salita lenta (75%) e discesa rapida (25%), media nulla, angoli smussati
      let w = ph < 0.75 ? ph / 0.75 : 1 - (ph - 0.75) / 0.25;
      w = w - 0.5;
      const v = a * w;
      out[0] += d[0] * v; out[1] += d[1] * v; out[2] += d[2] * v;
    };
  }
  if (cfg.cont === 'vf') {
    const waves = [];
    for (let i = 0; i < 6; i++) waves.push({ f: 3.2 + R() * 3.8, ph: R() * 6.28, d: norm([R() - 0.5, R() - 0.5, R() - 0.5]), a: (cfg.vfAmp || 0.5) * (0.35 + R() * 0.7), m: 0.15 + R() * 0.5, mp: R() * 6.28 });
    return (tau, out) => {
      const s = tau / 1000;
      waves.forEach(w => { const env = 0.55 + 0.45 * Math.sin(2 * Math.PI * w.m * s + w.mp); const v = w.a * env * Math.sin(2 * Math.PI * w.f * s + w.ph + 2.2 * Math.sin(0.9 * s + w.mp)); out[0] += w.d[0] * v; out[1] += w.d[1] * v; out[2] += w.d[2] * v; });
    };
  }
  if (cfg.cont === 'torsade') {
    const f = (cfg.tdpRate || 250) / 60;
    const d1 = norm(dirAG(70, -20)), d2 = norm(dirAG(-100, 30));
    return (tau, out) => {
      const s = tau / 1000;
      const ph = 2 * Math.PI * 0.32 * s;
      const env = 0.25 + 0.75 * Math.abs(Math.sin(ph));
      const car = Math.sin(2 * Math.PI * f * s) + 0.25 * Math.sin(4 * Math.PI * f * s + 0.6);
      const c = Math.cos(ph), sn = Math.sin(ph), a = (cfg.tdpAmp || 1.0) * env * car;
      out[0] += (d1[0] * c + d2[0] * sn) * a; out[1] += (d1[1] * c + d2[1] * sn) * a; out[2] += (d1[2] * c + d2[2] * sn) * a;
    };
  }
  return null;
}

/* ---------- stream ---------- */
function Stream(cfg, seed) {
  this.cfg = cfg; this.seed = seed || 1;
  this.R = rng(this.seed);
  this.gen = rhythm(cfg, this.R);
  this.ev = []; this.tGen = 0;
  this.cont = makeContinuous(cfg, this.seed);
  this.noise = cfg.noise || 0;
  this.nR = rng(this.seed + 99);
  this.np = LEADS.map(() => this.nR() * 6.28);
}
Stream.prototype.ensure = function (tMax) {
  let guard = 0;
  while (this.tGen < tMax + 2500 && guard++ < 500) {
    const r = this.gen.next(); if (r.done) break;
    r.value.forEach(e => { if (e) { this.ev.push(e); if (e.t > this.tGen) this.tGen = e.t; } });
  }
  this.ev.sort((a, b) => a.t - b.t);
};
Stream.prototype.prune = function (tMin) {
  let i = 0; while (i < this.ev.length && this.ev[i].t + 1500 < tMin) i++;
  if (i > 0) this.ev.splice(0, i);
};
Stream.prototype.vec = function (tau, out) {
  out[0] = 0; out[1] = 0; out[2] = 0;
  const ev = this.ev;
  // ricerca binaria del primo evento con t >= tau - 1300
  let lo = 0, hi = ev.length; const target = tau - 1300;
  while (lo < hi) { const m = (lo + hi) >> 1; if (ev[m].t < target) lo = m + 1; else hi = m; }
  for (let i = lo; i < ev.length; i++) {
    const e = ev[i]; if (e.t > tau + 400) break;
    const rel = tau - e.t;
    if (rel < e.span[0] || rel > e.span[1]) continue;
    evalComps(e.comps, rel, out);
  }
  if (this.cont) this.cont(tau, out);
  return out;
};
Stream.prototype.leads = function (tau, vec, outArr) {
  for (let i = 0; i < 12; i++) {
    const w = LEADS[i].w;
    let v = vec[0] * w[0] + vec[1] * w[1] + vec[2] * w[2];
    if (this.noise) {
      const s = tau / 1000;
      v += this.noise * (0.06 * Math.sin(2 * Math.PI * 0.21 * s + this.np[i]) + 0.012 * Math.sin(2 * Math.PI * 47 * s + i) + 0.01 * Math.sin(2 * Math.PI * 31.7 * s + 2 * i));
    }
    outArr[i] = v;
  }
  return outArr;
};
Stream.prototype.eventsAround = function (tau) {
  let lastA = null, lastV = null;
  for (let i = this.ev.length - 1; i >= 0; i--) {
    const e = this.ev[i]; if (e.t > tau) continue;
    if (!lastA && e.kind === 'A') lastA = e;
    if (!lastV && e.kind === 'V') lastV = e;
    if (lastA && lastV) break;
    if (tau - e.t > 3000) break;
  }
  return { A: lastA, V: lastV };
};

const API = { LEADS, M, B, PL, dirAG, Stream, rng, buildV };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ECG = API;
})(typeof window !== 'undefined' ? window : this);
