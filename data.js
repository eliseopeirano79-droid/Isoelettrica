/* Isoelettrica — libreria dei quadri ECG */
(function (root) {
'use strict';
const E = root.ECG || (typeof require !== 'undefined' ? require('./engine.js') : null);
const { M, B, PL, dirAG } = E;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

const F = {
  hr: (def, min, max) => ({ k: 'hr', label: 'Frequenza', unit: '/min', min: min || 30, max: max || 180, step: 1, def }),
  pr: (def, min, max) => ({ k: 'pr', label: 'PR', unit: 'ms', min: min || 80, max: max || 400, step: 5, def }),
  qtc: (def, min, max) => ({ k: 'qtc', label: 'QTc', unit: 'ms', min: min || 340, max: max || 640, step: 5, def })
};

const SRC = {
  aha3: 'AHA/ACCF/HRS 2009, Raccomandazioni per l\u2019interpretazione dell\u2019ECG, parte III (disturbi di conduzione intraventricolare)',
  aha4: 'AHA/ACCF/HRS 2009, parte IV (ST, T, U e QT)',
  aha5: 'AHA/ACCF/HRS 2009, parte V (ipertrofie)',
  udmi: 'Quinta definizione universale di infarto miocardico, ESC/ACC/AHA/WHF 2026',
  acs: 'ESC 2023, Sindromi coronariche acute',
  pacing: 'ESC 2021, Pacing cardiaco e resincronizzazione',
  brady: 'ACC/AHA/HRS 2018, Bradicardia e disturbi della conduzione',
  svt: 'ESC 2019, Tachicardie sopraventricolari',
  af: 'ESC 2024, Fibrillazione atriale',
  va: 'ESC 2022, Aritmie ventricolari e prevenzione della morte improvvisa',
  peri: 'ESC 2025, Miocarditi e pericarditi',
  valv: 'ESC/EACTS 2025, Trattamento delle valvulopatie',
  als: 'ERC 2021, Linee guida sul supporto vitale avanzato nell\u2019adulto'
};

const TERR = {
  inferiore: { inj: [105, -5], k: 1.0, label: 'inferiore (coronaria destra o circonflessa)' },
  anteriore: { inj: [40, 62], k: 1.45, label: 'anteriore (discendente anteriore)' },
  laterale: { inj: [-25, -15], k: 0.95, label: 'laterale (circonflessa o diagonale)' },
  posteriore: { inj: [60, -82], k: 1.45, label: 'posteriore (circonflessa o coronaria destra)' }
};
function stemiCfg(terr, p) {
  const t = TERR[terr]; const [a, g] = t.inj;
  const ph = +p.fase; const mm = p.st;
  const cfg = { rate: p.hr, pr: 160, qtc: p.qtc || 420 };
  const away = [a + 180, -g];
  if (ph === 0) { cfg.T = { a, g, amp: 0.78 }; cfg.st = { a, g, amp: mm / 10 / t.k * 0.25 }; cfg.qrs = M.qrsNormal(); }
  else if (ph === 1) { cfg.T = { a, g, amp: 0.5 }; cfg.st = { a, g, amp: mm / 10 / t.k }; cfg.qrs = M.qrsNormal({ r: 0.9 }); }
  else if (ph === 2) { cfg.T = { a: away[0], g: away[1], amp: 0.2 }; cfg.st = { a, g, amp: mm / 10 / t.k * 0.45 }; cfg.qrs = M.qrsNormal({ r: 0.7 }); cfg.extra = [B(dirAG(away[0], away[1]), 0.34, 20, 11, 11)]; }
  else { cfg.T = { a: away[0], g: away[1], amp: 0.34 }; cfg.st = null; cfg.qrs = M.qrsNormal({ r: 0.62 }); cfg.extra = [B(dirAG(away[0], away[1]), 0.42, 20, 12, 12)]; }
  if (terr === 'posteriore') {
    cfg.extra = (cfg.extra || []).concat(ph >= 1 ? [B(dirAG(40, 75), 0.55, 30, 11, 11)] : []);
    if (ph <= 1) cfg.T = { a: 45, g: 50, amp: ph === 0 ? 0.36 : 0.26 };
    else cfg.T = { a: 45, g: 70, amp: 0.5 };
  }
  return cfg;
}
const FASE = { k: 'fase', label: 'Fase', type: 'select', def: '1', opts: [['0', 'Iperacuta'], ['1', 'Acuta'], ['2', 'Evoluzione'], ['3', 'Esiti']] };


const S = [];
const add = o => S.push(o);

/* ================= RITMO SINUSALE ================= */
add({
  id: 'normale', cat: 'Ritmo sinusale', name: 'ECG normale', quiz: true,
  params: [F.hr(72, 50, 100), F.pr(160, 120, 200), F.qtc(410, 360, 450), { k: 'axis', label: 'Asse del QRS (vettore R)', unit: '°', min: -30, max: 100, step: 1, def: 50 }],
  build: p => ({ rate: p.hr, pr: p.pr, qtc: p.qtc, sa: 0.02, qrs: M.qrsNormal({ aR: p.axis }) }),
  look: ['II'],
  card: {
    def: 'Ritmo sinusale con conduzione, depolarizzazione e ripolarizzazione nei limiti di norma. È il riferimento con cui confrontare tutti gli altri quadri.',
    criteri: ['P positiva in DI, DII e aVF, negativa in aVR; ogni P è seguita da un QRS', 'Frequenza 60–100/min (alcuni testi usano 50–90)', 'PR 120–200 ms', 'QRS ≤ 110 ms', 'Asse frontale tra −30° e +90°', 'QTc < 450 ms nell\u2019uomo, < 460 ms nella donna', 'Transizione precordiale tra V3 e V4'],
    meccanismo: 'L\u2019impulso nasce nel nodo del seno, attiva gli atri dall\u2019alto verso il basso e da destra a sinistra, rallenta nel nodo AV e si distribuisce ai ventricoli tramite His, branche e Purkinje.',
    vettori: 'Il vettore settale (Q) va a destra e in avanti: dà la piccola q in DI e V6 e la piccola r in V1. Il vettore della parete libera (R) va a sinistra, in basso e leggermente indietro: domina il QRS. Il vettore basale (S) chiude verso l\u2019alto e indietro. La T resta concorde con il QRS perché la ripolarizzazione procede in senso opposto alla depolarizzazione.',
    guarda: 'DII per il ritmo, DI e aVF per l\u2019asse, V1–V6 per la progressione della R.',
    dd: ['Variante normale con ripolarizzazione precoce', 'Asse verticale del giovane longilineo'],
    trappole: 'La prova dell\u2019asse: con il cursore «Asse del QRS» sposta il vettore R e guarda quale derivazione frontale diventa isoelettrica.',
    fonte: SRC.aha3 + '; ' + SRC.aha4
  }
});
add({
  id: 'bradisinusale', cat: 'Ritmo sinusale', name: 'Bradicardia sinusale', quiz: true,
  params: [F.hr(46, 30, 59)],
  build: p => ({ rate: p.hr, pr: 170, qtc: 410, sa: 0.03 }), look: ['II'],
  card: {
    def: 'Ritmo sinusale con frequenza inferiore a 60/min.',
    criteri: ['P sinusale (positiva in DI, DII, aVF) prima di ogni QRS', 'PR costante', 'Frequenza < 60/min'],
    meccanismo: 'Ridotta frequenza di scarica del nodo del seno: tono vagale elevato (atleta, sonno), farmaci (betabloccanti, calcio-antagonisti non diidropiridinici, digitale), ipotiroidismo, ipotermia, malattia del nodo del seno.',
    vettori: 'I vettori di ogni singolo battito sono normali: cambia solo quanto spesso compaiono.',
    guarda: 'Striscia lunga in DII: conta gli intervalli RR.',
    dd: ['BAV di II grado 2:1 con P bloccata nascosta nella T', 'Ritmo giunzionale (P assente o retrograda)', 'Blocco senoatriale'],
    trappole: 'Una P non condotta nascosta nella T può simulare una bradicardia sinusale: cercala come deformazione della T.',
    fonte: SRC.brady
  }
});
add({
  id: 'tachisinusale', cat: 'Ritmo sinusale', name: 'Tachicardia sinusale', quiz: true,
  params: [F.hr(122, 101, 170)],
  build: p => ({ rate: p.hr, pr: 135, qtc: 420, sa: 0.01 }), look: ['II', 'V1'],
  card: {
    def: 'Ritmo sinusale con frequenza superiore a 100/min, a esordio e termine graduali.',
    criteri: ['P sinusale prima di ogni QRS', 'Frequenza > 100/min', 'Accelerazione e decelerazione graduali'],
    meccanismo: 'Aumento dell\u2019automatismo del nodo del seno per tono simpatico: febbre, dolore, anemia, ipovolemia, ipertiroidismo, embolia polmonare, farmaci.',
    vettori: 'Vettori normali; con l\u2019aumento della frequenza PR e QT si accorciano e la P si avvicina alla T precedente.',
    guarda: 'DII e V1: la P deve precedere ogni QRS con la stessa morfologia.',
    dd: ['Flutter atriale 2:1 (frequenza fissa intorno a 150/min)', 'Tachicardia atriale focale', 'TPSV da rientro'],
    trappole: 'Una frequenza fissa a circa 150/min che non cambia mai deve far pensare al flutter 2:1.',
    fonte: SRC.svt
  }
});
add({
  id: 'aritmiasinusale', cat: 'Ritmo sinusale', name: 'Aritmia sinusale respiratoria', quiz: true,
  params: [F.hr(66, 50, 90), { k: 'sa', label: 'Variazione con il respiro', unit: '%', min: 5, max: 30, step: 1, def: 18 }],
  build: p => ({ rate: p.hr, pr: 160, qtc: 410, sa: p.sa / 100 }), look: ['II'],
  card: {
    def: 'Ritmo sinusale con variazione ciclica dell\u2019intervallo PP legata al respiro: accelera in inspirazione, rallenta in espirazione.',
    criteri: ['P sinusale con morfologia costante', 'PR costante', 'Variazione dell\u2019intervallo PP superiore a 120 ms (definizione classica)'],
    meccanismo: 'In inspirazione si riduce il tono vagale sul nodo del seno. È fisiologica, marcata nel giovane e nell\u2019atleta.',
    vettori: 'Nessuna modifica vettoriale: cambia soltanto il tempo tra i battiti.',
    guarda: 'Striscia lunga in DII.',
    dd: ['Extrasistoli atriali (P di morfologia diversa)', 'Fibrillazione atriale (manca la P)', 'Blocco senoatriale (pause multiple del ciclo)'],
    trappole: 'Morfologia della P e PR costanti la distinguono dalle ectopie atriali.',
    fonte: SRC.brady
  }
});

/* ================= SOPRAVENTRICOLARI ================= */
add({
  id: 'esa', cat: 'Sopraventricolari', name: 'Extrasistoli atriali', quiz: true,
  params: [F.hr(74, 55, 100), { k: 'prob', label: 'Frequenza delle extrasistoli', unit: '%', min: 5, max: 45, step: 1, def: 22 }],
  build: p => ({ rate: p.hr, pr: 160, qtc: 410, ectopy: { type: 'pac', prob: p.prob / 100 } }), look: ['II', 'V1'],
  card: {
    def: 'Battiti prematuri originati da un focus atriale diverso dal nodo del seno.',
    criteri: ['P prematura con morfologia diversa dalla sinusale', 'QRS di solito uguale a quello di base (salvo aberranza)', 'Pausa successiva di solito non compensatoria: il nodo del seno viene reimpostato'],
    meccanismo: 'Automatismo aumentato o attività triggerata in un focus atriale; qui il focus è nell\u2019atrio basso, per cui la P prematura risulta negativa nelle inferiori.',
    vettori: 'Il vettore della P parte dal focus: se è basso punta verso l\u2019alto e la P diventa negativa in DII, DIII e aVF. Il QRS usa le vie normali, quindi i suoi vettori non cambiano.',
    guarda: 'DII e V1: confronta la P prematura con quella sinusale.',
    dd: ['Extrasistoli giunzionali', 'Extrasistoli ventricolari (QRS largo senza P prematura)', 'Aritmia sinusale'],
    trappole: 'Una ESA molto precoce può trovare il nodo AV refrattario e non condursi: la pausa isolata simula un blocco.',
    fonte: SRC.svt
  }
});
add({
  id: 'fa', cat: 'Sopraventricolari', name: 'Fibrillazione atriale', quiz: true,
  params: [{ k: 'vr', label: 'Risposta ventricolare media', unit: '/min', min: 45, max: 170, step: 1, def: 105 }, { k: 'f', label: 'Onde f', type: 'select', def: '1', opts: [['0.5', 'Fini'], ['1', 'Medie'], ['2', 'Grossolane']] }],
  build: p => ({ atrial: 'af', vRate: p.vr, qtc: 420, cont: 'af', fAmp: 0.04 * (+p.f), pComps: [] }), look: ['II', 'V1'],
  card: {
    def: 'Tachiaritmia sopraventricolare con attivazione atriale disorganizzata e risposta ventricolare irregolare.',
    criteri: ['Intervalli RR irregolarmente irregolari', 'Assenza di onde P distinte', 'Attività atriale irregolare (onde f), spesso più visibile in V1', 'Per la diagnosi clinica serve la documentazione ECG: episodio di almeno 30 secondi su traccia a derivazione singola o ECG a 12 derivazioni'],
    meccanismo: 'Multipli circuiti di rientro e focus ectopici, spesso dalle vene polmonari, attivano gli atri a 350–600/min. Il nodo AV filtra gli impulsi in modo irregolare.',
    vettori: 'Non esiste un vettore atriale medio stabile: nel 3D il vettore atriale gira in modo caotico. I vettori ventricolari restano normali perché la conduzione intraventricolare è quella abituale.',
    guarda: 'DII per l\u2019irregolarità, V1 per le onde f.',
    dd: ['Flutter a conduzione variabile (onde F regolari)', 'Tachicardia atriale multifocale (P distinte e multiformi)', 'Ritmo sinusale con extrasistoli frequenti'],
    trappole: 'Ad alta frequenza l\u2019irregolarità si nota meno: misura più RR consecutivi con il compasso.',
    fonte: SRC.af
  }
});
add({
  id: 'flutter', cat: 'Sopraventricolari', name: 'Flutter atriale tipico', quiz: true,
  params: [{ k: 'ratio', label: 'Conduzione AV', type: 'select', def: '2', opts: [['2', '2:1'], ['3', '3:1'], ['4', '4:1'], ['v', 'Variabile']] }, { k: 'fr', label: 'Frequenza atriale', unit: '/min', min: 240, max: 340, step: 5, def: 300 }],
  build: p => ({ atrial: 'flutter', fRate: p.fr, ratio: p.ratio === 'v' ? 2 : +p.ratio, variable: p.ratio === 'v', cont: 'flutter', qtc: 410 }), look: ['II', 'III', 'aVF', 'V1'],
  card: {
    def: 'Macrorientro nell\u2019atrio destro attorno all\u2019anello tricuspidale, dipendente dall\u2019istmo cavo-tricuspidale.',
    criteri: ['Onde F regolari a dente di sega, senza linea isoelettrica, circa 250–350/min', 'Tipico antiorario: onde F negative in DII, DIII, aVF e positive in V1', 'Conduzione AV spesso 2:1, con frequenza ventricolare vicina a 150/min'],
    meccanismo: 'L\u2019impulso sale lungo il setto interatriale e scende lungo la parete laterale dell\u2019atrio destro; l\u2019istmo cavo-tricuspidale è il bersaglio dell\u2019ablazione.',
    vettori: 'Durante la salita settale il vettore atriale punta verso l\u2019alto: fase lenta negativa nelle inferiori. La discesa laterale dà la risalita rapida. Nel 3D la particella gira attorno alla tricuspide.',
    guarda: 'DII, DIII e aVF per il dente di sega; V1 per le onde F positive.',
    dd: ['Tachicardia sinusale a 150/min', 'Tachicardia atriale focale (linea isoelettrica tra le P)', 'Fibrillazione atriale grossolana'],
    trappole: 'Nel 2:1 un\u2019onda F cade dentro il QRS o la T: prova a immaginare le onde a metà dell\u2019intervallo RR.',
    fonte: SRC.svt
  }
});
add({
  id: 'avnrt', cat: 'Sopraventricolari', name: 'TPSV da rientro nodale', quiz: true,
  params: [{ k: 'vr', label: 'Frequenza', unit: '/min', min: 140, max: 240, step: 1, def: 185 }],
  build: p => ({ mode: 'svt', vRate: p.vr, qtc: 400 }), look: ['II', 'V1'],
  card: {
    def: 'Tachicardia regolare a QRS stretto da rientro all\u2019interno del nodo AV, tra via lenta e via veloce (forma tipica lenta-veloce).',
    criteri: ['QRS stretto, RR regolare, frequenza di solito 150–250/min', 'P retrograda non visibile o subito dopo il QRS', 'Pseudo-r\u2032 in V1 e pseudo-S in DII, DIII, aVF', 'Esordio e fine improvvisi'],
    meccanismo: 'Anterogrado sulla via lenta, retrogrado sulla via veloce: atri e ventricoli si attivano quasi insieme.',
    vettori: 'Il vettore della P retrograda punta verso l\u2019alto e cade alla fine del QRS: aggiunge una piccola deflessione terminale negativa nelle inferiori.',
    guarda: 'V1 (pseudo-r\u2032) e DII (pseudo-S).',
    dd: ['AVRT ortodromica (P retrograda più distante dal QRS)', 'Flutter 2:1', 'Tachicardia atriale focale'],
    trappole: 'Confronta con un ECG in ritmo sinusale: la pseudo-r\u2032 scompare.',
    fonte: SRC.svt
  }
});

/* ================= BLOCCHI AV ================= */
add({
  id: 'bav1', cat: 'Blocchi AV', name: 'BAV di I grado', quiz: true,
  params: [F.hr(68, 45, 100), F.pr(280, 205, 400)],
  build: p => ({ rate: p.hr, pr: p.pr, av: 'I', qtc: 410 }), look: ['II'],
  card: {
    def: 'Rallentamento della conduzione AV con tutte le P condotte.',
    criteri: ['PR > 200 ms', 'Rapporto P:QRS 1:1', 'PR costante'],
    meccanismo: 'Di solito ritardo nel nodo AV (vagotonia, farmaci, degenerazione), più raramente nel sistema His-Purkinje.',
    vettori: 'I vettori non cambiano: si allunga solo la distanza tra il vettore atriale e quello ventricolare.',
    guarda: 'DII: misura il PR dall\u2019inizio della P all\u2019inizio del QRS.',
    dd: ['Ritmo sinusale con P a bassa ampiezza', 'Ritmo giunzionale con P retrograda'],
    trappole: 'Con PR molto lungo la P può sovrapporsi alla T precedente.',
    fonte: SRC.brady
  }
});
add({
  id: 'wenck', cat: 'Blocchi AV', name: 'BAV di II grado Mobitz 1 (Wenckebach)', quiz: true,
  params: [F.hr(80, 55, 110), { k: 'ratio', label: 'Rapporto', type: 'select', def: '4', opts: [['3', '3:2'], ['4', '4:3'], ['5', '5:4'], ['6', '6:5']] }],
  build: p => ({ rate: p.hr, pr: 180, av: 'wenck', ratio: +p.ratio, qtc: 410 }), look: ['II'],
  card: {
    def: 'Allungamento progressivo del PR fino a una P non condotta, poi il ciclo ricomincia.',
    criteri: ['PR progressivamente più lungo fino a una P bloccata', 'Il PR dopo la pausa è il più breve del ciclo', 'Gli RR tendono ad accorciarsi prima della pausa (l\u2019incremento del PR si riduce)', 'La pausa è inferiore al doppio del ciclo PP'],
    meccanismo: 'Affaticamento decrementale del nodo AV: sede quasi sempre sopra-hissiana, spesso vagale o da ischemia inferiore.',
    vettori: 'I vettori ventricolari restano normali. Nel 3D il nodo AV lampeggia in rosso quando la P non passa.',
    guarda: 'DII in striscia lunga: confronta il PR del primo e dell\u2019ultimo battito del gruppo.',
    dd: ['Mobitz 2 (PR costante)', 'Extrasistoli atriali bloccate', 'Aritmia sinusale'],
    trappole: 'Il battimento raggruppato («group beating») è il segno che si nota prima ancora di misurare.',
    fonte: SRC.brady
  }
});
add({
  id: 'mobitz2', cat: 'Blocchi AV', name: 'BAV di II grado Mobitz 2', quiz: true,
  params: [F.hr(78, 55, 100), { k: 'ratio', label: 'Rapporto', type: 'select', def: '4', opts: [['3', '3:2'], ['4', '4:3'], ['5', '5:4']] }, { k: 'qrs', label: 'QRS', type: 'select', def: 'rbbb', opts: [['n', 'Stretto'], ['rbbb', 'Blocco di branca destra']] }],
  build: p => ({ rate: p.hr, pr: 170, av: 'mobitz2', ratio: +p.ratio, qtc: 420, qrs: p.qrs === 'rbbb' ? M.qrsRBBB() : M.qrsNormal(), T: p.qrs === 'rbbb' ? { a: 40, g: -25, amp: 0.3 } : null, via: p.qrs === 'rbbb' ? 'rbbb' : null }), look: ['II', 'V1'],
  card: {
    def: 'P improvvisamente non condotta con PR costante nei battiti condotti.',
    criteri: ['PR costante prima e dopo la P bloccata', 'P non condotta senza allungamento progressivo del PR', 'Intervallo PP costante', 'Spesso QRS largo: sede infranodale'],
    meccanismo: 'Blocco tutto-o-nulla nel sistema His-Purkinje. Rischio di progressione verso il blocco completo: in genere indicazione a pacemaker anche senza sintomi.',
    vettori: 'Se c\u2019è un blocco di branca associato, il QRS mostra il vettore terminale ritardato verso destra e in avanti.',
    guarda: 'DII per il PR, V1 per il QRS.',
    dd: ['Mobitz 1', 'Extrasistole atriale bloccata (P prematura)', 'BAV 2:1'],
    trappole: 'Confronta il PR del battito prima e dopo la pausa: nel Mobitz 2 è identico.',
    fonte: SRC.brady
  }
});
add({
  id: 'bav21', cat: 'Blocchi AV', name: 'BAV di II grado 2:1', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza atriale', unit: '/min', min: 70, max: 120, step: 1, def: 88 }, F.pr(190, 140, 320)],
  build: p => ({ rate: p.hr, pr: p.pr, av: '2to1', qtc: 430 }), look: ['II', 'V1'],
  card: {
    def: 'Una P condotta e una bloccata, alternate.',
    criteri: ['Rapporto P:QRS fisso 2:1', 'P bloccata spesso vicina o dentro la T', 'Non si può classificare come Mobitz 1 o 2 perché non ci sono due PR consecutivi da confrontare'],
    meccanismo: 'Può essere nodale o infranodale. QRS stretto e PR lungo orientano verso il nodo; QRS largo verso il sistema His-Purkinje.',
    vettori: 'Ogni seconda P non genera vettori ventricolari.',
    guarda: 'V1 e DII: cerca la P nascosta nella T.',
    dd: ['Bradicardia sinusale', 'Extrasistoli atriali bloccate in bigeminismo', 'BAV di alto grado'],
    trappole: 'Una T «strana» o bifida può contenere la P bloccata.',
    fonte: SRC.brady
  }
});
add({
  id: 'bav3', cat: 'Blocchi AV', name: 'BAV di III grado', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza atriale', unit: '/min', min: 60, max: 110, step: 1, def: 84 }, { k: 'esc', label: 'Scappamento', type: 'select', def: 'giunzionale', opts: [['giunzionale', 'Giunzionale'], ['ventricolare', 'Ventricolare']] }],
  build: p => ({ rate: p.hr, av: 'III', escape: p.esc, escRate: p.esc === 'ventricolare' ? 26 : 44, qtc: 440 }), look: ['II', 'V1'],
  card: {
    def: 'Nessuna P viene condotta ai ventricoli: atri e ventricoli battono in modo indipendente.',
    criteri: ['Dissociazione AV completa: PR variabile senza relazione', 'Frequenza atriale maggiore della ventricolare', 'Ritmo di scappamento regolare', 'Scappamento giunzionale: QRS stretto, 40–60/min; ventricolare: QRS largo, 20–40/min'],
    meccanismo: 'Blocco completo nel nodo AV (spesso transitorio, ad esempio nell\u2019infarto inferiore) o nel sistema His-Purkinje (degenerativo).',
    vettori: 'Due sorgenti indipendenti: il vettore atriale segue il nodo del seno, il vettore ventricolare parte dal pacemaker di scappamento. Con lo scappamento ventricolare il QRS è largo e ha un asse anomalo.',
    guarda: 'DII in striscia lunga: le P «marciano» attraverso i QRS.',
    dd: ['Dissociazione AV isoritmica', 'BAV 2:1', 'Ritmo giunzionale accelerato'],
    trappole: 'Segna le P con il compasso: devono essere regolari e indipendenti dai QRS.',
    fonte: SRC.brady
  }
});

/* ================= CONDUZIONE INTRAVENTRICOLARE ================= */
add({
  id: 'bbdx', cat: 'Conduzione intraventricolare', name: 'Blocco di branca destra', quiz: true,
  params: [F.hr(72, 50, 110)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 430, qrs: M.qrsRBBB(), T: { a: 35, g: -30, amp: 0.3 }, via: 'rbbb' }), look: ['V1', 'V2', 'I', 'V6'],
  card: {
    def: 'Ritardo o blocco della conduzione nella branca destra: il ventricolo destro si attiva tardi, dal sinistro attraverso il miocardio.',
    criteri: ['QRS ≥ 120 ms nell\u2019adulto', 'rsr\u2032, rsR\u2032 o rSR\u2032 in V1 o V2, con R\u2032 di solito più larga della R iniziale', 'S più lunga della R o > 40 ms in DI e V6', 'R peak time normale in V5–V6 ma > 50 ms in V1', 'I primi tre criteri sono necessari per la diagnosi'],
    meccanismo: 'Setto e ventricolo sinistro si attivano normalmente; l\u2019attivazione del ventricolo destro arriva tardi e lenta, cellula per cellula.',
    vettori: 'I primi vettori sono normali (q settale, R sinistra). Poi compare un vettore terminale lento diretto a destra e in avanti: produce la R\u2032 in V1 e la S larga in DI e V6. La T è discordante con il vettore terminale, quindi negativa in V1–V2.',
    guarda: 'V1–V2 per la R\u2032, DI e V6 per la S larga.',
    dd: ['Blocco incompleto (QRS 110–119 ms)', 'Brugada', 'Ipertrofia ventricolare destra', 'Infarto posteriore (R alta in V1)'],
    trappole: 'Il BBDx non impedisce di riconoscere un infarto: le onde Q e lo ST restano interpretabili.',
    fonte: SRC.aha3
  }
});
add({
  id: 'bbsx', cat: 'Conduzione intraventricolare', name: 'Blocco di branca sinistra', quiz: true,
  params: [F.hr(70, 50, 110)],
  build: p => ({ rate: p.hr, pr: 170, qtc: 440, qrs: M.qrsLBBB(), T: { a: 165, g: 42, amp: 0.4 }, st: { a: 165, g: 42, amp: 0.09 }, via: 'lbbb' }), look: ['V1', 'V6', 'I', 'aVL'],
  card: {
    def: 'Blocco della conduzione nella branca sinistra: il setto si attiva da destra verso sinistra e il ventricolo sinistro si attiva tardi.',
    criteri: ['QRS ≥ 120 ms nell\u2019adulto', 'R larga, intaccata o impastata in DI, aVL, V5 e V6', 'Assenza di q in DI, V5 e V6 (una q stretta in aVL può essere normale)', 'R peak time > 60 ms in V5–V6, normale in V1–V3 quando si vede una piccola r', 'ST e T di solito opposti al QRS'],
    meccanismo: 'L\u2019impulso scende solo nella branca destra: il setto si depolarizza al contrario e la parete libera sinistra viene raggiunta lentamente attraverso il miocardio.',
    vettori: 'Già il primo vettore punta a sinistra, per questo sparisce la q in DI e V6. Segue un vettore lento e prolungato verso sinistra e indietro: R larga in V6, QS o rS profonda in V1. ST e T sono discordanti.',
    guarda: 'V1 (QS o rS profonda), V6 e DI (R larga senza q).',
    dd: ['Ipertrofia ventricolare sinistra con ritardo di conduzione', 'Ritmo da pacemaker ventricolare', 'Ritardo di conduzione intraventricolare aspecifico'],
    trappole: 'Nel BBS lo ST discordante è atteso e non va letto come ischemia. Diventa sospetto quando rompe la regola: concordante con il QRS, sottoslivellato in V1–V3, oppure discordante ma sproporzionato (≥ 5 mm o ≥ 25% della S). Il sospetto clinico e la troponina restano decisivi.',
    fonte: SRC.aha3
  }
});
add({
  id: 'eas', cat: 'Conduzione intraventricolare', name: 'Emiblocco anteriore sinistro', quiz: true,
  params: [F.hr(72, 50, 110)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 420, qrs: M.qrsLAFB(), via: 'lafb' }), look: ['I', 'aVL', 'II', 'III', 'aVF'],
  card: {
    def: 'Blocco del fascicolo anteriore della branca sinistra con deviazione assiale sinistra marcata.',
    criteri: ['Asse frontale tra −45° e −90°', 'qR in aVL', 'R peak time in aVL ≥ 45 ms', 'QRS < 120 ms'],
    meccanismo: 'La parete anterosuperiore del ventricolo sinistro si attiva per ultima, raggiunta dal fascicolo posteriore.',
    vettori: 'Il vettore iniziale va in basso e a destra (q in DI e aVL, r nelle inferiori); poi il vettore principale ruota verso l\u2019alto e a sinistra: R in aVL, S profonde in DII, DIII e aVF.',
    guarda: 'DI, aVL, DII, DIII, aVF.',
    dd: ['Infarto inferiore (Q nelle inferiori, non rS)', 'Pre-eccitazione', 'Ipertrofia ventricolare sinistra'],
    trappole: 'Nell\u2019EAS DII, DIII e aVF hanno una piccola r iniziale (rS). Una QS in quelle derivazioni fa pensare a un infarto inferiore.',
    fonte: SRC.aha3
  }
});
add({
  id: 'eps', cat: 'Conduzione intraventricolare', name: 'Emiblocco posteriore sinistro', quiz: true,
  params: [F.hr(72, 50, 110)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 420, qrs: M.qrsLPFB(), via: 'lpfb' }), look: ['I', 'aVL', 'III', 'aVF'],
  card: {
    def: 'Blocco del fascicolo posteriore della branca sinistra con deviazione assiale destra.',
    criteri: ['Asse frontale tra +90° e +180° nell\u2019adulto', 'rS in DI e aVL', 'qR in DIII e aVF', 'QRS < 120 ms', 'Esclusione di ipertrofia ventricolare destra e infarto laterale'],
    meccanismo: 'La parete inferoposteriore del ventricolo sinistro si attiva per ultima. È raro isolato: il fascicolo posteriore è corto, spesso e ben irrorato.',
    vettori: 'Vettore iniziale verso l\u2019alto e a sinistra (r in DI, q in DIII), poi vettore principale verso il basso e a destra.',
    guarda: 'DI e aVL (rS), DIII e aVF (qR).',
    dd: ['Ipertrofia ventricolare destra', 'Embolia polmonare', 'Infarto laterale', 'Soggetto giovane longilineo'],
    trappole: 'È una diagnosi di esclusione: prima vanno cercate le cause di deviazione assiale destra.',
    fonte: SRC.aha3
  }
});
add({
  id: 'wpw', cat: 'Conduzione intraventricolare', name: 'Pre-eccitazione (Wolff-Parkinson-White)', quiz: true,
  params: [F.hr(74, 50, 110), F.pr(100, 80, 118)],
  build: p => ({ rate: p.hr, pr: p.pr, qtc: 420, qrs: M.qrsWPW(), T: { a: -60, g: -10, amp: 0.26 }, via: 'wpw' }), look: ['V1', 'I', 'aVL', 'II'],
  card: {
    def: 'Conduzione anterograda attraverso una via accessoria (fascio di Kent) che salta il nodo AV e pre-eccita parte dei ventricoli. Qui la via è sinistra laterale.',
    criteri: ['PR < 120 ms nell\u2019adulto in ritmo sinusale', 'Onda delta: impastamento iniziale del QRS', 'QRS allargato, di solito > 120 ms (meno se la pre-eccitazione è parziale)', 'Alterazioni secondarie di ST e T, discordanti rispetto all\u2019onda delta'],
    meccanismo: 'La via accessoria non ha il ritardo decrementale del nodo AV: il ventricolo vicino all\u2019inserzione si attiva subito e lentamente, poi il resto viene raggiunto per le vie normali (battito di fusione).',
    vettori: 'L\u2019onda delta è un vettore lento che parte dal punto di inserzione: con via sinistra laterale va verso destra e in avanti, quindi è positiva in V1 e negativa in DI e aVL (può simulare onde Q). Il resto del QRS è normale.',
    guarda: 'V1 (delta positiva), DI e aVL (delta negativa), PR in DII.',
    dd: ['Infarto (pseudo-onde Q)', 'Blocco di branca', 'Ipertrofia ventricolare'],
    trappole: 'La polarità della delta nelle varie derivazioni permette di localizzare la via; in FA pre-eccitata sono controindicati i farmaci che bloccano il nodo AV.',
    fonte: SRC.aha3 + '; ' + SRC.svt
  }
});

/* ================= VENTRICOLARI ================= */
add({
  id: 'esv', cat: 'Ventricolari', name: 'Extrasistoli ventricolari', quiz: true,
  params: [F.hr(72, 50, 100),
    { k: 'pat', label: 'Schema', type: 'select', def: 'isolate', opts: [['isolate', 'Isolate'], ['bigeminismo', 'Bigeminismo'], ['trigeminismo', 'Trigeminismo'], ['quadrigeminismo', 'Quadrigeminismo'], ['coppie', 'Coppie (doppiette)'], ['triplette', 'Triplette'], ['salve', 'Salve: TV non sostenuta']] },
    { k: 'prob', label: 'Quante ne compaiono', unit: '%', min: 5, max: 60, step: 1, def: 18 },
    { k: 'orig', label: 'Origine', type: 'select', def: 'rvot', opts: [['rvot', 'Tratto di efflusso destro'], ['lv', 'Ventricolo sinistro laterale'], ['multi', 'Multifocali: due morfologie']] },
    { k: 'coup', label: 'Intervallo di accoppiamento', unit: '% del RR', min: 28, max: 85, step: 1, def: 52 }],
  build: p => {
    const rvot = { q: M.qrsPVC_RVOT(), T: { a: -95, g: 35, amp: 0.45 } };
    const lv = { q: M.qrsPVC_LV(), T: { a: -30, g: -50, amp: 0.45 } };
    const s = p.orig === 'lv' ? lv : rvot;
    return { rate: p.hr, pr: 160, qtc: 410, ectopy: { type: 'pvc', pattern: p.pat, prob: p.prob / 100, coupling: p.coup / 100, qrs: s.q, T: s.T, alt: p.orig === 'multi' ? lv.q : null, altT: p.orig === 'multi' ? lv.T : null } };
  }, look: ['II', 'V1'],
  card: {
    def: 'Battiti prematuri originati nel miocardio ventricolare, al di fuori del sistema di conduzione.',
    criteri: ['QRS largo e prematuro, non preceduto da P', 'T opposta alla parte principale del QRS', 'Pausa compensatoria completa: l\u2019intervallo fra i due battiti sinusali che la racchiudono vale il doppio del ciclo di base', 'Monomorfe se hanno tutte la stessa forma, polimorfe o multifocali se le forme sono diverse', 'Il linguaggio: due di fila sono una coppia o doppietta, tre di fila una tripletta, da tre in su a oltre 100/min è una tachicardia ventricolare non sostenuta se dura meno di 30 secondi', 'Bigeminismo, trigeminismo e quadrigeminismo quando l\u2019extrasistole segue ogni battito, ogni due o ogni tre', 'Fenomeno R su T: accoppiamento cortissimo, l\u2019extrasistole cade sulla T precedente e può innescare una torsione di punta o una fibrillazione ventricolare'],
    meccanismo: 'Automatismo, attività triggerata o microrientro in un focus ventricolare. L\u2019attivazione si propaga lentamente attraverso il miocardio.',
    vettori: 'Il vettore parte dal focus e si allontana da esso. Dal tratto di efflusso destro va verso il basso e indietro: QRS positivo nelle inferiori, negativo in V1 (morfologia tipo BBSx con asse inferiore). Dal ventricolo sinistro laterale va verso destra: QRS positivo in V1 e negativo in DI e V6.',
    guarda: 'DII e V1: la morfologia in V1 e l\u2019asse frontale indicano l\u2019origine.',
    dd: ['Extrasistole atriale aberrante (P prematura)', 'Battito di fusione', 'Pre-eccitazione intermittente'],
    trappole: 'La sinusale dopo la ESV cade nella refrattarietà e non si conduce: per questo la pausa è compensatoria.',
    fonte: SRC.va
  }
});
add({
  id: 'tv', cat: 'Ventricolari', name: 'Tachicardia ventricolare monomorfa', quiz: true,
  params: [{ k: 'vr', label: 'Frequenza ventricolare', unit: '/min', min: 120, max: 240, step: 1, def: 170 }, { k: 'ar', label: 'Frequenza sinusale dissociata', unit: '/min', min: 60, max: 110, step: 1, def: 82 }],
  build: p => ({ mode: 'vt', vRate: p.vr, aRate: p.ar, vtQrs: M.qrsVTscar(), vtT: { a: 40, g: -30, amp: 0.45 }, qtc: 400 }), look: ['aVR', 'V1', 'V6', 'II'],
  card: {
    def: 'Tachicardia a QRS largo originata nei ventricoli. Qui è una TV da cicatrice inferolaterale del ventricolo sinistro.',
    criteri: ['Almeno 3 battiti ventricolari consecutivi sopra 100/min; sostenuta se dura più di 30 secondi o richiede interruzione', 'QRS largo e regolare', 'Dissociazione AV, battiti di cattura o di fusione: segni molto specifici', 'Asse tra −90° e ±180° («terra di nessuno») e R iniziale in aVR orientano verso TV', 'Assenza di complessi RS nelle precordiali o intervallo R-nadir di S > 100 ms (algoritmo di Brugada)'],
    meccanismo: 'Rientro attorno a una cicatrice, spesso post-infartuale. L\u2019attivazione parte dall\u2019uscita del circuito e procede lentamente nel miocardio.',
    vettori: 'Il fronte d\u2019onda parte dalla regione inferolaterale e va verso l\u2019alto, a destra e in avanti: QRS negativo in DII, DIII e aVF, positivo in aVR e V1, negativo in V6. Le P sinusali continuano con i propri vettori, dissociate.',
    guarda: 'aVR (R iniziale), V1–V6 (assenza di RS), DII in striscia lunga (P dissociate).',
    dd: ['TSV con aberranza di branca', 'TSV pre-eccitata', 'Iperkaliemia o farmaci bloccanti i canali del sodio', 'Ritmo da pacemaker'],
    trappole: 'Una tachicardia a QRS largo va trattata come TV finché non si dimostra il contrario. La stabilità emodinamica non esclude la TV.',
    fonte: SRC.va
  }
});
add({
  id: 'tdp', cat: 'Ventricolari', name: 'Torsione di punta', quiz: true,
  params: [{ k: 'r', label: 'Frequenza', unit: '/min', min: 180, max: 300, step: 5, def: 240 }],
  build: p => ({ mode: 'continuous', cont: 'torsade', tdpRate: p.r, tdpAmp: 1.1 }), look: ['II', 'V2'],
  card: {
    def: 'Tachicardia ventricolare polimorfa associata a QT lungo, con QRS che sembrano ruotare attorno alla linea di base.',
    criteri: ['QRS larghi, polimorfi, 160–250/min o più', 'Ampiezza e polarità che variano ciclicamente ogni 5–20 battiti', 'Contesto di QT lungo, spesso innescata da una sequenza pausa lunga-battito corto'],
    meccanismo: 'Postpotenziali precoci da ripolarizzazione prolungata (farmaci, ipokaliemia, ipomagnesiemia, bradicardia, forme congenite) e rientro funzionale con asse che ruota.',
    vettori: 'Il vettore ventricolare ruota lentamente nello spazio: le derivazioni lo vedono prima avvicinarsi e poi allontanarsi, da cui la «torsione».',
    guarda: 'Tutte le derivazioni: la torsione non è visibile allo stesso modo ovunque.',
    dd: ['TV polimorfa da ischemia (QT normale)', 'Fibrillazione ventricolare', 'Artefatto da movimento'],
    trappole: 'Il trattamento è diverso dalla TV polimorfa ischemica: magnesio, correzione degli elettroliti, aumento della frequenza.',
    fonte: SRC.va
  }
});
add({
  id: 'fv', cat: 'Ventricolari', name: 'Fibrillazione ventricolare', quiz: true,
  params: [{ k: 'amp', label: 'Ampiezza', type: 'select', def: '0.55', opts: [['0.55', 'Grossolana'], ['0.2', 'Fine']] }],
  build: p => ({ mode: 'continuous', cont: 'vf', vfAmp: +p.amp }), look: ['II'],
  card: {
    def: 'Attività elettrica ventricolare caotica senza contrazione efficace: arresto cardiaco.',
    criteri: ['Nessun QRS, onda P o T riconoscibile', 'Oscillazioni irregolari per frequenza, ampiezza e morfologia', 'Forma grossolana o fine'],
    meccanismo: 'Molteplici fronti d\u2019onda che si frammentano e rientrano nel miocardio ventricolare.',
    vettori: 'Non esiste un vettore medio: nel 3D il vettore cambia direzione senza schema.',
    guarda: 'Qualsiasi derivazione, poi il paziente.',
    dd: ['Artefatto (paziente cosciente, elettrodo staccato)', 'Asistolia (FV molto fine)', 'Torsione di punta'],
    trappole: 'Una FV fine può sembrare asistolia: controlla in più derivazioni e aumenta il guadagno.',
    fonte: SRC.va
  }
});

/* ================= ISCHEMIA ================= */
function stemiCard(terr) {
  const base = {
    inferiore: { guarda: 'DII, DIII, aVF (sopraslivellamento); DI e aVL (sottoslivellamento reciproco).', vett: 'Il vettore di lesione punta verso la zona lesa, in basso e un po\u2019 a destra: le inferiori lo vedono avvicinarsi (ST su, DIII più di DII se la coronaria è la destra), aVL lo vede allontanarsi (ST giù).', dd: ['Pericardite (ST diffuso senza reciprocità, PR sottoslivellato)', 'Ripolarizzazione precoce', 'Aneurisma ventricolare'], trap: 'Registra V4R: un sopraslivellamento lì indica coinvolgimento del ventricolo destro, con importanti conseguenze sul trattamento.' },
    anteriore: { guarda: 'V1–V4 (sopraslivellamento), talvolta DI e aVL; DIII e aVF per la reciprocità.', vett: 'Il vettore di lesione punta in avanti e a sinistra: le precordiali lo vedono avvicinarsi. La parete inferiore, opposta, può mostrare sottoslivellamento.', dd: ['Ripolarizzazione precoce', 'Aneurisma del ventricolo sinistro', 'Takotsubo', 'Brugada'], trap: 'In V2–V3 le soglie dipendono da età e sesso: una T iperacuta larga e simmetrica può precedere lo ST.' },
    laterale: { guarda: 'DI, aVL, V5, V6 (sopraslivellamento); DIII e aVF per la reciprocità.', vett: 'Il vettore di lesione punta a sinistra e in alto: DI, aVL e le precordiali sinistre lo vedono avvicinarsi, DIII lo vede allontanarsi.', dd: ['Ipertrofia ventricolare sinistra con strain', 'Pericardite'], trap: 'Il sopraslivellamento in aVL può essere minimo: il sottoslivellamento reciproco in DIII spesso è più evidente.' },
    posteriore: { guarda: 'V1–V3: sottoslivellamento ST con R alta e T positiva; confermare con V7–V9.', vett: 'Il vettore di lesione punta indietro: le precordiali anteriori lo vedono allontanarsi e registrano l\u2019immagine speculare. La perdita delle forze posteriori fa crescere la R in V1–V2.', dd: ['Ischemia subendocardica anteriore', 'Blocco di branca destra', 'Ipertrofia ventricolare destra'], trap: 'Capovolgi mentalmente V1–V3: il sottoslivellamento diventa un sopraslivellamento e la R alta diventa una Q.' }
  }[terr];
  return {
    def: 'Occlusione coronarica acuta con lesione transmurale della parete ' + TERR[terr].label + '.',
    criteri: terr === 'posteriore'
      ? ['Sottoslivellamento ST ≥ 1 mm in V1, V2 e/o V3, soprattutto se la R supera la S in V1 o V2 (5ª UDMI)', 'Conferma con sopraslivellamento ST nelle derivazioni posteriori V7–V9: soglia ≥ 0,5 mm (ESC 2023)', 'Spesso associato a infarto inferiore o laterale']
      : ['Nuovo sopraslivellamento del punto J in almeno 2 derivazioni contigue', '≥ 1 mm in tutte le derivazioni tranne V2–V3', 'In V2–V3: ≥ 2,5 mm negli uomini < 40 anni, ≥ 2 mm negli uomini ≥ 40 anni, ≥ 1,5 mm nelle donne a qualsiasi età', 'Valido in assenza di ipertrofia ventricolare sinistra e blocco di branca sinistra', 'Il sottoslivellamento reciproco rafforza l\u2019origine coronarica: nelle forme non ischemiche il sopraslivellamento è in genere diffuso e senza reciprocità'].concat(terr === 'inferiore' ? ['Coinvolgimento del ventricolo destro: sopraslivellamento in V3R–V6R, soprattutto se associato a sopraslivellamento in aVR (5ª UDMI)'] : []),
    meccanismo: 'La zona ischemica ha un potenziale di riposo meno negativo e un potenziale d\u2019azione accorciato: nasce una corrente di lesione tra tessuto sano e tessuto leso durante il segmento ST.',
    vettori: base.vett + ' Usa il cursore «Fase»: prima la T iperacuta, poi lo ST, poi la comparsa di Q (il vettore iniziale si allontana dalla necrosi) e l\u2019inversione della T.',
    guarda: base.guarda, dd: base.dd, trappole: base.trap, fonte: SRC.udmi + '; ' + SRC.acs
  };
}
['inferiore', 'anteriore', 'laterale', 'posteriore'].forEach(terr => add({
  id: 'stemi-' + terr, cat: 'Ischemia', name: 'STEMI ' + terr, quiz: true,
  params: [FASE, { k: 'st', label: 'Sopraslivellamento massimo', unit: 'mm', min: 1, max: 6, step: 0.5, def: 3 }, F.hr(80, 50, 120)],
  build: p => stemiCfg(terr, p),
  look: { inferiore: ['II', 'III', 'aVF', 'aVL'], anteriore: ['V1', 'V2', 'V3', 'V4'], laterale: ['I', 'aVL', 'V5', 'V6'], posteriore: ['V1', 'V2', 'V3'] }[terr],
  card: stemiCard(terr)
}));

/* ================= IPERTROFIE ================= */
add({
  id: 'ivs', cat: 'Ipertrofie', name: 'Ipertrofia ventricolare sinistra con strain', quiz: true,
  params: [F.hr(70, 50, 100), { k: 'strain', label: 'Sovraccarico (strain)', type: 'select', def: '1', opts: [['0', 'Assente'], ['1', 'Presente']] },
    { k: 'volt', label: 'Voltaggi del QRS', unit: '×', min: 0.7, max: 1.4, step: 0.05, def: 1 }],
  build: p => ({ rate: p.hr, pr: 170, qtc: 430, qrs: M.qrsLVH(+p.volt || 1), pComps: M.pSinus(1, 1.12, 1, 1.5), T: +p.strain ? { a: 160, g: 45, amp: 0.36 } : { a: 40, g: 18, amp: 0.4 }, st: +p.strain ? { a: 160, g: 45, amp: 0.08 } : null }), look: ['V1', 'V5', 'V6', 'aVL'], indici: 'sinistra',
  card: {
    def: 'Aumento dei voltaggi del QRS da incremento della massa ventricolare sinistra, con possibili alterazioni secondarie della ripolarizzazione.',
    criteri: ['Sokolow-Lyon: S in V1 + R in V5 o V6 ≥ 35 mm', 'Cornell: R in aVL + S in V3 > 28 mm nell\u2019uomo, > 20 mm nella donna', 'Strain: ST sottoslivellato e T asimmetrica negativa in DI, aVL, V5, V6', 'Segni associati: ingrandimento atriale sinistro, deviazione assiale sinistra, R peak time allungato'],
    meccanismo: 'Più massa significa più dipolo e un percorso di attivazione più lungo; la ripolarizzazione del subendocardio ispessito si altera.',
    vettori: 'Il vettore R cresce in ampiezza verso sinistra e indietro: R altissime in V5–V6, S profonde in V1–V2. Con lo strain il vettore T si capovolge e si allontana dalla parete laterale.',
    guarda: 'V1 e V5–V6 per i voltaggi, aVL e V3 per Cornell, V5–V6 per lo strain.',
    dd: ['Soggetto giovane e magro (voltaggi alti fisiologici)', 'Blocco di branca sinistra', 'Ischemia laterale', 'Cardiomiopatia ipertrofica'],
    trappole: 'I criteri di voltaggio sono specifici ma poco sensibili: un ECG normale non esclude l\u2019ipertrofia.',
    fonte: SRC.aha5
  }
});
add({
  id: 'ivd', cat: 'Ipertrofie', name: 'Ipertrofia ventricolare destra', quiz: true,
  params: [F.hr(80, 50, 110)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 420, qrs: M.qrsRVH(), pComps: M.pPulmonale(1), T: { a: 55, g: -40, amp: 0.34 }, st: { a: 55, g: -40, amp: 0.05 } }), look: ['V1', 'V2', 'I', 'V6'], indici: 'destra',
  card: {
    def: 'Predominio delle forze elettriche del ventricolo destro per ipertrofia della sua parete.',
    criteri: ['Deviazione assiale destra (> +90°)', 'R dominante in V1 (R/S > 1, R ≥ 7 mm)', 'S profonde in V5–V6', 'Strain destro: ST sottoslivellato e T negative in V1–V3', 'P polmonare (P ≥ 2,5 mm in DII)'],
    meccanismo: 'Sovraccarico di pressione del ventricolo destro: ipertensione polmonare, stenosi polmonare, cardiopatie congenite, BPCO avanzata.',
    vettori: 'Il vettore principale ruota verso destra e in avanti: V1 vede avvicinarsi la R, V6 vede allontanarsi il vettore e registra una S profonda.',
    guarda: 'V1, V6, DI.',
    dd: ['Blocco di branca destra', 'Infarto posteriore', 'WPW con via sinistra', 'Destrocardia', 'Emiblocco posteriore sinistro'],
    trappole: 'La R alta in V1 ha poche cause: memorizzale insieme e distinguile con asse, durata del QRS e T.',
    fonte: SRC.aha5
  }
});

/* ================= ELETTROLITI, FARMACI, ALTRO ================= */
add({
  id: 'iperk', cat: 'Elettroliti e altro', name: 'Iperkaliemia', quiz: true,
  params: [{ k: 'k', label: 'Potassio', unit: 'mmol/L', min: 5.0, max: 9.0, step: 0.1, def: 6.8 }, F.hr(72, 45, 110)],
  build: p => {
    const K = p.k;
    return { rate: p.hr, pr: 160 + Math.max(0, K - 6.2) * 38, qtc: 410 - (K - 5) * 16, st: { a: 125, g: 58, amp: 0.03 * Math.max(0, K - 6) }, peaked: clamp((K - 5.2) / 1.8, 0, 1), T: { a: 45, g: 18, amp: 0.34 + 0.55 * clamp((K - 5.3) / 1.8, 0, 1.2) }, pAmp: clamp(1 - (K - 6.3) * 0.5, 0, 1), qrsScale: 1 + Math.max(0, K - 6.8) * 0.5, jit: 6 };
  }, look: ['V2', 'V3', 'V4', 'II'],
  card: {
    def: 'Aumento del potassio extracellulare con alterazioni progressive di ripolarizzazione, conduzione atriale e intraventricolare.',
    criteri: ['T alte, appuntite, strette alla base e simmetriche', 'Poi P appiattita e PR allungato fino alla scomparsa della P', 'Poi QRS allargato, fino all\u2019aspetto sinusoidale', 'Rischio di bradiaritmie, FV, asistolia'],
    meccanismo: 'Il potassio alto riduce il potenziale di riposo e accelera la ripolarizzazione (T appuntita); l\u2019inattivazione dei canali del sodio rallenta la conduzione (P e QRS larghi).',
    vettori: 'La direzione dei vettori non cambia: cambiano la forma nel tempo della T e la durata del QRS. Muovi il cursore del potassio e guarda la sequenza.',
    guarda: 'V2–V4 per le T; DII per la P.',
    dd: ['T iperacute dell\u2019infarto (più larghe alla base)', 'Ripolarizzazione precoce', 'Blocco di branca (QRS largo con K normale)'],
    trappole: 'La sequenza ECG correla male con il valore esatto del potassio: un ECG quasi normale non esclude un\u2019iperkaliemia grave.',
    fonte: SRC.aha4
  }
});
add({
  id: 'ipok', cat: 'Elettroliti e altro', name: 'Ipokaliemia', quiz: true,
  params: [{ k: 'k', label: 'Potassio', unit: 'mmol/L', min: 1.8, max: 3.4, step: 0.1, def: 2.5 }, F.hr(76, 50, 110)],
  build: p => { const d = 3.5 - p.k; return { rate: p.hr, pr: 170, qtc: 420, T: { a: 45, g: 20, amp: Math.max(0.07, 0.34 - d * 0.16) }, u: 0.04 + d * 0.11, st: { a: 45, g: 20, amp: -0.035 * d } }; }, look: ['V2', 'V3', 'II'],
  card: {
    def: 'Riduzione del potassio con prolungamento della ripolarizzazione e comparsa di onde U.',
    criteri: ['T appiattite o negative', 'Onde U prominenti, soprattutto in V2–V3', 'ST sottoslivellato', 'QT apparentemente lungo per fusione T-U', 'Aumentato rischio di aritmie e torsione di punta'],
    meccanismo: 'Il potassio basso rallenta la ripolarizzazione ventricolare (fase 3) e ne aumenta l\u2019eterogeneità.',
    vettori: 'Il vettore T si riduce mentre compare un vettore tardivo nella stessa direzione, l\u2019onda U.',
    guarda: 'V2–V3 per le U.',
    dd: ['QT lungo congenito o da farmaci', 'Effetto digitalico', 'Ischemia subendocardica'],
    trappole: 'Non includere l\u2019onda U nel QT quando è separata dalla T.',
    fonte: SRC.aha4
  }
});
add({
  id: 'qtlungo', cat: 'Elettroliti e altro', name: 'QT lungo', quiz: true,
  params: [F.qtc(520, 450, 640), { k: 'tipo', label: 'Aspetto della T', type: 'select', def: '1', opts: [['1', 'Tipo 1: T a base larga'], ['2', 'Tipo 2: T bassa e intaccata'], ['3', 'Tipo 3: T alta a inizio tardivo']] }, F.hr(64, 45, 100)],
  build: p => ({ rate: p.hr, pr: 160, qtc: p.qtc, tShape: { '1': 'broad', '2': 'notched', '3': 'late' }[p.tipo], T: { a: 45, g: 22, amp: p.tipo === '2' ? 0.26 : p.tipo === '3' ? 0.46 : 0.32 } }), look: ['II', 'V5'],
  card: {
    def: 'Prolungamento della ripolarizzazione ventricolare, congenito o acquisito.',
    criteri: ['QTc prolungato: ≥ 450 ms nell\u2019uomo, ≥ 460 ms nella donna (AHA/ACCF/HRS)', 'Sindrome del QT lungo: QTc ≥ 480 ms su ECG ripetuti, oppure score diagnostico > 3, oppure mutazione patogena (ESC 2022)', 'QTc > 500 ms: rischio elevato di torsione di punta'],
    meccanismo: 'Riduzione delle correnti ripolarizzanti del potassio o aumento delle correnti tardive del sodio: farmaci (antiaritmici, macrolidi, antipsicotici, ondansetron), elettroliti, bradicardia, forme genetiche.',
    vettori: 'Il vettore T mantiene la sua direzione ma arriva più tardi e dura di più.',
    guarda: 'DII e V5: misura il QT fino alla fine della T con il metodo della tangente.',
    dd: ['Onda U confusa con la T', 'QT allungato da QRS largo (usa il JT)'],
    trappole: 'La formula di Bazett sovrastima il QTc alle frequenze alte e lo sottostima a quelle basse; AHA consiglia formule lineari o Fridericia.',
    fonte: SRC.aha4 + '; ' + SRC.va
  }
});
add({
  id: 'pericardite', cat: 'Elettroliti e altro', name: 'Pericardite acuta', quiz: true,
  params: [{ k: 'st', label: 'Sopraslivellamento', unit: 'mm', min: 0.5, max: 4, step: 0.5, def: 2.5 }, F.hr(96, 60, 130)],
  build: p => ({ rate: p.hr, pr: 150, qtc: 410, st: { a: 50, g: 22, amp: p.st / 10 / 1.3 }, T: { a: 50, g: 22, amp: 0.38 }, pComps: M.pSinus(1).concat([PL(dirAG(-150, -20), 0.075, 105, 150, 10)]) }), look: ['II', 'V5', 'aVR'],
  card: {
    def: 'Infiammazione del pericardio con lesione subepicardica diffusa.',
    criteri: ['Sopraslivellamento ST diffuso, a concavità superiore, in molte derivazioni non riferibili a un solo territorio', 'Sottoslivellamento del PR (con PR sopraslivellato in aVR)', 'Assenza di reciprocità, tranne aVR e talvolta V1', 'Nessuna onda Q', 'Evoluzione in 4 stadi: ST su, normalizzazione, T negative, ritorno alla norma'],
    meccanismo: 'L\u2019infiammazione dell\u2019epicardio ventricolare e atriale genera correnti di lesione diffuse sia durante lo ST sia durante il PR.',
    vettori: 'Il vettore di lesione non punta a una parete ma verso l\u2019apice, perché la lesione è ovunque: quasi tutte le derivazioni lo vedono avvicinarsi, aVR lo vede allontanarsi. La lesione atriale produce un vettore opposto nel PR.',
    guarda: 'DII e V5 per ST e PR, aVR per l\u2019immagine opposta.',
    dd: ['STEMI (territoriale, con reciprocità e Q)', 'Ripolarizzazione precoce (J intaccato, rapporto ST/T basso in V6)'],
    trappole: 'Rapporto tra ST e altezza della T in V6 > 0,25 orienta verso la pericardite rispetto alla ripolarizzazione precoce.',
    fonte: SRC.peri
  }
});

/* ================= TEORIA ================= */
const THEORY = [
  { id: 'cose', title: '1. Che cos\u2019è un ECG e come si presenta', html: `
<p class="note">Impostazione del capitolo 1 di Gaita e Leclercq, aggiornata alle raccomandazioni AHA/ACCF/HRS.</p>
<p>L'ECG registra dalla superficie del corpo l'attività elettrica di tutto il cuore. In ogni istante la somma dei fronti di attivazione forma un <b>dipolo</b>, rappresentabile come un <b>vettore istantaneo</b> con direzione e ampiezza.</p>
<p>La regola da cui discende tutto: <b>un elettrodo che guarda la parte positiva del dipolo, cioè un fronte di depolarizzazione che gli si avvicina, registra una deflessione positiva; se il fronte si allontana la deflessione è negativa; se passa perpendicolare, isoelettrica o difasica</b>.</p>
<h4>La carta</h4>
<p>Velocità standard <b>25 mm/s</b>: 1 quadratino = 40 ms, 1 quadrato grande = 200 ms. Taratura standard <b>10 mm/mV</b>: il segnale di calibrazione all'inizio di ogni riga è alto 10 mm. A 50 mm/s i tempi raddoppiano sulla carta; con taratura a 5 mm/mV le ampiezze vanno raddoppiate.</p>
<p>La sequenza da tenere a mente leggendo un tracciato è quella degli eventi: <b>depolarizzazione atriale → conduzione atrio-ventricolare → depolarizzazione ventricolare → ripolarizzazione ventricolare</b>. La ripolarizzazione atriale non si vede perché è nascosta nel QRS.</p>` },
  { id: 'derivazioni', title: '2. Come si registra: le 12 derivazioni', html: `
<h4>Derivazioni periferiche (piano frontale)</h4>
<p><b>Bipolari di Einthoven</b>: DI a 0°, DII a +60°, DIII a +120°, con DII = DI + DIII. <b>Aumentate di Goldberger</b>: aVR a −150°, aVL a −30°, aVF a +90°. Insieme formano il sistema esassiale.</p>
<p>Cosa guardano: DI e aVL la faccia antero-laterale alta; DII, DIII e aVF la faccia inferiore; aVR guarda dentro le cavità, per questo normalmente è tutta negativa.</p>
<h4>Derivazioni precordiali (piano orizzontale)</h4>
<p>V1: 4° spazio intercostale, margine sternale destro. V2: 4° spazio, margine sternale sinistro. V3: a metà tra V2 e V4. V4: 5° spazio, emiclaveare sinistra. V5: ascellare anteriore, stesso piano di V4. V6: ascellare media, stesso piano.</p>
<p>Cosa guardano: V1 e V2 i tratti di efflusso dei ventricoli; V3 il setto; V4 l'apice; V5 e V6 la parete laterale del ventricolo sinistro.</p>
<h4>Derivazioni aggiuntive</h4>
<p><b>Destre</b> (V3R–V6R): specchio delle precordiali sull'emitorace destro; si registrano in ogni infarto inferiore per cercare il coinvolgimento del ventricolo destro. <b>Posteriori</b> (V7–V9): stesso piano di V6, rispettivamente ascellare posteriore, angolo della scapola e paravertebrale sinistra. Sul tracciato va sempre scritto che sono derivazioni aggiuntive.</p>
<h4>Territori e derivazioni contigue</h4>
<table class="ttab"><thead><tr><th>Sede</th><th>Derivazioni</th></tr></thead><tbody>
<tr><td>Settale</td><td>V1, V2</td></tr><tr><td>Anteriore</td><td>V2, V3, V4</td></tr><tr><td>Antero-laterale</td><td>V3–V6 (spesso DI e aVL)</td></tr><tr><td>Anteriore estesa</td><td>V1–V6, DI, aVL</td></tr><tr><td>Laterale</td><td>DI, aVL, V5, V6</td></tr><tr><td>Inferiore</td><td>DII, DIII, aVF</td></tr><tr><td>Infero-laterale</td><td>DII, DIII, aVF, V5, V6</td></tr><tr><td>Posteriore</td><td>Immagine speculare in V1–V3; diretta in V7–V9</td></tr><tr><td>Ventricolo destro</td><td>V3R–V6R</td></tr>
</tbody></table>` },
  { id: 'normale', title: '3. Come appare un ECG normale', html: `
<h4>Onda P</h4>
<p>Il nodo del seno è nella parte alta e postero-laterale dell'atrio destro: l'attivazione atriale va da destra a sinistra e dall'alto in basso. La P sinusale è positiva in DI e DII e negativa in aVR.</p>
<h4>QRS: le quattro fasi</h4>
<p>1) <b>Setto iniziale</b>, da sinistra verso destra: piccola r in V1, piccola q in V6. 2) <b>Setto intermedio e apice</b>, circa 20 ms. 3) <b>Parete libera e setto finale</b>, 40–60 ms: il ventricolo sinistro prevale e il vettore va a sinistra, da cui S in V1–V2 e R in V3–V6. 4) <b>Porzioni basali</b>: vettore verso l'alto e indietro, parte terminale del QRS.</p>
<p>In V1 prevale la S, poi la R cresce progressivamente fino a V5. La <b>zona di transizione</b>, dove R e S si equivalgono, cade normalmente tra V3 e V4. Se è spostata verso V5–V6 si parla di rotazione oraria; se è tra V1 e V2, di rotazione antioraria.</p>
<h4>Valori di riferimento nell'adulto</h4>
<table class="ttab"><thead><tr><th>Parametro</th><th>Valore (AHA/ACCF/HRS 2009)</th></tr></thead><tbody>
<tr><td>Frequenza</td><td>60–100/min (alcuni usano 50–90)</td></tr>
<tr><td>Onda P</td><td>Durata &lt; 120 ms; ampiezza &lt; 2,5 mm in DII</td></tr>
<tr><td>PR</td><td>120–200 ms</td></tr>
<tr><td>QRS</td><td>≤ 110 ms; 110–119 ms ritardo incompleto; ≥ 120 ms blocco completo</td></tr>
<tr><td>Asse del QRS</td><td>Tra −30° e +90°</td></tr>
<tr><td>Sokolow-Lyon</td><td>&lt; 35 mm</td></tr>
<tr><td>QTc</td><td>Prolungato ≥ 450 ms nell'uomo, ≥ 460 ms nella donna; breve ≤ 390 ms</td></tr>
</tbody></table>
<p class="note">Il manuale riporta QRS &lt; 120 ms e QTc fino a 450 ms (uomo) e 470 ms (donna) con fasce borderline. Nell'app valgono i valori AHA.</p>` },
  { id: 'ripol', title: '4. La ripolarizzazione e cosa accade nella cellula', html: `
<h4>Il potenziale d'azione</h4>
<p>A riposo l'interno della cellula è a circa −80/−90 mV. <b>Fase 0</b>: ingresso rapido di sodio, il potenziale sale a circa +30 mV. <b>Fase 1</b>: breve ripolarizzazione iniziale per uscita di potassio. <b>Fase 2</b>: plateau, il calcio entra e il potassio esce in equilibrio; è la base dell'accoppiamento eccitazione-contrazione. <b>Fase 3</b>: ripolarizzazione per prevalenza dell'uscita di potassio. <b>Fase 4</b>: riposo, le pompe ripristinano le concentrazioni.</p>
<h4>Dalla cellula all'ECG</h4>
<table class="ttab"><tbody>
<tr><td>QRS</td><td>Fase 0</td></tr><tr><td>Punto J</td><td>Fase 1</td></tr><tr><td>Tratto ST</td><td>Fase 2</td></tr><tr><td>Onda T</td><td>Fase 3</td></tr><tr><td>Tratto isoelettrico T-QRS</td><td>Fase 4</td></tr>
</tbody></table>
<h4>Perché la T è concorde</h4>
<p>Il potenziale d'azione dell'epicardio è più breve di quello dell'endocardio: l'epicardio si ripolarizza per primo e la ripolarizzazione procede dall'epicardio all'endocardio, al contrario della depolarizzazione. Per questo, dove il QRS è positivo, anche la T è in genere positiva. L'asse della T non dovrebbe deviare più di 45° da quello del QRS sul piano frontale. Una T negativa in V1 è normale; nei giovani può esserlo fino a V2–V3.</p>
<h4>Il QT</h4>
<p>Va dall'inizio del QRS alla fine della T e rappresenta la sistole elettrica. Se la fine della T non è netta si usa il <b>metodo della tangente</b>: il punto dove la tangente alla branca discendente della T incrocia la linea isoelettrica. Il QT si accorcia con la tachicardia e si allunga con la bradicardia, quindi si corregge per la frequenza. La formula di Bazett (QT diviso la radice quadrata di RR, in secondi) è la più nota ma sovrastima alle frequenze alte e sottostima a quelle basse; per questo l'AHA preferisce formule lineari, e nella pratica si usa spesso Fridericia (radice cubica). L'app mostra entrambe.</p>
<h4>Ripolarizzazione primitiva e secondaria</h4>
<p>Se la depolarizzazione è normale e la T si altera, l'alterazione è <b>primitiva</b> (per esempio ischemia): T negative spesso simmetriche. Se l'alterazione della T dipende da una depolarizzazione anomala (blocco di branca, ipertrofia, pre-eccitazione, pacing) è <b>secondaria</b>: T negative asimmetriche, discordanti con il QRS.</p>` },
  { id: 'asse', title: '5. Vettore medio e asse elettrico', html: `
<p>Per ogni onda si può costruire un vettore medio; l'asse è la sua proiezione sul piano frontale. Normalmente l'asse del QRS è tra −30° e +90°. <b>Deviazione assiale sinistra</b>: tra −30° e −90°. <b>Deviazione assiale destra</b>: tra +90° e +180°. <b>Asse estremo</b>: tra −90° e ±180°. Se tutte le periferiche sono difasiche l'asse è <b>indeterminabile</b>, perché il vettore è sul piano sagittale.</p>
<h4>Metodo del QRS isodifasico</h4>
<p>Cerca la derivazione periferica in cui R e S si equivalgono: l'asse è perpendicolare a quella derivazione, dalla parte in cui il QRS è positivo. Se la derivazione è quasi isodifasica ma prevale la R, il vettore si avvicina un po' a lei: aggiungi 15°. Se prevale la S, se ne allontana: togli 15°. Con lo stesso ragionamento si calcolano gli assi della P e della T, cercando la derivazione in cui l'onda è piatta.</p>
<h4>Metodo rapido con DI e aVF</h4>
<p>DI e aVF positivi: asse normale. DI positivo e aVF negativo: guarda DII; se è positivo l'asse è ancora normale, se è negativo c'è deviazione sinistra. DI negativo e aVF positivo: deviazione destra. Entrambi negativi: asse estremo.</p>
<table class="ttab"><thead><tr><th>Deviazione sinistra</th><th>Deviazione destra</th></tr></thead><tbody>
<tr><td>Ipertrofia ventricolare sinistra</td><td>Ipertrofia ventricolare destra</td></tr>
<tr><td>Emiblocco anteriore sinistro</td><td>Emiblocco posteriore sinistro</td></tr>
<tr><td>Necrosi inferiore</td><td>Necrosi antero-laterale</td></tr>
<tr><td>Pre-eccitazione, pacing, alcune TV</td><td>Embolia polmonare, BPCO, soggetto longilineo, destrocardia, inversione degli elettrodi degli arti</td></tr>
</tbody></table>
<div class="widget" id="w-asse"></div>` },
  { id: 'fc', title: '6. Calcolo della frequenza', html: `
<p>Frequenza = 60 000 diviso l'intervallo RR in millisecondi. In pratica: <b>300 diviso i quadrati grandi</b> tra due R (1 → 300, 2 → 150, 3 → 100, 4 → 75, 5 → 60, 6 → 50), oppure <b>1500 diviso i quadratini</b>.</p>
<p>Se il ritmo è irregolare, come nella fibrillazione atriale, conta i QRS in 10 secondi e moltiplica per 6, oppure fai la media di più RR.</p>
<div class="widget" id="w-fc"></div>` },
  { id: 'referto', title: '7. Come si referta un ECG', html: `
<p>Uno schema fisso riduce gli errori. Parti dalla descrizione e arriva solo alla fine all'interpretazione.</p>
<p><b>0. Controlli tecnici</b>: taratura, velocità, posizione degli elettrodi, artefatti.<br>
<b>1. Ritmo e frequenza</b>: c'è una P prima di ogni QRS? È sinusale? È regolare?<br>
<b>2. Onda P</b>: morfologia, durata, ampiezza (DII e V1).<br>
<b>3. PR</b>: durata e costanza.<br>
<b>4. Asse del QRS</b> sul piano frontale.<br>
<b>5. QRS</b>: durata, morfologia, voltaggi (criteri di ipertrofia), onde Q patologiche, progressione della R.<br>
<b>6. Tratto ST</b>: sopra o sottoslivellamento, rispetto al PR come riferimento; morfologia.<br>
<b>7. Onda T</b>: polarità, simmetria, ampiezza; onde U.<br>
<b>8. QT e QTc</b>.<br>
<b>9. Interpretazione</b>: «ECG nei limiti della norma» oppure descrizione dell'anomalia e ipotesi della causa, confrontando con i tracciati precedenti.</p>` },
  { id: 'ischemia', title: '8. Cardiopatia ischemica', html: `
<p class="note">Impostazione del capitolo 2 di Gaita; criteri dalla Quinta definizione universale di infarto miocardico (ESC/ACC/AHA/WHF, agosto 2026) e dalle linee guida ESC 2023 sulle sindromi coronariche acute.</p>
<h4>Ischemia, lesione, necrosi</h4>
<p><b>Ischemia</b>: il potenziale d'azione epicardico si allunga, la ripolarizzazione si inverte e va dall'endocardio all'epicardio. Risultato: <b>T negative</b>, spesso simmetriche, e QT più lungo.</p>
<p><b>Lesione</b>: la pompa sodio-potassio fallisce, la cellula perde potassio e il potenziale di riposo si riduce. Tra zona lesa e sana nasce una corrente di lesione, il cui vettore punta verso la zona lesa. Se la lesione è <b>subendocardica</b>, l'elettrodo esterno vede lo ST <b>sottoslivellato</b>; se è <b>subepicardica o transmurale</b>, vede lo ST <b>sopraslivellato</b>. Le derivazioni opposte registrano l'immagine speculare.</p>
<p><b>Necrosi</b>: il tessuto morto è elettricamente inerte. L'elettrodo sopra la necrosi vede solo i vettori della parete opposta che si allontanano: compare l'<b>onda Q</b>.</p>
<h4>Criteri ECG (5ª UDMI, 2026)</h4>
<table class="ttab"><tbody>
<tr><td>Sopraslivellamento ST</td><td>Nuovo, al punto J, in 2 derivazioni contigue: ≥ 1 mm ovunque tranne V2–V3; in V2–V3 ≥ 2,5 mm negli uomini &lt; 40 anni, ≥ 2 mm negli uomini ≥ 40 anni, ≥ 1,5 mm nelle donne. In assenza di ipertrofia sinistra e blocco di branca.</td></tr>
<tr><td>Sottoslivellamento ST</td><td>Nuovo, orizzontale o discendente, ≥ 0,5 mm in 2 o più derivazioni contigue</td></tr>
<tr><td>T negative</td><td>Nuove o dinamiche, ≥ 1 mm in 2 derivazioni contigue</td></tr>
<tr><td>T iperacute</td><td>Simmetriche, larghe, sproporzionate rispetto al QRS, in 2 derivazioni contigue</td></tr>
<tr><td>Onde Q patologiche</td><td>Durata ≥ 40 ms e/o profondità ≥ 25% della R, in 2 derivazioni contigue (definizione classica, preferita perché correla meglio con l'infarto transmurale alla risonanza)</td></tr>
<tr><td>Infarto posteriore</td><td>Sottoslivellamento ≥ 1 mm in V1–V3, soprattutto con R dominante in V1–V2; conferma con sopraslivellamento in V7–V9 (≥ 0,5 mm, ESC 2023)</td></tr>
<tr><td>Ventricolo destro</td><td>Sopraslivellamento in V3R–V6R, soprattutto con sopraslivellamento in aVR</td></tr>
<tr><td>BBS o pacing ventricolare</td><td>Criteri di Sgarbossa: ST ≥ 1 mm concordante; sottoslivellamento ≥ 1 mm in V1–V3; ST ≥ 5 mm discordante (o rapporto ST/S che raggiunge il 25% nella versione modificata)</td></tr>
</tbody></table>
<h4>Quadri di possibile occlusione coronarica acuta senza STEMI classico</h4>
<p>La 5ª definizione ricorda che fino a un paziente su quattro trattato come NSTEMI ha in realtà un'arteria occlusa. Nel giusto contesto clinico vanno considerati equivalenti di STEMI:</p>
<p><b>de Winter</b>: sottoslivellamento ST ascendente con T alte e simmetriche in V2–V5. <b>Wellens</b>: T bifasiche o profondamente negative in V2–V3 in una fase senza dolore (stenosi critica della discendente anteriore). <b>Aslanger</b>: sopraslivellamento isolato in DIII con sottoslivellamento in V4–V6 e T positiva. <b>Bandiera sudafricana</b>: sopraslivellamento in DI, aVL e V2 con sottoslivellamento in DIII (occlusione della prima diagonale). <b>Sottoslivellamento marcato o T iperacute in V1–V2</b> con alterazioni reciproche. <b>Blocco di branca nuovo</b> con altri segni di ischemia.</p>
<p><b>Ischemia globale</b>: sottoslivellamento diffuso con sopraslivellamento in aVR; può indicare tronco comune o malattia trivasale, ma non è specifico.</p>
<h4>Diagnosi differenziale del sopraslivellamento</h4>
<p>Nell'infarto lo ST è territoriale, spesso convesso e con reciprocità. Nella pericardite è diffuso, concavo, con PR sottoslivellato. Nella ripolarizzazione precoce il punto J è sopraslivellato ≥ 1 mm, spesso intaccato. Nel BBS lo ST è discordante nelle precordiali destre. Nel Brugada tipo 1 c'è un sopraslivellamento del punto J ≥ 2 mm a tenda con T negativa in V1–V2. Altre cause: miocardite, Takotsubo, embolia polmonare, iperkaliemia, ipotermia, ipertensione endocranica.</p>` },
  { id: 'blocchi', title: '9. Bradiaritmie e blocchi', html: `
<p class="note">Impostazione del capitolo 4 di Gaita; indicazioni dalle linee guida ESC 2021 sul pacing e ACC/AHA/HRS 2018.</p>
<h4>Nodali o sottonodali?</h4>
<p>È la domanda più importante, perché decide la prognosi. I blocchi <b>nodali</b> evolvono lentamente e hanno buona prognosi. I blocchi <b>sottonodali</b> (fascio di His e branche) possono progredire in fretta verso il blocco completo.</p>
<table class="ttab"><thead><tr><th></th><th>Sede nodale</th><th>Sede sottonodale</th></tr></thead><tbody>
<tr><td>QRS</td><td>Di solito stretto</td><td>Spesso largo</td></tr>
<tr><td>Tipo tipico</td><td>I grado, Wenckebach</td><td>Mobitz 2, grado avanzato</td></tr>
<tr><td>Atropina, sforzo</td><td>Migliora</td><td>Peggiora</td></tr>
<tr><td>Manovre vagali, sonno</td><td>Peggiora</td><td>Può migliorare</td></tr>
<tr><td>Studio elettrofisiologico</td><td>Intervallo AH allungato</td><td>Intervallo HV allungato</td></tr>
</tbody></table>
<h4>Gradi di blocco</h4>
<p><b>I grado</b>: PR &gt; 200 ms, tutte le P condotte. <b>II grado tipo 1 (Wenckebach)</b>: PR che si allunga fino a una P bloccata; il PR dopo la pausa è il più breve; la pausa è minore di due cicli. <b>II grado tipo 2 (Mobitz)</b>: PR costante e P bloccata improvvisa; pausa uguale a due cicli PP. <b>2:1</b>: non classificabile come tipo 1 o 2; nodale nel 20%, sottonodale nell'80%. <b>Grado avanzato</b>: due o più P consecutive bloccate. <b>III grado</b>: dissociazione AV completa con ritmo di scappamento.</p>
<h4>Quando il pacemaker</h4>
<p>Secondo ESC 2021 il pacemaker definitivo è indicato nel BAV di III grado, di grado avanzato e di II grado tipo 2, indipendentemente dai sintomi, dopo aver escluso cause reversibili (farmaci, ischemia acuta, iperkaliemia, ipertono vagale). Nel I grado e nel Wenckebach nodale asintomatici non serve.</p>` },
  { id: 'aritmie', title: '10. Come nascono le aritmie', html: `
<p class="note">Impostazione dei capitoli 5 e 6 di Gaita.</p>
<h4>Tre meccanismi</h4>
<p><b>Aumentato automatismo</b>: il nodo del seno o un focus ectopico scarica più in fretta del dovuto e diventa il pacemaker dominante. In condizioni normali i focus ectopici sono soppressi dal nodo del seno, che è più rapido.</p>
<p><b>Rientro</b>: servono due vie separate da una zona non eccitabile, anatomica (una cicatrice) o funzionale, e un blocco unidirezionale in una delle due, spesso provocato da un'extrasistole. L'impulso scende per una via, risale per l'altra e ricomincia; perché il circuito si mantenga, la conduzione deve essere abbastanza lenta da trovare di nuovo eccitabile il punto di partenza.</p>
<p><b>Attività triggerata</b>: post-depolarizzazioni che raggiungono la soglia. Precoci (durante le fasi 2 e 3, tipiche del QT lungo e della torsione di punta) o tardive (dopo la ripolarizzazione, per esempio nella tossicità digitalica).</p>
<h4>Classificazione pratica delle tachicardie sopraventricolari</h4>
<p><b>Ritmiche</b>: tachicardia sinusale, tachicardia atriale ectopica, AVNRT, AVRT, flutter con conduzione fissa. <b>Aritmiche</b>: fibrillazione atriale, flutter con conduzione variabile, tachicardia atriale multifocale. Di solito hanno QRS stretto; diventano larghe con blocco di branca preesistente, aberranza o pre-eccitazione.</p>
<h4>Aritmie ventricolari</h4>
<p>Il pacemaker dominante è sotto la biforcazione dell'His, l'attivazione passa lentamente dal miocardio comune, gli atri possono essere dissociati. <b>TV</b>: almeno 3 battiti sopra 100/min; <b>ritmo idioventricolare accelerato</b> sotto 100/min; <b>non sostenuta</b> sotto 30 secondi; <b>monomorfa</b> o <b>polimorfa</b>.</p>` },
  { id: 'qrslargo', title: '11. Tachicardia a QRS largo', html: `
<p class="note">Percorso del capitolo 6 di Gaita, aggiornato alle linee guida ESC 2022 sulle aritmie ventricolari.</p>
<p><b>Primo passo: la stabilità.</b> Se il paziente è instabile, cardioversione elettrica sincronizzata subito, senza perdere tempo a interpretare. Una tachicardia a QRS largo è una TV fino a prova contraria, soprattutto con cardiopatia strutturale; la stabilità emodinamica non la esclude.</p>
<p><b>Secondo passo: segni diagnostici di TV.</b> Dissociazione AV (P che «marciano» indipendenti), battiti di cattura (QRS stretto preceduto da P) e battiti di fusione (QRS intermedio).</p>
<p><b>Terzo passo: criteri morfologici.</b> Algoritmo di Brugada: assenza di complessi RS in tutte le precordiali → TV; intervallo dall'inizio della R al nadir della S &gt; 100 ms in una precordiale → TV; dissociazione AV → TV; criteri morfologici in V1–V2 e V6 → TV. Criterio di Vereckei in aVR: R iniziale, q o r iniziale &gt; 40 ms, intaccatura nella discesa di un QS, oppure rapporto tra voltaggi dei primi e ultimi 40 ms ≤ 1 → TV. Asse tra −90° e ±180° e concordanza delle precordiali favoriscono la TV.</p>
<p><b>Quarto passo, se il paziente è stabile e il dubbio resta:</b> manovre vagali o adenosina possono svelare l'attività atriale o interrompere una tachicardia che coinvolge il nodo AV. Il verapamil non va usato in una tachicardia a QRS largo non diagnosticata.</p>` },
  { id: 'elettroliti', title: '12. Elettroliti, farmaci, pericardio', html: `
<p class="note">Impostazione del capitolo 9 di Gaita.</p>
<h4>Potassio</h4>
<p><b>Iperkaliemia</b>, in ordine di comparsa: T alte e appuntite; P più lunga e bassa fino alla scomparsa, disturbi di conduzione; QRS largo, blocchi di branca, sopraslivellamento ST nelle precordiali destre, QTc più breve; TV e FV. <b>Ipokaliemia</b>: ST sottoslivellato, T piatte, onde U, QT(U) lungo, possibili blocchi AV e aritmie ventricolari. In entrambi i casi l'ECG correla male con il valore del potassio.</p>
<h4>Calcio</h4>
<p><b>Ipercalcemia</b>: QT e ST accorciati, proporzionali al calcio. <b>Ipocalcemia</b>: ST allungato e QT lungo con T normale.</p>
<h4>Farmaci</h4>
<p><b>Betabloccanti</b>: bradicardia, PR più lungo. <b>Digitale</b>: sottoslivellamento ST «a cucchiaio», QT breve, e in tossicità aritmie come tachicardia atriale con blocco o TV bidirezionale. <b>Antiaritmici di classe IC</b>: QRS più largo, rischio di flutter 1:1. <b>Sotalolo e amiodarone</b>: QT lungo; l'amiodarone dà anche bradicardia.</p>
<h4>Pericardite acuta</h4>
<p>Criteri ESC: almeno 2 su 4 tra dolore tipico, sfregamento, alterazioni ECG (sopraslivellamento ST diffuso o PR sottoslivellato) e versamento. Evoluzione ECG in quattro stadi: ST sopraslivellato concavo; ST isoelettrico con T piatte e PR sottoslivellato; T negative; normalizzazione. Circa il 20% dei pazienti ha un ECG normale o aspecifico.</p>` }
];

/* ---------- Aggiornamento settembre 2026: criteri dalle linee guida vigenti, spiegazioni con l'impostazione di Gaita ---------- */
const G = 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012';
const UPD = {
  normale: {
    manuale: 'Cap. 1, ECG N° 1 (ECG normale); valori di riferimento a inizio capitolo',
    meccanismo: `L'impulso nasce nel nodo del seno, nella parte alta e laterale dell'atrio destro, e si allarga agli atri da destra a sinistra e dall'alto verso il basso. Rallenta nel nodo AV e poi scende nel fascio di His e nelle branche. La depolarizzazione ventricolare si può scomporre in quattro momenti: inizio dal setto (da sinistra verso destra), setto intermedio e apice, parete libera dei ventricoli con il setto finale (la fase più lunga, 40–60 ms, dominata dal ventricolo sinistro) e infine le porzioni basali.`,
    vettori: `Primo momento: vettore settale verso destra e in avanti, da cui la piccola r in V1 e la piccola q in DI, aVL, V5 e V6. Terzo momento: il grande vettore della parete libera va a sinistra, in basso e indietro e disegna la R alta in V5–V6 e la S in V1–V2. Ultimo momento: vettore basale verso l'alto e indietro, che chiude il QRS. La T è concorde perché l'epicardio, con un potenziale d'azione più breve, si ripolarizza prima dell'endocardio: la ripolarizzazione viaggia al contrario della depolarizzazione e le due inversioni si annullano. L'asse della T non dovrebbe scostarsi più di 45° da quello del QRS sul piano frontale.`,
    diff: `Il manuale considera normale un QRS < 120 ms e un QTc fino a 450 ms nell'uomo e 470 ms nella donna, con una fascia borderline. I valori dell'app seguono le raccomandazioni AHA/ACCF/HRS: QRS ≤ 110 ms, QTc prolungato da 450 ms (uomo) e 460 ms (donna).`
  },
  bradisinusale: { manuale: 'Cap. 4, ECG N° 20' },
  tachisinusale: { manuale: 'Cap. 5, ECG N° 51', meccanismo: `Aumentato automatismo del nodo del seno. Fisiologica in gravidanza, sotto sforzo e con le emozioni; patologica con febbre, anemia, ipertiroidismo, scompenso, embolia polmonare. Il ragionamento clinico parte sempre dalla causa.` },
  aritmiasinusale: { manuale: 'Cap. 1, ECG N° 3', meccanismo: `In inspirazione la pressione intratoracica diventa più negativa, aumenta il ritorno venoso e cala il tono vagale: la frequenza sale per adeguare la portata. In espirazione succede l'opposto. È fisiologica nei giovani e si attenua con l'età, il diabete e le cardiopatie.` },
  esa: {
    manuale: 'Cap. 5, ECG N° 50',
    criteri: ['P prematura, cioè con accoppiamento più breve del ciclo sinusale', 'Morfologia e asse della P diversi dalla sinusale', 'QRS di solito uguale a quello di base, salvo conduzione aberrante', 'Pausa di solito non compensatoria: accoppiamento più pausa successiva < 2 cicli PP, perché l\u2019extrasistole reimposta il nodo del seno'],
    meccanismo: `Tre meccanismi possono generare un'aritmia: aumentato automatismo di un focus, rientro e attività triggerata da post-depolarizzazioni. Nelle extrasistoli atriali il focus ectopico scarica prima del nodo del seno e lo reimposta.`
  },
  fa: {
    manuale: 'Cap. 5, ECG N° 58–62',
    criteri: ['Intervalli RR irregolarmente irregolari', 'Assenza di onde P distinte e ripetute', 'Attività atriale irregolare (onde f), spesso più evidente in V1', 'Diagnosi clinica (ESC 2024): documentazione ECG su 12 derivazioni o episodio di almeno 30 secondi su traccia a singola derivazione'],
    meccanismo: `Per mantenere la fibrillazione servono tre elementi: un innesco, di solito un'extrasistole sopraventricolare spesso dalle vene polmonari; un substrato atriale rimodellato; uno squilibrio del sistema nervoso autonomo (forme vagali notturne o dopo i pasti, forme adrenergiche da sforzo). Il nodo AV lascia passare solo una parte degli impulsi, in modo irregolare.`,
    diff: `Il manuale descrive la risposta ventricolare come «penetranza» media (60–80/min a riposo) o elevata. È una descrizione utile ma non una categoria delle linee guida, che ragionano per obiettivo di frequenza nel controllo del ritmo.`
  },
  flutter: { manuale: 'Cap. 5, ECG N° 63–66', meccanismo: `Macrorientro nell'atrio destro attorno all'anello tricuspidale. Nel tipico antiorario (il più frequente) l'impulso sale lungo il setto e scende lungo la parete libera; nel tipico orario («reverse», circa il 10%) il senso è opposto e le onde F diventano positive nelle inferiori. Il punto critico del circuito è l'istmo cavo-tricuspidale, bersaglio dell'ablazione. Il rischio tromboembolico impone di valutare l'anticoagulazione come nella FA.` },
  avnrt: {
    manuale: 'Cap. 5, ECG N° 52',
    criteri: ['Tachicardia regolare a QRS stretto (salvo blocco di branca o aberranza), di solito 150–250/min', 'Rapporto P:QRS 1:1', 'Forma tipica lenta-veloce: P retrograda subito dopo il QRS, con RP′ < 80 ms, spesso nascosta', 'P′ negativa nelle inferiori e positiva in aVR e aVL (attivazione atriale retrograda concentrica)', 'Pseudo-r′ in V1 e pseudo-S nelle inferiori'],
    meccanismo: `Dentro il nodo AV esistono due vie: una veloce con periodo refrattario lungo e una lenta con periodo refrattario breve. Un'extrasistole atriale trova la via veloce ancora refrattaria, scende lentamente per la via lenta e risale per la veloce, chiudendo il circuito.`
  },
  bav1: {
    manuale: 'Cap. 4, ECG N° 25; introduzione ai blocchi AV',
    meccanismo: `Quasi sempre il ritardo è nel nodo AV, con buona prognosi; più di rado è sottonodale, e allora spesso compaiono nel tempo gradi più avanzati di blocco. Il nodo è ricco di fibre vagali: di notte il PR si allunga e possono comparire episodi di Wenckebach. Un Holter aiuta a capire la sede.`,
    fonte: SRC.pacing + '; ' + SRC.brady
  },
  wenck: {
    manuale: 'Cap. 4, ECG N° 26',
    meccanismo: `È la conduzione decrementale del nodo AV: più impulsi arrivano, più il nodo rallenta, finché una P non passa. Descritto per la prima volta nel 1899. La sede nodale lo rende in genere benigno e non evolutivo; senza sintomi non richiede trattamento.`,
    fonte: SRC.pacing + '; ' + SRC.brady
  },
  mobitz2: {
    manuale: 'Cap. 4, ECG N° 27',
    criteri: ['PR costante nei battiti prima della P bloccata', 'PR costante anche dopo la pausa', 'La pausa che contiene la P bloccata dura il doppio di un ciclo PP', 'Spesso QRS largo: sede sottonodale (intra o infra-hisiana)', 'Indicazione a pacemaker definitivo anche in assenza di sintomi (ESC 2021)'],
    meccanismo: `Blocco tutto-o-nulla nel sistema His-Purkinje, che non conduce in modo decrementale. Il rapporto di conduzione si esprime come numero di P su numero di QRS in un periodo, cioè dalla prima P condotta dopo una bloccata fino alla successiva P bloccata.`,
    fonte: SRC.pacing + '; ' + SRC.brady
  },
  bav21: {
    manuale: 'Cap. 4, ECG N° 28/A e 28/B',
    meccanismo: `Nel 2:1 la sede è nodale in circa il 20% dei casi e sottonodale nell'80%. Il comportamento dinamico aiuta: se il blocco è nodale, l'atropina lo migliora e le manovre vagali lo peggiorano; se è sottonodale succede l'opposto, perché la tachicardia indotta dall'atropina sovraccarica un His-Purkinje malato, mentre il rallentamento vagale gli dà respiro. Il gold standard resta lo studio elettrofisiologico (intervallo AH per il nodo, HV per il sottonodale).`,
    fonte: SRC.pacing + '; ' + SRC.brady
  },
  bav3: {
    manuale: 'Cap. 4, ECG N° 30 e 31',
    criteri: ['Dissociazione AV completa: nessuna P è condotta', 'Frequenza atriale maggiore della ventricolare, intervalli RR regolari', 'Blocco nodale: scappamento dal fascio di His, QRS stretto, frequenza più alta', 'Blocco sottonodale: scappamento distale o ventricolare, QRS largo, frequenza più bassa e sintomi più gravi', 'Indicazione a pacemaker definitivo indipendentemente dai sintomi, esclusa una causa reversibile (ESC 2021)'],
    meccanismo: `Il pacemaker di scappamento nasce subito sotto il blocco. Le linee guida non fissano frequenze precise: il manuale indica 35–50/min per lo scappamento nodale e 15–30/min per quello sottonodale, altri testi 40–60 e 20–40/min. Nel tracciato dell'app sono impostati 44 e 26/min. Da non confondere con la dissociazione AV isoritmica o da interferenza, in cui manca il blocco.`,
    fonte: SRC.pacing + '; ' + SRC.brady
  },
  bbdx: {
    manuale: 'Cap. 4, ECG N° 32',
    meccanismo: `Il manuale scompone l'attivazione in quattro fasi. 1) Il setto si attiva normalmente da sinistra a destra: piccola r in V1, piccola q in V6. 2) Setto e apice procedono verso destra mentre si attiva il ventricolo sinistro, il cui vettore prevale: la R in V6 sale. 3) Si completano setto e basi sinistre: S in V1, picco della R in V6. 4) Il ventricolo destro si attiva per ultimo, lentamente, attraverso il miocardio comune: nessuno lo controbilancia e compaiono la R′ in V1 e la S larga in V6.`,
    diff: `Il manuale definisce incompleto un blocco con QRS tra 100 e 120 ms; l'AHA usa 110–119 ms.`
  },
  bbsx: {
    manuale: 'Cap. 4, ECG N° 33 e Fig. 4.13',
    criteri: ['QRS ≥ 120 ms nell\u2019adulto', 'R larga, intaccata o impastata in DI, aVL, V5 e V6', 'Assenza di q in DI, V5 e V6', 'R peak time > 60 ms in V5–V6', 'ST e T di solito opposti al QRS', 'Ischemia acuta con BBS o pacing ventricolare (criteri di Sgarbossa, 5ª UDMI): sopraslivellamento ≥ 1 mm concordante con il QRS; sottoslivellamento ≥ 1 mm in V1, V2 o V3; sopraslivellamento ≥ 5 mm discordante. La versione modificata sostituisce la soglia di 5 mm con un rapporto ST/S che raggiunge il 25% dell\u2019ampiezza della S', 'Un BBS nuovo o presunto nuovo con altri segni di ischemia va gestito come equivalente di STEMI (5ª UDMI)'],
    meccanismo: `Con la branca sinistra bloccata il ventricolo destro si attiva per primo e il setto si depolarizza da destra verso sinistra, al contrario del normale. Poi il fronte attraversa lentamente il miocardio comune del ventricolo sinistro, verso sinistra e indietro. Le alterazioni di ST e T sono secondarie: dipendono dalla depolarizzazione anomala, non da ischemia. Il BBS va sempre considerato patologico: degenerazione del tessuto di conduzione, cardiomiopatia (soprattutto dilatativa), talvolta infarto acuto.`
  },
  eas: {
    manuale: 'Cap. 4, ECG N° 35',
    criteri: ['Asse frontale tra −45° e −90°', 'qR in aVL', 'R peak time in aVL ≥ 45 ms', 'QRS < 120 ms', 'Segni di supporto descritti nei manuali: rS nelle inferiori con S in DIII più profonda che in DII; deflessione terminale positiva in DI, aVL e aVR'],
    meccanismo: `Il fascicolo anteriore è sottile e si blocca facilmente. Il ventricolo sinistro si attiva solo dal fascicolo posteriore: il fronte parte dalla parete inferiore e poi raggiunge la parete antero-laterale.`,
    diff: `Il manuale indica un asse oltre −30°; l'AHA richiede −45°/−90°. Tra −30° e −45° si parla di deviazione assiale sinistra, non di emiblocco.`
  },
  eps: { manuale: 'Cap. 4, ECG N° 36', meccanismo: `Il fascicolo posteriore è corto e spesso, per questo il suo blocco isolato è raro e va sempre considerato patologico. Si associa spesso a blocco di branca destra e a disturbi della conduzione AV; va cercato con ecocardiogramma ed ECG seriati.` },
  wpw: {
    manuale: 'Cap. 5, ECG N° 53–55 e Fig. 5.12 (localizzazione della via)',
    meccanismo: `Il fascio di Kent è un ponte di miocardio comune tra atri e ventricoli, con conduzione non decrementale: il tempo di passaggio non cambia con la frequenza, e in corso di FA può portare ai ventricoli frequenze pericolose. Pre-eccitazione manifesta: visibile in ritmo sinusale. Non manifesta: la via conduce ma non si vede, per esempio le vie sinistre laterali lontane dal nodo del seno. Occulta: la via conduce solo in senso retrogrado. Intermittente: compare solo in alcuni tracciati. Si parla di sindrome WPW quando la pre-eccitazione si associa ad aritmie.`,
    diff: `Il manuale indica un QRS > 80 ms perché include le pre-eccitazioni parziali; l'AHA richiede QRS > 120 ms per la forma completa nell'adulto. L'esempio del libro ha una via postero-settale destra, quello dell'app una via sinistra laterale.`
  },
  esv: {
    manuale: 'Cap. 6, ECG N° 69 e 72',
    criteri: ['Battito prematuro con QRS largo, di solito ≥ 120 ms, e morfologia diversa', 'Nessuna P prematura prima del QRS', 'ST e T discordanti con il QRS', 'Pausa di solito compensatoria: accoppiamento più pausa ≥ 2 cicli sinusali', 'Focus nel ventricolo destro: morfologia tipo BBS; focus nel ventricolo sinistro: morfologia tipo BBD', 'Monomorfe se hanno tutte la stessa forma, polimorfe o multifocali se le forme sono diverse', 'Il linguaggio: due di fila sono una coppia o doppietta, tre di fila una tripletta; da tre battiti in su sopra i 100/min si parla di tachicardia ventricolare, non sostenuta se dura meno di 30 secondi', 'Bigeminismo, trigeminismo, quadrigeminismo quando l\u2019extrasistole segue ogni battito, ogni due, ogni tre', 'Fenomeno R su T: accoppiamento cortissimo, l\u2019extrasistole cade sulla T precedente e può innescare torsione di punta o fibrillazione ventricolare'],
    meccanismo: `L'impulso ectopico cattura solo i ventricoli, di solito senza risalire agli atri: il nodo del seno continua il suo ritmo e la P successiva cade nel periodo refrattario, da cui la pausa compensatoria. Le forme dal tratto di efflusso destro (BBS con asse inferiore, QS in V1) sono in genere benigne, da automatismo, e scompaiono con l'aumento della frequenza.`
  },
  tv: {
    manuale: 'Cap. 6, introduzione, Fig. 6.2 e ECG N° 70–75',
    criteri: ['Almeno 3 battiti ventricolari consecutivi sopra 100/min; sotto i 100/min si parla di ritmo idioventricolare accelerato', 'Non sostenuta se dura meno di 30 secondi, sostenuta se dura di più o richiede interruzione', 'Monomorfa se la morfologia è unica, polimorfa se varia', 'Dissociazione AV, battiti di cattura o di fusione: diagnostici di origine ventricolare', 'Asse tra −90° e ±180°, R iniziale in aVR (Vereckei), assenza di RS nelle precordiali o R-nadir S > 100 ms (Brugada): orientano verso TV'],
    meccanismo: `Nella cardiopatia ischemica cronica il substrato è la cicatrice: isole di miocardio vivo circondate da fibrosi creano circuiti di rientro. L'approccio del manuale, ancora valido: prima si valuta la stabilità emodinamica (se instabile, cardioversione elettrica immediata); poi si cercano dissociazione AV, catture e fusioni; manovre vagali o adenosina servono a svelare l'attività atriale.`,
    fonte: SRC.va
  },
  tdp: { manuale: 'Cap. 6, ECG N° 76; cap. 7, ECG N° 77', meccanismo: `Postpotenziali precoci in un miocardio con ripolarizzazione allungata e dispersa (QT lungo congenito, farmaci come sotalolo, chinidina, amiodarone, ipokaliemia, bradicardia) innescano extrasistoli che si perpetuano per rientro. Tipica la sequenza ciclo breve, ciclo lungo, ciclo breve. Trattamento acuto: magnesio solfato endovena, correzione degli elettroliti, sospensione dei farmaci, aumento della frequenza (isoproterenolo o stimolazione temporanea).` },
  fv: { manuale: 'Cap. 6, ECG N° 74', meccanismo: `Perdita dell'attivazione organizzata con molteplici circuiti di rientro. Nell'infarto acuto spesso è preceduta da extrasistoli ventricolari con accoppiamento breve. Se avviene nella fase acuta dell'infarto il rischio di recidiva è basso; nella cardiopatia ischemica cronica è alto e porta a considerare il defibrillatore.` },
  ivs: {
    manuale: 'Cap. 3, introduzione e ECG N° 17–19',
    criteri: ['Sokolow-Lyon: S in V1 + R in V5 o V6 ≥ 35 mm, oppure R in aVL > 11 mm', 'Cornell: R in aVL + S in V3 > 28 mm nell\u2019uomo, > 20 mm nella donna', 'Punteggio di Romhilt-Estes: ≥ 5 punti ipertrofia, 4 punti probabile', 'Alterazioni secondarie: ST sottoslivellato discendente e T negative asimmetriche in DI, aVL, V5 e V6', 'Segni associati: perdita della q settale in V6, deviazione assiale sinistra, ingrandimento atriale sinistro', 'Criteri specifici ma poco sensibili; il riferimento resta l\u2019ecocardiogramma'],
    meccanismo: `Più massa genera un segnale più ampio e richiede più tempo per depolarizzarsi, per questo il QRS si allarga un po' e la deflessione intrinsecoide in V5–V6 si allunga. La ripolarizzazione del subendocardio ispessito si altera secondariamente. Le T negative asimmetriche indicano un'alterazione secondaria; T negative simmetriche fanno pensare invece a ischemia.`,
    diff: `Il manuale riporta per il Cornell una soglia di 22 mm nella donna; la soglia originale e più usata è 20 mm. Nel punteggio di Romhilt-Estes: voltaggi 3 punti; alterazioni ST-T 3 punti (1 se in terapia con digitale); ingrandimento atriale sinistro 3; deviazione assiale sinistra 2; QRS ≥ 90 ms 1; deflessione intrinsecoide in V5–V6 ≥ 50 ms 1.`
  },
  ivd: { manuale: 'Cap. 8, ECG N° 87–89' },
  iperk: {
    manuale: 'Cap. 9, ECG N° 93',
    criteri: ['T alte, strette alla base, appuntite e simmetriche', 'Poi P più lunga e bassa fino alla scomparsa, con PR allungato e disturbi di conduzione', 'Poi QRS allargato, blocchi di branca, sopraslivellamento ST nelle precordiali destre e QTc accorciato', 'Infine aritmie ventricolari (TV, FV) e ritmo sinusoidale', 'La gravità dei segni ECG correla male con il valore del potassio'],
    meccanismo: `Il potassio extracellulare alto riduce il potenziale di riposo e accelera la ripolarizzazione (T appuntita, QT più breve). La depolarizzazione parziale inattiva i canali del sodio e rallenta la conduzione (P e QRS larghi). Con la correzione i segni regrediscono.`
  },
  ipok: {
    manuale: 'Cap. 9, ECG N° 92',
    criteri: ['Sottoslivellamento del tratto ST', 'T appiattite o con asse alterato', 'Onde U evidenti', 'QT (o QU) prolungato', 'Possibili blocchi AV, TV e FV', 'L\u2019entità delle alterazioni non correla con la gravità dell\u2019ipokaliemia']
  },
  qtlungo: {
    manuale: 'Cap. 1 (misura del QT) e cap. 7, ECG N° 77/A–C',
    meccanismo: `Perdita di funzione dei canali del potassio (IKs nel tipo 1, IKr nel tipo 2) o guadagno di funzione del canale del sodio (tipo 3): cariche positive in eccesso dentro la cellula allungano il potenziale d'azione. Il fenotipo della T suggerisce il genotipo: tipo 1 T a base larga, eventi durante lo sforzo; tipo 2 T bassa e intaccata, eventi con stimoli uditivi e riposo; tipo 3 T alta a inizio tardivo, eventi nel sonno. Usa il selettore «Aspetto della T». Prima di pensare a una forma congenita si escludono farmaci, ischemia, ipokaliemia, ipocalcemia, bradicardia.`
  },
  pericardite: {
    manuale: 'Cap. 9, ECG N° 90/A e 90/B; Fig. 9.1',
    criteri: ['Diagnosi di pericardite acuta con almeno 2 criteri su 4: dolore tipico, sfregamento pericardico, nuovo sopraslivellamento ST diffuso o sottoslivellamento del PR, versamento nuovo o in aumento (ESC)', 'ECG: sopraslivellamento ST diffuso, a concavità superiore, non limitato a un territorio coronarico', 'Sottoslivellamento del PR, con PR sopraslivellato in aVR', 'Assenza di reciprocità, tranne aVR e talvolta V1', 'Nel 20% circa l\u2019ECG è normale o aspecifico'],
    meccanismo: `L'infiammazione coinvolge l'epicardio ventricolare e atriale. Evoluzione tipica: ST sopraslivellato; poi ST di nuovo isoelettrico, T appiattite e PR sottoslivellato; poi T negative; infine ritorno alla norma in settimane o mesi. Con un versamento importante i voltaggi calano e può comparire l'alternanza elettrica. Distinzione dallo STEMI: nella pericardite la T si negativizza solo dopo che lo ST è tornato isoelettrico, nello STEMI mentre lo ST è ancora sopraslivellato; lo ST dell'infarto tende alla convessità ed è territoriale.`
  }
};
['inferiore', 'anteriore', 'laterale', 'posteriore'].forEach(t => {
  UPD['stemi-' + t] = {
    manuale: { inferiore: 'Cap. 2, ECG N° 11 e 14; infarto ventricolare destro', anteriore: 'Cap. 2, ECG N° 9, 12, 13, 15, 16', laterale: 'Cap. 2, ECG N° 9; tabella delle sedi', posteriore: 'Cap. 2, ECG N° 11 e Fig. 2.6' }[t],
    diff: `Il manuale usa la soglia precedente (≥ 2 mm in V1–V3, ≥ 1 mm altrove) e per il ventricolo destro ≥ 1 mm in V4R. Valgono le soglie per età e sesso della 5ª definizione universale (2026), che per il ventricolo destro indica il sopraslivellamento in V3R–V6R; la soglia tradizionale è ≥ 0,5 mm.`
  };
});
SCENARIOS_PATCH: {
  S.forEach(s => { const u = UPD[s.id]; if (u) Object.keys(u).forEach(k => { s.card[k] = u[k]; }); s.card.libro = G; });
}

/* ---------- Criteri del corso: slide di Metodologia Clinica, prof. Paolo Mulatero (UniTo) ----------
   Regola: i criteri diagnostici dell'app restano quelli delle linee guida vigenti.
   Qui si aggiunge, quadro per quadro, come la stessa cosa è presentata a lezione. */
const CORSO = 'Mulatero P., Corso di Metodologia Clinica, UniTo';
const PROF = {
  normale: { slide: 'Lettura ECG, slide 30-35 e 40', corso: [
    'PR 0,12-0,20 s; QRS ≤ 0,10 s; QT < 0,43 s a 60/min, < 0,39 s a 80/min, < 0,35 s a 100/min, e comunque meno di metà del ciclo RR',
    'Onda P: altezza < 2,5 mm, durata < 0,12 s; positiva in DII e aVF, non negativa in DI, negativa in aVR; nelle precordiali sempre positiva in V3-V6, positiva o isodifasica in V1-V3',
    'Onda Q: da ignorare in aVR e in DIII; altrove < 0,04 s e < 1/4 della R che segue',
    'Onda R: negativa in aVR; in aVL non oltre 11-13 mm, in aVF non oltre 20 mm; nelle precordiali almeno una R ≥ 8 mm, R massima < 27 mm, R massima + S massima ≤ 35 mm',
    'Tratto ST: non deve slivellare più di 1 mm rispetto alla linea isoelettrica presa sul PR o sul TP',
    'Onda T: concordante con il QRS (assi distanti meno di 45°); positiva o negativa in V1 e V2, mai negativa in V2 se positiva in V1; ampiezza tra 1/8 e 2/3 della R; positiva nelle precordiali sinistre',
    'Intervalli intracardiaci allo studio elettrofisiologico: PA 15-35 ms, AH 70-120 ms, H 10-15 ms, HV 35-55 ms'] },
  bradisinusale: { slide: 'Lettura ECG, slide 40', corso: [
    'Ritmo sinusale: P presenti e monomorfe, con morfologia da nodo del seno (positiva in DII, mai negativa in DI, negativa in aVR), intervalli PP costanti (differenza < 0,16 s), P che precede ogni QRS',
    'Bradicardia sinusale quando la frequenza scende sotto 60/min'] },
  tachisinusale: { slide: 'Lettura ECG, slide 40', corso: [
    'Stessa definizione di ritmo sinusale, con frequenza sopra 100/min',
    'Alla prova dell\u2019adenosina rallenta gradualmente e poi riaccelera: non si interrompe, a differenza delle tachicardie da rientro'] },
  aritmiasinusale: { slide: 'Lettura ECG, slide 58', corso: [
    'Rientra tra le varianti normali, insieme al wandering pacemaker (segnapassi migrante), in cui la morfologia della P cambia da battito a battito',
    'Nell\u2019anziano un\u2019aritmia sinusale non legata al respiro va invece inquadrata nella malattia del nodo del seno'] },
  esa: { slide: 'Aritmie, battiti prematuri sopraventricolari', corso: [
    'Battito atriale prematuro: P anticipata e di morfologia diversa, QRS di solito uguale a quello di base',
    'Si possono vedere in bigeminismo o trigeminismo; se le P premature hanno morfologie diverse i foci sono diversi',
    'Un battito sopraventricolare condotto con aberranza (fenomeno di Ashman) simula un battito ventricolare: il QRS largo segue un ciclo lungo-corto'] },
  fa: { slide: 'Aritmie, fibrillazione atriale', corso: [
    'Si parla di fibrillazione atriale per episodi di durata superiore a 30 secondi',
    'Classificazione del corso: primo episodio; ricorrente (≥ 2 episodi); parossistica (< 7 giorni, si autolimita); persistente (≥ 7 giorni); permanente; lone AF sotto i 60 anni senza cardiopatia; secondaria a infarto, cardiochirurgia, miocardite, ipertiroidismo, malattia polmonare acuta',
    'Rimodellamento elettrico: la FA accorcia il periodo refrattario atriale e si automantiene (atrial fibrillation begets atrial fibrillation); la cardioversione riesce meglio entro 24 ore',
    'I trombi si formano dopo circa 24 ore e lo stunning atriale persiste fino a 3-4 settimane dopo la cardioversione: da qui la finestra dell\u2019anticoagulazione',
    'Conseguenze: perdita del contributo atriale al riempimento (pesante in stenosi mitralica, ipertensione, cardiomiopatia ipertrofica o restrittiva), risposta ventricolare irregolare, tachicardiomiopatia, tromboembolia'] },
  flutter: { slide: 'Aritmie, flutter atriale', corso: [
    'Frequenza atriale di solito tra 220 e 350/min',
    'Onde F a dente di sega, da cercare in DII, DIII, aVF, V1 e V2',
    'Origina da un focus atriale e si automantiene per rientro; con blocco variabile il ritmo ventricolare diventa irregolare',
    'All\u2019adenosina la tachicardia atriale persiste con blocco AV transitorio di grado avanzato: è il modo per smascherare le onde F'] },
  avnrt: { slide: 'Aritmie, TPSV e risposta all\u2019adenosina', corso: [
    'Tachicardia giunzionale parossistica da rientro intranodale: frequenza intorno a 200/min, regolare, nessuna P identificabile, QRS normale, T spesso invertite',
    'Algoritmo del corso per il QRS stretto: se il ritmo è regolare e le P non sono visibili si pensa al rientro nodale; se la frequenza atriale supera la ventricolare, flutter o tachicardia atriale',
    'All\u2019adenosina il rientro si interrompe bruscamente: è la risposta che la distingue dalla tachicardia sinusale o atriale'] },
  bav1: { slide: 'Aritmie, BAV I grado', corso: [
    'P e QRS abituali e costanti, ogni P seguita da QRS, PR costante ≥ 0,21 s'] },
  wenck: { slide: 'Aritmie, BAV II tipo 1', corso: [
    'Progressivo allungamento del PR fino alla P bloccata',
    'Progressiva riduzione degli RR',
    'La pausa è minore del doppio del ciclo RR più breve',
    'Il ciclo RR che segue la pausa è più lungo di quello che la precede',
    'Sede: blocco prossimale se i QRS sono stretti e il blocco è di tipo 1'] },
  mobitz2: { slide: 'Aritmie, BAV II tipo 2', corso: [
    'Improvvisa mancata conduzione di una P, senza preavviso',
    'PR dei battiti condotti normale o allungato, ma costante; cicli RR costanti',
    'La pausa è esattamente il doppio del ciclo RR',
    'Sede: blocco distale se i QRS sono larghi e il blocco è di tipo 2'] },
  bav21: { slide: 'Aritmie, BAV II 2:1 e avanzato', corso: [
    'Una P su due è bloccata: non è classificabile come tipo 1 o tipo 2, per questo la sede va definita con altri elementi',
    'Si parla di BAV di alto grado o avanzato quando il rapporto P/QRS è 3:1 o superiore'] },
  bav3: { slide: 'Aritmie, BAV III grado', corso: [
    'Dissociazione atrio-ventricolare completa',
    'Frequenza dei QRS tra 15 e 70/min, con morfologia costante',
    'Blocco nodale: QRS stretti, scappamento giunzionale intorno a 40/min',
    'Blocco infranodale: QRS larghi, scappamento ventricolare a 20-30/min'] },
  bbdx: { slide: 'Aritmie, BBDx', corso: [
    'QRS ≥ 0,12 s',
    'rsr\u2019, rSr\u2019, RSr\u2019 o RSR\u2019 in V1',
    'Onde S ampie e impastate in DI e V6',
    'Sottoslivellamento ST e T negative da V1 a V3',
    'L\u2019asse di solito resta normale: se è marcatamente deviato pensa a un blocco bifascicolare',
    'Restano validi i criteri per ipertrofia e per infarto',
    'BBDx incompleto: morfologia rsr\u2019 in V1 con QRS ≤ 0,11 s. Esistono forme intermittenti e frequenza-dipendenti'] },
  bbsx: { slide: 'Aritmie, BBSx', corso: [
    'QRS ≥ 0,12 s',
    'Assenza delle onde q settali in V5-V6 (e in DI, aVL)',
    'R monofasica ampia, a M o con incisure, in V5-V6, DI e aVL',
    'Sottoslivellamento ST e T negative in V5-V6, DI e aVL; sopraslivellamento ST e T ampie in V1-V2',
    'Onde r piccole o assenti in V1-V2',
    'L\u2019ipertrofia sinistra si riconosce solo con voltaggi molto elevati o ingrandimento atriale; l\u2019infarto resta spesso mascherato; una deviazione assiale estrema non è normale nel BBSx',
    'BBSx incompleto: QRS ≤ 0,11 s senza q settali a sinistra'] },
  eas: { slide: 'Aritmie, emiblocco anteriore sinistro', corso: [
    'Deviazione dell\u2019asse oltre −30°',
    'Onde r iniziali in DII, DIII e aVF',
    'Durata del QRS di solito normale',
    'Vanno escluse le altre cause di deviazione assiale sinistra: pre-eccitazione, iperpotassiemia, necrosi inferiore, ipertrofia ventricolare sinistra estrema'] },
  eps: { slide: 'Aritmie, emiblocco posteriore sinistro', corso: [
    'Deviazione assiale destra oltre +105°/+120°, in assenza di altre cause (cuore verticale nel longilineo, enfisema, ipertrofia destra, infarto antero-laterale, difetto interatriale, embolia polmonare)',
    'Il fascicolo posteriore ha di solito doppia irrorazione: il suo blocco isolato è più raro e prognosticamente peggiore'] },
  wpw: { slide: 'Aritmie, pre-eccitazione', corso: [
    'Pre-eccitazione tipo WPW: PR < 0,12 s, QRS > 0,11 s, rallentamento iniziale del QRS (onda delta)',
    'Aspetti secondari suggestivi: ST e T alterate, onde q anomale o complessi QS',
    'Pre-eccitazione tipo LGL: solo PR < 0,12 s, senza onda delta',
    'Le vie accessorie hanno velocità di conduzione maggiore e periodo refrattario più lungo del nodo AV: da qui PR corto, QRS largo e alterazioni della ripolarizzazione'] },
  esv: { slide: 'Aritmie, battiti prematuri ventricolari', corso: [
    'Battito anticipato, QRS largo e di morfologia diversa, non preceduto da P prematura',
    'La pausa che segue è compensatoria',
    'Il fenomeno R su T è quello che può innescare una tachicardia ventricolare',
    'Un bigeminismo ventricolare può simulare un blocco di branca alternante'] },
  tv: { slide: 'Aritmie, tachicardia a QRS largo', corso: [
    'Tachicardia ventricolare sostenuta se dura più di 30 secondi',
    'Regola pratica del corso: tachicardia a complessi stretti, ritmica o aritmica, è sempre sopraventricolare; tachicardia aritmica, stretta o larga, è sopraventricolare; tachicardia a complessi larghi è ventricolare oppure sopraventricolare condotta con aberranza',
    'Nella tachicardia larga e regolare: se il QRS è uguale a quello in ritmo sinusale pensa a sopraventricolare con blocco di branca; se c\u2019è un pregresso infarto o una cardiopatia, la TV è probabile',
    'Se la frequenza ventricolare supera l\u2019atriale è TV; se è l\u2019atriale a superare la ventricolare, flutter o tachicardia atriale'] },
  ivs: { slide: 'Lettura ECG, slide 32 e 56', corso: [
    'Limiti di voltaggio usati a lezione: R massima precordiale < 27 mm, S massima precordiale < 30 mm, somma delle due entro 35-40 mm; R in aVL non oltre 11-13 mm, in aVF non oltre 20 mm',
    'Segni di accompagnamento nel tracciato del corso: ST sottoslivellato e T invertite nelle precordiali sinistre e nelle inferiori, fase terminale negativa della P in V1 (ingrandimento atriale sinistro)'] },
  ipok: { slide: 'Aritmie, tracciato con ipopotassiemia', corso: [
    'Nei tracciati del corso l\u2019ipopotassiemia si riconosce dalle onde U da V3 a V6, spesso insieme al sottoslivellamento ST da attività digitalica'] }
};
['stemi-inferiore', 'stemi-anteriore', 'stemi-laterale', 'stemi-posteriore'].forEach(id => {
  PROF[id] = { slide: 'Cardiopatia ischemica, dolore toracico e sindromi coronariche acute', corso: [
    'Il percorso del corso parte dal dolore: tipico, atipico (soffocamento, peso epigastrico, sincope, malessere, dispnea) oppure silente, che è circa il 30% dei casi',
    'Il primo bivio è l\u2019ECG: con sopraslivellamento ST si va allo STEMI, senza sopraslivellamento si resta tra angina instabile e NSTEMI e decidono i marcatori di citolisi',
    'La gravità del dolore non è proporzionale alla gravità della malattia coronarica',
    'Circa due terzi delle sindromi coronariche acute nascono da una trombosi occlusiva su una placca non stenotica: l\u2019evento è la rottura o l\u2019erosione della placca, non il grado di stenosi'] };
});
PROF['stemi-posteriore'].corso = PROF['stemi-posteriore'].corso.concat(
  ['Nel tracciato del corso: onde T alte da V1 a V4 e rapporto R/S = 1 in V1 fanno sospettare l\u2019ischemia posteriore vera, da distinguere da iperpotassiemia, variante normale e ipertrofia destra']);

PROF_PATCH: {
  S.forEach(s => { const p = PROF[s.id]; if (p) { s.card.corso = p.corso; s.card.slide = p.slide; s.card.corsoFonte = CORSO; } });
  THEORY.push({ id: 'corso', title: '13. I criteri del corso (Mulatero)', html: `
<p class="note">Questo capitolo raccoglie come le stesse cose sono presentate nelle lezioni di Metodologia Clinica del prof. Mulatero. Dove il corso e le linee guida non coincidono, nell'app vale il criterio delle linee guida: qui trovi il valore che il professore usa a lezione.</p>
<h4>Valori di normalità del corso</h4>
<table class="ttab"><thead><tr><th>Parametro</th><th>Valore a lezione</th></tr></thead><tbody>
<tr><td>PR</td><td>0,12-0,20 s. Corto se &lt; 0,12 s (conduzione accelerata, pre-eccitazione), lungo se &gt; 0,20 s (BAV)</td></tr>
<tr><td>QRS</td><td>≤ 0,10 s</td></tr>
<tr><td>QT</td><td>&lt; 0,43 s a 60/min, &lt; 0,39 s a 80/min, &lt; 0,35 s a 100/min; comunque meno di metà del ciclo RR</td></tr>
<tr><td>Onda P</td><td>&lt; 2,5 mm e &lt; 0,12 s; positiva in DII e aVF, non negativa in DI, negativa in aVR; precordiali: sempre positiva V3-V6, positiva o isodifasica V1-V3</td></tr>
<tr><td>Onda Q</td><td>Da ignorare in aVR e DIII; altrove &lt; 0,04 s e &lt; 1/4 della R</td></tr>
<tr><td>Onda R</td><td>Negativa in aVR; aVL fino a 11-13 mm, aVF fino a 20 mm; precordiali: almeno una R ≥ 8 mm, R max &lt; 27 mm, R max + S max ≤ 35 mm</td></tr>
<tr><td>Tratto ST</td><td>Slivellamento non oltre 1 mm rispetto all'isoelettrica (PR o TP)</td></tr>
<tr><td>Onda T</td><td>Concordante con il QRS, assi distanti meno di 45°; tra 1/8 e 2/3 della R; mai negativa in V2 se positiva in V1</td></tr>
<tr><td>Studio elettrofisiologico</td><td>PA 15-35 ms, AH 70-120 ms, H 10-15 ms, HV 35-55 ms</td></tr>
</tbody></table>
<p class="note">Le linee guida AHA/ACCF/HRS usate nel resto dell'app fissano il QRS normale a ≤ 110 ms e il QTc prolungato da 450 ms nell'uomo e 460 ms nella donna. Il corso ragiona sul QT assoluto per frequenza, che è il metodo più rapido al letto del malato.</p>
<h4>Due particolari su aVR e DIII</h4>
<p>aVR guarda dentro le cavità e vede la superficie endocardica: poiché la depolarizzazione va dall'endocardio all'epicardio, l'attivazione si allontana sempre da aVR. Onde Q profonde o complessi QS in aVR non sono mai anormali. Anche in DIII possono essere normali: diventano sospette solo se compaiono anche in aVF. In aVL una q oltre 0,04 s o più profonda di 1/4 della R può essere normale quando l'asse del QRS supera i 75° (cuore verticale).</p>
<h4>Definizione di ritmo sinusale</h4>
<p>Onde P presenti, monomorfe, con morfologia da nodo del seno (positiva in DII, mai negativa in DI, negativa in aVR), intervalli PP costanti con differenza minore di 0,16 s e P che precede il QRS. Frequenza normale 60-100/min: sotto 60 bradicardia sinusale, sopra 100 tachicardia sinusale. Tra le varianti normali il corso mette il wandering pacemaker.</p>
<h4>Asse elettrico: classificazione e cause</h4>
<table class="ttab"><thead><tr><th>Asse</th><th>Valori</th><th>Quando</th></tr></thead><tbody>
<tr><td>Normale</td><td>−30° / +90°</td><td></td></tr>
<tr><td>Orizzontale</td><td>0° / −30°</td><td>Adulti oltre i 40 anni, adipe, ipertrofia sinistra, vizio aortico o mitralico</td></tr>
<tr><td>Verticale</td><td>+60° / +90°</td><td>Giovani, bambini, longilinei, cuore polmonare, stenosi mitralica</td></tr>
<tr><td>Deviato a destra</td><td>&gt; +120°</td><td>Ipertrofia destra, pneumotorace, embolia polmonare</td></tr>
<tr><td>Deviato a sinistra</td><td>&lt; −30°</td><td>Emiblocco anteriore sinistro, infarto inferiore, disionie, ipertrofia sinistra</td></tr>
</tbody></table>
<p>Il metodo di calcolo è quello del capitolo 5: si cerca la periferica isodifasica, l'asse è perpendicolare a quella derivazione, si guarda quale delle due perpendicolari ha il QRS positivo e poi si corregge di 15° avvicinandosi alla derivazione se la deflessione è prevalentemente positiva, allontanandosi se è negativa.</p>
<h4>Frequenza</h4>
<p>Due formule: 60 diviso l'intervallo RR in secondi, oppure 1500 diviso il numero di quadratini dell'intervallo RR.</p>
<h4>Periodi refrattari, come li definisce il corso</h4>
<p><b>Assoluto</b>: nessuna risposta, nemmeno a stimoli sopramassimali. <b>Effettivo</b>: nessuna risposta propagata. <b>Relativo</b>: impulso propagato ma con ritardo. <b>Funzionale</b>: il più breve intervallo fra due impulsi propagati. Nelle fibre rapide il periodo refrattario si accorcia quando la frequenza sale; nelle fibre lente si allunga.</p>
<h4>Il nodo AV in tre zone</h4>
<p>Zona AN (cellule di transizione), zona N (medionodali), zona NH (inferonodali). I blocchi nodali o soprahissiani hanno prognosi migliore, quelli intra o sottohissiani prognosi peggiore. L'impossibilità di condurre può dipendere dall'interruzione delle vie o dal prolungamento del periodo refrattario (tono vagale, farmaci, ischemia).</p>
<h4>Tachicardia a QRS stretto: l'algoritmo del corso</h4>
<p>È regolare? Se no: fibrillazione atriale, flutter a blocco variabile, tachicardia atriale multifocale. Se sì, ci sono onde P visibili? Se la frequenza atriale supera la ventricolare: flutter o tachicardia atriale. Altrimenti tachicardia atriale, da rientro AV o da rientro nodale, distinte dalla lunghezza dell'RP.</p>
<h4>Risposta all'adenosina</h4>
<table class="ttab"><thead><tr><th>Cosa succede</th><th>Che cos'era</th></tr></thead><tbody>
<tr><td>Nessuna variazione</td><td>Dose o somministrazione inadeguata; considerare una TV ad alta frequenza</td></tr>
<tr><td>Rallenta gradualmente e poi riaccelera</td><td>Tachicardia sinusale, giunzionale o atriale focale</td></tr>
<tr><td>Si interrompe di colpo</td><td>Tachicardia da rientro</td></tr>
<tr><td>Persiste con blocco AV transitorio avanzato</td><td>Flutter atriale o tachicardia atriale</td></tr>
</tbody></table>
<h4>Tachicardia a QRS largo</h4>
<p>Se è aritmica: fibrillazione o flutter atriale o tachicardia atriale con blocco di branca o via anomala. Se è ritmica: manovre vagali o adenosina; QRS uguale a quello in ritmo sinusale orienta verso una sopraventricolare con blocco di branca, un pregresso infarto o una cardiopatia strutturale verso la TV; se la frequenza ventricolare supera l'atriale è TV.</p>
<p><b>Semplificando, come a lezione:</b> tachicardia a complessi stretti, ritmica o aritmica, è sempre sopraventricolare; tachicardia aritmica è sopraventricolare; tachicardia a complessi larghi è ventricolare oppure sopraventricolare condotta con aberranza.</p>
<h4>Leggere una traccia al monitor in sei domande</h4>
<p>1. C'è attività elettrica? 2. Qual è la frequenza ventricolare? 3. Il ritmo ventricolare è regolare o irregolare? 4. Il QRS è stretto o largo? 5. Si identifica un'attività atriale? 6. Che rapporto c'è fra attività atriale e ventricolare?</p>
<h4>Bradiaritmie: la lista del corso</h4>
<p>Malattia del nodo del seno (sindrome bradi-tachi), arresto sinusale, blocco seno-atriale, blocchi atrio-ventricolari, blocchi di branca, emiblocchi. La sindrome bradi-tachi si riconosce da: bradicardia sinusale persistente e inappropriata non da farmaci; aritmia sinusale nell'anziano non legata al respiro; blocco seno-atriale o arresto sinusale; alternanza di parossismi di fibrillazione atriale ad alta frequenza e periodi di ritmo lento.</p>
<h4>Come nascono le aritmie, secondo il corso</h4>
<p>Ritmi ectopici automatici da esaltato automatismo, ritmi triggered da post-depolarizzazioni precoci o tardive, conduzione anomala dell'impulso (prolungamento del tempo di conduzione, blocco, rientro). Eziologia delle forme ipercinetiche: congenita, ischemica, miocardiopatie, endocrinopatie, farmaci, abuso di sostanze, alterazioni elettrolitiche e dell'equilibrio acido-base.</p>
<h4>Cardiopatia ischemica: il filo del corso</h4>
<p>L'ischemia nasce da uno squilibrio fra apporto e richiesta di ossigeno. Le arterie epicardiche sono vasi di conduttanza, le intramiocardiche vasi di resistenza; il 60% del flusso coronarico avviene in diastole e la compressione è maggiore nel subendocardio. Con un'ostruzione fino al 40% il flusso massimale è mantenuto; oltre il 50% compare ischemia da sforzo; all'80-90% le resistenze triplicano. Circa due terzi delle sindromi coronariche acute nascono da una trombosi occlusiva su placca non stenotica, e i fattori precipitanti sono per il 60-70% l'attivazione della placca, poi la stenosi e lo spasmo.</p>
<p>Il dolore toracico può essere tipico, atipico (soffocamento, peso epigastrico, sincope, malessere, dispnea) o silente in circa il 30% dei casi, ed è poco sensibile e poco specifico. La gravità del dolore non riflette la gravità della coronaropatia. Il bivio operativo resta l'ECG: con sopraslivellamento ST, STEMI; senza, angina instabile o NSTEMI, distinti dai marcatori di citolisi.</p>
<p class="note">Fonte del capitolo: ${CORSO}. I criteri diagnostici applicati ai tracciati dell'app restano quelli delle linee guida citate nelle singole schede.</p>` });
}

THEORY_14: {
  THEORY.push({ id: 'altrelezioni', title: '14. L\u2019ECG nelle altre lezioni del corso', html: `
<p class="note">Quello che le altre lezioni di Metodologia Clinica aggiungono sull'ECG: embolia polmonare e ipertrofia ventricolare sinistra nell'iperteso. I tracciati corrispondenti sono nell'Atlante.</p>
<h4>ECG nell'embolia polmonare</h4>
<p>L'ECG serve soprattutto a escludere altre cause e a stimare la gravità: nessun segno è sensibile né specifico. Le frequenze riportate a lezione:</p>
<table class="ttab"><thead><tr><th>Segno</th><th>Frequenza</th><th>Significato</th></tr></thead><tbody>
<tr><td>Tachicardia sinusale</td><td>44%</td><td>L'alterazione più comune</td></tr>
<tr><td>Alterazioni aspecifiche di ST e T</td><td>fino al 50%</td><td>Poco utili da sole</td></tr>
<tr><td>Strain ventricolare destro: T invertite in V1-V4 ± DII, DIII, aVF</td><td>34%</td><td>Si associa a pressioni polmonari elevate</td></tr>
<tr><td>S1Q3T3: S profonda in DI, Q in DIII, T invertita in DIII</td><td>20%</td><td>Il segno "classico", né sensibile né specifico</td></tr>
<tr><td>Blocco di branca destra</td><td>18%</td><td>Si associa a mortalità più alta</td></tr>
<tr><td>Deviazione assiale destra</td><td>16%</td><td></td></tr>
<tr><td>P polmonare: P appuntita in DII &gt; 2,5 mm</td><td>9%</td><td>Ingrandimento atriale destro</td></tr>
<tr><td>Tachiaritmie atriali (FA, flutter, tachicardia atriale)</td><td>8%</td><td></td></tr>
<tr><td>R dominante in V1</td><td></td><td>Dilatazione acuta del ventricolo destro</td></tr>
<tr><td>Rotazione oraria</td><td></td><td>Transizione spostata verso V6 con S persistente in V6</td></tr>
</tbody></table>
<p>Il contesto clinico resta decisivo: dispnea nell'80%, dolore pleuritico nel 52%, sincope nel 19%, emottisi nell'11%; ai segni, tachipnea nel 70%, tachicardia nel 26%, segni di TVP nel 15%. All'emogasanalisi ipossia con ipocapnia. Il dolore pleuritico si accentua con il respiro profondo e la tosse e si riduce immobilizzando il torace: è così che lo si distingue dal dolore anginoso.</p>
<h4>Ipertrofia ventricolare sinistra nell'iperteso</h4>
<p>È uno dei danni d'organo mediati dall'ipertensione (ESC/ESH 2018). I criteri usati a lezione:</p>
<table class="ttab"><thead><tr><th>Indice</th><th>Calcolo</th><th>Soglia</th></tr></thead><tbody>
<tr><td>Sokolow-Lyon</td><td>S in V1 + R in V5 o V6</td><td>&gt; 35 mm</td></tr>
<tr><td>Cornell voltage</td><td>R in aVL + S in V3</td><td>&gt; 28 mm negli uomini, &gt; 20 mm nelle donne</td></tr>
<tr><td>Strain</td><td>Alterazione di ST e T</td><td>Inversione con discesa lenta e risalita rapida, con overshoot finale</td></tr>
</tbody></table>
<p><b>Il limite da ricordare:</b> l'ECG per l'ipertrofia ha alta specificità e bassa sensibilità. Un ECG positivo rende probabile la diagnosi; un ECG negativo non la esclude, e serve l'ecocardiogramma.</p>
<p class="note">Fonti: lezioni su TVP ed embolia polmonare e su clinica e complicanze dell'ipertensione, ${CORSO}.</p>` });
}

const ATLAS_G = [{"id": "basi", "nome": "Basi, derivazioni e asse"}, {"id": "normali", "nome": "Tracciati normali e varianti"}, {"id": "fa", "nome": "Fibrillazione atriale"}, {"id": "flutter", "nome": "Flutter atriale"}, {"id": "sopraventricolari", "nome": "Altre sopraventricolari ed extrasistoli"}, {"id": "ventricolari", "nome": "Aritmie ventricolari"}, {"id": "vagali", "nome": "Manovre vagali e pre-eccitazione in tachicardia"}, {"id": "bav", "nome": "Blocchi atrio-ventricolari"}, {"id": "branca", "nome": "Blocchi di branca ed emiblocchi"}, {"id": "seno", "nome": "Nodo del seno e ritmi di scappamento"}, {"id": "wpw", "nome": "Pre-eccitazione"}, {"id": "ischemia", "nome": "Cardiopatia ischemica"}, {"id": "ipertrofia", "nome": "Ipertrofia ventricolare sinistra"}, {"id": "embolia", "nome": "Embolia polmonare"}, {"id": "casi", "nome": "Casi clinici"}];
const ATLAS = [{"id": "lett020", "g": "basi", "t": "Le cinque fasi della depolarizzazione ventricolare", "q": "normale", "n": "", "f": "Lettura ECG, slide 20", "w": 1400, "h": 769}, {"id": "lett021", "g": "basi", "t": "Vettori istantanei e loro proiezione sulle derivazioni", "q": "normale", "n": "", "f": "Lettura ECG, slide 21", "w": 1400, "h": 1216}, {"id": "lett023", "g": "basi", "t": "Posizione degli elettrodi precordiali", "q": null, "n": "Derivazioni precordiali", "f": "Lettura ECG, slide 23", "w": 1400, "h": 609}, {"id": "lett047", "g": "basi", "t": "Asse normale: DI, DII e aVF", "q": null, "n": "Asse Normale DI aVF DII", "f": "Lettura ECG, slide 47", "w": 1327, "h": 1277}, {"id": "lett048", "g": "basi", "t": "Asse deviato a destra: DI, DIII, aVR", "q": null, "n": "Asse Deviato a Destra DI DIII aVR", "f": "Lettura ECG, slide 48", "w": 1396, "h": 1299}, {"id": "lett049", "g": "basi", "t": "Asse deviato a sinistra: DII, DIII, aVR", "q": null, "n": "Asse Deviato a Sinistra DIII DII aVR", "f": "Lettura ECG, slide 49", "w": 1400, "h": 1160}, {"id": "lett050", "g": "basi", "t": "Correzione dell’asse di 15° sul sistema esassiale", "q": null, "n": "+30° -15° -60° -45°", "f": "Lettura ECG, slide 50", "w": 929, "h": 1301}, {"id": "lett051", "g": "normali", "t": "Tracciato normale", "q": "normale", "n": "Tracciato normale", "f": "Lettura ECG, slide 51", "w": 1400, "h": 786}, {"id": "lett057", "g": "normali", "t": "Tracciato normale", "q": "normale", "n": "Tracciato normale", "f": "Lettura ECG, slide 57", "w": 1400, "h": 820}, {"id": "lett058", "g": "normali", "t": "Variante normale: wandering pacemaker", "q": "aritmiasinusale", "n": "VARIANTI NORMALI Wandering pacemaker", "f": "Lettura ECG, slide 58", "w": 1400, "h": 753}, {"id": "ari023", "g": "normali", "t": "Aritmia sinusale: variabilità del ciclo con il respiro", "q": "aritmiasinusale", "n": "", "f": "Aritmie, slide 23", "w": 1400, "h": 277}, {"id": "ari026", "g": "fa", "t": "Fibrillazione atriale", "q": "fa", "n": "Fibrillazione Atriale", "f": "Aritmie, slide 26", "w": 1400, "h": 786}, {"id": "ari027", "g": "fa", "t": "Fibrillazione atriale", "q": "fa", "n": "Fibrillazione Atriale", "f": "Aritmie, slide 27", "w": 1400, "h": 1229}, {"id": "ari028", "g": "fa", "t": "Fenomeno di Ashman", "q": "fa", "n": "Fenomeno di Ashman", "f": "Aritmie, slide 28", "w": 1400, "h": 1213}, {"id": "ari029", "g": "fa", "t": "Fibrillazione atriale", "q": "fa", "n": "Fibrillazione Atriale", "f": "Aritmie, slide 29", "w": 1400, "h": 1160}, {"id": "ari030", "g": "fa", "t": "Fibrillazione atriale", "q": "fa", "n": "Fibrillazione Atriale", "f": "Aritmie, slide 30", "w": 1400, "h": 911}, {"id": "ari031", "g": "fa", "t": "Fibrillazione atriale", "q": "fa", "n": "Fibrillazione Atriale", "f": "Aritmie, slide 31", "w": 1400, "h": 716}, {"id": "ari032", "g": "fa", "t": "Fibrillazione atriale ad alta risposta ventricolare", "q": "fa", "n": "Fibrillazione Atriale", "f": "Aritmie, slide 32", "w": 1400, "h": 1005}, {"id": "ari071", "g": "fa", "t": "Fibrillazione atriale", "q": "fa", "n": "Fibrillazione atriale", "f": "Aritmie, slide 71", "w": 1400, "h": 551}, {"id": "ari072", "g": "fa", "t": "Fibrillazione atriale, anche con blocco di branca sinistra", "q": "fa", "n": "Fibrillazione atriale Fibrillazione atriale + BBSx", "f": "Aritmie, slide 72", "w": 1400, "h": 784}, {"id": "ari078", "g": "fa", "t": "FA con battito di scappamento, flutter a blocco variabile, TPSV nodale", "q": "fa", "n": "Fibrillazione atriale con un battito di scappamento Flutter Atriale con blocco variabile Tachicardia SV (nodale AV da rientro)", "f": "Aritmie, slide 78", "w": 1400, "h": 871}, {"id": "ari079", "g": "fa", "t": "Fibrillazione atriale con un complesso condotto con aberranza", "q": "fa", "n": "Tracciato 111 Fibrillazione atriale con un unico complesso condotto con aberranza", "f": "Aritmie, slide 79", "w": 1400, "h": 369}, {"id": "ari033", "g": "flutter", "t": "Flutter atriale", "q": "flutter", "n": "Flutter Atriale", "f": "Aritmie, slide 33", "w": 1400, "h": 865}, {"id": "ari034", "g": "flutter", "t": "Flutter atriale: onde F nelle derivazioni inferiori", "q": "flutter", "n": "Flutter Atriale: la frequenza atriale è di solito compresa tra 220 e 350 bpm, origina da un focus atriale e si automantiene con meccanismo di rientro. Onde F a caratteristica forma di dente di sega (DII, DIII, aVF, V1, V2).", "f": "Aritmie, slide 34", "w": 1400, "h": 514}, {"id": "ari035", "g": "flutter", "t": "Flutter atriale", "q": "flutter", "n": "Flutter Atriale", "f": "Aritmie, slide 35", "w": 1400, "h": 870}, {"id": "ari036", "g": "flutter", "t": "Flutter atriale e circuito di rientro", "q": "flutter", "n": "Flutter Atriale", "f": "Aritmie, slide 36", "w": 1400, "h": 724}, {"id": "ari077", "g": "flutter", "t": "Flutter atriale", "q": "flutter", "n": "Flutter Atriale", "f": "Aritmie, slide 77", "w": 1400, "h": 483}, {"id": "ari037", "g": "sopraventricolari", "t": "Tachicardia atriale multifocale", "q": null, "n": "Tachicardia Atriale Multifocale", "f": "Aritmie, slide 37", "w": 1400, "h": 735}, {"id": "ari038", "g": "sopraventricolari", "t": "Tachicardia giunzionale", "q": "avnrt", "n": "Tachicardia Giunzionale", "f": "Aritmie, slide 38", "w": 1400, "h": 700}, {"id": "ari039", "g": "sopraventricolari", "t": "Tachicardia parossistica da rientro intranodale a 205/min", "q": "avnrt", "n": "Tachicardia giunzionale parossistica (da rientro) del tipo intranodale AV, cioè TNAVR (Frequenza 205 battiti/min, regolare. Nessuna onda P identificabile. QRS di ampiezza normale. T invertite. TPSV", "f": "Aritmie, slide 39", "w": 1400, "h": 325}, {"id": "ari040", "g": "sopraventricolari", "t": "TPSV", "q": "avnrt", "n": "TPSV", "f": "Aritmie, slide 40", "w": 1400, "h": 645}, {"id": "ari041", "g": "sopraventricolari", "t": "TPSV", "q": "avnrt", "n": "TPSV", "f": "Aritmie, slide 41", "w": 1400, "h": 700}, {"id": "ari042", "g": "sopraventricolari", "t": "Extrasistoli sopraventricolari", "q": "esa", "n": "", "f": "Aritmie, slide 42", "w": 1019, "h": 1301}, {"id": "ari043", "g": "sopraventricolari", "t": "Battito prematuro sopraventricolare", "q": "esa", "n": "Battito Prematuro (Extrasistole) Sopra-Ventricolare", "f": "Aritmie, slide 43", "w": 1400, "h": 1253}, {"id": "ari074", "g": "sopraventricolari", "t": "Tachicardia atriale a due foci e bradicardia sinusale con scappamenti", "q": "esa", "n": "Tachicardia Atriale (2 foci diversi) e RS Bradicardia sinusale: I battiti 3-4-5 sono battiti di scappamento ventricolare", "f": "Aritmie, slide 74", "w": 1400, "h": 665}, {"id": "ari080", "g": "sopraventricolari", "t": "Tachicardia sinusale con battiti atriali prematuri; bigeminismo atriale", "q": "esa", "n": "Tracciato 112 Tachicardia sinusale con frequenti battiti atriali prematuri Ritmo sinusale con battiti ectopici prematuri atriali (bigeminismo) ad origine differente (p diverse)", "f": "Aritmie, slide 80", "w": 1400, "h": 770}, {"id": "ari044", "g": "ventricolari", "t": "Battito prematuro ventricolare", "q": "esv", "n": "Battito Prematuro (Extrasistole) Ventricolare", "f": "Aritmie, slide 44", "w": 1400, "h": 544}, {"id": "ari073", "g": "ventricolari", "t": "R su T che innesca una tachicardia ventricolare", "q": "esv", "n": "Ritmo sinusale, R su T che innesca una TV", "f": "Aritmie, slide 73", "w": 1400, "h": 277}, {"id": "ari075", "g": "ventricolari", "t": "Bigeminismo ventricolare che simula un blocco di branca alternante", "q": "esv", "n": "Ritmo sinusale con bigeminismo ventricolare che simula un blocco di branca alternante", "f": "Aritmie, slide 75", "w": 1400, "h": 297}, {"id": "ari081", "g": "ventricolari", "t": "R su T che innesca una TV sostenuta; interruzione con pugno precordiale", "q": "tv", "n": "Tracciato 119 Tracciato 118 Ritmo sinusale con frequenti battiti ectopici del tipo R su T che innescano poi una TV sostenuta Tachicardia ventricolare sostenuta. Dopo il pugno sul precordio una battito prematuro ventricolare interrompe il circuito di rientro e quindi la TV Pugno su precordio", "f": "Aritmie, slide 81", "w": 1400, "h": 914}, {"id": "ari082", "g": "ventricolari", "t": "Battito ventricolare prematuro con pausa compensatoria; trigeminismo atriale", "q": "esv", "n": "Tachicardia sinusale con un singolo battito prematuro ventricolare, la pausa che segue il battito è compensatoria Ritmo sinusale con frequenti battiti atriali prematuri monofocali (trigeminismo)", "f": "Aritmie, slide 82", "w": 1400, "h": 627}, {"id": "ari045", "g": "ventricolari", "t": "Tachicardia ventricolare: criteri di morfologia", "q": "tv", "n": "", "f": "Aritmie, slide 45", "w": 1400, "h": 1134}, {"id": "ari046", "g": "ventricolari", "t": "Tachicardia ventricolare", "q": "tv", "n": "Tachicardia Ventricolare", "f": "Aritmie, slide 46", "w": 1400, "h": 825}, {"id": "ari047", "g": "ventricolari", "t": "Tachicardia ventricolare e fenomeno di Wenckebach ventricolare", "q": "tv", "n": "Tachicardia Ventricolare", "f": "Aritmie, slide 47", "w": 1400, "h": 794}, {"id": "ari048", "g": "ventricolari", "t": "Tachicardia ventricolare", "q": "tv", "n": "Tachicardia Ventricolare", "f": "Aritmie, slide 48", "w": 1400, "h": 753}, {"id": "ari049", "g": "ventricolari", "t": "Tachicardia ventricolare", "q": "tv", "n": "Tachicardia Ventricolare", "f": "Aritmie, slide 49", "w": 1400, "h": 593}, {"id": "ari083", "g": "ventricolari", "t": "Tachicardia ventricolare", "q": "tv", "n": "", "f": "Aritmie, slide 83", "w": 1217, "h": 1301}, {"id": "ari050", "g": "ventricolari", "t": "Torsione di punta", "q": "tdp", "n": "Torsione di Punta", "f": "Aritmie, slide 50", "w": 1400, "h": 569}, {"id": "ari051", "g": "ventricolari", "t": "Torsione di punta", "q": "tdp", "n": "Torsione di Punta", "f": "Aritmie, slide 51", "w": 1400, "h": 511}, {"id": "ari052", "g": "ventricolari", "t": "Torsione di punta", "q": "tdp", "n": "Torsione di Punta", "f": "Aritmie, slide 52", "w": 1400, "h": 706}, {"id": "ari053", "g": "ventricolari", "t": "Fibrillazione ventricolare", "q": "fv", "n": "Fibrillazione Ventricolare", "f": "Aritmie, slide 53", "w": 1400, "h": 873}, {"id": "ari054", "g": "ventricolari", "t": "Fibrillazione ventricolare", "q": "fv", "n": "Fibrillazione Ventricolare", "f": "Aritmie, slide 54", "w": 1400, "h": 767}, {"id": "ari084", "g": "ventricolari", "t": "Flutter e fibrillazione ventricolare", "q": "fv", "n": "", "f": "Aritmie, slide 84", "w": 1400, "h": 948}, {"id": "ari085", "g": "ventricolari", "t": "Fibrillazione ventricolare", "q": "fv", "n": "Fibrillazione Ventricolare", "f": "Aritmie, slide 85", "w": 1400, "h": 781}, {"id": "ari086", "g": "ventricolari", "t": "Fibrillazione ventricolare", "q": "fv", "n": "Fibrillazione Ventricolare", "f": "Aritmie, slide 86", "w": 1400, "h": 1050}, {"id": "ari087", "g": "ventricolari", "t": "Fibrillazione ventricolare a onde fini", "q": "fv", "n": "", "f": "Aritmie, slide 87", "w": 1400, "h": 1057}, {"id": "ari055", "g": "vagali", "t": "Massaggio del seno carotideo: effetto sulle tachicardie", "q": null, "n": "", "f": "Aritmie, slide 55", "w": 1400, "h": 1077}, {"id": "ari056", "g": "vagali", "t": "Massaggio del seno carotideo: risposte possibili", "q": null, "n": "", "f": "Aritmie, slide 56", "w": 1400, "h": 466}, {"id": "ari057", "g": "vagali", "t": "Massaggio del seno carotideo", "q": null, "n": "", "f": "Aritmie, slide 57", "w": 1235, "h": 1301}, {"id": "ari058", "g": "vagali", "t": "Massaggio del seno carotideo: risposta patologica", "q": null, "n": "", "f": "Aritmie, slide 58", "w": 1400, "h": 669}, {"id": "ari076", "g": "vagali", "t": "Tachicardia da rientro atrio-ventricolare in paziente con WPW", "q": "wpw", "n": "Tachicardia atrio-ventricolare da rientro in paziente con WPW", "f": "Aritmie, slide 76", "w": 1400, "h": 797}, {"id": "ari094", "g": "bav", "t": "BAV di I grado con PR 0,32 s", "q": "bav1", "n": "Blocco atrio ventricolare di primo grado. Intervallo PR è costante e prolungato (0,32”)", "f": "Aritmie, slide 94", "w": 1400, "h": 154}, {"id": "ari095", "g": "bav", "t": "Bradicardia sinusale con BAV di I grado (PR 0,92 s)", "q": "bav1", "n": "Bradicardia sinusale (frequenza sinusale 35/min) con BAV I grado (PR allungato =0,92” e costante).", "f": "Aritmie, slide 95", "w": 1400, "h": 326}, {"id": "ari096", "g": "bav", "t": "BAV di I grado con ipertrofia atriale sinistra e segni di ipokaliemia", "q": "bav1", "n": "BAV di I grado (PR=0,26), ipertrofia atriale sx (onda P durata >, difasica in DII, componente neg in V1), modificazioni non specifiche del tratto ST e dell’ onda T, probabile ipoK (onde U da V3 a V6), possibile attività digitalica (ST sottoslivellato da V3 a V6). Infarto inferiore pregresso (onda q in aVF > ¼ onda R seguente).", "f": "Aritmie, slide 96", "w": 1400, "h": 808}, {"id": "ari099", "g": "bav", "t": "BAV di II grado tipo 1 con conduzione 5:4", "q": "wenck", "n": "Blocco atrio ventricolare di secondo grado tipo I. Il terzo QRS è sinusale con PR corto; il quarto, quinto e sesto QRS sono sinusali con progressivo allungamento del PR. La P, dopo il sesto QRS, non viene condotta. I battiti 3-7 mostrano conduzione 5:4 (5P ogni 4QRS)", "f": "Aritmie, slide 99", "w": 1400, "h": 279}, {"id": "ari100", "g": "bav", "t": "BAV di II grado tipo 1 (Wenckebach)", "q": "wenck", "n": "Blocco AV II grado tipo 1 (Wenkebach)", "f": "Aritmie, slide 100", "w": 1400, "h": 251}, {"id": "ari101", "g": "bav", "t": "BAV di II grado tipo 1 (Wenckebach)", "q": "wenck", "n": "Blocco AV II grado tipo 1 (Wenkebach)", "f": "Aritmie, slide 101", "w": 1400, "h": 706}, {"id": "ari102", "g": "bav", "t": "BAV di II grado tipo 2 con blocco di branca sinistra", "q": "mobitz2", "n": "Ritmo sinusale con blocco di branca sinistra (QRS allargati, alterazioni del tratto ST e dell’onda T) e blocco atrio ventricolare di secondo grado tipo II (I primi 3 cicli hanno PR normale di 0,16”. La quarta P non è condotta ai ventricoli)", "f": "Aritmie, slide 102", "w": 1400, "h": 200}, {"id": "ari103", "g": "bav", "t": "BAV di II grado tipo 2 (Mobitz)", "q": "mobitz2", "n": "Blocco AV II grado tipo 2 (Mobitz)", "f": "Aritmie, slide 103", "w": 1400, "h": 767}, {"id": "ari104", "g": "bav", "t": "BAV di II grado tipo 2 (Mobitz)", "q": "mobitz2", "n": "", "f": "Aritmie, slide 104", "w": 1400, "h": 1050}, {"id": "ari106", "g": "bav", "t": "BAV 2:1", "q": "bav21", "n": "Ritmo sinusale con BAV 2:1. Una P ogni due è condotta cioè seguita da un QRS. QRS lievemente aumentato (0,12”).", "f": "Aritmie, slide 106", "w": 1400, "h": 255}, {"id": "ari108", "g": "bav", "t": "BAV completo con scappamento a 23/min e QRS larghi", "q": "bav3", "n": "Blocco di terzo grado (blocco completo). Vi sono P regolari con una frequenza di 110/min con QRS regolari con frequenza di 23/min. I QRS allargati con forma alterata, insieme alla bassa frequenza ventricolare, indicano un ritmo di scappamento basso, prob dalle cellule di Purkinje.", "f": "Aritmie, slide 108", "w": 1400, "h": 213}, {"id": "ari109", "g": "bav", "t": "BAV completo con scappamento a 36/min e QRS stretti", "q": "bav3", "n": "BAV completo. Onde P regolari con frequenza di 107/min. QRS regolari a 36/min. QRS stretti indicano un segnapassi ventricolare alto.", "f": "Aritmie, slide 109", "w": 1400, "h": 589}, {"id": "ari110", "g": "bav", "t": "BAV di III grado", "q": "bav3", "n": "Blocco atrio-ventricolare di terzo grado (blocco completo).", "f": "Aritmie, slide 110", "w": 1400, "h": 768}, {"id": "ari114", "g": "branca", "t": "BBDx completo: rSR’ in V1, T negative V1-V4", "q": "bbdx", "n": "Blocco di branca destro completo. Complesso rSR’ in V1 con QRS = 0,12”. Sottoslivellamento del segmento ST e inversione delle onde T da V1 a V4.", "f": "Aritmie, slide 114", "w": 1400, "h": 780}, {"id": "ari115", "g": "branca", "t": "BBDx con emiblocco anteriore sinistro", "q": "bbdx", "n": "BBDX completo (in V1 onda r secondaria con QRS = 0,13”) con EASX (ÂQRS= -75°, onde r iniziali in DII, DIII, aVF) Ipertrofia atriale sinistra (onde P bifide in DI e difasiche in V1). Rotazione oraria del cuore (Scarsa progressione onda R nelle precordiali, ridotto voltaggio onde r precordiali).", "f": "Aritmie, slide 115", "w": 1400, "h": 779}, {"id": "ari116", "g": "branca", "t": "BBDx con emiblocco posteriore sinistro", "q": "bbdx", "n": "BBDX (In V1 il QRS è del tipo rsR’S’ con durata prolungata di 0,12”) con EPSX (Deviazione assiale destra -ÂQRS= +120°- in assenza di altre cause cliniche o anamnestiche, rotazione oraria del cuore).", "f": "Aritmie, slide 116", "w": 1400, "h": 793}, {"id": "ari117", "g": "branca", "t": "BBDx con QRS oltre 0,18 s", "q": "bbdx", "n": "BBDX (QRS>0,18” e complesso rsR’ in V1)", "f": "Aritmie, slide 117", "w": 1400, "h": 847}, {"id": "ari118", "g": "branca", "t": "BBDx completo: RSR’ in V1, S ampia in DI e aVL", "q": "bbdx", "n": "Tracciato 59 BBDX completo (complesso RSR’ in V1, QRS=0,14”, onda S ampia in DI, aVL e da V1 a V6)", "f": "Aritmie, slide 118", "w": 1400, "h": 820}, {"id": "ari133", "g": "branca", "t": "BBDx con tachicardia sinusale", "q": "bbdx", "n": "Tracciato 48 BBDx (QRS=0,14, complesso rSR’ in V1). FC 107/min: tachicardia sinusale", "f": "Aritmie, slide 133", "w": 1400, "h": 812}, {"id": "ari121", "g": "branca", "t": "BBSx completo senza q settali in V6, DI e aVL", "q": "bbsx", "n": "BBSX completo (QRS = 0,14”, in V6 e in DI e aVL assenza di onde q iniziali settali, assenza di BBDX). In V6, DI, DII, aVL sottoslivellamento tratto ST secondario all’ alterazione del QRS.", "f": "Aritmie, slide 121", "w": 1400, "h": 786}, {"id": "ari122", "g": "branca", "t": "BBSx con QRS 0,16 s", "q": "bbsx", "n": "BBSX (QRS=0,16”, senza R’ in V1, no onda q in V6, DI, aVL)", "f": "Aritmie, slide 122", "w": 1400, "h": 793}, {"id": "ari123", "g": "branca", "t": "BBSx completo con deviazione assiale sinistra", "q": "bbsx", "n": "Tracciato 36 BBSX completo (QRS>0,18”, no onde q settali iniziali, no R’ nelle precordiali, onde S in V1 e complessi QS in V2 e V3, sottosliv ST e inversione T in V6 e soprasliv ST in precordiali destre). Dev assiale sinistra (ÂQRS = -45°). Onda P con componente neg dominante in V1: anomalia atriale sx. Onda q in aVL: IMA?", "f": "Aritmie, slide 123", "w": 1400, "h": 799}, {"id": "ari124", "g": "branca", "t": "BBSx incompleto con tachicardia sinusale", "q": "bbsx", "n": "Tachicardia sinusale (FC >100/min) BBSX incompleto (QRS = 0,11”, onde S in precordiali dx più ampie che di norma così come onde R in precordiali sx, in V5, V6 e in DI e aVL assenza di onde q settali). Alterazioni non specifiche del tratto ST e della T nelle precordiali sinistre, ipertrofia atriale sinistra.", "f": "Aritmie, slide 124", "w": 1400, "h": 800}, {"id": "ari125", "g": "branca", "t": "BBSx con QRS 0,12 s", "q": "bbsx", "n": "Tracciato 62 BBSX (QRS=0,12, assenza di onde q settali e assenza di complessi rSR’ in V1 che indichi BBDX. Nessun segno di pre-eccitazione)", "f": "Aritmie, slide 125", "w": 1400, "h": 827}, {"id": "ari134", "g": "branca", "t": "BBSx completo con anomalia atriale sinistra", "q": "bbsx", "n": "Tracciato 53 BBSX completo (QRS = 0,16, in assenza di onde q settali normali senza complessi rSR’ (BBDX) e di preeccitazione ventricolare) deviazione assiale sinistra anormale (ÂQRS= - 45°). Anomalia atriale sinistra (onda P difasica in DII con durata di 0,14; componente negativa dominante in V1),", "f": "Aritmie, slide 134", "w": 1400, "h": 794}, {"id": "ari127", "g": "branca", "t": "Emiblocco anteriore sinistro: asse −45° con r iniziali nelle inferiori", "q": "eas", "n": "EASX . Deviazione assiale sinistra (ÂQRS = -45°), onde r iniziali normali nelle derivazioni inferiori ( DII, DIII, aVF). QRS =0,10”. Rotazione oraria del cuore (mancanza di onde q settali in V6 ma presenti in aVL-no BBSX incompleto)", "f": "Aritmie, slide 127", "w": 1400, "h": 798}, {"id": "ari135", "g": "branca", "t": "Emiblocco anteriore sinistro e rotazione oraria", "q": "eas", "n": "Tracciato 61 EASX (ÂQRS =-45°, presenza di onde r iniziali in aVF che non permette di diagnosticare un infarto inferiore), rotazione cardiaca oraria (la zona di transizione è a sinistra di V6-dove compaiono onde q settali-o tra V5 e V6-tenendo conto della comparsa della R dominante), modificazioni non specifiche del tratto ST e dell’onda T nelle derivazioni degli arti", "f": "Aritmie, slide 135", "w": 1400, "h": 807}, {"id": "ari129", "g": "branca", "t": "Emiblocco posteriore sinistro: asse +105°", "q": "eps", "n": "EPSX. Lieve dev assiale destra (ÂQRS=+105°). Non vi sono segni di ipertrofia ventricolare destra nelle precordiali. Non vi è rotazione oraria del cuore. Valutare ÂQRS di un ECG precedente.", "f": "Aritmie, slide 129", "w": 1400, "h": 778}, {"id": "ari131", "g": "branca", "t": "Conduzione intraventricolare: quadri a confronto", "q": "bbdx", "n": "", "f": "Aritmie, slide 131", "w": 930, "h": 1301}, {"id": "ari132", "g": "branca", "t": "Ritardo diffuso di conduzione intraventricolare", "q": "bbdx", "n": "continua", "f": "Aritmie, slide 132", "w": 1400, "h": 1230}, {"id": "ari136", "g": "seno", "t": "Aritmia sinusale", "q": "aritmiasinusale", "n": "", "f": "Aritmie, slide 136", "w": 1400, "h": 277}, {"id": "ari137", "g": "seno", "t": "Arresto sinusale", "q": null, "n": "", "f": "Aritmie, slide 137", "w": 1400, "h": 747}, {"id": "ari138", "g": "seno", "t": "Blocco seno-atriale", "q": null, "n": "", "f": "Aritmie, slide 138", "w": 1400, "h": 758}, {"id": "ari139", "g": "seno", "t": "Arresto sinusale", "q": null, "n": "Arresto Sinusale", "f": "Aritmie, slide 139", "w": 1400, "h": 646}, {"id": "ari140", "g": "seno", "t": "Blocco seno-atriale", "q": null, "n": "Blocco Seno-Atriale", "f": "Aritmie, slide 140", "w": 1400, "h": 735}, {"id": "ari141", "g": "seno", "t": "Blocco seno-atriale: pausa doppia dell’intervallo normale", "q": null, "n": "Blocco senoatriale. Intervallo tra quarto e quinto battito è circa 2 volte l’intervallo medio normale: onda di depolarizzazione sinusale non si è propagata al miocardio atriale.", "f": "Aritmie, slide 141", "w": 1400, "h": 230}, {"id": "ari142", "g": "seno", "t": "Sindrome bradi-tachi", "q": null, "n": "Sindrome Bradi-Tachi (Sick Sinus Syndrome) 1) Bradicardia sinusale persistente e inappropriata non causata da farmaci 2) Aritmia sinusale nel paziente anziano non correlata con il pattern respiratorio 3) Blocco seno atriale o arresto sinusale 4) Alternanza di parossismi di fibrillazione atriale con elevata frequenza ventricolare e periodi di ritmo atriale e ventricolare lento", "f": "Aritmie, slide 142", "w": 1400, "h": 652}, {"id": "ari143", "g": "seno", "t": "Ritmi di scappamento", "q": "bav3", "n": "", "f": "Aritmie, slide 143", "w": 1400, "h": 373}, {"id": "ari144", "g": "seno", "t": "Inizio di un ritmo ventricolare di scappamento", "q": "bav3", "n": "", "f": "Aritmie, slide 144", "w": 1400, "h": 620}, {"id": "ari151", "g": "wpw", "t": "WPW: PR 0,06 s, QRS 0,18 s, onda delta in DI e V2-V4", "q": "wpw", "n": "Pre-eccitazione tipo WPW. Intervallo PR=0,06. QRS=0,18. Onda  ben evidente in DI,V2,V3,V4. Sottoslivellamento aspecifico del segmento ST e appiattimento onda T in DI,DII,DIII,aVF, V5,V6.", "f": "Aritmie, slide 151", "w": 1400, "h": 799}, {"id": "ari152", "g": "wpw", "t": "Pre-eccitazione tipo WPW", "q": "wpw", "n": "Pre-eccitazione WPW", "f": "Aritmie, slide 152", "w": 1400, "h": 699}, {"id": "ari153", "g": "wpw", "t": "Onda delta e PR corto: lo schema", "q": "wpw", "n": "", "f": "Aritmie, slide 153", "w": 1400, "h": 1084}, {"id": "ari154", "g": "wpw", "t": "Pre-eccitazione: PR 0,09 s, QRS 0,13 s", "q": "wpw", "n": "Tracciato 70 Pre-eccitazione ventricolare ( intervallo PR = 0,09”, QRS = 0,13”, parte iniziale del QRS impastata)", "f": "Aritmie, slide 154", "w": 1400, "h": 786}, {"id": "ari155", "g": "wpw", "t": "Pre-eccitazione: PR 0,10 s, QRS 0,14 s", "q": "wpw", "n": "Tracciato 55 Pre-eccitazione ventricolare (intervallo PR =0,10” e QRS = 0,14”", "f": "Aritmie, slide 155", "w": 1400, "h": 793}, {"id": "cad051", "g": "ischemia", "t": "Reperti ECG classici dell’ischemia", "q": "stemi-anteriore", "n": "Electrocardiogramma (ECG) – Normale nel 50% dei pazienti con angina mentre asintomatici – spesso anomalie aspecifiche – Reperti classici: • sottoslivellamento del tratto ST (ischemia subendocardica) • inversione dell’onda T • sopraslivellamento tratto ST", "f": "Cardiopatia ischemica, slide 51", "w": 1400, "h": 768}, {"id": "cad089", "g": "ischemia", "t": "Infarto antero-laterale con onde Q patologiche", "q": "stemi-laterale", "n": "Infarto antero laterale (QS in V3 V4 V5 e onda q in V6 con profondità superiore ad ¼ dell’altezza della R successiva)", "f": "Cardiopatia ischemica, slide 89", "w": 1400, "h": 793}, {"id": "cad090", "g": "ischemia", "t": "Infarto inferiore con onde q patologiche in DII, DIII, aVF", "q": "stemi-inferiore", "n": "Infarto miocardico inferiore. Onde q patologiche (profondità > di ¼ dell’altezza dell’onda R successiva, e ampiezza >0,04) in DII, DIII, aVF con anormale progressione dell’onda R nelle precordiali. Onde R di ampiezza ridotta in V4-V6.", "f": "Cardiopatia ischemica, slide 90", "w": 1400, "h": 782}, {"id": "cad091", "g": "ischemia", "t": "Infarto antero-settale pregresso", "q": "stemi-anteriore", "n": "Infarto antero-settale pregresso (mancata progressione dell’onda R nelle precordiali", "f": "Cardiopatia ischemica, slide 91", "w": 1400, "h": 807}, {"id": "cad092", "g": "ischemia", "t": "Infarto antero-laterale esteso recente", "q": "stemi-laterale", "n": "Infarto miocardico anterolaterale esteso (onda q anormale da V2 a V6 e in DI e aVL) recente (sopraslivellamento ST da V2 a V6 e in DI e aVL con sottoslivellamento speculare in DIII e aVF). Possibile danno ischemico della parete posteriore vera (sottoslivellamento ST in V1).", "f": "Cardiopatia ischemica, slide 92", "w": 1400, "h": 798}, {"id": "cad093", "g": "ischemia", "t": "Infarto infero-laterale recente con sottoslivellamento speculare", "q": "stemi-inferiore", "n": "Infarto miocardico infero laterale recente (sopraslivellamento ST in DII, DIII, aVF e da V4 a V6 con sottoslivellamento speculare in DI, aVL, e da V1 a V3). Alterata progressione dell’onda R nelle precordiali sinistre (poss pregresso IMA lat).", "f": "Cardiopatia ischemica, slide 93", "w": 1400, "h": 791}, {"id": "cad094", "g": "ischemia", "t": "Infarto inferiore relativamente recente", "q": "stemi-inferiore", "n": "Infarto miocardico inferiore (onda Q in aVF con durata>0,04” e ampiezza >1/4 R corrispondente, onda Q in DIII) relat recente (inversione onda T nelle deriv inferiori DII, DIII, aVF). Possibile ischemia parete posteriore vera (onde T alte in V2, V3).", "f": "Cardiopatia ischemica, slide 94", "w": 1400, "h": 798}, {"id": "cad095", "g": "ischemia", "t": "Infarto inferiore pregresso e laterale recente", "q": "stemi-laterale", "n": "Tachicardia sinusale (FC>100/min) Infarto miocardico inferiore pregresso (onda q anormale in DII, DIII e aVF) Infarto recente parete laterale (onda q e sopraslivellamento ST in V6) e della parete posteriore vera (sottoslivellamento ST da V1 a V4 e onda R alta e slargata in V1).", "f": "Cardiopatia ischemica, slide 95", "w": 1400, "h": 785}, {"id": "cad096", "g": "ischemia", "t": "Infarto inferiore recente, alterazioni al limite", "q": "stemi-inferiore", "n": "Infarto miocardico inferiore recente (onda q in DII e aVF non sicuramente anormali e sopraslivellamento in DIII e aVF non oltre i limiti di norma, onda T invertita in DII e aVF ) e ischemia o infarto subendocardico (inversione profonda e simmetrica onda T da V2 a V6 e in DI e aVL). Scarsa progressione onda r da V1 a V3: possibile infarto intramurale.", "f": "Cardiopatia ischemica, slide 96", "w": 1400, "h": 829}, {"id": "cad097", "g": "ischemia", "t": "Tracciato anormale con alterazioni aspecifiche", "q": "stemi-anteriore", "n": "Il tracciato è francamente anormale ma le alterazioni non sono specifiche. Onde T invertite in V2, V3, aVL e di basso voltaggio in DI, V4,V5. Sottoslivellamento ST in DI. Quadro clinico: paziente con dolori tipici stenocardici. Probabile eziologia ischemica delle alt. ECG.", "f": "Cardiopatia ischemica, slide 97", "w": 1400, "h": 788}, {"id": "cad098", "g": "ischemia", "t": "Infarto acuto infero-laterale (apicale)", "q": "stemi-inferiore", "n": "Infarto miocardico acuto infero laterale (apicale) (sopraslivellamento ST in DII, DIII, aVF, più sfumato in V5,V6 e sottoslivellamento speculare in DI, aVL, e da V1 a V3)", "f": "Cardiopatia ischemica, slide 98", "w": 1400, "h": 791}, {"id": "cad099", "g": "ischemia", "t": "Infarto inferiore recente", "q": "stemi-inferiore", "n": "Infarto miocardico inferiore recente: onda q anormale in aVF, con sopraslivellamento del tratto ST e inversione delle T nelle derivazioni inferiori. Modesto sopraslivellamento di ST in V6, alterazioni non specifiche dell’onda T in V4, V5. Sottoslivellamento speculare in DI e aVL.", "f": "Cardiopatia ischemica, slide 99", "w": 1400, "h": 753}, {"id": "cad100", "g": "ischemia", "t": "Infarto transmurale anteriore: QS da V1 a V4", "q": "stemi-anteriore", "n": "IMA transmurale anteriore (progressione dell’onda r patologica: nessuna r da V1 a V4, onde q patologiche da V1 a V4, complessi QS da V1 a V4) recente (meno di una settimana) (soprasliv del tratto ST da V1 a V4 (minimo in V5) e l’inversione dell’onda T in V2,V3,V4).", "f": "Cardiopatia ischemica, slide 100", "w": 1400, "h": 798}, {"id": "cad101", "g": "ischemia", "t": "Infarto antero-laterale, inferiore e posteriore", "q": "stemi-posteriore", "n": "IMA antero-laterale esteso (onde q patologiche da V3 a V6 e in DI) e IMA inferiore (onde q in DII e aVF). Onda r dominante in V1: infarto della parete posteriore. Progressione onda r patologica. Onde P anormali in V1: anomalia atriale sx per ischemia o ipertrofia.", "f": "Cardiopatia ischemica, slide 101", "w": 1400, "h": 813}, {"id": "cad102", "g": "ischemia", "t": "Infarto anteriore recente con emiblocco anteriore sinistro", "q": "stemi-anteriore", "n": "IMA anteriore recente (onde r < 8mm, onde q da V1 a V4 > 1/4 onda r seguente con durata superiore a 0,03, soprasliv tratto ST da V1 a V5. EASX (ÂQRS=-60°).", "f": "Cardiopatia ischemica, slide 102", "w": 1400, "h": 827}, {"id": "cad103", "g": "ischemia", "t": "Infarto anteriore: progressione anormale della r", "q": "stemi-anteriore", "n": "Infarto anteriore (progressione anormale onda r: assenza di r da V1 a V3; onde q - in realtà complessi QS - in V1,V2,V3, hanno durata superiore a 0,03” e hanno ampiezza > di ¼ onda r seguente) recente (da V1 a V5 sopraslivellamento significativo del tratto ST) e anomalia atriale sinistra (P difasiche in DII).", "f": "Cardiopatia ischemica, slide 103", "w": 1400, "h": 831}, {"id": "cad104", "g": "ischemia", "t": "Lesione ischemica acuta antero-settale", "q": "stemi-anteriore", "n": "Lesione miocardica ischemica acuta in sede antero settale (progressione dell’onda r da V1 a V3 anormale, onda q in V3 con ampiezza superiore a ¼ onda r seguente, sopraslivellamento tratto ST da V1 a V4 e in DI e aVL con modificazione speculare in DII,DIII e aVF)", "f": "Cardiopatia ischemica, slide 104", "w": 1400, "h": 817}, {"id": "cad105", "g": "ischemia", "t": "Infarto antero-settale recente", "q": "stemi-anteriore", "n": "Infarto antero settale recente (da V1 a V3 onde q di durata > di 0,03” con ampiezza superiore a ¼ onda R seguente. Sopraslivellamento sel tratto ST da V1 a V5 presente anche in DI, inversione dell’onda T da V1 a V5)", "f": "Cardiopatia ischemica, slide 105", "w": 1400, "h": 806}, {"id": "cad109", "g": "ischemia", "t": "Derivazioni destre", "q": "stemi-inferiore", "n": "DERIVAZIONI DESTRE", "f": "Cardiopatia ischemica, slide 109", "w": 1400, "h": 655}, {"id": "cad152", "g": "ischemia", "t": "Infarto transmurale anteriore e infarto inferiore pregresso", "q": "stemi-anteriore", "n": "Infarto miocardico transmurale anteriore (complessi QS da V1 a V3 con onde q anormali in V4BSX nè preeccitazione) relativamente recente (inversione onda T da V1 a V5, basso voltaggio T in V6, DI, aVL) e infarto inferiore pregresso (complessi QS in aVF e DIII senza sopraslivellamento ST o inversione T).", "f": "Cardiopatia ischemica, slide 152", "w": 1400, "h": 809}, {"id": "cad153", "g": "ischemia", "t": "T alte da V1 a V4: ischemia posteriore vera, iperkaliemia o variante", "q": "stemi-posteriore", "n": "Onde T da V1 a V4 alte in modo anormale: ischemia miocardica posteriore vera, iperpotassiemia o variante normale del processo di ripolarizzazione. In V1 rapporto R/S =1, sosp ischemia posteriore vera (DD IVDX (ma asse non deviato). Valutare quadro clinico e valori ematochimici del paziente.", "f": "Cardiopatia ischemica, slide 153", "w": 1400, "h": 786}, {"id": "lett055", "g": "ipertrofia", "t": "Tracciato anormale: R in aVL 14 mm e T invertite in V5-V6", "q": "ivs", "n": "Tracciato anormale. Inversione onda T in V5-V6. Onda R in aVL è 14mm (voltaggio max normale 13 mm). Angolo tra assi del QRS e dell’onda T è di 135°.", "f": "Lettura ECG, slide 55", "w": 1400, "h": 791}, {"id": "lett056", "g": "ipertrofia", "t": "Tracciato anormale: voltaggi precordiali oltre i limiti", "q": "ivs", "n": "Tracciato anormale. Onda R precordiale più alta è di 40mm (>27mm), l’onda S precordiale più profonda è di 37mm (>30mm). La loro somma supera il cut off normale di 40mm. ST sottoslivellato e onde T invertite da V4 a V6. ST sottoslivellato anche in DI, DII, aVF. Onda P in V1 ha una fase terminale negativa dominante.", "f": "Lettura ECG, slide 56", "w": 1400, "h": 809}, {"id": "htn084", "g": "ipertrofia", "t": "Indice di Sokolow-Lyon", "q": "ivs", "n": "ECG e ipertrofia ventricolare sinistra: Indice di Sokolow-Lyon Sokolow M, et al. Am Heart J, 1949", "f": "Clinica e complicanze dell’ipertensione, slide 84", "w": 1400, "h": 1049}, {"id": "htn085", "g": "ipertrofia", "t": "Cornell voltage: R in aVL + S in V3", "q": "ivs", "n": "Casale PN, et al. Circulation, 1987 Cornell Voltage : R in aVL + S in V3 Cut-off > 28 mm (uomini), > 20 mm (donne) ECG e ipertrofia ventricolare sinistra: Cornell voltage", "f": "Clinica e complicanze dell’ipertensione, slide 85", "w": 1400, "h": 1049}, {"id": "htn086", "g": "ipertrofia", "t": "Strain ventricolare sinistro", "q": "ivs", "n": "ECG e ipertrofia ventricolare sinistra: strain Strain: modifica del tratto ST –T : inversione con lenta discesa, rapida risalita con overshoot finale", "f": "Clinica e complicanze dell’ipertensione, slide 86", "w": 1400, "h": 1049}, {"id": "tvp045", "g": "embolia", "t": "EP: tachicardia sinusale, BBDx, S1Q3", "q": "bbdx", "n": "ECG nel paziente con EP Tachicardia sinusale, BBDx, S1Q3", "f": "TVP ed embolia polmonare, slide 45", "w": 1400, "h": 655}, {"id": "tvp046", "g": "embolia", "t": "EP: BBDx, deviazione assiale destra, S1Q3T3", "q": "bbdx", "n": "ECG nel paziente con EP BBDx; deviazione assiale dx; S1 Q3 T3 ; inversione T in V1-4 e DIII; rotazione oraria", "f": "TVP ed embolia polmonare, slide 46", "w": 1400, "h": 756}, {"id": "tvp047", "g": "embolia", "t": "EP: T invertite in V1-V4 e nelle inferiori", "q": null, "n": "ECG nel paziente con EP Onde T invertite in V1-V4 e derivazioni inferiori", "f": "TVP ed embolia polmonare, slide 47", "w": 1400, "h": 716}, {"id": "tvp048", "g": "embolia", "t": "ECG nell’embolia polmonare", "q": null, "n": "ECG nel paziente con EP", "f": "TVP ed embolia polmonare, slide 48", "w": 1400, "h": 676}, {"id": "tvp049", "g": "embolia", "t": "EP: deviazione assiale destra, R prominenti in V1, T invertite V1-V5", "q": null, "n": "ECG nel paziente con EP Deviazione assiale dx, onde R prominenti in V1, inversione T in V1-V5", "f": "TVP ed embolia polmonare, slide 49", "w": 1400, "h": 652}, {"id": "tvp050", "g": "embolia", "t": "EP: tachicardia sinusale, BBDx, T invertite V1-V3, DIII e aVF", "q": "bbdx", "n": "ECG nel paziente con EP Tachicardia sinusale; BBDx; inversione T in V1-3 + DIII e aVF.", "f": "TVP ed embolia polmonare, slide 50", "w": 1400, "h": 652}, {"id": "tvp051", "g": "embolia", "t": "EP: tachicardia sinusale, deviazione assiale destra, BBDx", "q": "bbdx", "n": "ECG nel paziente con EP Tachicardia sinusale; deviazione assiale dx; BBDx", "f": "TVP ed embolia polmonare, slide 51", "w": 1400, "h": 784}, {"id": "tvp052", "g": "embolia", "t": "EP: BBDx con QRS terminale molto allargato", "q": "bbdx", "n": "BBDx con marcato allargamento QRS terminale; deviazione assiale sx (possibile asse pseudo-sx); diffuse alterazioni ST ECG nel paziente con EP", "f": "TVP ed embolia polmonare, slide 52", "w": 1400, "h": 749}, {"id": "ari059", "g": "casi", "t": "Uomo di 65 anni con TIA e dispnea (1)", "q": null, "n": "Maschio 65aa, 2TDM, vasculopatia obliterante aa inf, ricoverato per TIA. Lamenta dispnea", "f": "Aritmie, slide 59", "w": 1400, "h": 988}, {"id": "ari060", "g": "casi", "t": "Uomo di 65 anni con TIA e dispnea (2)", "q": null, "n": "", "f": "Aritmie, slide 60", "w": 1400, "h": 1052}, {"id": "ari061", "g": "casi", "t": "Uomo di 77 anni, arresto cardiaco: primo tracciato", "q": null, "n": "Maschio 77aa, ex-fumatore, BPCO, iperteso. Accompagnato al bagno dal figlio p.d.c. Messo a letto, inizia BLS. Primo tracciato:", "f": "Aritmie, slide 61", "w": 1400, "h": 866}, {"id": "ari062", "g": "casi", "t": "Arresto cardiaco: ritmo dopo 10 minuti di ACLS", "q": null, "n": "ACLS. Dopo 10 min (3 fl di adrenalina e 1 di atropina) compare questo ritmo ma non polso. Continua ACLS", "f": "Aritmie, slide 62", "w": 1400, "h": 686}, {"id": "ari063", "g": "casi", "t": "Arresto cardiaco: dopo altri 5 minuti, ancora senza polso", "q": null, "n": "Dopo altri 5 minuti ritmo invariato ma ancora non c’è polso", "f": "Aritmie, slide 63", "w": 1400, "h": 709}, {"id": "ari064", "g": "casi", "t": "Arresto cardiaco: ripresa del polso e poi PEA", "q": null, "n": "Dopo 30 minuti totali compare polso (PA=85/50) Viene intubato ma dopo 5 minuti va in PEA e quindi di nuovo in arresto. Dopo 50 minuti si sospendono le manovre rianimatorie.", "f": "Aritmie, slide 64", "w": 1400, "h": 679}, {"id": "ari065", "g": "casi", "t": "Uomo di 55 anni con infarto antero-laterale esteso", "q": "stemi-anteriore", "n": "DEF Maschio, 55aa, colest 272, ex-fumatore, iperteso (media recente 150/95). Trovato a terra dalla moglie. ECG del 118 compatibile con IMA ant-lat esteso (V2-V6,I,aVL). All’arrivo in PS comparsa di questo ritmo:", "f": "Aritmie, slide 65", "w": 1400, "h": 779}, {"id": "ari066", "g": "casi", "t": "Donna di 43 anni con toracoalgia e dispnea", "q": null, "n": "Donna 43 aa, in attesa di ricovero per isterectomia (sospetto K utero). Viene in PS per toracoalgia e dispnea. Recente emocromo nn", "f": "Aritmie, slide 66", "w": 1400, "h": 758}, {"id": "ari067", "g": "casi", "t": "Donna di 67 anni con cardiopalmo e dolore retrosternale", "q": null, "n": "Donna di 67 aa. Chiama il med. di guardia per cardiopalmo e dolore retrosternale tipico", "f": "Aritmie, slide 67", "w": 1400, "h": 590}, {"id": "ari068", "g": "casi", "t": "La stessa paziente dopo massaggio del seno carotideo", "q": null, "n": "Pronta regressione del dolore con la ripresa del ritmo, curva enzimatica negativa Massaggio SC", "f": "Aritmie, slide 68", "w": 1400, "h": 469}, {"id": "ari069", "g": "casi", "t": "Tracciati a confronto", "q": null, "n": "", "f": "Aritmie, slide 69", "w": 1400, "h": 852}, {"id": "ari070", "g": "casi", "t": "Tracciati a confronto", "q": null, "n": "", "f": "Aritmie, slide 70", "w": 1400, "h": 851}, {"id": "ari156", "g": "casi", "t": "Crisi ipertensiva con ipokaliemia e perdita di coscienza", "q": "ipok", "n": "Pz con crisi ipertensiva (PA=250/140 al domicilio). Breve perdita di conoscenza durante il trasporto in PS. Agli ematochimici: ipopotassiemia, aumento di CKMB e TnT", "f": "Aritmie, slide 156", "w": 1400, "h": 670}, {"id": "ari157", "g": "casi", "t": "Iperaldosteronismo primitivo: pausa di 4 secondi", "q": null, "n": "Diagnosi: iperaldosteronismo primitivo da microadenoma surrene dx (8mm) Episodio sincopale con pausa documentata di 4 sec: posizionato PM", "f": "Aritmie, slide 157", "w": 1400, "h": 701}, {"id": "ari158", "g": "casi", "t": "Donna di 67 anni, obesa e diabetica, con dolore e sincope", "q": null, "n": "Femmina 67 aa BMI 38, 2TDM. Dolore retrosternale seguito da p.d.c. di breve durata", "f": "Aritmie, slide 158", "w": 1400, "h": 772}, {"id": "ari159", "g": "casi", "t": "Uomo di 80 anni con lipotimia e dolore retrosternale tipico", "q": null, "n": "Pz di 80 aa viene portato in PS per lipotimia durante la cena. All’arrivo lamenta dolore retrosternale tipico", "f": "Aritmie, slide 159", "w": 1400, "h": 714}, {"id": "cad107", "g": "casi", "t": "Uomo di 46 anni con dolore notturno irradiato alla mandibola", "q": null, "n": "Maschio 46aa, fumatore, viene in PS durante la notte per dolore retrosternale accessionale di breve durata irradiato alla mandibola. Dopo reiterati tentativi ammette di avere fatto uso di cocaina", "f": "Cardiopatia ischemica, slide 107", "w": 1400, "h": 708}, {"id": "cad108", "g": "casi", "t": "Donna di 28 anni con ipercolesterolemia familiare e dolore epigastrico", "q": null, "n": "Giovane donna, 28 anni, ipercolesterolemia familiare (colest tot 682), viene in PS per dolore addominale epigastrico e nausea", "f": "Cardiopatia ischemica, slide 108", "w": 1400, "h": 706}, {"id": "cad110", "g": "casi", "t": "Uomo di 76 anni con dolore ai polsi e al collo", "q": null, "n": "Maschio 76aa iperteso, colesterolo 280, PA recente 155/80, viene in PS per dolore ai polsi bilat. e al collo.", "f": "Cardiopatia ischemica, slide 110", "w": 1400, "h": 745}];

/* ===== Quadri aggiunti: nodo del seno, conduzione atriale, fascicoli, stimolazione ===== */

const pIAB = (amp) => [B(dirAG(60, 15), 0.115 * (amp || 1), 32, 17, 17), B(dirAG(-95, 5), 0.10 * (amp || 1), 82, 18, 18)];
const qrsBIF = () => ({ w: 144, c: [B(dirAG(120, 35), 0.28, 14, 8, 8), B(dirAG(-58, -8), 1.02, 46, 12, 13), B(dirAG(178, 38), 0.64, 108, 18, 20)] });
const RAT = (def) => ({ k: 'ratio', label: 'Rapporto di blocco', type: 'select', def: def || '4', opts: [['3', '3:2'], ['4', '4:3'], ['5', '5:4'], ['6', '6:5']] });

/* ---------- NODO DEL SENO E SCAPPAMENTI ---------- */
add({
  id: 'bsa1', cat: 'Nodo del seno e scappamenti', name: 'Blocco seno-atriale di I grado',
  params: [F.hr(68, 45, 95)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 410, sa: 0.02 }),
  look: ['II'],
  card: {
    def: 'Rallentamento della conduzione fra il nodo del seno e il miocardio atriale, senza perdita di impulsi.',
    criteri: ['Sull\u2019ECG di superficie il tracciato è indistinguibile da un ritmo sinusale normale', 'Ogni impulso del seno raggiunge comunque l\u2019atrio: nessuna P manca', 'La diagnosi richiede la registrazione diretta del potenziale del nodo del seno o lo studio elettrofisiologico'],
    meccanismo: 'L\u2019attività del nodo del seno non genera deflessioni visibili in superficie: si vede solo la P, cioè il risultato dell\u2019attivazione atriale. Se l\u2019impulso è solo ritardato in uscita ma arriva sempre, l\u2019intervallo PP resta costante e nulla cambia sul tracciato.',
    vettori: 'Nessuna modifica dei vettori: P, QRS e T restano normali.',
    guarda: 'Non c\u2019è nulla da vedere: serve saperlo per non cercarlo.',
    dd: ['Ritmo sinusale normale', 'Blocco seno-atriale di II grado, dove invece una P manca'],
    trappole: 'È l\u2019unico grado di blocco seno-atriale che non si può diagnosticare con l\u2019ECG. Chi lo "riconosce" sul tracciato sta guardando altro.',
    fonte: SRC.brady + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'bsa2t1', cat: 'Nodo del seno e scappamenti', name: 'Blocco seno-atriale di II grado tipo 1', quiz: true,
  params: [F.hr(70, 45, 100), RAT('4')],
  build: p => ({ rate: p.hr, pr: 160, qtc: 410, jit: 4, saBlock: { type: 'wenck', ratio: +p.ratio } }),
  look: ['II'],
  card: {
    def: 'Wenckebach del nodo del seno: il tempo di uscita dell\u2019impulso si allunga progressivamente finché un impulso non esce affatto e manca un intero complesso PQRST.',
    criteri: ['Accorciamento progressivo degli intervalli PP prima della pausa', 'La pausa è più breve del doppio del PP che la precede', 'Il PP che segue la pausa è il più lungo del gruppo', 'Manca tutto il complesso: P, QRS e T insieme', 'Il rapporto si esprime come 4:3, 3:2 e così via'],
    meccanismo: 'Il tempo di conduzione seno-atriale cresce ad ogni ciclo, ma con incrementi sempre minori: siccome quello che si misura sul tracciato è l\u2019intervallo fra due P e non il tempo di uscita, il PP visibile si accorcia. Quando l\u2019impulso resta bloccato, la pausa contiene un ciclo mancato meno la somma dei ritardi accumulati, e per questo resta più corta di due PP.',
    vettori: 'I battiti presenti sono del tutto normali: cambia solo il momento in cui arrivano.',
    guarda: 'DII lungo: misura tre o quattro PP consecutivi prima della pausa e confronta la pausa con il doppio del PP che la precede.',
    dd: ['Blocco seno-atriale di II grado tipo 2, dove i PP sono costanti e la pausa è un multiplo esatto', 'Aritmia sinusale respiratoria, dove la variazione è graduale e legata al respiro', 'Extrasistole atriale bloccata, dove una P prematura si nasconde nella T che precede la pausa'],
    trappole: 'La differenza con il Mobitz 1 atrio-ventricolare è netta: là manca solo il QRS e la P resta visibile, qui manca tutto il complesso.',
    fonte: SRC.brady + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Il blocco seno-atriale è una pausa in cui manca l\u2019intero complesso P-QRS-T', 'Nel tipo 1 gli intervalli PP si accorciano progressivamente prima della pausa', 'La pausa è inferiore al doppio del ciclo di base'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, nodo del seno'
  }
});

add({
  id: 'bsa2t2', cat: 'Nodo del seno e scappamenti', name: 'Blocco seno-atriale di II grado tipo 2', quiz: true,
  params: [F.hr(68, 45, 100), RAT('4')],
  build: p => ({ rate: p.hr, pr: 160, qtc: 410, jit: 4, saBlock: { type: 'mobitz2', ratio: +p.ratio } }),
  look: ['II'],
  card: {
    def: 'Un impulso del nodo del seno non riesce a uscire verso l\u2019atrio: manca un intero complesso PQRST e la pausa vale esattamente due cicli.',
    criteri: ['Intervalli PP costanti prima e dopo la pausa', 'La pausa è un multiplo esatto del PP di base, di solito il doppio', 'Manca l\u2019intero complesso, non solo il QRS', 'Se il blocco è 2:1 la frequenza si dimezza di colpo e sembra una bradicardia sinusale'],
    meccanismo: 'Il nodo del seno continua a scaricare regolarmente, ma un impulso su n resta bloccato nella giunzione seno-atriale. Poiché il ritmo del pacemaker non si modifica, il battito successivo arriva esattamente quando previsto: la pausa è il doppio del ciclo.',
    vettori: 'Battiti normali separati da una pausa silenziosa.',
    guarda: 'DII lungo con il compasso: apri il compasso sul PP di base e vedi se la pausa ne contiene esattamente due.',
    dd: ['Arresto sinusale, dove la pausa non è un multiplo del PP', 'Blocco seno-atriale tipo 1, dove i PP si accorciano prima della pausa', 'Extrasistole atriale bloccata'],
    trappole: 'Il blocco seno-atriale 2:1 non si distingue da una bradicardia sinusale su un tracciato singolo: si smaschera se la frequenza raddoppia improvvisamente con lo sforzo o con l\u2019atropina.',
    fonte: SRC.brady + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Pausa che è un multiplo esatto dell\u2019intervallo PP di base', 'Manca tutto il complesso, non solo il QRS come nei blocchi AV', 'Il ritmo di base resta regolare prima e dopo la pausa'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, nodo del seno'
  }
});

add({
  id: 'bsa3', cat: 'Nodo del seno e scappamenti', name: 'Blocco seno-atriale di III grado',
  params: [F.hr(44, 30, 60)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 420, pAmp: 0, jit: 6 }),
  look: ['II', 'V1'],
  card: {
    def: 'Nessun impulso del nodo del seno raggiunge l\u2019atrio: le P sinusali scompaiono e il ritmo è sostenuto da un centro sottostante.',
    criteri: ['Assenza completa di onde P sinusali', 'Ritmo di scappamento regolare: giunzionale con QRS stretto a 40–60/min, ventricolare con QRS largo a 20–40/min', 'Sul tracciato di superficie è indistinguibile dall\u2019arresto sinusale prolungato'],
    meccanismo: 'Il tessuto perinodale non lascia passare alcun impulso. Il nodo del seno può continuare a scaricare, ma in superficie non si vede nulla: compare il ritmo del primo centro sussidiario che si libera dall\u2019inibizione, di solito la giunzione atrio-ventricolare.',
    vettori: 'Se lo scappamento è giunzionale i vettori ventricolari sono normali; se è ventricolare il QRS è largo e la T discordante.',
    guarda: 'DII e V1 per cercare qualunque attività atriale prima del QRS.',
    dd: ['Arresto sinusale completo', 'Fibrillazione atriale a maglie fini con risposta regolare', 'Ritmo giunzionale con P retrograda nascosta nel QRS'],
    trappole: 'Assenza di P non significa blocco atrio-ventricolare: nel BAV di III grado le P ci sono e marciano indipendenti dal QRS.',
    fonte: SRC.brady + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'arrestosinusale', cat: 'Nodo del seno e scappamenti', name: 'Arresto sinusale con scappamento', quiz: true,
  params: [F.hr(62, 40, 90), { k: 'pausa', label: 'Durata della pausa', unit: 'ms', min: 1600, max: 4500, step: 100, def: 2800 }, { k: 'esc', label: 'Scappamento', type: 'select', def: 'j', opts: [['j', 'Giunzionale'], ['v', 'Ventricolare'], ['no', 'Nessuno']] }],
  build: p => ({ rate: p.hr, pr: 160, qtc: 415, pause: { after: 4, ms: p.pausa, escape: p.esc === 'no' ? null : p.esc } }),
  look: ['II'],
  card: {
    def: 'Il nodo del seno smette temporaneamente di scaricare: compare una pausa senza alcuna attività atriale, che può essere chiusa da un battito di scappamento.',
    criteri: ['Pausa senza onde P', 'La durata della pausa non è un multiplo esatto del PP di base: è questo che la distingue dal blocco seno-atriale', 'Pausa oltre 3 secondi da sveglio: significativa e sintomatica nella maggior parte dei casi', 'Il battito che chiude la pausa è di scappamento: giunzionale a QRS stretto o ventricolare a QRS largo'],
    meccanismo: 'Cessa l\u2019automatismo delle cellule del nodo. Dopo un tempo variabile un centro sussidiario, liberato dalla soppressione da overdrive, scarica al proprio ritmo intrinseco: giunzione 40–60/min, rete di Purkinje 20–40/min. Se nessun centro interviene, la pausa diventa asistolia.',
    vettori: 'Nello scappamento giunzionale i vettori ventricolari restano normali; in quello ventricolare il QRS nasce fuori dal sistema di conduzione ed è largo, con ripolarizzazione opposta.',
    guarda: 'DII lungo, compasso alla mano: misura la pausa e confrontala con il PP di base.',
    dd: ['Blocco seno-atriale di II grado tipo 2 (pausa multipla esatta)', 'Extrasistole atriale bloccata (cerca la P prematura dentro la T)', 'Fibrillazione atriale con pausa lunga'],
    trappole: 'La pausa di per sé non dà l\u2019indicazione al pacemaker: contano i sintomi e la correlazione tra sintomo e pausa. Cerca sempre le cause reversibili, farmaci bradicardizzanti in testa.',
    fonte: SRC.brady + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Arresto sinusale: pausa con assenza completa di attività atriale', 'La pausa non è multiplo del ciclo di base, a differenza del blocco seno-atriale', 'Il battito di scappamento nasce dal centro sottostante più rapido'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, nodo del seno'
  }
});

add({
  id: 'braditachi', cat: 'Nodo del seno e scappamenti', name: 'Malattia del nodo del seno: pausa post-tachicardica',
  params: [{ k: 'hr', label: 'Frequenza della tachiaritmia', unit: '/min', min: 90, max: 160, step: 1, def: 115 }, { k: 'pausa', label: 'Pausa alla cessazione', unit: 'ms', min: 1800, max: 5000, step: 100, def: 3400 }],
  build: p => ({ rate: p.hr, pr: 150, qtc: 400, jit: 18, pause: { after: 6, ms: p.pausa, escape: 'j' } }),
  look: ['II'],
  card: {
    def: 'Sindrome bradicardia-tachicardia: episodi di tachiaritmia atriale che, cessando, lasciano una pausa lunga perché il nodo del seno è malato e non riprende subito.',
    criteri: ['Alternanza di tachiaritmia atriale (di solito fibrillazione o flutter) e di bradicardia o pause', 'Pausa alla cessazione della tachiaritmia, spesso oltre 3 secondi, con sincope o presincope', 'Tempo di recupero del nodo del seno allungato', 'Fra un episodio e l\u2019altro il ritmo di base è spesso una bradicardia sinusale inappropriata'],
    meccanismo: 'La tachiaritmia sopprime l\u2019automatismo del nodo del seno per overdrive. In un nodo sano la ripresa è immediata; in un nodo malato il recupero è lento e ne risulta una pausa, talvolta chiusa da uno scappamento giunzionale.',
    vettori: 'Nessuna alterazione dei vettori: il problema è di automatismo e di ripresa.',
    guarda: 'Il momento della cessazione della tachiaritmia, su Holter o telemetria: è lì che si vede la pausa.',
    dd: ['Pausa da farmaci bradicardizzanti', 'Blocco atrio-ventricolare parossistico', 'Ipertono vagale del giovane e dell\u2019atleta'],
    trappole: 'È la situazione classica in cui il farmaco che serve per la tachicardia peggiora la bradicardia: spesso serve il pacemaker proprio per poter trattare la tachiaritmia.',
    fonte: SRC.brady + '; ' + SRC.pacing + '; ' + SRC.af,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Sindrome bradi-tachi: alternanza fra tachiaritmie atriali e bradicardia o pause', 'La pausa compare alla cessazione della tachiaritmia'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, nodo del seno'
  }
});

add({
  id: 'interatriale', cat: 'Nodo del seno e scappamenti', name: 'Blocco interatriale avanzato', quiz: true,
  params: [F.hr(70, 50, 100)],
  build: p => ({ rate: p.hr, pr: 180, qtc: 415, pComps: pIAB(1) }),
  look: ['II', 'III', 'aVF'],
  card: {
    def: 'Ritardo o blocco della conduzione fra atrio destro e atrio sinistro nel fascio di Bachmann: l\u2019atrio sinistro si attiva tardi e, nella forma avanzata, dal basso verso l\u2019alto.',
    criteri: ['P di durata ≥ 120 ms', 'Nella forma parziale la P è larga e bifida, con le due gobbe distanti più di 40 ms', 'Nella forma avanzata la P è bifasica, positiva e poi negativa, in DII, DIII e aVF', 'Spesso si accompagna a ingrandimento atriale sinistro, ma è cosa diversa: qui il problema è di conduzione, non di dimensione'],
    meccanismo: 'Normalmente l\u2019impulso passa all\u2019atrio sinistro attraverso il fascio di Bachmann, in alto, e l\u2019attivazione procede dall\u2019alto in basso: P positiva nelle derivazioni inferiori. Se il fascio è bloccato, l\u2019atrio sinistro viene raggiunto attraverso la regione del seno coronarico e si attiva dal basso verso l\u2019alto: la seconda metà della P diventa negativa nelle inferiori.',
    vettori: 'Il vettore della prima parte della P resta in basso a sinistra (atrio destro); il vettore terminale si inverte verso l\u2019alto, dando la componente negativa in DII, DIII e aVF.',
    guarda: 'DII, DIII e aVF: misura la durata della P e guarda se la parte finale scende sotto la linea.',
    dd: ['Ingrandimento atriale sinistro (P mitralica) senza componente negativa inferiore', 'Ritmo atriale ectopico basso, dove la P è negativa per intero', 'Artefatto da posizione degli elettrodi'],
    trappole: 'La forma avanzata è associata al rischio di fibrillazione atriale e di ictus: è la sindrome di Bayés. Una P larga e bifasica nelle inferiori merita una segnalazione nel referto, non un\u2019alzata di spalle.',
    fonte: 'Bayés de Luna A. et al., consenso sul blocco interatriale, 2012; ' + SRC.aha3,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Il fascio di Bachmann porta l\u2019impulso all\u2019atrio sinistro', 'P larga oltre 120 ms quando la conduzione interatriale è rallentata'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Lettura ECG, onda P'
  }
});

add({
  id: 'ritmogiunzionale', cat: 'Nodo del seno e scappamenti', name: 'Ritmo giunzionale di scappamento', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 35, max: 70, step: 1, def: 46 }],
  build: p => ({ mode: 'svt', vRate: p.hr, qtc: 420 }),
  look: ['II', 'aVR'],
  card: {
    def: 'Ritmo sostenuto dalla giunzione atrio-ventricolare quando il nodo del seno rallenta o si arresta, o quando la conduzione verso i ventricoli è interrotta a monte.',
    criteri: ['QRS stretto, identico a quello sinusale', 'Frequenza 40–60/min: sopra i 60 si parla di ritmo giunzionale accelerato, sopra i 100 di tachicardia giunzionale', 'P assente, oppure retrograda: negativa in DII, DIII e aVF e positiva in aVR', 'La P retrograda può precedere il QRS con PR corto, esservi nascosta dentro o seguirlo'],
    meccanismo: 'Le cellule della giunzione hanno un automatismo proprio a 40–60/min, normalmente soppresso dal nodo del seno che è più veloce. Quando il seno rallenta, la giunzione si libera e prende il comando. L\u2019attivazione atriale, se avviene, procede all\u2019indietro: da qui la P negativa nelle inferiori.',
    vettori: 'I vettori ventricolari sono normali perché la via His-Purkinje è usata regolarmente. Il vettore della P retrograda punta in alto e a destra, opposto a quello sinusale.',
    guarda: 'DII e aVR per la P retrograda; confronta la morfologia del QRS con un tracciato sinusale precedente.',
    dd: ['Ritmo atriale ectopico basso, con PR normale o lungo', 'Blocco seno-atriale di III grado', 'Ritmo idioventricolare, dove il QRS è largo'],
    trappole: 'Uno scappamento giunzionale non è un\u2019aritmia da sopprimere: è un meccanismo di sicurezza. Il problema da trattare è ciò che lo ha reso necessario.',
    fonte: SRC.brady + '; ' + SRC.svt,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Scappamento giunzionale a 40–60/min con QRS stretto', 'P assente o retrograda, negativa nelle derivazioni inferiori'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, ritmi di scappamento'
  }
});

add({
  id: 'idioventricolare', cat: 'Nodo del seno e scappamenti', name: 'Ritmo idioventricolare di scappamento', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 15, max: 45, step: 1, def: 30 }],
  build: p => ({ mode: 'vt', vRate: p.hr, aRate: 0.5, vtQrs: M.qrsEscapeV(), vtT: { a: 150, g: 30, amp: 0.4 }, qtc: 460 }),
  look: ['II', 'V1'],
  card: {
    def: 'Ultima linea di difesa: quando né il nodo del seno né la giunzione funzionano, il ritmo nasce dalla rete di Purkinje o dal miocardio ventricolare.',
    criteri: ['QRS largo ≥ 120 ms, morfologia bizzarra', 'Frequenza 20–40/min, spesso ancora più bassa', 'Nessun rapporto con l\u2019attività atriale, quando questa è presente', 'T opposta alla parte principale del QRS'],
    meccanismo: 'L\u2019automatismo delle cellule di Purkinje è il più lento della gerarchia. L\u2019impulso nasce lontano dal sistema di conduzione rapido e si diffonde lentamente attraverso il miocardio comune: da qui il QRS largo e deformato.',
    vettori: 'Un unico vettore lento, orientato secondo il punto di origine: se nasce dal ventricolo sinistro il QRS ha morfologia tipo blocco di branca destra, se nasce dal destro tipo blocco di branca sinistra.',
    guarda: 'DII e V1 per la larghezza del QRS e per cercare attività atriale indipendente.',
    dd: ['Ritmo idioventricolare accelerato (60–110/min)', 'Tachicardia ventricolare lenta', 'BAV di III grado con scappamento ventricolare, dove le P sono presenti e regolari', 'Ritmo da pacemaker, dove c\u2019è lo spike'],
    trappole: 'Frequenza così bassa significa portata cardiaca insufficiente: è una situazione da trattare subito, non da osservare. E attenzione al contesto dell\u2019attività elettrica senza polso.',
    fonte: SRC.brady + '; ' + SRC.va,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Scappamento ventricolare a 20–40/min con QRS largo', 'È il centro più lento della gerarchia dell\u2019automatismo'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, ritmi di scappamento'
  }
});

/* ---------- BLOCCHI AV ---------- */
add({
  id: 'bavavanzato', cat: 'Blocchi AV', name: 'BAV di II grado avanzato', quiz: true,
  params: [F.hr(80, 60, 120), { k: 'ratio', label: 'Rapporto di conduzione', type: 'select', def: '3', opts: [['3', '3:1'], ['4', '4:1'], ['5', '5:1']] }],
  build: p => ({ rate: p.hr, pr: 180, av: 'adv', ratio: +p.ratio, qtc: 420 }),
  look: ['II', 'V1'],
  card: {
    def: 'Blocco di secondo grado in cui due o più P consecutive restano bloccate, ma la conduzione atrio-ventricolare non è del tutto assente.',
    criteri: ['Due o più P consecutive bloccate, con rapporto 3:1, 4:1 o superiore', 'Almeno alcune P conducono: questo lo distingue dal blocco completo', 'Il PR dei battiti condotti è costante', 'Frequenza ventricolare bassa, spesso sintomatica'],
    meccanismo: 'La sede è quasi sempre infranodale, hisiana o infrahisiana. La conduzione è "tutto o nulla" come nel Mobitz 2, ma il rapporto di blocco è più sfavorevole.',
    vettori: 'I battiti condotti hanno vettori normali, a meno che non coesista un blocco di branca, cosa frequente quando la sede è distale.',
    guarda: 'DII lungo: conta le P fra un QRS e il successivo e verifica che il PR dei condotti sia sempre uguale.',
    dd: ['BAV di III grado, dove nessuna P conduce e c\u2019è dissociazione completa', 'BAV 2:1', 'Blocco atrio-ventricolare funzionale da P molto precoci in tachicardia atriale'],
    trappole: 'Per dire "avanzato" devi dimostrare che almeno una P conduce con PR costante: se ogni QRS è uno scappamento indipendente, il blocco è completo.',
    fonte: SRC.brady + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'dissociazioneav', cat: 'Blocchi AV', name: 'Dissociazione atrio-ventricolare isoritmica',
  params: [{ k: 'hr', label: 'Frequenza sinusale', unit: '/min', min: 50, max: 90, step: 1, def: 66 }, { k: 'j', label: 'Frequenza giunzionale', unit: '/min', min: 50, max: 95, step: 1, def: 70 }],
  build: p => ({ rate: p.hr, av: 'dissoc', escRate: p.j, escape: 'giunzionale', qtc: 415 }),
  look: ['II'],
  card: {
    def: 'Atri e ventricoli battono ciascuno per conto proprio a frequenze quasi uguali, perché un centro sottostante è diventato più veloce del nodo del seno, non perché la conduzione sia bloccata.',
    criteri: ['P e QRS indipendenti, con frequenze molto vicine fra loro', 'QRS stretto se l\u2019origine è giunzionale', 'La P scivola avanti e indietro rispetto al QRS, entrandovi e uscendone', 'Possibili battiti di cattura: quando la P cade al momento giusto conduce e anticipa il QRS'],
    meccanismo: 'Due pacemaker competono. Se il seno rallenta (ipertono vagale, farmaci) o la giunzione accelera (ischemia, digitale, febbre), il centro inferiore prende il sopravvento per semplice differenza di frequenza. La conduzione atrio-ventricolare è intatta, ma trova sempre i ventricoli già depolarizzati.',
    vettori: 'Vettori normali quando l\u2019origine è giunzionale.',
    guarda: 'DII lungo: segui la P e guarda come cambia posizione rispetto al QRS di battito in battito.',
    dd: ['BAV di III grado: là la frequenza atriale è più alta di quella ventricolare e la dissociazione è obbligata', 'Ritmo giunzionale accelerato con conduzione retrograda'],
    trappole: 'Dissociazione atrio-ventricolare non è sinonimo di blocco completo: qui il blocco non c\u2019è, c\u2019è una gara di frequenze. Chiamarlo BAV di III grado è l\u2019errore classico.',
    fonte: SRC.brady + '; ' + SRC.svt,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- CONDUZIONE INTRAVENTRICOLARE ---------- */
add({
  id: 'bbdxinc', cat: 'Conduzione intraventricolare', name: 'Blocco di branca destra incompleto',
  params: [F.hr(72, 50, 110)],
  build: p => ({ rate: p.hr, pr: 160, qtc: 420, qrs: M.qrsRBBB(), qrsScale: 0.82, T: { a: 40, g: -10, amp: 0.3 } }),
  look: ['V1', 'V2', 'I'],
  card: {
    def: 'Stesso disegno del blocco di branca destra, ma con QRS non ancora allargato oltre la soglia.',
    criteri: ['QRS fra 110 e 119 ms nell\u2019adulto', 'rSr′, rsR′ o rSR′ in V1 o V2', 'S larga in DI e V6', 'Le altre caratteristiche sono quelle del blocco completo'],
    meccanismo: 'Il ritardo della branca destra esiste ma è modesto: l\u2019attivazione del ventricolo destro è solo posticipata, non affidata interamente al miocardio comune.',
    vettori: 'Vettore terminale diretto a destra e in avanti, come nel blocco completo, ma di durata minore.',
    guarda: 'V1 e V2 per la r′, DI e V6 per la S.',
    dd: ['Variante normale del giovane, in cui una piccola r′ in V1 non ha significato patologico', 'Pattern di Brugada', 'Ipertrofia ventricolare destra', 'Pectus excavatum e altre alterazioni della parete'],
    trappole: 'Le soglie non coincidono fra le fonti: diversi manuali chiamano incompleto un blocco con QRS fra 100 e 120 ms, l\u2019AHA usa 110–119 ms. La sostanza non cambia, ma se all\u2019esame citi una soglia, di\u2019 anche a quale fonte ti stai appoggiando.',
    fonte: SRC.aha3,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'bbsxinc', cat: 'Conduzione intraventricolare', name: 'Blocco di branca sinistra incompleto',
  params: [F.hr(72, 50, 110)],
  build: p => ({ rate: p.hr, pr: 165, qtc: 425, qrs: M.qrsLBBB(), qrsScale: 0.76, T: { a: -150, g: 25, amp: 0.26 } }),
  look: ['V6', 'I', 'V1'],
  card: {
    def: 'Ritardo parziale della branca sinistra: il disegno è quello del blocco sinistro, ma il QRS non raggiunge i 120 ms.',
    criteri: ['QRS fra 110 e 119 ms nell\u2019adulto', 'Assenza della q settale in DI, V5 e V6', 'R con salita lenta o impastata, R peak time in V5–V6 superiore a 60 ms', 'Quadro spesso associato a ipertrofia ventricolare sinistra'],
    meccanismo: 'L\u2019attivazione settale da sinistra a destra è persa o ridotta, quindi sparisce la q settale, ma il ventricolo sinistro riceve ancora in parte l\u2019impulso attraverso la branca.',
    vettori: 'Il vettore settale iniziale, normalmente diretto a destra, si inverte verso sinistra: è la ragione per cui la q scompare.',
    guarda: 'DI, V5 e V6: la scomparsa della q settale è il segno più precoce.',
    dd: ['Ipertrofia ventricolare sinistra isolata', 'Ritardo aspecifico della conduzione intraventricolare', 'Preeccitazione'],
    trappole: 'Anche il blocco sinistro incompleto ostacola la lettura della ripolarizzazione: le alterazioni di ST e T vanno giudicate con prudenza.',
    fonte: SRC.aha3,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'bifascicolare', cat: 'Conduzione intraventricolare', name: 'Blocco bifascicolare', quiz: true,
  params: [F.hr(70, 45, 110)],
  build: p => ({ rate: p.hr, pr: 170, qtc: 430, qrs: qrsBIF(), T: { a: 35, g: -30, amp: 0.28 }, via: 'rbbb' }),
  look: ['V1', 'I', 'III', 'aVF'],
  card: {
    def: 'Blocco di branca destra associato a blocco di uno dei due fascicoli della branca sinistra: restano attive solo una via su tre.',
    criteri: ['Forma comune: BBDx con emiblocco anteriore sinistro, cioè rSR′ in V1 con asse fra −45° e −90°', 'Forma meno comune: BBDx con emiblocco posteriore sinistro, cioè rSR′ in V1 con asse oltre +90° e senza altre cause di deviazione destra', 'QRS ≥ 120 ms', 'Il blocco di branca sinistra completo è di per sé un blocco bifascicolare'],
    meccanismo: 'La conduzione raggiunge i ventricoli attraverso l\u2019unico fascicolo rimasto: tutto il miocardio viene attivato da quel punto, con un percorso lungo e lento. Se cede anche quello, il risultato è il blocco completo.',
    vettori: 'Il vettore iniziale e quello principale sono spostati secondo il fascicolo bloccato (in alto a sinistra nell\u2019emiblocco anteriore); il vettore terminale è quello del blocco destro, verso destra e in avanti.',
    guarda: 'V1 per la R′, DI, DIII e aVF per l\u2019asse.',
    dd: ['BBDx isolato con deviazione assiale da altra causa', 'Infarto inferiore che simula l\u2019emiblocco posteriore', 'Cuore verticale del longilineo'],
    trappole: 'In un paziente con sincope, il blocco bifascicolare cambia il ragionamento: la sincope potrebbe essere dovuta a un blocco completo intermittente.',
    fonte: SRC.aha3 + '; ' + SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Blocco di branca destra con asse marcatamente deviato: pensa al blocco bifascicolare', 'BBDx più emiblocco anteriore sinistro è la combinazione più frequente'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, blocchi di branca'
  }
});

add({
  id: 'trifascicolare', cat: 'Conduzione intraventricolare', name: 'Blocco bifascicolare con PR lungo',
  params: [F.hr(66, 45, 100), F.pr(260, 210, 380)],
  build: p => ({ rate: p.hr, pr: p.pr, av: 'I', qtc: 435, qrs: qrsBIF(), T: { a: 35, g: -30, amp: 0.28 }, via: 'rbbb' }),
  look: ['II', 'V1', 'I'],
  card: {
    def: 'Blocco bifascicolare associato a PR prolungato. Storicamente chiamato blocco trifascicolare, termine oggi sconsigliato.',
    criteri: ['BBDx con emiblocco anteriore o posteriore sinistro', 'PR > 200 ms', 'La dizione corretta è "blocco bifascicolare con BAV di I grado"'],
    meccanismo: 'Il PR lungo non dimostra che il terzo fascicolo sia malato: il ritardo può essere nel nodo atrio-ventricolare, che è una sede del tutto diversa e con prognosi diversa. Solo lo studio elettrofisiologico, misurando l\u2019intervallo HV, dice dove sta davvero il ritardo.',
    vettori: 'Come nel blocco bifascicolare.',
    guarda: 'DII per il PR, V1 e l\u2019asse per i due fascicoli.',
    dd: ['Blocco bifascicolare con ritardo nodale da farmaci o da tono vagale', 'Blocco alternante di branca, che invece è un\u2019indicazione forte al pacemaker'],
    trappole: 'Le linee guida sconsigliano il termine "trifascicolare" proprio perché suggerisce una certezza che l\u2019ECG non può dare.',
    fonte: SRC.aha3 + '; ' + SRC.pacing + '; ' + SRC.brady,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'ivcd', cat: 'Conduzione intraventricolare', name: 'Ritardo aspecifico della conduzione intraventricolare',
  params: [F.hr(72, 45, 110), { k: 'w', label: 'Larghezza del QRS', unit: '×', min: 1.2, max: 1.7, step: 0.05, def: 1.35 }],
  build: p => ({ rate: p.hr, pr: 165, qtc: 430, qrs: M.qrsNormal(), qrsScale: p.w, T: { a: -140, g: 20, amp: 0.24 } }),
  look: ['V1', 'V6', 'I'],
  card: {
    def: 'QRS allargato che non ha né la morfologia del blocco destro né quella del blocco sinistro.',
    criteri: ['QRS > 110 ms', 'Assenza dei criteri morfologici del blocco di branca destra o sinistra', 'Complessi spesso impastati e di morfologia variabile fra le derivazioni'],
    meccanismo: 'Il rallentamento è diffuso nel miocardio ventricolare, non confinato a una branca: fibrosi, cardiomiopatia, iperkaliemia, farmaci che bloccano i canali del sodio, ischemia acuta grave.',
    vettori: 'Nessun vettore terminale caratteristico: tutta la sequenza è rallentata.',
    guarda: 'Confronta V1 e V6: se nessuna delle due mostra il disegno tipico di un blocco di branca, il ritardo è aspecifico.',
    dd: ['Blocco di branca atipico', 'Iperkaliemia, dove il QRS si allarga e le T sono appuntite', 'Intossicazione da antidepressivi triciclici o da antiaritmici di classe I', 'Ritmo ventricolare o stimolato'],
    trappole: 'Un QRS che si allarga rispetto a un tracciato precedente è un segnale da prendere sul serio: cerca la causa metabolica o tossica prima di considerarlo cronico.',
    fonte: SRC.aha3,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- VENTRICOLARI ---------- */
add({
  id: 'riva', cat: 'Ventricolari', name: 'Ritmo idioventricolare accelerato', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza ventricolare', unit: '/min', min: 55, max: 115, step: 1, def: 82 }, { k: 'ar', label: 'Frequenza sinusale', unit: '/min', min: 50, max: 100, step: 1, def: 74 }],
  build: p => ({ mode: 'vt', vRate: p.hr, aRate: p.ar, vtQrs: M.qrsEscapeV(), vtT: { a: 150, g: 30, amp: 0.4 }, qtc: 440 }),
  look: ['II', 'V1'],
  card: {
    def: 'Ritmo ventricolare a frequenza compresa fra 60 e 110/min: più veloce dello scappamento, più lento della tachicardia ventricolare.',
    criteri: ['QRS largo, tre o più battiti consecutivi', 'Frequenza fra 60 e 110/min', 'Inizio e fine graduali, spesso con battiti di fusione e di cattura all\u2019inizio e alla fine', 'Dissociazione atrio-ventricolare con frequenza atriale simile'],
    meccanismo: 'Aumento dell\u2019automatismo di un focus ventricolare che supera la frequenza del nodo del seno. È il ritmo classico della riperfusione dopo angioplastica o trombolisi nell\u2019infarto.',
    vettori: 'Vettore unico e lento, come negli altri ritmi ventricolari.',
    guarda: 'DII per i battiti di fusione all\u2019inizio e alla fine dell\u2019episodio: sono la firma del quadro.',
    dd: ['Tachicardia ventricolare lenta', 'Ritmo giunzionale con aberranza', 'Ritmo da pacemaker'],
    trappole: 'Nel contesto della riperfusione è un segno favorevole e di regola non va trattato: sopprimerlo può togliere al cuore l\u2019unico ritmo che ha.',
    fonte: SRC.va + '; ' + SRC.acs,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- STIMOLAZIONE ---------- */
add({
  id: 'pmvvi', cat: 'Stimolazione', name: 'Stimolazione ventricolare (VVI)', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza sinusale propria', unit: '/min', min: 35, max: 75, step: 1, def: 52 }, { k: 'pm', label: 'Frequenza del pacemaker', unit: '/min', min: 50, max: 90, step: 1, def: 62 }],
  build: p => ({ rate: p.hr, av: 'dissoc', escRate: p.pm, escape: 'ventricolare', escQrs: M.qrsPaced(), qtc: 440 }),
  look: ['V1', 'II', 'V6'],
  card: {
    def: 'Stimolazione monocamerale del ventricolo destro: uno spike precede ogni QRS stimolato, l\u2019attività atriale procede indipendente.',
    criteri: ['Spike stretto e verticale immediatamente prima del QRS', 'QRS largo con morfologia tipo blocco di branca sinistra, perché la stimolazione parte dall\u2019apice del ventricolo destro', 'Asse spesso deviato in alto a sinistra', 'T opposta alla parte principale del QRS', 'Attività atriale dissociata dai battiti stimolati'],
    meccanismo: 'L\u2019elettrocatetere depolarizza il ventricolo destro; da lì l\u2019impulso si propaga al sinistro attraverso il miocardio comune, quindi lentamente. La modalità VVI stimola solo se il ritmo spontaneo scende sotto la frequenza programmata.',
    vettori: 'Vettore unico, diretto in alto a sinistra e indietro, che nasce dall\u2019apice del ventricolo destro.',
    guarda: 'V1 e V6 per la morfologia, DII per gli spike e per l\u2019attività atriale.',
    dd: ['Blocco di branca sinistra spontaneo, dove manca lo spike', 'Ritmo idioventricolare', 'Stimolazione biventricolare, dove il QRS è più stretto e spesso con R alta in V1'],
    trappole: 'Una morfologia stimolata tipo blocco di branca destra deve far pensare a un catetere nel ventricolo sinistro o a una perforazione del setto, non è normale. E ricorda i criteri di Sgarbossa per riconoscere un infarto in un ritmo stimolato.',
    fonte: SRC.pacing + '; ' + SRC.aha3,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'pmddd', cat: 'Stimolazione', name: 'Stimolazione bicamerale (DDD)',
  params: [F.hr(70, 50, 100), F.pr(170, 120, 250)],
  build: p => ({ rate: p.hr, pr: p.pr, qtc: 440, qrs: M.qrsPaced() }),
  look: ['II', 'V1', 'V6'],
  card: {
    def: 'Il dispositivo segue l\u2019attività atriale propria e stimola il ventricolo dopo un ritardo programmato: ogni P è seguita da uno spike e da un QRS stimolato.',
    criteri: ['P sinusale seguita, dopo l\u2019intervallo AV programmato, da uno spike ventricolare', 'QRS largo con morfologia tipo blocco di branca sinistra', 'Rapporto fisso e costante fra P e spike', 'Se anche l\u2019atrio viene stimolato compare un secondo spike prima della P'],
    meccanismo: 'Il dispositivo bicamerale mantiene la sincronia atrio-ventricolare: rileva la P spontanea e, se la conduzione propria non arriva in tempo, stimola il ventricolo. È la modalità usata nel blocco atrio-ventricolare con funzione sinusale conservata.',
    vettori: 'La P è normale perché nasce dal seno; il vettore ventricolare è quello della stimolazione dall\u2019apice destro.',
    guarda: 'DII per la sequenza P-spike-QRS, V1 e V6 per la morfologia stimolata.',
    dd: ['Preeccitazione con PR corto', 'BAV di I grado con blocco di branca sinistra, dove manca lo spike', 'Malfunzionamento con mancata cattura: lo spike c\u2019è ma non è seguito dal QRS'],
    trappole: 'Riconoscere i malfunzionamenti è più utile che riconoscere il ritmo normale: mancata cattura, mancata rilevazione, spike nella fase vulnerabile.',
    fonte: SRC.pacing,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ===== Secondo blocco di quadri aggiunti ===== */

const SRC2 = {
  als: 'ERC 2021, Linee guida sul supporto avanzato delle funzioni vitali',
  bru: 'HRS/EHRA/APHRS 2013, Consenso sulle sindromi aritmiche ereditarie; ESC 2022',
  arvc: 'Criteri diagnostici rivisti per la cardiomiopatia aritmogena, 2010; ESC 2023 cardiomiopatie'
};

const pFoci = () => [
  [B(dirAG(70, 10), 0.12, 34, 17, 17)],
  [B(dirAG(-70, 15), 0.11, 34, 16, 16)],
  [B(dirAG(20, -45), 0.13, 34, 18, 18)]
];

/* ---------- SOPRAVENTRICOLARI ---------- */
add({
  id: 'tachiatriale', cat: 'Sopraventricolari', name: 'Tachicardia atriale focale', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 120, max: 240, step: 1, def: 165 }],
  build: p => ({ rate: p.hr, pr: 130, qtc: 380, pComps: M.pLowAtrial(1.1), jit: 6 }),
  look: ['II', 'V1'],
  card: {
    def: 'Tachicardia sopraventricolare che nasce da un singolo focus atriale fuori dal nodo del seno, per automatismo, attività triggerata o microrientro.',
    criteri: ['Frequenza atriale 100–250/min, di regola regolare', 'P di morfologia diversa da quella sinusale, ma tutte uguali fra loro', 'Fra una P e l\u2019altra la linea torna isoelettrica: è questo che la distingue dal flutter', 'Intervallo RP lungo: la P precede il QRS con PR normale o allungato', 'Può esserci blocco atrio-ventricolare 2:1 senza che la tachicardia si interrompa'],
    meccanismo: 'Un gruppo di cellule atriali scarica più in fretta del nodo del seno. Poiché il circuito non coinvolge il nodo atrio-ventricolare, il blocco del nodo rallenta la risposta ventricolare ma non ferma l\u2019aritmia: è il comportamento tipico alla manovra vagale o all\u2019adenosina.',
    vettori: 'Il vettore della P punta secondo la sede del focus: dall\u2019atrio destro basso dà P negative nelle inferiori, dalle vene polmonari dà P positive e strette in V1.',
    guarda: 'DII e V1 per la morfologia della P e per la linea isoelettrica fra le P.',
    dd: ['Flutter atriale, dove manca la linea isoelettrica e le onde F sono a dente di sega', 'Tachicardia sinusale, dove la P è identica a quella di base', 'Rientro nodale, dove la P è retrograda e vicinissima al QRS'],
    trappole: 'Tachicardia atriale con blocco 2:1 e frequenza atriale intorno a 150: la metà delle P si nasconde nella T. Se la risposta è regolare a 75 e sospetti "solo" una tachicardia sinusale, cerca le P dentro le onde T. Tachicardia atriale con blocco è anche il quadro classico dell\u2019intossicazione digitalica.',
    fonte: SRC.svt,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'tam', cat: 'Sopraventricolari', name: 'Tachicardia atriale multifocale', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza media', unit: '/min', min: 100, max: 160, step: 1, def: 122 }],
  build: p => ({ rate: p.hr, pr: 140, qtc: 380, pVar: pFoci(), jit: 130 }),
  look: ['II', 'V1'],
  card: {
    def: 'Tachicardia atriale sostenuta da più foci: le P cambiano forma di battito in battito e il ritmo è francamente irregolare.',
    criteri: ['Frequenza atriale superiore a 100/min', 'Almeno tre morfologie diverse di P nella stessa derivazione', 'Intervalli PP, PR e RR tutti variabili', 'Linea isoelettrica presente fra le P'],
    meccanismo: 'Atri dilatati e ipossici, con più zone che scaricano in modo autonomo. È l\u2019aritmia della broncopneumopatia riacutizzata, spesso favorita da ipossia, teofillina e beta-agonisti.',
    vettori: 'Ogni focus ha il proprio vettore di P: da qui le morfologie diverse.',
    guarda: 'DII e V1 su una striscia lunga: conta le morfologie di P, non i battiti.',
    dd: ['Fibrillazione atriale, dove le P mancano del tutto', 'Extrasistoli atriali frequenti su ritmo sinusale', 'Ritmo atriale migrante, che è lo stesso quadro ma con frequenza sotto i 100/min'],
    trappole: 'Viene confusa con la fibrillazione atriale perché è irregolare, e il paziente finisce anticoagulato a torto o cardiovertito senza motivo. La terapia vera è quella della malattia polmonare: correggere ipossia ed elettroliti.',
    fonte: SRC.svt,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012',
    corso: ['Tachicardia atriale multifocale: almeno tre morfologie di P diverse', 'Ritmo irregolare, tipica della broncopneumopatia'],
    corsoFonte: 'Mulatero P., Corso di Metodologia Clinica, UniTo', slide: 'Aritmie, tachicardie sopraventricolari'
  }
});

add({
  id: 'avrt', cat: 'Sopraventricolari', name: 'Tachicardia da rientro atrio-ventricolare ortodromica', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 150, max: 240, step: 1, def: 190 }],
  build: p => ({ mode: 'svt', vRate: p.hr, rp: 130, rpAmp: 0.75, qtc: 370 }),
  look: ['II', 'V1'],
  card: {
    def: 'Rientro che scende ai ventricoli per la via normale e risale agli atri per la via accessoria: il QRS resta stretto.',
    criteri: ['Frequenza 150–250/min, regolare', 'QRS stretto, salvo aberranza di conduzione', 'P retrograda visibile dopo il QRS, con RP fra 70 e 140 ms: più lontana dal QRS che nel rientro nodale', 'P retrograda negativa in DII, DIII e aVF', 'Sottoslivellamento di ST frequente, non significa ischemia'],
    meccanismo: 'Il circuito usa due vie in serie: nodo atrio-ventricolare e fascio di His in discesa, via accessoria in risalita. Siccome i ventricoli sono parte obbligata del circuito, la tachicardia non può esistere con blocco atrio-ventricolare: questa è la differenza concettuale con la tachicardia atriale.',
    vettori: 'Vettori ventricolari normali; il vettore della P retrograda punta in alto, verso l\u2019atrio, e la sua direzione dice da che parte sta la via accessoria.',
    guarda: 'DII e V1 subito dopo il QRS: cerca una deflessione in più che non c\u2019era nel tracciato sinusale.',
    dd: ['Rientro nodale, dove la P retrograda è dentro il QRS o lo deforma appena (pseudo-r′ in V1, pseudo-S nelle inferiori)', 'Tachicardia atriale con RP lungo', 'Flutter atriale 2:1'],
    trappole: 'Fra le crisi l\u2019ECG può mostrare la preeccitazione (PR corto, onda delta) e allora si parla di sindrome di Wolff-Parkinson-White; ma la via accessoria può essere occulta, cioè conduce solo all\u2019indietro, e allora il tracciato basale è normale.',
    fonte: SRC.svt,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'avrtanti', cat: 'Sopraventricolari', name: 'Tachicardia da rientro atrio-ventricolare antidromica',
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 150, max: 230, step: 1, def: 185 }],
  build: p => ({ mode: 'svt', vRate: p.hr, rp: 0, qrs: M.qrsWPW(), qtc: 400, T: { a: -140, g: 30, amp: 0.4 } }),
  look: ['V1', 'II'],
  card: {
    def: 'Rientro che scende ai ventricoli attraverso la via accessoria e risale per il sistema di conduzione: il QRS è largo perché i ventricoli sono attivati per intero dalla via anomala.',
    criteri: ['Tachicardia regolare a QRS largo', 'Il QRS è tutto onda delta: massima preeccitazione', 'Morfologia identica, ma esagerata, a quella del tracciato sinusale preeccitato', 'Rara: circa il 5% dei rientri atrio-ventricolari'],
    meccanismo: 'Il circuito gira al contrario rispetto all\u2019ortodromica. Poiché nessuna parte del ventricolo è attivata dal sistema di His-Purkinje, il complesso è largo e bizzarro.',
    vettori: 'Un solo vettore lento, orientato secondo la sede dell\u2019inserzione ventricolare della via accessoria.',
    guarda: 'Confronta la morfologia con l\u2019ECG sinusale del paziente, se ce l\u2019hai: la direzione dell\u2019onda delta è la stessa.',
    dd: ['Tachicardia ventricolare: in assenza di un ECG di confronto la distinzione è difficile e in urgenza si tratta come ventricolare', 'Tachicardia sopraventricolare con blocco di branca'],
    trappole: 'Davanti a una tachicardia a QRS largo, l\u2019errore grave è chiamarla sopraventricolare e trattarla con verapamil. In dubbio, si considera ventricolare.',
    fonte: SRC.svt + '; ' + SRC.va,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'fapreeccitata', cat: 'Sopraventricolari', name: 'Fibrillazione atriale preeccitata', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza media', unit: '/min', min: 150, max: 280, step: 1, def: 215 }],
  build: p => ({ atrial: 'af', vRate: p.hr, qrs: M.qrsWPW(), qtc: 400, T: { a: -140, g: 30, amp: 0.35 }, fAmp: 0.02 }),
  look: ['V1', 'II', 'V4'],
  card: {
    def: 'Fibrillazione atriale in un paziente con via accessoria: gli impulsi atriali raggiungono i ventricoli attraverso la via anomala, che non ha il freno del nodo atrio-ventricolare.',
    criteri: ['Ritmo francamente irregolare', 'QRS largo e di larghezza variabile da battito a battito, secondo il grado di preeccitazione', 'Frequenza ventricolare molto alta, spesso oltre 200/min, con intervalli RR minimi sotto i 250 ms', 'Il quadro è detto FBI: Fast, Broad, Irregular'],
    meccanismo: 'Il nodo atrio-ventricolare protegge normalmente i ventricoli filtrando gli impulsi della fibrillazione. La via accessoria ha periodo refrattario breve e non filtra nulla: se è molto breve, la frequenza ventricolare può degenerare in fibrillazione ventricolare.',
    vettori: 'Ogni battito ha una quota diversa di attivazione attraverso la via accessoria: il vettore cambia da battito a battito, e con esso la larghezza del QRS.',
    guarda: 'V1 e DII: irregolarità, larghezza variabile, frequenza altissima.',
    dd: ['Tachicardia ventricolare polimorfa', 'Fibrillazione atriale con blocco di branca, dove però i QRS hanno tutti la stessa larghezza'],
    trappole: 'È l\u2019emergenza in cui i farmaci che bloccano il nodo — adenosina, verapamil, diltiazem, betabloccanti e digossina — sono controindicati: bloccando la via normale spingono tutti gli impulsi nella via accessoria e possono provocare la fibrillazione ventricolare. Si usa la cardioversione elettrica, o la procainamide se il paziente è stabile.',
    fonte: SRC.svt + '; ' + SRC.af,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- VENTRICOLARI E ARRESTO ---------- */
add({
  id: 'flutterv', cat: 'Ventricolari', name: 'Flutter ventricolare',
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 220, max: 330, step: 5, def: 280 }],
  build: p => ({ mode: 'vt', vRate: p.hr, aRate: 0.5, vtQrs: { w: 190, c: [B(dirAG(-55, -30), 1.15, 95, 55, 55)] }, vtT: { a: 125, g: 30, amp: 0.2 }, qtc: 420 }),
  look: ['II', 'V1'],
  card: {
    def: 'Tachicardia ventricolare regolarissima e velocissima, in cui QRS e T non sono più distinguibili: il tracciato è una sinusoide.',
    criteri: ['Onde ampie, regolari, sinusoidali, a 250–300/min', 'Impossibile separare QRS, ST e T', 'Stessa morfologia in tutte le derivazioni', 'Nessun polso: è un arresto cardiaco'],
    meccanismo: 'Rientro ventricolare a ciclo brevissimo. È il passaggio intermedio fra la tachicardia ventricolare e la fibrillazione ventricolare, e degenera rapidamente in quest\u2019ultima.',
    vettori: 'Un unico vettore che ruota a velocità costante.',
    guarda: 'Qualunque derivazione: il quadro è inconfondibile e non richiede analisi fine.',
    dd: ['Torsione di punta, dove l\u2019ampiezza oscilla e l\u2019asse ruota', 'Fibrillazione ventricolare a onde grossolane, che è irregolare', 'Artefatto da movimento, che ha il polso e complessi riconoscibili in mezzo'],
    trappole: 'Ritmo defibrillabile: si tratta con la scarica immediata, non con i farmaci.',
    fonte: SRC.va + '; ' + SRC2.als,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'asistolia', cat: 'Arresto cardiaco', name: 'Asistolia', quiz: true,
  params: [],
  build: () => ({ mode: 'continuous', noise: 0.012 }),
  look: ['II'],
  card: {
    def: 'Assenza completa di attività elettrica ventricolare: la linea è piatta, salvo il rumore di fondo.',
    criteri: ['Nessun QRS', 'Possono persistere onde P isolate: si parla allora di asistolia ventricolare con attività atriale', 'La linea non è mai perfettamente piatta: un tracciato assolutamente rettilineo fa sospettare un elettrodo staccato', 'Va confermata in due derivazioni e con il guadagno al massimo'],
    meccanismo: 'Nessun pacemaker, nemmeno quello ventricolare, riesce più a scaricare. È di solito l\u2019esito finale di un arresto prolungato, per esaurimento delle riserve energetiche del miocardio.',
    vettori: 'Nessun vettore.',
    guarda: 'Controlla elettrodi, cavi e guadagno prima di dichiararla, e cerca la fibrillazione ventricolare a onde fini che può nascondersi in una linea quasi piatta.',
    dd: ['Fibrillazione ventricolare a onde fini', 'Elettrodo o cavo staccato', 'Monitor in pausa o in modalità sbagliata'],
    trappole: 'Ritmo **non** defibrillabile: la scarica non serve e interrompe il massaggio. Si fa rianimazione cardiopolmonare, adrenalina appena possibile, e si cercano le cause reversibili.',
    fonte: SRC2.als,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'pea', cat: 'Arresto cardiaco', name: 'Attività elettrica senza polso',
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 20, max: 90, step: 1, def: 38 }, { k: 'w', label: 'Larghezza del QRS', unit: '×', min: 1, max: 1.8, step: 0.05, def: 1.5 }],
  build: p => ({ rate: p.hr, pr: 190, qtc: 470, qrs: M.qrsNormal(), qrsScale: p.w, T: { a: -140, g: 20, amp: 0.2 } }),
  look: ['II', 'V1'],
  card: {
    def: 'Attività elettrica organizzata sul monitor, ma senza polso centrale palpabile: la diagnosi è clinica, non elettrocardiografica.',
    criteri: ['Il tracciato può essere qualunque ritmo organizzato: sinusale, giunzionale, idioventricolare, spesso lento e con QRS largo', 'Assenza di polso e di segni di circolo', 'Nessun criterio ECG permette da solo di fare la diagnosi: l\u2019ECG non dice nulla sulla gittata'],
    meccanismo: 'L\u2019attivazione elettrica c\u2019è ma non produce contrazione efficace, oppure la contrazione c\u2019è e non genera flusso. Le cause si cercano fra le quattro ipo/iper e le quattro T: ipossia, ipovolemia, ipo o iperkaliemia e disturbi metabolici, ipotermia; pneumotorace iperteso, tamponamento cardiaco, tossici, trombosi coronarica o polmonare.',
    vettori: 'Dipendono dal ritmo sottostante.',
    guarda: 'Non il monitor: il polso, l\u2019ecografia al letto, la storia. Il monitor serve solo a escludere un ritmo defibrillabile.',
    dd: ['Arresto con ritmo defibrillabile', 'Pseudo-PEA, in cui la contrazione c\u2019è ma la pressione è troppo bassa per essere palpata: l\u2019ecografia la distingue'],
    trappole: 'Ritmo **non** defibrillabile. Il tempo speso a cercare la scarica è tempo tolto al massaggio e alla ricerca della causa: la prognosi dipende quasi solo dal trovarla.',
    fonte: SRC2.als,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- ISCHEMIA ---------- */
add({
  id: 'wellens', cat: 'Ischemia', name: 'Sindrome di Wellens', quiz: true,
  params: [F.hr(72, 50, 100), { k: 'tipo', label: 'Tipo', type: 'select', def: 'b', opts: [['a', 'Tipo A: T bifasiche'], ['b', 'Tipo B: T profondamente invertite']] }],
  build: p => ({ rate: p.hr, pr: 160, qtc: 440, qrs: M.qrsNormal(), T: p.tipo === 'b' ? { a: 45, g: -75, amp: 0.85 } : { a: 45, g: -55, amp: 0.45 }, tShape: p.tipo === 'a' ? 'notched' : 'broad' }),
  look: ['V2', 'V3', 'V4'],
  card: {
    def: 'Pattern di T in V2–V3 che segnala una stenosi critica della discendente anteriore prossimale, in un paziente che al momento non ha dolore.',
    criteri: ['T profondamente invertite e simmetriche in V2–V3 (tipo B), oppure bifasiche positive-negative (tipo A)', 'Registrato in assenza di dolore, dopo un episodio anginoso recente', 'Progressione della R conservata: niente onde Q patologiche', 'ST isoelettrico o sopraslivellato meno di 1 mm', 'Troponina normale o appena mossa'],
    meccanismo: 'È il quadro della riperfusione spontanea di un\u2019occlusione critica: il miocardio anteriore è salvo ma la stenosi resta, e la T invertita è il segno della miocardio stordito.',
    vettori: 'Il vettore della T si inverte verso il basso e all\u2019indietro rispetto alla parete anteriore.',
    guarda: 'V2 e V3, confrontando con tracciati precedenti e con il momento del dolore.',
    dd: ['Embolia polmonare, dove le T invertite sono in V1–V4 e nelle inferiori insieme', 'Sovraccarico ventricolare sinistro', 'Emorragia subaracnoidea, con T giganti e QT lungo'],
    trappole: 'È la trappola classica: il paziente sta bene, la troponina è normale, e viene dimesso. Il test da sforzo in questa situazione è pericoloso: la strada è la coronarografia.',
    fonte: SRC.acs + '; ' + SRC.udmi,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'dewinter', cat: 'Ischemia', name: 'Pattern di de Winter',
  params: [F.hr(80, 55, 115)],
  // Il vettore di lesione punta indietro, a destra e in alto: sottoslivellamento
  // al punto J da V1 a V6 e, per lo stesso motivo, lieve sopraslivellamento in
  // aVR, che è il segno che completa il quadro di de Winter.
  build: p => ({ rate: p.hr, pr: 160, qtc: 400, qrs: M.qrsNormal(), st: { a: 218, g: -61, amp: 0.30 }, T: { a: 40, g: 72, amp: 0.86 }, tShape: 'broad' }),
  look: ['V2', 'V3', 'V4', 'aVR'],
  card: {
    def: 'Equivalente di infarto con sopraslivellamento: sottoslivellamento di ST a salita rapida seguito da T alte e simmetriche nelle precordiali, per occlusione della discendente anteriore prossimale.',
    criteri: ['Sottoslivellamento di ST di 1–3 mm al punto J, con tratto a salita ripida, da V1 a V6', 'T alte, larghe e simmetriche subito dopo', 'Frequente lieve sopraslivellamento in aVR', 'Nessun sopraslivellamento nelle precordiali: per questo sfugge ai criteri classici', 'Quadro statico, non evolve verso il sopraslivellamento'],
    meccanismo: 'Occlusione acuta e completa della discendente anteriore in pazienti con una particolare risposta del subendocardio. Il significato clinico è identico a quello di uno STEMI anteriore.',
    vettori: 'Il vettore di lesione resta orientato verso il subendocardio anteriore e non riesce a invertirsi verso l\u2019epicardio.',
    guarda: 'Da V1 a V6: il punto J basso con la salita ripida che porta a T altissime.',
    dd: ['Iperkaliemia, dove le T sono appuntite ma strette e il QRS si allarga', 'T alte da ischemia subendocardica diffusa', 'Ripolarizzazione precoce'],
    trappole: 'La quinta definizione universale riconosce gli equivalenti di occlusione: se il quadro clinico è di infarto, la strategia è la riperfusione immediata anche senza sopraslivellamento.',
    fonte: SRC.udmi + '; ' + SRC.acs,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- ELETTROLITI, FARMACI, CANALOPATIE ---------- */
add({
  id: 'brugada', cat: 'Elettroliti e altro', name: 'Pattern di Brugada tipo 1', quiz: true,
  params: [F.hr(68, 45, 100)],
  build: p => ({ rate: p.hr, pr: 180, qtc: 410, qrs: M.qrsRBBB(), qrsScale: 0.85, st: { a: 172, g: 52, amp: 0.36 }, T: { a: -10, g: -55, amp: 0.3 } }),
  look: ['V1', 'V2'],
  card: {
    def: 'Sopraslivellamento del punto J con ST discendente a tenda e T negativa in V1–V2: la firma elettrocardiografica della sindrome di Brugada.',
    criteri: ['Punto J sopraslivellato ≥ 2 mm in almeno una derivazione fra V1 e V2', 'ST discendente, concavo verso il basso, a "coved type"', 'T negativa che segue senza linea isoelettrica in mezzo', 'Il tipo 1 è l\u2019unico diagnostico; i pattern tipo 2 a sella richiedono conferma', 'Le derivazioni vanno registrate anche al secondo e terzo spazio intercostale, dove il pattern è più evidente'],
    meccanismo: 'Perdita di funzione dei canali del sodio cardiaci: si crea una disomogeneità di ripolarizzazione fra epicardio ed endocardio del tratto di efflusso destro, che predispone al rientro di fase 2 e alla fibrillazione ventricolare.',
    vettori: 'Vettore di ripolarizzazione anomalo diretto verso il tratto di efflusso del ventricolo destro, cioè in alto, a destra e in avanti: per questo si vede solo in V1–V2.',
    guarda: 'V1 e V2, anche negli spazi intercostali più alti.',
    dd: ['Blocco di branca destra, dove il punto J non è sopraslivellato e la r′ è distinta', 'Ripolarizzazione precoce', 'Pectus excavatum e altre cause di falso pattern', 'Displasia aritmogena del ventricolo destro'],
    trappole: 'Il pattern può essere smascherato o peggiorato da febbre, farmaci bloccanti i canali del sodio, alcol e cocaina: nel dubbio, la febbre va trattata in fretta. Il pattern isolato non è la sindrome: serve la storia di sincope, di arresto o la familiarità.',
    fonte: SRC2.bru,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'ipotermia', cat: 'Elettroliti e altro', name: 'Ipotermia: onda J di Osborn', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza', unit: '/min', min: 28, max: 60, step: 1, def: 42 }, { k: 'j', label: 'Ampiezza dell\u2019onda J', unit: 'mm', min: 1, max: 8, step: 0.5, def: 4 }],
  build: p => ({ rate: p.hr, pr: 230, av: 'I', qtc: 520, qrs: M.qrsNormal(), qrsScale: 1.15, extra: [B(dirAG(45, 5), p.j / 10, 100, 12, 16)], T: { a: 45, g: 15, amp: 0.2 }, jit: 20 }),
  look: ['II', 'V4', 'V5'],
  card: {
    def: 'Deflessione positiva alla giunzione fra QRS e ST, tanto più ampia quanto più bassa è la temperatura.',
    criteri: ['Onda J di Osborn: gobba positiva al punto J, meglio visibile nelle precordiali sinistre e nelle inferiori', 'Bradicardia sinusale, spesso marcata', 'Allungamento di tutti gli intervalli: PR, QRS e QT', 'Tremore muscolare che sporca il tracciato', 'Sotto i 30 °C compaiono fibrillazione atriale a risposta lenta e aritmie ventricolari'],
    meccanismo: 'L\u2019ipotermia rallenta tutte le correnti transmembrana e crea un gradiente di ripolarizzazione precoce fra epicardio ed endocardio, che si traduce nella deflessione al punto J.',
    vettori: 'L\u2019onda J ha un vettore diretto in basso e a sinistra, come il QRS: per questo è positiva nelle stesse derivazioni.',
    guarda: 'V4–V6 e DII, dove l\u2019onda J è più alta.',
    dd: ['Ripolarizzazione precoce del giovane', 'Ipercalcemia', 'Pattern di Brugada, dove però il quadro è in V1–V2 con T negativa', 'Emorragia subaracnoidea'],
    trappole: 'Il cuore ipotermico è irritabile: movimenti bruschi possono innescare la fibrillazione ventricolare, e questa risponde male alla scarica finché la temperatura non risale. Nessuno è morto finché non è caldo e morto.',
    fonte: SRC2.als + '; ' + SRC.aha4,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'digitale', cat: 'Elettroliti e altro', name: 'Impregnazione digitalica', quiz: true,
  params: [F.hr(62, 45, 90)],
  build: p => ({ rate: p.hr, pr: 210, av: 'I', qtc: 350, qrs: M.qrsNormal(), st: { a: -140, g: 20, amp: 0.13 }, T: { a: -150, g: 25, amp: 0.16 } }),
  look: ['V5', 'V6', 'II'],
  card: {
    def: 'Alterazioni tipiche del tracciato in chi assume digitale a dosi terapeutiche: non indicano tossicità.',
    criteri: ['Sottoslivellamento di ST concavo, "a baffo di Salvador Dalì" o a cucchiaio, nelle derivazioni con R alta', 'T appiattita o bifasica', 'QT accorciato', 'PR allungato per l\u2019effetto vagale sul nodo atrio-ventricolare', 'Frequenza ventricolare rallentata nella fibrillazione atriale'],
    meccanismo: 'La digitale inibisce la pompa sodio-potassio: aumenta il calcio intracellulare, accorcia il potenziale d\u2019azione ventricolare e aumenta il tono vagale sul nodo.',
    vettori: 'Il vettore di ripolarizzazione si sposta in direzione opposta al QRS nelle derivazioni a R alta: da qui la cucchiaiata.',
    guarda: 'V5, V6 e DII, cioè dove la R è alta.',
    dd: ['Ischemia subendocardica, dove il sottoslivellamento è rettilineo o discendente e il QT non è corto', 'Sovraccarico ventricolare sinistro'],
    trappole: 'Impregnazione non è intossicazione. L\u2019intossicazione si riconosce dalle aritmie: tachicardia atriale con blocco, tachicardia giunzionale, extrasistoli ventricolari, e la tachicardia ventricolare bidirezionale che è quasi patognomonica. Nell\u2019intossicazione la cardioversione elettrica è rischiosa.',
    fonte: SRC.aha4 + '; ' + SRC.af,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'ipercalcemia', cat: 'Elettroliti e altro', name: 'Ipercalcemia',
  params: [F.hr(70, 50, 100), { k: 'qtc', label: 'QTc', unit: 'ms', min: 280, max: 380, step: 5, def: 320 }],
  build: p => ({ rate: p.hr, pr: 165, qtc: p.qtc, qrs: M.qrsNormal(), T: { a: 45, g: 20, amp: 0.3 } }),
  look: ['II', 'V2', 'V5'],
  card: {
    def: 'Accorciamento del QT per riduzione della durata del tratto ST: il calcio accelera la fase di plateau.',
    criteri: ['QT e QTc accorciati, a spese del tratto ST che quasi scompare', 'La T sembra nascere direttamente dalla fine del QRS', 'Nelle forme gravi: onda J, allungamento del PR, allargamento del QRS, bradicardia', 'Sopra i 16 mg/dl può comparire arresto cardiaco'],
    meccanismo: 'Il calcio extracellulare elevato accorcia la fase 2 del potenziale d\u2019azione, cioè il plateau: si accorcia il tratto ST e con esso il QT.',
    vettori: 'Nessuna modifica della direzione dei vettori: cambia solo la durata.',
    guarda: 'Misura il QT e guarda dove finisce il QRS e dove comincia la T.',
    dd: ['Impregnazione digitalica, che pure accorcia il QT ma con la cucchiaiata', 'QT corto congenito', 'Ipertermia'],
    trappole: 'Un QTc sotto i 340 ms merita il dosaggio del calcio: nel paziente oncologico l\u2019ipercalcemia è frequente e trattabile.',
    fonte: SRC.aha4,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'ipocalcemia', cat: 'Elettroliti e altro', name: 'Ipocalcemia',
  params: [F.hr(72, 50, 100), { k: 'qtc', label: 'QTc', unit: 'ms', min: 440, max: 600, step: 5, def: 510 }],
  build: p => ({ rate: p.hr, pr: 160, qtc: p.qtc, qrs: M.qrsNormal(), T: { a: 45, g: 20, amp: 0.3 }, tShape: 'late' }),
  look: ['II', 'V2', 'V5'],
  card: {
    def: 'Allungamento del QT per allungamento del tratto ST, con onda T che resta di forma e durata normali.',
    criteri: ['QT e QTc allungati', 'L\u2019allungamento è tutto a carico del tratto ST, non della T: è il segno che distingue l\u2019ipocalcemia dalle altre cause di QT lungo', 'T normale per morfologia e durata', 'Raramente aritmie, salvo torsione di punta nelle forme gravi o associate'],
    meccanismo: 'Il calcio extracellulare basso prolunga la fase di plateau del potenziale d\u2019azione: il tratto ST si allunga e la ripolarizzazione rapida resta invariata.',
    vettori: 'Direzioni invariate.',
    guarda: 'DII e V2: misura dove finisce l\u2019ST e dove comincia la T.',
    dd: ['QT lungo congenito, dove la T è deformata o bifida', 'Farmaci che allungano il QT, che agiscono sulla T', 'Ipokaliemia, dove compaiono onde U e la T si appiattisce'],
    trappole: 'Quando trovi un QT lungo, chiediti sempre quale parte si è allungata: se è l\u2019ST pensa al calcio, se è la T pensa ai farmaci, al potassio o alla genetica.',
    fonte: SRC.aha4,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

add({
  id: 'arvc', cat: 'Elettroliti e altro', name: 'Cardiomiopatia aritmogena: onda epsilon',
  params: [F.hr(74, 50, 105)],
  build: p => ({ rate: p.hr, pr: 165, qtc: 425, qrs: M.qrsNormal(), extra: [B(dirAG(175, 45), 0.1, 112, 10, 14)], T: { a: 40, g: -65, amp: 0.34 } }),
  look: ['V1', 'V2', 'V3'],
  card: {
    def: 'Piccola deflessione dopo la fine del QRS in V1–V3, espressione di attivazione ritardata di zone del ventricolo destro sostituite da tessuto fibro-adiposo.',
    criteri: ['Onda epsilon in V1–V3: criterio maggiore', 'T invertite in V1–V3 in assenza di blocco di branca destra completo, in soggetti sopra i 14 anni: criterio maggiore', 'Durata dell\u2019attivazione terminale del QRS ≥ 55 ms in V1–V3: criterio minore', 'Extrasistoli e tachicardie ventricolari con morfologia tipo blocco di branca sinistra, cioè di origine destra'],
    meccanismo: 'Il miocardio del ventricolo destro viene sostituito da grasso e fibrosi: la conduzione in quelle zone è lentissima e produce potenziali tardivi visibili in superficie come onda epsilon. Le stesse zone sostengono i rientri ventricolari.',
    vettori: 'Un piccolo vettore terminale, tardivo e diretto a destra e in avanti: per questo si vede solo nelle precordiali destre.',
    guarda: 'V1–V3 subito dopo il QRS, con il guadagno doppio se serve.',
    dd: ['Blocco di branca destra, dove la deflessione terminale è dentro il QRS e non dopo', 'Pattern di Brugada', 'Sovraccarico destro', 'Variante giovanile delle T negative nelle precordiali destre, normale sotto i 14 anni'],
    trappole: 'È una causa di morte improvvisa nel giovane e nell\u2019atleta: T negative in V1–V3 in un adulto meritano l\u2019ecocardiogramma, non un\u2019alzata di spalle.',
    fonte: SRC2.arvc + '; ' + SRC.va,
    libro: 'Gaita F, Leclercq JF. L\u2019interpretazione dell\u2019ECG. Minerva Medica, 2012'
  }
});

/* ---------- capitolo di teoria ---------- */
THEORY.push({
  id: 'defibrillabili', title: '15. Ritmi defibrillabili e non defibrillabili', html: `
<p class="note">Cosa guardare sul monitor durante un arresto, e perché la scarica serve in due casi soltanto.</p>
<h4>La divisione che conta</h4>
<p>Nell\u2019arresto cardiaco i ritmi si dividono in due gruppi, e la divisione non è accademica: decide il gesto successivo.</p>
<table class="ttab"><thead><tr><th>Defibrillabili</th><th>Non defibrillabili</th></tr></thead><tbody>
<tr><td><b>Fibrillazione ventricolare</b>: onde caotiche, irregolari per ampiezza e frequenza, nessun QRS riconoscibile</td><td><b>Asistolia</b>: nessuna attività ventricolare, linea quasi piatta</td></tr>
<tr><td><b>Tachicardia ventricolare senza polso</b>, compreso il flutter ventricolare: complessi larghi, regolari, rapidissimi</td><td><b>Attività elettrica senza polso</b>: qualunque ritmo organizzato senza polso palpabile</td></tr>
</tbody></table>
<p>Nei ritmi defibrillabili il miocardio è elettricamente attivo ma disorganizzato: la scarica lo azzera tutto insieme e dà al nodo del seno la possibilità di riprendere. Negli altri due non c\u2019è nulla da riorganizzare, e la scarica sottrae solo tempo al massaggio.</p>
<h4>Come si comporta chi legge il monitor</h4>
<ul class="crit">
<li>La valutazione del ritmo dura pochi secondi e si fa durante una pausa brevissima del massaggio.</li>
<li>Se il ritmo è defibrillabile: scarica immediata, poi due minuti di rianimazione senza ricontrollare il polso.</li>
<li>Se non lo è: rianimazione e adrenalina appena possibile, poi ricontrollo ogni due minuti.</li>
<li>L\u2019adrenalina si dà subito nei ritmi non defibrillabili, mentre nei defibrillabili si dà dopo la terza scarica, insieme all\u2019amiodarone.</li>
<li>Le cause reversibili si cercano sempre, con le quattro ipo/iper e le quattro T: ipossia, ipovolemia, alterazioni del potassio e metaboliche, ipotermia; pneumotorace iperteso, tamponamento, tossici, trombosi coronarica o polmonare.</li>
</ul>
<h4>Le trappole del monitor</h4>
<ul class="crit">
<li><b>Fibrillazione ventricolare a onde fini</b>: assomiglia all\u2019asistolia. Aumenta il guadagno e controlla in due derivazioni prima di decidere.</li>
<li><b>Linea perfettamente piatta</b>: sospetta un elettrodo staccato o un cavo scollegato; l\u2019asistolia vera ha sempre un po\u2019 di rumore.</li>
<li><b>Artefatti da compressione o da trasporto</b>: possono simulare una tachicardia o una fibrillazione. Il polso e il capnografo dicono la verità.</li>
<li><b>Attività elettrica senza polso</b>: il tracciato può essere del tutto normale. È l\u2019unico caso in cui un ECG rassicurante non rassicura affatto.</li>
</ul>
<h4>Defibrillazione e cardioversione non sono la stessa cosa</h4>
<p>La <b>defibrillazione</b> è una scarica non sincronizzata e si usa quando non c\u2019è polso: fibrillazione ventricolare e tachicardia ventricolare senza polso. La <b>cardioversione</b> è sincronizzata sull\u2019onda R e si usa nelle tachiaritmie con polso ma instabili: fibrillazione e flutter atriale, tachicardia sopraventricolare, tachicardia ventricolare con polso. La sincronizzazione serve a evitare che la scarica cada sull\u2019onda T, nella fase vulnerabile, provocando proprio la fibrillazione ventricolare che si voleva evitare.</p>
<p>Due casi a parte: la <b>torsione di punta</b>, che si tratta con magnesio e con la correzione della causa, e va defibrillata se degenera; e la <b>fibrillazione atriale preeccitata</b>, dove i farmaci che bloccano il nodo sono controindicati e la strada è la cardioversione elettrica.</p>
<p class="note">Fonti: ERC 2021, linee guida sul supporto avanzato delle funzioni vitali; ${SRC.va}.</p>` });

/* ===== Approfondimenti dei capitoli di base ===== */
const APPRO = {
  cose: `
<h4>Perché una cellula che si depolarizza produce una deflessione</h4>
<p>Una fibra a riposo è polarizzata in modo uniforme: non c\u2019è differenza di potenziale fra due punti della sua superficie, e l\u2019elettrodo scrive la linea isoelettrica. Quando un\u2019estremità si depolarizza si crea un confine fra zona già attivata, elettricamente negativa all\u2019esterno, e zona ancora a riposo, positiva. Quel confine è un <b>dipolo</b>: una coppia di cariche opposte con una direzione e un\u2019intensità, cioè un vettore che punta dal negativo verso il positivo, cioè verso il tessuto non ancora attivato.</p>
<p>Il dipolo si sposta lungo la fibra man mano che il fronte avanza. L\u2019elettrodo non registra la carica in sé: registra la <b>proiezione</b> di quel vettore sulla propria direzione. Da qui discende tutto il resto, compresa la regola che l\u2019avvicinarsi del fronte dà una deflessione positiva.</p>
<h4>Il cuore intero come dipolo unico</h4>
<p>In ogni istante nel cuore ci sono milioni di fronti di attivazione, ognuno con il proprio piccolo dipolo. L\u2019ECG di superficie non li distingue: registra la <b>somma vettoriale</b> di tutti, come se esistesse un solo dipolo situato al centro elettrico del cuore. È un\u2019approssimazione potente e utile, ma è un\u2019approssimazione, ed è la ragione dei limiti dell\u2019esame.</p>
<h4>Cosa il modello non può dire</h4>
<ul class="crit">
<li>Due fronti uguali e opposti si annullano: l\u2019attivazione c\u2019è ma l\u2019ECG non la vede. È così che l\u2019infarto posteriore isolato o l\u2019ischemia circonferenziale possono passare inosservati.</li>
<li>Il torace non è un conduttore omogeneo: polmoni, sangue, ossa e grasso deformano il campo, e l\u2019ampiezza in superficie non è proporzionale alla massa che si è attivata.</li>
<li>La distanza conta: un elettrodo precordiale è vicino al miocardio sottostante e ne risente più che di regioni lontane, mentre nel modello le derivazioni sono assi ideali passanti per l\u2019origine.</li>
<li>L\u2019ECG è una registrazione elettrica: non dice nulla sulla contrazione. Un tracciato normale in un paziente senza polso è esattamente il quadro dell\u2019attività elettrica senza polso.</li>
</ul>
<p class="note">Approfondimento basato su ${SRC.aha3} e su Gaita e Leclercq, capitolo 1.</p>`,

  derivazioni: `
<h4>Le tre famiglie di derivazioni e perché sono fatte così</h4>
<p><b>Bipolari degli arti (Einthoven).</b> DI, DII e DIII misurano la differenza di potenziale fra due elettrodi: DI fra braccio sinistro e destro, DII fra gamba sinistra e braccio destro, DIII fra gamba sinistra e braccio sinistro. I tre lati formano il triangolo di Einthoven, e da qui discende la legge che vale sempre come controllo: <b>DII = DI + DIII</b>. Se sul tracciato questa somma non torna, gli elettrodi sono scambiati.</p>
<p><b>Unipolari aumentate (Goldberger).</b> aVR, aVL e aVF misurano il potenziale di un arto rispetto alla media degli altri due. Il termine "aumentate" non è decorativo: il segnale così ottenuto sarebbe piccolo, e viene amplificato del 50% per renderlo confrontabile con le bipolari.</p>
<p><b>Precordiali (Wilson).</b> Ognuna misura il potenziale di un punto del torace rispetto al <b>terminale centrale di Wilson</b>, cioè la media dei tre arti, che approssima un punto a potenziale zero. Sono le derivazioni che guardano il cuore da vicino e sul piano orizzontale.</p>
<h4>Dove vanno gli elettrodi</h4>
<table class="ttab"><thead><tr><th>Derivazione</th><th>Posizione</th></tr></thead><tbody>
<tr><td>V1</td><td>Quarto spazio intercostale, margine destro dello sterno</td></tr>
<tr><td>V2</td><td>Quarto spazio intercostale, margine sinistro dello sterno</td></tr>
<tr><td>V3</td><td>A metà fra V2 e V4</td></tr>
<tr><td>V4</td><td>Quinto spazio intercostale, linea emiclaveare</td></tr>
<tr><td>V5</td><td>Stessa altezza di V4, linea ascellare anteriore</td></tr>
<tr><td>V6</td><td>Stessa altezza di V4, linea ascellare media</td></tr>
</tbody></table>
<p>Le derivazioni aggiuntive si registrano quando servono: <b>V7-V9</b> sul dorso per la parete posteriore, <b>V3R-V4R</b> a destra per il ventricolo destro, obbligatorie davanti a un infarto inferiore.</p>
<h4>Le due prospettive</h4>
<p>Le sei derivazioni degli arti guardano il cuore sul <b>piano frontale</b> e formano il sistema esassiale, con 30° fra una e l\u2019altra: DI 0°, DII +60°, aVF +90°, DIII +120°, aVR −150°, aVL −30°. Le sei precordiali guardano sul <b>piano orizzontale</b>: V6 0°, V5 +30°, V4 +60°, V3 +75°, V2 +90°, V1 +120°, dove positivo significa in avanti. Un vettore diretto in alto e indietro sfugge a entrambe le prospettive se non lo si cerca.</p>
<h4>Errori di collegamento da riconoscere subito</h4>
<ul class="crit">
<li><b>Braccio destro e sinistro invertiti</b>: P e QRS negativi in DI, aVR positiva. È il più frequente e simula una destrocardia.</li>
<li><b>Destrocardia vera</b>: come sopra, ma in più la progressione della R nelle precordiali è invertita, cioè decresce da V1 a V6.</li>
<li><b>Elettrodo di un arto invertito con la gamba</b>: una derivazione risulta piatta.</li>
<li><b>Precordiali troppo alte</b>: r piccole in V1-V2 che simulano un infarto anteriore pregresso.</li>
</ul>
<p class="note">Approfondimento basato su ${SRC.aha3} e su Gaita e Leclercq, capitolo 2.</p>`,

  normale: `
<h4>La progressione della R e la zona di transizione</h4>
<p>Nelle precordiali il QRS passa gradualmente da prevalentemente negativo in V1 a prevalentemente positivo in V6: è la <b>progressione della R</b>, che riflette lo spostamento del vettore principale verso il ventricolo sinistro. Il punto in cui R ed S si equivalgono è la <b>zona di transizione</b>, normalmente in V3 o V4.</p>
<ul class="crit">
<li>Transizione in V1-V2: <b>rotazione antioraria</b>, si vede nell\u2019ipertrofia sinistra e nell\u2019infarto posteriore.</li>
<li>Transizione in V5-V6: <b>rotazione oraria</b>, tipica della broncopneumopatia, dell\u2019embolia polmonare e del sovraccarico destro.</li>
<li>Progressione povera: R che non cresce da V1 a V4, da valutare insieme a infarto anteriore pregresso, posizione degli elettrodi, enfisema e cardiomiopatia.</li>
</ul>
<h4>Cosa è normale e non sembra</h4>
<ul class="crit">
<li><b>Ripolarizzazione precoce</b>: sopraslivellamento del punto J concavo, con notch o slurring sulla branca discendente della R, nelle precordiali medie del giovane. Benigna nella grande maggioranza dei casi, ma il pattern inferiore con ST orizzontale merita attenzione.</li>
<li><b>Onde T negative giovanili</b> in V1-V3, normali fino all\u2019adolescenza.</li>
<li><b>Aritmia sinusale respiratoria</b>: il ciclo si accorcia in inspirazione e si allunga in espirazione.</li>
<li><b>Onda U</b>: piccola deflessione dopo la T, normale se inferiore al 25% della T; diventa patologica quando è prominente nell\u2019ipokaliemia o invertita nell\u2019ischemia.</li>
<li><b>Q settali</b> strette e piccole in DI, aVL, V5 e V6: sono la normalità, non un infarto. Patologiche se durano oltre 40 ms o superano un quarto della R che segue.</li>
</ul>
<h4>Le misure che servono sempre</h4>
<p>Frequenza, ritmo, asse, PR, QRS, QT e QTc: sono i sei numeri da cui parte ogni referto. Le soglie sono nel capitolo 13, con i valori usati a lezione; qui basta ricordare che vanno misurati sulla derivazione in cui l\u2019onda è più larga, non su quella dove si legge meglio.</p>
<p class="note">Approfondimento basato su ${SRC.aha3}, ${SRC.aha4} e su Gaita e Leclercq, capitolo 3.</p>`,

  ripol: `
<h4>Il potenziale d\u2019azione, fase per fase</h4>
<table class="ttab"><thead><tr><th>Fase</th><th>Cosa succede</th><th>Corrente</th></tr></thead><tbody>
<tr><td>0 — depolarizzazione rapida</td><td>Il potenziale sale da −90 a +20 mV</td><td>Ingresso di sodio (I<sub>Na</sub>)</td></tr>
<tr><td>1 — ripolarizzazione precoce</td><td>Piccolo avvallamento subito dopo il picco</td><td>Uscita transitoria di potassio (I<sub>to</sub>)</td></tr>
<tr><td>2 — plateau</td><td>Il potenziale resta quasi costante: è ciò che rende lungo il potenziale d\u2019azione cardiaco</td><td>Ingresso di calcio di tipo L, bilanciato dall\u2019uscita di potassio</td></tr>
<tr><td>3 — ripolarizzazione</td><td>Ritorno al potenziale di riposo</td><td>Uscita di potassio (I<sub>Kr</sub>, I<sub>Ks</sub>)</td></tr>
<tr><td>4 — riposo</td><td>Stabile nel miocardio comune, in lenta salita nelle cellule pacemaker</td><td>Pompa sodio-potassio; nelle pacemaker la corrente funny I<sub>f</sub></td></tr>
</tbody></table>
<p>Sull\u2019ECG: la fase 0 di tutte le cellule ventricolari fa il <b>QRS</b>, il plateau della fase 2 corrisponde al <b>tratto ST</b>, quando non c\u2019è differenza di potenziale fra le zone perché sono tutte depolarizzate, e la fase 3 fa l\u2019<b>onda T</b>.</p>
<h4>Perché la T è positiva dove il QRS è positivo</h4>
<p>Sembra un paradosso: la ripolarizzazione è il processo inverso della depolarizzazione, quindi dovrebbe dare una deflessione opposta. Le cose sono due, e si annullano a vicenda.</p>
<ul class="crit">
<li><b>Il dipolo è rovesciato</b>: nella ripolarizzazione la zona già ripolarizzata torna positiva all\u2019esterno e il vettore punta all\u2019indietro rispetto al fronte. Questo, da solo, invertirebbe la T.</li>
<li><b>Il fronte viaggia al contrario</b>: la depolarizzazione va dall\u2019endocardio all\u2019epicardio, la ripolarizzazione procede dall\u2019epicardio all\u2019endocardio. Questo, da solo, invertirebbe la T una seconda volta.</li>
</ul>
<p>Due inversioni danno una concordanza: <b>il vettore T finisce per puntare più o meno dove punta il QRS</b>, e la T è positiva nelle stesse derivazioni. Il motivo per cui l\u2019epicardio si ripolarizza per primo, pur essendo stato depolarizzato per ultimo, è che il suo potenziale d\u2019azione è più breve: subisce meno pressione, è meglio perfuso ed è più caldo.</p>
<h4>Periodi refrattari</h4>
<ul class="crit">
<li><b>Refrattario assoluto</b>: dalla fase 0 fino a metà della fase 3. Nessuno stimolo, per quanto forte, genera un nuovo potenziale. Corrisponde al QRS e alla prima parte della T.</li>
<li><b>Refrattario relativo</b>: la parte finale della fase 3, sul versante discendente della T. Uno stimolo forte può innescare una risposta, ma con conduzione lenta e rischio di rientro.</li>
<li><b>Fase vulnerabile</b>: il picco della T. Uno stimolo che cade lì può innescare fibrillazione ventricolare: è il fenomeno R su T e il motivo per cui la cardioversione si sincronizza sulla R.</li>
</ul>
<p class="note">Approfondimento basato su ${SRC.aha4} e su Gaita e Leclercq, capitolo 3.</p>`,

  asse: `
<h4>Tre modi di trovare l\u2019asse, dal più veloce al più preciso</h4>
<ol class="crit">
<li><b>I due pollici.</b> Guarda DI e aVF: entrambe positive, asse normale, cioè nel quadrante fra 0° e +90°; DI positiva e aVF negativa, asse deviato a sinistra; DI negativa e aVF positiva, asse deviato a destra; entrambe negative, asse nella terra di nessuno, fra −90° e 180°.</li>
<li><b>La derivazione isoelettrica.</b> Cerca la derivazione frontale in cui il QRS è più vicino a zero, cioè dove positivo e negativo si equivalgono: l\u2019asse è <b>perpendicolare</b> a quella derivazione. Restano due possibilità opposte, e si sceglie quella verso cui punta una derivazione positiva.</li>
<li><b>Il calcolo sul sistema esassiale.</b> Misura l\u2019area netta del QRS in DI e in aVF, riportale come componenti su due assi perpendicolari e componi il vettore. È il metodo che usa la macchina.</li>
</ol>
<h4>I quadranti e cosa significano</h4>
<table class="ttab"><thead><tr><th>Asse</th><th>Nome</th><th>Cause da considerare</th></tr></thead><tbody>
<tr><td>−30° / +90°</td><td>Normale</td><td>—</td></tr>
<tr><td>−30° / −90°</td><td>Deviazione a sinistra</td><td>Emiblocco anteriore sinistro, infarto inferiore, ipertrofia sinistra, obesità e gravidanza, cuore orizzontale</td></tr>
<tr><td>+90° / +180°</td><td>Deviazione a destra</td><td>Emiblocco posteriore sinistro, ipertrofia destra, embolia polmonare, broncopneumopatia, infarto laterale, longilineo</td></tr>
<tr><td>−90° / 180°</td><td>Asse indeterminato</td><td>Ritmi ventricolari, iperkaliemia, cardiopatie congenite, inversione degli elettrodi</td></tr>
</tbody></table>
<h4>Non solo il QRS</h4>
<p>Anche <b>P</b> e <b>T</b> hanno un asse. L\u2019asse della P è normalmente fra 0° e +75°, e se esce da lì il ritmo non nasce dal nodo del seno. L\u2019angolo fra asse del QRS e asse della T, il <b>QRS-T angle</b>, è normalmente stretto: un angolo largo indica che la ripolarizzazione non segue più la depolarizzazione, come nel sovraccarico, nell\u2019ischemia e nei blocchi di branca.</p>
<p class="note">Approfondimento basato su ${SRC.aha3} e sui criteri del corso, capitolo 13.</p>`,

  fc: `
<h4>Tutti i metodi, e quando usarli</h4>
<ul class="crit">
<li><b>Regola del 300</b> per i ritmi regolari: 300 diviso il numero di quadrati grandi fra due R. La sequenza da tenere a memoria è 300, 150, 100, 75, 60, 50.</li>
<li><b>Regola del 1500</b> quando serve precisione: 1500 diviso il numero di quadratini piccoli fra due R.</li>
<li><b>Metodo dei sei secondi</b> per i ritmi irregolari, fibrillazione atriale in testa: conta i QRS in trenta quadrati grandi e moltiplica per dieci. È l\u2019unico metodo corretto quando gli RR variano.</li>
<li><b>60.000 diviso l\u2019RR in millisecondi</b>: la formula da cui derivano tutte le altre.</li>
</ul>
<h4>Attenzioni</h4>
<ul class="crit">
<li>Se la carta scorre a 50 mm/s invece di 25, tutti i tempi sulla carta raddoppiano e la frequenza calcolata con le regole classiche va dimezzata. Controlla sempre la velocità stampata in fondo al tracciato.</li>
<li>Nei blocchi atrio-ventricolari le frequenze sono due, atriale e ventricolare, e vanno riportate entrambe.</li>
<li>Nel flutter è utile calcolare la frequenza atriale e dedurne il rapporto di conduzione: 300 diviso 150 al minuto significa 2:1.</li>
</ul>
<p class="note">Approfondimento basato sui criteri del corso, capitolo 13.</p>`,

  referto: `
<h4>La sequenza, sempre la stessa</h4>
<ol class="crit">
<li><b>Dati tecnici</b>: velocità 25 mm/s, taratura 10 mm/mV, qualità del tracciato, artefatti.</li>
<li><b>Frequenza</b> atriale e ventricolare.</li>
<li><b>Ritmo</b>: c\u2019è una P prima di ogni QRS e un QRS dopo ogni P? La P è sinusale, cioè positiva in DI, DII e aVF e negativa in aVR? Gli intervalli sono regolari?</li>
<li><b>Asse</b> del QRS, e se serve della P e della T.</li>
<li><b>Intervalli</b>: PR, QRS, QT con il QTc.</li>
<li><b>Onda P</b>: durata, ampiezza, morfologia, segni di ingrandimento atriale.</li>
<li><b>QRS</b>: onde Q patologiche, voltaggi, progressione della R, morfologia da blocco.</li>
<li><b>ST e T</b>: sopraslivellamenti e sottoslivellamenti con la loro forma, direzione della T, onda U.</li>
<li><b>Confronto</b> con i tracciati precedenti: cambia la diagnosi più di qualunque criterio.</li>
<li><b>Conclusione</b> in una frase, e la domanda finale: questo referto cambia qualcosa per il paziente adesso?</li>
</ol>
<h4>Le regole che salvano</h4>
<ul class="crit">
<li>Un ECG normale non esclude una sindrome coronarica acuta: fino al 10% degli infarti ha un primo tracciato non diagnostico. Se il dolore continua, si ripete a 15-30 minuti.</li>
<li>Davanti a un infarto inferiore si registrano sempre le derivazioni destre V3R-V4R e le posteriori V7-V9.</li>
<li>Una tachicardia a QRS largo si considera ventricolare fino a prova contraria.</li>
<li>Il referto automatico della macchina è un suggerimento, non una diagnosi: va sempre riletto, soprattutto su ritmo e intervalli.</li>
<li>Il tracciato si legge insieme al paziente: la stessa immagine ha significati diversi in un ventenne asintomatico e in un settantenne con dolore toracico.</li>
</ul>
<p class="note">Approfondimento basato su ${SRC.acs}, ${SRC.udmi} e sui criteri del corso.</p>`
};
THEORY.forEach(ch => { if (APPRO[ch.id]) ch.html += APPRO[ch.id]; });

/* ================= QUADRI COMBINATI =================
   Associazioni che esistono davvero e che all'esame arrivano insieme.
   Nota sulle combinazioni impossibili: due gradi diversi di blocco AV non
   convivono come diagnosi separate, la fibrillazione atriale esclude qualunque
   reperto che riguardi l'onda P (BAV di I grado compreso, e l'anomalia atriale),
   e un ritmo sinusale non può coesistere con un flutter. */
const COMB = 'Quadri combinati';
const qrsEP = () => ({ w: 116, c: [
  B(dirAG(-60, 10), 0.22, 14, 8, 8),          // vettore iniziale in alto a sinistra: q in DIII
  B(dirAG(48, 5), 0.78, 42, 12, 12),
  B(dirAG(175, -20), 0.46, 80, 11, 14)        // vettore terminale a destra: S larga in DI e V6
] });
// Ipertrofia sinistra con emiblocco anteriore: l'asse è a sinistra e in alto,
// ma i voltaggi devono restare quelli di un'ipertrofia vera (Sokolow >= 35 mm),
// altrimenti il quadro combinato non soddisfa il criterio che dichiara.
const qrsIvsEas = (k) => { k = k == null ? 1 : k; return { w: 112, c: [
  B(dirAG(126, 26), 0.24, 16, 10, 10),
  B(dirAG(-46, -20), 2.70 * k, 46, 14, 13),
  B(dirAG(-108, -52), 0.86 * k, 78, 12, 13)
] }; };

add({
  id: 'fa-bbdx', cat: COMB, name: 'Fibrillazione atriale con blocco di branca destra', quiz: true,
  params: [{ k: 'vr', label: 'Risposta ventricolare media', unit: '/min', min: 50, max: 160, step: 1, def: 96 },
    { k: 'f', label: 'Onde f', type: 'select', def: '1', opts: [['0.5', 'Fini'], ['1', 'Medie'], ['2', 'Grossolane']] }],
  build: p => ({ atrial: 'af', vRate: p.vr, qtc: 430, cont: 'af', fAmp: 0.04 * (+p.f), pComps: [], qrs: M.qrsRBBB(), T: { a: 35, g: -30, amp: 0.3 }, via: 'rbbb' }),
  look: ['V1', 'V6', 'II'],
  card: {
    def: 'Due reperti indipendenti sullo stesso tracciato: il ritmo è fibrillato, la conduzione intraventricolare è bloccata a destra.',
    criteri: ['Assenza di onde P, linea di base fibrillata', 'RR completamente irregolari', 'QRS ≥ 120 ms con rsR\u2032 in V1 e S larga in DI e V6', 'La morfologia del QRS resta la stessa battito dopo battito'],
    meccanismo: 'La fibrillazione riguarda gli atri, il blocco di branca il sistema His-Purkinje: i due piani non si influenzano.',
    vettori: 'Nessun vettore atriale organizzato; il vettore terminale lento va a destra e in avanti come in ogni BBDx.',
    guarda: 'DII per il ritmo, V1 e V6 per il QRS.',
    dd: ['Fibrillazione con conduzione aberrante intermittente (qui invece è fissa)', 'Tachicardia ventricolare (ma lì il ritmo è regolare)', 'Fibrillazione preeccitata (QRS di larghezza variabile)'],
    trappole: 'Su questo tracciato non si può diagnosticare un BAV di I grado né un\u2019anomalia atriale: senza onda P quei criteri non sono valutabili.',
    fonte: SRC.af + '; ' + SRC.aha3
  }
});

add({
  id: 'stemi-inf-bav3', cat: COMB, name: 'STEMI inferiore con BAV completo', quiz: true,
  params: [{ k: 'hr', label: 'Frequenza atriale', unit: '/min', min: 60, max: 110, step: 1, def: 82 },
    { k: 'st', label: 'Sopraslivellamento', unit: 'mm', min: 1, max: 6, step: 0.5, def: 3 }],
  build: p => ({ rate: p.hr, av: 'III', escape: 'giunzionale', escRate: 42, qtc: 430,
    // stessa taratura del territorio inferiore: i millimetri del cursore sono
    // i millimetri che si misurano in DII, DIII e aVF
    T: { a: 105, g: -5, amp: 0.5 }, st: { a: 105, g: -5, amp: p.st / 10 / TERR.inferiore.k } }),
  look: ['II', 'III', 'aVF'],
  card: {
    def: 'Occlusione della coronaria destra: infarto inferiore e blocco atrio-ventricolare completo nello stesso momento.',
    criteri: ['Sopraslivellamento del tratto ST in DII, DIII e aVF', 'Dissociazione atrio-ventricolare completa', 'Scappamento giunzionale a QRS stretto, 40-60/min', 'Sottoslivellamento speculare in DI e aVL'],
    meccanismo: 'Nel 90% dei casi il nodo AV è irrorato dalla coronaria destra, la stessa che irrora la parete inferiore: il blocco è nodale, spesso transitorio e responsivo all\u2019atropina.',
    vettori: 'Il vettore di lesione punta in basso verso la parete inferiore; i QRS di scappamento nascono dalla giunzione e restano stretti.',
    guarda: 'DII, DIII e aVF per lo ST; DII in striscia lunga per la dissociazione.',
    dd: ['BAV completo isolato degenerativo (QRS spesso largo, nessun ST)', 'Infarto anteriore con BAV (lì il blocco è infranodale e prognosticamente peggiore)'],
    trappole: 'La combinazione è tipica e va cercata: davanti a un infarto inferiore si controllano sempre la conduzione AV e le derivazioni destre V3R-V4R.',
    fonte: SRC.acs + '; ' + SRC.brady
  }
});

add({
  id: 'ivs-eas', cat: COMB, name: 'Ipertrofia ventricolare sinistra con emiblocco anteriore', quiz: true,
  params: [F.hr(68, 50, 100), { k: 'volt', label: 'Voltaggi del QRS', unit: '×', min: 0.7, max: 1.4, step: 0.05, def: 1 }],
  build: p => ({ rate: p.hr, pr: 170, qtc: 440, qrs: qrsIvsEas(+p.volt || 1), pComps: M.pSinus(1, 1.14, 1, 1.6),
    T: { a: 150, g: 40, amp: 0.34 }, st: { a: 150, g: 40, amp: 0.07 }, via: 'lafb' }),
  look: ['I', 'aVL', 'II', 'III', 'aVF', 'V6'], indici: 'sinistra',
  card: {
    def: 'Cuore ipertrofico e fascicolo anteriore bloccato: voltaggi alti e asse marcatamente deviato a sinistra.',
    criteri: ['Asse frontale tra −45° e −90°', 'rS in DII, DIII e aVF con qR in aVL', 'Voltaggi aumentati: R in aVL elevata, S profonde nelle precordiali destre', 'QRS < 120 ms', 'Possibile strain: ST sottoslivellato e T negativa in DI, aVL, V5-V6'],
    meccanismo: 'L\u2019ipertensione di lunga durata ispessisce il ventricolo e danneggia il fascicolo anteriore, che è sottile e con una sola sorgente di irrorazione.',
    vettori: 'Il vettore principale è grande e ruotato in alto a sinistra: somma l\u2019aumento di massa e la sequenza di attivazione alterata.',
    guarda: 'aVL per il voltaggio e la morfologia qR, le inferiori per le rS, V5-V6 per lo strain.',
    dd: ['Emiblocco anteriore isolato (voltaggi normali)', 'Infarto inferiore pregresso (QS invece di rS nelle inferiori)', 'Blocco di branca sinistra (QRS ≥ 120 ms)'],
    trappole: 'L\u2019emiblocco anteriore gonfia la R in aVL: il criterio di Cornell perde specificità e va letto con prudenza.',
    fonte: SRC.aha3 + '; ' + SRC.aha5
  }
});

add({
  id: 'bav1-bbsx', cat: COMB, name: 'BAV di I grado con blocco di branca sinistra', quiz: true,
  params: [F.hr(64, 45, 95), F.pr(250, 210, 380)],
  build: p => ({ rate: p.hr, pr: p.pr, av: 'I', qtc: 450, qrs: M.qrsLBBB(), T: { a: 165, g: 42, amp: 0.4 }, st: { a: 165, g: 42, amp: 0.09 }, via: 'lbbb' }),
  look: ['II', 'V1', 'V6'],
  card: {
    def: 'Conduzione rallentata a monte e blocco completo della branca sinistra: malattia diffusa del sistema di conduzione.',
    criteri: ['PR > 200 ms costante, ogni P condotta', 'QRS ≥ 120 ms con R larga in DI, aVL, V5-V6 e assenza di q settali', 'ST e T discordanti rispetto al QRS'],
    meccanismo: 'Degenerazione fibrotica che coinvolge sia il nodo AV sia la branca sinistra (malattia di Lenègre-Lev), spesso in un paziente anziano.',
    vettori: 'Vettore di attivazione lento e diretto a sinistra e indietro, come in ogni BBSx; il ritardo AV non modifica i vettori, solo la loro cadenza.',
    guarda: 'DII per il PR, V1 e V6 per il QRS.',
    dd: ['BAV di I grado isolato', 'BBSx isolato', 'Blocco bifascicolare con PR lungo'],
    trappole: 'Il PR lungo qui non dice dove sia il rallentamento: può essere nodale o infrahissiano, e solo lo studio elettrofisiologico lo distingue. Attenzione: BAV di I e II grado non si diagnosticano insieme, perché o tutte le P conducono o qualcuna cade.',
    fonte: SRC.brady + '; ' + SRC.aha3
  }
});

add({
  id: 'ep-s1q3t3', cat: COMB, name: 'Embolia polmonare: tachicardia sinusale, S1Q3T3 e BBDx incompleto', quiz: true,
  params: [F.hr(112, 90, 150)],
  build: p => ({ rate: p.hr, pr: 150, qtc: 420, qrs: qrsEP(), pComps: M.pSinus(1, 1, 1.7, 0.9),
    T: { a: 20, g: -72, amp: 0.3 } }),
  look: ['I', 'III', 'V1', 'V2', 'V3'],
  card: {
    def: 'Il quadro classico del cuore polmonare acuto: nessun segno è sensibile da solo, la combinazione orienta.',
    criteri: ['Tachicardia sinusale: il reperto più frequente in assoluto', 'S profonda in DI, onda q e T negativa in DIII (S1Q3T3)', 'T negative da V1 a V4 per sovraccarico del ventricolo destro', 'Deviazione assiale destra e ritardo di conduzione destro, spesso incompleto', 'Rotazione oraria con transizione spostata a sinistra'],
    meccanismo: 'L\u2019aumento improvviso delle resistenze polmonari dilata il ventricolo destro: cambia l\u2019asse, si allunga la conduzione destra e il subepicardio destro si ripolarizza male.',
    vettori: 'Il vettore terminale si sposta a destra (S in DI e V6) e il vettore T si allontana dal ventricolo destro dilatato: T negative nelle precordiali destre.',
    guarda: 'DI, DIII, V1-V4 e la frequenza.',
    dd: ['Infarto inferiore (lì la q in DIII si accompagna a sopraslivellamento e a q in DII e aVF)', 'Sindrome coronarica acuta con T negative anteriori (quadro di Wellens)', 'BPCO riacutizzata', 'Ipertrofia ventricolare destra cronica'],
    trappole: 'S1Q3T3 compare in meno di un quarto dei casi e un ECG normale non esclude l\u2019embolia: l\u2019esame serve soprattutto a escludere altre diagnosi e a stimare la gravità.',
    fonte: 'ESC 2019, Embolia polmonare acuta; slide del corso su TVP ed embolia polmonare'
  }
});


THEORY.push({
  id: 'valvole', title: '16. Le valvulopatie e il loro ECG',
  html: `
<p class="note">Impostazione delle linee guida ESC/EACTS 2025 sul trattamento delle valvulopatie, con la semeiotica classica accanto al tracciato.</p>

<p>Una regola prima di tutte: <b>l'ECG non fa diagnosi di valvulopatia</b>. La diagnosi e la gravità sono ecocardiografiche. Quello che l'ECG racconta è un'altra cosa, altrettanto utile: <b>quale camera sta pagando il prezzo, da quanto tempo, e se ha cominciato a cedere</b>. Un tracciato normale in un paziente con un soffio non esclude niente; un tracciato molto alterato dice che la malattia dura da anni.</p>

<h3>I due modi in cui un ventricolo si sovraccarica</h3>
<p>Tutta la lettura ruota attorno a questa distinzione.</p>
<ul>
<li><b>Sovraccarico di pressione (sistolico)</b>: il ventricolo deve spingere contro un ostacolo. Si ipertrofizza <i>concentricamente</i>, la parete si ispessisce, la cavità no. Sull'ECG: voltaggi alti <b>e</b> alterazione della ripolarizzazione, con ST discendente e T negativa asimmetrica proprio dove la R è più alta. È il quadro della <b>stenosi aortica</b> e dell'ipertensione.</li>
<li><b>Sovraccarico di volume (diastolico)</b>: il ventricolo riceve troppo sangue. Si dilata e si ipertrofizza <i>eccentricamente</i>. Sull'ECG: voltaggi alti, <b>q settali strette e profonde</b> nelle derivazioni laterali, ma ripolarizzazione a lungo conservata. È il quadro dell'<b>insufficienza aortica</b> e dell'<b>insufficienza mitralica</b>.</li>
</ul>
<p>Quando in un sovraccarico di volume compaiono ST sottoslivellato e T negativa, non è un dettaglio: è il ventricolo che sta scompensando.</p>

<h3>Le valvole di sinistra e quelle di destra</h3>
<p>Le lesioni delle valvole di sinistra si vedono sull'atrio sinistro e sul ventricolo sinistro; quando la pressione risale ai polmoni si aggiunge il cuore destro. Le lesioni delle valvole di destra si vedono sull'atrio destro e sul ventricolo destro. Da qui i due segni atriali che vale la pena saper riconoscere a colpo d'occhio:</p>
<ul>
<li><b>P mitralica</b>: P larga ≥ 120 ms, bifida in DII con le due cuspidi distanti ≥ 40 ms, e in V1 una componente negativa terminale profonda e lunga (forza terminale ≥ 0,04 mm·s). Significa atrio sinistro grande.</li>
<li><b>P polmonare</b>: P appuntita ≥ 2,5 mm in DII, DIII e aVF, con componente iniziale alta in V1. Significa atrio destro grande.</li>
</ul>

<h3>Quadro per quadro</h3>
<table class="tab">
<tr><th>Valvulopatia</th><th>ECG</th><th>Soffio</th></tr>
<tr><td>Stenosi aortica</td><td>Ipertrofia sinistra con strain, ingrandimento atriale sinistro, blocchi nelle forme calcifiche</td><td>Sistolico eiettivo a diamante, irradiato al collo; secondo tono ridotto; polso parvus et tardus</td></tr>
<tr><td>Insufficienza aortica</td><td>Voltaggi alti con q settali strette, T a lungo positiva</td><td>Diastolico aspirativo in decrescendo; polso celere, differenziale ampia</td></tr>
<tr><td>Stenosi mitralica</td><td>P mitralica, ventricolo sinistro normale, poi impegno destro; fibrillazione atriale frequentissima</td><td>Schiocco di apertura e rullio diastolico alla punta, rinforzo presistolico se in ritmo sinusale</td></tr>
<tr><td>Insufficienza mitralica</td><td>Atrio sinistro grande e voltaggi aumentati; fibrillazione atriale</td><td>Olosistolico alla punta irradiato all'ascella, invariato con il respiro</td></tr>
<tr><td>Prolasso mitralico</td><td>Spesso normale; T negative inferiori, extrasistoli ventricolari</td><td>Click meso-telesistolico e soffio telesistolico, che si anticipa in piedi</td></tr>
<tr><td>Insufficienza tricuspidale</td><td>P polmonare, sovraccarico destro, blocco di branca destra incompleto</td><td>Olosistolico che <b>aumenta in inspirazione</b> (Rivero-Carvallo), giugulari turgide con onda v</td></tr>
</table>

<h3>Il perché del respiro</h3>
<p>L'inspirazione aumenta il ritorno venoso al cuore destro: i soffi di destra crescono, quelli di sinistra no. È il segno di Rivero-Carvallo, e distingue un soffio olosistolico tricuspidale da uno mitralico meglio di qualunque altra manovra al letto del paziente.</p>

<h3>Che cosa cambia nel trattamento</h3>
<p>Le linee guida 2025 insistono su tre punti. Il primo: le decisioni complesse spettano a un <b>Heart Team</b> multidisciplinare e ai centri ad alto volume. Il secondo: le <b>tecniche transcatetere</b> hanno indicazioni più ampie e meglio definite, sia per la valvola aortica sia per la riparazione bordo a bordo della mitrale e della tricuspide. Il terzo: nel rigurgito mitralico si distingue il <b>primario</b>, malattia dei lembi che si ripara chirurgicamente, dal <b>secondario</b>, conseguenza della cardiopatia sottostante, in cui si parte dalla terapia ottimale dello scompenso e si distinguono ormai un fenotipo atriale e uno ventricolare.</p>
<p>Un dettaglio che vale la pena ricordare perché si chiede spesso: la fibrillazione atriale nella <b>stenosi mitralica reumatica</b> e nel portatore di <b>protesi meccanica</b> va anticoagulata con antagonisti della vitamina K, non con gli anticoagulanti orali diretti.</p>

<h3>Quando l'ECG cambia la lettura clinica</h3>
<ul>
<li>Fibrillazione atriale in una valvulopatia mitralica: cancella la P e con essa il segno atriale, ma è essa stessa un segno di malattia avanzata.</li>
<li>Blocco di branca sinistra di nuova insorgenza dopo impianto valvolare aortico transcatetere: complicanza attesa, va sorvegliata perché può evolvere verso il blocco completo.</li>
<li>Bassi voltaggi in un paziente con valvulopatia e dispnea: pensa al versamento pericardico o all'amiloidosi, che nell'anziano si associa spesso alla stenosi aortica.</li>
</ul>
`
});

/* ==================== VALVULOPATIE ====================
   L'ECG non fa diagnosi di valvulopatia: la fa l'ecocardiogramma. Però il
   tracciato racconta il sovraccarico che la valvola malata impone alle camere,
   e nel ragionamento clinico serve a capire da quanto dura e quanto pesa. */
const VALV = 'Valvulopatie';
const FONTE_VALV = SRC.valv;

add({
  id: 'stenosi-aortica', cat: VALV, name: 'Stenosi aortica', quiz: true,
  params: [F.hr(72, 50, 100), { k: 'grado', label: 'Sovraccarico', type: 'select', def: '1', opts: [['0', 'Ipertrofia senza strain'], ['1', 'Ipertrofia con strain']] }],
  build: p => ({
    rate: p.hr, pr: 185, qtc: 435, qrs: M.qrsLVH(1.05), qrsScale: 1.04,
    pComps: M.pMitrale(0.8),
    T: +p.grado ? { a: 160, g: 45, amp: 0.38 } : { a: 40, g: 18, amp: 0.4 },
    st: +p.grado ? { a: 160, g: 45, amp: 0.085 } : null
  }),
  look: ['V5', 'V6', 'aVL', 'V1'], indici: 'sinistra',
  card: {
    def: 'Ostacolo all\u2019efflusso del ventricolo sinistro: il ventricolo risponde con ipertrofia concentrica, e l\u2019ECG mostra voltaggi alti con sovraccarico sistolico.',
    criteri: [
      'Ipertrofia ventricolare sinistra con criteri di voltaggio (Sokolow-Lyon \u2265 35 mm, Cornell positivo)',
      'Sovraccarico sistolico: ST sottoslivellato discendente e T negativa asimmetrica in DI, aVL, V5 e V6',
      'Ingrandimento atriale sinistro: P larga \u2265 120 ms e bifida in DII, forza terminale negativa in V1',
      'PR spesso ai limiti alti e, nelle forme calcifiche, blocchi di conduzione per estensione della calcificazione al setto',
      'Il blocco di branca sinistra completo compare nelle forme avanzate e dopo impianto valvolare transcatetere',
      'ECG normale non esclude la stenosi: la diagnosi e la gravit\u00e0 sono ecocardiografiche'
    ],
    guarda: 'V5 e V6 per i voltaggi e lo strain, V1 per la S profonda e per la P bifasica, aVL per la R alta.',
    soffio: 'Soffio sistolico eiettivo, rude, a diamante, sul focolaio aortico, irradiato ai vasi del collo; secondo tono ridotto o assente quando la valvola \u00e8 rigida; polso parvus et tardus. La triade sintomatica classica \u00e8 angina, sincope da sforzo e dispnea.',
    terapia: 'Gravit\u00e0: velocit\u00e0 massima \u2265 4 m/s, gradiente medio \u2265 40 mmHg, area valvolare < 1 cm\u00b2. Intervento indicato nella forma severa sintomatica e nell\u2019asintomatica con disfunzione ventricolare sinistra; la scelta fra protesi chirurgica e impianto transcatetere spetta all\u2019Heart Team e tiene conto di et\u00e0, rischio operatorio, anatomia e aspettativa di vita. Nessuna terapia medica modifica la storia naturale.',
    meccanismo: 'Il ventricolo deve generare pressioni molto alte per vincere l\u2019ostruzione e si ispessisce senza dilatarsi. Pi\u00fa massa significa vettore di depolarizzazione pi\u00fa grande, quindi voltaggi alti. Il subendocardio ipertrofico \u00e8 il territorio peggio perfuso del cuore: la sua ripolarizzazione si altera per prima e nasce lo strain, che \u00e8 discendente e asimmetrico, diverso dal sottoslivellamento ischemico.',
    vettori: 'Il vettore del QRS \u00e8 lungo e punta a sinistra e indietro; quello della T gli si oppone, verso destra e in alto: per questo T negativa proprio nelle derivazioni dove la R \u00e8 pi\u00fa alta.',
    dd: [
      'Cardiomiopatia ipertrofica (onde q settali profonde e strette, storia familiare)',
      'Ipertensione arteriosa di lunga data (stessa ipertrofia, nessun soffio eiettivo)',
      'Ischemia subendocardica (sottoslivellamento orizzontale, non discendente, senza voltaggi alti)'
    ],
    trappole: 'Lo strain fa sottoslivellare l\u2019ST in V5-V6: non chiamarlo ischemia se i voltaggi sono alti e il quadro \u00e8 stabile. E ricorda che nell\u2019anziano il torace enfisematoso pu\u00f2 abbassare i voltaggi e nascondere l\u2019ipertrofia.',
    fonte: FONTE_VALV
  }
});

add({
  id: 'insufficienza-aortica', cat: VALV, name: 'Insufficienza aortica', quiz: true,
  params: [F.hr(78, 55, 105)],
  build: p => ({
    rate: p.hr, pr: 165, qtc: 425, qrs: M.qrsLVH(0.88), qrsScale: 1.02,
    pComps: M.pMitrale(0.65),
    T: { a: 34, g: 16, amp: 0.52 },
    extra: [B(dirAG(172, 26), 0.22, 16, 9, 9)]
  }),
  look: ['V5', 'V6', 'aVL', 'V2'], indici: 'sinistra',
  card: {
    def: 'Rigurgito diastolico dall\u2019aorta al ventricolo sinistro: sovraccarico di volume, con ipertrofia eccentrica e ventricolo dilatato.',
    criteri: [
      'Voltaggi alti nelle precordiali sinistre per l\u2019aumento del volume telediastolico',
      'Onde q strette e profonde in DI, aVL, V5 e V6: il setto ipertrofico viene attraversato da un vettore settale pi\u00fa grande',
      'T inizialmente positiva e alta: il sovraccarico \u00e8 diastolico, non sistolico, quindi lo strain compare tardi',
      'Quando compaiono ST sottoslivellato e T negativa nelle precordiali sinistre il ventricolo sta scompensando',
      'Ingrandimento atriale sinistro nelle forme croniche avanzate',
      'Nella forma acuta (endocardite, dissezione) l\u2019ECG pu\u00f2 essere quasi normale: la gravit\u00e0 non si legge sul tracciato'
    ],
    guarda: 'V5 e V6 per i voltaggi e per la q stretta, V2 per la S profonda, DI e aVL per la q laterale.',
    soffio: 'Soffio diastolico dolce, aspirativo, in decrescendo, lungo il margine sternale sinistro, meglio udibile seduti e piegati in avanti in espirazione. Polso celere e scoccante, pressione differenziale ampia; nelle forme severe soffio di Austin Flint alla punta.',
    terapia: 'Intervento nella forma severa sintomatica e nell\u2019asintomatica con disfunzione o dilatazione ventricolare; la riparazione valvolare \u00e8 possibile in centri esperti in anatomie favorevoli. Nella forma acuta severa l\u2019indicazione \u00e8 chirurgica urgente. Nella malattia della radice aortica il criterio di intervento tiene conto del diametro aortico.',
    meccanismo: 'Il ventricolo riceve a ogni diastole il volume che rientra dall\u2019aorta e si dilata per accoglierlo. La dilatazione allontana la parete dagli elettrodi ma aumenta la massa complessiva: i voltaggi salgono, e il setto pi\u00fa spesso genera una q settale pi\u00fa evidente. Finch\u00e9 la funzione regge la ripolarizzazione resta normale.',
    vettori: 'Vettore principale grande e diretto a sinistra, ma la T resta concorde: nella vista 3D si vede la freccia del QRS allungarsi senza che quella della T si rovesci.',
    dd: [
      'Stenosi aortica (stesse voltaggi, ma T negativa precoce e q settale assente o piccola)',
      'Cuore d\u2019atleta (voltaggi alti, ripolarizzazione precoce, bradicardia, nessun soffio diastolico)',
      'Insufficienza mitralica (sovraccarico di volume simile, ma con atrio sinistro molto pi\u00fa grande)'
    ],
    trappole: 'La q stretta e profonda in V5-V6 non \u00e8 una necrosi: guarda la larghezza. Una q patologica dura almeno 40 ms, la q settale del sovraccarico di volume \u00e8 stretta e accompagnata da R alta.',
    fonte: FONTE_VALV
  }
});

add({
  id: 'stenosi-mitralica', cat: VALV, name: 'Stenosi mitralica', quiz: true,
  params: [F.hr(84, 55, 120), { k: 'dx', label: 'Impegno destro', type: 'select', def: '1', opts: [['0', 'Iniziale', ], ['1', 'Ipertensione polmonare']] }],
  build: p => (+p.dx ? {
    rate: p.hr, pr: 175, qtc: 420, qrs: M.qrsRVH(), qrsScale: 0.92,
    pComps: M.pMitrale(1), T: { a: 55, g: -40, amp: 0.3 }, st: { a: 55, g: -40, amp: 0.04 }
  } : {
    rate: p.hr, pr: 175, qtc: 415, qrs: M.qrsNormal(), pComps: M.pMitrale(1)
  }),
  look: ['II', 'V1', 'V2', 'aVF'], indici: 'destra',
  card: {
    def: 'Ostacolo al riempimento del ventricolo sinistro: l\u2019atrio sinistro si dilata e la pressione si trasmette al circolo polmonare e al cuore destro. Il ventricolo sinistro resta piccolo e normale.',
    criteri: [
      'P mitralica: onda P larga \u2265 120 ms, bifida con distanza fra le due cuspidi \u2265 40 ms in DII',
      'Forza terminale negativa in V1 \u2265 0,04 mm\u00b7s: componente negativa profonda e lunga',
      'Nessun segno di ipertrofia ventricolare sinistra: il ventricolo sinistro \u00e8 scarico',
      'Con l\u2019ipertensione polmonare compaiono deviazione assiale destra, R dominante in V1 e sovraccarico destro',
      'La fibrillazione atriale \u00e8 frequentissima e spesso \u00e8 la prima manifestazione: quando arriva, la P sparisce e resta solo l\u2019impegno destro',
      'La stenosi mitralica reumatica resta la principale eziologia nel mondo'
    ],
    guarda: 'DII per la P bifida, V1 per la componente negativa profonda, V1 e V2 per l\u2019eventuale R dominante.',
    soffio: 'Primo tono accentuato, schiocco di apertura dopo il secondo tono, rullio diastolico a bassa frequenza alla punta con rinforzo presistolico se il ritmo \u00e8 sinusale. Si ascolta meglio con la campana, in decubito laterale sinistro. Facies mitralica nelle forme avanzate.',
    terapia: 'Gravit\u00e0: area valvolare \u2264 1,5 cm\u00b2. La commissurotomia mitralica percutanea con pallone \u00e8 il trattamento di scelta nelle anatomie favorevoli senza trombo atriale e senza rigurgito significativo; altrimenti chirurgia. La fibrillazione atriale nella stenosi mitralica reumatica richiede anticoagulazione con antagonisti della vitamina K, non con anticoagulanti diretti.',
    meccanismo: 'L\u2019atrio sinistro deve spingere il sangue attraverso un orifizio ristretto: si ipertrofizza e si dilata, e la sua depolarizzazione dura di pi\u00fa. La P si allarga e diventa bifida perch\u00e9 la componente sinistra, ritardata, si stacca da quella destra. A monte la pressione sale nei polmoni e il ventricolo destro si ipertrofizza.',
    vettori: 'Nella vista 3D il vettore atriale ha una coda lunga diretta indietro e a sinistra: \u00e8 quella che scrive la seconda gobba in DII e la negativit\u00e0 profonda in V1.',
    dd: [
      'Blocco interatriale avanzato (P bifasica \u00b1 nelle inferiori, senza valvulopatia)',
      'Qualunque altra causa di ingrandimento atriale sinistro: ipertensione, insufficienza mitralica, cardiomiopatie',
      'Ipertensione polmonare primitiva (impegno destro senza P mitralica)'
    ],
    trappole: 'Se il paziente \u00e8 in fibrillazione atriale la P non c\u2019\u00e8 e il segno pi\u00fa evidente scompare: resta l\u2019impegno destro, che da solo non dice quale valvola sia malata.',
    fonte: FONTE_VALV
  }
});

add({
  id: 'insufficienza-mitralica', cat: VALV, name: 'Insufficienza mitralica', quiz: true,
  params: [F.hr(80, 55, 110)],
  build: p => ({
    rate: p.hr, pr: 172, qtc: 425, qrs: M.qrsLVH(0.78),
    pComps: M.pMitrale(0.85), T: { a: 38, g: 14, amp: 0.42 }
  }),
  look: ['II', 'V1', 'V5', 'V6'], indici: 'sinistra',
  card: {
    def: 'Rigurgito sistolico dal ventricolo sinistro all\u2019atrio sinistro: sovraccarico di volume di entrambe le camere sinistre.',
    criteri: [
      'Ingrandimento atriale sinistro: P larga e bifida in DII, forza terminale negativa in V1',
      'Voltaggi aumentati nelle precordiali sinistre da sovraccarico di volume del ventricolo',
      'T di solito ancora positiva: lo strain compare solo quando la funzione cede',
      'Fibrillazione atriale frequente nelle forme croniche severe',
      'Nel rigurgito secondario si aggiungono i segni della cardiopatia di base: onde Q di pregresso infarto, blocco di branca sinistra, QRS largo'
    ],
    guarda: 'DII e V1 per l\u2019atrio sinistro, V5 e V6 per i voltaggi.',
    soffio: 'Soffio olosistolico alla punta, irradiato all\u2019ascella, che non varia con il ciclo respiratorio; primo tono ridotto, terzo tono nelle forme severe per il riempimento rapido. Nel prolasso il soffio \u00e8 telesistolico e preceduto da un click.',
    terapia: 'Nel rigurgito primario severo la riparazione chirurgica resta il trattamento di riferimento, con indicazione anche nell\u2019asintomatico secondo i criteri di dimensione e funzione ventricolare; la riparazione transcatetere bordo a bordo \u00e8 l\u2019alternativa nel paziente sintomatico ad alto rischio chirurgico. Nel rigurgito secondario le linee guida 2025 distinguono il fenotipo atriale da quello ventricolare e la terapia parte dal trattamento ottimale dello scompenso.',
    meccanismo: 'A ogni sistole una parte della gittata torna nell\u2019atrio: l\u2019atrio si dilata e il ventricolo, che deve pompare il volume normale pi\u00fa quello rigurgitato, si dilata anch\u2019esso. Due camere pi\u00fa grandi, due segni sull\u2019ECG: P larga e voltaggi alti.',
    vettori: 'Vettore atriale allungato e vettore ventricolare ingrandito, entrambi verso sinistra: nella vista 3D il ciclo appare tutto spostato a sinistra e indietro.',
    dd: [
      'Stenosi mitralica (stessa P, ma niente voltaggi alti e spesso impegno destro)',
      'Stenosi aortica (voltaggi alti con strain precoce)',
      'Difetto interventricolare (soffio olosistolico ma sul mesocardio, non irradiato all\u2019ascella)'
    ],
    trappole: 'L\u2019ECG non distingue il rigurgito primario da quello secondario: la distinzione \u00e8 ecocardiografica e cambia completamente la terapia.',
    fonte: FONTE_VALV
  }
});

add({
  id: 'prolasso-mitralico', cat: VALV, name: 'Prolasso della valvola mitrale', quiz: true,
  params: [F.hr(74, 55, 100), { k: 'ect', label: 'Extrasistoli', type: 'select', def: '1', opts: [['0', 'Assenti'], ['1', 'Frequenti']] }],
  build: p => {
    const cfg = { rate: p.hr, pr: 155, qtc: 445, qrs: M.qrsNormal(), T: { a: -40, g: 30, amp: 0.3 } };
    if (+p.ect) cfg.ectopy = { type: 'pvc', pattern: 'isolate', prob: 0.2, coupling: 0.5, qrs: M.qrsPVC_RVOT() };
    return cfg;
  },
  look: ['II', 'III', 'aVF', 'V6'],
  card: {
    def: 'Spostamento sistolico di uno o entrambi i lembi mitralici oltre il piano dell\u2019anello. L\u2019ECG \u00e8 spesso normale; quando \u00e8 alterato, lo \u00e8 in modo aspecifico.',
    criteri: [
      'Tracciato normale nella maggior parte dei casi',
      'T negative o appiattite nelle derivazioni inferiori, tipicamente DII, DIII e aVF',
      'Extrasistoli ventricolari frequenti, spesso a morfologia di origine dai muscoli papillari o dal tratto di efflusso',
      'QT talvolta ai limiti alti',
      'Nel fenotipo aritmico si associano T negative infero-laterali, extrasistolia complessa e disgiunzione anulare mitralica all\u2019imaging'
    ],
    guarda: 'DII, DIII e aVF per le T negative; la striscia lunga per le extrasistoli.',
    soffio: 'Click meso-telesistolico seguito da soffio telesistolico alla punta. Le manovre che riducono il precarico, come lo stare in piedi o il Valsalva, anticipano il click e allungano il soffio; lo squatting fa il contrario.',
    terapia: 'Nella maggioranza dei casi solo controlli periodici. Diventa chirurgico quando genera un rigurgito mitralico severo, con le stesse indicazioni del rigurgito primario. Nel fenotipo aritmico va valutato il rischio di aritmie ventricolari maligne, con imaging avanzato e monitoraggio prolungato.',
    meccanismo: 'La trazione dei lembi ridondanti sui muscoli papillari e sulla parete infero-basale genera stiramento cronico: da l\u00ec nascono sia le alterazioni della ripolarizzazione inferiore sia i focolai di extrasistolia.',
    vettori: 'Il vettore della T si inclina verso l\u2019alto e a sinistra, lasciando le derivazioni inferiori dalla parte sbagliata.',
    dd: [
      'Ischemia inferiore (T negative inferiori, ma con contesto clinico e movimento dei marcatori)',
      'Variante normale giovanile (T negative in V1-V3, non inferiori)',
      'Cardiomiopatia aritmogena (T negative destre ed extrasistoli a morfologia di branca sinistra)'
    ],
    trappole: 'Le T negative inferiori in un giovane con click sistolico non sono un infarto. Ma il contrario \u00e8 altrettanto vero: non attribuire al prolasso una ripolarizzazione alterata comparsa di recente in un paziente con dolore toracico.',
    fonte: FONTE_VALV
  }
});

add({
  id: 'insufficienza-tricuspidale', cat: VALV, name: 'Insufficienza tricuspidale', quiz: true,
  params: [F.hr(86, 60, 120)],
  build: p => ({
    rate: p.hr, pr: 180, qtc: 425, qrs: M.qrsRBBB(), qrsScale: 0.8,
    pComps: M.pPulmonale(1.05), T: { a: 50, g: -35, amp: 0.28 }
  }),
  look: ['II', 'V1', 'III', 'aVF'], indici: 'destra',
  card: {
    def: 'Rigurgito sistolico dal ventricolo destro all\u2019atrio destro. Nella grande maggioranza dei casi \u00e8 secondaria alla dilatazione dell\u2019anello, non a una malattia dei lembi.',
    criteri: [
      'P polmonare: onda P appuntita \u2265 2,5 mm in DII, DIII e aVF, componente iniziale positiva alta in V1',
      'Segni di sovraccarico destro: deviazione assiale destra, R dominante o rSR\u2032 in V1, blocco di branca destra spesso incompleto',
      'Fibrillazione atriale molto frequente, sia come causa sia come conseguenza della dilatazione atriale destra',
      'Nelle forme secondarie coesistono i segni della cardiopatia sinistra o dell\u2019ipertensione polmonare che le hanno prodotte',
      'Bassi voltaggi se c\u2019\u00e8 versamento pericardico o anasarca'
    ],
    guarda: 'DII per la P alta e appuntita, V1 per il sovraccarico destro.',
    soffio: 'Soffio olosistolico sul focolaio tricuspidale che aumenta in inspirazione (segno di Rivero-Carvallo): \u00e8 il dettaglio che lo distingue dal soffio mitralico. Turgore giugulare con onda v prominente, reflusso epatogiugulare, fegato pulsante, edemi declivi.',
    terapia: 'Nel rigurgito severo si interviene di regola contestualmente alla chirurgia della valvola sinistra; l\u2019intervento isolato va considerato nel paziente sintomatico prima che compaia disfunzione ventricolare destra irreversibile. Le tecniche transcatetere, riparazione bordo a bordo e sostituzione, hanno un ruolo crescente nel paziente ad alto rischio chirurgico. Diuretici per la congestione.',
    meccanismo: 'La dilatazione del ventricolo destro allarga l\u2019anello tricuspidale e i lembi non combaciano pi\u00fa. L\u2019atrio destro si dilata e produce una P alta e appuntita; il ventricolo destro sovraccarico si ipertrofizza e sposta a destra l\u2019asse.',
    vettori: 'Vettore atriale grande e diretto in basso, vettore ventricolare terminale ruotato a destra e in avanti: nella vista 3D la coda del QRS punta verso V1.',
    dd: [
      'Insufficienza mitralica (soffio olosistolico che non aumenta in inspirazione, atrio sinistro grande)',
      'Cuore polmonare cronico (stesso sovraccarico destro, con la broncopneumopatia come contesto)',
      'Difetto interatriale (sovraccarico destro con blocco di branca destra incompleto, ma P normale)'
    ],
    trappole: 'La P polmonare sparisce se il paziente fibrilla, e la fibrillazione qui \u00e8 la regola pi\u00fa che l\u2019eccezione: in quel caso l\u2019unico segno che resta \u00e8 l\u2019impegno destro.',
    fonte: FONTE_VALV
  }
});

add({
  id: 'lgl', cat: 'Conduzione intraventricolare', name: 'Sindrome di Lown-Ganong-Levine', quiz: true,
  params: [{ k: 'pr', label: 'PR', unit: 'ms', min: 80, max: 125, step: 5, def: 100 }, F.hr(76, 55, 105)],
  build: p => ({ rate: p.hr, pr: p.pr, qtc: 415, qrs: M.qrsNormal() }),
  look: ['II', 'V1', 'V5'],
  card: {
    def: 'PR corto con QRS stretto e senza onda delta, in un paziente con tachicardie parossistiche. \u00c8 una descrizione elettrocardiografica storica pi\u00fa che una malattia definita.',
    criteri: [
      'PR < 120 ms nell\u2019adulto',
      'QRS di durata normale, senza onda delta e senza impastamento iniziale',
      'Onda P normale, di origine sinusale: il PR corto non dipende da un ritmo atriale basso',
      'Storia di tachicardie parossistiche sopraventricolari: senza questo la triade non si completa e si parla solo di PR corto',
      'La distinzione dal Wolff-Parkinson-White \u00e8 tutta nell\u2019inizio del QRS: nel WPW \u00e8 impastato, qui \u00e8 netto'
    ],
    guarda: 'DII per misurare il PR, V1 e V5 per verificare che l\u2019inizio del QRS sia netto.',
    meccanismo: 'L\u2019idea originale era una via che scavalca il nodo atrioventricolare e si inserisce nel fascio di His: l\u2019impulso arriva prima ai ventricoli ma poi percorre le vie normali, quindi il PR si accorcia e il QRS resta stretto. Le conferme elettrofisiologiche di una vera via di questo tipo sono rare: molti casi si spiegano con una conduzione nodale semplicemente rapida.',
    vettori: 'Il QRS \u00e8 quello normale: nella vista 3D la sequenza dei vettori non cambia, cambia solo quanto presto comincia dopo la P.',
    dd: [
      'Wolff-Parkinson-White (PR corto ma con onda delta e QRS largo)',
      'Ritmo atriale basso o giunzionale (P negativa nelle inferiori)',
      'Conduzione nodale rapida nel giovane o nell\u2019ipertiroideo (PR corto senza tachicardie)',
      'Malattia da accumulo con conduzione accelerata'
    ],
    trappole: 'Un PR corto isolato, senza tachicardie, non \u00e8 una sindrome: \u00e8 una misura. Etichettarlo come Lown-Ganong-Levine porta a trattamenti e restrizioni che non servono.',
    fonte: SRC.svt
  }
});

/* ==================== DEFIBRILLAZIONE ====================
   Due tracciati che si comandano: il defibrillatore manuale, dove la scarica la
   dai tu, e il defibrillatore impiantabile, che decide da solo. Il ritmo si
   sceglie fra quelli dell'arresto, defibrillabili e non. La scarica si vede sul
   tracciato come nella realtà: un artefatto enorme, qualche decimo di secondo di
   silenzio e poi quello che c'è dopo. Sui ritmi non defibrillabili premere non
   serve a niente, ed è esattamente la cosa da imparare. */
const ARRESTO = {
  fv: { nome: 'Fibrillazione ventricolare grossolana', shock: true, cfg: () => ({ mode: 'continuous', cont: 'vf', vfAmp: 0.55 }) },
  fvfine: { nome: 'Fibrillazione ventricolare a onde fini', shock: true, cfg: () => ({ mode: 'continuous', cont: 'vf', vfAmp: 0.17 }) },
  tvsp: { nome: 'Tachicardia ventricolare senza polso', shock: true, cfg: () => ({ mode: 'vt', vRate: 205, aRate: 0.5, vtQrs: M.qrsVTscar(), vtT: { a: 40, g: -30, amp: 0.45 }, qtc: 380 }) },
  flutterv: { nome: 'Flutter ventricolare', shock: true, cfg: () => ({ mode: 'vt', vRate: 280, aRate: 0.5, vtQrs: { w: 190, c: [B(dirAG(-55, -30), 1.15, 95, 55, 55)] }, vtT: { a: 125, g: 30, amp: 0.2 }, qtc: 420 }) },
  tdp: { nome: 'Torsione di punta', shock: true, cfg: () => ({ mode: 'continuous', cont: 'torsade', tdpRate: 250, tdpAmp: 1.1 }) },
  asistolia: { nome: 'Asistolia', shock: false, cfg: () => ({ mode: 'continuous', noise: 0.012 }) },
  pea: { nome: 'Attivit\u00e0 elettrica senza polso', shock: false, cfg: () => ({ rate: 34, pr: 190, qtc: 480, qrs: M.qrsNormal(), qrsScale: 1.55, T: { a: -140, g: 20, amp: 0.2 } }) },
  agonico: { nome: 'Ritmo agonico', shock: false, cfg: () => ({ mode: 'vt', vRate: 16, aRate: 0.5, vtQrs: M.qrsEscapeV(), vtT: { a: 150, g: 30, amp: 0.4 }, qtc: 540 }) }
};
const DOPO = {
  sinusale: () => ({ rate: 74, pr: 170, qtc: 425, qrs: M.qrsNormal(), noise: 0.01 }),
  bradi: () => ({ rate: 44, pr: 200, qtc: 450, qrs: M.qrsNormal(), noise: 0.01 }),
  asistolia: () => ({ mode: 'continuous', noise: 0.012 }),
  paced: () => ({ mode: 'vt', vRate: 60, aRate: 0.5, vtQrs: M.qrsPaced(), vtT: { a: 150, g: 30, amp: 0.4 }, qtc: 440, noise: 0.01 })
};
const OPZ_RITMO = Object.keys(ARRESTO).map(k => [k, ARRESTO[k].nome + (ARRESTO[k].shock ? '' : ' \u00b7 non defibrillabile')]);

add({
  id: 'dae', cat: 'Arresto cardiaco', name: 'Defibrillatore manuale: eroga la scarica',
  params: [
    { k: 'ritmo', label: 'Ritmo dell\u2019arresto', type: 'select', def: 'fv', opts: OPZ_RITMO },
    { k: 'esito', label: 'Esito della scarica', type: 'select', def: 'sinusale', opts: [['sinusale', 'Ripresa del ritmo sinusale'], ['bradi', 'Ripresa con bradicardia'], ['asistolia', 'Asistolia dopo la scarica'], ['nulla', 'Aritmia che persiste']] },
    { k: 'j', label: 'Energia', unit: 'J', min: 120, max: 360, step: 20, def: 200 }
  ],
  build: p => Object.assign(ARRESTO[p.ritmo].cfg(), { noise: 0.014 }),
  defib: { tipo: 'manuale' },
  look: ['II', 'V1'],
  card: {
    def: 'Tracciato comandato: scegli il ritmo dell\u2019arresto, premi Scarica e guarda che cosa succede. Sui ritmi defibrillabili la scarica pu\u00f2 interrompere l\u2019aritmia; sugli altri produce solo l\u2019artefatto.',
    criteri: [
      'Ritmi defibrillabili: fibrillazione ventricolare, tachicardia ventricolare senza polso, flutter ventricolare, torsione di punta',
      'Ritmi non defibrillabili: asistolia, attivit\u00e0 elettrica senza polso, ritmo agonico',
      'La scarica sul tracciato: deflessione fuori scala, poi qualche decimo di secondo di tracciato muto per saturazione dell\u2019amplificatore, poi deriva lenta della linea di base',
      'Defibrillazione in onda bifasica: energia secondo le indicazioni del costruttore, di regola 150-200 J alla prima scarica e pari o superiore alle successive',
      'Dopo la scarica si riprendono subito le compressioni per due minuti senza fermarsi a controllare il ritmo',
      'Adrenalina 1 mg subito nei ritmi non defibrillabili, dopo la terza scarica nei defibrillabili; amiodarone 300 mg dopo la terza scarica'
    ],
    guarda: 'DII per il ritmo, la striscia lunga per l\u2019artefatto e per quello che compare dopo.',
    meccanismo: 'La scarica attraversa il miocardio e depolarizza contemporaneamente tutte le cellule eccitabili: i fronti d\u2019onda che si rincorrevano nella fibrillazione si estinguono tutti insieme, e se resta tessuto vitale il nodo del seno pu\u00f2 riprendere il comando. Nell\u2019asistolia non c\u2019\u00e8 nessun fronte d\u2019onda da interrompere: non c\u2019\u00e8 niente da defibrillare.',
    vettori: 'Durante l\u2019artefatto la vista 3D non ha significato: il segnale non viene dal cuore, viene dal defibrillatore.',
    dd: [
      'Artefatto da movimento o da compressioni toraciche (irregolare, senza il salto fuori scala iniziale)',
      'Distacco di elettrodo (linea piatta improvvisa in una sola derivazione)',
      'Fibrillazione ventricolare a onde fini scambiata per asistolia: alza il guadagno e cambia derivazione prima di decidere'
    ],
    trappole: 'La trappola sta tutta qui: premere il pulsante sull\u2019asistolia. Non succede nulla, si perde tempo di compressioni e si interrompe il massaggio. L\u2019asistolia si tratta con compressioni e adrenalina.',
    fonte: SRC.als
  }
});

add({
  id: 'icd', cat: 'Stimolazione', name: 'Defibrillatore impiantabile: intervento automatico',
  params: [
    { k: 'ritmo', label: 'Ritmo rilevato', type: 'select', def: 'fv', opts: OPZ_RITMO },
    { k: 'terapia', label: 'Terapia del dispositivo', type: 'select', def: 'auto', opts: [['auto', 'Automatica secondo il ritmo'], ['atp', 'Solo stimolazione antitachicardica'], ['shock', 'Solo scarica']] }
  ],
  build: p => Object.assign(ARRESTO[p.ritmo].cfg(), { noise: 0.012 }),
  defib: { tipo: 'automatico' },
  look: ['II', 'V1'],
  card: {
    def: 'Lo stesso arresto visto da dentro: il dispositivo impiantato riconosce l\u2019aritmia, la conferma, carica e interviene da solo. Qui non c\u2019\u00e8 nessun pulsante da premere, si guarda e basta.',
    criteri: [
      'Riconoscimento per frequenza, con zone programmate: zona di tachicardia ventricolare e zona di fibrillazione',
      'Conferma su un numero di intervalli consecutivi prima di erogare, per non trattare aritmie che si esauriscono da sole',
      'Stimolazione antitachicardica: una salva di impulsi leggermente pi\u00fa rapida della tachicardia, che entra nel circuito di rientro e lo interrompe senza dolore',
      'Se la stimolazione antitachicardica fallisce o il ritmo \u00e8 la fibrillazione, il condensatore si carica in alcuni secondi e viene erogata la scarica',
      'Dopo la scarica il dispositivo stimola di supporto se il ritmo sottostante \u00e8 lento',
      'Sui ritmi non defibrillabili il dispositivo non eroga scariche: al massimo stimola'
    ],
    guarda: 'La striscia lunga: prima l\u2019aritmia, poi la salva di stimoli oppure l\u2019artefatto della scarica, poi il ritmo che ne esce.',
    meccanismo: 'La stimolazione antitachicardica funziona perch\u00e9 il rientro ha una finestra eccitabile: stimolando appena pi\u00fa veloce, il fronte artificiale entra nel circuito, lo trova refrattario davanti e lo spegne. Se invece l\u2019attivazione \u00e8 caotica, come nella fibrillazione, non c\u2019\u00e8 nessun circuito da catturare e serve la scarica.',
    vettori: 'Durante la stimolazione antitachicardica il vettore \u00e8 quello di un battito stimolato: parte dalla punta del ventricolo destro e va in alto a sinistra.',
    dd: [
      'Scarica appropriata (aritmia ventricolare vera) contro inappropriata (fibrillazione atriale a risposta rapida, tachicardia sinusale, disturbi di segnale dall\u2019elettrocatetere)',
      'Tempesta aritmica: tre o pi\u00fa interventi appropriati in ventiquattro ore',
      'Rumore da frattura dell\u2019elettrocatetere: intervalli brevissimi e non fisiologici, spesso non riproducibili'
    ],
    trappole: 'Una scarica non dimostra che ci fosse un\u2019aritmia maligna: le scariche inappropriate sono frequenti e vanno cercate interrogando il dispositivo, non dedotte dal racconto del paziente.',
    fonte: SRC.va
  }
});

const CATS = ['Ritmo sinusale', 'Nodo del seno e scappamenti', 'Sopraventricolari', 'Blocchi AV', 'Conduzione intraventricolare', 'Ventricolari', 'Arresto cardiaco', 'Stimolazione', 'Ischemia', 'Ipertrofie', VALV, COMB, 'Elettroliti e altro'];

/* ==================== VERSIONE SENZA I RIFERIMENTI AL CORSO ====================
   Con window.ISO_SOLO_LINEE_GUIDA = true (una riga in index.html) la libreria
   perde tutto ciò che è legato al corso di Torino e al manuale adottato, e
   resta appoggiata soltanto alle linee guida internazionali, che sono citabili
   da chiunque. Non si cancella niente dal sorgente: si filtra alla lettura,
   così la versione di studio e quella pubblicabile vengono dallo stesso file. */
function soloLineeGuida() {
  const VIA = ['corso', 'slide', 'corsoFonte', 'manuale', 'libro', 'diff'];
  S.forEach(sc => { if (sc.card) VIA.forEach(k => { delete sc.card[k]; }); });
  const CAPITOLI_FUORI = ['corso', 'altrelezioni'];
  for (let i = THEORY.length - 1; i >= 0; i--) if (CAPITOLI_FUORI.indexOf(THEORY[i].id) >= 0) THEORY.splice(i, 1);
  const NOMI = /Gaita|Leclercq|Mulatero/;
  THEORY.forEach((t, i) => {
    t.title = t.title.replace(/^\d+\.\s*/, (i + 1) + '. ');
    t.html = t.html
      .replace(/<p class="note">(?:(?!<\/p>)[\s\S])*?(?:Gaita|Leclercq|Mulatero)(?:(?!<\/p>)[\s\S])*?<\/p>/g, '')
      .replace(/<li>(?:(?!<\/li>)[\s\S])*?(?:Gaita|Leclercq|Mulatero)(?:(?!<\/li>)[\s\S])*?<\/li>/g, '');
    if (NOMI.test(t.html)) t.html = t.html.split('\n').filter(r => !NOMI.test(r)).join('\n');
  });
  // l'atlante è fatto di fotografie delle slide del corso: fuori anche quello,
  // insieme ai tracciati che ne sono stati ricavati
  ATLAS.length = 0; ATLAS_G.length = 0;
}
if (root.ISO_SOLO_LINEE_GUIDA === true) soloLineeGuida();

const API = { SCENARIOS: S, THEORY, CATS, ATLAS, ATLAS_G };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_DATA = API;
})(typeof window !== 'undefined' ? window : this);
