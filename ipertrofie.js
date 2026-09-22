/* Isoelettrica — indici elettrocardiografici di ipertrofia
   Tutte le ampiezze sono trattate in mV. Le soglie classiche ("35 mm", "28 mm")
   valgono solo a guadagno standard 10 mm/mV: si confronta in mV e si converte in
   mm solo per mostrarlo. */
(function (root) {
'use strict';
const G0 = 10;                                   // mm/mV di riferimento
const mm = mv => mv * G0;
const v = (g, d) => Math.abs((g && g[d]) || 0);
const mx = (...a) => Math.max.apply(null, a);

function esito(nome, formula, valoreMv, sogliaMv, nota) {
  return { nome, formula, valoreMv, sogliaMv, valoreMm: mm(valoreMv), sogliaMm: mm(sogliaMv),
    positivo: valoreMv >= sogliaMv, nota: nota || '' };
}

/* --- ventricolo sinistro --- */
function sokolowSx(m) {
  return esito('Sokolow-Lyon (IVS)', 'S V1 + R V5/V6',
    v(m.S, 'V1') + mx(v(m.R, 'V5'), v(m.R, 'V6')), 3.5,
    'Specifico ma poco sensibile: un ECG normale non esclude l’ipertrofia.');
}
function rAvl(m) {
  return esito('R in aVL', 'R aVL', v(m.R, 'aVL'), 1.1,
    'Soprattutto nel sovraccarico pressorio. Sulle slide del corso il limite è 13 mm.');
}
function cornell(m, sesso) {
  const s = sesso === 'F' ? 2.0 : 2.8;
  return esito('Cornell voltage (IVS)', 'R aVL + S V3', v(m.R, 'aVL') + v(m.S, 'V3'), s,
    sesso === 'F' ? 'Soglia donna: 20 mm.' : 'Soglia uomo: 28 mm.');
}
function cornellProd(m, sesso, qrsMs) {
  const somma = v(m.R, 'aVL') + v(m.S, 'V3') + (sesso === 'F' ? 0.6 : 0);
  const p = somma * (qrsMs || 0);
  return { nome: 'Cornell product (IVS)', formula: '(R aVL + S V3 [+6 mm se donna]) × QRS',
    valoreMv: somma, valoreMm: mm(somma), prodotto: p, sogliaProdotto: 244,
    prodottoMm: p * G0, sogliaProdottoMm: 2440, positivo: p > 244,
    nota: 'È l’indice che correla meglio con la massa ventricolare all’ecocardiogramma.' };
}
function peguero(m, sesso) {
  const sMax = mx.apply(null, Object.keys(m.S || {}).map(k => Math.abs(m.S[k])).concat([0]));
  return esito('Peguero-Lo Presti (IVS)', 'S più profonda (ovunque) + S V4',
    sMax + v(m.S, 'V4'), sesso === 'F' ? 2.3 : 2.8,
    'Più sensibile di Sokolow-Lyon a parità di specificità.');
}
function lewis(m) {
  const val = (v(m.R, 'I') + v(m.S, 'III')) - (v(m.R, 'III') + v(m.S, 'I'));
  return esito('Indice di Lewis', '(R I + S III) − (R III + S I)', val, 1.7,
    'Sotto −1,4 mV orienta invece verso l’ipertrofia destra.');
}

/* --- ventricolo destro --- */
function sokolowDx(m) {
  return esito('Sokolow-Lyon (IVD)', 'R V1 + S V5/V6',
    v(m.R, 'V1') + mx(v(m.S, 'V5'), v(m.S, 'V6')), 1.05,
    'Da leggere con asse destro, R/S in V1 > 1 e strain in V1-V3.');
}
function rsV1(m) {
  const r = v(m.R, 'V1'), s = v(m.S, 'V1');
  const rap = s > 0.01 ? r / s : (r > 0.01 ? 99 : 0);
  return { nome: 'Rapporto R/S in V1', formula: 'R V1 / S V1', rapporto: rap, soglia: 1,
    positivo: rap > 1,
    nota: 'R alta in V1: ipertrofia destra, BBDx, infarto posteriore, WPW tipo A, rotazione oraria.' };
}

/* --- aggregatore --- */
function calcola(amp, opt) {
  const leads = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
  if (!amp || !amp.R || !amp.S || !leads.every(l => Number.isFinite(amp.R[l]) && Number.isFinite(amp.S[l]))) return null;
  const o = opt || {};
  const sesso = o.sesso === 'F' ? 'F' : 'M';
  const qrsMs = o.qrsMs || amp.qrsMs || 0;
  if (!Number.isFinite(qrsMs) || qrsMs <= 0) return null;
  return {
    sesso, qrsMs,
    sinistra: [sokolowSx(amp), rAvl(amp), cornell(amp, sesso), cornellProd(amp, sesso, qrsMs),
      peguero(amp, sesso), lewis(amp)],
    destra: [sokolowDx(amp), rsV1(amp)]
  };
}

function testo(i) {
  if (i.prodotto !== undefined)
    return Math.round(i.prodottoMm) + ' mm·ms (soglia ' + i.sogliaProdottoMm + ')';
  if (i.rapporto !== undefined)
    return (i.rapporto >= 99 ? '∞' : i.rapporto.toFixed(2).replace('.', ',')) + ' (soglia 1)';
  return i.valoreMm.toFixed(1).replace('.', ',') + ' mm (soglia ' +
    i.sogliaMm.toFixed(1).replace('.', ',') + ' mm)';
}

const API = { GUADAGNO_RIF: G0, mvToMm: mm, calcola, testo };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_IPERTROFIE = API;
})(typeof window !== 'undefined' ? window : this);
