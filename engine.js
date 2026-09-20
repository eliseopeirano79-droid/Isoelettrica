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
  // le derivazioni aumentate valgono esattamente radice di 3 mezzi: con 0,866
  // arrotondato la relazione aVR = -(DI+DII)/2 non tornava all'ultima cifra
  { id: 'aVR', p: 'F', ang: -150, g: Math.sqrt(3) / 2 }, { id: 'aVL', p: 'F', ang: -30, g: Math.sqrt(3) / 2 }, { id: 'aVF', p: 'F', ang: 90, g: Math.sqrt(3) / 2 },
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
const AX0 = 55.6;   // asse del QRS senza rotazione
const AP0 = 44.2;   // asse dell'onda P senza rotazione   // ricalibrato dal banco di prova, vedi audit.js
const M = {};
// P sinusale: atrio destro (in avanti) poi sinistro (indietro)
// Onda P: atrio destro (in avanti, in basso, a sinistra) poi atrio sinistro
// (indietro, a sinistra). Gli atri sono più lontani dalla parete toracica dei
// ventricoli, quindi i vettori anteroposteriori sono più contenuti: con
// componenti più ripide la P usciva troppo alta e troppo bifasica in V2-V4.
M.pSinus = (amp = 1, wide = 1, ra = 1, la = 1, aP = null) => [
  /* L'onda P nasce da due vettori, destro e sinistro: il suo asse è la
     risultante, non l'angolo di uno dei due. AP0 è l'asse che risulta senza
     rotazione, così il cursore indica i gradi che si misurano davvero. */
  B(dirAG(62 + (aP == null ? 0 : aP - AP0), 38), 0.105 * amp * ra, 34 * wide, 16 * wide, 15 * wide),
  B(dirAG(18 + (aP == null ? 0 : aP - AP0), -18), 0.055 * amp * la, 72 * wide, 17 * wide, 17 * wide)
];
// P polmonare: l'atrio destro ipertrofico sposta il vettore in basso e lo
// ingrandisce, con P appuntita >= 2,5 mm in DII, DIII e aVF.
M.pPulmonale = (amp = 1) => [
  B(dirAG(72, 26), 0.30 * amp, 34, 15, 14),
  B(dirAG(18, -18), 0.048 * amp, 70, 16, 16)
];
// P mitralica: l'atrio sinistro dilatato depolarizza tardi e all'indietro, e
// la P diventa larga e bifida in DII con una coda negativa profonda in V1.
M.pMitrale = (amp = 1) => [
  B(dirAG(60, 30), 0.100 * amp, 30, 16, 15),
  B(dirAG(15, -22), 0.122 * amp, 94, 20, 21)
];
M.pWidth = (wide = 1) => 110 * wide;
M.pRetro = (amp = 1) => [B(dirAG(-95, 10), 0.11 * amp, 36, 16, 16)];
M.pLowAtrial = (amp = 1) => [B(dirAG(-80, 20), 0.12 * amp, 40, 18, 18)];
M.pLeftAtrial = (amp = 1) => [B(dirAG(40, -60), 0.13 * amp, 45, 20, 20)];

// QRS normale (onset = 0). Restituisce {c, w}
M.qrsNormal = (o = {}) => {
  const r = o.r == null ? 1 : o.r, q = o.q == null ? 1 : o.q, s = o.s == null ? 1 : o.s;
  /* L'asse elettrico è la direzione dell'area netta del QRS, cioè la somma
     dei quattro vettori pesata sulla loro durata: non coincide con l'angolo
     di nessuno di essi. AX0 è l'asse che il complesso ha quando la rotazione
     è nulla, misurato sul segnale con il metodo delle aree in DI e aVF; si
     sottrae perché il cursore indichi davvero i gradi che si leggono sulla
     carta. E la rotazione si applica a tutti e quattro i vettori: un cuore
     con asse verticale è ruotato per intero, setto compreso. */
  const ax = o.aR == null ? 0 : o.aR - AX0;
  // I quattro vettori si sovrappongono nel tempo: un QRS reale è un movimento
  // continuo, non quattro colpi separati. Con componenti troppo strette e
  // distanziate le derivazioni dove le proiezioni sono piccole e dello stesso
  // segno (DIII, V2) mostravano due gobbe invece di un complesso unico.
  return {
    w: 94, c: [
      B(dirAG(178 + ax, 28), 0.24 * q, 15, 9, 9),     // setto: a destra, avanti, appena in alto
      B(dirAG(42 + ax, 22), 0.60 * r, 33, 12, 12),    // parete libera, prima metà
      B(dirAG(56 + ax, -28), 0.94 * r, 49, 12, 12),   // parete libera, vettore principale
      B(dirAG(-122 + ax, -52), 0.34 * s, 68, 10, 12)  // basi: in alto, a destra, indietro
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
    B(dirAG(126, 26), 0.28, 16, 10, 10),
    B(dirAG(-58, -8), 1.15, 46, 13, 13),
    B(dirAG(-100, -50), 0.3, 75, 11, 12)
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
// Ipertrofia sinistra: voltaggi tarati perché Sokolow-Lyon e Cornell risultino
// davvero positivi sul tracciato generato. k scala tutti i voltaggi.
// Ipertrofia sinistra: componenti sovrapposte come nel QRS normale, altrimenti
// in V4 (dove il vettore principale è quasi perpendicolare alla derivazione)
// compariva un'intaccatura che non ha corrispondente fisiologico.
M.qrsLVH = (k) => { k = k == null ? 1 : k; return {
  w: 104, c: [
    B(dirAG(168, 30), 0.19 * k, 15, 9, 9),
    B(dirAG(4, -24), 2.30 * k, 45, 14, 13),
    B(dirAG(-120, -58), 0.95 * k, 73, 11, 13)
  ]
}; };
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
  // il QT non può occupare tutto il ciclo: alle frequenze molto alte si accorcia
  const QT = Math.min(Math.max(w + 150, Math.min(720, qt0 + (w - 92) * 0.5)), Math.max(w + 60, rr * 0.88));
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
  this.contSeg = [{ t0: -1e12, t1: 1e12, fn: makeContinuous(cfg, this.seed) }];
  this.scariche = [];        // defibrillazioni erogate, con l'artefatto sul tracciato
  this.noise = cfg.noise || 0;
  this.nR = rng(this.seed + 99);
  this.np = LEADS.map(() => this.nR() * 6.28);
  this.amp = cfg.ampScale == null ? 1 : cfg.ampScale;      // abito costituzionale
  this.rot = (cfg.axisRot || 0) * DEG;                     // rotazione dell'asse nel piano frontale
  this.baseQrs = cfg.qrs || M.qrsNormal();
  this.basePR = cfg.pr || 160;
  this.tShift = 0;   // sfasamento permanente dopo un reset del nodo del seno
}
Stream.prototype.ensure = function (tMax) {
  let guard = 0;
  while (this.tGen < tMax + 2500 && guard++ < 500) {
    const r = this.gen.next(); if (r.done) break;
    r.value.forEach(e => {
      if (!e) return;
      e.t += this.tShift;
      if (this.cfg.alternanza && e.kind === 'V' && !e._alt) {
        /* alternanza elettrica: nel versamento abbondante il cuore oscilla dentro
           il liquido e a ogni battito presenta al torace un orientamento diverso.
           La parità si conta sullo stream, così resta stabile anche rigenerando. */
        e._alt = 1;
        const k = (this.nAlt = (this.nAlt || 0) + 1) % 2 ? 1 + this.cfg.alternanza : 1 - this.cfg.alternanza;
        for (let i = 0; i < e.comps.length; i++) e.comps[i] = Object.assign({}, e.comps[i], { a: e.comps[i].a * k });
      }
      this.ev.push(e); if (e.t > this.tGen) this.tGen = e.t;
    });
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
  if (this.cfg.specchio) out[0] = -out[0];   // destrocardia: asse destra-sinistra ribaltato
  for (let i = 0; i < this.contSeg.length; i++) {
    const c = this.contSeg[i];
    if (c.fn && tau >= c.t0 && tau < c.t1) c.fn(tau, out);
  }
  this.artefatto(tau, out);
  if (this.rot) {
    // ruota il vettore nel piano frontale: +rot = asse che scende verso destra (convenzione ECG)
    const c = Math.cos(this.rot), sn = Math.sin(this.rot), x = out[0], y = out[1];
    out[0] = x * c + y * sn; out[1] = y * c - x * sn;
  }
  return out;
};
/* ---------- artefatti di registrazione ----------
   Gli scambi fra gli elettrodi degli arti non sono un capriccio grafico: si
   ricavano dalle definizioni. Con I = L-R, II = F-R, III = F-L, scambiare due
   cavi permuta e inverte le derivazioni frontali in modo preciso. E poiché il
   terminale centrale di Wilson è la media dei tre potenziali degli arti, uno
   scambio fra braccio destro, braccio sinistro e gamba sinistra NON lo cambia:
   le precordiali restano identiche. È esattamente questo che distingue
   un'inversione dei cavi da una destrocardia. */
const SCAMBI = {
  // braccio destro <-> braccio sinistro
  'ra-la': { I: [-1, 0, 0], II: [0, 0, 1], III: [0, 1, 0], aVR: 'aVL', aVL: 'aVR', aVF: 'aVF' },
  // braccio destro <-> gamba sinistra
  'ra-ll': { I: [0, 0, -1], II: [0, -1, 0], III: [-1, 0, 0], aVR: 'aVF', aVL: 'aVL', aVF: 'aVR' },
  // braccio sinistro <-> gamba sinistra
  'la-ll': { I: [0, 1, 0], II: [1, 0, 0], III: [0, 0, -1], aVR: 'aVR', aVL: 'aVF', aVF: 'aVL' },
  // braccio destro <-> gamba destra (il neutro): DII diventa quasi piatta
  'ra-rl': { I: [0, 0, -1], II: [0, 0, 0], III: [0, 0, 1], aVR: null, aVL: null, aVF: null }
};
function applicaScambio(o, tipo) {
  const m = SCAMBI[tipo]; if (!m) return;
  const I = o[0], II = o[1], III = o[2];
  const c = (v) => v[0] * I + v[1] * II + v[2] * III;
  const nI = c(m.I), nII = c(m.II), nIII = c(m.III);
  o[0] = nI; o[1] = nII; o[2] = nIII;
  // le aumentate si ricalcolano sempre dalle nuove bipolari: è quello che fa
  // davvero l'apparecchio, e con il neutro scambiato è l'unico modo corretto
  o[3] = -(nI + nII) / 2; o[4] = (nI - nIII) / 2; o[5] = (nII + nIII) / 2;
}
Stream.prototype.artefattiLead = function (tau, o) {
  const a = this.cfg.artefatti; if (!a) return;
  if (a.swap) applicaScambio(o, a.swap);
  if (a.v1v2) { const t = o[6]; o[6] = o[7]; o[7] = t; }
  if (a.alte) { o[6] *= 0.55; o[7] *= 0.6; o[6] -= 0.06; o[7] -= 0.05; }   // V1-V2 troppo in alto
  /* Il rumore va generato dove nasce davvero, cioè sotto ogni elettrodo, e non
     sulle derivazioni già calcolate. Se lo si somma alle derivazioni, DI + DIII
     non fa più DII: il tracciato diventa elettricamente impossibile. Sporcando
     invece i potenziali dei singoli elettrodi, la legge di Einthoven regge da
     sola, come regge sul paziente vero che trema. */
  const s = tau / 1000;
  if (a.rete || a.tremore || a.deriva) {
    const n = this._nz || (this._nz = new Float64Array(9));   // R, L, F, V1..V6
    const gT = [1, 1, 1, 0.3, 0.26, 0.24, 0.22, 0.2, 0.2];    // gli arti tremano, il torace meno
    for (let e = 0; e < 9; e++) {
      let v = 0;
      if (a.rete) v += a.rete * 0.7 * Math.sin(2 * Math.PI * 50 * s + e * 0.83);
      if (a.tremore) {
        let m = 0;
        for (let k = 0; k < 4; k++) m += Math.sin(2 * Math.PI * (5.5 + k * 2.7) * s + this.np[e] + k * 1.3 + e) / (k + 1.4);
        v += a.tremore * gT[e] * m;
      }
      if (a.deriva) v += a.deriva * (Math.sin(2 * Math.PI * 0.25 * s + this.np[e]) + 0.5 * Math.sin(2 * Math.PI * 0.11 * s + e));
      n[e] = v;
    }
    const R = n[0], L = n[1], F = n[2], W = (R + L + F) / 3;
    o[0] += L - R; o[1] += F - R; o[2] += F - L;
    o[3] += R - (L + F) / 2; o[4] += L - (R + F) / 2; o[5] += F - (R + L) / 2;
    for (let i = 0; i < 6; i++) o[6 + i] += n[3 + i] - W;
  }
  if (a.staccato != null) {
    const i = a.staccato;
    o[i] = 0.012 * Math.sin(2 * Math.PI * 50 * s) + 0.004 * Math.sin(2 * Math.PI * 173 * s);
  }
};
Stream.prototype.leads = function (tau, vec, outArr) {
  for (let i = 0; i < 12; i++) {
    const w = LEADS[i].w;
    /* Precordiali destre (V1R-V6R): gli elettrodi del torace si spostano
       specularmente a destra. Su un cuore a destra questo annulla la
       specularità e il tracciato precordiale torna quello di sempre; le
       derivazioni degli arti restano invertite, perché quelle non le abbiamo
       spostate. È la manovra che conferma una destrocardia. */
    const mx = (this.cfg.precDestre && i >= 6) ? -1 : 1;
    let v = (mx * vec[0] * w[0] + vec[1] * w[1] + vec[2] * w[2]) * this.amp;
    if (this.scariche.length) {
      const a = this.artefattoLead(tau, i);
      if (a !== null) { outArr[i] = a; continue; }
      v += this.derivaLead(tau, i);
    }
    if (this.noise) {
      const s = tau / 1000;
      v += this.noise * (0.06 * Math.sin(2 * Math.PI * 0.21 * s + this.np[i]) + 0.012 * Math.sin(2 * Math.PI * 47 * s + i) + 0.01 * Math.sin(2 * Math.PI * 31.7 * s + 2 * i));
    }
    outArr[i] = v;
  }
  if (this.cfg.artefatti) this.artefattiLead(tau, outArr);
  return outArr;
};
/* ---------- defibrillazione ----------
   La scarica si vede come nella realtà: una deflessione enorme che manda fuori
   scala l'amplificatore, poi qualche decimo di secondo di tracciato muto mentre
   il filtro si riprende, poi una deriva lenta della linea di base. Quello che
   succede dopo dipende dal ritmo: se era defibrillabile il ritmo cambia, se non
   lo era resta tale e quale e l'unica cosa che si vede è l'artefatto. */
// Durante la scarica il vettore cardiaco non ha più significato: il segnale è
// tutto dell'amplificatore. Qui il vettore viene azzerato, l'artefatto vero si
// disegna derivazione per derivazione in leads().
Stream.prototype.artefatto = function (tau, out) {
  for (let i = 0; i < this.scariche.length; i++) {
    const r = tau - this.scariche[i].t;
    if (r >= 0 && r < this.scariche[i].muto) { out[0] = 0; out[1] = 0; out[2] = 0; return; }
  }
};
// Il colpo satura ogni canale in modo diverso: deflessione enorme di segno e
// ampiezza variabili da derivazione a derivazione, poi il muto, poi la deriva.
Stream.prototype.artefattoLead = function (tau, i) {
  for (let k = 0; k < this.scariche.length; k++) {
    const s = this.scariche[k], r = tau - s.t;
    if (r < 0 || r > 2400) continue;
    if (r < 26) return Math.sin(Math.PI * r / 26) * (r < 13 ? 1 : -0.6) * s.g[i];
    if (r < s.muto) return 0;
    return null;                        // la deriva la aggiunge leads()
  }
  return null;
};
Stream.prototype.derivaLead = function (tau, i) {
  let d = 0;
  for (let k = 0; k < this.scariche.length; k++) {
    const s = this.scariche[k], r = tau - s.t;
    if (r < s.muto || r > 2400) continue;
    d += 0.11 * (s.g[i] > 0 ? 1 : -1) * Math.exp(-(r - s.muto) / 540) * Math.cos((r - s.muto) / 360);
  }
  return d;
};
Stream.prototype.cambiaRitmo = function (cfg2, tDa) {
  this.ev = this.ev.filter(e => e.t < tDa - 2);
  const c = this.contSeg[this.contSeg.length - 1];
  if (c.t1 > tDa) c.t1 = tDa;
  // sostituzione piena, non fusione: passando da fibrillazione a ritmo sinusale
  // le chiavi del ritmo precedente (cont, mode, vfAmp) devono sparire
  const cfg = Object.assign({}, cfg2);
  if (cfg.noise == null) cfg.noise = this.cfg.noise;
  this.cfg = cfg;
  this.contSeg.push({ t0: tDa, t1: 1e12, fn: makeContinuous(cfg, this.seed + this.contSeg.length * 17) });
  this.gen = rhythm(cfg, this.R);
  this.tShift = tDa;
  this.tGen = tDa;
  this.baseQrs = cfg.qrs || this.baseQrs;
  this.basePR = cfg.pr || this.basePR;
  this.ensure(tDa + 4000);
};
/* Eroga una scarica al tempo t. dopo: configurazione del ritmo che segue
   (null se il ritmo non cambia). attesa: quanto tarda a ripartire. */
Stream.prototype.scarica = function (t, dopo, attesa, muto) {
  // ogni derivazione vede il colpo con ampiezza e segno suoi: da 1,8 a 5,5 mV,
  // cioè da 18 a 55 mm, ben oltre il bordo della carta
  const g = [4.6, 5.2, 2.4, -4.9, 2.0, 3.6, -3.1, -4.2, -2.6, 3.4, 4.4, 3.0];
  this.scariche.push({ t: t, g: g, muto: muto == null ? 240 : muto });
  if (this.scariche.length > 8) this.scariche.splice(0, this.scariche.length - 8);
  if (dopo) this.cambiaRitmo(dopo, t + (attesa == null ? 1400 : attesa));
  return t;
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

/* ---------- ampiezze del QRS, derivazione per derivazione ----------
   Campiona il battito di base davvero generato e restituisce R e S in mV,
   così gli indici di ipertrofia si calcolano sul tracciato e non su valori scritti a mano. */
const BASE_TYPES = { conducted: 1, 'escape-j': 1, 'escape-v': 1, vt: 1 };
Stream.prototype.qrsAmplitudes = function (tRef) {
  this.ensure(tRef);
  let b = null;
  for (let i = this.ev.length - 1; i >= 0; i--) {
    const e = this.ev[i];
    if (e.t > tRef) continue;
    if (e.kind === 'V' && BASE_TYPES[e.meta.type]) { b = e; break; }
    if (tRef - e.t > 8000) break;
  }
  if (!b) return null;
  const w = b.meta.w || 100;
  const vec = [0, 0, 0], lv = new Array(12);
  const proj = tau => {
    this.vec(b.t + tau, vec);
    for (let i = 0; i < 12; i++) {
      const wv = LEADS[i].w;
      lv[i] = (vec[0] * wv[0] + vec[1] * wv[1] + vec[2] * wv[2]) * this.amp;
    }
  };
  proj(-40); const base = lv.slice();                 // linea isoelettrica prima della q
  const R = {}, S = {};
  LEADS.forEach(L => { R[L.id] = 0; S[L.id] = 0; });
  for (let tau = -10; tau <= w + 14; tau += 1.5) {
    proj(tau);
    for (let i = 0; i < 12; i++) {
      const d = lv[i] - base[i], id = LEADS[i].id;
      if (d > R[id]) R[id] = d;
      if (-d > S[id]) S[id] = -d;
    }
  }
  return { R, S, qrsMs: Math.round(w), t: b.t, tipo: b.meta.type };
};

/* ---------- battito prematuro inserito dall'utente ----------
   kind: 'pvc' (ventricolare, pausa compensatoria) oppure 'pac' (sopraventricolare,
   P prematura di morfologia diversa e pausa non compensatoria). */
Stream.prototype.injectEctopic = function (tNow, kind) {
  this.ensure(tNow + 2600);
  const Vs = this.ev.filter(e => e.kind === 'V');
  if (!Vs.length) return null;
  let last = null, next = null;
  for (let i = 0; i < Vs.length; i++) {
    if (Vs[i].t <= tNow + 40) last = Vs[i];
    else if (!next) next = Vs[i];
  }
  if (!last) return null;
  const prev = Vs[Vs.indexOf(last) - 1];
  const rr = prev ? last.t - prev.t : 840;
  const vOpt = { qtc: this.cfg.qtc || 400 };
  const limite = next ? next.t - 150 : tNow + 2000;

  if (kind === 'pac') {
    const pr = this.basePR;
    let tp = Math.max(tNow + 90, last.t + 0.56 * rr);
    if (tp + pr > limite) tp = Math.max(tNow + 60, limite - pr);
    if (tp <= last.t + 200) return null;
    const tv = tp + pr + 10;
    // il nodo del seno viene resettato dalla P prematura: tutto ciò che segue slitta
    let ref = last.t - pr;
    for (let i = this.ev.length - 1; i >= 0; i--) {
      const e = this.ev[i];
      if (e.kind === 'A' && e.t < last.t && last.t - e.t < 520 && e.meta.type === 'sinus') { ref = e.t; break; }
    }
    const shift = tp - ref;
    if (shift > 0) {
      for (let i = 0; i < this.ev.length; i++) if (this.ev[i].t > tp + 20) this.ev[i].t += shift;
      this.tShift += shift;
      this.tGen += shift;
    }
    this.ev.push(buildA(tp, M.pLowAtrial(0.95), { type: 'pac', injected: true }));
    this.ev.push(buildV(tv, this.baseQrs, tv - last.t,
      Object.assign({}, vOpt, { T: this.cfg.T, meta: { type: 'conducted', pac: true, injected: true } })));
    this.ev.sort((a, b2) => a.t - b2.t);
    return { kind: 'pac', t: tv };
  }

  let te = Math.max(tNow + 90, last.t + 0.52 * rr);
  if (te > limite) te = Math.max(tNow + 60, limite);
  if (te <= last.t + 180) return null;
  const q = (this.cfg.pvcQrs) || M.qrsPVC_RVOT();
  this.ev.push(buildV(te, q, te - last.t, Object.assign({}, vOpt, {
    T: { a: -95, g: 35, amp: 0.45 }, st: null, meta: { type: 'pvc', injected: true }
  })));
  // pausa compensatoria: la P successiva cade nel periodo refrattario e non conduce
  if (next && next.meta && next.meta.type === 'conducted') {
    this.ev = this.ev.filter(e => e !== next);
    for (let i = 0; i < this.ev.length; i++) {
      const e = this.ev[i];
      if (e.kind === 'A' && Math.abs(e.t - (next.t - (next.meta.pr || this.basePR))) < 60) {
        e.meta = Object.assign({}, e.meta, { blocked: true, refractory: true });
      }
    }
  }
  this.ev.sort((a, b2) => a.t - b2.t);
  return { kind: 'pvc', t: te };
};

/* ---------- variabilità biologica ----------
   Stessa patologia, persone diverse: asse, voltaggi, onda P, onda T, frequenza e
   rumore vengono spostati entro margini fisiologici, senza uscire dai criteri
   diagnostici. Il seme rende la variazione riproducibile. */
function applyVariation(cfg, seed, opt) {
  const R = rng(((seed || 1) >>> 0) + 7919);
  const o = Object.assign({ asse: 14, ampiezza: 0.19, onT: 0.20, onP: 0.30, fc: 0.09, qrs: 0.05, rumore: true }, opt || {});
  const u = () => R() * 2 - 1;
  cfg.axisRot = (cfg.axisRot || 0) + u() * o.asse;
  cfg.ampScale = (cfg.ampScale == null ? 1 : cfg.ampScale) * (1 + u() * o.ampiezza);
  cfg.qrsScale = (cfg.qrsScale == null ? 1 : cfg.qrsScale) * (1 + u() * o.qrs);
  if (cfg.rate) cfg.rate = Math.round(cfg.rate * (1 + u() * o.fc));
  if (cfg.vRate) cfg.vRate = Math.round(cfg.vRate * (1 + u() * o.fc));
  if (cfg.escRate) cfg.escRate = Math.round(cfg.escRate * (1 + u() * o.fc * 0.6));
  if (!cfg.pComps) cfg.pAmp = (cfg.pAmp == null ? 1 : cfg.pAmp) * (1 + u() * o.onP);
  const T = cfg.T || M.tNormal;
  cfg.T = { a: T.a + u() * 10, g: T.g + u() * 10, amp: T.amp * (1 + u() * o.onT) };
  cfg.jit = (cfg.jit == null ? 12 : cfg.jit) + Math.abs(u()) * 16;
  if (o.rumore) cfg.noise = 0.16 + R() * 0.42;
  cfg.varSeed = seed;
  return cfg;
}

/* ---------- tracciato campionato ----------
   Riproduce un ECG reale digitalizzato dall'atlante con la stessa interfaccia
   di Stream, così il monitor, il compasso e le misure funzionano senza modifiche.
   I campioni arrivano quantizzati a 0,01 mV in Int16 base64. */
function decodifica(b64) {
  const bin = typeof atob === 'function' ? atob(b64) : Buffer.from(b64, 'base64').toString('binary');
  const n = bin.length >> 1, out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    let v = bin.charCodeAt(2*i) | (bin.charCodeAt(2*i+1) << 8);
    if (v > 32767) v -= 65536;
    out[i] = v / 100;
  }
  return out;
}
function Sampled(rec, seed) {
  this.cfg = { mode: 'sampled', titolo: rec.t, fonte: rec.f, quadro: rec.q };
  this.fs = rec.fs; this.n = rec.n;
  this.dur = rec.n / rec.fs * 1000;
  this.sig = LEADS.map(L => rec.d[L.id] ? decodifica(rec.d[L.id]) : null);
  /* Delle dodici derivazioni solo otto portano informazione: DIII e le tre
     aumentate si ricavano da DI e DII con Einthoven e Goldberger. Salvando solo
     le otto indipendenti un tracciato registrato occupa un terzo in meno, e le
     altre quattro si ricostruiscono qui, esatte. */
  const iI = 0, iII = 1;
  if (this.sig[iI] && this.sig[iII]) {
    const A = this.sig[iI], B2 = this.sig[iII], n = Math.min(A.length, B2.length);
    const f = [[2, (a, b) => b - a], [3, (a, b) => -(a + b) / 2], [4, (a, b) => a - b / 2], [5, (a, b) => b - a / 2]];
    f.forEach(([k, fn]) => {
      if (this.sig[k]) return;
      const o = new Float32Array(n);
      for (let i = 0; i < n; i++) o[i] = fn(A[i], B2[i]);
      this.sig[k] = o;
    });
  }
  this.uni = this.sig.every(x => !x) ? decodifica(rec.d[Object.keys(rec.d)[0]]) : null;
  this.noise = 0; this.amp = 1; this.rot = 0; this.ev = []; this.tShift = 0;
  this.rilevaR();
}
Sampled.prototype.ensure = function () {};
Sampled.prototype.prune = function () {};
Sampled.prototype.campiona = function (i, tau) {
  const s = this.sig[i] || this.uni; if (!s) return 0;
  let x = (tau % this.dur) / 1000 * this.fs;
  if (x < 0) x += s.length;
  const a = Math.floor(x), f = x - a;
  return s[a % s.length] * (1 - f) + s[(a + 1) % s.length] * f;
};
Sampled.prototype.vec = function (tau, out) { out[0] = 0; out[1] = 0; out[2] = 0; return out; };
Sampled.prototype.leads = function (tau, vec, outArr) {
  for (let i = 0; i < 12; i++) outArr[i] = this.campiona(i, tau);
  return outArr;
};
Sampled.prototype.eventsAround = function () { return { A: null, V: null }; };
Sampled.prototype.qrsAmplitudes = function () {
  const R = {}, S = {};
  LEADS.forEach((L, i) => {
    const s = this.sig[i]; R[L.id] = 0; S[L.id] = 0;
    if (!s) return;
    for (let k = 0; k < s.length; k++) { if (s[k] > R[L.id]) R[L.id] = s[k]; if (-s[k] > S[L.id]) S[L.id] = -s[k]; }
  });
  return { R, S, qrsMs: 0, t: 0, tipo: 'campionato' };
};
/* battiti riconosciuti sul segnale, così le misure di FC e RR restano vive */
Sampled.prototype.rilevaR = function () {
  const s = this.sig[1] || this.sig[0] || this.uni; if (!s) return;
  let mx = 0; for (let i = 0; i < s.length; i++) mx = Math.max(mx, Math.abs(s[i]));
  const soglia = mx * 0.45, rifr = Math.round(0.25 * this.fs);
  const picchi = [];
  for (let i = 1; i < s.length - 1; i++) {
    const v = Math.abs(s[i]);
    if (v < soglia || v < Math.abs(s[i-1]) || v < Math.abs(s[i+1])) continue;
    if (picchi.length && i - picchi[picchi.length-1] < rifr) {
      if (v > Math.abs(s[picchi[picchi.length-1]])) picchi[picchi.length-1] = i;
    } else picchi.push(i);
  }
  this.battiti = picchi.map(i => i / this.fs * 1000);
  // eventi finti su più giri, per il pannello delle misure
  const ev = [];
  for (let g = 0; g < 12; g++) this.battiti.forEach(t => ev.push({
    t: t + g * this.dur, kind: 'V', comps: [], span: [0, 0],
    meta: { type: 'conducted', w: 0, qt: 0 }
  }));
  this.ev = ev;
};

const API = { LEADS, M, B, PL, dirAG, Stream, Sampled, rng, buildV, buildA, applyVariation };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ECG = API;
})(typeof window !== 'undefined' ? window : this);
