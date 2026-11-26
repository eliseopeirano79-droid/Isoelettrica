/* Laboratorio Eco: geometria delle proiezioni, valvole, quadri patologici. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'eco.js'));

function carica() {
  const f = fs.readFileSync(path.join(root, 'prototipo-cuore/heart-z-anatomy.glb')), jl = f.readUInt32LE(12);
  const J = JSON.parse(f.slice(20, 20 + jl)), B = f.slice(20 + jl + 8);
  const acc = i => {
    const a = J.accessors[i], bv = J.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0) + B.byteOffset, n = a.type === 'VEC3' ? 3 : 1;
    const C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType];
    return new C(B.buffer.slice(off, off + a.count * n * C.BYTES_PER_ELEMENT));
  };
  const M = [];
  for (const m of J.meshes) for (const p of m.primitives) { const s = E.salda(acc(p.attributes.POSITION), acc(p.indices)); s.nome = m.name.replace(/_/g, ' '); s.tipo = E.tipoDi(s.nome); M.push(s); }
  const G = E.reperi(M); G.V = E.valvole(M, G); G.Tr = E.torace(G);
  return { M, G };
}
const { M, G } = carica();
const mesh = re => M.find(m => re.test(m.nome));
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const tagli = (P, m) => E.taglia(m, P.o, P.n).length;

test('Reperi del cuore: quattro camere, asse lungo, cavità di dimensioni plausibili', () => {
  assert.ok(G && G.L > 0);
  assert.ok(G.Rm / G.L > 0.15 && G.Rm / G.L < 0.35, 'raggio endocardico / lunghezza: ' + (G.Rm / G.L).toFixed(2));
  assert.ok(Math.abs(dot(G.axb, G.versoVS)) < 1e-6 && Math.abs(dot(G.axb, G.ant)) < 1e-6);
});

test('Anelli valvolari: quattro valvole, raggi entro limiti anatomici', () => {
  const r = Object.fromEntries(G.V.map(v => [v.nome, v.r / G.Tr.cm]));
  assert.deepEqual(Object.keys(r).sort(), ['aortica', 'mitrale', 'polmonare', 'tricuspide']);
  assert.ok(r.aortica > 0.7 && r.aortica < 1.6, 'aortica ' + r.aortica);     // diametro 1,4–3,2 cm
  assert.ok(r.mitrale > 1.2 && r.mitrale < 2.1, 'mitrale ' + r.mitrale);
  assert.ok(r.tricuspide > 1.3 && r.tricuspide < 2.3, 'tricuspide ' + r.tricuspide);
});

test('Ogni proiezione taglia il proprio bersaglio, con profondità da ecocardiogramma reale', () => {
  const LV = mesh(/^Left ventricle/);
  for (const v of E.VISTE) {
    const P = E.orienta(E.piano(G, v.id), 0, 0), cm = P.prof / G.Tr.cm;
    const bersaglio = v.bersaglio ? mesh(new RegExp('^'+v.bersaglio)) : LV;
    assert.ok(bersaglio && tagli(P, bersaglio)>=1, v.id+': bersaglio anatomico assente');
    assert.ok(cm >= 12 && cm <= 22, v.id + ': profondità ' + cm.toFixed(1) + ' cm');
    assert.ok(v.nome && v.sonda && v.vedi && v.valuta.length >= 2, v.id);
  }
});

test('Due camere senza camere destre; tre camere attraverso l’anello aortico; quattro camere con tutte e quattro', () => {
  const P2 = E.orienta(E.piano(G, 'a2c'), 0, 0), P3 = E.orienta(E.piano(G, 'a3c'), 0, 0), P4 = E.orienta(E.piano(G, 'a4c'), 0, 0);
  assert.equal(tagli(P2, mesh(/^Right atrium/)), 0, 'la due camere taglia l’atrio destro');
  for (const re of [/^Right atrium/, /^Right ventricle/, /^Left atrium/, /^Left ventricle/]) assert.ok(tagli(P4, mesh(re)) >= 1, 'quattro camere: ' + re);
  const ao = G.V.find(v => v.nome === 'aortica');
  assert.ok(Math.abs(dot(ao.c.map((x, i) => x - P3.o[i]), P3.n)) < 0.05 * G.L, 'la tre camere non passa per l’aorta');
});

test('La sonda è sulla cute: l’origine del fascio sta sul bordo del torace', () => {
  for (const id of ['plax', 'psax-pm', 'a4c']) {
    const P = E.piano(G, id), Tr = G.Tr, e = ((P.o[0] - Tr.x0) / Tr.a) ** 2 + ((P.o[2] - Tr.zc) / Tr.b) ** 2;
    assert.ok(Math.abs(e - 1) < 0.02, id + ': ' + e.toFixed(3));
  }
});

test('Ciclo: atrioventricolari chiuse in sistole e aperte nell’onda E; semilunari aperte in eiezione', () => {
  for (const f of [0.1, 0.2, 0.3]) { assert.equal(E.apertura('av', f), 0, 'av ' + f); assert.ok(E.apertura('sl', f) > 0.9, 'sl ' + f); }
  assert.ok(E.apertura('av', 0.5) > 0.9); assert.ok(E.apertura('sl', 0.5) < 0.01);
  assert.ok(E.apertura('av', 0.9) > 0.3, 'onda A');
  assert.equal(E.contrazione(0), 0); assert.ok(E.contrazione(0.34) > 0.99);
});

test('Senza contrazione né quadri la deformazione è l’identità', () => {
  G.q = {}; const o = [0, 0, 0], LV = mesh(/^Left ventricle/);
  for (let i = 0; i < LV.pos.length; i += 300) { E.deforma(G, [LV.pos[i], LV.pos[i + 1], LV.pos[i + 2]], 0, o); assert.ok(Math.abs(o[0] - LV.pos[i]) + Math.abs(o[1] - LV.pos[i + 1]) + Math.abs(o[2] - LV.pos[i + 2]) < 1e-5); }
});

test('Frazione d’eiezione simulata e classi ASE/EACVI 2015', () => {
  const fe = q => E.frazione(q.p.contr, q.p.acin) * 100, Q = Object.fromEntries(E.QUADRI.map(q => [q.id, q]));
  assert.ok(fe(Q.normale) >= 52 && fe(Q.normale) <= 72);
  assert.ok(fe(Q.dilatata) < 30); assert.equal(E.classeFE(fe(Q.dilatata) / 100), 'gravemente ridotta');
  assert.ok(fe(Q.acinesia) < fe(Q.normale));
  assert.equal(E.classeFE(0.45), 'lievemente ridotta'); assert.equal(E.classeFE(0.35), 'moderatamente ridotta'); assert.equal(E.classeFE(0.6), 'normale');
});

test('Quadri: casi collegati esistenti, versamento entro la classe dichiarata', () => {
  global.window = global; global.ECG = require(path.join(root, 'engine.js'));
  const { CASI } = require(path.join(root, 'casi-dati-2.js')), ids = new Set(CASI.map(c => c.id));
  for (const q of E.QUADRI) { assert.ok(q.nome && q.testo.length > 60, q.id); if (q.caso) assert.ok(ids.has(q.caso), q.id + ': caso ' + q.caso); }
  const v = E.QUADRI.find(q => q.id === 'versamento');
  assert.ok(v.p.vers >= 10 && v.p.vers <= 20 && /moderato/.test(v.testo), 'il testo dice moderato: 10–20 mm');
});

test('Il modulo Eco non scrive su motore, dati o altre viste', () => {
  const src = fs.readFileSync(path.join(root, 'eco.js'), 'utf8');
  assert.ok(!/ISO_DATA\s*[.[]\s*\w+\s*=|ECG\s*\.\s*\w+\s*=|ISO_APP\s*\.\s*\w+\s*=/.test(src));
  assert.ok(/non è un’ecografia reale/.test(src), 'avviso di simulazione presente');
});

test('Torace Z-Anatomy: stesso sistema di riferimento del cuore (sterno davanti, vertebre dietro, cuore a sinistra)', () => {
  const f = fs.readFileSync(path.join(root, 'prototipo-cuore/torace-z-anatomy.glb')), jl = f.readUInt32LE(12);
  const J = JSON.parse(f.slice(20, 20 + jl)), B = f.slice(20 + jl + 8);
  const nodo = re => J.nodes.filter(n => re.test(n.name)), bb = ns => {
    const mn = [1e9, 1e9, 1e9], mx = [-1e9, -1e9, -1e9];
    for (const n of ns) { const a = J.accessors[J.meshes[n.mesh].primitives[0].attributes.POSITION]; for (let j = 0; j < 3; j++) { mn[j] = Math.min(mn[j], a.min[j]); mx[j] = Math.max(mx[j], a.max[j]); } }
    return { mn, mx };
  };
  assert.equal(nodo(/rib\.(l|r)$/i).filter(n => !/cartilage/i.test(n.name)).length, 24, 'dodici coste per lato');
  assert.equal(nodo(/^Vertebra T\d+$/).length, 12);
  for (const n of J.nodes) assert.ok(n.extras && n.extras.layer, n.name + ': strato mancante');
  const st = bb(nodo(/sternum|Xiphoid/)), t6 = bb(nodo(/^Vertebra T6$/)), hc = G.Tr.hc, cm = G.Tr.cm;
  assert.ok(st.mn[2] > hc[2], 'sterno davanti al centro del cuore');
  assert.ok(t6.mx[2] < hc[2] - 4 * cm, 'vertebra T6 dietro il cuore');
  const mediana = (st.mn[0] + st.mx[0]) / 2;
  assert.ok(hc[0] - mediana > 0.5 * cm && hc[0] - mediana < 4 * cm, 'cuore a sinistra della linea mediana: ' + ((hc[0] - mediana) / cm).toFixed(1) + ' cm');
  assert.ok(Math.abs(G.Tr.x0 - mediana) < 0.5 * cm, 'linea mediana del torace = sterno');
  assert.ok(f.length < 1.6e6, 'peso contenuto per iPad: ' + f.length);
});

test('Finestra parasternale: sonda a sinistra dello sterno, all’altezza del cuore, per tutte le viste parasternali', () => {
  for (const id of ['plax', 'psax-ao', 'psax-mv', 'psax-pm', 'psax-ap']) {
    const P = E.piano(G, id), Tr = G.Tr, dx = (P.o[0] - Tr.x0) / Tr.cm, dy = (P.o[1] - Tr.hc[1]) / Tr.cm;
    const max = id === 'psax-ap' ? 10 : 7;          // per l'asse corto all'apice la sonda scende e si sposta verso l'itto
    assert.ok(dx > 1 && dx < max, id + ': distanza dalla linea mediana ' + dx.toFixed(1) + ' cm');
    assert.ok(dy > -5 && dy < 6, id + ': altezza rispetto al cuore ' + dy.toFixed(1) + ' cm');
  }
  const A = E.piano(G, 'a4c'), S = E.piano(G, 'sub');
  assert.ok(A.o[1] < G.Tr.hc[1] && A.o[0] > G.Tr.x0 + 4 * G.Tr.cm, 'apicale: in basso e a sinistra');
  assert.ok(S.o[1] < G.Tr.xifoide, 'sottocostale: sotto lo xifoide');
});

test('ogni proiezione ha un esame reale di confronto (solo collegamento Radiopaedia)', () => {
  const E = require('../eco.js');
  for (const v of E.VISTE.filter(v=>!v.bersaglio)) assert.match(E.REALE[v.id] || '', /^https:\/\/radiopaedia\.org\//, v.id);
});

test('Valvulopatie: le misure Doppler simulate cadono negli intervalli del grado (EACVI/ASE 2017, EAE/ASE 2009)', () => {
  const E = require('../eco.js');
  for (const L of E.VALVULOPATIE) {
    for (const [k, g] of Object.entries(L.gradi)) {
      assert.equal(g.val.length, L.criteri.length, L.id + ' ' + k + ': un valore per criterio');
      const les = { valv: L.valv, tipo: L.tipo, g }, m = E.misureCW(L.valv, les, L.tipo === 'stenosi' ? 1 : -1);
      assert.ok(m.vmax > 0, L.id + ' ' + k + ': flusso presente');
      if (g.lim && g.lim.vmax) assert.ok(m.vmax >= g.lim.vmax[0] && m.vmax <= g.lim.vmax[1], L.id + ' ' + k + ' Vmax ' + m.vmax.toFixed(2));
      if (g.lim && g.lim.mg) assert.ok(m.medio >= g.lim.mg[0] && m.medio <= g.lim.mg[1], L.id + ' ' + k + ' gradiente medio ' + m.medio.toFixed(1));
    }
  }
  /* senza valvulopatia: niente rigurgiti, eiezione aortica e riempimento mitralico normali */
  for (const v of ['aortica', 'mitrale', 'tricuspide']) assert.equal(E.misureCW(v, null, -1).vmax, 0, v);
  assert.ok(E.misureCW('aortica', null, 1).vmax < 1.5 && E.misureCW('mitrale', null, 1).vmax < 1.2);
});
