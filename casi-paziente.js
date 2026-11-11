/* Isoelettrica — Casi clinici: paziente 3D.
   Corpo umano dalla mesh base di MakeHuman (CC0) con scheletro e pesi originali,
   in quattro corporature. Non è un modello anatomico interno né un paziente reale.
   Mostra soltanto ciò che il caso dichiara: postura, colorito, sudorazione,
   coscienza, respiro, presìdi e manovre. Il battito segue il tracciato ECG. */
(function (root) {
'use strict';
const T = root.THREE;
const PELLE = { norm: 0xd39a76, pallido: 0xd6bfae, cianosi: 0x9a98b6 };
const lerp = (a, b, k) => a + (b - a) * k;

function crea(el) {
  if (!T) return null;
  let renderer;
  try { renderer = new T.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { return null; }
  renderer.setPixelRatio(Math.min(root.devicePixelRatio || 1, 2));
  if ('outputEncoding' in renderer && T.sRGBEncoding) renderer.outputEncoding = T.sRGBEncoding;
  renderer.setClearColor(0x000000, 0);
  el.appendChild(renderer.domElement);
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%;touch-action:none';
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new T.Scene();
  const cam = new T.PerspectiveCamera(34, 1, 0.1, 50);
  const orbit = { th: 0.62, ph: 1.0, r: 2.3, tx: 0, ty: 0.95, tz: -0.4 };
  function piazzaCam() {
    const s = Math.sin(orbit.ph);
    cam.position.set(orbit.tx + orbit.r * s * Math.sin(orbit.th), orbit.ty + orbit.r * Math.cos(orbit.ph), orbit.tz + orbit.r * s * Math.cos(orbit.th));
    cam.lookAt(orbit.tx, orbit.ty, orbit.tz);
  }
  scene.add(new T.HemisphereLight(0xdfe9ff, 0x2a3340, 0.3));
  const key = new T.DirectionalLight(0xfff1e2, 0.72); key.position.set(2.2, 4, 2.4); scene.add(key);
  const rim = new T.DirectionalLight(0x6fd6ff, 0.3); rim.position.set(-3, 2, -2.5); scene.add(rim);
  const lampo = new T.PointLight(0xbfe6ff, 0, 6); lampo.position.set(0, 1.6, -0.3); scene.add(lampo);

  const mat = (c, o) => new T.MeshStandardMaterial(Object.assign({ color: c, roughness: 0.7, metalness: 0.02 }, o || {}));
  const M = {
    pelle: mat(PELLE.norm, { roughness: 0.58 }), camice: mat(0x5f93ad, { roughness: 0.92 }), lenzuolo: mat(0xc3ccd4), coperta: mat(0x245a69, { roughness: 0.95 }),
    letto: mat(0x2a3442, { metalness: 0.3, roughness: 0.5 }), capelli: mat(0x3a2c24, { roughness: 0.9, side: T.DoubleSide }), capelliCorti: mat(0x3a2c24, { roughness: 0.9, side: T.DoubleSide }), occhi: mat(0x2a1d16, { roughness: 0.25 }),
    acciaio: mat(0xaab4c0, { metalness: 0.7, roughness: 0.3 }), guanto: mat(0x4f8fd6, { roughness: 0.5 }),
    piastra: mat(0xf2c14e), elettrodo: mat(0xf4f6f8), sudore: mat(0xe8f6ff, { roughness: 0.05, metalness: 0.1, transparent: true, opacity: 0.85 }),
    vetro: mat(0xbfe9ff, { transparent: true, opacity: 0.34, roughness: 0.1 }), sacca: mat(0xd9f1ff, { transparent: true, opacity: 0.6, roughness: 0.15 }),
    tubo: mat(0xcfe8f5, { transparent: true, opacity: 0.75 }), bolo: new T.MeshBasicMaterial({ color: 0x7cf5c0 }), schermo: new T.MeshBasicMaterial({ color: 0xffffff })
  };
  const sfera = (r, m, w, h) => new T.Mesh(new T.SphereGeometry(r, w || 28, h || 20), m);
  const scatola = (x, y, z, m) => new T.Mesh(new T.BoxGeometry(x, y, z), m);
  const cil = (r, h, m, n) => new T.Mesh(new T.CylinderGeometry(r, r, h, n || 16), m);
  const SU = new T.Vector3(0, 1, 0);
  /* tende un cilindro di altezza unitaria tra due punti */
  function tra(mesh, a, b) {
    const d = new T.Vector3().subVectors(b, a), L = d.length() || 1e-6;
    mesh.position.copy(a).addScaledVector(d, 0.5); mesh.scale.set(1, L, 1);
    mesh.quaternion.setFromUnitVectors(SU, d.multiplyScalar(1 / L));
  }

  /* ---------- ambiente ---------- */
  const piano = new T.Mesh(new T.CircleGeometry(2.6, 64), new T.MeshBasicMaterial({ color: 0x0d1826, transparent: true, opacity: 0.6 }));
  piano.rotation.x = -Math.PI / 2; scene.add(piano);
  const anelli = [];
  for (let i = 0; i < 3; i++) {
    const a = new T.Mesh(new T.RingGeometry(0.98, 1, 96), new T.MeshBasicMaterial({ color: 0x7cf5c0, transparent: true, opacity: 0, side: T.DoubleSide }));
    a.rotation.x = -Math.PI / 2; a.position.set(0, 0.012, -0.3); scene.add(a); anelli.push({ m: a, t: 9 });
  }
  const telaio = scatola(1.0, 0.1, 2.15, M.letto); telaio.position.set(0, 0.42, 0.05); scene.add(telaio);
  [[-0.44, -0.95], [0.44, -0.95], [-0.44, 1.05], [0.44, 1.05]].forEach(p => { const g = cil(0.03, 0.42, M.acciaio); g.position.set(p[0], 0.21, p[1]); scene.add(g); });
  const materasso = scatola(0.92, 0.12, 1.12, M.lenzuolo); materasso.position.set(0, 0.53, 0.55); scene.add(materasso);

  /* ---------- letto: coperta e schienale reclinabile ---------- */
  const coperta = sfera(1, M.coperta, 36, 24); coperta.scale.set(0.45, 0.13, 0.6); coperta.position.set(0, 0.655, 0.74); scene.add(coperta);
  const sup = new T.Group(); sup.position.set(0, 0.59, 0.0); scene.add(sup);
  const schienale = scatola(0.92, 0.12, 1.05, M.lenzuolo); schienale.position.set(0, -0.06, -0.52); sup.add(schienale);
  const cuscino = sfera(1, M.lenzuolo); cuscino.scale.set(0.27, 0.05, 0.16); cuscino.position.set(0, 0.03, -0.8); sup.add(cuscino);

  /* ---------- corpo: mesh umana con scheletro (MakeHuman, CC0) ----------
     Il corpo è in decimetri, in piedi; il contenitore lo corica con la testa
     verso −z e lo porta in metri. Le ossa hanno assi allineati al corpo:
     x = sinistra del paziente, y = craniale, z = anteriore. */
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const contenitore = new T.Group(); contenitore.rotation.x = -Math.PI / 2; contenitore.scale.setScalar(0.1); contenitore.position.set(0, 0.675, 0.05); scene.add(contenitore);
  const C = { pronto: false, dati: null, mesh: null, ossa: {}, lista: [], variante: '', riposo: {}, figli: {}, geo: null };
  const ganci = [];                          // presìdi agganciati alle ossa
  const inverso = q => { const r = q.clone(); return r.invert ? r.invert() : r.inverse(); };
  /* un presidio in metri, con l'asse y lungo la normale della cute */
  function aggancio(osso, punto, oggetto) {
    const g = new T.Group(); g.scale.setScalar(10); g.rotation.x = Math.PI / 2; g.add(oggetto); g.userData = { osso, punto }; ganci.push(g); return g;
  }
  const elettrodi = [[-1.25, 4.75], [1.25, 4.75], [1.35, 2.2], [-1.35, 2.2]].map(p => aggancio('spine02', p, cil(0.02, 0.008, M.elettrodo, 14)));
  const piastre = [[-0.95, 4.2, 0.11, 0.13], [1.75, 2.9, 0.1, 0.14]].map(p => { const g = aggancio('spine02', p, scatola(p[2], 0.008, p[3], M.piastra)); g.visible = false; return g; });
  const gocce = [[-0.42, 8.0], [0.3, 8.1], [0.55, 7.85], [-0.15, 8.2], [0.05, 7.95], [-0.6, 7.8]].map(p => { const g = aggancio('head', p, sfera(0.006, M.sudore, 8, 6)); g.visible = false; return g; });
  const mascheraMesh = new T.Mesh(new T.SphereGeometry(0.062, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.5), M.vetro); mascheraMesh.scale.set(0.95, 0.75, 1.2);
  const maschera = aggancio('head', [0, 6.95], mascheraMesh); maschera.visible = false;
  const socc = new T.Group(); socc.visible = false; scene.add(socc);
  const mano1 = scatola(0.1, 0.035, 0.13, M.guanto), mano2 = scatola(0.1, 0.035, 0.13, M.guanto); mano2.position.y = 0.035; mano2.rotation.y = 0.5;
  const av1 = cil(0.028, 1, M.camice), av2 = cil(0.028, 1, M.camice);
  tra(av1, V(-0.02, 0.05, 0.02), V(-0.3, 0.46, 0.1)); tra(av2, V(0.02, 0.05, -0.02), V(-0.26, 0.47, -0.1));
  [mano1, mano2, av1, av2].forEach(x => socc.add(x));
  const sterno = V(0, 0, 0), polsoSx = V(0.3, 0.7, 0);

  function leggi(buf) {
    const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x504f5349) throw Error('formato'); // 'ISOP'
    const n = dv.getUint32(4, true), H = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, n))), base = 8 + n;
    const f32 = b => new Float32Array(buf.slice(base + b[0], base + b[0] + b[1])), u16 = b => new Uint16Array(buf.slice(base + b[0], base + b[0] + b[1])), u8 = b => new Uint8Array(buf.slice(base + b[0], base + b[0] + b[1]));
    Object.keys(H.varianti).forEach(k => { const v = H.varianti[k]; v.pos = f32(v.pos); v.giunti = f32(v.giunti); });
    const ordine = ['pelle', 'camice', 'occhi', 'capelli', 'capelliCorti'], idx = []; H.gr = [];
    ordine.forEach((k, m) => { const a = u16(H.gruppi[k]); H.gr.push({ start: idx.length, count: a.length, m }); for (let i = 0; i < a.length; i++) idx.push(a[i]); });
    H.idx = idx; H.indici = u8(H.indici); H.pesi = u8(H.pesi); return H;
  }
  function costruisci(H) {
    C.dati = H;
    const geo = C.geo = new T.BufferGeometry(), n = H.n;
    geo.setAttribute('position', new T.BufferAttribute(new Float32Array(n * 3), 3));
    const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4);
    for (let i = 0; i < n * 4; i++) { si[i] = H.indici[i]; sw[i] = H.pesi[i] / 255; }
    geo.setAttribute('skinIndex', new T.BufferAttribute(si, 4)); geo.setAttribute('skinWeight', new T.BufferAttribute(sw, 4));
    geo.setIndex(H.idx); H.gr.forEach(g => geo.addGroup(g.start, g.count, g.m));
    const mats = [M.pelle, M.camice, M.occhi, M.capelli, M.capelliCorti];
    mats.forEach(m => { m.skinning = true; });
    const mesh = C.mesh = new T.SkinnedMesh(geo, mats); mesh.frustumCulled = false;
    C.lista = H.ossa.map(nome => { const b = new T.Bone(); b.name = nome; C.ossa[nome] = b; return b; });
    H.genitori.forEach((g, i) => { if (g >= 0) C.lista[g].add(C.lista[i]); (C.figli[g] = C.figli[g] || []).push(i); });
    mesh.add(C.lista[0]); C.scheletro = new T.Skeleton(C.lista);
    forma('M'); contenitore.add(mesh);
    ganci.forEach(g => { C.ossa[g.userData.osso].add(g); });
    C.pronto = true; imposta(ultimoPz, ultimoPaz);
  }
  /* cambia la corporatura: nuove posizioni, nuovi giunti, nuova posa di riposo */
  function forma(k) {
    if (k === C.variante || !C.dati.varianti[k]) return;
    C.variante = k;
    const v = C.dati.varianti[k], pos = C.geo.attributes.position, H = C.dati;
    pos.array.set(v.pos); pos.needsUpdate = true; C.geo.computeVertexNormals();
    const G = i => V(v.giunti[i * 3], v.giunti[i * 3 + 1], v.giunti[i * 3 + 2]);
    C.lista.forEach((b, i) => { b.quaternion.set(0, 0, 0, 1); b.scale.set(1, 1, 1); const g = H.genitori[i]; b.position.copy(G(i)); if (g >= 0) b.position.sub(G(g)); });
    if (C.mesh.parent) C.mesh.parent.remove(C.mesh);
    C.mesh.bind(C.scheletro); contenitore.add(C.mesh);
    const ix = n => H.ossa.indexOf(n), dir = (a, b) => b.clone().sub(a).normalize(), A = n => V.apply(null, v.ancore[n]);
    ['L', 'R'].forEach(l => {
      C.riposo['br' + l] = dir(G(ix('upperarm01.' + l)), G(ix('lowerarm01.' + l)));
      C.riposo['av' + l] = dir(G(ix('lowerarm01.' + l)), G(ix('wrist.' + l)));
      C.riposo['ma' + l] = dir(G(ix('wrist.' + l)), A('wrist.' + l));
    });
    /* punti sulla cute: il vertice più anteriore vicino a (x, y) */
    const p = v.pos, cute = (x, y, r) => { let z = -9; for (let i = 0; i < p.length; i += 3) if (Math.abs(p[i] - x) < r && Math.abs(p[i + 1] - y) < r && p[i + 2] > z) z = p[i + 2]; return z; };
    ganci.forEach(g => {
      const q = g.userData.punto, z = cute(q[0], q[1], 0.3), o = G(ix(g.userData.osso)); g.position.set(q[0] - o.x, q[1] - o.y, z - o.z + (g === maschera ? -0.25 : 0.03));
    });
    C.sterno = V(0, 3.75, cute(0, 3.75, 0.3) + 0.15).sub(G(ix('spine02')));
    C.avambraccio = G(ix('lowerarm01.L')).lerp(G(ix('wrist.L')), 0.55).sub(G(ix('lowerarm01.L')));
  }
  let ultimoPz = {}, ultimoPaz = null;
  const qa = new T.Quaternion(), qb = new T.Quaternion(), qc = new T.Quaternion(), ASSEX = V(1, 0, 0), ASSEZ = V(0, 0, 1);
  /* direzioni desiderate di braccio, avambraccio e mano nel riferimento del tronco */
  const POSE = {
    riposo: { L: [V(0.2, -1, -0.02), V(0.1, -1, 0.1), V(0.05, -1, 0.02)], R: [V(-0.2, -1, -0.02), V(-0.1, -1, 0.1), V(-0.05, -1, 0.02)] },
    petto: { L: [V(0.2, -1, -0.02), V(0.1, -1, 0.1), V(0.05, -1, 0.02)], R: [V(-0.45, -0.8, 0.42), V(0.88, 0.12, 0.45), V(0.9, 0.3, -0.25)] },
    aperte: { L: [V(0.3, -0.95, -0.03), V(0.2, -0.98, 0.04), V(0.15, -1, 0)], R: [V(-0.3, -0.95, -0.03), V(-0.2, -0.98, 0.04), V(-0.15, -1, 0)] }
  };
  function posaBraccia(posa, k) {
    ['L', 'R'].forEach(l => {
      const d = POSE[posa][l];
      qa.setFromUnitVectors(C.riposo['br' + l], d[0].clone().normalize());
      qb.setFromUnitVectors(C.riposo['av' + l], d[1].clone().normalize());
      qc.setFromUnitVectors(C.riposo['ma' + l], d[2].clone().normalize());
      C.ossa['upperarm01.' + l].quaternion.slerp(qa, k);
      C.ossa['lowerarm01.' + l].quaternion.slerp(inverso(qa).multiply(qb), k);
      C.ossa['wrist.' + l].quaternion.slerp(inverso(qb).multiply(qc), k);
    });
  }
  function carica() {
    if (!root.fetch) return;
    const src = (root.ISO_PAZIENTE_URL || 'paziente-corpo.bin') + (root.ISO_VERSIONE ? '?v=' + root.ISO_VERSIONE : '');
    root.fetch(src).then(r => { if (!r.ok) throw Error(r.status); return r.arrayBuffer(); }).then(b => costruisci(leggi(b))).catch(() => { if (api.suErrore) api.suErrore(); });
  }

  /* asta con sacca e deflussore fino all'avambraccio sinistro */
  const asta = cil(0.014, 1.75, M.acciaio); asta.position.set(0.72, 0.875, -0.55); scene.add(asta);
  const gancio = cil(0.01, 0.26, M.acciaio); gancio.rotation.z = Math.PI / 2; gancio.position.set(0.62, 1.74, -0.55); scene.add(gancio);
  const sacca = sfera(1, M.sacca, 16, 12); sacca.scale.set(0.07, 0.12, 0.035); sacca.position.set(0.53, 1.6, -0.55); scene.add(sacca);
  const flebo = { curva: null, mesh: null, bolo: sfera(0.02, M.bolo, 12, 10), t: 2, fine: new T.Vector3(9, 9, 9) }; flebo.bolo.visible = false; scene.add(flebo.bolo);
  function tendiFlebo() {
    const fine = polsoSx.clone();
    flebo.curva = new T.CatmullRomCurve3([V(0.53, 1.48, -0.55), V(0.52, 1.2, -0.5), V(0.56, 0.95, -0.42), fine.clone().add(V(0.06, 0.12, 0)), fine]);
    if (flebo.mesh) { scene.remove(flebo.mesh); flebo.mesh.geometry.dispose(); }
    flebo.mesh = new T.Mesh(new T.TubeGeometry(flebo.curva, 40, 0.006, 6, false), M.tubo); scene.add(flebo.mesh);
  }

  /* monitor con i parametri vitali */
  const paloM = cil(0.014, 1.2, M.acciaio); paloM.position.set(-0.74, 0.6, -0.83); scene.add(paloM);
  const cassa = scatola(0.62, 0.42, 0.05, M.letto); cassa.position.set(-0.74, 1.33, -0.8); cassa.rotation.y = 0.62; scene.add(cassa);
  const tela = document.createElement('canvas'); tela.width = 320; tela.height = 208;
  const tex = new T.CanvasTexture(tela); if ('encoding' in tex && T.sRGBEncoding) tex.encoding = T.sRGBEncoding;
  M.schermo.map = tex;
  const schermo = new T.Mesh(new T.PlaneGeometry(0.58, 0.377), M.schermo); schermo.position.set(0, 0, 0.027); cassa.add(schermo);
  function disegnaSchermo(v) {
    const c = tela.getContext('2d'); if (!c) return;
    c.fillStyle = '#06110d'; c.fillRect(0, 0, 320, 208);
    const riga = (y, et, val, col) => { c.fillStyle = col; c.font = '600 15px system-ui,sans-serif'; c.fillText(et, 14, y - 30); c.font = '700 40px system-ui,sans-serif'; c.fillText(val, 14, y); };
    riga(62, 'FC', v.fc == null ? '—' : String(v.fc), '#79f5ab');
    riga(128, 'PA', v.pa || '—', '#ff8fa3');
    riga(194, 'SpO₂', v.spo2 == null ? '—' : v.spo2 + '%', '#7fd4ff');
    c.fillStyle = '#f0d27a'; c.font = '600 15px system-ui,sans-serif'; c.fillText('FR', 232, 164); c.font = '700 34px system-ui,sans-serif'; c.fillText(String(v.fr || 0), 232, 194);
    tex.needsUpdate = true;
  }

  /* ---------- stato e animazione ---------- */
  const st = { post: 0.62, postT: 0.62, fr: 16, polso: true, rcp: false, cosc: 'vigile', mano: false, cute: new T.Color(PELLE.norm), cuteT: new T.Color(PELLE.norm), chiusi: 0, chiusiT: 0, capo: 0, capoT: 0, sudore: false, piastre: false, o2: false };
  const fx = { scossa: 9, vagale: 9 };
  const OCCHIO = new T.Color(0x2a1d16);
  let tempo = 0, fase = 0, statico = false, vivo = true, mosso = false;

  function imposta(pz, paz) {
    pz = pz || {}; ultimoPz = pz; ultimoPaz = paz || ultimoPaz;
    st.postT = pz.post === 'supino' ? 0.03 : 0.6;
    st.fr = pz.fr == null ? st.fr : pz.fr; st.polso = pz.polso !== false; st.rcp = !!pz.rcp; st.cosc = pz.cosc || 'vigile'; st.mano = !!pz.mano && st.cosc !== 'incosciente';
    st.cuteT.setHex(PELLE[pz.cute] || PELLE.norm);
    st.chiusiT = st.cosc === 'incosciente' ? 1 : 0; st.capoT = st.cosc === 'incosciente' ? 0.3 : st.cosc === 'confuso' ? 0.12 : 0;
    st.sudore = !!pz.sudore; st.piastre = !!pz.piastre; st.o2 = !!pz.o2;
    gocce.forEach(g => { g.visible = st.sudore; }); M.pelle.roughness = st.sudore ? 0.3 : 0.58;
    maschera.visible = st.o2; piastre.forEach(p => { p.visible = st.piastre; });
    if (C.pronto && ultimoPaz) {
      const anziano = ultimoPaz.eta >= 62, donna = ultimoPaz.sesso === 'F';
      forma((donna ? 'F' : 'M') + (anziano ? 'v' : ''));
      const colore = anziano ? 0xb9bcc2 : donna ? 0x4a2f20 : 0x2b211b;
      M.capelli.color.setHex(colore); M.capelliCorti.color.setHex(colore);
      M.capelli.visible = donna; M.capelliCorti.visible = !donna;
    }
  }
  function effetto(nome) {
    if (nome === 'shock') { fx.scossa = 0; }
    else if (nome === 'ev') { flebo.t = 0; flebo.bolo.visible = true; }
    else if (nome === 'vagale') { fx.vagale = 0; }
  }
  function battito() { if (!st.polso || statico) return; const a = anelli.reduce((p, c) => (c.t > p.t ? c : p), anelli[0]); a.t = 0; }

  function aggiorna(dt) {
    const k = Math.min(1, dt / 1000 * 3.2); tempo += dt / 1000;
    st.post = lerp(st.post, st.postT, k); st.cute.lerp(st.cuteT, k);
    st.chiusi = lerp(st.chiusi, st.chiusiT, k * 1.5); st.capo = lerp(st.capo, st.capoT, k);
    M.pelle.color.copy(st.cute);
    /* manovra vagale: schienale giù per qualche secondo */
    let post = st.post; if (fx.vagale < 4) { fx.vagale += dt / 1000; post = lerp(post, 0.03, Math.sin(Math.min(1, fx.vagale / 4) * Math.PI)); }
    sup.rotation.x = post;
    fase += dt / 1000 * (st.fr / 60) * Math.PI * 2;
    const resp = st.fr > 0 ? (Math.sin(fase) * 0.5 + 0.5) : 0, amp = st.fr > 26 ? 0.035 : 0.055;
    let salto = 0;
    if (fx.scossa < 2) fx.scossa += dt / 1000;
    if (fx.scossa < 0.7) { const u = fx.scossa / 0.7; salto = Math.sin(Math.min(1, u * 2.4) * Math.PI) * (1 - u); lampo.intensity = Math.max(0, 1 - u * 3) * 3.2; } else lampo.intensity = 0;
    const comprime = st.rcp && fx.scossa > 1.1 ? Math.max(0, Math.sin(tempo * (110 / 60) * Math.PI * 2)) : 0;
    socc.visible = st.rcp && fx.scossa > 1.1;   // durante la scarica nessuno tocca il paziente
    if (C.pronto) {
      const O = C.ossa;
      O.root.quaternion.setFromAxisAngle(ASSEX, post + salto * 0.09);
      qa.setFromAxisAngle(ASSEX, -post); O['upperleg01.L'].quaternion.copy(qa); O['upperleg01.R'].quaternion.copy(qa);
      /* torace: si espande con il respiro, si abbassa con le compressioni */
      const sz = (1 + resp * amp) * (1 - comprime * 0.2), torace = C.dati.ossa.indexOf('spine02');
      O.spine02.scale.set(1 + resp * amp * 0.4, 1, sz);
      (C.figli[torace] || []).forEach(i => C.lista[i].scale.set(1 / (1 + resp * amp * 0.4), 1, 1 / sz));
      posaBraccia(st.mano ? 'petto' : st.cosc === 'incosciente' ? 'aperte' : 'riposo', Math.min(1, k * 1.3));
      qa.setFromAxisAngle(ASSEZ, st.capo * 0.5); O.neck01.quaternion.slerp(qa, k);
      qb.setFromAxisAngle(ASSEX, salto * 0.1 - st.capo * 0.15).multiply(qa); O.head.quaternion.slerp(qb, k);
      qa.setFromAxisAngle(ASSEX, (st.fr > 26 ? 0.1 + resp * 0.08 : st.cosc === 'incosciente' ? 0.09 : 0.0)); O.jaw.quaternion.slerp(qa, k);
      M.occhi.color.copy(OCCHIO).lerp(st.cute, st.chiusi * 0.92);
      contenitore.position.y = 0.675 + salto * 0.04;
      contenitore.updateMatrixWorld(true);
      O.spine02.localToWorld(sterno.copy(C.sterno)); O['lowerarm01.L'].localToWorld(polsoSx.copy(C.avambraccio));
      socc.position.copy(sterno); socc.position.y -= comprime * 0.045; socc.rotation.x = post;
    }
    /* deflussore e bolo */
    if (!flebo.mesh || flebo.fine.distanceToSquared(polsoSx) > 2e-5) { flebo.fine.copy(polsoSx); tendiFlebo(); }
    if (flebo.t < 1.6 && flebo.curva) { flebo.t += dt / 1000; const u = Math.min(1, flebo.t / 1.6); flebo.bolo.position.copy(flebo.curva.getPoint(u)); flebo.bolo.scale.setScalar(1 + Math.sin(u * 22) * 0.25); if (u >= 1) flebo.bolo.visible = false; }
    anelli.forEach(a => { a.t += dt / 1000; const u = Math.min(1, a.t / 0.9); a.m.scale.setScalar(0.6 + u * 1.5); a.m.material.opacity = a.t < 0.9 ? (1 - u) * 0.5 : 0; });
    if (!mosso && !statico) orbit.th = 0.62 + Math.sin(tempo * 0.25) * 0.1;
    piazzaCam(); renderer.render(scene, cam);
  }
  function misura() { const w = el.clientWidth, h = el.clientHeight; if (!w || !h) return; renderer.setSize(w, h, false); cam.aspect = w / h; orbit.r = w / h < 0.9 ? 3.3 : w / h < 1.3 ? 2.75 : 2.3; cam.updateProjectionMatrix(); }

  /* orbita con il dito o il mouse */
  let presa = null;
  const cv = renderer.domElement;
  cv.addEventListener('pointerdown', e => { presa = { x: e.clientX, y: e.clientY }; mosso = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} });
  cv.addEventListener('pointermove', e => { if (!presa) return; orbit.th -= (e.clientX - presa.x) * 0.008; orbit.ph = Math.max(0.35, Math.min(1.5, orbit.ph - (e.clientY - presa.y) * 0.006)); presa = { x: e.clientX, y: e.clientY }; });
  ['pointerup', 'pointercancel', 'pointerleave'].forEach(n => cv.addEventListener(n, () => { presa = null; }));

  statico = !!(root.matchMedia && root.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const api = {
    imposta, effetto, battito, aggiorna, misura, vitali: disegnaSchermo, suErrore: null,
    distruggi() { vivo = false; renderer.dispose(); if (cv.parentNode) cv.parentNode.removeChild(cv); },
    get vivo() { return vivo; }, get pronto() { return C.pronto; }
  };
  misura(); imposta({}, null); disegnaSchermo({}); carica();
  return api;
}
root.ISO_PAZIENTE = { crea };
})(typeof window !== 'undefined' ? window : this);
