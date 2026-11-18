/* Isoelettrica — Laboratorio di ecocardiografia (v47, prima versione).
   Modulo separato e additivo: non modifica motore, dati né le altre viste.
   Che cosa fa: taglia il cuore anatomico 3D (prototipo-cuore/heart-z-anatomy.glb, Z-Anatomy, CC BY-SA 4.0)
   con il piano del fascio della sonda e disegna la sezione come un'immagine B-mode: pareti chiare, sangue nero.
   Che cosa NON è: un'ecografia vera. La tessitura è sintetica, il movimento è un modello geometrico
   (accorciamento radiale e longitudinale del ventricolo sinistro); le valvole sono ricostruite dagli anelli stimati. */
(function (root) {
'use strict';

/* ---------- vettori ---------- */
const sub = (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]], add = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const mul = (a, k) => [a[0] * k, a[1] * k, a[2] * k], dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const len = a => Math.hypot(a[0], a[1], a[2]), norm = a => { const l = len(a) || 1; return [a[0] / l, a[1] / l, a[2] / l]; };
const orto = (a, n) => sub(a, mul(n, dot(a, n)));           // componente di a perpendicolare a n (n unitario)
const ruota = (a, b, g) => add(mul(a, Math.cos(g)), mul(b, Math.sin(g)));

/* ---------- geometria ---------- */
/* Unisce i vertici coincidenti: senza, i bordi condivisi non si riconoscono e i contorni restano aperti. */
function salda(pos, idx) {
  const mappa = new Map(), nuovo = new Uint32Array(pos.length / 3), P = []; let n = 0;
  for (let i = 0; i < pos.length; i += 3) {
    const k = Math.round(pos[i] * 2e4) + ',' + Math.round(pos[i + 1] * 2e4) + ',' + Math.round(pos[i + 2] * 2e4);
    let j = mappa.get(k); if (j === undefined) { j = n++; mappa.set(k, j); P.push(pos[i], pos[i + 1], pos[i + 2]); }
    nuovo[i / 3] = j;
  }
  const tri = new Uint32Array(idx.length); for (let i = 0; i < idx.length; i++) tri[i] = nuovo[idx[i]];
  return { pos: new Float32Array(P), tri, nv: n };
}
/* Sezione di una mesh con il piano per o di normale nrm. Restituisce le catene di punti 3D: { p: Float32Array, chiusa }. */
function taglia(m, o, nrm, grezzo) {
  const pos = m.pos, tri = m.tri, nv = m.nv, d = m._d || (m._d = new Float32Array(nv));
  let su = 0;
  for (let i = 0, j = 0; i < nv; i++, j += 3) { d[i] = (pos[j] - o[0]) * nrm[0] + (pos[j + 1] - o[1]) * nrm[1] + (pos[j + 2] - o[2]) * nrm[2]; if (d[i] >= 0) su++; }
  if (su === 0 || su === nv) return [];
  const punti = new Map(), X = [], a0 = [], a1 = [];
  const punto = (a, b) => {
    if (a > b) { const t = a; a = b; b = t; }
    const k = a * nv + b; let i = punti.get(k);
    if (i === undefined) {
      const t = d[a] / (d[a] - d[b]), ia = a * 3, ib = b * 3;
      i = X.length / 3; punti.set(k, i); a0.push(-1); a1.push(-1);
      X.push(pos[ia] + (pos[ib] - pos[ia]) * t, pos[ia + 1] + (pos[ib + 1] - pos[ia + 1]) * t, pos[ia + 2] + (pos[ib + 2] - pos[ia + 2]) * t);
    }
    return i;
  };
  const lega = (i, j) => { if (a0[i] < 0) a0[i] = j; else if (a1[i] < 0) a1[i] = j; };
  for (let t = 0; t < tri.length; t += 3) {
    const a = tri[t], b = tri[t + 1], c = tri[t + 2], sa = d[a] >= 0, sb = d[b] >= 0, sc = d[c] >= 0;
    if (sa === sb && sb === sc) continue;
    let p, q;
    if (sa === sb) { p = punto(a, c); q = punto(b, c); } else if (sa === sc) { p = punto(a, b); q = punto(c, b); } else { p = punto(b, a); q = punto(c, a); }
    if (p !== q) { lega(p, q); lega(q, p); }
  }
  const n = a0.length, visto = new Uint8Array(n), catene = [];
  const cammina = (inizio) => {
    const c = []; let prec = -1, i = inizio;
    while (i >= 0 && !visto[i]) { visto[i] = 1; c.push(X[i * 3], X[i * 3 + 1], X[i * 3 + 2]); const s = a0[i] !== prec && a0[i] >= 0 && !visto[a0[i]] ? a0[i] : (a1[i] >= 0 && !visto[a1[i]] ? a1[i] : -1); prec = i; i = s; }
    return c;
  };
  for (let i = 0; i < n; i++) if (!visto[i] && a1[i] < 0) { const c = cammina(i); if (c.length >= 6) catene.push({ p: new Float32Array(c), chiusa: false }); }
  for (let i = 0; i < n; i++) if (!visto[i]) { const c = cammina(i); if (c.length >= 9) catene.push({ p: new Float32Array(c), chiusa: true }); }
  return grezzo ? catene : unisci(catene);
}
/* La stessa parete arriva spesso in più tratti aperti (superficie esterna e interna, interrotte all'orifizio).
   Li concatena per vicinanza degli estremi: ne esce un anello che racchiude la sola parete. */
function unisci(catene) {
  const aperte = catene.filter(c => !c.chiusa), chiuse = catene.filter(c => c.chiusa);
  if (aperte.length < 2) return catene;
  const fine = (c, testa) => { const p = c.p, i = testa ? 0 : p.length - 3; return [p[i], p[i + 1], p[i + 2]]; };
  const rovescia = p => { const r = new Float32Array(p.length); for (let i = 0; i < p.length; i += 3) { const j = p.length - 3 - i; r[i] = p[j]; r[i + 1] = p[j + 1]; r[i + 2] = p[j + 2]; } return r; };
  const resto = aperte.slice(), out = chiuse.slice();
  while (resto.length) {
    let pezzi = [resto.shift().p];
    for (;;) {
      const coda = fine({ p: pezzi[pezzi.length - 1] }, false); let best = -1, inv = false, dmin = Infinity;
      resto.forEach((c, k) => { const a = len(sub(fine(c, true), coda)), b = len(sub(fine(c, false), coda)); if (a < dmin) { dmin = a; best = k; inv = false; } if (b < dmin) { dmin = b; best = k; inv = true; } });
      if (best < 0) break;
      const c = resto.splice(best, 1)[0]; pezzi.push(inv ? rovescia(c.p) : c.p);
    }
    let n = 0; pezzi.forEach(p => n += p.length); const p = new Float32Array(n); n = 0; pezzi.forEach(q => { p.set(q, n); n += q.length; });
    out.push({ p, chiusa: true });
  }
  return out;
}
function tipoDi(nome) {
  const s = nome.toLowerCase();
  if (/papillary/.test(s)) return 'pap';
  if (/leaflet|valve/.test(s)) return 'valv';
  if (/ventricle/.test(s) && !/vein|artery|branch/.test(s)) return 'mio';
  if (/atrium|auricle/.test(s) && !/vein|artery|branch/.test(s)) return 'atrio';
  if (/aorta|pulmonary|vena cava|trunk/.test(s)) return 'vaso';
  return 'cor';
}
const centro = m => { let x = 0, y = 0, z = 0; for (let i = 0; i < m.pos.length; i += 3) { x += m.pos[i]; y += m.pos[i + 1]; z += m.pos[i + 2]; } const n = m.nv; return [x / n, y / n, z / n]; };
const trova = (M, re) => M.filter(m => re.test(m.nome));
const centroDi = (ms) => { if (!ms.length) return null; let s = [0, 0, 0], n = 0; for (const m of ms) { s = add(s, mul(centro(m), m.nv)); n += m.nv; } return mul(s, 1 / n); };

/* Punti di repere ricavati dalla geometria: asse lungo del ventricolo sinistro, apice, base, direzioni anatomiche. */
function reperi(M) {
  const LV = trova(M, /^Left ventricle/)[0], RV = trova(M, /^Right ventricle/)[0], LA = trova(M, /^Left atrium/)[0], RA = trova(M, /^Right atrium/)[0];
  if (!LV || !RV || !LA || !RA) return null;
  const cLV = centro(LV), cRV = centro(RV), cLA = centro(LA), cRA = centro(RA);
  let ax = norm(sub(cLV, cLA)), apice = cLV, base = cLA;
  for (let giro = 0; giro < 2; giro++) {
    let max = -1e9, min = 1e9; const q = [];
    for (let i = 0; i < LV.pos.length; i += 3) { const t = (LV.pos[i] - cLV[0]) * ax[0] + (LV.pos[i + 1] - cLV[1]) * ax[1] + (LV.pos[i + 2] - cLV[2]) * ax[2]; q.push(t); if (t > max) { max = t; apice = [LV.pos[i], LV.pos[i + 1], LV.pos[i + 2]]; } if (t < min) min = t; }
    const soglia = min + (max - min) * 0.1; let s = [0, 0, 0], n = 0;
    for (let i = 0; i < q.length; i++) if (q[i] < soglia) { s = add(s, [LV.pos[i * 3], LV.pos[i * 3 + 1], LV.pos[i * 3 + 2]]); n++; }
    base = mul(s, 1 / n); ax = norm(sub(apice, base));
  }
  const axb = mul(ax, -1), L = dot(sub(base, apice), axb);           // axb: dall'apice verso la base
  /* linea mediana della cavità: centroidi del contorno endocardico (il più piccolo chiuso) a tre altezze */
  const endo = z => {
    const o = add(apice, mul(axb, z * L)), e1 = norm(orto(Math.abs(axb[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], axb)), e2 = cross(axb, e1); let best = null;
    for (const c of taglia(LV, o, axb)) {
      if (!c.chiusa) continue; const p = c.p, n = p.length / 3; let A = 0, cx = 0, cy = 0;
      for (let i = 0; i < n; i++) { const j = (i + 1) % n, w1 = [p[i * 3] - o[0], p[i * 3 + 1] - o[1], p[i * 3 + 2] - o[2]], w2 = [p[j * 3] - o[0], p[j * 3 + 1] - o[1], p[j * 3 + 2] - o[2]];
        const x1 = dot(w1, e1), y1 = dot(w1, e2), x2 = dot(w2, e1), y2 = dot(w2, e2), cr = x1 * y2 - x2 * y1; A += cr; cx += (x1 + x2) * cr; cy += (y1 + y2) * cr; }
      A /= 2; if (Math.abs(A) < 0.004 * L * L) continue; cx /= 6 * A; cy /= 6 * A;
      if (!best || Math.abs(A) < best.A) best = { A: Math.abs(A), c: add(o, add(mul(e1, cx), mul(e2, cy))) };
    }
    return best;
  };
  const s1 = endo(0.3), s2 = endo(0.5), s3 = endo(0.7);
  let RmEndo = 0, aC = axb, oC = apice;     // linea mediana della cavità: serve solo alla deformazione
  if (s1 && s3) { const nuovo = norm(sub(s3.c, s1.c)); if (dot(nuovo, axb) > 0.8) { aC = nuovo; oC = add(s1.c, mul(aC, -dot(sub(s1.c, apice), aC))); } }
  if (s2) RmEndo = Math.sqrt(s2.A / Math.PI);
  const versoVS = norm(orto(sub(cLV, cRV), axb)), n4 = cross(axb, versoVS), ant = norm(orto(sub(cRV, cLA), axb));
  const ao = centroDi(trova(M, /aortic valve/i)) || centroDi(trova(M, /^Ascending aorta/)) || add(base, mul(axb, 0.1 * L));
  /* raggio della cavità a metà ventricolo: 15° percentile della distanza dall'asse */
  const rho = [];
  for (let i = 0; i < LV.pos.length; i += 3) { const w = [LV.pos[i] - apice[0], LV.pos[i + 1] - apice[1], LV.pos[i + 2] - apice[2]], z = dot(w, axb); if (z > 0.45 * L && z < 0.7 * L) rho.push(len(sub(w, mul(axb, z)))); }
  rho.sort((a, b) => a - b); const Rm = RmEndo || (rho.length ? rho[Math.floor(rho.length * 0.15)] : 0.25 * L);
  const terrIVA = norm(orto(add(ant, mul(versoVS, -0.6)), axb));
  return { apice, base, axb, L, versoVS, n4, ant, ao, cLV, cRV, cLA, cRA, Rm, terrIVA, oC, aC, destre: [RV, RA], q: {} };
}
/* Correzione dichiarata del modello: nella mesh BodyParts3D la superficie settale del ventricolo destro è irregolare
   e dista fino a 1 cm dall'epicardio settale del sinistro. Riempito come tessuto, il setto risulterebbe spesso quasi il
   doppio della parete posteriore (quadro da ipertrofia settale asimmetrica). Qui i soli vertici settali del VD vengono
   avvicinati all'epicardio del VS, riducendo lo spazio dell'85%; la parete libera del VD resta com'è. */
function correggiSetto(M, G, quota) {
  const LV = M.find(m => /^Left ventricle/.test(m.nome)), RV = M.find(m => /^Right ventricle/.test(m.nome));
  if (!LV || !RV || RV._setto) return 0;
  const O = G.oC, a = G.aC, L = G.L, NZ = 24, NA = 36, epi = new Float32Array(NZ * NA), e1 = norm(orto(G.versoVS, a)), e2 = cross(a, e1);
  const coord = (P, i) => { const w = [P[i] - O[0], P[i + 1] - O[1], P[i + 2] - O[2]], z = dot(w, a), r = sub(w, mul(a, z)), rho = len(r);
    return { z, rho, r, iz: Math.floor((z / L + 0.1) / 1.4 * NZ), ia: Math.floor((Math.atan2(dot(r, e2), dot(r, e1)) + Math.PI) / (2 * Math.PI) * NA) % NA }; };
  for (let i = 0; i < LV.pos.length; i += 3) { const q = coord(LV.pos, i); if (q.iz >= 0 && q.iz < NZ) { const k = q.iz * NA + q.ia; if (q.rho > epi[k]) epi[k] = q.rho; } }
  const gapMax = 0.24 * L, f = quota === undefined ? 0.85 : quota; let mossi = 0;
  for (let i = 0; i < RV.pos.length; i += 3) {
    const q = coord(RV.pos, i); if (q.iz < 0 || q.iz >= NZ) continue;
    const R = epi[q.iz * NA + q.ia]; if (!R || q.rho <= R || q.rho > R + gapMax) continue;
    const verso = -dot(q.r, e1) / q.rho; if (verso < 0.2) continue;                      // solo dalla parte del setto
    const w = Math.min(1, (verso - 0.2) / 0.3) * Math.min(1, (R + gapMax - q.rho) / (0.25 * gapMax));
    const nuovo = q.rho - (q.rho - R) * f * w, k = nuovo / q.rho;
    RV.pos[i] = O[0] + a[0] * q.z + q.r[0] * k; RV.pos[i + 1] = O[1] + a[1] * q.z + q.r[1] * k; RV.pos[i + 2] = O[2] + a[2] * q.z + q.r[2] * k; mossi++;
  }
  RV._setto = mossi; RV._d = null; return mossi;
}

/* ---------- anelli valvolari ---------- */
function jacobi(A) {            // autovettori di una 3x3 simmetrica
  const a = A.map(r => r.slice()), V = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
  for (let it = 0; it < 30; it++) {
    let p = 0, q = 1; if (Math.abs(a[0][2]) > Math.abs(a[p][q])) { p = 0; q = 2; } if (Math.abs(a[1][2]) > Math.abs(a[p][q])) { p = 1; q = 2; }
    if (Math.abs(a[p][q]) < 1e-12) break;
    const th = 0.5 * Math.atan2(2 * a[p][q], a[q][q] - a[p][p]), c = Math.cos(th), s = Math.sin(th);
    for (let k = 0; k < 3; k++) { const x = a[k][p], y = a[k][q]; a[k][p] = c * x - s * y; a[k][q] = s * x + c * y; }
    for (let k = 0; k < 3; k++) { const x = a[p][k], y = a[q][k]; a[p][k] = c * x - s * y; a[q][k] = s * x + c * y; }
    for (let k = 0; k < 3; k++) { const x = V[k][p], y = V[k][q]; V[k][p] = c * x - s * y; V[k][q] = s * x + c * y; }
  }
  return [0, 1, 2].map(i => ({ l: a[i][i], v: [V[0][i], V[1][i], V[2][i]] })).sort((x, y) => x.l - y.l);
}
function punti(ms) { const P = []; for (const m of ms) for (let i = 0; i < m.pos.length; i += 3) P.push([m.pos[i], m.pos[i + 1], m.pos[i + 2]]); return P; }
/* cerchio che meglio approssima i punti nel piano di normale n (metodo di Kåsa) */
function cerchio(P, n, rmin, rmax) {
  let c = [0, 0, 0]; P.forEach(p => c = add(c, p)); c = mul(c, 1 / P.length);
  const e1 = norm(orto(Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], n)), e2 = cross(n, e1);
  let Sxx = 0, Sxy = 0, Syy = 0, Sx = 0, Sy = 0, Sxz = 0, Syz = 0, Sz = 0; const N = P.length;
  for (const p of P) { const w = sub(p, c), x = dot(w, e1), y = dot(w, e2), z = x * x + y * y; Sxx += x * x; Sxy += x * y; Syy += y * y; Sx += x; Sy += y; Sxz += x * z; Syz += y * z; Sz += z; }
  const M3 = [[Sxx, Sxy, Sx], [Sxy, Syy, Sy], [Sx, Sy, N]], b = [Sxz, Syz, Sz];
  const det = m => m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) - m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) + m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0]);
  const D = det(M3); let cx = 0, cy = 0, r = (rmin + rmax) / 2;
  if (Math.abs(D) > 1e-12) {
    const col = k => M3.map((row, i) => row.map((v, j) => j === k ? b[i] : v)), A = det(col(0)) / D, B = det(col(1)) / D, C = det(col(2)) / D;
    cx = A / 2; cy = B / 2; const r2 = C + cx * cx + cy * cy; if (r2 > 0) r = Math.sqrt(r2);
  }
  if (!(r >= rmin && r <= rmax)) { cx = cy = 0; let s = 0; P.forEach(p => { const w = sub(p, c); s += Math.hypot(dot(w, e1), dot(w, e2)); }); r = Math.max(rmin, Math.min(rmax, s / N)); }
  return { c: add(c, add(mul(e1, cx), mul(e2, cy))), r };
}
function valvole(M, G) {
  const out = [], L = G.L;
  const cuspidi = (re, verso, nome, rmin, rmax) => {
    const ms = trova(M, re); if (!ms.length) return;
    const P = punti(ms); let c = [0, 0, 0]; P.forEach(p => c = add(c, p)); c = mul(c, 1 / P.length);
    let n = jacobi((() => { const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]]; P.forEach(p => { const w = sub(p, c); for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) A[i][j] += w[i] * w[j]; }); return A; })())[0].v;
    if (dot(n, sub(verso, c)) < 0) n = mul(n, -1);
    const f = cerchio(P, n, rmin * L, rmax * L);
    out.push({ nome, tipo: 'sl', c: f.c, r: f.r, n, cus: ms.map(m => centro(m)) });
  };
  const atrioventricolare = (re, atrio, nome, rmin, rmax, avanti, frazione) => {
    const ms = trova(M, re); if (!ms.length) return;
    const P = punti(ms); let c = [0, 0, 0]; P.forEach(p => c = add(c, p)); c = mul(c, 1 / P.length);
    const na = norm(sub(atrio, c)), q = P.map(p => dot(sub(p, c), na)).sort((a, b) => a - b), soglia = q[Math.floor(q.length * 0.72)];
    /* Il modello d'origine non ha il lembo anteriore: il cerchio stimato dai soli lembi presenti è spostato
       all'indietro. Si parte dal centroide della cerniera (su un arco di circa metà circonferenza dista 2r/π dal centro)
       e ci si sposta verso il lato mancante, cioè verso l'anello aortico o la parete anteriore. */
    const H = P.filter(p => dot(sub(p, c), na) >= soglia); let h = [0, 0, 0]; H.forEach(p => h = add(h, p)); h = mul(h, 1 / H.length);
    const f = cerchio(H, na, rmin * L, rmax * L), r = Math.max(rmin * L, Math.min(rmax * L, f.r));
    const dir = norm(orto(sub(avanti, h), na)), cc = add(h, mul(dir, frazione * r));
    out.push({ nome, tipo: 'av', c: cc, r, n: mul(na, -1), avanti });
  };
  const ascendente = centroDi(trova(M, /^Ascending aorta/)) || add(G.base, mul(G.axb, 0.6 * L));
  const tronco = centroDi(trova(M, /^Pulmonary trunk/)) || add(G.cRV, mul(G.axb, 0.8 * L));
  cuspidi(/coronary leaflet/i, ascendente, 'aortica', 0.08, 0.2);
  cuspidi(/semilunar leaflet of pulmonary/i, tronco, 'polmonare', 0.08, 0.2);
  const ao = out.find(v => v.nome === 'aortica');
  atrioventricolare(/left atrioventricular/i, G.cLA, 'mitrale', 0.16, 0.22, ao ? ao.c : G.ao, 0.64);
  atrioventricolare(/right atrioventricular/i, G.cRA, 'tricuspide', 0.18, 0.25, add(G.cRV, mul(G.ant, L)), 0.45);
  return out;
}
/* Apertura delle valvole nel ciclo (fase 0 = onda R). Atrioventricolari: onda E, diastasi, onda A. */
function apertura(tipo, f) {
  const liscio = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  if (tipo === 'sl') return liscio(0.06, 0.10, f) * (1 - liscio(0.31, 0.36, f));
  const E = liscio(0.44, 0.50, f) * (1 - 0.55 * liscio(0.52, 0.70, f)), A = 0.45 * liscio(0.84, 0.90, f);
  return Math.min(1, E + A) * (1 - liscio(0.955, 0.995, f)) * (f > 0.4 ? 1 : 0);
}

/* Campo di spostamento in sistole (c fra 0 e 1). Accorciamento radiale con ispessimento di parete
   (area conservata fuori dalla cavità) e discesa della base verso l'apice; gli atri si allungano. */
function deforma(G, p, c, out) {
  const O = G.oC || G.apice, a = G.aC || G.axb, L = G.L, wx = p[0] - O[0], wy = p[1] - O[1], wz = p[2] - O[2];
  const z = wx * a[0] + wy * a[1] + wz * a[2];
  let rx = wx - z * a[0], ry = wy - z * a[1], rz = wz - z * a[2];
  const rho = Math.hypot(rx, ry, rz), z0 = 0.06 * L;
  let R0 = 0;
  if (z > z0 && z <= L) { const t = (L - z) / (L - z0); R0 = G.Rm * Math.sqrt(Math.max(0, 1 - 0.9 * t * t)); }
  else if (z > L) R0 = G.Rm * Math.max(0, 1 - (z - L) / (0.22 * L));
  const Q = G.q || {}; let reg = 1;
  if (Q.acin && rho > 1e-6) {
    /* territorio dell'interventricolare anteriore: parete anteriore, setto anteriore, apice */
    const t = G.terrIVA, cosv = (rx * t[0] + ry * t[1] + rz * t[2]) / rho, w = Math.max(z < 0.32 * L ? 1 : 0, Math.min(1, Math.max(0, (cosv - 0.15) / 0.3)));
    reg = 1 - Q.acin * w * 1.12;            // poco oltre l'acinesia: lieve discinesia
  }
  const k = 0.52 * c * reg; let f = 1;
  if (rho > 1e-6 && R0 > 0) f = rho < R0 ? Math.sqrt(Math.max(0.05, 1 - k)) : Math.sqrt(Math.max(rho * rho - k * R0 * R0, 0)) / rho;
  if (Q.dil && R0 > 0 && z > 0 && z < 1.08 * L) {
    /* ventricolo sinistro dilatato: la cavità si allarga e si allunga, la parete si assottiglia */
    const w = rho < 1.2 * R0 ? 1 : Math.max(0, 1 - (rho - 1.2 * R0) / (0.5 * R0)); f *= 1 + Q.dil * w;
  }
  const m = 0.13 * c, z2 = z <= L ? z * (1 - m * Math.max(0, z) / L) : z - m * L * Math.max(0, 1 - (z - L) / (0.9 * L));
  const zz = Q.dil ? z2 - 0.18 * Q.dil * L * Math.max(0, 1 - z / L) : z2;   // la dilatazione allunga verso l'apice
  out[0] = O[0] + zz * a[0] + rx * f; out[1] = O[1] + zz * a[1] + ry * f; out[2] = O[2] + zz * a[2] + rz * f;
  return out;
}
/* Frazione d'eiezione del modello: area di cavità × lunghezza (ellissoide). Acinesia: circa un terzo dei segmenti fermi. */
function frazione(contr, acin) { const a = 1 - (acin || 0) * 0.38; return 1 - (1 - 0.52 * contr * a) * (1 - 0.13 * contr); }
/* ASE/EACVI 2015 (uomo): normale 52–72%, lievemente ridotta 41–51, moderatamente 30–40, gravemente < 30 */
function classeFE(fe) { const p = fe * 100; return p > 72 ? 'oltre il normale' : p >= 52 ? 'normale' : p >= 41 ? 'lievemente ridotta' : p >= 30 ? 'moderatamente ridotta' : 'gravemente ridotta'; }
const QUADRI = [
  { id: 'normale', nome: 'Normale', p: { contr: 1, dil: 0, ipert: 0, vers: 0, acin: 0, fc: 70 },
    testo: 'Cuore normale. Pareti di 0,6–1,0 cm che si ispessiscono in sistole, valvole sottili, nessuno spazio fra il cuore e il pericardio.', caso: null },
  { id: 'versamento', nome: 'Versamento pericardico', p: { contr: 1.05, dil: 0, ipert: 0, vers: 16, acin: 0, fc: 108 },
    testo: 'Spazio nero fra epicardio e pericardio, attorno a tutto il cuore. Si misura in telediastole nel punto più ampio: lieve sotto 10 mm, moderato 10–20 mm, grande oltre 20 mm. Qui: 16 mm, moderato. La quantità non dice da sola se c’è tamponamento: conta la velocità con cui si è formato.', caso: 'tamponamento', fonte: 'esc-peri-2015' },
  { id: 'ipertrofia', nome: 'Ipertrofia ventricolare sinistra', p: { contr: 1, dil: 0, ipert: 0.7, vers: 0, acin: 0, fc: 66 },
    testo: 'Pareti spesse, cavità normale o piccola. Lo spessore di setto e parete posteriore è normale fra 0,6 e 1,0 cm nell’uomo (0,6–0,9 nella donna); qui supera 1,5 cm. All’ECG corrisponde ai criteri di voltaggio con alterazioni della ripolarizzazione «da sovraccarico».', caso: null, fonte: 'ase-2015' },
  { id: 'dilatata', nome: 'Cardiomiopatia dilatata', p: { contr: 0.34, dil: 0.32, ipert: 0, vers: 0, acin: 0, fc: 92 },
    testo: 'Ventricolo sinistro grande e sferico, pareti sottili che si muovono poco in tutti i segmenti. La frazione d’eiezione è gravemente ridotta. All’ECG: spesso blocco di branca sinistra, tachicardia, extrasistoli.', caso: null, fonte: 'ase-2015' },
  { id: 'acinesia', nome: 'Infarto anteriore (acinesia IVA)', p: { contr: 1, dil: 0, ipert: 0, vers: 0, acin: 1, fc: 96 },
    testo: 'Setto anteriore, parete anteriore e apice non si ispessiscono e non si muovono verso il centro; le altre pareti sì. È il territorio della discendente anteriore: guardalo in quattro camere, due camere e nell’asse corto ai muscoli papillari. All’ECG corrisponde al sopraslivellamento in V1–V4.', caso: 'stemi-anteriore', fonte: 'ase-2015' }
];

/* Contrazione nel ciclo: fase 0 = onda R. */
function contrazione(f) {
  if (f < 0.04) return 0;
  if (f < 0.34) { const t = (f - 0.04) / 0.30; return 0.5 - 0.5 * Math.cos(Math.PI * t); }
  if (f < 0.52) { const t = (f - 0.34) / 0.18; return 0.5 + 0.5 * Math.cos(Math.PI * t); }
  if (f > 0.86) { const t = (f - 0.86) / 0.14; return -0.06 * Math.sin(Math.PI * t); }   // contributo atriale
  return 0;
}

/* ---------- torace ----------
   Il modello è in coordinate anatomiche: +x verso la sinistra del paziente, +y craniale, +z anteriore.
   Scala: la distanza fra apice endocardico e centro della mitrale vale 8 cm, la lunghezza di un ventricolo sinistro
   adulto normale in telediastole. Con questa scala il modello dà anello aortico 2,3 cm, anello mitralico 3,4 cm,
   diametro telediastolico del ventricolo sinistro 4,7 cm, cuore largo 13 cm e torace osseo di 31 cm: misure normali,
   ricavate in modo indipendente l'una dall'altra (tests/eco.test.cjs). */
const LUNGHEZZA_VS_CM = 8;
/* finestra parasternale: cm a sinistra della linea mediana, cm sopra il centro del cuore */
const FINESTRA = { plax: [2.5, 0], 'psax-ao': [3, -2], 'psax-mv': [2, -0.5], 'psax-pm': [1.5, 2], 'psax-ap': [5, -3.5] };   // scelte minimizzando i raggi bloccati dalle coste (tests/eco.test.cjs)
function torace(G) {
  const u = G.L / 8.5, cm = assi(G).Lc / LUNGHEZZA_VS_CM, hc = mul(add(add(G.cLV, G.cRV), add(G.cLA, G.cRA)), 0.25);
  /* misure prese dallo scheletro e dalla cute di Z-Anatomy, nella stessa scena del cuore
     (prototipo-cuore/torace-z-anatomy.glb): linea mediana dello sterno 1,65 cm a destra del centro del cuore,
     giugulo 9,9 cm sopra e xifoide 6,1 cm sotto; all'altezza del cuore la cute anteriore è 8,6 cm davanti,
     il torace è largo circa 28 cm (sesta costa 24,5 cm più la parete) e profondo 22,8 cm */
  /* (misure in unità del modello: u = lunghezza esterna del VS / 8,5, come al momento della misura sull'atlante) */
  const a = 14 * u, b = 11.4 * u, x0 = hc[0] - 1.65 * u, fronte = hc[2] + 8.6 * u;
  return { cm, hc, a, b, x0, zc: fronte - b, fronte, giugulo: hc[1] + 9.9 * u, xifoide: hc[1] - 6.1 * u, basso: hc[1] - 21 * u };
}
/* dove la retta o + t·d entra nel torace (cilindro ellittico): t del punto di ingresso, oppure null */
function ingresso(Tr, o, d) {
  const px = (o[0] - Tr.x0) / Tr.a, pz = (o[2] - Tr.zc) / Tr.b, dx = d[0] / Tr.a, dz = d[2] / Tr.b;
  const A = dx * dx + dz * dz, B = 2 * (px * dx + pz * dz), C = px * px + pz * pz - 1, D = B * B - 4 * A * C;
  if (A < 1e-9 || D < 0) return null;
  return (-B - Math.sqrt(D)) / (2 * A);
}
/* porta l'origine del fascio sulla cute, lungo il fascio stesso: il piano non cambia, cambia la profondità */
function sullaPelle(Tr, P, minProf) {
  const t = ingresso(Tr, P.o, P.d); if (t === null) return P;
  return Object.assign({}, P, { o: add(P.o, mul(P.d, t)), prof: Math.max(minProf, P.prof - t) });
}

/* ---------- proiezioni standard ---------- */
/* Esami reali di riferimento (casi normali con strutture etichettate, Radiopaedia, autore D. Carroll):
   solo collegamenti, nessuna immagine viene copiata nell'app. */
const REALE = {
  plax: 'https://radiopaedia.org/cases/62652', 'psax-ao': 'https://radiopaedia.org/cases/62654', 'psax-mv': 'https://radiopaedia.org/cases/62654',
  'psax-pm': 'https://radiopaedia.org/cases/62654', 'psax-ap': 'https://radiopaedia.org/cases/62654', a4c: 'https://radiopaedia.org/cases/62756',
  a2c: 'https://radiopaedia.org/articles/transthoracic-echocardiography', a3c: 'https://radiopaedia.org/articles/transthoracic-echocardiography',
  sub: 'https://radiopaedia.org/cases/154437'
};
const VISTE = [
  { id: 'plax', nome: 'Parasternale asse lungo', breve: 'PLAX',
    sonda: 'Margine sinistro dello sterno, 3°–4° spazio intercostale. Repere della sonda verso la spalla destra. Paziente sul fianco sinistro.',
    vedi: 'In alto, vicino alla sonda, il ventricolo destro. Sotto, il setto interventricolare, la cavità del ventricolo sinistro e la parete posteriore. A destra dello schermo la radice aortica e, dietro, l’atrio sinistro. L’apice resta fuori dall’immagine, a sinistra.',
    valuta: ['Dimensioni e spessori del ventricolo sinistro (setto, cavità, parete posteriore).', 'Radice aortica e atrio sinistro.', 'Valvola mitrale e valvola aortica.', 'Versamento pericardico dietro la parete posteriore.'] },
  { id: 'psax-ao', nome: 'Parasternale asse corto · base', breve: 'PSAX base',
    sonda: 'Dalla parasternale asse lungo, ruota la sonda di 90° in senso orario (repere verso la spalla sinistra) e inclinala verso la base.',
    vedi: 'Al centro la valvola aortica in sezione trasversale. Attorno, in senso orario: tratto di efflusso del ventricolo destro, valvola polmonare, atrio sinistro, setto interatriale, atrio destro, valvola tricuspide.',
    valuta: ['Morfologia della valvola aortica (tre cuspidi).', 'Efflusso destro e valvola polmonare.', 'Setto interatriale.'] },
  { id: 'psax-mv', nome: 'Parasternale asse corto · mitrale', breve: 'PSAX mitrale',
    sonda: 'Dalla proiezione della base, inclina il fascio leggermente verso l’apice.',
    vedi: 'Il ventricolo sinistro circolare con la valvola mitrale in sezione («a bocca di pesce» in diastole). Il ventricolo destro è una mezzaluna in alto a sinistra.',
    valuta: ['Apertura della mitrale.', 'Cinetica dei segmenti basali.', 'Forma del setto: rotondo verso destra è normale; appiattito indica sovraccarico destro.'] },
  { id: 'psax-pm', nome: 'Parasternale asse corto · papillari', breve: 'PSAX papillari',
    sonda: 'Inclina ancora verso l’apice fino a vedere i due muscoli papillari.',
    vedi: 'Il ventricolo sinistro come un anello, con i due muscoli papillari che sporgono nella cavità. È la sezione in cui si vedono insieme i territori delle tre coronarie.',
    valuta: ['Cinetica segmentaria: ogni spicchio deve ispessirsi e muoversi verso il centro.', 'Funzione globale «a colpo d’occhio».', 'Rapporto fra ventricolo destro e sinistro.'] },
  { id: 'psax-ap', nome: 'Parasternale asse corto · apice', breve: 'PSAX apice',
    sonda: 'Sposta la sonda di uno spazio verso il basso o inclina ancora verso l’apice.',
    vedi: 'La parte apicale del ventricolo sinistro: un anello piccolo, senza papillari.',
    valuta: ['Cinetica dei segmenti apicali.', 'Trombi apicali dopo un infarto anteriore.'] },
  { id: 'a4c', nome: 'Apicale quattro camere', breve: 'A4C',
    sonda: 'Sull’itto della punta, repere verso sinistra (circa ore 3), fascio diretto verso la spalla destra.',
    vedi: 'L’apice in alto, vicino alla sonda. Ventricoli in alto e atri in basso; le camere sinistre a destra dello schermo. Il setto è verticale al centro; le due valvole atrio-ventricolari sono affiancate, con la tricuspide leggermente più vicina all’apice.',
    valuta: ['Dimensioni relative delle quattro camere: il ventricolo destro è normalmente più piccolo del sinistro.', 'Funzione sistolica dei due ventricoli e frazione di eiezione.', 'Parete laterale e setto inferiore.', 'Valvole mitrale e tricuspide.'] },
  { id: 'a2c', nome: 'Apicale due camere', breve: 'A2C',
    sonda: 'Dalla quattro camere, ruota la sonda di circa 60° in senso antiorario finché il ventricolo destro scompare.',
    vedi: 'Solo ventricolo sinistro e atrio sinistro. Le due pareti visibili sono l’anteriore e l’inferiore.',
    valuta: ['Cinetica di parete anteriore e inferiore.', 'Seconda misura per la frazione di eiezione biplana.'] },
  { id: 'a3c', nome: 'Apicale tre camere', breve: 'A3C',
    sonda: 'Ruota ancora di circa 60° in senso antiorario finché compare l’efflusso verso l’aorta.',
    vedi: 'Lo stesso piano della parasternale asse lungo, ma visto dall’apice: ventricolo sinistro, atrio sinistro e radice aortica.',
    valuta: ['Setto anteriore e parete infero-laterale.', 'Tratto di efflusso sinistro e valvola aortica.'] },
  { id: 'sub', nome: 'Sottocostale quattro camere', breve: 'Sottocostale',
    sonda: 'Sotto il processo xifoideo, sonda quasi piatta sull’addome, fascio verso la spalla sinistra, repere verso la sinistra del paziente. Paziente supino con le ginocchia flesse.',
    vedi: 'Le quattro camere viste da sotto, attraverso il fegato: le camere destre in alto, vicino alla sonda; l’apice a destra dello schermo.',
    valuta: ['Versamento pericardico: è la proiezione più usata in emergenza.', 'Setto interatriale, qui perpendicolare al fascio.', 'Alternativa quando le finestre toraciche sono scadenti.'] }
];
/* Inclinazione del fascio nel proprio piano (gradi) per le viste apicali: la sonda scivola nello spazio
   intercostale libero più vicino all'apice e si inclina verso di esso, come fa l'ecografista.
   Valori scelti minimizzando i raggi bloccati dalle coste (tests/eco.test.cjs controlla che la sonda non sia su un osso). */
const INCLINAZIONE = { a4c: 18, a2c: 8, a3c: -8 };
function inclinaNelPiano(P, centro, g) {
  if (!g) return P; const t = g * Math.PI / 180, d = norm(ruota(P.d, P.u, t)), u = norm(ruota(P.u, mul(P.d, -1), t));
  const dist = len(sub(centro, P.o)); return Object.assign({}, P, { o: sub(centro, mul(d, dist)), d, u });
}
function piano(G, id) {
  let P = pianoCuore(G, id); const Tr = G.Tr;
  if (id in INCLINAZIONE) { const g = (G.inclinazione || INCLINAZIONE)[id]; if (g) P = inclinaNelPiano(P, assi(G).apE, g); }
  if (!Tr || id === 'sub') return P;
  return sullaPelle(Tr, P, (id[0] === 'a' ? 16 : 15) * Tr.cm);
}
/* Punti di repere dell'ecografista: apice endocardico, centro della mitrale, della tricuspide e dell'aorta.
   L'asse lungo del ventricolo sinistro è la linea apice–mitrale. */
function assi(G) {
  if (G._assi) return G._assi;
  const vv = n => (G.V || []).find(v => v.nome === n), mi = vv('mitrale'), tr = vv('tricuspide'), ao = vv('aortica');
  const O = G.oC || G.apice, a = G.aC || G.axb, zA = dot(sub(G.apice, O), a) + 0.07 * G.L;      // apice endocardico: ~0,6 cm dentro l'epicardio
  const apE = add(O, mul(a, zA)), M0 = mi ? mi.c : G.base, asse = norm(sub(M0, apE));
  return (G._assi = { apE, mi: M0, tr: tr ? tr.c : G.cRA, ao: ao ? ao.c : G.ao, asse, Lc: len(sub(M0, apE)) });
}
function pianoCuore(G, id) {
  const { apice, axb, L, versoVS, n4, ant, ao } = G, pt = z => add(apice, mul(axb, z)), vv = n => (G.V || []).find(v => v.nome === n);
  const CM = G.Tr ? G.Tr.cm : L / 8.5, A = assi(G), lungo = z => add(A.apE, mul(A.asse, z * A.Lc));   // z = 0 apice, 1 mitrale
  if (id === 'a4c') {
    /* quattro camere: piano per apice, mitrale e tricuspide; camere sinistre a destra dello schermo */
    const d = A.asse, n = norm(cross(d, sub(A.tr, A.apE))); let u = norm(cross(n, d)); if (dot(sub(A.mi, A.tr), u) < 0) u = mul(u, -1);
    return { o: add(A.apE, mul(d, -1.5 * CM)), d, u, prof: 17 * CM };
  }
  if (id === 'a2c' || id === 'a3c') {
    /* due camere: +70° dalla quattro camere, dove il piano non incontra più le camere destre;
       tre camere: l'angolo che porta il piano per il centro dell'anello aortico */
    const P4 = pianoCuore(G, 'a4c'), n0 = cross(P4.d, P4.u), ruo = g => Object.assign({}, P4, { u: norm(ruota(P4.u, n0, g)) });
    if (id === 'a3c') {   /* tre camere: piano per apice, mitrale e aorta (lo stesso dell'asse lungo parasternale) */
      const n = norm(cross(P4.d, sub(A.ao, A.apE))); let u = norm(cross(n, P4.d)); if (dot(sub(A.ao, A.apE), u) < 0) u = mul(u, -1);
      return Object.assign({}, P4, { u });
    }
    /* due camere: fra la quattro e la tre camere, il piano che non incontra le camere destre (circa 60° dalla quattro camere) */
    const RD = G.destre || [], conta = P => { const n = cross(P.d, P.u); let k = 0; for (const m of RD) k += taglia(m, P.o, n).reduce((s, c) => s + c.p.length, 0); return k; };
    let best = 60, kmin = Infinity;
    if (RD.length) for (let g = 40; g <= 100; g += 5) { const k = conta(ruo(g * Math.PI / 180)) + Math.abs(g - 60) * 3; if (k < kmin) { kmin = k; best = g; } }
    return ruo(best * Math.PI / 180);
  }
  if (id === 'sub') {
    /* sonda sotto il processo xifoideo, quasi piatta sull'addome, fascio verso la spalla sinistra */
    const Tr = G.Tr, o = Tr ? [Tr.x0 - 0.5 * Tr.cm, Tr.xifoide - 2.5 * Tr.cm, Tr.fronte - 1.2 * Tr.cm] : add(pt(0.5 * L), [0, -1.4 * L, 0.6 * L]);
    const bers = Tr ? Tr.hc : pt(0.6 * L), d = norm(sub(bers, o)), nn = norm(orto(n4, d)); let u = norm(cross(nn, d));
    if (dot(sub(apice, o), u) < 0) u = mul(u, -1);
    return { o, d, u, prof: Math.min(20 * CM, len(sub(bers, o)) + 7 * CM) };
  }
  /* Finestra parasternale sinistra: 3°–4° spazio intercostale, circa 1,5 cm a sinistra del margine sternale.
     Tutte le proiezioni parasternali partono da qui (ASE 2019); cambia solo l'orientamento del piano. */
  const Tr = G.Tr, cm = CM;
  const F = (G.finestra || FINESTRA)[id] || FINESTRA.plax, W = Tr ? [Tr.x0 + F[0] * cm, Tr.hc[1] + F[1] * cm, Tr.fronte] : add(pt(0.72 * L), mul(ant, 0.95 * L));
  /* piano dell'asse lungo: apice, mitrale, aorta (ASE); la sonda è la finestra parasternale riportata sul piano */
  let nL = norm(cross(sub(A.mi, A.apE), sub(A.ao, A.apE))); if (dot(nL, versoVS) < 0) nL = mul(nL, -1);
  const Wp = sub(W, mul(nL, dot(sub(W, A.mi), nL)));
  if (id === 'plax') {
    const T0 = lungo(0.7), d = norm(sub(T0, Wp)); let u = norm(cross(nL, d));
    if (dot(sub(A.ao, T0), u) < 0) u = mul(u, -1);          // radice aortica a destra dello schermo
    return { o: Wp, d, u, prof: 16 * CM };
  }
  /* assi corti: dalla stessa finestra la sonda ruota di 90° e si inclina verso il livello voluto
     (valvola aortica, mitrale, muscoli papillari, apice) */
  const v = id === 'psax-ao' ? vv('aortica') : id === 'psax-mv' ? vv('mitrale') : null;
  const c0 = id === 'psax-ao' ? (v ? v.c : A.ao) : id === 'psax-mv' ? (v ? add(v.c, mul(v.n, 0.35 * v.r)) : lungo(0.85)) : lungo(id === 'psax-pm' ? 0.5 : 0.22);
  const d = norm(sub(c0, Wp)); let u = norm(orto(nL, d)); if (u[0] < 0) u = mul(u, -1);   // sinistra del paziente a destra dello schermo
  return { o: Wp, d, u, prof: 16 * CM };
}
/* applica rotazione attorno all'asse del fascio e inclinazione attorno all'asse laterale */
function orienta(P, rot, incl) {
  const n = cross(P.d, P.u), u = norm(ruota(P.u, n, rot)), n2 = cross(P.d, u), d = norm(ruota(P.d, n2, incl));
  return { o: P.o, d, u, n: norm(cross(d, u)), prof: P.prof };
}

const API = { REALE, INCLINAZIONE, FINESTRA, correggiSetto, assi, salda, taglia, unisci, tipoDi, reperi, deforma, contrazione, piano, orienta, valvole, apertura, torace, ingresso, frazione, classeFE, VISTE, QUADRI };
if (typeof module !== 'undefined' && module.exports) { module.exports = API; return; }

/* ====================================================================== interfaccia */
const $ = s => document.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const GRIGI = { mio: 150, pap: 160, valv: 235, atrio: 170, vaso: 180, cor: 120 };
const ORDINE = { vaso: 0, atrio: 1, cor: 2, mio: 3, pap: 4, valv: 5 };
const MEZZO = Math.PI / 4;      // semiapertura del settore: 45°

function avvia() {
  const vista = $('#v-eco'); if (!vista || !root.THREE || !root.THREE.GLTFLoader) return;
  const T = root.THREE;
  vista.innerHTML =
    '<div class="eco-left"><div class="eco-schermo" id="ecoSchermo"><canvas id="ecoTela"></canvas><canvas id="ecoMM" class="eco-mm"></canvas><div class="eco-stato" id="ecoStato">Carico il modello del cuore…</div></div>' +
    '<p class="eco-nota">Simulazione geometrica a scopo didattico: non è un’ecografia reale. Sezione calcolata dal modello anatomico Z-Anatomy (CC BY-SA 4.0); tessitura e movimento sono sintetici, le valvole sono ricostruite (il modello non ha i lembi anteriori). Niente Doppler. Non certificata da un cardiologo.</p></div>' +
    '<div class="eco-right"><div class="eco-3d"><canvas id="eco3d"></canvas><span>Trascina per ruotare · il ventaglio è il fascio</span><div class="eco-strati" id="ecoStrati"><button data-s="pelle" class="on">Pelle</button><button data-s="polmone">Polmoni</button><button data-s="fegato" class="on">Fegato</button></div></div>' +
    '<div class="eco-viste" id="ecoViste">' + VISTE.map(v => '<button data-v="' + v.id + '">' + esc(v.breve) + '</button>').join('') + '</div>' +
    '<div class="eco-quadri"><span>Quadro</span><div id="ecoQuadri">' + QUADRI.map(q => '<button data-q="' + q.id + '">' + esc(q.nome) + '</button>').join('') + '</div><div class="eco-quadro-testo" id="ecoQTesto"></div></div>' +
    '<div class="eco-ctl">' +
    '<label>Ruota la sonda <output id="ecoRotV">0°</output><input type="range" id="ecoRot" min="-90" max="90" value="0" step="1"></label>' +
    '<label>Inclina <output id="ecoIncV">0°</output><input type="range" id="ecoInc" min="-30" max="30" value="0" step="1"></label>' +
    '<label>Profondità <output id="ecoProfV">auto</output><input type="range" id="ecoProf" min="8" max="24" value="16" step="1"></label>' +
    '<label>Guadagno <output id="ecoGuaV">0</output><input type="range" id="ecoGua" min="-10" max="10" value="0" step="1"></label>' +
    '<label>Frequenza <output id="ecoFcV">70/min</output><input type="range" id="ecoFc" min="40" max="150" value="70" step="1"></label>' +
    '<label>Contrattilità <output id="ecoCoV">normale</output><input type="range" id="ecoCo" min="10" max="120" value="100" step="5"></label>' +
    '<div class="eco-riga"><button class="btn" id="ecoEt">Etichette</button><button class="btn" id="ecoPausa">Pausa</button><button class="btn" id="ecoZero">Azzera sonda</button><button class="btn" id="ecoCal">Calibro</button><button class="btn" id="ecoMMb">M-mode</button></div>' +
    '<p class="eco-aiuto" id="ecoAiuto"></p></div>' +
    '<div class="eco-testo" id="ecoTesto"></div></div>';

  const tela = $('#ecoTela'), cx = tela.getContext('2d'), stato = $('#ecoStato');
  const masc = document.createElement('canvas'), mx = masc.getContext('2d');
  let W = 0, H = 0, S = 1, ox = 0, oy = 0, grana = [], sfondo = null;
  let M = null, G = null, V = [], P = null, sfoc = null, ossaM = [], posEt = [], profUtente = 0, guadagno = 0, calibro = false, misure = [], mmodo = false, mmAng = 0, sezione = [], idVista = 'a4c', rot = 0, incl = 0, fc = 70, contr = 1, etichette = true, pausa = false;
  let fase = 0, ultimo = 0, attiva = false, raf = 0, quadro = 0, sporco3d = true, idQuadro = 'normale';
  const FONTI_ECO = {
    'ase-2015': { t: 'ASE/EACVI 2015 — Quantificazione delle camere cardiache', r: 'Lang RM et al. J Am Soc Echocardiogr 2015;28:1–39', u: 'https://doi.org/10.1016/j.echo.2014.10.003' },
    'esc-peri-2015': { t: 'ESC 2015 — Malattie del pericardio', r: 'Adler Y et al. Eur Heart J 2015;36:2921–2964', u: 'https://doi.org/10.1093/eurheartj/ehv318' }
  };
  let r3 = null, scena = null, cam = null, ventaglio = null, sonda3 = null, az = 0.6, el = 0.25, raggio = 6, bersaglio = null;

  /* ----- tessitura a grana d'arco, come lo speckle di una sonda settoriale ----- */
  function casuale(i, j, k) { let h = (i * 374761393 + j * 668265263 + k * 2147483647) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967295; }
  function creaGrana() {
    grana = []; const w = Math.ceil(W / 2), h = Math.ceil(H / 2), ax = ox / 2, ay = oy / 2;
    for (let k = 0; k < 4; k++) {
      const c = document.createElement('canvas'); c.width = w; c.height = h; const g = c.getContext('2d'), im = g.createImageData(w, h), D = im.data;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = x - ax, dy = y - ay, r = Math.hypot(dx, dy), th = Math.atan2(dx, dy);
        const a = casuale(Math.floor(r / 1.25), Math.floor(th * (r + 30) / 3.4), k), b = casuale(Math.floor(r / 2.6), Math.floor(th * (r + 30) / 7), k + 7);
        const v = Math.min(255, 255 * (0.30 + 0.85 * Math.pow(a, 0.75) * (0.6 + 0.4 * b))), i = (y * w + x) * 4;
        D[i] = D[i + 1] = D[i + 2] = v; D[i + 3] = 255;
      }
      g.putImageData(im, 0, 0); grana.push(c);
    }
    sfondo = document.createElement('canvas'); sfondo.width = w; sfondo.height = h; const g = sfondo.getContext('2d'), im = g.createImageData(w, h), D = im.data;
    for (let i = 0; i < w * h; i++) { const v = 10 + 26 * Math.pow(casuale(i % w, (i / w) | 0, 99), 3); D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = v; D[i * 4 + 3] = 255; }
    g.putImageData(im, 0, 0);
  }
  function misura() {
    const box = tela.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 1.5);
    const w = Math.max(280, Math.round(box.width * dpr)), h = Math.max(240, Math.round(box.height * dpr));
    if (w === W && h === H) return; W = w; H = h; tela.width = W; tela.height = H; masc.width = Math.ceil(W / 2); masc.height = Math.ceil(H / 2);
    ox = W / 2; oy = 30 * dpr; creaGrana(); scala();
  }
  function scala() { if (!P) return; S = Math.min((H - oy - 46) / P.prof, (W / 2 - 8) / (P.prof * Math.sin(MEZZO))); }

  /* ----- sezione ----- */
  function aggiorna() {
    if (!G) return;
    P = orienta(piano(G, idVista), rot * Math.PI / 180, incl * Math.PI / 180); if (profUtente) P.prof = profUtente * G.Tr.cm; scala();
    sezione = [];
    for (const m of M) { const c = taglia(m, P.o, P.n); if (c.length) sezione.push({ tipo: m.tipo, nome: m.nome, catene: c }); }
    /* etichette: baricentro della sezione realmente visibile di ogni camera (cade nella cavità) */
    posEt = [];
    for (const [t, re] of [['VS', /^Left ventricle/], ['VD', /^Right ventricle/], ['AS', /^Left atrium/], ['AD', /^Right atrium/], ['Ao', /^Ascending aorta/], ['AP', /^Pulmonary trunk/]]) {
      const se = sezione.find(x => re.test(x.nome)); if (!se) continue; let sa = 0, sb = 0, n = 0;
      for (const ch of se.catene) for (let i = 0; i < ch.p.length; i += 3) { const w = [ch.p[i] - P.o[0], ch.p[i + 1] - P.o[1], ch.p[i + 2] - P.o[2]]; sa += dot(w, P.u); sb += dot(w, P.d); n++; }
      if (n < 25) continue; posEt.push([t, sa / n, sb / n, n]);
    }
    /* valvola aortica nel piano (asse corto alla base): l'anello centrale è l'aorta */
    const va = V.find(v => v.nome === 'aortica');
    if (va && Math.abs(dot(P.n, va.n)) > 0.55) {
      const t = dot(sub(P.o, va.c), P.n) / dot(P.n, va.n);
      if (Math.abs(t) < 0.8 * va.r) { const c3 = add(va.c, mul(va.n, t)), w = sub(c3, P.o); posEt = posEt.filter(e => e[0] !== 'Ao' && e[0] !== 'VS' || Math.hypot(e[1] - dot(w, P.u), e[2] - dot(w, P.d)) > 2 * va.r); posEt.push(['Ao', dot(w, P.u), dot(w, P.d), 1e6]); }
    }
    /* etichette troppo vicine: resta quella della sezione più estesa */
    posEt.sort((a, b) => b[3] - a[3]);
    posEt = posEt.filter((e, i) => posEt.slice(0, i).every(f => Math.hypot(e[1] - f[1], e[2] - f[2]) > 1.6 * G.Tr.cm));
    sezione.sort((a, b) => ORDINE[a.tipo] - ORDINE[b.tipo]);
    calcolaOmbre(); sporco3d = true; if (ventaglio) posaVentaglio();
  }
  const tmp = [0, 0, 0], q = [0, 0, 0];
  function traccia(g, cat, c, k) {
    const p = cat.p, o = P.o, u = P.u, d = P.d;
    for (let i = 0; i < p.length; i += 3) {
      q[0] = p[i]; q[1] = p[i + 1]; q[2] = p[i + 2]; deforma(G, q, c, tmp);
      const x = ((tmp[0] - o[0]) * u[0] + (tmp[1] - o[1]) * u[1] + (tmp[2] - o[2]) * u[2]) * S * k + ox * k, y = ((tmp[0] - o[0]) * d[0] + (tmp[1] - o[1]) * d[1] + (tmp[2] - o[2]) * d[2]) * S * k + oy * k;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    if (cat.chiusa) g.closePath();
  }
  function settore(g, k) { const R = P.prof * S * k; g.beginPath(); g.moveTo(ox * k, oy * k); g.arc(ox * k, oy * k, R, Math.PI / 2 - MEZZO, Math.PI / 2 + MEZZO); g.closePath(); }
  function speculare(lumi, cat, c) {
    const p = cat.p, o = P.o, u = P.u, d = P.d, k = 0.5; let px = 0, py = 0;
    for (let i = 0, j = 0; i < p.length; i += 3, j++) {
      q[0] = p[i]; q[1] = p[i + 1]; q[2] = p[i + 2]; deforma(G, q, c, tmp);
      const x = ((tmp[0] - o[0]) * u[0] + (tmp[1] - o[1]) * u[1] + (tmp[2] - o[2]) * u[2]) * S * k + ox * k, y = ((tmp[0] - o[0]) * d[0] + (tmp[1] - o[1]) * d[1] + (tmp[2] - o[2]) * d[2]) * S * k + oy * k;
      if (j) {
        const sx = x - px, sy = y - py, rx = (x + px) / 2 - ox * k, ry = (y + py) / 2 - oy * k, ls = Math.hypot(sx, sy), lr = Math.hypot(rx, ry);
        if (ls > 1e-6 && lr > 1e-6) { const sen = Math.abs(sx * ry - sy * rx) / (ls * lr), b = sen > 0.8 ? 2 : sen > 0.45 ? 1 : 0; lumi[b].moveTo(px, py); lumi[b].lineTo(x, y); }
      }
      px = x; py = y;
    }
  }
  /* Ombre acustiche delle coste: per ogni direzione del settore, la profondità della prima superficie ossea nel piano. */
  const NB = 240; let ombre = null;
  function calcolaOmbre() {
    ombre = null; if (!ossaM.length || !P) return;
    const r = new Float32Array(NB).fill(1e9);
    const polare = (p, i) => { const w = [p[i] - P.o[0], p[i + 1] - P.o[1], p[i + 2] - P.o[2]], x = dot(w, P.u), y = dot(w, P.d); return [Math.atan2(x, y), Math.hypot(x, y), y]; };
    const lmax = 1.0 * G.Tr.cm;
    for (const m of ossaM) for (const ch of taglia(m, P.o, P.n, true)) {
      const p = ch.p, n = p.length / 3, chiudi = ch.chiusa ? n : n - 1;
      for (let s = 0; s < chiudi; s++) {          // ogni segmento del contorno osseo copre tutte le direzioni fra i suoi estremi
        const A = polare(p, s * 3), B = polare(p, ((s + 1) % n) * 3); if (A[2] <= 0 || B[2] <= 0) continue;
        if (Math.hypot(p[s * 3] - p[((s + 1) % n) * 3], p[s * 3 + 1] - p[((s + 1) % n) * 3 + 1], p[s * 3 + 2] - p[((s + 1) % n) * 3 + 2]) > lmax) continue;
        let b0 = Math.floor((A[0] + MEZZO) / (2 * MEZZO) * NB), b1 = Math.floor((B[0] + MEZZO) / (2 * MEZZO) * NB);
        const rA = A[1], rB = B[1]; if (b0 > b1) { const t = b0; b0 = b1; b1 = t; }
        for (let b = Math.max(0, b0); b <= Math.min(NB - 1, b1); b++) { const t = b1 > b0 ? (b - b0) / (b1 - b0) : 0, rr = rA + (rB - rA) * t; if (rr < r[b]) r[b] = rr; }
      }
    }
    ombre = r;
  }
  function disegnaOmbre(g, k) {
    if (!ombre) return; const cx = g, OX = ox * k, OY = oy * k, S0 = S * k;
    const R = P.prof * S0 * 1.02;
    for (let b = 0; b < NB; ) {
      if (ombre[b] > 1e8) { b++; continue; }
      let e = b; while (e + 1 < NB && ombre[e + 1] < 1e8 && Math.abs(ombre[e + 1] - ombre[e]) < 0.6 * G.Tr.cm) e++;
      const t0 = -MEZZO + 2 * MEZZO * b / NB, t1 = -MEZZO + 2 * MEZZO * (e + 1) / NB, polar = (t, rr) => [OX + Math.sin(t) * rr, OY + Math.cos(t) * rr];
      /* superficie ossea brillante, poi ombra che si allarga verso il fondo */
      const ang = j => -MEZZO + 2 * MEZZO * j / NB;
      cx.beginPath(); for (let j = b; j <= e + 1; j++) { const pnt = polar(ang(j), ombre[Math.min(j, e)] * S0); if (j === b) cx.moveTo(pnt[0], pnt[1]); else cx.lineTo(pnt[0], pnt[1]); }
      for (let j = e + 1; j >= b; j--) { const pnt = polar(ang(j), R); cx.lineTo(pnt[0], pnt[1]); }
      cx.closePath(); cx.fillStyle = 'rgba(0,0,0,0.9)'; cx.fill();
      cx.beginPath(); for (let j = b; j <= e + 1; j++) { const pnt = polar(ang(j), ombre[Math.min(j, e)] * S0); if (j === b) cx.moveTo(pnt[0], pnt[1]); else cx.lineTo(pnt[0], pnt[1]); }
      cx.strokeStyle = 'rgb(235,235,235)'; cx.lineWidth = Math.max(1.2, 0.18 * G.Tr.cm * S0); cx.stroke();
      b = e + 1;
    }
  }
  function disegna() {
    if (!P) return;
    const c = contrazione(fase) * contr, w2 = masc.width, h2 = masc.height;
    mx.setTransform(1, 0, 0, 1, 0, 0); mx.globalCompositeOperation = 'source-over'; mx.fillStyle = '#000'; mx.fillRect(0, 0, w2, h2);
    mx.lineJoin = 'round';
    {   /* campo vicino: parete toracica (circa 1,5 cm), o fegato nella finestra sottocostale */
      const cm = G.Tr.cm * S * 0.5, r = idVista === 'sub' ? 6.5 * cm : 1.6 * cm;
      const gr = mx.createRadialGradient(ox * 0.5, oy * 0.5, 0, ox * 0.5, oy * 0.5, r); gr.addColorStop(0, 'rgb(95,95,95)'); gr.addColorStop(0.85, idVista === 'sub' ? 'rgb(70,70,70)' : 'rgb(55,55,55)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
      mx.fillStyle = gr; mx.beginPath(); mx.moveTo(ox * 0.5, oy * 0.5); mx.arc(ox * 0.5, oy * 0.5, r, Math.PI / 2 - MEZZO, Math.PI / 2 + MEZZO); mx.closePath(); mx.fill();
    }
    pareti(c);
    mx.globalCompositeOperation = 'lighter'; mx.drawImage(pm, 0, 0, w2, h2); mx.globalCompositeOperation = 'source-over';
    /* Riflessione speculare: un'interfaccia perpendicolare al fascio rimanda molta energia alla sonda (bordo brillante),
       una parallela quasi nulla (perdita di segnale, tipica della parete laterale in quattro camere). */
    const lumi = [new Path2D(), new Path2D(), new Path2D()];
    for (const s of sezione) {
      if (s.tipo === 'valv') continue;   // le valvole sono ricostruite e animate più sotto
      if (s.tipo === 'pap') { mx.beginPath(); for (const cat of s.catene) traccia(mx, cat, c, 0.5); mx.fillStyle = 'rgb(165,165,165)'; mx.fill('evenodd'); }
      if (s.tipo !== 'cor') for (const cat of s.catene) speculare(lumi, cat, c);
    }
    mx.lineCap = 'round';
    [['rgba(170,170,170,.35)', 0.7], ['rgba(205,205,205,.75)', 0.9], ['rgba(245,245,245,1)', 1.4]].forEach(([col, lw], i) => { mx.strokeStyle = col; mx.lineWidth = lw; mx.stroke(lumi[i]); });
    mx.lineCap = 'butt';
    disegnaValvole(c, 0.5);
    disegnaOmbre(mx, 0.5);      // coste: superficie brillante e ombra acustica, sotto la grana
    cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'source-over'; cx.fillStyle = '#000'; cx.fillRect(0, 0, W, H);
    cx.save(); settore(cx, 1); cx.clip();
    cx.imageSmoothingEnabled = true; cx.drawImage(masc, 0, 0, W, H);
    if (guadagno > 0) { cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = guadagno / 12; cx.drawImage(masc, 0, 0, W, H); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over'; }
    {   /* risoluzione laterale che peggiora con la profondità: in campo lontano si sovrappone una copia sfocata */
      if (!sfoc) { sfoc = document.createElement('canvas'); }
      const sw = Math.max(8, Math.round(masc.width / 4)), sh = Math.max(8, Math.round(masc.height / 4)); if (sfoc.width !== sw || sfoc.height !== sh) { sfoc.width = sw; sfoc.height = sh; }
      const sg = sfoc.getContext('2d'); sg.imageSmoothingEnabled = true; sg.drawImage(masc, 0, 0, sw, sh);
      cx.save(); cx.beginPath(); cx.arc(ox, oy, P.prof * S * 1.05, 0, 2 * Math.PI); cx.arc(ox, oy, P.prof * S * 0.45, 0, 2 * Math.PI, true); cx.clip('evenodd');
      cx.globalAlpha = 0.55; cx.drawImage(sfoc, 0, 0, W, H); cx.globalAlpha = 1; cx.restore();
    }
    cx.globalCompositeOperation = 'multiply'; cx.drawImage(grana[(quadro >> 1) & 3], 0, 0, W, H);
    const gr = cx.createRadialGradient(ox, oy, 0, ox, oy, P.prof * S); gr.addColorStop(0, '#fff'); gr.addColorStop(0.5, '#e2e2e2'); gr.addColorStop(1, '#9a9a9a'); cx.fillStyle = gr; cx.fillRect(0, 0, W, H);
    cx.globalCompositeOperation = 'lighter'; cx.globalAlpha = 0.55; cx.drawImage(sfondo, ((quadro * 7) % 9) - 4, ((quadro * 5) % 7) - 3, W + 8, H + 6); cx.globalAlpha = 1;
    const vic = cx.createRadialGradient(ox, oy, 0, ox, oy, 26); vic.addColorStop(0, 'rgba(230,230,230,.9)'); vic.addColorStop(1, 'rgba(230,230,230,0)'); cx.fillStyle = vic; cx.fillRect(ox - 30, oy - 4, 60, 34);
    if (guadagno < 0) { cx.fillStyle = 'rgba(0,0,0,' + (-guadagno / 13) + ')'; cx.fillRect(0, 0, W, H); }
    cx.restore(); cx.globalCompositeOperation = 'source-over';
    if (mmodo && !pausa) campionaMM(dtUltimo);      // prima delle sovrimpressioni: si campiona solo l'immagine
    disegnaMisure(); if (mmodo) lineaM();
    /* scala di profondità: una tacca ogni decimo della profondità */
    const px = Math.max(11, Math.round(W / 58)), cmS = G.Tr.cm * S, profCm = P.prof / G.Tr.cm;
    cx.strokeStyle = 'rgba(255,255,255,.45)'; cx.lineWidth = 1; cx.beginPath();
    for (let i = 1; i <= profCm; i++) { const y = oy + i * cmS, l = i % 5 === 0 ? 9 : 4; cx.moveTo(W - 14, y); cx.lineTo(W - 14 - l, y); } cx.stroke();
    cx.font = '500 ' + Math.round(px * 0.85) + 'px system-ui,sans-serif'; cx.fillStyle = 'rgba(255,255,255,.6)'; cx.textAlign = 'right'; cx.textBaseline = 'middle';
    for (let i = 5; i <= profCm; i += 5) cx.fillText(String(i), W - 26, oy + i * cmS);
    cx.textBaseline = 'top'; cx.fillText('Profondità ' + profCm.toFixed(0) + ' cm', W - 10, 8 + px * 1.4);
    { const fe = frazione(contr, G.q.acin); cx.textAlign = 'left'; cx.fillStyle = 'rgba(255,217,94,.9)'; cx.fillText('FE simulata ≈ ' + Math.round(fe * 100) + '% · ' + classeFE(fe), 10, 8 + px * 1.4);
      if (G.q.vers) { cx.fillStyle = 'rgba(255,255,255,.75)'; cx.fillText('Versamento ' + G.q.vers + ' mm', 10, 8 + px * 2.7); } }
    cx.font = '600 ' + px + 'px system-ui,-apple-system,sans-serif'; cx.textBaseline = 'top'; cx.fillStyle = 'rgba(255,255,255,.85)';
    const v = VISTE.find(x => x.id === idVista); cx.textAlign = 'left'; cx.fillText(v.nome, 10, 8);
    cx.textAlign = 'right'; cx.textBaseline = 'top'; cx.fillText(Math.round(fc) + '/min', W - 10, 8);
    /* repere dello schermo */
    cx.beginPath(); cx.arc(ox + Math.sin(MEZZO) * 26 + 10, oy + 4, 4, 0, 7); cx.fillStyle = '#6fd3ff'; cx.fill();
    if (etichette) scritte(c, px);
    ecg(px);
  }
  /* Parete = chiusura morfologica delle superfici tagliate: si dilatano di metà spessore (tratto spesso)
     e si erodono della stessa misura. Lo spazio fra epicardio ed endocardio si riempie, le cavità restano nere.
     Non dipende da come il modello d'origine chiude (o non chiude) le proprie superfici. */
  const pm = document.createElement('canvas'), px2 = pm.getContext('2d', { willReadFrequently: true }); let buf = null, sil = null, per = null, sx = null;
  /* erosione binaria con elemento quadrato di raggio R: distanza dal più vicino 0 lungo righe e colonne */
  /* erosione binaria con elemento quasi circolare: trasformata di distanza chamfer 3-4 (due passate) */
  let dt = null;
  function erosione(b, w, h, R) {
    if (R <= 0) return; const n = w * h; if (!dt || dt.length !== n) dt = new Uint16Array(n);
    const MAX = 65000;
    for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) {
      if (!b[i]) { dt[i] = 0; continue; }
      let d = MAX;
      if (x > 0) d = Math.min(d, dt[i - 1] + 3);
      if (y > 0) { d = Math.min(d, dt[i - w] + 3); if (x > 0) d = Math.min(d, dt[i - w - 1] + 4); if (x < w - 1) d = Math.min(d, dt[i - w + 1] + 4); }
      dt[i] = d;
    }
    for (let y = h - 1, i = n - 1; y >= 0; y--) for (let x = w - 1; x >= 0; x--, i--) {
      if (!b[i]) continue; let d = dt[i];
      if (x < w - 1) d = Math.min(d, dt[i + 1] + 3);
      if (y < h - 1) { d = Math.min(d, dt[i + w] + 3); if (x < w - 1) d = Math.min(d, dt[i + w + 1] + 4); if (x > 0) d = Math.min(d, dt[i + w - 1] + 4); }
      dt[i] = d;
    }
    const lim = 3 * R; for (let i = 0; i < n; i++) if (b[i] && dt[i] <= lim) b[i] = 0;
  }
  function dilatazione(b, w, h, R) { if (R <= 0) return; for (let i = 0; i < b.length; i++) b[i] = b[i] ? 0 : 1; erosione(b, w, h, R); for (let i = 0; i < b.length; i++) b[i] = b[i] ? 0 : 1; }
  function pareti(c) {
    const k = 1 / 3, w = Math.ceil(W * k), h = Math.ceil(H * k);
    if (pm.width !== w || pm.height !== h) { pm.width = w; pm.height = h; buf = null; }
    const R = Math.max(1, Math.round(0.052 * G.L * S * k));
    px2.setTransform(1, 0, 0, 1, 0, 0); px2.globalCompositeOperation = 'source-over'; px2.fillStyle = '#000'; px2.fillRect(0, 0, w, h);
    px2.strokeStyle = '#fff'; px2.fillStyle = '#fff'; px2.lineWidth = 2 * R + 1; px2.lineJoin = 'round'; px2.lineCap = 'round';
    for (const s of sezione) {
      if (s.tipo === 'valv' || s.tipo === 'cor') continue;
      px2.beginPath(); for (const cat of s.catene) traccia(px2, cat, c, k); px2.stroke();
    }
    const im = px2.getImageData(0, 0, w, h), D = im.data, n = w * h;
    if (!buf || buf.length !== n) { buf = new Uint8Array(n); sil = new Uint8Array(n); per = new Uint8Array(n); }
    for (let i = 0; i < n; i++) buf[i] = D[i * 4] > 127 ? 1 : 0;
    erosione(buf, w, h, R);
    const cmK = G.Tr.cm * S * k, Q = G.q;
    if (Q.ipert > 0) dilatazione(buf, w, h, Math.round(Q.ipert * cmK * 0.5));
    /* sagoma del cuore (chiusura ampia: riempie le cavità), poi pericardio a distanza «versamento» */
    sil.set(buf); const Rb = Math.round(0.3 * G.L * S * k); dilatazione(sil, w, h, Rb); erosione(sil, w, h, Rb);
    const e = Math.round((Q.vers || 0) / 10 * cmK), t = Math.max(1, Math.round(0.22 * cmK));
    per.set(sil); dilatazione(per, w, h, e + t); if (e > 0) dilatazione(sil, w, h, e);
    for (let i = 0; i < n; i++) { const v = buf[i] ? 132 : per[i] && !sil[i] ? 205 : 0; D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = v; D[i * 4 + 3] = 255; }
    px2.putImageData(im, 0, 0);
  }
  /* coordinate di schermo (scala k) di un punto 3D, dopo la deformazione del ciclo */
  const sp = [0, 0, 0];
  function schermo(p, c, k) { deforma(G, p, c, sp); const w = sub(sp, P.o); return [(dot(w, P.u) * S + ox) * k, (dot(w, P.d) * S + oy) * k, dot(w, P.n)]; }
  function curva(g, a, q, b) { g.moveTo(a[0], a[1]); g.quadraticCurveTo(q[0], q[1], b[0], b[1]); }
  function disegnaValvole(c, k) {
    mx.strokeStyle = 'rgb(242,242,242)'; mx.lineCap = 'round';
    for (const v of V) {
      const o = apertura(v.tipo, fase), n = v.n, cn = dot(P.n, n);
      /* 1. il piano taglia l'anello: due cerniere da cui partono i lembi (assi lunghi) */
      const e1 = norm(orto(Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0], n)), e2 = cross(n, e1);
      const A = v.r * dot(e1, P.n), B = v.r * dot(e2, P.n), rhs = -dot(sub(v.c, P.o), P.n), R = Math.hypot(A, B);
      if (R > 1e-6 && Math.abs(rhs) < R && Math.abs(cn) < 0.8) {
        const phi = Math.atan2(B, A), dth = Math.acos(rhs / R), coapt = add(v.c, mul(n, (v.tipo === 'av' ? 0.3 : 0.12) * v.r));
        const cerniere = [phi + dth, phi - dth].map(t => add(v.c, add(mul(e1, v.r * Math.cos(t)), mul(e2, v.r * Math.sin(t)))));
        /* il lembo più vicino all'aorta (anteriore) è il più lungo */
        const vic = v.avanti ? cerniere.map(h => len(sub(h, v.avanti))) : [0, 1];
        cerniere.forEach((h, i) => {
          const lung = v.tipo === 'sl' ? 0.95 * v.r : (vic[i] < vic[1 - i] ? 1.25 : 0.8) * v.r;
          const fuori = norm(sub(h, v.c)), aperto = add(h, add(mul(n, lung * 0.97), mul(fuori, v.tipo === 'sl' ? -0.12 * v.r : 0.1 * lung)));
          const chiuso = add(coapt, mul(fuori, 0.03 * v.r)), punta = add(mul(chiuso, 1 - o), mul(aperto, o)), ctrl = add(mul(add(h, punta), 0.5), mul(n, (1 - o) * 0.18 * v.r));
          const a = schermo(h, c, k), q = schermo(ctrl, c, k), b = schermo(punta, c, k);
          mx.lineWidth = v.nome === 'mitrale' ? 1.5 : 1.2; mx.beginPath(); curva(mx, a, q, b); mx.stroke();
        });
        continue;
      }
      /* 2. piano quasi parallelo all'anello (assi corti): bocca di pesce o «Y» delle semilunari */
      /* dove l'asse della valvola (centro + t·normale) incontra il piano */
      if (Math.abs(cn) < 0.55) continue;
      const dist = dot(sub(P.o, v.c), P.n) / cn;
      if (dist < -0.35 * v.r || dist > (v.tipo === 'av' ? 0.9 : 0.45) * v.r) continue;
      const cc = add(v.c, mul(n, dist)), f1 = norm(orto(e1, P.n)), f2 = norm(cross(P.n, f1));
      const sul = (a, b, rr) => add(cc, add(mul(f1, rr * Math.cos(a)), mul(f2, rr * Math.sin(a))));
      if (v.tipo === 'sl') {
        mx.lineWidth = 1.4; mx.beginPath(); for (let i = 0; i <= 32; i++) { const p = schermo(sul(i / 32 * 2 * Math.PI, 0, v.r * 1.08), c, k); if (i) mx.lineTo(p[0], p[1]); else mx.moveTo(p[0], p[1]); } mx.stroke();
        const ang = v.cus.map(q => { const w = sub(q, cc); return Math.atan2(dot(w, f2), dot(w, f1)); }).sort((a, b) => a - b);
        const com = ang.map((a, i) => { const b = i + 1 < ang.length ? ang[i + 1] : ang[0] + 2 * Math.PI; return (a + b) / 2; });
        const centro3 = schermo(cc, c, k);
        mx.lineWidth = 1.3;
        for (let i = 0; i < com.length; i++) {
          const a = com[i], b = com[(i + 1) % com.length] + (i + 1 === com.length ? 2 * Math.PI : 0), m = (a + b) / 2;
          const pa = schermo(sul(a, 0, v.r), c, k), pb = schermo(sul(b, 0, v.r), c, k), mid = [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2];
          const chiuso = [2 * centro3[0] - mid[0], 2 * centro3[1] - mid[1]], apertoP = schermo(sul(m, 0, v.r * 1.05), c, k), q = [chiuso[0] * (1 - o) + apertoP[0] * o, chiuso[1] * (1 - o) + apertoP[1] * o];
          mx.beginPath(); curva(mx, pa, q, pb); mx.stroke();
        }
      } else {
        const asse = v.avanti ? norm(orto(sub(v.avanti, cc), P.n)) : f1, trasv = norm(cross(P.n, asse)), prof = 1 - Math.max(0, dist) / (1.1 * v.r);
        const ry = v.r * (0.04 + 0.62 * o * prof), rx = v.r * 0.88;
        mx.lineWidth = 1.5;
        [1, -1].forEach(sg => { mx.beginPath(); for (let i = 0; i <= 24; i++) { const t = Math.PI * i / 24, p = schermo(add(cc, add(mul(trasv, rx * Math.cos(t)), mul(asse, sg * ry * Math.sin(t)))), c, k); if (i) mx.lineTo(p[0], p[1]); else mx.moveTo(p[0], p[1]); } mx.stroke(); });
      }
    }
    mx.lineCap = 'butt';
  }
  function scritte(c, px) {
    cx.font = '700 ' + Math.round(px * 1.05) + 'px system-ui,-apple-system,sans-serif'; cx.textAlign = 'center'; cx.textBaseline = 'middle';
    for (const [t, a, b] of posEt) {
      if (b < 0.05 * P.prof || b > 0.97 * P.prof || Math.abs(Math.atan2(a, b)) > MEZZO * 0.94) continue;
      const x = a * S + ox, y = b * S + oy; cx.lineWidth = 3; cx.strokeStyle = 'rgba(0,0,0,.8)'; cx.strokeText(t, x, y); cx.fillStyle = '#ffd95e'; cx.fillText(t, x, y);
    }
  }
  function onda(f) {   // tracciato schematico, fase 0 = R
    const g = (m, s, a) => a * Math.exp(-((f - m) * (f - m)) / (2 * s * s)), h = (m, s, a) => a * Math.exp(-((f - 1 - m) * (f - 1 - m)) / (2 * s * s));
    return g(0, 0.008, 1) + g(-0.022, 0.007, -0.12) + h(-0.022, 0.007, -0.12) + g(0.024, 0.008, -0.22) + g(0.30, 0.045, 0.3) + g(0.88, 0.022, 0.12) + h(0, 0.008, 1);
  }
  function ecg(px) {
    const x0 = 10, w = Math.min(W * 0.42, 300), y0 = H - 16, a = 22;
    cx.strokeStyle = '#59e39a'; cx.lineWidth = 1.4; cx.beginPath();
    for (let i = 0; i <= w; i += 2) { const f = (((i / w) * 2) % 1); const y = y0 - onda(f) * a; if (i === 0) cx.moveTo(x0 + i, y); else cx.lineTo(x0 + i, y); } cx.stroke();
    const xm = x0 + (fase / 2) * w; cx.strokeStyle = 'rgba(255,255,255,.8)'; cx.beginPath(); cx.moveTo(xm, y0 - a - 4); cx.lineTo(xm, y0 + 6); cx.stroke();
    cx.font = '600 ' + Math.round(px * 0.85) + 'px system-ui,sans-serif'; cx.textAlign = 'left'; cx.textBaseline = 'bottom'; cx.fillStyle = 'rgba(255,255,255,.7)';
    cx.fillText(fase > 0.04 && fase < 0.42 ? 'SISTOLE' : 'DIASTOLE', x0 + w + 10, y0 + 4);
  }

  /* ----- localizzatore 3D ----- */
  function crea3d(gltf) {
    const c = $('#eco3d'); r3 = new T.WebGLRenderer({ canvas: c, antialias: true, alpha: true }); r3.setPixelRatio(Math.min(root.devicePixelRatio || 1, 1.5));
    scena = new T.Scene(); cam = new T.PerspectiveCamera(32, 1, 0.1, 100);
    scena.add(new T.AmbientLight(0xffffff, 0.75)); const l = new T.DirectionalLight(0xffffff, 0.9); l.position.set(2, 4, 5); scena.add(l);
    gltf.scene.traverse(o => { if (o.isMesh) { o.material = new T.MeshLambertMaterial({ color: /ventricle/i.test(o.name) ? 0xb5524f : /atrium/i.test(o.name) ? 0xc9837a : /aorta/i.test(o.name) ? 0xd9443f : /pulmonary|vena|vein/i.test(o.name) ? 0x5f7fb8 : 0xcfa58f, transparent: true, opacity: 0.86 }); } });
    scena.add(gltf.scene); scena.add(corpo());
    ventaglio = new T.Mesh(new T.BufferGeometry(), new T.MeshBasicMaterial({ color: 0x6fd3ff, transparent: true, opacity: 0.42, side: T.DoubleSide, depthWrite: false }));
    scena.add(ventaglio);
    sonda3 = sonda(G.Tr.cm); scena.add(sonda3);
    bersaglio = new T.Vector3().fromArray(add(G.Tr.hc, [-1 * G.Tr.cm, -1 * G.Tr.cm, 0])); raggio = 72 * G.Tr.cm;
    inquadra();
    let giu = null;
    c.addEventListener('pointerdown', e => { giu = [e.clientX, e.clientY]; c.setPointerCapture(e.pointerId); });
    c.addEventListener('pointermove', e => { if (!giu) return; az -= (e.clientX - giu[0]) * 0.01; el = Math.max(-1.3, Math.min(1.3, el + (e.clientY - giu[1]) * 0.01)); giu = [e.clientX, e.clientY]; sporco3d = true; });
    const su = () => { giu = null; }; c.addEventListener('pointerup', su); c.addEventListener('pointercancel', su);
    posaVentaglio();
  }
  function posaVentaglio() {
    const v = [P.o[0], P.o[1], P.o[2]], n = 24, R = P.prof * 0.92;
    for (let i = 0; i <= n; i++) { const a = -MEZZO + 2 * MEZZO * i / n, p = add(P.o, add(mul(P.d, Math.cos(a) * R), mul(P.u, Math.sin(a) * R))); v.push(p[0], p[1], p[2]); }
    const idx = []; for (let i = 1; i <= n; i++) idx.push(0, i, i + 1);
    const g = ventaglio.geometry; g.setAttribute('position', new T.Float32BufferAttribute(v, 3)); g.setIndex(idx); g.computeBoundingSphere();
    sonda3.position.fromArray(P.o);
    const y = mul(P.d, -1), z = cross(P.u, y), m = new T.Matrix4().makeBasis(new T.Vector3().fromArray(P.u), new T.Vector3().fromArray(y), new T.Vector3().fromArray(z)); sonda3.quaternion.setFromRotationMatrix(m);
  }
  /* Torace anatomico di Z-Anatomy (CC BY-SA 4.0), estratto dalla stessa scena del cuore con la stessa
     trasformazione: coste, cartilagini, sterno, vertebre, clavicole e scapole sono nella posizione reale. */
  const STRATI = {
    osso: { color: 0xeadfc8, opacity: 0.92, ordine: 1 }, vertebra: { color: 0xe2d6bd, opacity: 0.92, ordine: 1 },
    cartilagine: { color: 0xc9dde4, opacity: 0.75, ordine: 1 }, fegato: { color: 0x9b4b40, opacity: 0.55, ordine: 2 },
    diaframma: { color: 0xb0645a, opacity: 0.18, ordine: 3 }, polmone: { color: 0xf2b3b8, opacity: 0.14, ordine: 4 },
    pelle: { color: 0xc49a80, opacity: 0.16, ordine: 6 }
  };
  const gruppi = {}, visibili = { pelle: true, polmone: false, fegato: true, diaframma: false };
  function corpo() {
    const g = new T.Group();
    new T.GLTFLoader().load(new URL('prototipo-cuore/torace-z-anatomy.glb', document.baseURI).href, gltf => {
      gltf.scene.traverse(o => {
        if (!o.isMesh) return; const k = (o.userData && o.userData.layer) || 'osso', st = STRATI[k] || STRATI.osso;
        o.geometry.computeVertexNormals();
        o.material = new T.MeshLambertMaterial({ color: st.color, transparent: true, opacity: st.opacity, depthWrite: st.opacity > 0.6 });
        o.renderOrder = st.ordine; (gruppi[k] = gruppi[k] || []).push(o); if (k in visibili) o.visible = visibili[k];
        if ((k === 'osso' || k === 'cartilagine') && o.geometry.index) {     // superfici ossee per le ombre acustiche
          o.updateMatrixWorld(true); const a = o.geometry.attributes.position, pos = new Float32Array(a.count * 3), v3 = new T.Vector3();
          for (let i = 0; i < a.count; i++) { v3.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); pos[i * 3] = v3.x; pos[i * 3 + 1] = v3.y; pos[i * 3 + 2] = v3.z; }
          ossaM.push(salda(pos, o.geometry.index.array));
        }
      });
      g.add(gltf.scene); sporco3d = true; calcolaOmbre();
    }, undefined, () => {});
    return g;
  }
  function strato(k, on) { visibili[k] = on; (gruppi[k] || []).forEach(o => { o.visible = on; }); if (k === 'polmone') (gruppi.diaframma || []).forEach(o => { o.visible = on; }); sporco3d = true; }
  function sonda(cm) {
    const g = new T.Group(), bianco = new T.MeshLambertMaterial({ color: 0xeef1f5 }), nero = new T.MeshLambertMaterial({ color: 0x1d2128 });
    const corpo = new T.Mesh(new T.CylinderGeometry(1.1 * cm, 1.4 * cm, 7 * cm, 24), bianco); corpo.scale.set(1.25, 1, 0.75); corpo.position.y = 3.5 * cm; g.add(corpo);
    const testa = new T.Mesh(new T.BoxGeometry(2.4 * cm, 0.6 * cm, 1.3 * cm), nero); testa.position.y = 0.3 * cm; g.add(testa);
    const cavo = new T.Mesh(new T.CylinderGeometry(0.35 * cm, 0.35 * cm, 6 * cm, 12), nero); cavo.position.y = 10 * cm; g.add(cavo);
    const repere = new T.Mesh(new T.SphereGeometry(0.35 * cm, 12, 8), new T.MeshBasicMaterial({ color: 0x3aa8ff })); repere.position.set(1.45 * cm, 1.6 * cm, 0); g.add(repere);
    return g;
  }
  function inquadra() { const v = idVista; az = v[0] === 'a' ? 0.75 : v === 'sub' ? 0.15 : -0.1; el = v === 'sub' ? -0.12 : 0.12; sporco3d = true; }
  function rendi3d() {
    if (!r3) return; const c = r3.domElement, b = c.parentElement.getBoundingClientRect(), w = Math.max(120, Math.round(b.width)), h = Math.max(120, Math.round(b.height));
    if (c.width !== Math.round(w * r3.getPixelRatio()) || c.height !== Math.round(h * r3.getPixelRatio())) { r3.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); }
    cam.position.set(bersaglio.x + raggio * Math.cos(el) * Math.sin(az), bersaglio.y + raggio * Math.sin(el), bersaglio.z + raggio * Math.cos(el) * Math.cos(az)); cam.lookAt(bersaglio);
    r3.render(scena, cam); sporco3d = false;
  }

  /* ----- ciclo ----- */
  function ciclo(ora) {
    raf = 0; if (!attiva) return;
    const dt = Math.min(0.1, (ora - ultimo) / 1000 || 0); ultimo = ora;
    if (!pausa) { fase = (fase + dt * fc / 60) % 1; quadro++; }
    dtUltimo = dt; misura(); if (G) { disegna(); if (sporco3d) rendi3d(); }
    raf = requestAnimationFrame(ciclo);
  }
  function mostra(on) {
    attiva = on; if (on) { if (!M && !avvia.caricato) carica(); misura(); sporco3d = true; ultimo = performance.now(); if (!raf) raf = requestAnimationFrame(ciclo); }
    else if (raf) { cancelAnimationFrame(raf); raf = 0; }
  }
  function scegliQuadro(id) {
    const q = QUADRI.find(x => x.id === id) || QUADRI[0]; idQuadro = q.id;
    contr = q.p.contr; fc = q.p.fc;
    if (G) { G.q = { dil: q.p.dil, ipert: q.p.ipert, vers: q.p.vers, acin: q.p.acin }; }
    $('#ecoFc').value = fc; $('#ecoFcV').textContent = fc + '/min'; $('#ecoCo').value = Math.round(contr * 100); etichettaContr();
    document.querySelectorAll('#ecoQuadri button').forEach(b => b.classList.toggle('on', b.dataset.q === q.id));
    const f = q.fonte && FONTI_ECO[q.fonte];
    $('#ecoQTesto').innerHTML = '<p>' + esc(q.testo) + '</p>' + (f ? '<p class="eco-fonte">Fonte: <a href="' + esc(f.u) + '" target="_blank" rel="noopener">' + esc(f.t) + '</a>. ' + esc(f.r) + '</p>' : '') +
      (q.caso && root.ISO_CASI ? '<button class="btn" id="ecoCaso">Apri il caso clinico collegato</button>' : '');
    const b = $('#ecoCaso'); if (b) b.addEventListener('click', () => { const n = document.querySelector('#nav button[data-v="casi"]'); if (n) n.click(); setTimeout(() => root.ISO_CASI.apri(q.caso), 60); });
  }
  function etichettaContr() { const fe = frazione(contr, G && G.q ? G.q.acin : 0); $('#ecoCoV').textContent = 'FE ≈ ' + Math.round(fe * 100) + '%'; }
  /* ---- calibro: due tocchi sull'immagine ferma, distanza in cm (coordinate del piano, indipendenti dallo schermo) ---- */
  function aCm(ev) { const r = tela.getBoundingClientRect(), x = (ev.clientX - r.left) * tela.width / r.width, y = (ev.clientY - r.top) * tela.height / r.height; return [(x - ox) / (S * G.Tr.cm), (y - oy) / (S * G.Tr.cm)]; }
  function aPx(c) { return [ox + c[0] * S * G.Tr.cm, oy + c[1] * S * G.Tr.cm]; }
  function disegnaMisure() {
    if (!misure.length) return; const px = Math.max(11, Math.round(W / 58));
    cx.save(); cx.font = '700 ' + px + 'px system-ui,sans-serif'; cx.textBaseline = 'bottom';
    misure.forEach((m, i) => {
      const a = aPx(m[0]), col = i ? '#7fe3ff' : '#ffe14d', croce = p => { cx.beginPath(); cx.moveTo(p[0] - 6, p[1]); cx.lineTo(p[0] + 6, p[1]); cx.moveTo(p[0], p[1] - 6); cx.lineTo(p[0], p[1] + 6); cx.stroke(); };
      cx.strokeStyle = col; cx.lineWidth = 1.6; croce(a);
      if (m[1]) { const b = aPx(m[1]); croce(b); cx.setLineDash([5, 4]); cx.beginPath(); cx.moveTo(a[0], a[1]); cx.lineTo(b[0], b[1]); cx.stroke(); cx.setLineDash([]);
        const d = Math.hypot(m[1][0] - m[0][0], m[1][1] - m[0][1]); cx.fillStyle = col; cx.textAlign = 'left'; cx.fillText((i + 1) + ': ' + d.toFixed(2).replace('.', ',') + ' cm', 10, H - 46 - i * (px + 4)); }
    });
    cx.restore();
  }
  tela.addEventListener('pointerdown', ev => {
    if (!G || !P) return;
    if (calibro) {
      const c = aCm(ev), u = misure[misure.length - 1];
      if (u && !u[1]) u[1] = c; else { if (misure.length >= 2) misure = []; misure.push([c, null]); }
      aiuto(); return;
    }
    if (mmodo) { const c = aCm(ev); if (c[1] > 0) { mmAng = Math.max(-MEZZO, Math.min(MEZZO, Math.atan2(c[0], c[1]))); azzeraMM(); } }
  });
  /* ---- M-mode: la linea scelta campionata a ogni fotogramma e fatta scorrere nel tempo ---- */
  const mm = $('#ecoMM'), mmx = mm.getContext('2d'), col = document.createElement('canvas'), colx = col.getContext('2d');
  function azzeraMM() { mmx.fillStyle = '#000'; mmx.fillRect(0, 0, mm.width, mm.height); }
  function lineaM() {
    const R = P.prof * S, x1 = ox + Math.sin(mmAng) * R, y1 = oy + Math.cos(mmAng) * R;
    cx.save(); cx.strokeStyle = 'rgba(120,220,255,.85)'; cx.setLineDash([3, 5]); cx.lineWidth = 1.2; cx.beginPath(); cx.moveTo(ox, oy); cx.lineTo(x1, y1); cx.stroke(); cx.restore();
  }
  function campionaMM(dt) {
    const r = mm.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 1.5), w = Math.max(60, Math.round(r.width * dpr)), h = Math.max(40, Math.round(r.height * dpr));
    if (mm.width !== w || mm.height !== h) { mm.width = w; mm.height = h; azzeraMM(); }
    if (col.height !== h) { col.width = 1; col.height = h; }
    const k = h / (P.prof * S), c = Math.cos(mmAng), sn = Math.sin(mmAng);
    colx.setTransform(c, k * sn, -sn, k * c, -(c * ox - sn * oy) + 0.5, -k * (sn * ox + c * oy));
    colx.fillStyle = '#000'; colx.fillRect(-1e4, -1e4, 2e4, 2e4); colx.drawImage(tela, 0, 0); colx.setTransform(1, 0, 0, 1, 0, 0);
    mmAcc += dt * w / 4;                         // quattro secondi per schermata
    const dx = Math.floor(mmAcc); if (dx < 1) return; mmAcc -= dx;
    mmx.drawImage(mm, -dx, 0); mmx.drawImage(col, w - dx, 0, dx, h);
    if ((mmT += dt) > 0.5) { mmT = 0; mmx.fillStyle = 'rgba(255,255,255,.35)'; for (let i = 1; i * G.Tr.cm * S * k < h; i++) if (i % 5 === 0) mmx.fillRect(w - 3, i * G.Tr.cm * S * k, 3, 1); }
  }
  let mmAcc = 0, mmT = 0, dtUltimo = 0;
  function aiuto() {
    const a = $('#ecoAiuto');
    a.textContent = calibro ? (misure.length && !misure[misure.length - 1][1] ? 'Tocca il secondo punto.' : 'Calibro: immagine ferma. Tocca due punti sull’immagine; per il diametro del ventricolo sinistro misura in telediastole, da endocardio a endocardio, perpendicolare all’asse, alle punte dei lembi mitralici.')
      : mmodo ? 'M-mode: la linea tratteggiata è il fascio campionato nel tempo (sotto). Tocca l’immagine per spostarla. In asse lungo, attraverso le punte mitraliche, mostra setto, cavità e parete posteriore che si avvicinano in sistole.' : '';
  }
  function testo() {
    const v = VISTE.find(x => x.id === idVista);
    $('#ecoTesto').innerHTML = '<h3>' + esc(v.nome) + '</h3><p><b>Come si ottiene.</b> ' + esc(v.sonda) + '</p><p><b>Che cosa vedi.</b> ' + esc(v.vedi) + '</p><p><b>Che cosa si valuta</b></p><ul>' + v.valuta.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      (REALE[idVista] ? '<p><a class="btn" href="' + REALE[idVista] + '" target="_blank" rel="noopener">Confronta con un esame reale ↗</a></p><p class="eco-fonte">Il collegamento apre un esame transtoracico normale su Radiopaedia, con le strutture etichettate. Confrontalo con la simulazione: forma e posizione delle camere coincidono, l’aspetto dell’immagine reale no (grana, artefatti, contrasto).</p>' : '') +
      '<p class="eco-fonte">Proiezioni standard secondo le raccomandazioni ASE 2019 per l’ecocardiogramma transtoracico: <a href="https://doi.org/10.1016/j.echo.2018.06.004" target="_blank" rel="noopener">Mitchell C et al. J Am Soc Echocardiogr 2019;32:1–64</a>.</p>';
    document.querySelectorAll('#ecoViste button').forEach(b => b.classList.toggle('on', b.dataset.v === idVista));
  }
  function carica() {
    avvia.caricato = true;
    new T.GLTFLoader().load(new URL('prototipo-cuore/heart-z-anatomy.glb', document.baseURI).href, gltf => {
      try {
        gltf.scene.updateMatrixWorld(true); M = [];
        gltf.scene.traverse(o => {
          if (!o.isMesh || !o.geometry || !o.geometry.index) return;
          const g = o.geometry, src = g.attributes.position, pos = new Float32Array(src.count * 3), v = new T.Vector3();
          for (let i = 0; i < src.count; i++) { v.fromBufferAttribute(src, i).applyMatrix4(o.matrixWorld); pos[i * 3] = v.x; pos[i * 3 + 1] = v.y; pos[i * 3 + 2] = v.z; }
          const m = salda(pos, g.index.array); m.nome = o.name.replace(/_/g, ' '); m.tipo = tipoDi(m.nome); M.push(m);
        });
        G = reperi(M); if (!G) throw new Error('modello senza le quattro camere'); correggiSetto(M, G); V = valvole(M, G); G.V = V; G.Tr = torace(G);
        scegliQuadro(idQuadro); aggiorna(); crea3d(gltf); stato.hidden = true; vista.dataset.pronto = '1';
      } catch (e) { stato.textContent = 'Non riesco a preparare il modello: ' + e.message; }
    }, undefined, () => { stato.textContent = 'Modello del cuore non disponibile. Controlla la connessione e riapri la scheda.'; avvia.caricato = false; });
  }

  /* ----- comandi ----- */
  $('#ecoViste').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; idVista = b.dataset.v; inquadra(); profUtente = 0; $('#ecoProfV').textContent = 'auto'; misure = []; azzeraMM(); rot = incl = 0; $('#ecoRot').value = 0; $('#ecoInc').value = 0; $('#ecoRotV').textContent = '0°'; $('#ecoIncV').textContent = '0°'; testo(); aggiorna(); });
  $('#ecoRot').addEventListener('input', e => { rot = +e.target.value; $('#ecoRotV').textContent = rot + '°'; aggiorna(); });
  $('#ecoInc').addEventListener('input', e => { incl = +e.target.value; $('#ecoIncV').textContent = incl + '°'; aggiorna(); });
  $('#ecoFc').addEventListener('input', e => { fc = +e.target.value; $('#ecoFcV').textContent = fc + '/min'; });
  $('#ecoCo').addEventListener('input', e => { contr = +e.target.value / 100; etichettaContr(); });
  $('#ecoStrati').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const on = !b.classList.contains('on'); b.classList.toggle('on', on); strato(b.dataset.s, on); });
  $('#ecoQuadri').addEventListener('click', e => { const b = e.target.closest('button'); if (b) scegliQuadro(b.dataset.q); });
  $('#ecoEt').addEventListener('click', e => { etichette = !etichette; e.target.classList.toggle('on', etichette); }); $('#ecoEt').classList.add('on');
  $('#ecoPausa').addEventListener('click', e => { pausa = !pausa; e.target.textContent = pausa ? 'Riprendi' : 'Pausa'; });
  $('#ecoProf').addEventListener('input', e => { profUtente = +e.target.value; $('#ecoProfV').textContent = profUtente + ' cm'; aggiorna(); azzeraMM(); });
  $('#ecoGua').addEventListener('input', e => { guadagno = +e.target.value; $('#ecoGuaV').textContent = (guadagno > 0 ? '+' : '') + guadagno; });
  $('#ecoCal').addEventListener('click', e => { calibro = !calibro; e.target.classList.toggle('on', calibro); if (calibro) { pausa = true; $('#ecoPausa').textContent = 'Riprendi'; } else misure = []; aiuto(); });
  $('#ecoMMb').addEventListener('click', e => { mmodo = !mmodo; e.target.classList.toggle('on', mmodo); $('#ecoSchermo').classList.toggle('mmodo', mmodo); W = 0; misura(); azzeraMM(); aiuto(); });
  $('#ecoZero').addEventListener('click', () => { rot = incl = 0; $('#ecoRot').value = 0; $('#ecoInc').value = 0; $('#ecoRotV').textContent = '0°'; $('#ecoIncV').textContent = '0°'; aggiorna(); });
  testo(); scegliQuadro('normale');
  new MutationObserver(() => mostra(vista.classList.contains('on'))).observe(vista, { attributes: true, attributeFilter: ['class'] });
  root.addEventListener('resize', () => { sporco3d = true; });
  if (vista.classList.contains('on')) mostra(true);
  root.ISO_ECO = { _masc: masc, _fase: f => { fase = f; },
    /* per i test: coordinate di schermo (pixel della tela) di un punto 3D, assi e scala */
    _geo: () => { const A = assi(G), sc = p => { const w = sub(p, P.o); return [(dot(w, P.u) * S + ox), (dot(w, P.d) * S + oy), dot(w, P.n) / G.Tr.cm]; };
      return { cmPx: G.Tr.cm * S, W, H, apE: sc(A.apE), mi: sc(A.mi), ao: sc(A.ao), lungo: z => sc(add(A.apE, mul(A.asse, z * A.Lc))), asse: [dot(A.asse, P.u), dot(A.asse, P.d)], etichette: posEt.map(e => e[0]) }; }, stato: () => ({ pronto: !!G, vista: idVista, catene: sezione.reduce((s, x) => s + x.catene.length, 0), fase }), vista: id => { const b = document.querySelector('#ecoViste button[data-v="' + id + '"]'); if (b) b.click(); } };
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', avvia); else avvia();
})(typeof self !== 'undefined' ? self : this);
