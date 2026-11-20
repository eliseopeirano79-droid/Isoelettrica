/* Ottica acustica ridotta: diffusori complessi in coordinate materiali e inviluppo.
   Non e' Field II, non simula l'equazione d'onda o un'apertura phased-array completa.
   Le classi macroscopiche restano quelle della sezione anatomica Canvas v47.1. */
(function (root) {
'use strict';
const FONTI = {
  field: { titolo: 'Jensen JA. Field: A Program for Simulating Ultrasound Systems. Med Biol Eng Comput 1996;34 Suppl 1:351-353.', url: 'https://www.field-ii.dk/documents/jaj_nbc_1996.pdf', uso: 'diffusori e risposta impulsiva; implementazione originale semplificata' },
  guida: { titolo: 'Jensen JA. Users guide for the Field II program, release 3.24, 2014, sezioni 3 e 5.2.', url: 'https://field-ii.dk/program_code/matlab_8.20/m_files/users_guide.pdf', uso: 'velocita del suono convenzionale e coefficiente di attenuazione come parametro del modello' }
};
const FISICA = Object.freeze({ suono: 1540, attenuazione: .5, frequenza: 2.5 }); // m/s; dB/(cm MHz); MHz. Ultimi due: valori scelti per il modello, guida Field II set_field.
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
function rumore(x, y, z, seed) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1442695041) ^ (seed | 0);
  h = Math.imul(h ^ (h >>> 13), 1274126177); return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}
function campo(p, seed, periodo) {
  const x = Math.floor(p[0]), y = Math.floor(p[1]), z = Math.floor(p[2]), t = p.map((v, i) => v - [x, y, z][i]);
  const wrap = n => periodo ? ((n % periodo) + periodo) % periodo : n;
  let sum = 0; for (let k = 0; k < 2; k++) for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
    let v = rumore(wrap(x + i), wrap(y + j), wrap(z + k), seed);
    if (periodo) v = Math.round(v * 255) / 255; // stessa quantizzazione della texture RG8
    sum += (v * 2 - 1) * (i ? t[0] : 1 - t[0]) * (j ? t[1] : 1 - t[1]) * (k ? t[2] : 1 - t[2]);
  }
  return sum;
}
function diffusori(p, seed) { return [campo(p, seed || 79, 64), campo(p, (seed || 79) + 31, 64)]; }
function inversa(G, p, c, deforma, tolleranza, iterazioni) {
  const x = p.slice(), f = [0, 0, 0], max = iterazioni || 24, tol = tolleranza || 1e-5 * G.L; let residuo = Infinity, i = 0;
  for (; i < max; i++) { deforma(G, x, c, f); residuo = Math.hypot(f[0] - p[0], f[1] - p[1], f[2] - p[2]); if (residuo <= tol) break; for (let j = 0; j < 3; j++) x[j] -= .85 * (f[j] - p[j]); }
  deforma(G, x, c, f); residuo = Math.hypot(f[0] - p[0], f[1] - p[1], f[2] - p[2]);
  return { punto: x, residuo, convergente: residuo <= tol, iterazioni: i };
}
function tgc(v, z) { const p = clamp(z, 0, 1) * (v.length - 1), i = Math.floor(p); return (v[i] || 0) * (1 - p + i) + (v[Math.min(i + 1, v.length - 1)] || 0) * (p - i); }
function attenuazione(cm, mhz, coeff) { return 2 * Math.max(0, cm) * Math.max(0, mhz) * Math.max(0, coeff); }
function luminosita(a, db, gain, loss, t) { return a <= 0 ? 0 : clamp(1 + (20 * Math.log10(a / 2) + gain - loss + t) / db, 0, 1); }
function polari(x, y, ox, oy, scala, prof, mezzo) { const dx = (x - ox) / scala, dy = (y - oy) / scala, r = Math.hypot(dx, dy), a = Math.atan2(dx, dy); return dy >= 0 && r <= prof && Math.abs(a) <= mezzo ? { r, a, u: (a / mezzo + 1) / 2, v: r / prof } : null; }
function psf(sigma, radius) { const a = []; let s = 0; for (let i = -radius; i <= radius; i++) { const v = Math.exp(-.5 * (i / sigma) ** 2); a.push(v); s += v; } return a.map(v => v / s); }
const API = { FONTI, FISICA, rumore, campo, diffusori, inversa, tgc, attenuazione, luminosita, polari, psf };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_ECO_BMODE_CORE = API;
})(typeof self !== 'undefined' ? self : this);
