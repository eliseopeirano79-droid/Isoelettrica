/* Coerenza ecocardiografica: quello che la sonda «vede» deve corrispondere all'anatomia e alle convenzioni ASE.
   Misure confrontate con ASE/EACVI 2015 (Lang RM et al. J Am Soc Echocardiogr 2015;28:1–39),
   proiezioni con ASE 2019 (Mitchell C et al. J Am Soc Echocardiogr 2019;32:1–64). */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const E = require(path.join(root, 'eco.js'));

function glb(f) {
  const b = fs.readFileSync(path.join(root, f)), jl = b.readUInt32LE(12), J = JSON.parse(b.slice(20, 20 + jl)), B = b.slice(20 + jl + 8);
  const acc = i => { const a = J.accessors[i], bv = J.bufferViews[a.bufferView], off = (bv.byteOffset || 0) + (a.byteOffset || 0) + B.byteOffset, n = a.type === 'VEC3' ? 3 : 1;
    const C = { 5126: Float32Array, 5125: Uint32Array, 5123: Uint16Array }[a.componentType]; return new C(B.buffer.slice(off, off + a.count * n * C.BYTES_PER_ELEMENT)); };
  return J.nodes.filter(n => n.mesh !== undefined).map(n => { const p = J.meshes[n.mesh].primitives[0], s = E.salda(acc(p.attributes.POSITION), acc(p.indices)); s.nome = n.name.replace(/_/g, ' '); s.layer = n.extras && n.extras.layer; s.tipo = E.tipoDi(s.nome); return s; });
}
const M = glb('prototipo-cuore/heart-z-anatomy.glb'), TOR = glb('prototipo-cuore/torace-z-anatomy.glb');
const G = E.reperi(M); E.correggiSetto(M, G); G.V = E.valvole(M, G); G.Tr = E.torace(G);
const cm = G.Tr.cm, A = E.assi(G);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const scr = (P, p) => { const w = [p[0] - P.o[0], p[1] - P.o[1], p[2] - P.o[2]]; return [dot(w, P.u) / cm, dot(w, P.d) / cm]; };
const mesh = re => M.find(m => re.test(m.nome));
const P = id => E.orienta(E.piano(G, id), 0, 0);
function centro(Pv, m) { let x = 0, y = 0, n = 0; for (const c of E.taglia(m, Pv.o, Pv.n)) for (let i = 0; i < c.p.length; i += 3) { const s = scr(Pv, [c.p[i], c.p[i + 1], c.p[i + 2]]); x += s[0]; y += s[1]; n++; } return n > 20 ? [x / n, y / n] : null; }
function incroci(Pv, m, a, b) {
  const out = [], L = Math.hypot(b[0] - a[0], b[1] - a[1]);
  for (const c of E.taglia(m, Pv.o, Pv.n)) {
    const q = []; for (let i = 0; i < c.p.length; i += 3) q.push(scr(Pv, [c.p[i], c.p[i + 1], c.p[i + 2]])); if (c.chiusa) q.push(q[0]);
    for (let i = 0; i + 1 < q.length; i++) { const d1 = [b[0] - a[0], b[1] - a[1]], d2 = [q[i + 1][0] - q[i][0], q[i + 1][1] - q[i][1]], den = d1[0] * d2[1] - d1[1] * d2[0]; if (Math.abs(den) < 1e-12) continue;
      const t = ((q[i][0] - a[0]) * d2[1] - (q[i][1] - a[1]) * d2[0]) / den, u = ((q[i][0] - a[0]) * d1[1] - (q[i][1] - a[1]) * d1[0]) / den; if (t >= 0 && t <= 1 && u >= 0 && u <= 1) out.push(t * L); }
  }
  return out.sort((x, y) => x - y);
}
const VS = mesh(/^Left ventricle/), VD = mesh(/^Right ventricle/), AS = mesh(/^Left atrium/), AD = mesh(/^Right atrium/), AO = mesh(/^Ascending aorta/);

test('Scala: ventricolo sinistro di 8 cm fra apice endocardico e mitrale', () => { assert.ok(Math.abs(A.Lc / cm - 8) < 1e-9); });

test('Anelli valvolari nei limiti dell’adulto normale (misure indipendenti dalla scala scelta)', () => {
  const d = n => 2 * G.V.find(v => v.nome === n).r / cm;
  assert.ok(d('aortica') > 1.9 && d('aortica') < 2.7, 'anello aortico ' + d('aortica').toFixed(2) + ' cm');
  assert.ok(d('mitrale') > 2.7 && d('mitrale') < 3.9, 'anello mitralico ' + d('mitrale').toFixed(2) + ' cm');
  assert.ok(d('tricuspide') > 2.8 && d('tricuspide') < 4.2, 'anello tricuspidale ' + d('tricuspide').toFixed(2) + ' cm');
});

test('Parasternale asse lungo: misure telediastoliche lungo la linea standard (ASE/EACVI 2015)', () => {
  const Pv = P('plax');
  for (const z of [0.6, 0.75]) {
    const c3 = A.apE.map((x, i) => x + A.asse[i] * z * A.Lc), c = scr(Pv, c3), ax = [dot(A.asse, Pv.u), dot(A.asse, Pv.d)], l = Math.hypot(...ax);
    let pe = [-ax[1] / l, ax[0] / l]; if (pe[1] < 0) pe = [-pe[0], -pe[1]];
    const a = [c[0] - pe[0] * 8, c[1] - pe[1] * 8], b = [c[0] + pe[0] * 8, c[1] + pe[1] * 8];
    const xs = incroci(Pv, VS, a, b), xr = incroci(Pv, VD, a, b);
    assert.ok(xs.length >= 4, 'z ' + z + ': ventricolo sinistro attraversato da parte a parte');
    const endoSetto = xs[xs.length - 3], endoPost = xs[xs.length - 2], epiPost = xs[xs.length - 1], setttoVD = xr.filter(x => x < endoSetto).pop();
    const lvid = endoPost - endoSetto, pw = epiPost - endoPost, ivs = endoSetto - setttoVD;
    assert.ok(lvid >= 4.2 && lvid <= 5.8, 'z ' + z + ': diametro telediastolico ' + lvid.toFixed(2) + ' cm (normale 4,2–5,8)');
    assert.ok(pw >= 0.6 && pw <= 1.2, 'z ' + z + ': parete posteriore ' + pw.toFixed(2) + ' cm');
    assert.ok(ivs >= 0.4 && ivs <= 1.3, 'z ' + z + ': setto ' + ivs.toFixed(2) + ' cm (senza la correzione dichiarata del modello sarebbe ~1,8)');
    assert.ok(ivs / pw < 1.3, 'z ' + z + ': setto/parete posteriore ' + (ivs / pw).toFixed(2) + ' (≥ 1,3 suggerirebbe ipertrofia settale asimmetrica)');
  }
});

test('Disposizione sullo schermo secondo le convenzioni ASE, vista per vista', () => {
  const pl = P('plax'), vd = centro(pl, VD), vs = centro(pl, VS), ao = centro(pl, AO), as = centro(pl, AS);
  assert.ok(vd[1] < vs[1], 'PLAX: ventricolo destro più vicino alla sonda del sinistro');
  assert.ok(ao[0] > vs[0] && as[0] > vs[0], 'PLAX: aorta e atrio sinistro a destra dello schermo');
  assert.ok(as[1] > ao[1], 'PLAX: atrio sinistro più profondo dell’aorta');
  const pm = P('psax-pm'); assert.ok(centro(pm, VD)[1] < centro(pm, VS)[1] && centro(pm, VD)[0] < centro(pm, VS)[0], 'PSAX papillari: VD in alto a sinistra');
  assert.equal(centro(pm, AS), null, 'PSAX papillari: niente atri'); assert.equal(centro(pm, AD), null);
  const pa = P('psax-ao'), a0 = scr(pa, A.ao);
  assert.ok(Math.abs(a0[0]) < 2, 'PSAX base: aorta al centro');
  assert.ok(centro(pa, AS)[1] > a0[1], 'PSAX base: atrio sinistro dietro l’aorta'); assert.ok(centro(pa, AD)[0] < a0[0], 'PSAX base: atrio destro a sinistra');
  const a4 = P('a4c'), c4 = m => centro(a4, m);
  assert.ok(c4(VS)[0] > c4(VD)[0] && c4(AS)[0] > c4(AD)[0], 'A4C: camere sinistre a destra dello schermo');
  assert.ok(c4(AS)[1] > c4(VS)[1] && c4(AD)[1] > c4(VD)[1], 'A4C: atri più profondi dei ventricoli');
  assert.equal(centro(a4, AO), null, 'A4C: niente aorta (sarebbe una cinque camere)');
  const a2 = P('a2c'); assert.equal(centro(a2, VD), null, 'A2C: niente ventricolo destro'); assert.equal(centro(a2, AD), null, 'A2C: niente atrio destro');
  const a3 = P('a3c'); assert.ok(centro(a3, AO) && centro(a3, AS), 'A3C: aorta e atrio sinistro');
  const sb = P('sub'); assert.ok(centro(sb, VD)[1] < centro(sb, VS)[1], 'sottocostale: ventricolo destro vicino alla sonda');
  const fegato = TOR.filter(m => m.layer === 'fegato'); let fy = Infinity; for (const m of fegato) { const c = centro(sb, m); if (c) fy = Math.min(fy, c[1]); }
  assert.ok(fy < centro(sb, VD)[1], 'sottocostale: il fegato fa da finestra davanti al cuore');
});

test('Nessuna sonda appoggiata su un osso; il centro del settore arriva al cuore senza ombre costali', () => {
  const ossa = TOR.filter(m => m.layer === 'osso' || m.layer === 'cartilagine'), cuore = M.filter(m => /ventricle|atrium/i.test(m.nome) && !/vein|artery/i.test(m.nome));
  const primo = (Pv, ms, grezzo) => { const NB = 90, r = new Float32Array(NB).fill(1e9), mz = Math.PI / 4;
    for (const m of ms) for (const ch of E.taglia(m, Pv.o, Pv.n, grezzo)) { const p = ch.p, n = p.length / 3;
      for (let s = 0; s < n - 1 + (ch.chiusa ? 1 : 0); s++) { const q = (s + 1) % n, a = scr(Pv, [p[s * 3], p[s * 3 + 1], p[s * 3 + 2]]), b = scr(Pv, [p[q * 3], p[q * 3 + 1], p[q * 3 + 2]]);
        if (a[1] <= 0 || b[1] <= 0 || Math.hypot(a[0] - b[0], a[1] - b[1]) > 1) continue;
        let b0 = Math.floor((Math.atan2(a[0], a[1]) + mz) / (2 * mz) * NB), b1 = Math.floor((Math.atan2(b[0], b[1]) + mz) / (2 * mz) * NB); if (b0 > b1) [b0, b1] = [b1, b0];
        for (let k = Math.max(0, b0); k <= Math.min(NB - 1, b1); k++) { const rr = Math.hypot(...a) + (Math.hypot(...b) - Math.hypot(...a)) * (b1 > b0 ? (k - b0) / (b1 - b0) : 0); if (rr < r[k]) r[k] = rr; } } }
    return r; };
  for (const v of E.VISTE) {
    const Pv = P(v.id), ro = primo(Pv, ossa, true), rc = primo(Pv, cuore, false);
    for (let k = 40; k <= 50; k++) {                                  // raggi centrali (±5°)
      assert.ok(ro[k] > 2, v.id + ': osso a ' + ro[k].toFixed(1) + ' cm sotto la sonda');
      if (rc[k] < 1e8) assert.ok(ro[k] > rc[k], v.id + ': ombra costale sul cuore al centro del settore');
    }
  }
});

test('Sonda coerente: ruotando o inclinando di 1° alla volta l’immagine cambia con continuità, senza salti', () => {
  /* per ogni punto della sezione al nuovo angolo, distanza dal contorno all'angolo precedente: la mediana misura
     quanto si muove ciò che era già visibile (le parti che compaiono, come l'aorta che entra nel piano, non contano) */
  const punti = Pv => { const q = []; for (const c of E.taglia(VS, Pv.o, Pv.n)) for (let i = 0; i < c.p.length; i += 9) q.push(scr(Pv, [c.p[i], c.p[i + 1], c.p[i + 2]])); return q; };
  let peggiore = 0;
  for (const v of E.VISTE) {
    const P0 = E.piano(G, v.id);
    for (const [nome, f] of [['rotazione', g => E.orienta(P0, g * Math.PI / 180, 0)], ['inclinazione', g => E.orienta(P0, 0, g * Math.PI / 180)]]) {
      let prima = null;
      for (let g = -10; g <= 10; g++) {
        const q = punti(f(g)); if (!q.length) { prima = null; continue; }
        if (prima) {
          const d = q.map(a => Math.min(...prima.map(b => Math.hypot(a[0] - b[0], a[1] - b[1])))).sort((x, y) => x - y), med = d[Math.floor(d.length / 2)];
          peggiore = Math.max(peggiore, med);
          assert.ok(med < 0.35, v.id + ' ' + nome + ' ' + g + '°: il contorno si sposta di ' + med.toFixed(2) + ' cm');
        }
        prima = q;
      }
    }
  }
  assert.ok(peggiore > 0, 'la sezione cambia davvero con la sonda');
});
