/* =====================================================================
   CORONARIE — albero coronarico 3D, occlusione e fronte d'onda
   Coordinate: X sinistra del paziente, Y craniale, Z anteriore.
   Piano atrio-ventricolare all'origine, apice verso (0.55, -0.72, 0.43).
   ===================================================================== */
(function () {
  const V3 = (x, y, z) => new THREE.Vector3(x, y, z);

  /* ---------- sistema di riferimento del cuore ---------- */
  const K = V3(0.55, -0.72, 0.43).normalize();              // base -> apice
  const A = V3(0, 0, 1).projectOnPlane(K).normalize();      // anteriore
  const B = new THREE.Vector3().crossVectors(K, A).normalize(); // sinistra del paziente
  const L = 1.30, RB = 0.46;                                 // lunghezza e raggio basale

  // raggio del ventricolo sinistro alla quota s (0 = piano AV, 1 = apice)
  const rad = s => { const u = Math.min(1, Math.max(0, s)); return RB * Math.sqrt(Math.max(0, 1 - Math.pow(u, 2.4))) * (1 - 0.12 * u); };
  // punto sulla superficie: s quota, th azimut in gradi dal solco interventricolare anteriore
  function P(s, th, off) {
    const r = rad(s) + (off || 0), a = th * Math.PI / 180;
    return new THREE.Vector3()
      .addScaledVector(K, s * L)
      .addScaledVector(A, r * Math.cos(a))
      .addScaledVector(B, r * Math.sin(a));
  }

  /* ---------- geometria del miocardio a 17 segmenti ---------- */
  // ordine standard AHA a partire dal solco anteriore, in senso antiorario visto dall'apice
  const SEG = [];
  const nomi = ['anteriore', 'anterosettale', 'inferosettale', 'inferiore', 'inferolaterale', 'anterolaterale'];
  for (let i = 0; i < 6; i++) SEG.push({ n: i + 1, nome: 'Basale ' + nomi[i], s0: 0.06, s1: 0.38, t0: -30 + i * 60, t1: 30 + i * 60 });
  for (let i = 0; i < 6; i++) SEG.push({ n: i + 7, nome: 'Medio ' + nomi[i], s0: 0.38, s1: 0.70, t0: -30 + i * 60, t1: 30 + i * 60 });
  ['anteriore', 'settale', 'inferiore', 'laterale'].forEach((nm, i) => SEG.push({ n: i + 13, nome: 'Apicale ' + nm, s0: 0.70, s1: 0.92, t0: -45 + i * 90, t1: 45 + i * 90 }));
  SEG.push({ n: 17, nome: 'Apice', s0: 0.92, s1: 1.0, t0: 0, t1: 360 });

  function patch(sg) {
    const ns = 8, nt = Math.max(6, Math.round((sg.t1 - sg.t0) / 8));
    const pos = [], idx = [];
    for (let i = 0; i <= ns; i++) {
      const s = sg.s0 + (sg.s1 - sg.s0) * i / ns;
      for (let j = 0; j <= nt; j++) {
        const th = sg.t0 + (sg.t1 - sg.t0) * j / nt;
        const p = P(s, th, 0);
        pos.push(p.x, p.y, p.z);
      }
    }
    for (let i = 0; i < ns; i++) for (let j = 0; j < nt; j++) {
      const a = i * (nt + 1) + j, b = a + 1, c = a + nt + 1, d = c + 1;
      idx.push(a, c, b, b, c, d);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  }

  /* ---------- albero coronarico ---------- */
  // ogni ramo: percorso sulla superficie [s, azimut, scostamento], calibro, figli
  const ALBERO = {
    lm: {
      nome: 'Tronco comune', sigla: 'LM', r: 0.030,
      via: [[0.02, -18, 0.06], [0.05, 8, 0.07], [0.08, 22, 0.07]],
      figli: ['lad1', 'cx1']
    },
    lad1: {
      nome: 'Discendente anteriore prossimale', sigla: 'LAD prossimale', r: 0.024,
      via: [[0.08, 22, 0.07], [0.14, 6, 0.05], [0.24, -2, 0.04], [0.34, -4, 0.04]],
      figli: ['s1', 'd1', 'lad2']
    },
    lad2: {
      nome: 'Discendente anteriore media', sigla: 'LAD media', r: 0.019,
      via: [[0.34, -4, 0.04], [0.46, -4, 0.035], [0.58, -3, 0.03]],
      figli: ['s2', 'd2', 'lad3']
    },
    lad3: {
      nome: 'Discendente anteriore distale', sigla: 'LAD distale', r: 0.014,
      via: [[0.58, -3, 0.03], [0.72, -2, 0.025], [0.88, 0, 0.02], [0.99, 120, 0.02]],
      figli: []
    },
    s1: { nome: 'Prima settale', sigla: 'S1', r: 0.013, via: [[0.22, -2, 0.04], [0.26, -26, -0.04], [0.30, -40, -0.12]], figli: [] },
    s2: { nome: 'Seconda settale', sigla: 'S2', r: 0.010, via: [[0.46, -4, 0.035], [0.50, -26, -0.05], [0.54, -38, -0.12]], figli: [] },
    d1: { nome: 'Prima diagonale', sigla: 'D1', r: 0.016, via: [[0.30, -3, 0.04], [0.36, 26, 0.05], [0.46, 52, 0.05], [0.56, 66, 0.04]], figli: [] },
    d2: { nome: 'Seconda diagonale', sigla: 'D2', r: 0.013, via: [[0.52, -3, 0.03], [0.58, 24, 0.04], [0.68, 46, 0.035]], figli: [] },
    cx1: {
      nome: 'Circonflessa prossimale', sigla: 'LCx prossimale', r: 0.022,
      via: [[0.08, 22, 0.07], [0.07, 54, 0.08], [0.07, 84, 0.08], [0.08, 110, 0.08]],
      figli: ['om1', 'cx2']
    },
    cx2: {
      nome: 'Circonflessa distale', sigla: 'LCx distale', r: 0.016,
      via: [[0.08, 110, 0.08], [0.09, 140, 0.08], [0.10, 166, 0.07]],
      figli: ['om2', 'pla']
    },
    om1: { nome: 'Primo marginale ottuso', sigla: 'OM1', r: 0.016, via: [[0.08, 100, 0.08], [0.22, 104, 0.06], [0.40, 106, 0.05], [0.56, 108, 0.04]], figli: [] },
    om2: { nome: 'Secondo marginale ottuso', sigla: 'OM2', r: 0.013, via: [[0.09, 140, 0.08], [0.24, 140, 0.06], [0.42, 138, 0.045]], figli: [] },
    pla: { nome: 'Postero-laterale sinistra', sigla: 'PLA', r: 0.012, via: [[0.10, 166, 0.07], [0.26, 172, 0.05], [0.42, 176, 0.04]], figli: [] },
    rca1: {
      nome: 'Coronaria destra prossimale', sigla: 'RCA prossimale', r: 0.024,
      via: [[0.02, -40, 0.07], [0.04, -62, 0.08], [0.06, -86, 0.08]],
      figli: ['cono', 'nsa', 'rca2']
    },
    rca2: {
      nome: 'Coronaria destra media', sigla: 'RCA media', r: 0.021,
      via: [[0.06, -86, 0.08], [0.07, -112, 0.08], [0.08, -140, 0.08]],
      figli: ['am', 'rca3']
    },
    rca3: {
      nome: 'Coronaria destra distale, crux', sigla: 'RCA distale', r: 0.018,
      via: [[0.08, -140, 0.08], [0.09, -162, 0.07], [0.10, -182, 0.07]],
      figli: ['nav', 'pda', 'plv']
    },
    cono: { nome: 'Ramo del cono', sigla: 'Cono', r: 0.010, via: [[0.03, -48, 0.08], [0.10, -36, 0.10], [0.18, -26, 0.11]], figli: [] },
    nsa: { nome: 'Ramo del nodo del seno', sigla: 'Nodo del seno', r: 0.011, via: [[0.04, -66, 0.08], [-0.06, -74, 0.10], [-0.16, -76, 0.12]], figli: [] },
    am: { nome: 'Marginale acuto', sigla: 'Marginale acuto', r: 0.014, via: [[0.07, -116, 0.08], [0.24, -118, 0.07], [0.44, -118, 0.05]], figli: [] },
    nav: { nome: 'Ramo del nodo atrio-ventricolare', sigla: 'Nodo AV', r: 0.009, via: [[0.10, -182, 0.07], [0.06, -196, 0.04], [0.02, -204, 0.0]], figli: [] },
    pda: { nome: 'Discendente posteriore', sigla: 'PDA', r: 0.016, via: [[0.10, -182, 0.07], [0.30, -182, 0.05], [0.56, -181, 0.04], [0.82, -180, 0.03]], figli: [] },
    plv: { nome: 'Postero-laterale destra', sigla: 'PLV', r: 0.012, via: [[0.10, -186, 0.07], [0.22, -206, 0.06], [0.34, -220, 0.05]], figli: [] }
  };
  const RADICI = { lm: ['lm', 'lad1', 'lad2', 'lad3', 's1', 's2', 'd1', 'd2', 'cx1', 'cx2', 'om1', 'om2', 'pla'], rca: ['rca1', 'rca2', 'rca3', 'cono', 'nsa', 'am', 'nav', 'pda', 'plv'] };

  function aValle(id) {
    const out = [id]; (ALBERO[id].figli || []).forEach(f => out.push(...aValle(f))); return out;
  }

  /* ---------- conseguenze dell'occlusione ---------- */
  // seg: segmenti del ventricolo sinistro perfusi; vd: quota di ventricolo destro; rischio: % di massa del VS
  const OCCL = {
    lm: { seg: [1, 2, 5, 6, 7, 8, 11, 12, 13, 14, 16, 17], vd: 0, rischio: 45, tipo: 'Infarto anteriore esteso con coinvolgimento laterale', ecg: 'Sopraslivellamento in aVR maggiore che in V1, con sottoslivellamento diffuso in 8 o più derivazioni: è il quadro dell\u2019occlusione del tronco comune o della malattia trivasale. Se l\u2019occlusione è completa, sopraslivellamento da V1 a V6 con I e aVL.', rec: 'Sottoslivellamento in DII, DIII e aVF', comp: 'Shock cardiogeno, blocco di branca di nuova insorgenza, edema polmonare, tachicardia e fibrillazione ventricolare. Mortalità altissima senza riperfusione immediata.', q: 'stemi-anteriore' },
    lad1: { seg: [1, 2, 7, 8, 13, 14, 17], vd: 0, rischio: 35, tipo: 'Infarto anteriore esteso (antero-settale-apicale)', ecg: 'Sopraslivellamento da V1 a V4, spesso fino a V5-V6, con I e aVL quando è coinvolta la prima diagonale.', rec: 'Sottoslivellamento in DII, DIII e aVF', comp: 'Blocco di branca destra ed emiblocco anteriore per l\u2019ischemia dei fascicoli, blocco atrio-ventricolare di sede infranodale, shock cardiogeno, trombo apicale, rottura di setto in fase subacuta.', q: 'stemi-anteriore' },
    lad2: { seg: [1, 7, 8, 13, 14, 17], vd: 0, rischio: 25, tipo: 'Infarto anteriore', ecg: 'Sopraslivellamento da V2 a V5, senza il coinvolgimento di aVL tipico dell\u2019occlusione prossimale.', rec: 'Modeste alterazioni speculari inferiori', comp: 'Disfunzione sistolica, aritmie ventricolari nelle prime ore.', q: 'stemi-anteriore' },
    lad3: { seg: [13, 14, 17], vd: 0, rischio: 12, tipo: 'Infarto apicale', ecg: 'Sopraslivellamento in V3-V4 e nelle derivazioni apicali; a volte solo T iperacute seguite da inversione.', rec: 'Spesso assenti', comp: 'Area piccola, ma l\u2019apice è la sede tipica del trombo endoventricolare.', q: 'stemi-anteriore' },
    s1: { seg: [2, 8, 14], vd: 0, rischio: 7, tipo: 'Infarto settale', ecg: 'Sopraslivellamento in V1-V2 con perdita della r iniziale.', rec: 'Nessuna', comp: 'Blocco di branca destra ed emiblocco anteriore: la prima settale irrora la porzione prossimale di entrambi.', q: 'stemi-anteriore' },
    d1: { seg: [1, 6, 12], vd: 0, rischio: 9, tipo: 'Infarto laterale alto', ecg: 'Sopraslivellamento in DI e aVL, a volte in V2 isolatamente (pattern South African flag).', rec: 'Sottoslivellamento in DIII e aVF', comp: 'Area limitata, ma spesso sottodiagnosticato perché le derivazioni coinvolte sono poche.', q: 'stemi-laterale' },
    d2: { seg: [6, 12], vd: 0, rischio: 6, tipo: 'Infarto laterale', ecg: 'Alterazioni in DI, aVL e V5-V6, spesso modeste.', rec: 'Speculari inferiori lievi', comp: 'Quadro spesso silente sull\u2019ECG.', q: 'stemi-laterale' },
    s2: { seg: [8, 14], vd: 0, rischio: 5, tipo: 'Infarto settale medio', ecg: 'Alterazioni in V2-V3.', rec: 'Nessuna', comp: 'Disturbi di conduzione intraventricolare.', q: 'stemi-anteriore' },
    cx1: { seg: [5, 6, 11, 12, 16], vd: 0, rischio: 22, tipo: 'Infarto laterale e posteriore', ecg: 'Sopraslivellamento in DI, aVL, V5 e V6. Se prevale il coinvolgimento posteriore, l\u2019ECG standard può mostrare solo sottoslivellamento in V1-V3 con R alte: servono V7-V9.', rec: 'Sottoslivellamento in V1-V3, immagine speculare della parete posteriore', comp: 'È l\u2019infarto più spesso non riconosciuto. Nella dominanza sinistra può dare blocco atrio-ventricolare. Rigurgito mitralico da disfunzione del papillare postero-mediale.', q: 'stemi-posteriore' },
    cx2: { seg: [11, 16], vd: 0, rischio: 12, tipo: 'Infarto postero-laterale', ecg: 'Sottoslivellamento in V1-V3 con R dominante; sopraslivellamento in V7-V9.', rec: 'Speculari anteriori', comp: 'Come sopra, con area minore.', q: 'stemi-posteriore' },
    om1: { seg: [5, 6, 11], vd: 0, rischio: 11, tipo: 'Infarto laterale', ecg: 'Sopraslivellamento in DI, aVL, V5-V6.', rec: 'Sottoslivellamento inferiore', comp: 'Disfunzione del muscolo papillare postero-mediale.', q: 'stemi-laterale' },
    om2: { seg: [11, 16], vd: 0, rischio: 8, tipo: 'Infarto laterale basso', ecg: 'Alterazioni in V5-V6 e DI.', rec: 'Lievi', comp: 'Area limitata.', q: 'stemi-laterale' },
    pla: { seg: [4, 10, 15], vd: 0, rischio: 9, tipo: 'Infarto infero-laterale (dominanza sinistra)', ecg: 'Sopraslivellamento in DII, DIII e aVF con coinvolgimento laterale.', rec: 'Sottoslivellamento in DI e aVL', comp: 'Nella dominanza sinistra l\u2019occlusione coinvolge anche il nodo atrio-ventricolare.', q: 'stemi-inferiore' },
    rca1: { seg: [3, 4, 9, 10, 15], vd: 1, rischio: 25, tipo: 'Infarto inferiore con estensione al ventricolo destro', ecg: 'Sopraslivellamento in DII, DIII e aVF con DIII maggiore di DII: è il segno che l\u2019arteria colpevole è la destra e non la circonflessa. Sopraslivellamento in V1 e soprattutto in V4R: derivazioni destre obbligatorie.', rec: 'Sottoslivellamento in DI e aVL', comp: 'Bradicardia e blocco atrio-ventricolare di sede nodale, di solito reversibile e responsivo all\u2019atropina; ipotensione da infarto destro, in cui i nitrati sono controindicati e serve carico di volume; fibrillazione atriale se è coinvolto il ramo del nodo del seno.', q: 'stemi-inferiore' },
    rca2: { seg: [4, 10, 15], vd: 0.6, rischio: 18, tipo: 'Infarto inferiore', ecg: 'Sopraslivellamento in DII, DIII e aVF, DIII maggiore di DII.', rec: 'Sottoslivellamento in DI e aVL', comp: 'Blocco atrio-ventricolare nodale, bradicardia, estensione destra possibile.', q: 'stemi-inferiore' },
    rca3: { seg: [4, 10, 15], vd: 0.2, rischio: 14, tipo: 'Infarto inferiore con blocco atrio-ventricolare', ecg: 'Sopraslivellamento inferiore; il blocco atrio-ventricolare è frequente perché il ramo del nodo AV nasce dalla crux.', rec: 'Sottoslivellamento in DI e aVL', comp: 'Blocco atrio-ventricolare di secondo e terzo grado a QRS stretto, scappamento giunzionale affidabile, di regola transitorio.', q: 'stemi-inferiore' },
    pda: { seg: [3, 4, 9, 10, 15], vd: 0.2, rischio: 12, tipo: 'Infarto infero-settale', ecg: 'Sopraslivellamento in DII, DIII, aVF con coinvolgimento del setto inferiore.', rec: 'Speculari in DI e aVL', comp: 'Rottura del setto interventricolare nella porzione inferiore, complicanza rara ma drammatica in terza-quinta giornata.', q: 'stemi-inferiore' },
    plv: { seg: [5, 11], vd: 0.1, rischio: 7, tipo: 'Infarto infero-laterale', ecg: 'Alterazioni in DII, DIII, aVF e V5-V6.', rec: 'Lievi anteriori', comp: 'Area piccola.', q: 'stemi-inferiore' },
    am: { seg: [], vd: 1, rischio: 3, tipo: 'Infarto del ventricolo destro isolato', ecg: 'Sopraslivellamento in V4R; sull\u2019ECG standard può non vedersi nulla o solo in V1.', rec: 'Nessuna', comp: 'Ipotensione, giugulari turgide con polmoni liberi, sensibilità al carico di volume.', q: 'stemi-inferiore' },
    cono: { seg: [], vd: 0.4, rischio: 2, tipo: 'Ischemia del tratto di efflusso destro', ecg: 'Di regola silente. Il ramo del cono è una fonte importante di circoli collaterali verso la discendente anteriore.', rec: 'Nessuna', comp: 'Perdita di un collaterale importante.', q: 'stemi-inferiore' },
    nsa: { seg: [], vd: 0, rischio: 1, tipo: 'Ischemia del nodo del seno', ecg: 'Bradicardia sinusale, arresto sinusale, blocco seno-atriale, fibrillazione atriale.', rec: 'Nessuna', comp: 'Aritmie atriali nella fase acuta dell\u2019infarto inferiore.', q: 'bsa2t2' },
    s3: { seg: [14, 17], vd: 0, rischio: 3, tipo: 'Infarto settale apicale', ecg: 'Alterazioni modeste in V3-V4.', rec: 'Nessuna', comp: 'Area piccola.', q: 'stemi-anteriore' },
    ri: { seg: [6, 12, 16], vd: 0, rischio: 9, tipo: 'Infarto laterale (ramo intermedio)', ecg: 'Sopraslivellamento in DI, aVL, V5-V6.', rec: 'Sottoslivellamento in DIII e aVF', comp: 'Il ramo intermedio è presente in circa un terzo dei cuori: quando c\u2019è, irrora la parete laterale come una diagonale o un marginale.', q: 'stemi-laterale' },
    am2: { seg: [], vd: 0.5, rischio: 2, tipo: 'Infarto del ventricolo destro', ecg: 'Sopraslivellamento in V4R, poco o nulla sull\u2019ECG standard.', rec: 'Nessuna', comp: 'Ipotensione se estesa.', q: 'stemi-inferiore' },
    rvb: { seg: [], vd: 0.4, rischio: 2, tipo: 'Ischemia della parete anteriore del ventricolo destro', ecg: 'Sopraslivellamento in V1 e V3R-V4R.', rec: 'Nessuna', comp: 'Di regola ben tollerata.', q: 'stemi-inferiore' },
    sp1: { seg: [3, 9], vd: 0, rischio: 4, tipo: 'Infarto settale inferiore', ecg: 'Alterazioni in DIII e aVF con onde Q settali inferiori.', rec: 'Speculari in aVL', comp: 'Blocco atrio-ventricolare se coinvolto il nodo.', q: 'stemi-inferiore' },
    sp2: { seg: [9, 14], vd: 0, rischio: 3, tipo: 'Infarto settale inferiore distale', ecg: 'Alterazioni modeste inferiori.', rec: 'Nessuna', comp: 'Area piccola.', q: 'stemi-inferiore' },
    nav: { seg: [], vd: 0, rischio: 1, tipo: 'Ischemia del nodo atrio-ventricolare', ecg: 'Blocco atrio-ventricolare di primo, secondo tipo 1 o terzo grado, con QRS stretto e scappamento giunzionale.', rec: 'Nessuna', comp: 'Di regola transitorio e responsivo all\u2019atropina: raramente serve il pacemaker definitivo.', q: 'wenck' }
  };

  /* ---------- fronte d'onda della necrosi ---------- */
  // frazione dell'area a rischio già necrotica, dati sperimentali di Reimer e Jennings
  const ONDA = [[0, 0, 'Nessuna necrosi: ischemia reversibile, il miocardio è stordito ma vivo'],
  [20, 0.05, 'Prime cellule subendocardiche: la necrosi comincia dallo strato più interno, quello con la pressione di parete più alta e la perfusione peggiore'],
  [40, 0.35, 'Necrosi subendocardica estesa, ancora in gran parte salvabile'],
  [60, 0.5, 'Il fronte avanza verso l\u2019epicardio'],
  [180, 0.66, 'Necrosi che occupa i due terzi dello spessore'],
  [360, 0.8, 'Necrosi quasi transmurale'],
  [720, 0.9, 'Necrosi transmurale in quasi tutta l\u2019area a rischio'],
  [1440, 0.97, 'Necrosi completa dell\u2019area a rischio']];
  function frazione(min) {
    if (min <= 0) return 0;
    for (let i = 1; i < ONDA.length; i++) {
      if (min <= ONDA[i][0]) {
        const a = ONDA[i - 1], b = ONDA[i], u = (min - a[0]) / (b[0] - a[0]);
        return a[1] + (b[1] - a[1]) * u;
      }
    }
    return 0.97;
  }
  function testoOnda(min) { let t = ONDA[0][2]; ONDA.forEach(o => { if (min >= o[0]) t = o[2]; }); return t; }

  /* ---------- scena ---------- */
  let sc, cam, ren, root, segMesh = {}, ramiMesh = {}, lbl = [], raf = 0, inited = false;
  let rot = { x: -0.22, y: 0.7 }, dist = 3.25, occl = null, minuti = 0;
  let asse = null, pos = 0, disco = null;   // percorso corrente, posizione del piano di sezione, mesh

  /* ---------- piano di sezione scorrevole lungo il vaso ----------
     Il vaso scelto viene campionato punto per punto e misurato in lunghezza
     reale. Il piano nero è un tappo perpendicolare all'asse del vaso: dove si
     ferma, tutto ciò che sta a valle si chiude, e i rami che nascono prima
     restano perfusi. È la differenza fra occludere la LAD prima o dopo la
     prima settale. */
  const V_LAD = ['lad1', 'lad2', 'lad3'], V_CX = ['cx1', 'cx2'], V_RCA = ['rca1', 'rca2', 'rca3'];
  const ASSI = { lad1: V_LAD, lad2: V_LAD, lad3: V_LAD, cx1: V_CX, cx2: V_CX, rca1: V_RCA, rca2: V_RCA, rca3: V_RCA, pda: ['pda'] };
  const NOMI = {
    ri: ['Ramo intermedio', 'RI'], s3: ['Terza settale', 'S3'], am2: ['Secondo marginale acuto', 'AM2'],
    rvb: ['Ramo ventricolare destro', 'RVB'], sp1: ['Prima settale posteriore', 'SP1'], sp2: ['Seconda settale posteriore', 'SP2']
  };
  const nomeDi = id => (ALBERO[id] && ALBERO[id].nome) || (NOMI[id] && NOMI[id][0]) || id;
  const siglaDi = id => (ALBERO[id] && ALBERO[id].sigla) || (NOMI[id] && NOMI[id][1]) || id;

  const puntoVia = v => v.length === 4 ? new THREE.Vector3(v[0], v[1], v[2]) : ISO_CUORE.P(v[0], v[1], v[2]);

  function costruisciAsse(ids) {
    const pts = [];
    ids.forEach(id => {
      const c = new THREE.CatmullRomCurve3(ISO_CUORE.CORO[id].via.map(puntoVia), false, 'centripetal');
      for (let i = pts.length ? 1 : 0; i <= 48; i++) pts.push({ p: c.getPoint(i / 48), id: id });
    });
    let L = 0; pts[0].d = 0;
    for (let i = 1; i < pts.length; i++) { L += pts[i].p.distanceTo(pts[i - 1].p); pts[i].d = L; }
    pts.forEach(q => q.u = L ? q.d / L : 0);
    const inizio = {}, ostii = {};
    ids.forEach(id => { const q = pts.find(x => x.id === id); inizio[id] = q ? q.u : 0; });
    // ostio di ogni collaterale: punto dell'asse più vicino al suo primo punto
    const F = ISO_CUORE.FIGLI || {};
    ids.forEach(id => (F[id] || []).forEach(f => {
      if (ids.indexOf(f) >= 0 || !ISO_CUORE.CORO[f]) return;
      const p0 = puntoVia(ISO_CUORE.CORO[f].via[0]);
      let bu = inizio[id], bd = Infinity;
      pts.forEach(q => { const d = q.p.distanceToSquared(p0); if (d < bd) { bd = d; bu = q.u; } });
      ostii[f] = bu;
    }));
    return { ids: ids, pts: pts, lung: L, inizio: inizio, ostii: ostii };
  }

  function campionaA(u) {
    const pts = asse.pts;
    let i = 1; while (i < pts.length - 1 && pts[i].u < u) i++;
    const a = pts[i - 1], b = pts[i];
    const k = b.u > a.u ? (u - a.u) / (b.u - a.u) : 0;
    return {
      p: a.p.clone().lerp(b.p, k),
      t: b.p.clone().sub(a.p).normalize(),
      id: k > 0.5 ? b.id : a.id
    };
  }

  /* Stato dell'occlusione tenendo conto di dove si trova il morsetto:
     segmento colpito, collaterali risparmiati, territorio e rischio residui. */
  function sede() {
    if (!occl) return null;
    const base = OCCL[occl];
    if (!asse || !base) return base ? { id: occl, o: base, risp: [], chiusi: ISO_CUORE.aValle(occl), seg: base.seg, rischio: base.rischio, vd: base.vd } : null;
    const c = campionaA(pos), id = ISO_CUORE.CORO[c.id] ? c.id : occl;
    const o = OCCL[id] || base;
    const F = ISO_CUORE.FIGLI || {};
    const figli = F[id] || [];
    // rami che nascono a monte del morsetto: restano perfusi, con tutto il loro albero
    const risp = figli.filter(f => asse.ids.indexOf(f) < 0 && asse.ostii[f] != null && asse.ostii[f] < pos - 0.004);
    const salvi = {}; risp.forEach(f => ISO_CUORE.aValle(f).forEach(x => salvi[x] = 1));
    const chiusi = ISO_CUORE.aValle(id).filter(x => !salvi[x]);
    // territorio a rischio: quello del segmento colpito meno i rami risparmiati,
    // più quello di tutti i rami che restano a valle del morsetto
    const fuori = {};
    risp.forEach(f => ((OCCL[f] || {}).seg || []).forEach(n => fuori[n] = 1));
    const dentro = {};
    (o.seg || []).forEach(n => { if (!fuori[n]) dentro[n] = 1; });
    chiusi.forEach(b => { if (b !== id) ((OCCL[b] || {}).seg || []).forEach(n => dentro[n] = 1); });
    const seg = Object.keys(dentro).map(Number).sort((a, b) => a - b);
    // l'area non può scendere sotto quella dei rami che restano occlusi a valle
    const distali = figli.filter(f => risp.indexOf(f) < 0 && OCCL[f]);
    let rischio = o.rischio;
    risp.forEach(f => { if (OCCL[f]) rischio -= OCCL[f].rischio; });
    distali.forEach(f => { rischio = Math.max(rischio, OCCL[f].rischio); });
    const succ = asse.ids[asse.ids.indexOf(id) + 1];
    let vd = o.vd || 0;
    risp.forEach(f => { if (['cono', 'rvb', 'am', 'am2'].indexOf(f) >= 0) vd -= 0.35; });
    if (succ && OCCL[succ]) vd = Math.max(vd, OCCL[succ].vd || 0);
    return { id: id, o: o, risp: risp, chiusi: chiusi, seg: seg, punto: c, rischio: Math.max(2, Math.round(rischio)), vd: Math.max(0, vd) };
  }

  function mostraDisco(st) {
    if (!disco) {
      disco = new THREE.Mesh(new THREE.CircleGeometry(1, 30),
        new THREE.MeshBasicMaterial({ color: 0x05070d, side: THREE.DoubleSide }));
      const anello = new THREE.Mesh(new THREE.RingGeometry(0.97, 1.22, 30),
        new THREE.MeshBasicMaterial({ color: 0xffd166, side: THREE.DoubleSide, transparent: true, opacity: 0.95, depthTest: false }));
      anello.renderOrder = 4; disco.add(anello); root.add(disco);
    }
    if (!st || !st.punto) { disco.visible = false; return; }
    const r = (ISO_CUORE.CORO[st.id] || { r: 0.02 }).r * 2.1;
    disco.visible = true;
    disco.scale.setScalar(r);
    disco.position.copy(st.punto.p);
    disco.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), st.punto.t);
  }

  function makeLabel(t) {
    const c = document.createElement('canvas'), x = c.getContext('2d');
    const f = 'bold 44px system-ui, sans-serif'; x.font = f;
    const w = x.measureText(t).width;
    c.width = w + 28; c.height = 62; x.font = f;
    x.fillStyle = 'rgba(12,16,26,.72)'; x.beginPath(); x.roundRect(0, 0, c.width, c.height, 14); x.fill();
    x.fillStyle = '#ffe3a0'; x.textBaseline = 'middle'; x.fillText(t, 14, 33);
    const tex = new THREE.CanvasTexture(c);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false }));
    sp.scale.set(c.width / 62 * 0.14, 0.14, 1);
    return sp;
  }

  function curva(via) {
    return new THREE.CatmullRomCurve3(via.map(v => P(v[0], v[1], v[2])));
  }

  function build(host) {
    sc = new THREE.Scene();
    cam = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    try { ren = new THREE.WebGLRenderer({ antialias: true, alpha: true }); }
    catch (error) {
      const n = document.createElement('p'); n.className = 'scene-notice'; n.textContent = 'Vista 3D non disponibile. Puoi esplorare territori e spiegazioni con i selettori.'; host.appendChild(n);
      ren = { domElement: document.createElement('canvas'), setPixelRatio() {}, setSize() {}, render() {} };
    }
    ren.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
    host.appendChild(ren.domElement);
    sc.add(new THREE.AmbientLight(0xffffff, 0.75));
    const d1 = new THREE.DirectionalLight(0xffffff, 0.7); d1.position.set(2, 3, 4); sc.add(d1);
    const d2 = new THREE.DirectionalLight(0xffd9c9, 0.35); d2.position.set(-3, -1, -2); sc.add(d2);
    root = new THREE.Group(); sc.add(root);

    const h = ISO_CUORE.build({ opacity: 1 });
    root.add(h.group);
    h.SEG.forEach(sg => { segMesh[sg.n] = h.seg[sg.n]; });
    segMesh.rv = h.rv; h.rv.material.transparent = true; h.rv.material.opacity = 0.5; h.rv.material.depthWrite = false;
    Object.keys(h.coro).forEach(id => { if (!ISO_CUORE.CORO[id].vena) ramiMesh[id] = h.coro[id]; });
    [['LAD', 'lad2'], ['LCx', 'cx1'], ['RCA', 'rca2'], ['PDA', 'pda'], ['D1', 'd1'], ['OM1', 'om1'], ['LM', 'lm']].forEach(([t, id]) => {
      const via = ISO_CUORE.CORO[id].via, v = via[Math.floor(via.length / 2)];
      const p = v.length === 4 ? new THREE.Vector3(v[0], v[1], v[2] + 0.14) : ISO_CUORE.P(v[0], v[1], v[2] + 0.12);
      const sp = makeLabel(t); sp.position.copy(p); root.add(sp); lbl.push(sp);
    });
    inited = true;
  }

  function resize() {
    const host = document.getElementById('corStage'); if (!host || !ren) return;
    const w = host.clientWidth, h = host.clientHeight; if (!w || !h) return;
    ren.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix();
  }
  function draw() {
    cam.position.set(Math.sin(rot.y) * Math.cos(rot.x), Math.sin(rot.x), Math.cos(rot.y) * Math.cos(rot.x)).multiplyScalar(dist);
    cam.lookAt(0, -0.3, 0);
    lbl.forEach(s => s.material.opacity = 0.95);
    ren.render(sc, cam);
  }

  /* ---------- stato e colori ---------- */
  function aggiorna() {
    const st = sede();
    const chiusi = st ? st.chiusi : [];
    Object.keys(ramiMesh).forEach(id => {
      const m = ramiMesh[id];
      const closed = chiusi.indexOf(id) >= 0;
      m.material.color.setHex(closed ? 0x5d6675 : 0xd3283c);
      m.material.opacity = closed ? 0.85 : 1; m.material.transparent = true;
    });
    mostraDisco(st);
    const o = st ? st.o : null;
    const f = frazione(minuti);
    ISO_CUORE.SEG.forEach(sg => {
      const m = segMesh[sg.n];
      const colpito = st && st.seg.indexOf(sg.n) >= 0;
      if (!colpito) { m.material.color.setHex(0xd98f92); m.material.emissive && m.material.emissive.setHex(0x000000); return; }
      // giallo: area a rischio ancora viva; grigio-blu: necrosi
      const vivo = new THREE.Color(0xf2c14e), morto = new THREE.Color(0x4a5568);
      m.material.color.copy(vivo.clone().lerp(morto, f));
    });
    if (segMesh.rv) {
      const q = st ? st.vd : 0;
      segMesh.rv.material.color.copy(new THREE.Color(0xc98a8e).lerp(new THREE.Color(0xf2c14e).lerp(new THREE.Color(0x4a5568), f), q));
    }
    pannello(st, f);
    draw();
  }

  function pannello(st, f) {
    const box = document.getElementById('corOut');
    if (!box) return;
    if (!st) { box.innerHTML = '<p class="note">Scegli un\u2019arteria e un ramo: l\u2019albero a valle si chiude, il territorio colpito si colora e qui compare il tipo di infarto che ne deriva. Poi sposta il punto di occlusione lungo il vaso: il disco nero è la sezione chiusa, e i rami che nascono prima restano perfusi.</p>'; return; }
    const o = st.o;
    const segNomi = st.seg.map(n => (ISO_CUORE.SEG.find(s => s.n === n) || {}).nome).filter(Boolean);
    const perse = Math.round(st.rischio * f);
    box.innerHTML =
      '<h3>' + esc(nomeDi(st.id)) + '</h3>' +
      '<p class="cortipo">' + esc(o.tipo) + '</p>' +
      (st.risp.length ? '<p class="coronda">Il morsetto è a valle dell\u2019origine di ' + esc(st.risp.map(siglaDi).join(', ')) +
        ': quel territorio resta perfuso e fuori dall\u2019area a rischio.</p>' : '') +
      '<p class="note"><b>Modello illustrativo:</b> percentuali e tempi non sono una previsione individuale. Dominanza, collaterali e riperfusione modificano il danno.</p>' +
      '<div class="corgrid"><div><span class="corlab">Area a rischio nel modello</span><b>' + st.rischio + '% del ventricolo sinistro</b></div>' +
      '<div><span class="corlab">Necrosi illustrativa a ' + fmtMin(minuti) + '</span><b>' + Math.round(f * 100) + '% dell\u2019area a rischio, cioè ' + perse + '% del ventricolo</b></div></div>' +
      '<p class="coronda">' + esc(testoOnda(minuti)) + '</p>' +
      '<h4>ECG atteso</h4><p>' + esc(o.ecg) + '</p>' +
      '<h4>Immagini speculari</h4><p>' + esc(o.rec) + '</p>' +
      '<h4>Complicanze da attendersi</h4><p>' + esc(o.comp) + '</p>' +
      (segNomi.length ? '<h4>Segmenti colpiti</h4><p>' + esc(segNomi.join('; ')) + '</p>' : '') +
      (st.vd ? '<p class="note">Coinvolgimento del ventricolo destro: registra sempre V3R e V4R.</p>' : '') +
      '<button class="btn" id="corApri">Apri esempio ECG del territorio (fase acuta)</button>' +
      '<p class="src">Territori secondo il modello a 17 segmenti AHA; corrispondenze arteria-derivazioni da ESC 2023 e dalla quinta definizione universale di infarto; tempi di necrosi dagli studi sperimentali di Reimer e Jennings, indicativi e molto dipendenti dai circoli collaterali.</p>';
    const btn = document.getElementById('corApri');
    if (btn) btn.addEventListener('click', () => { if (window.ISO_OPEN) window.ISO_OPEN(o.q, { fase: '1' }); });
  }
  function fmtMin(m) { return m < 60 ? m + ' minuti' : (m % 60 === 0 ? (m / 60) + ' ore' : Math.floor(m / 60) + ' h ' + (m % 60) + ' min'); }
  function esc(s) { return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])); }

  /* ---------- interfaccia: tre tendine in cascata ---------- */
  // ogni voce occlude subito; scendendo di livello si precisa la sede
  const LIV1 = [['lca', 'Coronaria sinistra (LCA)', 'lm'], ['rca', 'Coronaria destra (RCA)', 'rca1']];
  const LIV2 = {
    lca: [['lm', 'Tronco comune (LM)', 'lm'], ['lad', 'Interventricolare anteriore (LAD)', 'lad1'], ['cx', 'Circonflessa (LCx)', 'cx1']],
    rca: [['tronco', 'Tronco della coronaria destra', 'rca1'], ['cono', 'Ramo del cono', 'cono'], ['nsa', 'Ramo del nodo del seno', 'nsa'],
    ['am', 'Primo marginale acuto', 'am'], ['am2', 'Secondo marginale acuto', 'am2'], ['rvb', 'Ramo ventricolare destro', 'rvb'], ['pda', 'Discendente posteriore (PDA)', 'pda'], ['plv', 'Postero-laterale destra', 'plv'], ['nav', 'Ramo del nodo atrio-ventricolare', 'nav']]
  };
  const LIV3 = {
    lm: [['ri', 'Ramo intermedio']],
    lad: [['lad1', 'Tutta la LAD: occlusione prossimale, prima della prima settale'], ['lad2', 'LAD media, dopo la prima settale'], ['lad3', 'LAD distale, oltre la seconda diagonale'],
    ['s1', 'Prima settale (S1)'], ['s2', 'Seconda settale (S2)'], ['s3', 'Terza settale (S3)'], ['d1', 'Prima diagonale (D1)'], ['d2', 'Seconda diagonale (D2)']],
    cx: [['cx1', 'Tutta la circonflessa: occlusione prossimale'], ['cx2', 'Circonflessa distale'], ['om1', 'Primo marginale ottuso (OM1)'], ['om2', 'Secondo marginale ottuso (OM2)'], ['pla', 'Postero-laterale sinistra (PLA)']],
    tronco: [['rca1', 'Tutta la destra: occlusione prossimale'], ['rca2', 'Tratto medio, dopo il marginale acuto'], ['rca3', 'Tratto distale, alla crux']],
    pda: [['sp1', 'Prima settale posteriore'], ['sp2', 'Seconda settale posteriore']],
    cono: [], nsa: [], am: [], am2: [], rvb: [], plv: [], nav: []
  };
  let l1 = '', l2 = '';
  function riempi(sel, voci, ph) {
    sel.innerHTML = '<option value="">' + ph + '</option>';
    voci.forEach(v => { const o = document.createElement('option'); o.value = v[0]; o.textContent = v[1]; sel.appendChild(o); });
    sel.disabled = voci.length === 0;
  }
  function setOccl(id) {
    occl = id || null;
    asse = null; pos = 0;
    if (occl && ISO_CUORE.CORO[occl]) {
      asse = costruisciAsse(ASSI[occl] || [occl]);
      pos = Math.min(0.995, (asse.inizio[occl] || 0) + 0.012);   // appena dentro il segmento scelto
    }
    sincSlider();
    aggiorna();
  }
  function sincSlider() {
    const sl = document.getElementById('corPos'), out = document.getElementById('corPosOut');
    if (!sl) return;
    sl.disabled = !asse;
    sl.value = Math.round(pos * 1000);
    if (out) out.textContent = etichettaPos();
  }
  function etichettaPos() {
    if (!asse) return '—';
    const st = sede();
    if (!st) return '—';
    const mm = (pos * asse.lung * 60).toFixed(0);   // il cuore del modello è alto ~1.3 unità ≈ 8 cm
    return siglaDi(st.id) + ' · ' + mm + ' mm dall\u2019ostio';
  }
  function initSel() {
    const a = document.getElementById('corArt'), b = document.getElementById('corVaso'), c = document.getElementById('corSede');
    riempi(b, [], '— tutta l\u2019arteria —'); riempi(c, [], '— tutto il vaso —');
    a.addEventListener('change', e => {
      l1 = e.target.value; l2 = '';
      const v = LIV1.find(x => x[0] === l1);
      riempi(b, l1 ? LIV2[l1] : [], '— tutta l\u2019arteria —');
      riempi(c, [], '— tutto il vaso —');
      setOccl(v ? v[2] : null);
    });
    b.addEventListener('change', e => {
      l2 = e.target.value;
      const v = (LIV2[l1] || []).find(x => x[0] === l2);
      riempi(c, l2 ? (LIV3[l2] || []) : [], '— tutto il vaso —');
      if (v) setOccl(v[2]);
      else { const r = LIV1.find(x => x[0] === l1); setOccl(r ? r[2] : null); }
    });
    c.addEventListener('change', e => {
      if (e.target.value) setOccl(e.target.value);
      else { const v = (LIV2[l1] || []).find(x => x[0] === l2); setOccl(v ? v[2] : null); }
    });
  }

  function init() {
    const host = document.getElementById('corStage');
    if (!inited) {
      build(host);
      const pointers = new Map(); let pinch = null;
      host.addEventListener('pointerdown', e => {
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); host.setPointerCapture(e.pointerId);
        if (pointers.size === 2) { const a = [...pointers.values()]; pinch = { d: Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y) || 1, dist }; }
      });
      host.addEventListener('pointermove', e => {
        const prev = pointers.get(e.pointerId); if (!prev) return;
        pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
        if (pointers.size === 1) { rot.y -= (e.clientX - prev.x) * 0.008; rot.x = Math.max(-1.3, Math.min(1.3, rot.x + (e.clientY - prev.y) * 0.006)); }
        else if (pinch) { const a = [...pointers.values()]; dist = Math.max(2.2, Math.min(8, pinch.dist * pinch.d / (Math.hypot(a[0].x-a[1].x, a[0].y-a[1].y) || 1))); }
        draw();
      });
      const end = e => { pointers.delete(e.pointerId); if (pointers.size < 2) pinch = null; };
      host.addEventListener('pointerup', end); host.addEventListener('pointercancel', end);
      host.addEventListener('wheel', e => { e.preventDefault(); dist = Math.max(2.2, Math.min(8, dist + e.deltaY * 0.004)); draw(); }, { passive: false });
      initSel();
      const sl = document.getElementById('corTempo');
      sl.addEventListener('input', e => { minuti = +e.target.value; document.getElementById('corTempoOut').textContent = fmtMin(minuti); aggiorna(); });
      const sp = document.getElementById('corPos');
      sp.addEventListener('input', e => {
        if (!asse) return;
        pos = Math.min(0.995, Math.max(0.005, (+e.target.value) / 1000));
        document.getElementById('corPosOut').textContent = etichettaPos();
        aggiorna();
      });
      document.getElementById('corReset').addEventListener('click', () => {
        occl = null; minuti = 0; l1 = ''; l2 = ''; sl.value = 0; asse = null; pos = 0;
        sincSlider();
        document.getElementById('corTempoOut').textContent = '0 minuti';
        document.getElementById('corArt').value = '';
        riempi(document.getElementById('corVaso'), [], '— tutta l\u2019arteria —');
        riempi(document.getElementById('corSede'), [], '— tutto il vaso —');
        aggiorna();
      });
      if (window.ResizeObserver) new ResizeObserver(() => { resize(); draw(); }).observe(host);
    }
    resize(); aggiorna();
  }
  window.ISO_CORONARIE = { init, resize: () => { resize(); draw(); } };
})();
