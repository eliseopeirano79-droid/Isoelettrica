/* Isoelettrica — controllo di ST e T derivazione per derivazione
   Il validatore principale verifica ritmo, intervalli e voltaggi; questo file
   verifica il SEGNO del tratto ST e dell'onda T in ogni derivazione, dove si
   annidano gli errori più insidiosi (un vettore di lesione che punta dalla parte
   sbagliata passa tutti gli altri controlli).
   Uso:  node controllo-st.js
   Misure sul battito condotto centrale, rispetto al segmento PR:
     J    = fine del QRS         ST = J + 40 ms        T = picco di massima ampiezza */
'use strict';
const E = require('./engine.js'), D = require('./data.js');
const ID = E.LEADS.map(L => L.id);

function misura(id, over) {
  const sc = D.SCENARIOS.find(s => s.id === id);
  const p = {}; (sc.params || []).forEach(q => p[q.k] = q.def); Object.assign(p, over || {});
  const st = new E.Stream(Object.assign({}, sc.build(p), { noise: 0 }), 7); st.ensure(24000);
  const V = st.ev.filter(e => e.kind === 'V' && e.t >= 8000 && e.t <= 22000);
  const c = V.filter(e => e.meta.type === 'conducted'); const pool = c.length ? c : V; const b = pool[Math.floor(pool.length / 2)];
  const w = b.meta.w, qt = b.meta.qt, v = [0, 0, 0], l = new Array(12);
  const get = t => { st.vec(t, v); st.leads(t, v, l); return l.slice(); };
  const base = get(b.t - 22), o = { qtc: qt / Math.sqrt(b.meta.rr / 1000), L: {} };
  const T = []; for (let t = w + 30; t <= qt + 40; t += 2) T.push(get(b.t + t));
  const J = get(b.t + w), S = get(b.t + w + 40);
  ID.forEach((L, k) => {
    const serie = T.map(x => (x[k] - base[k]) * 10);
    let pk = 0, mx = -99, mn = 99, iMx = 0, iMn = 0;
    serie.forEach((x, i) => { if (Math.abs(x) > Math.abs(pk)) pk = x; if (x > mx) { mx = x; iMx = i; } if (x < mn) { mn = x; iMn = i; } });
    o.L[L] = { J: (J[k] - base[k]) * 10, ST: (S[k] - base[k]) * 10, T: pk, Tmax: mx, Tmin: mn, bifasica: mx > 0.5 && mn < -1 && iMx < iMn };
  });
  return o;
}

const R = [];
const tutte = (o, ls, f) => ls.every(L => f(o.L[L]));
const reg = (id, over, desc, f) => R.push([id, over, desc, f]);

reg('normale', {}, 'nessun ST ≥ 1 mm, T positive V2-V6, T negativa in aVR', o => tutte(o, ID, x => Math.abs(x.ST) < 1) && tutte(o, ['V2', 'V3', 'V4', 'V5', 'V6'], x => x.T > 0.5) && o.L.aVR.T < 0);
reg('takotsubo', { fase: '0' }, 'ST su in V3-V4, V1 risparmiata, aVR sotto, nessun altro sottoslivellamento', o => o.L.V3.ST >= 1 && o.L.V4.ST >= 1 && o.L.V1.ST < 1 && o.L.aVR.ST <= -0.5 && ID.filter(L => L !== 'aVR').every(L => o.L[L].ST > -0.5));
reg('takotsubo', { fase: '1' }, 'T negative giganti V2-V5, positiva in aVR, QTc ≥ 500', o => tutte(o, ['V2', 'V3', 'V4', 'V5'], x => x.T <= -5) && o.L.aVR.T > 0 && o.qtc >= 500);
reg('stemi-anteriore', { fase: '1' }, 'ST su V2-V4, niente ST su in DIII', o => tutte(o, ['V2', 'V3', 'V4'], x => x.ST >= 1.5) && o.L.III.ST <= 0);
reg('stemi-inferiore', { fase: '1' }, 'ST su DII-DIII-aVF, DIII > DII, reciprocità in aVL', o => tutte(o, ['II', 'III', 'aVF'], x => x.ST >= 1) && o.L.III.ST > o.L.II.ST && o.L.aVL.ST <= -0.5);
reg('stemi-laterale', { fase: '1' }, 'ST su DI, aVL, V5, V6; reciprocità in DIII', o => tutte(o, ['I', 'aVL', 'V5', 'V6'], x => x.ST >= 1) && o.L.III.ST <= -0.5);
reg('stemi-posteriore', { fase: '1' }, 'ST sotto V2-V3 con T positive', o => tutte(o, ['V2', 'V3'], x => x.ST <= -1 && x.Tmax > 1));
['anteriore', 'laterale', 'inferiore', 'diffuso'].forEach(t => {
  const f = o => ID.filter(L => L !== 'aVR' && L !== 'V1').every(L => o.L[L].J < 1) && o.L.V1.J < 1.5 && ID.some(L => o.L[L].J <= -1);
  reg('nstemi', { terr: t }, 'sottoslivellamento senza sopraslivellamento speculare (tranne aVR e V1)', f);
  reg('angina-instabile', { fase: '1', terr: t }, 'come NSTEMI', f);
});
reg('pericardite', {}, 'ST su diffuso, aVR sotto, V1 risparmiata', o => o.L.II.ST >= 1 && o.L.V5.ST >= 1 && o.L.aVR.ST <= -0.5 && o.L.V1.ST < 1);
reg('wellens', { tipo: 'a' }, 'T bifasica positiva-negativa in V2-V3', o => o.L.V2.bifasica && o.L.V3.bifasica);
reg('wellens', { tipo: 'b' }, 'ST isoelettrico e T profonda in V2-V3', o => tutte(o, ['V2', 'V3'], x => Math.abs(x.ST) < 1 && x.T <= -5));
reg('dewinter', {}, 'J sotto V2-V4, T alte, aVR appena su', o => tutte(o, ['V2', 'V3', 'V4'], x => x.J <= -1 && x.T >= 5) && o.L.aVR.J >= 0.5);
reg('brugada', {}, 'J ≥ 2 mm e T negativa in V1-V2, nulla in V4 e DI', o => tutte(o, ['V1', 'V2'], x => x.J >= 2 && x.Tmin <= -1) && Math.abs(o.L.V4.J) < 0.5 && Math.abs(o.L.I.J) < 0.5);
reg('brugada2', {}, 'J ≥ 2 mm in V1-V2 e T positiva in V2', o => o.L.V1.J >= 1.5 && o.L.V2.J >= 1 && o.L.V2.T > 0);
reg('ep-s1q3t3', {}, 'T negativa in DIII e in V1-V3', o => o.L.III.T < -0.5 && tutte(o, ['V1', 'V2', 'V3'], x => x.T < -1));
reg('pmddd', {}, 'T discordante: negativa in DI e V6', o => o.L.I.T < -1 && o.L.V6.T < -1);
reg('bbsx', {}, 'T discordante: positiva in V1, negativa in V6', o => o.L.V1.T > 1 && o.L.V6.T < -1);
reg('ivs', { strain: '1' }, 'strain: T negativa in DI e V6', o => o.L.I.T < -1 && o.L.V6.T < -1);
reg('digitale', {}, 'ST a scodella sotto in V5-V6', o => o.L.V5.ST <= -0.5 && o.L.V6.ST <= -0.5);
reg('iperk', {}, 'T alta in V3-V4', o => o.L.V3.T >= 5 && o.L.V4.T >= 5);
reg('ripol-precoce', {}, 'J su in V4-V5', o => o.L.V4.J >= 0.5 && o.L.V5.J >= 0.5);

let ok = 0, ko = 0;
R.forEach(([id, over, desc, f]) => {
  let o; try { o = misura(id, over); } catch (e) { console.log('✗ ' + id + ' ' + JSON.stringify(over) + ' — errore: ' + e.message); ko++; return; }
  const riga = ['J', 'ST', 'T'].map(k => k.padEnd(3) + ID.map(L => L + ' ' + o.L[L][k].toFixed(1)).join('  ')).join('\n      ');
  if (f(o)) { ok++; console.log('✓ ' + id + ' ' + JSON.stringify(over) + ' — ' + desc); }
  else { ko++; console.log('✗ ' + id + ' ' + JSON.stringify(over) + ' — ' + desc + '\n      ' + riga); }
});
console.log('\n' + ok + ' regole rispettate, ' + ko + ' violate.');
if (ko) process.exitCode = 1;
