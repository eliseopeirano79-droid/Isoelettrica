/* Casi clinici: coerenza dei dati con il motore ECG e con le fonti dichiarate. */
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'engine.js'));
global.window = global; global.ECG = E;
try { global.ISO_IPERTROFIE = require(path.join(root, 'ipertrofie.js')); } catch (_) {}
let D = require(path.join(root, 'data.js')); if (!D.SCENARIOS) D = global.ISO_DATA;
const { CASI, FONTI } = require(path.join(root, 'casi-dati.js'));
const { frequenza } = require(path.join(root, 'casi-clinici.js'));
const byId = Object.fromEntries(D.SCENARIOS.map(s => [s.id, s]));
function cfg(stato) {
  const sc = byId[stato.ecg[0]], p = Object.assign(Object.fromEntries(sc.params.map(q => [q.k, q.def])), stato.ecg[1]);
  const c = sc.build(p); c.noise = 0; return c;
}

test('Ogni caso ha identificatore unico, paziente, introduzione e punti chiave', () => {
  const ids = new Set();
  for (const c of CASI) {
    assert.ok(!ids.has(c.id), c.id); ids.add(c.id);
    assert.ok(c.titolo && c.intro && c.tag && c.chiave.length >= 3, c.id);
    assert.ok(['M', 'F'].includes(c.paziente.sesso) && c.paziente.eta >= 18, c.id);
    assert.ok(c.passi.length >= 4, c.id);
  }
  assert.ok(CASI.length >= 15);
});

test('Ogni stato usa uno scenario esistente con parametri dentro i limiti del laboratorio', () => {
  for (const c of CASI) for (const [nome, s] of Object.entries(c.stati)) {
    const sc = byId[s.ecg[0]]; assert.ok(sc, c.id + '/' + nome + ': scenario ' + s.ecg[0]);
    for (const [k, v] of Object.entries(s.ecg[1] || {})) {
      const q = sc.params.find(x => x.k === k); assert.ok(q, c.id + '/' + nome + ': parametro ' + k);
      if (q.type === 'select') assert.ok(q.opts.some(o => String(o[0]) === String(v)), c.id + '/' + nome + ': ' + k + '=' + v);
      else assert.ok(v >= q.min && v <= q.max, c.id + '/' + nome + ': ' + k + '=' + v);
    }
    assert.ok(s.pz && s.pa !== undefined && s.fr !== undefined, c.id + '/' + nome);
  }
});

test('Ogni stato genera un tracciato finito su tutte le derivazioni', () => {
  for (const c of CASI) for (const [nome, s] of Object.entries(c.stati)) {
    const st = new E.Stream(cfg(s), 7), v = [0, 0, 0], lv = []; st.ensure(9000);
    for (let t = 500; t < 8000; t += 37) { st.vec(t, v); st.leads(t, v, lv); assert.ok(lv.length === 12 && lv.every(Number.isFinite), c.id + '/' + nome); }
  }
});

test('Il passaggio tra stati avviene in continuità sulla stessa striscia', () => {
  for (const c of CASI) {
    const nomi = Object.keys(c.stati), st = new E.Stream(cfg(c.stati[nomi[0]]), 3), v = [0, 0, 0], lv = [];
    let t = 3000;
    for (const n of nomi.slice(1)) { st.cambiaRitmo(cfg(c.stati[n]), t); st.ensure(t + 5000); for (let u = t - 200; u < t + 4000; u += 41) { st.vec(u, v); st.leads(u, v, lv); assert.ok(lv.every(Number.isFinite), c.id + '→' + n); } t += 4500; }
  }
});

test('La frequenza mostrata deriva dal tracciato ed è coerente con lo stato clinico', () => {
  const attese = { 'stemi-anteriore/arrivo': [88, 100], 'tpsv/arrivo': [180, 200], 'bav3/arrivo': [20, 45], 'bav3/stimolato': [64, 76], 'tv-polso/arrivo': [175, 195], 'embolia/arrivo': [120, 136], 'fa-rapida/arrivo': [120, 165], 'fa-rapida/controllata': [72, 104], 'iperkaliemia/arrivo': [52, 64] };
  for (const [k, lim] of Object.entries(attese)) {
    const [id, nome] = k.split('/'), s = CASI.find(c => c.id === id).stati[nome], f = frequenza(new E.Stream(cfg(s), 5), 0);
    assert.ok(f >= lim[0] && f <= lim[1], k + ': ' + f + '/min fuori da ' + lim.join('–'));
  }
});

test('Gli stati senza polso dichiarano frequenza e pressione non rilevabili', () => {
  for (const c of CASI) for (const [nome, s] of Object.entries(c.stati)) if (s.pz.polso === false) {
    assert.ok(s.fc != null && /non/.test(s.pa) && s.spo2 == null && s.fr === 0, c.id + '/' + nome);
    assert.equal(s.pz.cosc, 'incosciente', c.id + '/' + nome);
  }
});

test('Ogni domanda ha una sola risposta corretta, un commento per ogni opzione e una fonte nota', () => {
  for (const c of CASI) c.passi.forEach((p, i) => {
    const dove = c.id + ' passo ' + (i + 1);
    assert.equal(p.opz.filter(o => o.v === 'ok').length, 1, dove);
    assert.ok(p.opz.length >= 2 && p.opz.every(o => ['ok', 'no', 'grave'].includes(o.v) && o.t && o.f && o.f.length > 20), dove);
    assert.ok(p.q && p.tipo && p.perche, dove);
    assert.ok(p.fonte && p.fonte.length && p.fonte.every(f => FONTI[f]), dove + ': fonte');
    for (const k of ['stato', 'dopo']) if (p[k]) assert.ok(c.stati[p[k]], dove + ': stato ' + p[k]);
    for (const o of p.opz) if (o.cons) { assert.ok(c.stati[o.cons], dove + ': conseguenza ' + o.cons); assert.notEqual(o.v, 'ok', dove); }
    if (p.anim) assert.ok(['ev', 'shock', 'rcp', 'vagale', 'pacing'].includes(p.anim), dove);
  });
});

test('Il primo passo fissa lo stato iniziale e ogni stato dichiarato viene usato', () => {
  for (const c of CASI) {
    assert.ok(c.passi[0].stato, c.id);
    const usati = new Set(); c.passi.forEach(p => { [p.stato, p.dopo].concat(p.opz.map(o => o.cons)).filter(Boolean).forEach(x => usati.add(x)); });
    for (const n of Object.keys(c.stati)) assert.ok(usati.has(n), c.id + ': stato inutilizzato ' + n);
  }
});

test('Le fonti hanno titolo, riferimento e DOI, e sono tutte citate', () => {
  const citate = new Set(); CASI.forEach(c => c.passi.forEach(p => p.fonte.forEach(f => citate.add(f))));
  for (const [id, f] of Object.entries(FONTI)) { assert.ok(f.t && f.r && /^https:\/\/doi\.org\/10\./.test(f.u), id); assert.ok(citate.has(id), 'fonte mai citata: ' + id); }
});

test('Il modulo non modifica motore e dati: nessuna scrittura su ECG o ISO_DATA', () => {
  const fs = require('node:fs');
  for (const f of ['casi-clinici.js', 'casi-paziente.js', 'casi-dati.js', 'casi-reali.js']) {
    const s = fs.readFileSync(path.join(root, f), 'utf8');
    assert.ok(!/ISO_DATA\s*[.[][^=]*=[^=]|\.SCENARIOS\.(push|splice)|ECG\.[A-Za-z]+\s*=[^=]/.test(s), f);
  }
});

/* ---------- ECG reali (PTB-XL) ---------- */
const R = require(path.join(root, 'casi-reali.js'));
const catalogo = JSON.parse(require('node:fs').readFileSync(path.join(root, 'atlante-reale', 'indice.json'), 'utf8'));
const righe = new Map(catalogo.records.map(r => [r[0], r]));

test('Ogni ECG reale esiste nel catalogo PTB-XL, è validato, senza artefatti, con età e sesso uguali all’archivio', () => {
  const visti = new Set();
  assert.ok(R.CASI.length >= 80);
  for (const [id, eta, sesso, classe, scp] of R.CASI) {
    const r = righe.get(id); assert.ok(r, 'record ' + id); assert.ok(!visti.has(id), 'doppio ' + id); visti.add(id);
    assert.equal(r[4], true, id + ' non validato'); assert.equal(r[6], false, id + ' con artefatti');
    assert.equal(r[1], eta, id + ' età'); assert.equal(r[2] === '0' ? 'M' : 'F', sesso, id + ' sesso');
    assert.deepEqual(Object.keys(r[3]).sort(), scp, id + ' codici');
    assert.ok(R.CLASSI[classe], id + ' classe');
    for (const c of scp) assert.ok(R.CODICI[c], id + ' codice senza nome: ' + c);
  }
});

test('La diagnosi proposta coincide con il referto e nessun’altra affermazione diagnostica è presente', () => {
  const principali = { NORM: ['NORM'], AFIB: ['AFIB'], AFLT: ['AFLT'], SVT: ['PSVT', 'SVTAC'], STACH: ['STACH'], SBRAD: ['SBRAD'], '1AVB': ['1AVB'], CRBBB: ['CRBBB'], CLBBB: ['CLBBB'], LAFB: ['LAFB'], WPW: ['WPW'], PVC: ['PVC'], PACE: ['PACE'], LVH: ['LVH'], IMI: ['IMI'], ASMI: ['ASMI'] };
  const ritmi = ['SR', 'STACH', 'SBRAD', 'SARRH'], accessori = ['NORM', 'LPR', 'VCLVH', 'HVOLT', 'QWAVE'];
  for (const [id, , , classe, scp] of R.CASI) {
    const m = principali[classe]; assert.ok(scp.some(c => m.includes(c)), id + ': manca ' + classe);
    for (const c of scp) assert.ok(m.includes(c) || ritmi.includes(c) || accessori.includes(c), id + ': codice inatteso ' + c);
    for (const altra of Object.keys(principali)) if (altra !== classe && altra !== 'NORM' && altra !== 'STACH' && altra !== 'SBRAD') assert.ok(!scp.some(c => principali[altra].includes(c)), id + ': anche ' + altra);
  }
});

test('Ogni classe ha alternative esistenti, una sola risposta corretta e una fonte nota', () => {
  const { FONTI: F1 } = require(path.join(root, 'casi-dati.js'));
  for (const [k, c] of Object.entries(R.CLASSI)) {
    assert.ok(c.nome && c.q && c.perche, k); assert.equal(c.simili.length, 3, k);
    for (const s of c.simili) assert.ok(R.CLASSI[s] && s !== k, k + ' → ' + s);
    assert.equal(c.opz.filter(o => o[1] === 'ok').length, 1, k); assert.ok(c.opz.every(o => o[0] && o[2].length > 20), k);
    assert.ok(c.fonte.length && c.fonte.every(f => F1[f] || R.FONTI[f]), k + ': fonte');
  }
  for (const f of Object.values(R.FONTI)) assert.ok(/^https:\/\/doi\.org\/10\./.test(f.u));
});

test('Il corpo del paziente ha intestazione valida, quattro corporature e pesi normalizzati', () => {
  const b = require('node:fs').readFileSync(path.join(root, 'paziente-corpo.bin'));
  assert.equal(b.toString('latin1', 0, 4), 'ISOP');
  const n = b.readUInt32LE(4), H = JSON.parse(b.toString('utf8', 8, 8 + n)), base = 8 + n;
  assert.deepEqual(Object.keys(H.varianti), ['M', 'Mv', 'F', 'Fv']); assert.match(H.origine, /CC0/);
  assert.equal(H.ossa.length, H.genitori.length); assert.equal(H.genitori[0], -1);
  for (const v of Object.values(H.varianti)) { assert.equal(v.pos[1], H.n * 12); assert.equal(v.giunti[1], H.ossa.length * 12); }
  const pesi = b.subarray(base + H.pesi[0], base + H.pesi[0] + H.pesi[1]), ind = b.subarray(base + H.indici[0], base + H.indici[0] + H.indici[1]);
  assert.equal(pesi.length, H.n * 4);
  for (let i = 0; i < H.n; i++) { const s = pesi[i * 4] + pesi[i * 4 + 1] + pesi[i * 4 + 2] + pesi[i * 4 + 3]; assert.ok(s >= 251 && s <= 259, 'vertice ' + i + ': ' + s); }
  assert.ok(ind.every(x => x < H.ossa.length));
  for (const g of Object.values(H.gruppi)) { const a = new Uint16Array(b.buffer.slice(b.byteOffset + base + g[0], b.byteOffset + base + g[0] + g[1])); assert.ok(a.length % 3 === 0 && a.every(x => x < H.n)); }
});
