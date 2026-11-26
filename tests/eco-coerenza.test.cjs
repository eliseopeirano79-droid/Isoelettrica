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
  return J.nodes.filter(n => n.mesh !== undefined).map(n => { const p = J.meshes[n.mesh].primitives[0], s = E.salda(acc(p.attributes.POSITION), acc(p.indices)); s.nome = n.extras?.sourceName || n.name.replace(/_/g, ' '); s.layer = n.extras && n.extras.layer; s.tipo = E.tipoDi(s.nome); return s; });
}
const M = glb('prototipo-cuore/heart-eco.glb'), TOR = glb('prototipo-cuore/torace-eco.glb');
const G = E.reperi(M); E.correggiSetto(M, G); G.V = E.valvole(M, G); G.Tr = E.torace(G);
G.ossa = TOR.filter(m => m.layer === 'osso' || m.layer === 'cartilagine');   // come nel browser: la sonda cerca lo spazio intercostale
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
    // Endocardio settale, endocardio posteriore, epicardio posteriore. La superficie settale
    // destra si legge dal VD: un quarto incrocio non va inventato chiudendo una mesh aperta.
    assert.ok(xs.length >= 3, 'z ' + z + ': presenti le tre interfacce reali necessarie alle misure');
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
        let b0 = Math.floor((Math.atan2(a[0], a[1]) + mz) / (2 * mz) * NB), b1 = Math.floor((Math.atan2(b[0], b[1]) + mz) / (2 * mz) * NB); let ra=Math.hypot(...a),rb=Math.hypot(...b); if (b0 > b1) { [b0,b1]=[b1,b0]; [ra,rb]=[rb,ra]; }
        for (let k = Math.max(0, b0); k <= Math.min(NB - 1, b1); k++) { const rr = ra + (rb - ra) * (b1 > b0 ? (k - b0) / (b1 - b0) : 0); if (rr < r[k]) r[k] = rr; } } }
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
  function segmenti(piano, m) {
    const linee = [];
    for (const c of E.taglia(m, piano.o, piano.n)) {
      const q = [];
      for (let i = 0; i < c.p.length; i += 3) q.push(scr(piano, [c.p[i],c.p[i+1],c.p[i+2]]));
      for (let i = 1; i < q.length; i++) linee.push([q[i-1], q[i]]);
      if (c.chiusa && q.length > 1) linee.push([q.at(-1), q[0]]);
    }
    return linee;
  }
  function distanza(p, [a,b]) {
    const x=b[0]-a[0], y=b[1]-a[1];
    const t=Math.max(0,Math.min(1,((p[0]-a[0])*x+(p[1]-a[1])*y)/(x*x+y*y || 1)));
    return Math.hypot(p[0]-a[0]-t*x,p[1]-a[1]-t*y);
  }
  let peggiore = 0;
  for (const v of E.VISTE) {
    const P0 = E.piano(G, v.id);
    for (const [nome, f] of [['rotazione', g => E.orienta(P0, g * Math.PI / 180, 0)], ['inclinazione', g => E.orienta(P0, 0, g * Math.PI / 180)]]) {
      let prima = null;
      for (let g = -10; g <= 10; g++) {
        const q = segmenti(f(g),v.bersaglio ? mesh(new RegExp('^'+v.bersaglio)) : VS); if (!q.length) { prima = null; continue; }
        if (prima) {
          const d = q.filter((_, i) => i % 3 === 0).map(([a]) => Math.min(...prima.map(b => distanza(a,b)))).sort((x, y) => x - y), med = d[Math.floor(d.length / 2)];
          peggiore = Math.max(peggiore, med);
          assert.ok(med < 0.35, v.id + ' ' + nome + ' ' + g + '°: il contorno si sposta di ' + med.toFixed(2) + ' cm');
        }
        prima = q;
      }
    }
  }
  assert.ok(peggiore > 0, 'la sezione cambia davvero con la sonda');
});

test('Assi corti perpendicolari al ventricolo: la sonda scivola fra le coste finché la sezione è rotonda', () => {
  const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]], ao = G.V.find(v => v.nome === 'aortica');
  for (const [id, max] of [['psax-ao', 20], ['psax-mv', 40], ['psax-pm', 15], ['psax-ap', 15]]) {
    const Pv = P(id), n = cr(Pv.d, Pv.u), ax = id === 'psax-ao' ? ao.n : A.asse;
    const g = Math.acos(Math.abs(dot(n, ax)) / Math.hypot(...n) / Math.hypot(...ax)) * 180 / Math.PI;
    assert.ok(g <= max, id + ': piano inclinato di ' + g.toFixed(0) + '° sull’asse');
  }
});

test('Sonda libera: rotazioni, scivolamento sulla cute e guida verso la proiezione', () => {
  const T = E.piano(G, 'plax'), close = (a, b, e) => Math.abs(a - b) < e;
  /* orienta3 coincide con orienta per rotazione e ventaglio, e mantiene la terna ortonormale */
  const a = E.orienta(T, 0.4, 0.2), b = E.orienta3(T, 0.4, 0.2, 0);
  for (let i = 0; i < 3; i++) { assert.ok(close(a.d[i], b.d[i], 1e-9)); assert.ok(close(a.u[i], b.u[i], 1e-9)); }
  const c = E.orienta3(T, 0.3, -0.2, 0.25); assert.ok(close(dot(c.d, c.u), 0, 1e-9) && close(dot(c.d, c.d), 1, 1e-9));
  /* scivolare di 3 cm verso i piedi: la sonda resta sulla cute e con lo stesso angolo rispetto alla superficie */
  const ro = [T.o[0], T.o[1] - 3 * cm, T.o[2] + 30 * cm], p = E.suPelle(G.Tr, ro, [0, 0, -1]); assert.ok(p, 'raggio sulla cute');
  const S2 = E.scivola(G.Tr, T, p), ang = P0 => dot(P0.d, E.normalePelle(G.Tr, P0.o));
  assert.ok(close(ang(S2), ang(T), 1e-6), 'stesso angolo con la cute');
  /* guida: allineata sul bersaglio; dopo lo scivolamento verso i piedi chiede di risalire verso la testa */
  assert.equal(E.guida(T, T, G.Tr).ok, true);
  const g = E.guida(S2, T, G.Tr); assert.equal(g.ok, false); assert.match(g.titolo, /verso la testa/);
  const r = E.guida(E.orienta3(T, 0.6, 0, 0), T, G.Tr); assert.match(r.titolo, /Ruota la sonda in senso antiorario/);
  const f = E.guida(E.orienta3(T, 0, 0.3, 0), T, G.Tr); assert.match(f.titolo, /Inclina il fascio/);
});

test('Fasi intermedie: facce candidate e taglio integrale coincidono sul cuore mobile', () => {
  const S=require('../ecocardio/sezioni.js');
  const parete=mesh(/^Left ventricle/), q0=G.q;
  try {
    for (const quadro of E.QUADRI) {
      G.q=quadro.p;
      const field=S.movimento(parete,G,E.deforma);
      for (const {id} of E.VISTE) {
        const base=E.piano(G,id);
        for (const ang of [[0,0,0],[87,-33,21],[-142,31,-41]]) {
          const P=E.orienta3(base,...ang.map(a=>a*Math.PI/180));
          const faces=field.candidati(P);
          for(const fase of [0,.12,.25,.34,.415,.47,.905,.985]) {
            const c=E.contrazione(fase)*quadro.p.contr, m=field.aggiorna(c);
            for(let j=0;j<m.pos.length;j+=507) {
              const p=E.deforma(G,parete.pos.subarray(j,j+3),c,[]);
              assert.ok(Math.hypot(...p.map((x,k)=>x-m.pos[j+k]))<2e-6);
            }
            const cut=E.taglia({...m,tri:faces},P.o,P.n,true);
            assert.deepEqual(cut,E.taglia(m,P.o,P.n,true),id+' '+quadro.id+' '+fase);
            for(const ch of cut)for(let j=0;j<ch.p.length;j+=3) {
              const w=[0,1,2].map(k=>ch.p[j+k]-P.o[k]);
              assert.ok(Math.abs(dot(w,P.n))<1e-6);
            }
          }
        }
      }
    }
  } finally {G.q=q0;}
});

test('Lembi ricostruiti: cerniere fisse rispetto all’anello e coaptazione anche nelle fasi isovolumetriche',()=>{
  const S=require('../ecocardio/sezioni.js'),identity=(_G,p,_c,q)=>{for(let i=0;i<3;i++)q[i]=p[i];return q;};
  for(const v of G.V) {
    const leaves=S.lembi(v);
    assert.equal(leaves.length,v.nome==='mitrale'?2:3);
    for(const leaf of leaves){
      const cols=16, rows=5, mid=3*(rows*(cols+1)+cols/2);
      S.animaLembo(leaf,G,0,0,identity);
      if(v.tipo==='sl') {
        const quota=i=>dot(Array.from(leaf.pos.subarray(3*i,3*i+3)).map((x,k)=>x-v.c[k]),v.n);
        assert.ok(quota(0)>quota(8)+.3*v.r && quota(16)>quota(8)+.3*v.r);
      }
      const closed=leaf.pos.slice(mid,mid+3);
      S.animaLembo(leaf,G,0,1,identity);
      assert.ok(Math.hypot(...closed.map((x,k)=>x-leaf.pos[mid+k]))>v.r*.55);
      for(let i=0;i<3*(cols+1);i++)assert.equal(leaf.pos[i],leaf.chiuso[i]);
      assert.ok(leaf.pos.every(Number.isFinite));
    }
    const center=3*(5*17+8);
    for(const leaf of leaves) for(let k=0;k<3;k++)
      assert.ok(Math.abs(leaf.chiuso[center+k]-leaves[0].chiuso[center+k])<1e-5);
  }
  for(const f of [.025,.39])for(const type of ['sl','av'])assert.equal(E.apertura(type,f),0);
});

test('Il riempimento distingue i margini annidati da un lume isolato e da un orifizio aperto',()=>{
  const S=require('../ecocardio/sezioni.js'), P={o:[0,0,0],u:[1,0,0],d:[0,1,0],prof:10};
  const anello=r=>({chiusa:true,p:Float32Array.from([-r,-r,0,r,-r,0,r,r,0,-r,r,0])});
  const outer=anello(4),inner=anello(3),open={...anello(2),chiusa:false};
  assert.deepEqual(S.paretiAnnidate([outer,open],P),[]);
  assert.deepEqual(S.paretiAnnidate([outer,inner,open],P),[outer,inner]);
  assert.equal(S.visibile(0,4,P,Math.PI/4,[2,2]),false);
  assert.equal(S.visibile(0,4,P,Math.PI/4,null),true);
  assert.equal(S.visibile(6,3,P,Math.PI/4,null),false);
});
