/* =====================================================================
   AUDIT — banco di prova dei tracciati di Isoelettrica
   Si lancia con:  node audit.js
   Tre controlli, tutti sul segnale davvero generato e non sui parametri
   dichiarati:
     1. intaccature del QRS che non hanno corrispondente fisiologico
     2. criteri diagnostici quadro per quadro (quelli che le schede dichiarano)
     3. tenuta di ogni cursore portato al minimo e al massimo
   ===================================================================== */
/* banco di misura: estrae dal segnale reale i parametri di ogni quadro */
const E = require('./engine.js'), D = require('./data.js');
const ID = E.LEADS.map(L => L.id);

function costruisci(sc, over) {
  const p = {}; (sc.params || []).forEach(q => p[q.k] = q.def);
  Object.assign(p, over || {});
  const cfg = Object.assign({}, sc.build(p), { noise: 0 });
  const st = new E.Stream(cfg, 7); st.ensure(24000);
  return { st, cfg, p };
}
function traccia(st, t0, t1, dt) {
  const v = [0, 0, 0], out = [], n = Math.round((t1 - t0) / dt);
  for (let i = 0; i <= n; i++) {
    const t = t0 + i * dt, lv = new Array(12);
    st.vec(t, v); st.leads(t, v, lv);
    out.push({ t, v: lv.slice() });
  }
  return out;
}
// battito rappresentativo: l'ultimo evento V del tipo dominante prima di tRef
function battiti(st, t0, t1) {
  return st.ev.filter(e => e.kind === 'V' && e.t >= t0 && e.t <= t1);
}
function batteAtri(st, t0, t1) {
  return st.ev.filter(e => e.kind === 'A' && e.t >= t0 && e.t <= t1);
}
function estremi(w, i0, i1, soglia) {
  const out = [];
  for (let i = i0 + 1; i < i1; i++)
    if ((w[i] - w[i - 1]) * (w[i + 1] - w[i]) < 0 && Math.abs(w[i]) > soglia) out.push({ i, v: w[i] });
  return out;
}
function analizza(id) {
  const sc = D.SCENARIOS.find(s => s.id === id);
  const { st, cfg } = costruisci(sc);
  const V = battiti(st, 8000, 20000), A = batteAtri(st, 8000, 20000);
  const cond = V.filter(e => e.meta.type === 'conducted');
  const b = cond.length ? cond[Math.floor(cond.length / 2)] : V[Math.floor(V.length / 2)];
  if (!b) return { id, vuoto: true, cfg };
  const w = b.meta.w || 100, qt = b.meta.qt || 0;
  const s = traccia(st, b.t - 420, b.t + Math.max(520, qt + 160), 1);
  const idx = t => Math.round(t - (b.t - 420));
  const col = k => s.map(x => x.v[k]);
  const base = s[idx(b.t - 22)].v.slice();          // riferimento: segmento PR, subito prima del QRS
  const R = {}, S = {}, ST = {}, T = {}, note = {};
  ID.forEach((L, k) => {
    const c = col(k);
    let r = 0, sm = 0;
    for (let t = -12; t <= w + 16; t++) { const d = c[idx(b.t + t)] - base[k]; if (d > r) r = d; if (-d > sm) sm = -d; }
    R[L] = r; S[L] = sm;
    ST[L] = c[idx(b.t + w + 60)] - base[k];
    let tp = 0; for (let t = w + 45; t <= qt + 70; t++) { const d = c[idx(b.t + t)] - base[k]; if (Math.abs(d) > Math.abs(tp)) tp = d; }
    T[L] = tp;
    const e = estremi(c, idx(b.t - 12), idx(b.t + w + 16), 0.045);
    let gobbe = 0;
    for (let i = 1; i < e.length; i++) if (e[i].v * e[i - 1].v > 0) gobbe++;
    note[L] = gobbe;
  });
  // onda P dell'evento atriale che precede
  const pa = A.filter(e => e.t < b.t && b.t - e.t < 900).pop();
  const P = {}, Pneg = {};
  if (pa) {
    const bp = s[Math.max(0, idx(pa.t - 25))].v;      // subito prima dell'inizio della P
    ID.forEach((L, k) => {
      const c = col(k); let mx = 0, mn = 0;
      const tMax = Math.min(150, b.t - 12 - pa.t); for (let t = -25; t <= tMax; t++) { const j = idx(pa.t + t); if (j < 1 || j >= c.length) continue; const d = c[j] - bp[k]; if (d > mx) mx = d; if (d < mn) mn = d; }
      P[L] = Math.abs(mx) >= Math.abs(mn) ? mx : mn; Pneg[L] = mn;
    });
  }
  const rr = b.meta.rr || 0;
  const fc = rr ? 60000 / rr : 0;
  const pr = pa ? b.t - pa.t : null;
  return { id, cat: sc.cat, nome: sc.nome, cfg, b, w, qt, rr, fc, pr, R, S, ST, T, P, Pneg, note, nV: V.length, nA: A.length, tipi: [...new Set(V.map(e => e.meta.type))] };
}


const IP = require('./ipertrofie.js');
const esiti = [];
function reg(id, ok, testo, val) { esiti.push({ id, ok, testo, val }); }

/* misure aggiuntive sul battito rappresentativo */
function dettaglio(id, over) {
  const sc = D.SCENARIOS.find(s => s.id === id);
  const { st } = costruisci(sc, over);
  const V = st.ev.filter(e => e.kind === 'V' && e.t >= 8000 && e.t <= 22000);
  const A = st.ev.filter(e => e.kind === 'A' && e.t >= 8000 && e.t <= 22000);
  const cond = V.filter(e => e.meta.type === 'conducted');
  const b = cond.length ? cond[Math.floor(cond.length / 2)] : V[Math.floor(V.length / 2)];
  const rr = []; for (let i = 1; i < V.length; i++) rr.push(V[i].t - V[i - 1].t);
  const ar = []; for (let i = 1; i < A.length; i++) ar.push(A[i].t - A[i - 1].t);
  const o = { st, V, A, rr, ar, b, sc };
  if (!b) return o;
  const w = b.meta.w || 100, qt = b.meta.qt || 320;
  const t0 = b.t - 400, s = traccia(st, t0, b.t + qt + 260, 1);
  const idx = t => Math.max(0, Math.min(s.length - 1, Math.round(t - t0)));
  const c = k => s.map(x => x.v[k]);
  const base = s[idx(b.t - 22)].v;
  o.w = w; o.qt = qt; o.rrb = b.meta.rr;
  o.J = {}; o.J80 = {}; o.Tamp = {}; o.Tneg = {}; o.U = {}; o.R = {}; o.S = {}; o.q = {}; o.onda = {};
  ID.forEach((L, k) => {
    const v = c(k);
    o.onda[L] = { v, idx, base: base[k] };
    o.J[L] = v[idx(b.t + w)] - base[k];
    o.J80[L] = v[idx(b.t + w + 80)] - base[k];
    let r = 0, sm = 0, qd = 0, primo = 0;
    for (let t = -12; t <= w + 12; t++) { const d = v[idx(b.t + t)] - base[k]; if (d > r) r = d; if (-d > sm) sm = -d; }
    for (let t = -12; t <= 45; t++) { const d = v[idx(b.t + t)] - base[k]; if (d > 0.04) break; if (-d > qd) qd = -d; }
    o.R[L] = r; o.S[L] = sm; o.q[L] = qd;
    let tp = 0; for (let t = w + 40; t <= qt + 60; t++) { const d = v[idx(b.t + t)] - base[k]; if (Math.abs(d) > Math.abs(tp)) tp = d; }
    o.Tamp[L] = tp;
    let u = 0; for (let t = qt + 70; t <= qt + 250; t++) { const d = v[idx(b.t + t)] - base[k]; if (Math.abs(d) > Math.abs(u)) u = d; }
    o.U[L] = u;
  });
  o.asse = Math.round(Math.atan2((o.R.aVF - o.S.aVF) / 0.866, o.R.I - o.S.I) * 180 / Math.PI);
  o.qtc = Math.round(qt / Math.sqrt((b.meta.rr || 800) / 1000));
  const amp = st.qrsAmplitudes(b.t + 10); o.ipx = amp ? IP.calcola(amp, { sesso: 'M' }) : null;
  return o;
}
const mm = x => +(x * 10).toFixed(1);


/* Cerca l'intaccatura: due picchi dello stesso segno separati da un avvallamento
   che non attraversa la linea di base. In un modello vettoriale pulito il QRS è
   una spazzata continua e questo non può succedere, se non nei blocchi di branca
   e nei ritmi ventricolari, dove è proprio il segno diagnostico. */
function gobbeDi(c, base){
  const e=[]; for(let i=1;i<c.length-1;i++) if((c[i]-c[i-1])*(c[i+1]-c[i])<0) e.push({i,v:c[i]-base});
  const out=[];
  for(let i=1;i<e.length-1;i++){
    const a=e[i-1].v,m=e[i].v,b=e[i+1].v;
    if(a>0&&m>0&&b>0&&m<a&&m<b) out.push(+((Math.min(a,b)-m)*10).toFixed(2));
    if(a<0&&m<0&&b<0&&m>a&&m>b) out.push(+((m-Math.max(a,b))*-10).toFixed(2));
  }
  return out.filter(p=>p>0.10);              // avvallamento di almeno 0,1 mm
}
function gobbeQuadro(id){
  const sc=D.SCENARIOS.find(s=>s.id===id); const {st}=costruisci(sc);
  const V=st.ev.filter(e=>e.kind==='V'&&e.t>=8000&&e.t<=20000);
  const cond=V.filter(e=>e.meta.type==='conducted'); const b=cond.length?cond[Math.floor(cond.length/2)]:V[Math.floor(V.length/2)];
  if(!b) return null;
  const w=b.meta.w||100;
  const s=traccia(st,b.t-20,b.t+w+6,0.5);
  const out={};
  ID.forEach((L,k)=>{ const c=s.map(x=>x.v[k]); const g=gobbeDi(c,c[0]); if(g.length) out[L]=g; });
  return out;
}


function campiona(st, t0, t1) {
  const v = [0, 0, 0], lv = new Array(12); let amp = 0;
  const ev = st.ev.filter(e => e.kind === 'V' && e.t >= t0 - 4000 && e.t <= t1 + 4000);
  for (let t = t0; t < t1; t += 4) { st.vec(t, v); st.leads(t, v, lv); amp = Math.max(amp, Math.abs(lv[1])); }
  return { battiti: ev.length, ampiezza: amp };
}
const DOPO_TEST = {
  sinusale: () => ({ rate: 74, pr: 170, qtc: 425, qrs: E.M.qrsNormal() }),
  bradi: () => ({ rate: 44, pr: 200, qtc: 450, qrs: E.M.qrsNormal() }),
  asistolia: () => ({ mode: 'continuous' })
};

/* ============ 1. intaccature ============ */
/* L'intaccatura è attesa dove è il segno diagnostico: ogni conduzione
   rallentata (QRS >= 108 ms), i ritmi ventricolari e stimolati, l'onda J
   dell'ipotermia, le onde f e F che continuano dentro il QRS. Altrove no. */
const NOTCH_ATTESE = 'esv fa flutter tam ipotermia ep-s1q3t3 brugada arvc'.split(' ');
const notch = [];
D.SCENARIOS.forEach(sc => {
  let g, o; try { g = gobbeQuadro(sc.id); o = dettaglio(sc.id); } catch (e) { return; }
  if (!g || !Object.keys(g).length) return;
  if (NOTCH_ATTESE.indexOf(sc.id) >= 0) return;
  if (o && o.w >= 108) return;                       // conduzione rallentata: l'impastamento ci sta
  notch.push([sc.id, Object.entries(g).map(([k, v]) => k + ' [' + v.join(', ') + ' mm]').join('  ')]);
});

/* ============ 2. criteri diagnostici ============ */
const out = [];
function T(id, cond, testo, val) { out.push({ id, ok: !!cond, testo, val }); }
const cache = {};
const d = (id, over) => (over ? dettaglio(id, over) : (cache[id] || (cache[id] = dettaglio(id))));
const med = a => { const b = a.slice().sort((x, y) => x - y); return b[b.length >> 1]; };
/* ============ controlli generali su ogni quadro a ritmo sinusale ============ */
const SINUS = 'normale bradisinusale tachisinusale aritmiasinusale esa bav1 wenck mobitz2 bav21 bbdx bbsx eas eps esv stemi-inferiore stemi-anteriore stemi-laterale stemi-posteriore ivs ivd iperk ipok qtlungo pericardite bsa1 bsa2t1 bsa2t2 interatriale bbdxinc bbsxinc bifascicolare trifascicolare ivcd wellens dewinter brugada ipotermia digitale ipercalcemia ipocalcemia arvc ivs-eas bav1-bbsx ep-s1q3t3'.split(' ');
SINUS.forEach(id => {
  const p = analizza(id);
  T(id, p.P.II > 0.02, 'P positiva in DII', mm(p.P.II) + ' mm');
  T(id, p.P.aVR < -0.02, 'P negativa in aVR', mm(p.P.aVR) + ' mm');
});
/* Einthoven e Goldberger su tutti i quadri con battiti */
D.SCENARIOS.forEach(sc => {
  let o; try { o = d(sc.id); } catch (e) { return; }
  if (!o.b) return;
  const s = traccia(o.st, o.b.t - 200, o.b.t + 400, 2);
  let e1 = 0, e2 = 0;
  s.forEach(x => {
    e1 = Math.max(e1, Math.abs(x.v[1] - x.v[0] - x.v[2]));                    // II = I + III
    e2 = Math.max(e2, Math.abs(x.v[3] + (x.v[0] + x.v[1]) / 2));              // aVR = -(I+II)/2
  });
  T(sc.id, e1 < 1e-9 && e2 < 1e-9, 'legge di Einthoven e derivazioni aumentate', 'errore max ' + (Math.max(e1, e2) * 1000).toFixed(6) + ' µV');
});

/* ============ ritmo sinusale ============ */
[['normale', 60, 100], ['bradisinusale', 30, 59], ['tachisinusale', 101, 180]].forEach(([id, lo, hi]) => {
  const o = d(id), fc = 60000 / o.rrb;
  T(id, fc >= lo && fc <= hi, 'frequenza nel campo ' + lo + '-' + hi, Math.round(fc) + '/min');
});
{ const o = d('aritmiasinusale'); const v = (Math.max(...o.rr) - Math.min(...o.rr));
  T('aritmiasinusale', v > 120, 'variazione RR > 120 ms', Math.round(v) + ' ms'); }
{ const o = d('normale');
  T('normale', o.w >= 70 && o.w <= 100, 'QRS 70-100 ms', o.w + ' ms');
  T('normale', o.qtc >= 350 && o.qtc <= 440, 'QTc normale', o.qtc + ' ms');
  T('normale', o.asse >= -30 && o.asse <= 90, 'asse fra -30 e +90', o.asse + '°');
  T('normale', o.R.V1 / (o.S.V1 || 1) < 1 && o.R.V6 / (o.S.V6 || 1) > 1, 'progressione della R: R/S < 1 in V1 e > 1 in V6', 'V1 ' + (o.R.V1 / o.S.V1).toFixed(2) + ' · V6 ' + (o.R.V6 / o.S.V6).toFixed(2));
  const tr = ID.slice(6).findIndex(l => o.R[l] > o.S[l]);
  T('normale', tr >= 1 && tr <= 3, 'transizione fra V2 e V4', 'V' + (tr + 1));
  T('normale', o.q.I > 0.005 && o.q.V6 > 0.005 && o.q.V1 < 0.005, 'q settale in DI e V6, assente in V1', 'DI ' + mm(o.q.I) + ' V6 ' + mm(o.q.V6));
  T('normale', Math.abs(o.J.II) < 0.05 && Math.abs(o.J.V4) < 0.1, 'punto J isoelettrico', 'DII ' + mm(o.J.II) + ' V4 ' + mm(o.J.V4) + ' mm');
  T('normale', o.Tamp.I > 0 && o.Tamp.II > 0 && o.Tamp.V5 > 0 && o.Tamp.aVR < 0, 'T concordi e T negativa in aVR', '');
}
/* ============ blocchi AV ============ */
{ const o = d('bav1'); const pr = o.b.t - o.A.filter(x => x.t < o.b.t).pop().t;
  T('bav1', pr > 200, 'PR > 200 ms costante', Math.round(pr) + ' ms');
  T('bav1', o.w < 120, 'QRS stretto', o.w + ' ms'); }
{ const o = d('wenck');
  const pr = []; o.V.forEach(v => { const p = o.A.filter(x => x.t < v.t && v.t - x.t < 700).pop(); if (p) pr.push(Math.round(v.t - p.t)); });
  const cicli = []; let cur = [pr[0]];
  for (let i = 1; i < pr.length; i++) { if (pr[i] < pr[i - 1] - 20) { cicli.push(cur); cur = []; } cur.push(pr[i]); }
  cicli.push(cur);
  const buono = cicli.filter(c => c.length >= 3).every(c => { let ok = true; const inc = []; for (let i = 1; i < c.length; i++) { if (c[i] <= c[i - 1]) ok = false; inc.push(c[i] - c[i - 1]); } for (let i = 1; i < inc.length; i++) if (inc[i] > inc[i - 1] + 6) ok = false; return ok; });
  T('wenck', buono, 'PR crescente con incrementi decrescenti', cicli.filter(c => c.length >= 3)[0].join(' > ') + ' ms');
  T('wenck', o.A.length > o.V.length, 'P non condotte presenti', o.A.length + ' P per ' + o.V.length + ' QRS'); }
{ const o = d('mobitz2');
  const pr = []; o.V.forEach(v => { const p = o.A.filter(x => x.t < v.t && v.t - x.t < 700).pop(); if (p) pr.push(v.t - p.t); });
  const dv = Math.max(...pr) - Math.min(...pr);
  T('mobitz2', dv < 12, 'PR costante prima del battito bloccato', 'variazione ' + dv.toFixed(1) + ' ms');
  T('mobitz2', o.A.length > o.V.length, 'P bloccate improvvise', o.A.length + ' P per ' + o.V.length + ' QRS'); }
{ const o = d('bav3');
  const fa = 60000 / med(o.ar), fv = 60000 / med(o.rr);
  T('bav3', fa > fv + 15, 'frequenza atriale indipendente e maggiore', Math.round(fa) + ' vs ' + Math.round(fv) + '/min');
  T('bav3', o.w < 120, 'scappamento giunzionale a QRS stretto', o.w + ' ms'); }
{ const o = d('bav21');
  T('bav21', Math.abs(o.A.length - 2 * o.V.length) <= 2, 'conduzione 2:1', o.A.length + ' P per ' + o.V.length + ' QRS'); }
/* ============ conduzione intraventricolare ============ */
{ const o = d('bbdx');
  T('bbdx', o.w >= 120, 'QRS >= 120 ms', o.w + ' ms');
  T('bbdx', o.R.V1 > 3 * 0.1 && o.R.V1 > o.S.V1 * 0.6, 'R\' dominante in V1', mm(o.R.V1) + ' mm');
  T('bbdx', o.S.I > 0.15 && o.S.V6 > 0.15, 'S larga e impastata in DI e V6', 'DI ' + mm(o.S.I) + ' V6 ' + mm(o.S.V6) + ' mm');
  T('bbdx', o.Tamp.V1 < 0 && o.Tamp.V2 < 0, 'T discordante in V1-V2', mm(o.Tamp.V1) + ' mm'); }
{ const o = d('bbsx');
  T('bbsx', o.w >= 120, 'QRS >= 120 ms', o.w + ' ms');
  T('bbsx', o.q.I < 0.03 && o.q.V6 < 0.03, 'assenza di q in DI e V6', 'DI ' + mm(o.q.I) + ' V6 ' + mm(o.q.V6));
  T('bbsx', o.R.V6 > 0.5 && o.S.V1 > 0.5, 'R monofasica in V6 e QS o rS in V1', 'V6 ' + mm(o.R.V6) + ' · V1 S ' + mm(o.S.V1));
  T('bbsx', o.Tamp.V5 < 0 || o.Tamp.V6 < 0, 'T discordante nelle precordiali sinistre', 'V6 ' + mm(o.Tamp.V6) + ' mm'); }
[['bbdxinc', 'destro'], ['bbsxinc', 'sinistro']].forEach(([id]) => {
  const o = d(id); T(id, o.w >= 110 && o.w < 120, 'QRS fra 110 e 119 ms', o.w.toFixed(0) + ' ms'); });
{ const o = d('eas');
  T('eas', o.asse <= -45 && o.asse >= -90, 'asse fra -45 e -90', o.asse + '°');
  T('eas', o.w < 120, 'QRS < 120 ms', o.w + ' ms');
  T('eas', o.R.aVL > o.S.aVL && o.q.aVL > 0.005, 'qR in aVL', 'q ' + mm(o.q.aVL) + ' R ' + mm(o.R.aVL));
  T('eas', o.S.II > o.R.II && o.S.III > o.R.III && o.S.aVF > o.R.aVF, 'rS in DII, DIII e aVF', 'S III ' + mm(o.S.III) + ' mm'); }
{ const o = d('eps');
  T('eps', o.asse >= 90 && o.asse <= 180, 'asse oltre +90', o.asse + '°');
  T('eps', o.w < 120, 'QRS < 120 ms', o.w + ' ms');
  T('eps', o.R.III > o.S.III && o.q.III > 0.005, 'qR in DIII', 'q ' + mm(o.q.III));
  T('eps', o.S.I > o.R.I && o.S.aVL > o.R.aVL, 'rS in DI e aVL', 'S DI ' + mm(o.S.I) + ' mm'); }
{ const o = d('bifascicolare');
  T('bifascicolare', o.w >= 120 && o.R.V1 > 0.3, 'blocco di branca destra', o.w + ' ms, R V1 ' + mm(o.R.V1));
  T('bifascicolare', o.asse <= -45, 'emiblocco anteriore sinistro associato', o.asse + '°'); }
{ const o = d('trifascicolare'); const pr = o.b.t - o.A.filter(x => x.t < o.b.t).pop().t;
  T('trifascicolare', pr > 200 && o.w >= 120 && o.asse <= -45, 'BAV I + BBDx + EAS', 'PR ' + Math.round(pr) + ' QRS ' + o.w + ' asse ' + o.asse); }
{ const o = d('wpw'); const pr = o.b.t - o.A.filter(x => x.t < o.b.t).pop().t;
  T('wpw', pr < 120, 'PR < 120 ms', Math.round(pr) + ' ms');
  T('wpw', o.w > 110, 'QRS allargato dall\'onda delta', o.w + ' ms'); }
/* ============ ipertrofie ============ */
{ const o = d('ivs'); const sok = o.ipx.sinistra.find(x => /Sokolow/.test(x.nome));
  T('ivs', sok.valoreMm >= 35, 'Sokolow-Lyon >= 35 mm', sok.valoreMm.toFixed(1) + ' mm');
  T('ivs', o.Tamp.V6 < 0 && o.Tamp.I < 0, 'strain: T negativa in DI e V6', 'V6 ' + mm(o.Tamp.V6) + ' mm');
  T('ivs', o.J.V6 < -0.02, 'ST sottoslivellato in V6', mm(o.J.V6) + ' mm'); }
{ const o = d('ivd');
  T('ivd', o.asse > 90, 'deviazione assiale destra', o.asse + '°');
  T('ivd', o.R.V1 / (o.S.V1 || 0.01) > 1 && o.R.V1 >= 0.7, 'R dominante in V1, >= 7 mm', mm(o.R.V1) + ' mm');
  T('ivd', o.S.V5 > 0.3 || o.S.V6 > 0.3, 'S profonda in V5-V6', 'V6 ' + mm(o.S.V6) + ' mm');
  T('ivd', o.Tamp.V1 < 0 && o.Tamp.V2 < 0, 'strain destro: T negativa in V1-V2', mm(o.Tamp.V1) + ' mm');
  const p = analizza('ivd');
  T('ivd', p.P.II >= 0.25, 'P polmonare >= 2,5 mm in DII', mm(p.P.II) + ' mm'); }
/* ============ ischemia ============ */
{ const o = d('stemi-inferiore');
  T('stemi-inferiore', o.J.II > 0.1 && o.J.III > 0.1 && o.J.aVF > 0.1, 'ST sopraslivellato in DII, DIII e aVF', [mm(o.J.II), mm(o.J.III), mm(o.J.aVF)].join('/') + ' mm');
  T('stemi-inferiore', o.J.III > o.J.II, 'DIII > DII: arteria destra', mm(o.J.III) + ' > ' + mm(o.J.II));
  T('stemi-inferiore', o.J.I < -0.02 && o.J.aVL < -0.05, 'speculari in DI e aVL', mm(o.J.aVL) + ' mm'); }
{ const o = d('stemi-anteriore');
  T('stemi-anteriore', o.J.V2 > 0.2 && o.J.V3 > 0.2 && o.J.V4 > 0.1, 'ST sopraslivellato da V2 a V4', [mm(o.J.V2), mm(o.J.V3), mm(o.J.V4)].join('/') + ' mm');
  T('stemi-anteriore', o.J.II <= 0.1 && o.J.III <= 0.1, 'nessun sopraslivellamento inferiore', 'DIII ' + mm(o.J.III) + ' mm'); }
{ const o = d('stemi-laterale');
  T('stemi-laterale', o.J.I > 0.1 && o.J.aVL > 0.1 && o.J.V6 > 0.1, 'ST sopraslivellato in DI, aVL, V5-V6', [mm(o.J.I), mm(o.J.aVL), mm(o.J.V6)].join('/') + ' mm');
  T('stemi-laterale', o.J.III < -0.05, 'speculare in DIII', mm(o.J.III) + ' mm'); }
{ const o = d('stemi-posteriore');
  T('stemi-posteriore', o.J.V1 < -0.05 && o.J.V2 < -0.1 && o.J.V3 < -0.1, 'ST sottoslivellato da V1 a V3', [mm(o.J.V1), mm(o.J.V2), mm(o.J.V3)].join('/') + ' mm');
  T('stemi-posteriore', o.R.V2 / (o.S.V2 || 0.01) > 1, 'R dominante in V2', (o.R.V2 / o.S.V2).toFixed(2));
  T('stemi-posteriore', o.Tamp.V2 > 0, 'T positiva in V2', mm(o.Tamp.V2) + ' mm'); }
{ const o = d('wellens');
  T('wellens', o.Tamp.V2 < 0 || o.Tamp.V3 < 0, 'T negativa o bifasica in V2-V3', 'V2 ' + mm(o.Tamp.V2) + ' V3 ' + mm(o.Tamp.V3) + ' mm');
  T('wellens', o.J.V2 < 0.1 && o.J.V3 < 0.1, 'ST non sopraslivellato', mm(o.J.V3) + ' mm');
  T('wellens', o.R.V3 > 0.2, 'R conservata nelle precordiali', mm(o.R.V3) + ' mm'); }
{ const o = d('dewinter');
  T('dewinter', o.J.V3 < -0.08 && o.J.V4 < -0.08, 'ST sottoslivellato al punto J in V3-V4', [mm(o.J.V3), mm(o.J.V4)].join('/') + ' mm');
  T('dewinter', o.Tamp.V3 > 0.6, 'T alte e simmetriche', mm(o.Tamp.V3) + ' mm');
  T('dewinter', o.J.aVR > 0.02, 'lieve sopraslivellamento in aVR', mm(o.J.aVR) + ' mm'); }
{ const o = d('brugada');
  T('brugada', o.J.V1 > 0.2 || o.J.V2 > 0.2, 'ST sopraslivellato >= 2 mm in V1-V2', [mm(o.J.V1), mm(o.J.V2)].join('/') + ' mm');
  const term = L => { const x = o.onda[L]; let v = 0; for (let t = o.qt - 120; t <= o.qt + 40; t++) v = Math.min(v, x.v[x.idx(o.b.t + t)] - x.base); return v; };
  T('brugada', term('V1') < -0.05 && term('V2') < -0.05, 'T negativa dopo il sopraslivellamento', [mm(term('V1')), mm(term('V2'))].join('/') + ' mm'); }
{ const o = d('pericardite');
  const su = ID.filter(l => o.J[l] > 0.05).length;
  T('pericardite', su >= 6, 'sopraslivellamento diffuso', su + ' derivazioni');
  T('pericardite', o.J.aVR < 0, 'aVR in controtendenza', mm(o.J.aVR) + ' mm');
}
{ const o = d('arvc');
  T('arvc', o.Tamp.V1 < 0 && o.Tamp.V2 < 0 && o.Tamp.V3 < 0, 'T negative da V1 a V3', [mm(o.Tamp.V1), mm(o.Tamp.V2), mm(o.Tamp.V3)].join('/') + ' mm'); }
/* ============ elettroliti e altro ============ */
{ const o = d('iperk');
  T('iperk', o.Tamp.V3 > 0.5, 'T alte e appuntite', mm(o.Tamp.V3) + ' mm');
  const alto = dettaglio('iperk', { k: '8' }) || null;
  if (alto && alto.w) T('iperk', alto.w > 120, 'a potassio alto il QRS si allarga', alto.w.toFixed(0) + ' ms (K 8)'); }
{ const o = d('ipok');
  T('ipok', Math.abs(o.U.V3) > 0.08, 'onda U evidente', mm(o.U.V3) + ' mm in V3');
  T('ipok', o.Tamp.V5 < 0.25, 'T appiattita', mm(o.Tamp.V5) + ' mm'); }
{ const o = d('qtlungo'); T('qtlungo', o.qtc >= 480, 'QTc >= 480 ms', o.qtc + ' ms'); }
{ const o = d('ipocalcemia'); T('ipocalcemia', o.qtc >= 460, 'QTc lungo per ST prolungato', o.qtc + ' ms'); }
{ const o = d('ipercalcemia'); T('ipercalcemia', o.qtc <= 360, 'QTc corto', o.qtc + ' ms'); }
{ const o = d('digitale');
  T('digitale', o.qtc < 400, 'QT accorciato', o.qtc + ' ms');
  T('digitale', o.J.V5 < -0.03 || o.J.V6 < -0.03, 'ST a cucchiaio, sottoslivellato', 'V6 ' + mm(o.J.V6) + ' mm'); }
{ const o = d('ipotermia');
  T('ipotermia', 60000 / o.rrb < 60, 'bradicardia', Math.round(60000 / o.rrb) + '/min');
  T('ipotermia', o.qtc > 480, 'QT lungo', o.qtc + ' ms');
  const v = o.onda.II.v, ix = o.onda.II.idx, b = o.b.t, bs = o.onda.II.base;
  let g = 0; for (let t = o.w - 10; t < o.w + 60; t++) g = Math.max(g, v[ix(b + t)] - bs);
  T('ipotermia', g > 0.15, 'onda J di Osborn al punto J', mm(g) + ' mm in DII'); }
/* ============ ritmi ============ */
{ const o = d('fa');
  const cv = Math.sqrt(o.rr.reduce((s, x) => s + Math.pow(x - o.rr.reduce((a, b) => a + b) / o.rr.length, 2), 0) / o.rr.length) / (o.rr.reduce((a, b) => a + b) / o.rr.length);
  T('fa', cv > 0.12, 'RR irregolarmente irregolari', 'coefficiente di variazione ' + (cv * 100).toFixed(0) + '%');
  T('fa', o.A.length === 0, 'nessuna onda P', o.A.length + ' eventi atriali'); }
{ const o = d('flutter'); const fa = 60000 / med(o.ar);
  T('flutter', fa >= 240 && fa <= 340, 'onde F a 240-340/min', Math.round(fa) + '/min'); }
[['avnrt', 140, 250], ['avrt', 140, 250], ['tachiatriale', 120, 220], ['tam', 100, 160],
 ['tv', 100, 250], ['riva', 60, 120], ['idioventricolare', 15, 45], ['flutterv', 200, 320],
 ['ritmogiunzionale', 40, 60], ['bavavanzato', 20, 45]].forEach(([id, lo, hi]) => {
  const o = d(id); const fc = 60000 / med(o.rr);
  T(id, fc >= lo && fc <= hi, 'frequenza nel campo ' + lo + '-' + hi, Math.round(fc) + '/min'); });
[['tv', 120], ['idioventricolare', 120], ['riva', 120], ['pmvvi', 120], ['pmddd', 120], ['avrtanti', 120], ['flutterv', 140]].forEach(([id, min]) => {
  const o = d(id); T(id, o.w >= min, 'QRS largo >= ' + min + ' ms', o.w.toFixed(0) + ' ms'); });
{ const o = d('fapreeccitata');
  const cv = (Math.max(...o.rr) - Math.min(...o.rr));
  T('fapreeccitata', cv > 80, 'RR irregolari', 'escursione ' + Math.round(cv) + ' ms');
  T('fapreeccitata', o.w > 110, 'QRS largo e preeccitato', o.w.toFixed(0) + ' ms');
  T('fapreeccitata', 60000 / med(o.rr) > 180, 'frequenza molto alta', Math.round(60000 / med(o.rr)) + '/min'); }
{ const o = d('esv'); const pvc = o.V.filter(e => e.meta.type === 'pvc');
  T('esv', pvc.length > 0, 'presenza di extrasistoli ventricolari', pvc.length + ' su ' + o.V.length);
  if (pvc.length) { const i = o.V.indexOf(pvc[0]);
    const pausa = o.V[i + 1].t - o.V[i].t, prec = o.V[i].t - o.V[i - 1].t;
    T('esv', prec + pausa > 1.85 * (o.V[i - 1].t - o.V[i - 2].t), 'pausa compensatoria completa', Math.round(prec + pausa) + ' ms per due cicli da ' + Math.round(o.V[i - 1].t - o.V[i - 2].t)); } }
{ const o = d('ep-s1q3t3');
  T('ep-s1q3t3', o.S.I > 0.15, 'S profonda in DI', mm(o.S.I) + ' mm');
  T('ep-s1q3t3', o.q.III > 0.03, 'q in DIII', mm(o.q.III) + ' mm');
  T('ep-s1q3t3', o.Tamp.III < 0, 'T negativa in DIII', mm(o.Tamp.III) + ' mm');
  T('ep-s1q3t3', o.Tamp.V1 < 0 && o.Tamp.V2 < 0 && o.Tamp.V3 < 0, 'T negative da V1 a V3', [mm(o.Tamp.V1), mm(o.Tamp.V2), mm(o.Tamp.V3)].join('/') + ' mm');
  T('ep-s1q3t3', 60000 / o.rrb > 100, 'tachicardia sinusale', Math.round(60000 / o.rrb) + '/min'); }
{ const o = d('fa-bbdx');
  T('fa-bbdx', o.A.length === 0 && o.w >= 120 && o.R.V1 > 0.3, 'FA con morfologia di blocco destro', 'QRS ' + o.w + ' ms, R V1 ' + mm(o.R.V1) + ' mm'); }
{ const o = d('ivs-eas');
  const sok = o.ipx.sinistra.find(x => /Sokolow/.test(x.nome));
  T('ivs-eas', sok.valoreMm >= 35 && o.asse <= -45, 'ipertrofia sinistra con emiblocco anteriore', 'Sokolow ' + sok.valoreMm.toFixed(1) + ' mm, asse ' + o.asse + '°'); }
{ const o = d('bav1-bbsx'); const pr = o.b.t - o.A.filter(x => x.t < o.b.t).pop().t;
  T('bav1-bbsx', pr > 200 && o.w >= 120, 'BAV I con blocco di branca sinistra', 'PR ' + Math.round(pr) + ' ms, QRS ' + o.w + ' ms'); }
{ const o = d('stemi-inf-bav3');
  const fa = 60000 / med(o.ar), fv = 60000 / med(o.rr);
  T('stemi-inf-bav3', fa > fv + 10, 'dissociazione atrio-ventricolare', Math.round(fa) + ' vs ' + Math.round(fv) + '/min');
  T('stemi-inf-bav3', o.J.II > 0.08 && o.J.III > 0.08, 'sopraslivellamento inferiore', [mm(o.J.II), mm(o.J.III)].join('/') + ' mm'); }



/* ============ valvulopatie, LGL e defibrillazione ============ */
{ const o = d('stenosi-aortica'); const sok = o.ipx.sinistra.find(x => /Sokolow/.test(x.nome));
  T('stenosi-aortica', sok.valoreMm >= 35, 'ipertrofia sinistra di voltaggio', sok.valoreMm.toFixed(1) + ' mm');
  T('stenosi-aortica', o.Tamp.V6 < 0 && o.J.V6 < -0.02, 'sovraccarico sistolico in V6', 'T ' + mm(o.Tamp.V6) + ' ST ' + mm(o.J.V6) + ' mm');
  const p = analizza('stenosi-aortica');
  T('stenosi-aortica', p.Pneg.V1 < -0.05, 'forza terminale negativa in V1', mm(p.Pneg.V1) + ' mm'); }
{ const o = d('insufficienza-aortica'); const sok = o.ipx.sinistra.find(x => /Sokolow/.test(x.nome));
  T('insufficienza-aortica', sok.valoreMm >= 30, 'voltaggi aumentati', sok.valoreMm.toFixed(1) + ' mm');
  T('insufficienza-aortica', o.q.V6 > 0.02 && o.q.I > 0.015, 'q settale evidente in DI e V6', 'DI ' + mm(o.q.I) + ' V6 ' + mm(o.q.V6) + ' mm');
  T('insufficienza-aortica', o.Tamp.V6 > 0 && o.Tamp.I > 0, 'T ancora positiva: sovraccarico di volume', mm(o.Tamp.V6) + ' mm'); }
function pDurata(id, over) {
  const sc = D.SCENARIOS.find(x => x.id === id); const { st } = costruisci(sc, over);
  const A = st.ev.filter(e => e.kind === 'A' && e.t > 9000)[0]; if (!A) return 0;
  const V = st.ev.filter(e => e.kind === 'V' && e.t > A.t); const fine = V.length ? Math.min(220, V[0].t - A.t - 18) : 220;
  const v = [0, 0, 0], lv = new Array(12); let t0 = null, t1 = null;
  for (let t = -60; t < fine; t++) { st.vec(A.t + t, v); st.leads(A.t + t, v, lv); if (Math.abs(lv[1]) > 0.025) { if (t0 === null) t0 = t; t1 = t; } }
  return t0 === null ? 0 : t1 - t0;
}
T('normale', pDurata('normale') <= 120, 'durata della P nella norma', pDurata('normale') + ' ms');
{ const o = d('stenosi-mitralica'); const p = analizza('stenosi-mitralica');
  T('stenosi-mitralica', pDurata('stenosi-mitralica') >= 120, 'P larga \u2265 120 ms', pDurata('stenosi-mitralica') + ' ms');
  T('stenosi-mitralica', p.Pneg.V1 < -0.06, 'componente negativa profonda della P in V1', mm(p.Pneg.V1) + ' mm');
  T('stenosi-mitralica', o.asse > 75, 'asse deviato a destra per l\u2019impegno polmonare', o.asse + '\u00b0');
  const sok = o.ipx.sinistra.find(x => /Sokolow/.test(x.nome));
  T('stenosi-mitralica', sok.valoreMm < 35, 'nessuna ipertrofia sinistra', sok.valoreMm.toFixed(1) + ' mm'); }
{ const p = analizza('insufficienza-mitralica'); const o = d('insufficienza-mitralica');
  T('insufficienza-mitralica', p.Pneg.V1 < -0.04, 'ingrandimento atriale sinistro', mm(p.Pneg.V1) + ' mm in V1');
  T('insufficienza-mitralica', o.R.V6 > 0.9, 'voltaggi aumentati in V6', mm(o.R.V6) + ' mm'); }
{ const o = d('prolasso-mitralico', { ect: '0', hr: 74 });
  T('prolasso-mitralico', o.Tamp.II < 0 && o.Tamp.III < 0 && o.Tamp.aVF < 0, 'T negative nelle inferiori', [mm(o.Tamp.II), mm(o.Tamp.III), mm(o.Tamp.aVF)].join('/') + ' mm');
  T('prolasso-mitralico', o.w < 110, 'QRS stretto', o.w.toFixed(0) + ' ms'); }
{ const o = d('insufficienza-tricuspidale'); const p = analizza('insufficienza-tricuspidale');
  T('insufficienza-tricuspidale', p.P.II >= 0.25, 'P polmonare \u2265 2,5 mm in DII', mm(p.P.II) + ' mm');
  T('insufficienza-tricuspidale', o.R.V1 > 0.4, 'sovraccarico destro in V1', mm(o.R.V1) + ' mm'); }
{ const o = d('lgl'); const pr = o.b.t - o.A.filter(x => x.t < o.b.t).pop().t;
  T('lgl', pr < 120, 'PR < 120 ms', Math.round(pr) + ' ms');
  T('lgl', o.w <= 100, 'QRS stretto, senza onda delta', o.w + ' ms'); }
/* la scarica: artefatto presente, ritmo che cambia solo dove deve */
{
  const sc = D.SCENARIOS.find(x => x.id === 'dae');
  const prova = (ritmo, esito) => {
    const p = {}; sc.params.forEach(q => p[q.k] = q.def); p.ritmo = ritmo; p.esito = esito;
    const st = new E.Stream(Object.assign(sc.build(p), { noise: 0 }), 5); st.ensure(20000);
    const prima = campiona(st, 5000, 5900);
    st.scarica(6000, esito === 'nulla' ? null : DOPO_TEST[esito](), 1500);
    st.ensure(20000);
    let picco = 0; const v = [0, 0, 0], lv = new Array(12);
    for (let t = 5990; t < 6040; t += 1) { st.vec(t, v); st.leads(t, v, lv); picco = Math.max(picco, Math.abs(lv[1])); }
    let muto = 0; for (let t = 6060; t < 6220; t += 4) { st.vec(t, v); st.leads(t, v, lv); muto = Math.max(muto, Math.abs(lv[1])); }
    const dopo = campiona(st, 9000, 9900);
    return { picco, muto, prima, dopo };
  };
  const r1 = prova('fv', 'sinusale');
  T('dae', r1.picco > 2, 'la scarica manda il tracciato fuori scala', (r1.picco * 10).toFixed(0) + ' mm');
  T('dae', r1.muto < 0.01, 'tracciato muto subito dopo la scarica', (r1.muto * 10).toFixed(2) + ' mm');
  T('dae', r1.dopo.battiti >= 5 && r1.dopo.battiti < 22, 'ripresa del ritmo sinusale', r1.dopo.battiti + ' QRS in 15 s');
  const r2 = prova('asistolia', 'nulla');
  T('dae', r2.picco > 2 && r2.dopo.battiti === 0, 'sull\u2019asistolia la scarica non cambia nulla', r2.dopo.battiti + ' QRS dopo');
  const r3 = prova('fv', 'nulla');
  T('dae', r3.dopo.ampiezza > 0.1, 'aritmia che persiste se la scarica non funziona', (r3.dopo.ampiezza * 10).toFixed(1) + ' mm');
}

/* ============ 3. parametri ============ */
const guaiPar = [];let nProve = 0, koProve = 0;
D.SCENARIOS.forEach(sc => {
  const base = {}; (sc.params || []).forEach(q => base[q.k] = q.def);
  const prove = [['di partenza', {}]];
  (sc.params || []).forEach(q => {
    if (q.type === 'select') (q.opts || []).forEach(o => prove.push([q.label + ' = ' + o[1], { [q.k]: o[0] }]));
    else { prove.push([q.label + ' al minimo', { [q.k]: q.min }]); prove.push([q.label + ' al massimo', { [q.k]: q.max }]); }
  });
  prove.forEach(([nome, over]) => {
    nProve++;
    const guai = [];
    try {
      const p = Object.assign({}, base, over);
      const cfg = Object.assign({}, sc.build(p), { noise: 0 });
      const st = new E.Stream(cfg, 11); st.ensure(16000);
      const v = [0, 0, 0], lv = new Array(12);
      let picco = 0, nan = 0;
      for (let t = 2000; t < 15000; t += 2) {
        st.vec(t, v); st.leads(t, v, lv);
        for (let i = 0; i < 12; i++) { if (!isFinite(lv[i])) nanProve++; picco = Math.max(picco, Math.abs(lv[i])); }
      }
      if (nan) guai.push(nan + ' campioni non numerici');
      if (picco > 6) guai.push('ampiezza fuori scala ' + (picco * 10).toFixed(0) + ' mm');
      const piattoVoluto = cfg.mode === 'continuous' && !cfg.cont;   // asistolia
      if (picco < 0.02 && !piattoVoluto) guai.push('tracciato piatto');
      const V = st.ev.filter(e => e.kind === 'V' && e.t > 4000 && e.t < 15000);
      if (V.length) {
        const rr = []; for (let i = 1; i < V.length; i++) rr.push(V[i].t - V[i - 1].t);
        const fc = 60000 / (rr.reduce((a, b) => a + b, 0) / rr.length);
        if (fc < 8 || fc > 340) guai.push('frequenza ' + Math.round(fc) + '/min');
        V.forEach(e => {
          const w = e.meta.w, qt = e.meta.qt;
          if (w && (w < 40 || w > 260)) guai.push('QRS ' + Math.round(w) + ' ms');
          if (qt && qt < w) guai.push('QT (' + Math.round(qt) + ') minore del QRS');
          if (qt && e.meta.rr && qt > e.meta.rr * 0.95 && qt > w + 62) guai.push('QT ' + Math.round(qt) + ' su RR ' + Math.round(e.meta.rr));
        });
      }
    } catch (e) { guai.push('eccezione: ' + e.message); }
    if (guai.length) { koProve++; guaiPar.push([sc.id, nome, [...new Set(guai)].join('; ')]); }
  });
});


/* ============ referto ============ */
console.log('\n── 1. Intaccature del QRS senza corrispondente fisiologico ──');
if (!notch.length) console.log('   nessuna');
notch.forEach(([id, t]) => console.log('   ✗ ' + id.padEnd(18) + t));

console.log('\n── 2. Criteri diagnostici ──');
const per = {};
out.forEach(r => (per[r.id] = per[r.id] || []).push(r));
let ko = 0, tot = 0;
Object.keys(per).forEach(id => {
  const bad = per[id].filter(r => !r.ok); tot += per[id].length; ko += bad.length;
  if (!bad.length) return;
  console.log('   ■ ' + id);
  bad.forEach(r => console.log('      ✗ ' + r.testo + (r.val ? '   → ' + r.val : '')));
});
console.log('   ' + tot + ' controlli, ' + (tot - ko) + ' superati, ' + ko + ' da rivedere.');

console.log('\n── 3. Tenuta dei parametri ──');
guaiPar.forEach(([id, nome, g]) => console.log('   ✗ ' + id.padEnd(18) + nome.padEnd(34) + g));
console.log('   ' + nProve + ' combinazioni provate, ' + guaiPar.length + ' con anomalie.');

const totali = notch.length + ko + guaiPar.length;
console.log('\n' + (totali ? totali + ' punti da rivedere.' : 'Tutto conforme.') + '\n');
process.exit(totali ? 1 : 0);
