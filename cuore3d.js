/* =====================================================================
   CUORE 3D PROCEDURALE — Isoelettrica
   Quattro camere, grandi vasi, solchi e albero coronarico, costruiti
   nel sistema di riferimento dell'app: X sinistra del paziente, Y craniale,
   Z anteriore; piano atrio-ventricolare all'origine; apice verso
   (0.55, -0.72, 0.43). Il nodo del seno dell'app sta in (-0.38, 0.46, 0.10).
   Riferimenti anatomici: Gray's Anatomy (cuore e vasi coronarici);
   classificazione dei segmenti coronarici AHA 1975 e modello SYNTAX;
   modello a 17 segmenti del ventricolo sinistro AHA 2002.
   ===================================================================== */
(function (root) {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
  const K = V3(0.55, -0.72, 0.43).normalize();               // asse lungo, base -> apice
  const A = V3(0, 0, 1).projectOnPlane(K).normalize();       // direzione anteriore
  const B = new THREE.Vector3().crossVectors(A, K).normalize(); // sinistra del paziente (A x K: X positivo)
  const L = 1.30, RB = 0.53;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const rad = d => d * Math.PI / 180;

  // --- raggio del ventricolo sinistro (profilo epicardico) ---
  function rLV(s, th) {
    const u = clamp(s, 0, 1);
    let r = RB * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.3))) * (1 - 0.10 * u);
    // solchi interventricolari anteriore (0°) e posteriore (180°)
    const g = th => Math.exp(-Math.pow(((th + 540) % 360 - 180) / 9, 2));
    r *= 1 - 0.05 * g(th) - 0.04 * g(th - 180);
    // ventricolo sinistro leggermente più pieno sul lato laterale
    r *= 1 + 0.05 * Math.cos(rad(th - 100));
    return r;
  }
  // --- rigonfiamento del ventricolo destro, da -178° a -2° (faccia anteriore destra) ---
  function bulgeRV(s, th) {
    let t = ((th + 540) % 360) - 180;          // -180..180
    if (t > -2 || t < -178) return 0;
    const w = Math.pow(Math.sin(Math.PI * (t + 178) / 176), 0.85);
    return 0.50 * w * Math.max(0, 1 - Math.pow(clamp(s, 0, 1), 1.7)) * (s < 0.86 ? 1 : Math.max(0, 1 - (s - 0.86) / 0.06));
  }
  // raggio della superficie epicardica complessiva
  function R(s, th) { return rLV(s, th) * (1 + bulgeRV(s, th)); }
  // punto sulla superficie con scostamento radiale
  function P(s, th, off) {
    const r = R(s, th) + (off || 0), a = rad(th);
    return new THREE.Vector3().addScaledVector(K, s * L).addScaledVector(A, r * Math.cos(a)).addScaledVector(B, r * Math.sin(a));
  }

  // --- superficie parametrica generica ---
  function grid(f, nu, nv, u0, u1, v0, v1) {
    const pos = [], idx = [];
    for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) {
      const p = f(u0 + (u1 - u0) * i / nu, v0 + (v1 - v0) * j / nv); pos.push(p.x, p.y, p.z);
    }
    for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) {
      const a = i * (nv + 1) + j, b = a + 1, c = a + nv + 1, d = c + 1; idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
    return g;
  }
  const mat = (color, o) => new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.82, metalness: 0.03, side: THREE.DoubleSide }, o || {}));
  const tube = (pts, r, color, o, closed) => new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, !!closed, 'centripetal'), Math.max(24, pts.length * 14), r, 12, !!closed), mat(color, Object.assign({ roughness: 0.55 }, o || {})));
  const ellips = (c, rx, ry, rz, color, o, q) => { const m = new THREE.Mesh(new THREE.SphereGeometry(1, 40, 28), mat(color, o)); m.position.copy(c); m.scale.set(rx, ry, rz); if (q) m.quaternion.copy(q); return m; };

  // --- segmenti AHA del ventricolo sinistro ---
  // azimut: 0° solco anteriore, positivo verso la parete laterale (sinistra del paziente), negativo verso il setto
  const SEG = [];
  const anelli = [['Basale', 0.0, 0.36], ['Medio', 0.36, 0.68]];
  const sei = [['anteriore', -30, 30], ['anterosettale', -90, -30], ['inferosettale', -150, -90], ['inferiore', 150, 210], ['inferolaterale', 90, 150], ['anterolaterale', 30, 90]];
  anelli.forEach(([nm, s0, s1], k) => sei.forEach(([n, t0, t1], i) => SEG.push({ n: k * 6 + i + 1, nome: nm + ' ' + n, s0, s1, t0, t1 })));
  [['anteriore', -45, 45], ['settale', -135, -45], ['inferiore', 135, 225], ['laterale', 45, 135]].forEach(([nm, t0, t1], i) => SEG.push({ n: i + 13, nome: 'Apicale ' + nm, s0: 0.68, s1: 0.93, t0, t1 }));
  SEG.push({ n: 17, nome: 'Apice', s0: 0.93, s1: 1.0, t0: 0, t1: 360 });

  /* ---------- albero coronarico: percorsi [s, azimut, scostamento] ---------- */
  const CORO = {
    // punti a 4 elementi = coordinate assolute (ostio sui seni di Valsalva)
    lm:   { r: 0.028, via: [[0.09, 0.24, 0.00, 'w'], [0.19, 0.25, 0.12, 'w'], [0.22, 0.24, 0.30, 'w'], [0.03, 30, 0.07]] },   // ostio dal seno coronarico sinistro, passa dietro il tronco polmonare
    lad1: { r: 0.024, via: [[0.03, 30, 0.07], [0.10, 6, 0.045], [0.20, 0, 0.035], [0.32, -1, 0.032]] },
    lad2: { r: 0.019, via: [[0.32, -1, 0.032], [0.46, -2, 0.03], [0.58, -2, 0.028]] },
    lad3: { r: 0.014, via: [[0.58, -2, 0.028], [0.74, -1, 0.024], [0.90, 0, 0.02], [0.995, 60, 0.018], [0.96, 170, 0.02]] },
    s1:   { r: 0.012, via: [[0.18, 0, 0.035], [0.22, -20, -0.04], [0.28, -34, -0.13]] },
    s2:   { r: 0.010, via: [[0.44, -2, 0.03], [0.48, -22, -0.05], [0.53, -34, -0.13]] },
    s3:   { r: 0.008, via: [[0.66, -2, 0.026], [0.70, -20, -0.05], [0.74, -30, -0.11]] },
    d1:   { r: 0.016, via: [[0.26, -1, 0.033], [0.32, 22, 0.04], [0.44, 46, 0.036], [0.58, 62, 0.03], [0.70, 70, 0.026]] },
    d2:   { r: 0.013, via: [[0.50, -2, 0.03], [0.56, 20, 0.034], [0.68, 40, 0.03], [0.80, 50, 0.026]] },
    cx1:  { r: 0.022, via: [[0.03, 30, 0.07], [0.04, 52, 0.075], [0.05, 74, 0.075], [0.06, 104, 0.072]] },
    cx2:  { r: 0.016, via: [[0.06, 104, 0.072], [0.07, 134, 0.068], [0.08, 160, 0.062]] },
    om1:  { r: 0.016, via: [[0.05, 92, 0.072], [0.18, 100, 0.05], [0.36, 106, 0.04], [0.54, 110, 0.034], [0.68, 112, 0.028]] },
    om2:  { r: 0.013, via: [[0.07, 132, 0.068], [0.22, 136, 0.048], [0.40, 138, 0.038], [0.54, 140, 0.03]] },
    pla:  { r: 0.011, via: [[0.08, 160, 0.062], [0.22, 168, 0.045], [0.40, 172, 0.036]] },
    rca1: { r: 0.024, via: [[-0.12, 0.24, 0.15, 'w'], [-0.24, 0.24, 0.28, 'w'], [0.0, -52, 0.085], [0.04, -68, 0.075], [0.05, -80, 0.07]] },   // ostio dal seno coronarico destro
    rca2: { r: 0.020, via: [[0.05, -80, 0.07], [0.06, -104, 0.07], [0.07, -130, 0.068], [0.08, -150, 0.066]] },
    rca3: { r: 0.017, via: [[0.08, -150, 0.066], [0.09, -168, 0.064], [0.10, -181, 0.06]] },
    cono: { r: 0.009, via: [[-0.02, -46, 0.085], [0.05, -34, 0.10], [0.14, -22, 0.10], [0.24, -14, 0.08]] },
    nsa:  { r: 0.010, via: [[0.0, -66, 0.075], [-0.12, -78, 0.10], [-0.26, -86, 0.13], [-0.40, -92, 0.16]] },
    am:   { r: 0.014, via: [[0.06, -108, 0.07], [0.22, -108, 0.06], [0.40, -106, 0.05], [0.58, -104, 0.04]] },
    nav:  { r: 0.008, via: [[0.10, -181, 0.06], [0.05, -192, 0.03], [0.01, -200, -0.02]] },
    pda:  { r: 0.015, via: [[0.10, -181, 0.06], [0.28, -181, 0.045], [0.50, -180, 0.036], [0.72, -180, 0.03], [0.90, -180, 0.024]] },
    plv:  { r: 0.011, via: [[0.10, -186, 0.06], [0.20, -204, 0.05], [0.32, -218, 0.042], [0.44, -228, 0.036]] },
    ri:   { r: 0.013, via: [[0.03, 30, 0.07], [0.14, 46, 0.05], [0.30, 62, 0.04], [0.46, 74, 0.032]] },   // ramo intermedio
    am2:  { r: 0.011, via: [[0.07, -134, 0.068], [0.22, -132, 0.055], [0.40, -128, 0.045]] },              // secondo marginale acuto
    rvb:  { r: 0.010, via: [[0.04, -70, 0.075], [0.16, -60, 0.09], [0.30, -52, 0.085]] },                 // ramo ventricolare destro
    sp1:  { r: 0.008, via: [[0.30, -181, 0.045], [0.34, -160, -0.04], [0.38, -150, -0.11]] },             // settale posteriore
    sp2:  { r: 0.007, via: [[0.52, -180, 0.036], [0.56, -160, -0.04], [0.60, -150, -0.10]] },
    // vene coronariche
    gcv:  { r: 0.020, via: [[0.62, 10, 0.03], [0.40, 12, 0.036], [0.20, 14, 0.04], [0.06, 30, 0.078], [0.07, 70, 0.08], [0.09, 120, 0.075], [0.11, 160, 0.07]], vena: true },
    cs:   { r: 0.028, via: [[0.11, 160, 0.07], [0.12, 190, 0.07], [0.10, 215, 0.075], [0.04, 235, 0.09]], vena: true },
    mcv:  { r: 0.014, via: [[0.80, 184, 0.03], [0.50, 186, 0.04], [0.24, 188, 0.05], [0.12, 190, 0.07]], vena: true }
  };
  const FIGLI = { lad1: ['s1', 'd1', 'lad2'], lad2: ['s2', 'd2', 'lad3'], lad3: ['s3'], cx1: ['om1', 'cx2'], lm: ['lad1', 'cx1', 'ri'], cx2: ['om2', 'pla'], rca1: ['cono', 'nsa', 'rvb', 'rca2'], rca2: ['am', 'am2', 'rca3'], rca3: ['nav', 'pda', 'plv'], pda: ['sp1', 'sp2'] };
  function aValle(id) { const o = [id]; (FIGLI[id] || []).forEach(f => o.push(...aValle(f))); return o; }


  /* =====================================================================
     ANATOMIA: spessore di parete, setto, valvole, apparato sottovalvolare
     Tutto costruito con formule, non con mesh scaricate: il modello non ha
     licenza perché non c'è geometria di nessun altro. Pesa qualche kilobyte,
     ogni struttura ha un nome e può essere accesa, spenta, colorata o
     deformata, cosa che una mesh scolpita non permette.
     Misure di riferimento: parete del ventricolo sinistro 9-11 mm alla base
     e 6-7 mm all'apice, parete destra 3-4 mm, anello mitralico 30-35 mm di
     diametro, tricuspidale 35-40 mm, aortico 22-24 mm, polmonare 22-24 mm
     (Gray's Anatomy; valori ecocardiografici normali ASE/EACVI 2015).
     ===================================================================== */
  function spessVS(s) {
    const u = clamp(s, 0, 1);
    // 10 mm alla base, 6,5 mm verso l'apice, con un tetto che impedisce alla
    // parete di superare il raggio della cavità là dove il ventricolo si chiude
    const t = 0.1445 * (1 - 0.35 * Math.pow(u, 1.5));
    return Math.min(t, 0.68 * rLV(u, 0));
  }
  const SPESS_VD = 0.030;
  // superficie del solo ventricolo sinistro, senza il rigonfiamento destro:
  // serve perché l'endocardio sinistro non deve seguire la parete destra
  function PLV(s, th, off) {
    const r = rLV(s, th) + (off || 0), a = rad(th);
    return new THREE.Vector3().addScaledVector(K, s * L).addScaledVector(A, r * Math.cos(a)).addScaledVector(B, r * Math.sin(a));
  }
  // la parete non può mai mangiarsi la cavità: il tetto va calcolato sul raggio
  // locale, non su quello medio, perché nei solchi il ventricolo è più stretto
  const spessLoc = (s, th) => Math.min(spessVS(s), 0.68 * rLV(s, th));
  const Pendo = (s, th) => PLV(s, th, -spessLoc(s, th));

  // base ortonormale di un piano dato il suo asse
  function basePiano(n) {
    const u = Math.abs(n.dot(K)) > 0.9 ? A.clone() : K.clone();
    const e1 = u.clone().projectOnPlane(n).normalize();
    const e2 = new THREE.Vector3().crossVectors(n, e1).normalize();
    return [e1, e2];
  }
  const suPiano = (c, e1, e2, r, a) => c.clone().addScaledVector(e1, r * Math.cos(a)).addScaledVector(e2, r * Math.sin(a));

  /* --- anello valvolare: toro costruito a mano per restare nel piano giusto --- */
  function anello(c, r, n, spess, color) {
    const [e1, e2] = basePiano(n);
    return new THREE.Mesh(grid((a, b) => {
      const p = suPiano(c, e1, e2, r, a), t = suPiano(new THREE.Vector3(), e1, e2, 1, a);
      return p.addScaledVector(t, spess * Math.cos(b)).addScaledVector(n, spess * Math.sin(b));
    }, 64, 12, 0, Math.PI * 2, 0, Math.PI * 2), mat(color, { roughness: 0.6 }));
  }

  /* --- lembo di valvola atrioventricolare ---
     Attaccato all'anello, scende verso l'apice ed è più profondo al centro:
     ai due estremi tocca le commissure, dove i lembi vicini si affrontano. */
  function lembo(c, r, n, giu, a0, a1, prof) {
    const [e1, e2] = basePiano(n);
    return grid((u, a) => {
      const t = (a - a0) / (a1 - a0);
      const d = prof * Math.pow(Math.sin(Math.PI * t), 0.6) * u;
      return suPiano(c, e1, e2, r * (1 - 0.34 * u), a).addScaledVector(giu, d);
    }, 8, 22, 0, 1, a0, a1);
  }

  /* --- cuspide semilunare ---
     Inserzione a U sulla parete del seno, margine libero teso fra due
     commissure: è la forma che fa chiudere la valvola quando il sangue
     torna indietro. */
  function cuspide(c, r, n, giu, a0, a1, prof) {
    const [e1, e2] = basePiano(n);
    const c0 = suPiano(c, e1, e2, r, a0), c1 = suPiano(c, e1, e2, r, a1);
    return grid((u, a) => {
      const t = (a - a0) / (a1 - a0);
      const att = suPiano(c, e1, e2, r, a).addScaledVector(giu, prof * Math.sin(Math.PI * t));
      const lib = new THREE.Vector3().lerpVectors(c0, c1, t).addScaledVector(c.clone().sub(new THREE.Vector3().lerpVectors(c0, c1, t)).normalize(), r * 0.16 * Math.sin(Math.PI * t));
      return new THREE.Vector3().lerpVectors(lib, att, u);
    }, 10, 18, 0, 1, a0, a1);
  }

  function valvolaAV(c, r, n, giu, nLembi, prof, color, out, nome) {
    const g = new THREE.Group(); g.name = nome;
    g.add(anello(c, r, n, 0.016, 0xd9c9a6));
    const sett = nLembi === 2 ? [[10, 190], [190, 370]] : [[0, 118], [122, 240], [244, 356]];
    sett.forEach(([d0, d1], i) => {
      const m = new THREE.Mesh(lembo(c, r, n, giu, rad(d0), rad(d1), prof), mat(color, { roughness: 0.42, side: THREE.DoubleSide }));
      m.userData.lembo = nome + '-' + (i + 1); g.add(m);
    });
    out.valv[nome] = { group: g, centro: c, raggio: r, normale: n };
    return g;
  }
  function valvolaSL(c, r, n, giu, prof, color, out, nome) {
    const g = new THREE.Group(); g.name = nome;
    g.add(anello(c, r, n, 0.013, 0xd9c9a6));
    [[0, 118], [122, 240], [244, 356]].forEach(([d0, d1], i) => {
      const m = new THREE.Mesh(cuspide(c, r, n, giu, rad(d0), rad(d1), prof), mat(color, { roughness: 0.4, side: THREE.DoubleSide }));
      m.userData.cuspide = nome + '-' + (i + 1); g.add(m);
    });
    out.valv[nome] = { group: g, centro: c, raggio: r, normale: n };
    return g;
  }

  /* ---------- costruzione ---------- */
  function build(opt) {
    opt = opt || {};
    const G = new THREE.Group(); G.name = 'cuore';
    const out = { group: G, seg: {}, coro: {}, valv: {}, SEG, aValle, P, R, PLV, Pendo, spessVS, spessLoc };
    const cMio = 0xd6858a, cAtr = 0xe0a3a6, cArt = 0xc9303e, cVen = 0x4d5fc4, cCoro = 0xc11f2f, cVena = 0x3d4db3;

    // ventricolo sinistro in 17 segmenti
    SEG.forEach(sg => {
      const nt = Math.max(8, Math.round((sg.t1 - sg.t0) / 6));
      const m = new THREE.Mesh(grid((s, th) => P(s, th, 0), 10, nt, sg.s0, sg.s1, sg.t0, sg.t1), mat(cMio));
      m.userData.seg = sg.n; out.seg[sg.n] = m; G.add(m);
    });
    // ventricolo destro: parete libera sopra il rigonfiamento
    const rv = new THREE.Mesh(grid((s, th) => P(s, th, 0.004), 22, 30, 0.0, 0.92, -178, -2), mat(0xcf8388));
    rv.userData.rv = true; out.rv = rv; G.add(rv);
    // tratto di efflusso destro, sale davanti alla radice aortica fino al tronco polmonare
    const rvot = new THREE.Mesh(grid((s, th) => P(s, th, 0.004 + 0.04 * (-s)), 8, 12, -0.24, 0.0, -66, -12), mat(0xcf8388));
    G.add(rvot);

    /* ---------- parete: il ventricolo sinistro è un solido, non un guscio ----------
       Serve per davvero: il subendocardio è lo strato che soffre per primo
       nell'ischemia, ed è la differenza fra un NSTEMI e uno STEMI. Senza
       spessore quella distinzione non si può mostrare. */
    const cEndo = 0xf0c3c4, cSetto = 0xcb7b81, cVal = 0xf2e8d4, cCorde = 0xe4d8bd;
    const endo = new THREE.Mesh(grid((s2, th) => Pendo(s2, th), 24, 72, 0.0, 0.94, 0, 360), mat(cEndo, { side: THREE.DoubleSide }));
    endo.userData.endo = 'vs'; out.endo = endo; G.add(endo);
    // strato subendocardico: sottile, separato, così si può accendere da solo
    const subendo = new THREE.Mesh(grid((s2, th) => PLV(s2, th, -spessLoc(s2, th) * 0.72), 20, 72, 0.0, 0.95, 0, 360), mat(0xe8a8ab, { side: THREE.DoubleSide, transparent: true, opacity: 0 }));
    subendo.userData.subendo = true; out.subendo = subendo; G.add(subendo);
    // anello basale che chiude la parete fra endocardio ed epicardio
    G.add(new THREE.Mesh(grid((u, th) => new THREE.Vector3().lerpVectors(Pendo(0, th), PLV(0, th, 0), u), 3, 72, 0, 1, 0, 360), mat(cMio)));

    /* ---------- setto interventricolare ----------
       Faccia destra alla superficie del ventricolo sinistro nel settore
       settale, faccia sinistra a uno spessore di parete più dentro. */
    const T0 = -172, T1 = -8;
    const setto = new THREE.Group(); setto.name = 'setto';
    setto.add(new THREE.Mesh(grid((s2, th) => PLV(s2, th, 0.002), 20, 34, 0.0, 0.95, T0, T1), mat(cSetto, { side: THREE.DoubleSide })));
    setto.add(new THREE.Mesh(grid((u, s2) => new THREE.Vector3().lerpVectors(Pendo(s2, T0), PLV(s2, T0, 0), u), 3, 20, 0, 1, 0.0, 0.95), mat(cSetto)));
    setto.add(new THREE.Mesh(grid((u, s2) => new THREE.Vector3().lerpVectors(Pendo(s2, T1), PLV(s2, T1, 0), u), 3, 20, 0, 1, 0.0, 0.95), mat(cSetto)));
    setto.traverse(o => { if (o.isMesh) o.userData.setto = true; });
    out.setto = setto; G.add(setto);

    // base dei ventricoli: piano degli anelli valvolari
    const cap = new THREE.Mesh(grid((u, th) => P(0.0, th, 0).multiplyScalar(u), 3, 72, 0.0, 1.0, 0, 360), mat(0xc77d82));
    G.add(cap);

    /* ---------- le quattro valvole ----------
       Anelli nel piano atrio-ventricolare per mitrale e tricuspide, alla
       radice dei grandi vasi per aortica e polmonare. */
    const giuK = K.clone();
    const cMitr = new THREE.Vector3().addScaledVector(A, -0.075).addScaledVector(B, 0.085);
    G.add(valvolaAV(cMitr, 0.228, K, giuK, 2, 0.30, cVal, out, 'mitrale'));
    // la tricuspide si inserisce in buona parte sul setto e sta un poco più
    // verso l'apice della mitrale: è lo scalino che all'ecocardiogramma
    // permette di dire quale ventricolo si sta guardando
    const cTric = new THREE.Vector3().lerpVectors(PLV(0, -92, 0), P(0, -92, 0), 0.34).addScaledVector(giuK, 0.055);
    G.add(valvolaAV(cTric, 0.248, K, giuK, 3, 0.26, cVal, out, 'tricuspide'));
    const nAo = V3(-0.04, 0.26, 0.10).normalize();
    G.add(valvolaSL(V3(-0.02, 0.22, 0.06), 0.115, nAo, nAo.clone().multiplyScalar(-1), 0.085, cVal, out, 'aortica'));
    const cPol = V3(-0.24, 0.36, 0.465), nPol = V3(0.08, 0.30, 0.02).normalize();
    G.add(valvolaSL(cPol, 0.105, nPol, nPol.clone().multiplyScalar(-1), 0.080, cVal, out, 'polmonare'));

    /* ---------- muscoli papillari, corde tendinee, banda moderatrice ---------- */
    const pap = new THREE.Group(); pap.name = 'papillari'; out.pap = {};
    [['anterolaterale', 0.60, 98], ['posteromediale', 0.64, 168]].forEach(([nm, sp, th]) => {
      const base = Pendo(sp, th), punta = new THREE.Vector3().lerpVectors(base, cMitr.clone().addScaledVector(giuK, 0.30), 0.52);
      const m = tube([base, new THREE.Vector3().lerpVectors(base, punta, 0.5), punta], 0.048, cMio, { roughness: 0.8 });
      m.userData.papillare = nm; out.pap[nm] = m; pap.add(m);
      // corde tendinee verso il margine libero dei lembi
      for (let i = 0; i < 4; i++) {
        const a = rad(th - 46 + i * 31);
        const [e1, e2] = basePiano(K);
        const att = suPiano(cMitr, e1, e2, 0.228 * 0.66, a).addScaledVector(giuK, 0.30 * 0.92);
        pap.add(tube([punta, new THREE.Vector3().lerpVectors(punta, att, 0.5), att], 0.006, cCorde, { roughness: 0.7 }));
      }
    });
    // ventricolo destro: papillare anteriore e banda moderatrice, che porta
    // dentro di sé la branca destra: è il motivo per cui la branca destra
    // arriva all'apice destro prima che alla base
    const basePapD = P(0.58, -96, -0.02), puntaPapD = new THREE.Vector3().lerpVectors(basePapD, cTric.clone().addScaledVector(giuK, 0.26), 0.5);
    pap.add(tube([basePapD, puntaPapD], 0.042, cMio, { roughness: 0.8 }));
    const bm = tube([PLV(0.66, -150, 0.01), V3(0.02, -0.52, 0.34), P(0.62, -96, -0.01)], 0.030, 0xd08c91, { roughness: 0.8 });
    bm.userData.bandaModeratrice = true; out.bandaModeratrice = bm; pap.add(bm);
    out.papillari = pap; G.add(pap);
    // piano atrio-ventricolare e atri
    const qRA = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.5, 0.15));
    const ra = ellips(V3(-0.40, 0.36, 0.12), 0.31, 0.27, 0.27, cAtr, null, qRA);      // atrio destro
    const raAur = ellips(V3(-0.22, 0.42, 0.38), 0.13, 0.09, 0.10, cAtr, null, new THREE.Quaternion().setFromEuler(new THREE.Euler(0, 0.6, 0.3))); // auricola destra
    const la = ellips(V3(0.20, 0.36, -0.34), 0.30, 0.25, 0.28, cAtr, null, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.1, 0.4, -0.2))); // atrio sinistro
    const laAur = ellips(V3(0.48, 0.34, 0.06), 0.12, 0.07, 0.09, cAtr, null, new THREE.Quaternion().setFromEuler(new THREE.Euler(0.2, -0.3, 0.5)));  // auricola sinistra
    [ra, raAur, la, laAur].forEach(m => G.add(m)); out.atri = { ra, la };

    // vene cave e vene polmonari
    G.add(tube([V3(-0.40, 0.55, 0.10), V3(-0.40, 0.80, 0.07), V3(-0.38, 1.10, 0.03)], 0.085, cVen));               // cava superiore
    G.add(tube([V3(-0.44, 0.20, -0.02), V3(-0.50, -0.10, -0.20), V3(-0.56, -0.42, -0.36)], 0.095, cVen));           // cava inferiore
    [[0.06, 0.48, -0.56], [0.36, 0.48, -0.60], [0.02, 0.24, -0.60], [0.34, 0.22, -0.62]].forEach(p => G.add(tube([V3(p[0] * 0.6 + 0.1, p[1], -0.40), V3(p[0], p[1], p[2]), V3(p[0] * 1.15 - 0.03, p[1] + 0.02, p[2] - 0.18)], 0.045, cVen)));

    // aorta: radice centrale, ascendente verso l'alto e in avanti, arco verso sinistra e indietro
    const aoRoot = V3(-0.02, 0.22, 0.06);
    G.add(tube([aoRoot, V3(-0.06, 0.48, 0.16), V3(-0.12, 0.78, 0.22), V3(-0.10, 1.06, 0.20), V3(0.06, 1.24, 0.08), V3(0.26, 1.20, -0.14), V3(0.32, 0.98, -0.34), V3(0.30, 0.60, -0.46), V3(0.28, 0.20, -0.52)], 0.095, cArt));
    G.add(ellips(aoRoot, 0.145, 0.115, 0.145, cArt));                                                                     // seni di Valsalva
    [[-0.02, 1.22, 0.04, -0.04, 1.55, 0.02], [0.08, 1.24, -0.02, 0.10, 1.58, -0.06], [0.18, 1.22, -0.10, 0.22, 1.54, -0.16]].forEach(v => G.add(tube([V3(v[0], v[1], v[2]), V3(v[3], v[4], v[5])], 0.032, cArt)));   // tronchi sovraortici
    // tronco polmonare: nasce dal tratto di efflusso, passa davanti all'aorta e si biforca
    G.add(tube([V3(-0.26, 0.32, 0.46), V3(-0.18, 0.62, 0.48), V3(-0.02, 0.86, 0.36), V3(0.12, 0.98, 0.12)], 0.085, cVen));
    G.add(tube([V3(0.12, 0.98, 0.12), V3(0.36, 1.02, -0.06), V3(0.62, 0.98, -0.20)], 0.055, cVen));                 // arteria polmonare sinistra
    G.add(tube([V3(0.12, 0.98, 0.12), V3(-0.14, 1.02, -0.02), V3(-0.46, 0.96, -0.10)], 0.055, cVen));               // arteria polmonare destra, passa dietro l'aorta

    // albero coronarico
    Object.keys(CORO).forEach(id => {
      const c = CORO[id];
      const m = tube(c.via.map(v => v.length === 4 ? V3(v[0], v[1], v[2]) : P(v[0], v[1], v[2])), c.r, c.vena ? cVena : cCoro, { roughness: 0.45, metalness: 0.08 });
      m.userData.id = id; out.coro[id] = m; G.add(m);
    });
    // ostii coronarici sui seni di Valsalva
    [[0.09, 0.24, 0.00], [-0.12, 0.24, 0.15]].forEach(p => { const o = new THREE.Mesh(new THREE.SphereGeometry(0.034, 14, 10), mat(cCoro, { roughness: 0.45 })); o.position.set(p[0], p[1], p[2]); G.add(o); });
    // trasparenza globale
    if (opt.opacity != null) setOpacity(out, opt.opacity);
    return out;
  }
  function setOpacity(h, v) {
    h.group.traverse(o => { if (o.isMesh) { o.material.transparent = v < 0.999; o.material.opacity = v; o.material.depthWrite = v > 0.6; o.material.needsUpdate = true; } });
  }
  root.ISO_CUORE = { build, setOpacity, SEG, CORO, FIGLI, aValle, P, R, PLV, Pendo, spessVS, spessLoc };
})(typeof window !== 'undefined' ? window : this);
