/* Isoelettrica — Casi clinici: logica e interfaccia.
   Modulo separato: legge scenari e monitor tramite window.ISO_APP e non modifica
   né il motore ECG né i dati clinici dell'app. Il tracciato di ogni fase è
   generato dal motore con gli scenari esistenti e cambia in continuità sulla
   stessa striscia quando lo stato del paziente cambia. */
(function (root) {
'use strict';
const doc = root.document;
const CHIAVE = 'iso-casi-v1';
const $ = s => doc.querySelector(s);
const ETICHETTA = { ok: 'Corretto', no: 'Non è la scelta migliore', grave: 'Scelta pericolosa' };
const EVENTO = { ev: 'Somministrazione endovenosa', shock: 'Scarica erogata', rcp: 'Compressioni toraciche', vagale: 'Manovra vagale', pacing: 'Stimolazione avviata' };

/* l'intestazione dice già «Corretto»: non lo si ripete in apertura del commento */
function pulito(t) { const r = String(t).replace(/^(Corretto|Esatto|Sì)[.:,]?\s*/, ''); return r.charAt(0).toUpperCase() + r.slice(1); }
function leggi() { try { return JSON.parse(root.localStorage.getItem(CHIAVE)) || {}; } catch (e) { return {}; } }
function scrivi(v) { try { root.localStorage.setItem(CHIAVE, JSON.stringify(v)); } catch (e) {} }

/* Frequenza ventricolare media letta dagli eventi ventricolari che il motore ha
   davvero generato: nessun numero scritto a mano che possa contraddire l'ECG
   mostrato, e nessuna onda T alta scambiata per un battito. Nei ritmi senza
   QRS riconoscibili (fibrillazione ventricolare, asistolia) restituisce 0. */
function frequenza(stream, t0) {
  if (stream.cfg && stream.cfg.mode === 'continuous') return 0;
  const da = t0 + 800, a = da + 12000;
  stream.ensure(a + 500);
  const V = stream.ev.filter(e => e.kind === 'V' && e.t >= da && e.t <= a);
  if (V.length < 2) return 0;
  return Math.round(60000 * (V.length - 1) / (V[V.length - 1].t - V[0].t));
}

function avvia() {
  const APP = root.ISO_APP, DATI = root.ISO_CASI_DATI, vista = $('#v-casi');
  if (!APP || !DATI || !vista) return null;
  const esc = APP.esc, CASI = DATI.CASI, REALI = root.ISO_CASI_REALI || null, PTB = root.ISO_PTBXL || null;
  const FONTI = Object.assign({ ptbxl: { t: 'PTB-XL 1.0.3 — archivio pubblico di ECG (CC BY 4.0)', r: 'Wagner P et al. Sci Data 2020;7:154', u: 'https://doi.org/10.1038/s41597-020-0495-6' } }, DATI.FONTI, REALI ? REALI.FONTI : {});
  let scheda = 'guidati', richiesta = 0;
  const home = $('#casiHome'), run = $('#casiRun'), pannello = $('#casiPanel'), palco = $('#casiStage'), vitali = $('#casiVitali'), evento = $('#casiEvento');
  let mon = null, stream = null, paziente = null, attiva = false, ultimo = 0, raf = 0, seme = 40;
  let C = null;                       // caso in corso
  let precedente = 0, tEvento = 0; const vv = [0, 0, 0];

  function fonti(ids) { return (ids || []).map(id => FONTI[id]).filter(Boolean); }
  function cfgDi(stato) { const sc = APP.byId[stato.ecg[0]]; return APP.configura(sc, Object.assign(APP.defaultParams(sc), stato.ecg[1] || {})); }

  /* ---------- elenco ---------- */
  function carta(id, riga, titolo, chi, f) {
    return '<button class="caso-card" data-caso="' + id + '">' + riga + '<h3>' + esc(titolo) + '</h3><span class="chi">' + esc(chi) + '</span>' +
      '<span class="esito' + (f ? ' fatto' : '') + '">' + (f ? 'Migliore: ' + f.ok + ' su ' + f.tot + (f.gravi ? ' · ' + f.gravi + ' scelte pericolose' : '') : 'Da fare') + '</span></button>';
  }
  function elenco() {
    const fatti = leggi(), chi = p => (p.sesso === 'F' ? 'Donna' : 'Uomo') + ', ' + p.eta + ' anni';
    let h = '<h2>Casi clinici</h2><p class="lead">Un paziente, un tracciato che cambia con le tue scelte. Leggi l’ECG, decidi, somministra: ogni decisione ha una conseguenza e una fonte.</p>' +
      '<p class="casi-avviso">Simulazione didattica. Criteri e dosi dell’adulto seguono le linee guida citate in ogni passaggio; non sostituiscono i protocolli locali né il giudizio clinico. I contenuti non sono stati certificati da un cardiologo.</p>';
    if (REALI && PTB) h += '<div class="seg casi-schede" id="casiSchede"><button data-s="guidati" class="' + (scheda === 'guidati' ? 'on' : '') + '">Casi guidati · ' + CASI.length + '</button><button data-s="reali" class="' + (scheda === 'reali' ? 'on' : '') + '">ECG reali · ' + REALI.CASI.length + '</button></div>';
    if (scheda === 'reali' && REALI && PTB) {
      h += '<p class="casi-avviso reale">Tracciati veri di pazienti, con età, sesso e referto del cardiologo, dall’archivio pubblico PTB-XL (licenza CC BY 4.0). L’archivio non contiene sintomi né decorso: la seconda domanda è generale sul quadro riconosciuto. Alla prima apertura ogni tracciato viene scaricato e verificato; poi resta disponibile offline.</p>' +
        '<div class="casi-azioni" style="margin:0 0 14px"><button class="btn primary" id="casiSorpresa">Tracciato a sorpresa</button></div><div class="casi-griglia">' +
        REALI.CASI.map((r, k) => carta('r' + k, '<span class="riga"><span class="tag">ECG reale</span><span>2 domande</span></span>', 'Tracciato n. ' + r[0], chi({ sesso: r[2], eta: r[1] }), fatti['ptbxl-' + r[0]])).join('') + '</div>';
    } else {
      h += '<div class="casi-griglia">' + CASI.map(c => carta(c.id, '<span class="riga"><span class="tag">' + esc(c.tag) + '</span><span>' + c.minuti + ' min</span><span class="livello" aria-label="Difficoltà ' + c.livello + ' su 3">' + [1, 2, 3].map(i => '<i class="' + (i <= c.livello ? 'on' : '') + '"></i>').join('') + '</span></span>', c.titolo, chi(c.paziente) + ' · ' + c.passi.length + ' decisioni', fatti[c.id])).join('') + '</div>';
    }
    home.innerHTML = h;
    home.querySelectorAll('[data-caso]').forEach(b => b.addEventListener('click', () => { const id = b.dataset.caso; if (id[0] === 'r' && scheda === 'reali') apriReale(REALI.CASI[+id.slice(1)]); else apri(id); }));
    home.querySelectorAll('#casiSchede button').forEach(b => b.addEventListener('click', () => { scheda = b.dataset.s; elenco(); }));
    const sor = $('#casiSorpresa'); if (sor) sor.addEventListener('click', () => { const non = REALI.CASI.filter(r => !fatti['ptbxl-' + r[0]]), da = non.length ? non : REALI.CASI; apriReale(da[Math.floor(Math.random() * da.length)]); });
  }

  /* ---------- ECG reali (PTB-XL) ---------- */
  function casoReale(riga) {
    const id = riga[0], eta = riga[1], sesso = riga[2], K = REALI.CLASSI[riga[3]];
    const opz = [{ t: K.nome, v: 'ok', f: 'È la diagnosi del cardiologo che ha refertato questo tracciato.' }].concat(K.simili.map(k => ({ t: REALI.CLASSI[k].nome, v: 'no', f: 'Non è il quadro refertato per questo tracciato: confronta i criteri con quelli della diagnosi corretta.' })));
    let x = id * 2654435761 % 4294967296; const caso_ = () => { x = (x * 1664525 + 1013904223) % 4294967296; return x / 4294967296; };
    for (let i = opz.length - 1; i > 0; i--) { const j = Math.floor(caso_() * (i + 1)), t = opz[i]; opz[i] = opz[j]; opz[j] = t; }
    return { id: 'ptbxl-' + id, reale: { id, scp: riga[4] }, titolo: 'ECG reale · tracciato n. ' + id, tag: 'ECG reale', paziente: { sesso, eta },
      intro: 'Tracciato reale di ' + (sesso === 'F' ? 'una donna' : 'un uomo') + ' di ' + eta + ' anni, registrato a riposo e refertato da un cardiologo. L’archivio non riporta sintomi né terapia. Leggilo con metodo: ritmo, frequenza, asse, PR, QRS, ST e T.',
      stati: {}, passi: [
        { tipo: 'Lettura ECG', q: 'Qual è il reperto principale di questo tracciato?', opz, perche: 'La risposta è quella del referto originale, non di un modello: nei tracciati reali i criteri non sono mai puliti come sul libro.', fonte: ['ptbxl'] },
        { tipo: 'Approfondimento', q: K.q, opz: K.opz.map(o => ({ t: o[0], v: o[1], f: o[2] })), perche: K.perche, fonte: K.fonte }],
      chiave: ['Reperto refertato: ' + K.nome + '.', K.perche, 'Tracciato, età, sesso e referto sono reali; la seconda domanda è generale e non descrive la storia di questo paziente.'] };
  }
  function vitaliReali() {
    const B = stream && stream.battiti || [], fc = B.length > 1 ? Math.round(60000 * (B.length - 1) / (B[B.length - 1] - B[0])) : '—';
    mostraVitali(fc, '—', null, '—', true);
    if (paziente) paziente.vitali({ fc, pa: '—', spo2: null, fr: '—' });
  }
  function apriReale(riga) {
    const caso = casoReale(riga), tok = ++richiesta;
    C = { caso, i: 0, esiti: [], stato: 'reale', reale: true, rec: null };
    prepara(caso); stream = null; mostraVitali('—', '—', null, '—', true);
    if (paziente) { paziente.imposta({ post: 'semi', cosc: 'vigile', polso: true, fr: 14 }, caso.paziente); paziente.vitali({}); }
    pannello.innerHTML = '<p class="casi-tipo">ECG reale</p><p class="casi-q">Scarico e verifico il tracciato originale…</p><p class="casi-stato" id="casiCarica">PTB-XL n. ' + riga[0] + '</p>';
    PTB.load({ id: riga[0], i: 'ptbxl-' + riga[0], t: 'ECG reale', person: '', f: 'PTB-XL #' + riga[0], scp: riga[4] }, { progress: m => { const e = $('#casiCarica'); if (e && tok === richiesta) e.textContent = m; } }).then(rec => {
      if (tok !== richiesta || !C || C.caso !== caso) return;
      C.rec = rec; stream = new APP.Sampled(rec, 1); mon.setStream(stream, false); vitaliReali(); passo();
    }).catch(e => {
      if (tok !== richiesta || !C || C.caso !== caso) return;
      pannello.innerHTML = '<p class="casi-tipo">ECG reale</p><p class="casi-q">Tracciato non disponibile</p><p class="casi-stato">' + esc(e && e.message && !/fetch|network|load failed/i.test(e.message) ? e.message : 'Download non riuscito.') + ' Alla prima apertura serve una connessione; i tracciati già aperti restano disponibili offline.</p><div class="casi-azioni"><button class="btn primary" id="casiRiprova">Riprova</button><button class="btn" id="casiIndietro">Torna all’elenco</button></div>';
      $('#casiRiprova').addEventListener('click', () => apriReale(riga)); $('#casiIndietro').addEventListener('click', chiudi);
    });
  }

  /* ---------- stato del paziente ---------- */
  function mostraEvento(testo, male) {
    if (!evento) return; evento.textContent = testo; evento.classList.toggle('male', !!male); evento.classList.add('on'); tEvento = 3200;
  }
  function stato(nome, continuo) {
    const s = C.caso.stati[nome]; if (!s) return;
    C.stato = nome;
    const cfg = cfgDi(s);
    if (continuo && stream && mon) stream.cambiaRitmo(cfg, mon.t + 250);
    else { stream = new APP.Stream(cfg, ++seme); if (mon) mon.setStream(stream, false); }
    const fc = s.fc != null ? s.fc : (frequenza(stream, mon ? mon.t + 300 : 0) || '—');
    const pz = Object.assign({ fr: s.fr }, s.pz);
    if (paziente) { paziente.imposta(pz, C.caso.paziente); paziente.vitali({ fc, pa: s.pa, spo2: s.spo2, fr: s.fr }); }
    mostraVitali(fc, s.pa, s.spo2, s.fr);
    const d = $('#casiStatoTxt'); if (d) d.textContent = s.txt || '';
  }
  function mostraVitali(fc, pa, spo2, fr, quieto) {
    const allarme = (k, v) => !quieto && ((k === 'spo2' && v != null && v < 90) || (k === 'fc' && (v === '—' || v === '0' || +v > 150 || +v < 40)) || (k === 'pa' && (/non/.test(v) || parseInt(v, 10) < 90)));
    const cella = (cls, et, val, k) => '<div class="' + cls + (allarme(k, val) ? ' allarme' : '') + '"><small>' + et + '</small><b>' + esc(String(val == null ? '—' : val)) + '</b></div>';
    vitali.innerHTML = cella('fc', 'FC /min', fc, 'fc') + cella('', 'PA mmHg', pa, 'pa') + cella('', 'SpO₂ %', spo2, 'spo2') + cella('', 'FR /min', fr, 'fr');
  }
  function anima(nome) {
    if (!nome) return;
    if (nome === 'shock' && stream && mon) stream.scarica(mon.t + 120, null);
    if (paziente) paziente.effetto(nome);
    mostraEvento(EVENTO[nome] || '');
  }

  /* ---------- svolgimento ---------- */
  function apri(id) {
    const caso = CASI.find(c => c.id === id); if (!caso) return;
    richiesta++;
    C = { caso, i: 0, esiti: [], stato: null };
    prepara(caso); stream = null;
    passo();
  }
  function avvisa3d() {
    if (palco.querySelector('.casi-no3d')) return;
    const n = doc.createElement('div'); n.className = 'casi-no3d';
    n.textContent = 'Vista 3D non disponibile su questo dispositivo: il caso resta utilizzabile con tracciato e parametri.';
    palco.appendChild(n);
  }
  function prepara(caso) {
    home.hidden = true; run.hidden = false;
    $('#casiChi').innerHTML = '<b>' + esc(caso.titolo) + '</b><span>' + (caso.paziente.sesso === 'F' ? 'Donna' : 'Uomo') + ', ' + caso.paziente.eta + ' anni</span>';
    if (!mon) {
      mon = new APP.Monitor($('#casiEcg'), $('#casiEcgOv'), {});
      /* su schermi stretti le 12 derivazioni sono illeggibili: si parte dalla vista Monitor */
      if (vista.clientWidth < 600) { mon.mode = 'monitor'; doc.querySelectorAll('#casiModo button').forEach(x => x.classList.toggle('on', x.dataset.m === 'monitor')); }
    }
    /* Il nuovo paziente non deve ereditare segnale o avvisi, anche se il suo
       tracciato originale deve ancora essere scaricato o il download fallisce. */
    mon.setStream(null, false); precedente = 0; tEvento = 0;
    if (evento) { evento.textContent = ''; evento.classList.remove('on', 'male'); }
    if (!paziente && root.ISO_PAZIENTE) {
      paziente = root.ISO_PAZIENTE.crea(palco);
      if (paziente) paziente.suErrore = avvisa3d; else avvisa3d();
    }
    root.requestAnimationFrame(() => { mon.layout(); if (paziente) paziente.misura(); });
    vista.scrollTop = 0;
  }
  function barra() {
    return '<div class="casi-prog" aria-label="Avanzamento">' + C.caso.passi.map((p, k) => '<i class="' + (C.esiti[k] || (k === C.i ? 'ora' : '')) + '"></i>').join('') + '</div>';
  }
  function passo() {
    const p = C.caso.passi[C.i];
    if (!C.reale) { if (p.stato) stato(p.stato, C.i > 0); else if (!C.stato) stato(Object.keys(C.caso.stati)[0], false); }
    const s = C.reale ? { txt: 'Registrazione originale: 10 secondi, 12 derivazioni, 500 Hz.' } : C.caso.stati[C.stato];
    pannello.innerHTML = barra() + (C.i === 0 ? '<p class="casi-intro">' + esc(C.caso.intro) + '</p>' : '') +
      '<p class="casi-tipo">' + esc(p.tipo) + ' · ' + (C.i + 1) + ' di ' + C.caso.passi.length + '</p>' +
      '<p class="casi-stato" id="casiStatoTxt">' + esc(s.txt || '') + '</p>' +
      '<p class="casi-q">' + esc(p.q) + '</p><div class="opts">' + p.opz.map((o, k) => '<button data-k="' + k + '">' + esc(o.t) + '</button>').join('') + '</div><div id="casiFb" aria-live="polite"></div>';
    pannello.querySelectorAll('.opts button').forEach(b => b.addEventListener('click', () => rispondi(+b.dataset.k)));
    pannello.scrollTop = 0;
  }
  function rispondi(k) {
    const p = C.caso.passi[C.i], o = p.opz[k]; if (C.esiti[C.i]) return;
    C.esiti[C.i] = o.v;
    pannello.querySelectorAll('.opts button').forEach((b, j) => { b.disabled = true; const v = p.opz[j].v; if (v === 'ok') b.classList.add('right'); else if (j === k) b.classList.add(v === 'grave' ? 'grave' : 'wrong'); });
    const giusta = p.opz.find(x => x.v === 'ok');
    const conseguenza = !C.reale && o.v !== 'ok' && o.cons && C.caso.stati[o.cons];
    /* nei tracciati reali, dopo la lettura si mostra il referto registrato nell'archivio */
    const referto = C.reale && C.i === 0 ? '<div class="casi-fb referto"><h4>Referto registrato nell’archivio</h4>' +
      (C.rec && C.rec.ptb && C.rec.ptb.report ? '<p>Testo originale: «' + esc(C.rec.ptb.report) + '»</p>' : '') +
      '<p>Codici diagnostici: ' + C.caso.reale.scp.map(c => esc(REALI.CODICI[c] || c)).join(' · ') + '</p></div>' : '';
    if (conseguenza) { stato(o.cons, true); mostraEvento(C.caso.stati[o.cons].txt || 'Conseguenza simulata', true); }
    else if (o.v === 'ok') { anima(p.anim); if (p.dopo) stato(p.dopo, true); }
    const f = fonti(p.fonte);
    $('#casiFb').innerHTML = '<div class="casi-fb ' + o.v + '"><h4>' + ETICHETTA[o.v] + '</h4><p>' + esc(pulito(o.f)) + '</p>' +
      (o.v !== 'ok' && giusta ? '<p><b>La scelta corretta:</b> ' + esc(giusta.t.replace(/[.]$/, '')) + '. ' + esc(pulito(giusta.f)) + '</p>' : '') + '</div>' + referto +
      (p.perche ? '<p class="casi-perche">' + esc(p.perche) + '</p>' : '') +
      (f.length ? '<p class="casi-fonte">Fonte: ' + f.map(x => '<a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a>').join(' · ') + '</p>' : '') +
      '<div class="casi-azioni"><button class="btn primary" id="casiAvanti">' + (conseguenza ? 'Rimedia e continua' : C.i === C.caso.passi.length - 1 ? 'Vedi il riepilogo' : 'Continua') + '</button></div>';
    pannello.querySelector('.casi-prog').outerHTML = barra();
    $('#casiAvanti').addEventListener('click', () => {
      if (o.v !== 'ok') { anima(p.anim); if (p.dopo) stato(p.dopo, true); else if (conseguenza && p.stato) stato(p.stato, true); else if (conseguenza) stato(precedenteStato(), true); }
      C.i++; if (C.i >= C.caso.passi.length) fine(); else passo();
    });
    $('#casiAvanti').scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  /* stato in cui il caso si trovava prima della conseguenza simulata */
  function precedenteStato() {
    let nome = Object.keys(C.caso.stati)[0];
    for (let k = 0; k <= C.i; k++) { const p = C.caso.passi[k]; if (p.stato) nome = p.stato; if (k < C.i && p.dopo) nome = p.dopo; }
    return nome;
  }
  function fine() {
    const tot = C.caso.passi.length, ok = C.esiti.filter(e => e === 'ok').length, gravi = C.esiti.filter(e => e === 'grave').length;
    const tutti = leggi(), prima = tutti[C.caso.id];
    if (!prima || ok > prima.ok || (ok === prima.ok && gravi < prima.gravi)) { tutti[C.caso.id] = { ok, tot, gravi }; scrivi(tutti); }
    const usate = []; C.caso.passi.forEach(p => (p.fonte || []).forEach(id => { if (usate.indexOf(id) < 0) usate.push(id); }));
    const reale = !!C.reale, sc = reale ? null : C.caso.stati[Object.keys(C.caso.stati)[0]].ecg, idCaso = C.caso.id;
    pannello.innerHTML = '<div class="casi-fine">' + barra() + '<p class="casi-tipo">Riepilogo</p><h2>' + esc(C.caso.titolo) + '</h2>' +
      '<div class="casi-punti"><div><b>' + ok + '/' + tot + '</b><small>scelte corrette</small></div><div><b>' + (tot - ok - gravi) + '</b><small>imprecise</small></div><div><b>' + gravi + '</b><small>pericolose</small></div></div>' +
      '<h3>Da ricordare</h3><ul class="casi-chiave">' + C.caso.chiave.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
      '<h3>Fonti di questo caso</h3><ul class="casi-fonti">' + fonti(usate).map(x => '<li><a href="' + esc(x.u) + '" target="_blank" rel="noopener">' + esc(x.t) + '</a>. ' + esc(x.r) + '</li>').join('') + '</ul>' +
      '<div class="casi-azioni">' + (reale ? '<button class="btn primary" id="casiProssimo">Altro ECG reale</button><button class="btn" id="casiAltri">Elenco</button>' : '<button class="btn primary" id="casiAltri">Altri casi</button><button class="btn" id="casiRifai">Ripeti il caso</button><button class="btn" id="casiTraccia">Apri l’ECG iniziale nel Tracciato</button>') + '</div></div>';
    $('#casiAltri').addEventListener('click', chiudi);
    if (reale) $('#casiProssimo').addEventListener('click', () => { const f = leggi(), non = REALI.CASI.filter(r => !f['ptbxl-' + r[0]]), da = non.length ? non : REALI.CASI; apriReale(da[Math.floor(Math.random() * da.length)]); });
    else { $('#casiRifai').addEventListener('click', () => apri(idCaso)); $('#casiTraccia').addEventListener('click', () => { if (root.ISO_OPEN) root.ISO_OPEN(sc[0], sc[1]); }); }
    pannello.scrollTop = 0;
  }
  function chiudi() { richiesta++; C = null; stream = null; run.hidden = true; home.hidden = false; elenco(); }

  /* ---------- ciclo ---------- */
  function ciclo(ora) {
    if (!attiva) { raf = 0; return; }
    const dt = Math.min(80, ora - (ultimo || ora)); ultimo = ora;
    if (C && !stream && paziente && !run.hidden) paziente.aggiorna(dt);
    if (C && stream && mon && !run.hidden) {
      mon.t += dt; mon.draw();
      if (C.reale) {                 // battiti rilevati sulla registrazione, ripetuta ogni 10 secondi
        const B = stream.battiti || [], dur = stream.dur || 10000, u0 = (mon.t - dt) % dur, u1 = mon.t % dur;
        if (paziente && B.some(b => (u0 <= u1 ? b > u0 && b <= u1 : b > u0 || b <= u1))) paziente.battito();
      } else {
        stream.vec(mon.t, vv); const a = Math.abs(vv[0]) + Math.abs(vv[1]) + Math.abs(vv[2]);
        if (paziente && a > 0.55 && precedente <= 0.55) paziente.battito();
        precedente = a;
      }
      if (paziente) paziente.aggiorna(dt);
      if (tEvento > 0) { tEvento -= dt; if (tEvento <= 0 && evento) evento.classList.remove('on'); }
    }
    raf = root.requestAnimationFrame(ciclo);
  }
  function misura() { if (!attiva || run.hidden) return; if (mon) mon.layout(); if (paziente) paziente.misura(); }

  $('#casiEsci').addEventListener('click', chiudi);
  doc.querySelectorAll('#casiModo button').forEach(b => b.addEventListener('click', () => {
    doc.querySelectorAll('#casiModo button').forEach(x => x.classList.toggle('on', x === b));
    if (mon) { mon.mode = b.dataset.m; mon.layout(); }
  }));
  root.addEventListener('resize', misura);
  if (root.ResizeObserver) new root.ResizeObserver(misura).observe(palco);

  return {
    vista(on) {
      attiva = !!on;
      if (on) { if (!C) { run.hidden = true; home.hidden = false; elenco(); } ultimo = 0; if (!raf) raf = root.requestAnimationFrame(ciclo); root.requestAnimationFrame(misura); }
    },
    tema() { if (mon && attiva) mon.layout(); },
    apri, apriReale, frequenza
  };
}
if (doc) { const api = avvia(); if (api) root.ISO_CASI = api; }
else if (typeof module !== 'undefined') module.exports = { frequenza };
})(typeof window !== 'undefined' ? window : this);
