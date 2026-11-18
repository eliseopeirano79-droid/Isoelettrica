/* Isoelettrica — Casi clinici: seconda serie (v47).
   File di soli dati: aggiunge casi e fonti a ISO_CASI_DATI senza toccare casi-dati.js.
   Stesso schema di casi-dati.js. Ogni dose o soglia è stata controllata sulla fonte citata nel passaggio.
   Simulazione didattica: non sostituisce protocolli locali né il giudizio clinico. */
(function (root) {
'use strict';
const API = (typeof module !== 'undefined' && module.exports) ? require('./casi-dati.js') : root.ISO_CASI_DATI;
if (!API) return;

Object.assign(API.FONTI, {
  'rcuk-sc-2025': { t: 'Resuscitation Council UK 2025 — Circostanze speciali (adattamento delle linee guida ERC 2025)', r: 'Deakin C et al. Pubblicato il 27 ottobre 2025', u: 'https://www.resus.org.uk/professional-library/2025-resuscitation-guidelines/special-circumstances-guidelines' },
  'aha-ecg-2007': { t: 'AHA/ACC/HRS 2007 — Standardizzazione dell’ECG, parte I: tecnologia', r: 'Kligfield P et al. Circulation 2007;115:1306–1324', u: 'https://doi.org/10.1161/CIRCULATIONAHA.106.180200' }
});

const VIGILE = { post: 'semi', cute: 'norm', cosc: 'vigile', polso: true };
const ARRESTO = { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false };

const NUOVI = [
/* ------------------------------------------------------------------ 16 */
{
  id: 'stemi-inferiore-vd', titolo: 'Nausea, sudorazione e polso lento', tag: 'Ischemia', livello: 2, minuti: 7,
  paziente: { sesso: 'F', eta: 71 },
  intro: 'Donna di 71 anni, diabetica. Da un’ora dolore epigastrico con nausea e sudorazione fredda. È pallida, il polso è lento. Pressione 85/55 mmHg. Campi polmonari liberi.',
  stati: {
    arrivo: { ecg: ['stemi-inf-bav3', { hr: 84, st: 3 }], pa: '85/55', spo2: 96, fr: 20, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Pallida, sudata, nauseata. Polso lento.' },
    crollo: { ecg: ['stemi-inf-bav3', { hr: 70, st: 4 }], pa: '60/35', spo2: 94, fr: 24, pz: { post: 'supino', cute: 'pallido', sudore: true, cosc: 'confuso', polso: true }, txt: 'Dopo il vasodilatatore la pressione crolla. È confusa.' },
    riperfusa: { ecg: ['stemi-inferiore', { fase: '2', st: 1, hr: 74 }], pa: '115/70', spo2: 97, fr: 16, pz: VIGILE, txt: 'Dopo l’angioplastica: conduzione 1:1, dolore scomparso.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Dove si trova il sopraslivellamento del tratto ST?',
      opz: [
        { t: 'In DII, DIII e aVF, con sottoslivellamento in DI e aVL', v: 'ok', f: 'Sì: territorio inferiore, con alterazioni reciproche nelle laterali alte.' },
        { t: 'Nelle precordiali V1–V4', v: 'no', f: 'Quello è il territorio anteriore. Qui le precordiali non sono sopraslivellate.' },
        { t: 'In tutte le derivazioni, concavo', v: 'no', f: 'Un sopraslivellamento diffuso senza reciprocità fa pensare alla pericardite. Qui DI e aVL sono sottoslivellate.' }
      ],
      perche: 'Il dolore epigastrico con nausea è una presentazione frequente dell’infarto inferiore. Il sopraslivellamento in DII, DIII e aVF con reciprocità in DI e aVL indica un’occlusione coronarica acuta, più spesso della coronaria destra.', fonte: ['esc-acs-2023'] },
    { tipo: 'Ritmo', q: 'Ora guarda le onde P e i QRS. Che rapporto hanno?',
      opz: [
        { t: 'Nessuno: le P hanno la loro frequenza, i QRS un’altra più lenta', v: 'ok', f: 'Corretto: è una dissociazione atrio-ventricolare completa, cioè un blocco AV di III grado. Lo scappamento è a QRS stretto, quindi giunzionale.' },
        { t: 'Ogni P è seguita da un QRS, con PR lungo', v: 'no', f: 'Sarebbe un blocco di I grado. Qui il PR cambia a ogni battito: le P “camminano” attraverso i QRS.' },
        { t: 'Non ci sono onde P: è una fibrillazione atriale lenta', v: 'no', f: 'Le P ci sono e sono regolari. E i QRS sono regolari: nella fibrillazione atriale non lo sarebbero.' }
      ],
      perche: 'La coronaria destra irrora quasi sempre il nodo AV: per questo l’infarto inferiore si complica spesso con un blocco AV. Il blocco è nel nodo, lo scappamento è giunzionale e stretto, e di solito regredisce con la riperfusione.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'Ipotesa, con campi polmonari liberi e infarto inferiore. Quale registrazione aggiungi subito?',
      opz: [
        { t: 'Le derivazioni destre V3R e V4R', v: 'ok', f: 'Corretto: un sopraslivellamento in V3R–V4R indica il coinvolgimento del ventricolo destro, che spiega l’ipotensione senza congestione polmonare.' },
        { t: 'Nessuna: le 12 derivazioni standard bastano sempre', v: 'no', f: 'Le 12 derivazioni non esplorano né il ventricolo destro né la parete posteriore.' },
        { t: 'Un ECG da sforzo', v: 'grave', f: 'In un infarto in corso la prova da sforzo è controindicata.' }
      ],
      perche: 'Nell’infarto inferiore le linee guida ESC 2023 raccomandano le derivazioni aggiuntive V3R, V4R e V7–V9 (classe I). Il sopraslivellamento in V3R–V4R identifica l’infarto del ventricolo destro.', fonte: ['esc-acs-2023'] },
    { tipo: 'Decisione', q: 'V4R è sopraslivellata. Un collega propone nitroglicerina sublinguale per il dolore. Che cosa rispondi?',
      opz: [
        { t: 'No: è ipotesa e ha un infarto del ventricolo destro', v: 'ok', f: 'Corretto. Il ventricolo destro infartuato dipende dal riempimento: un vasodilatatore venoso gli toglie il precarico e fa crollare la gittata.' },
        { t: 'Sì, subito: riduce il lavoro del cuore', v: 'grave', f: 'Con pressione sistolica di 85 mmHg e ventricolo destro infartuato il nitrato può provocare un collasso.', cons: 'crollo' },
        { t: 'Sì, ma dopo un beta-bloccante endovena', v: 'grave', f: 'Beta-bloccante endovena con blocco AV completo e ipotensione: due controindicazioni insieme.', cons: 'crollo' }
      ],
      perche: 'I nitrati non vanno somministrati in presenza di ipotensione o di infarto del ventricolo destro, né dopo inibitori della fosfodiesterasi 5 nelle 48 ore precedenti.', fonte: ['esc-acs-2023'] },
    { tipo: 'Terapia', q: 'L’emodinamica è disponibile entro 30 minuti. Come gestisci infarto e blocco?',
      opz: [
        { t: 'Angioplastica primaria subito; atropina 500 µg se la bradicardia resta instabile, stimolazione pronta', v: 'ok', f: 'Corretto. Riaprire la coronaria è anche la terapia del blocco. Qui lo scappamento è stretto: l’atropina può funzionare, perché il blocco è nel nodo.' },
        { t: 'Impianto immediato di pacemaker definitivo, poi la coronarografia', v: 'no', f: 'Il blocco dell’infarto inferiore è spesso transitorio. Il pacemaker definitivo si valuta solo se il blocco di alto grado non regredisce nei giorni successivi.' },
        { t: 'Fibrinolisi, perché è più rapida', v: 'no', f: 'Con un’angioplastica eseguibile entro 120 minuti dalla diagnosi, la strategia raccomandata è l’angioplastica primaria.' }
      ],
      perche: 'STEMI: angioplastica primaria se eseguibile entro 120 minuti dalla diagnosi. Bradicardia instabile: atropina 500 µg ripetibile fino a 3 mg, poi stimolazione. Pacemaker definitivo se il blocco AV di alto grado non si risolve entro 5 giorni dall’infarto.', fonte: ['esc-acs-2023', 'erc-als-2025'], anim: 'ev', dopo: 'riperfusa' }
  ],
  chiave: ['Infarto inferiore: cerca sempre blocco AV e ventricolo destro.', 'V3R–V4R e V7–V9 in ogni infarto inferiore.', 'Ipotensione senza congestione: pensa al ventricolo destro, niente nitrati.', 'La riperfusione è anche la terapia del blocco.']
},
/* ------------------------------------------------------------------ 17 */
{
  id: 'stemi-posteriore', titolo: 'Dolore toracico e ST che scende', tag: 'Ischemia', livello: 2, minuti: 5,
  paziente: { sesso: 'M', eta: 63 },
  intro: 'Uomo di 63 anni, dislipidemico. Dolore toracico oppressivo da 50 minuti, irradiato alla schiena. Il primo ECG viene refertato in triage come “sottoslivellamento anteriore”.',
  stati: {
    arrivo: { ecg: ['stemi-posteriore', { fase: '1', st: 3, hr: 88 }], pa: '135/85', spo2: 97, fr: 18, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Sofferente, sudato, mano al petto.' },
    peggio: { ecg: ['stemi-posteriore', { fase: '1', st: 4, hr: 104 }], pa: '100/65', spo2: 95, fr: 22, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Un’ora dopo: il dolore non passa, la pressione scende.' },
    riperfuso: { ecg: ['stemi-posteriore', { fase: '2', st: 1, hr: 76 }], pa: '125/78', spo2: 98, fr: 15, pz: VIGILE, txt: 'Dopo l’angioplastica della circonflessa: dolore scomparso.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa vedi in V1–V3?',
      opz: [
        { t: 'ST sottoslivellato orizzontale, R alta e T positiva', v: 'ok', f: 'Esatto. È un’immagine “allo specchio”: R alta al posto dell’onda Q, ST giù al posto di ST su, T positiva al posto della T invertita.' },
        { t: 'ST sopraslivellato convesso', v: 'no', f: 'In V1–V3 il tratto ST è sotto la linea isoelettrica.' },
        { t: 'Blocco di branca destra', v: 'no', f: 'La R alta in V1 c’è, ma il QRS è stretto e manca la S larga in DI e V6.' }
      ],
      perche: 'Nessuna derivazione standard guarda direttamente la parete posteriore: V1–V3 la vedono dal lato opposto e ne registrano l’immagine speculare.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'Come confermi il sospetto?',
      opz: [
        { t: 'Registro V7, V8 e V9 sulla schiena', v: 'ok', f: 'Corretto: un sopraslivellamento di almeno 0,5 mm in V7–V9 conferma l’infarto posteriore.' },
        { t: 'Aspetto due troponine a distanza di tre ore', v: 'grave', f: 'Aspettare la troponina con un’occlusione coronarica in corso significa perdere miocardio.', cons: 'peggio' },
        { t: 'Ripeto l’ECG standard a velocità doppia', v: 'no', f: 'Cambiare velocità non aggiunge derivazioni: serve guardare la parete da dietro.' }
      ],
      perche: 'Sottoslivellamento ST in V1–V3 con T terminale positiva è un equivalente di sopraslivellamento; la conferma è un sopraslivellamento ≥ 0,5 mm in V7–V9.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'V7–V9 mostrano 1 mm di sopraslivellamento. Come classifichi il quadro?',
      opz: [
        { t: 'Infarto con sopraslivellamento ST della parete posteriore', v: 'ok', f: 'Corretto. L’arteria colpevole è più spesso la circonflessa, a volte la coronaria destra.' },
        { t: 'Infarto senza sopraslivellamento: basta la terapia medica', v: 'grave', f: 'È l’errore tipico: il sottoslivellamento anteriore viene letto come NSTEMI e l’occlusione non viene riaperta in tempo.', cons: 'peggio' },
        { t: 'Ischemia subendocardica da ipertensione', v: 'no', f: 'Con dolore tipico e sopraslivellamento posteriore la diagnosi è un’occlusione coronarica acuta.' }
      ],
      perche: 'L’infarto posteriore è un’occlusione coronarica acuta che l’ECG standard mostra solo indirettamente: va trattato come ogni STEMI.', fonte: ['esc-acs-2023'] },
    { tipo: 'Decisione', q: 'Il centro con emodinamica è a 40 minuti. Che cosa fai?',
      opz: [
        { t: 'Attivo la rete per angioplastica primaria e trasferisco subito', v: 'ok', f: 'Corretto: l’angioplastica è eseguibile entro 120 minuti dalla diagnosi.' },
        { t: 'Fibrinolisi sul posto, poi rivaluto', v: 'no', f: 'La fibrinolisi è l’alternativa quando l’angioplastica non è eseguibile entro 120 minuti. Qui lo è.' },
        { t: 'Ricovero in osservazione e coronarografia entro 72 ore', v: 'grave', f: 'È una strategia per quadri a basso rischio, non per un’occlusione in atto.', cons: 'peggio' }
      ],
      perche: 'STEMI: angioplastica primaria immediata; se non eseguibile entro 120 minuti dalla diagnosi, fibrinolisi.', fonte: ['esc-acs-2023'], anim: 'ev', dopo: 'riperfuso' }
  ],
  chiave: ['ST giù in V1–V3 con R alta e T positiva: guarda la schiena.', 'V7–V9 ≥ 0,5 mm: infarto posteriore.', 'È uno STEMI: riperfusione immediata.', 'Non chiamarlo NSTEMI solo perché l’ST scende.']
},
/* ------------------------------------------------------------------ 18 */
{
  id: 'nstemi-diffuso', titolo: 'ST giù ovunque, su solo in aVR', tag: 'Ischemia', livello: 3, minuti: 6,
  paziente: { sesso: 'F', eta: 74 },
  intro: 'Donna di 74 anni, ipertesa e diabetica. Dolore toracico a riposo da due ore, che non è passato con la terapia iniziale. È pallida e tachicardica, la pressione è 95/60 mmHg.',
  stati: {
    arrivo: { ecg: ['nstemi', { terr: 'diffuso', st: 3, hr: 106 }], pa: '95/60', spo2: 94, fr: 22, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Dolore persistente, pallida, tachicardica.' },
    peggio: { ecg: ['nstemi', { terr: 'diffuso', st: 4, hr: 118 }], pa: '80/50', spo2: 91, fr: 26, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'confuso', mano: true, polso: true, o2: true }, txt: 'Ore dopo: ipotesa, confusa, dispnoica.' },
    trattata: { ecg: ['nstemi', { terr: 'diffuso', st: 0.5, hr: 82 }], pa: '120/70', spo2: 97, fr: 16, pz: VIGILE, txt: 'Dopo la rivascolarizzazione: dolore scomparso.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Come descrivi il tratto ST?',
      opz: [
        { t: 'Sottoslivellato in almeno sei derivazioni, sopraslivellato in aVR', v: 'ok', f: 'Esatto. Conta le derivazioni: quando il sottoslivellamento è diffuso, guarda sempre aVR.' },
        { t: 'Sopraslivellato in un solo territorio coronarico', v: 'no', f: 'Qui non c’è un territorio: il sottoslivellamento è ovunque e l’unica derivazione che sale è aVR.' },
        { t: 'Normale', v: 'no', f: 'Il punto J è sotto la linea isoelettrica in quasi tutte le derivazioni.' }
      ],
      perche: 'aVR guarda la cavità del ventricolo sinistro dalla spalla destra: sale quando l’ischemia interessa tutto il subendocardio.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'Che cosa suggerisce questo quadro?',
      opz: [
        { t: 'Ischemia di più vasi o ostruzione del tronco comune', v: 'ok', f: 'Corretto, soprattutto quando si accompagna a compromissione emodinamica, come qui.' },
        { t: 'Pericardite acuta', v: 'no', f: 'Nella pericardite l’ST è sopraslivellato in modo diffuso e sottoslivellato in aVR: l’opposto.' },
        { t: 'Un reperto aspecifico dell’età', v: 'grave', f: 'Con dolore in corso è uno dei quadri a rischio più alto.', cons: 'peggio' }
      ],
      perche: 'Sottoslivellamento ST ≥ 1 mm in sei o più derivazioni con sopraslivellamento in aVR e/o V1 suggerisce ischemia multivasale o ostruzione del tronco comune, in particolare se c’è compromissione emodinamica.', fonte: ['esc-acs-2023'] },
    { tipo: 'Decisione', q: 'Dolore refrattario e pressione in calo. Quando la coronarografia?',
      opz: [
        { t: 'Immediata: è una paziente a rischio molto alto', v: 'ok', f: 'Corretto. Dolore refrattario alla terapia e instabilità emodinamica sono criteri di rischio molto alto.' },
        { t: 'Entro 24 ore', v: 'no', f: 'È la tempistica da considerare per i criteri di rischio alto. Qui i criteri sono di rischio molto alto.' },
        { t: 'Fibrinolisi, perché l’ECG è molto alterato', v: 'grave', f: 'La fibrinolisi è riservata all’infarto con sopraslivellamento ST quando l’angioplastica non è tempestiva. Senza sopraslivellamento non è indicata.', cons: 'peggio' }
      ],
      perche: 'Sindrome coronarica acuta senza sopraslivellamento con criteri di rischio molto alto (instabilità emodinamica o shock, dolore ricorrente o refrattario, scompenso acuto, aritmie minacciose, complicanze meccaniche, alterazioni ECG dinamiche ricorrenti): strategia invasiva immediata.', fonte: ['esc-acs-2023'] },
    { tipo: 'Terapia', q: 'In attesa della sala, quale terapia antitrombotica imposti?',
      opz: [
        { t: 'Aspirina in dose di carico e anticoagulante parenterale; l’inibitore P2Y12 dopo aver visto le coronarie', v: 'ok', f: 'Corretto: quando l’anatomia coronarica non è nota e la coronarografia è precoce, il pretrattamento di routine con inibitore P2Y12 non è raccomandato.' },
        { t: 'Aspirina, inibitore P2Y12 e inibitore della glicoproteina IIb/IIIa a tutti, subito', v: 'no', f: 'Il pretrattamento di routine con inibitore P2Y12 non è raccomandato se la coronarografia è precoce; gli inibitori IIb/IIIa non si danno ad anatomia sconosciuta.' },
        { t: 'Nessun antitrombotico finché non arriva la troponina', v: 'grave', f: 'La terapia antitrombotica è indicata in tutte le sindromi coronariche acute, senza attendere la troponina.', cons: 'peggio' }
      ],
      perche: 'Aspirina in carico (150–300 mg per bocca) e anticoagulante parenterale per tutti. Il pretrattamento di routine con inibitore P2Y12 non è raccomandato quando l’anatomia coronarica non è nota ed è prevista una strategia invasiva precoce (classe III).', fonte: ['esc-acs-2023'], anim: 'ev', dopo: 'trattata' }
  ],
  chiave: ['ST giù in sei o più derivazioni: guarda aVR.', 'aVR su: più vasi o tronco comune.', 'Dolore refrattario o instabilità: coronarografia immediata.', 'Senza sopraslivellamento la fibrinolisi non è indicata.']
},
/* ------------------------------------------------------------------ 19 */
{
  id: 'de-winter', titolo: 'T altissime e nessun ST sopra', tag: 'Ischemia', livello: 3, minuti: 5,
  paziente: { sesso: 'M', eta: 52 },
  intro: 'Uomo di 52 anni, fumatore. Dolore retrosternale intenso da 30 minuti. L’interpretazione automatica dell’elettrocardiografo dice: “Nessun sopraslivellamento ST”.',
  stati: {
    arrivo: { ecg: ['dewinter', { hr: 86 }], pa: '140/90', spo2: 97, fr: 19, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Sofferente, sudato, mano al petto.' },
    peggio: { ecg: ['dewinter', { hr: 110 }], pa: '100/65', spo2: 94, fr: 24, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Un’ora dopo: dolore invariato, tachicardico, pressione in calo.' },
    riperfuso: { ecg: ['normale', { hr: 78 }], pa: '125/80', spo2: 98, fr: 15, pz: VIGILE, txt: 'Dopo l’angioplastica della discendente anteriore: dolore scomparso.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa vedi nelle precordiali?',
      opz: [
        { t: 'ST sottoslivellato al punto J che risale ripido verso T alte e simmetriche', v: 'ok', f: 'Esatto: il tratto ST parte sotto la linea e sale subito in una T alta. Guarda anche aVR: spesso è lievemente sopraslivellata.' },
        { t: 'T alte e appuntite con base stretta, QRS largo', v: 'no', f: 'È la descrizione dell’iperkaliemia. Qui il QRS è stretto e l’ST parte sotto la linea isoelettrica.' },
        { t: 'Un tracciato normale', v: 'grave', f: 'T così alte dopo un ST sottoslivellato, con dolore in corso, non sono normali.', cons: 'peggio' }
      ],
      perche: 'L’interpretazione automatica cerca il sopraslivellamento: questo quadro non ne ha, e per questo sfugge.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'Che significato ha questo quadro in un paziente con dolore?',
      opz: [
        { t: 'Occlusione acuta della discendente anteriore prossimale', v: 'ok', f: 'Corretto: è il quadro di de Winter, un equivalente dell’infarto anteriore con sopraslivellamento.' },
        { t: 'Ischemia subendocardica da trattare con sola terapia medica', v: 'grave', f: 'Il sottoslivellamento qui non indica un’ischemia “minore”: l’arteria è chiusa.', cons: 'peggio' },
        { t: 'Ripolarizzazione precoce', v: 'no', f: 'Nella ripolarizzazione precoce il punto J è sopraslivellato, non sottoslivellato, e il paziente non ha dolore.' }
      ],
      perche: 'Le linee guida ESC 2023 elencano il quadro di de Winter fra i reperti ECG che, in presenza di sintomi ischemici, devono indirizzare alla riperfusione immediata.', fonte: ['esc-acs-2023'] },
    { tipo: 'Decisione', q: 'La troponina è in corso. Che cosa fai?',
      opz: [
        { t: 'Attivo subito l’emodinamica', v: 'ok', f: 'Corretto: si tratta come uno STEMI, senza attendere il laboratorio.' },
        { t: 'Aspetto che compaia il sopraslivellamento per avere la conferma', v: 'grave', f: 'Il quadro può restare così per tutto il tempo dell’occlusione: aspettare un sopraslivellamento che non arriva significa perdere miocardio.', cons: 'peggio' },
        { t: 'Aspetto la troponina a un’ora', v: 'grave', f: 'Gli algoritmi con troponina servono a chi non ha indicazione alla coronarografia immediata.', cons: 'peggio' }
      ],
      perche: 'Diagnosi operativa di infarto con occlusione coronarica: strategia di riperfusione immediata, indipendentemente dalla troponina.', fonte: ['esc-acs-2023'], anim: 'ev', dopo: 'riperfuso' },
    { tipo: 'Ragionamento', q: 'Quale altra condizione dà T alte e va sempre esclusa?',
      opz: [
        { t: 'L’iperkaliemia', v: 'ok', f: 'Corretto. Nell’iperkaliemia le T sono strette e “a tenda” in molte derivazioni, senza sottoslivellamento al punto J, e spesso con P appiattite e QRS che si allarga.' },
        { t: 'L’ipokaliemia', v: 'no', f: 'L’ipokaliemia appiattisce le T e fa comparire le onde U.' },
        { t: 'L’ipotiroidismo', v: 'no', f: 'Dà bassi voltaggi e bradicardia, non T alte.' }
      ],
      perche: 'T alte: prima domanda, c’è dolore? Seconda, com’è il potassio? L’iperkaliemia grave con alterazioni ECG ha un trattamento proprio e immediato.', fonte: ['erc-sc-2025'] }
  ],
  chiave: ['ST giù al punto J che sale in T alte: de Winter.', 'Equivale a un’occlusione della discendente anteriore.', 'Emodinamica subito, senza troponina.', 'T alte senza dolore: pensa al potassio.']
},
/* ------------------------------------------------------------------ 20 */
{
  id: 'ipokaliemia', titolo: 'Debolezza e palpitazioni dopo il diuretico', tag: 'Elettroliti', livello: 2, minuti: 6,
  paziente: { sesso: 'F', eta: 68 },
  intro: 'Donna di 68 anni con scompenso cardiaco. Da dieci giorni ha aumentato da sola il diuretico dell’ansa; da tre ha diarrea. Riferisce debolezza alle gambe, crampi e “tuffi al cuore”.',
  stati: {
    arrivo: { ecg: ['ipok', { k: 2.3, hr: 88 }], pa: '110/70', spo2: 97, fr: 17, pz: VIGILE, txt: 'Vigile, astenica. Extrasistoli al polso.' },
    torsione: { ecg: ['tdp', { r: 230 }], fc: '—', pa: '70/40', spo2: 92, fr: 22, pz: { post: 'supino', cute: 'pallido', cosc: 'confuso', polso: true, piastre: true }, txt: 'Improvviso malessere, quasi sincope. Polso debole e rapidissimo.' },
    meglio: { ecg: ['ipok', { k: 3.3, hr: 78 }], pa: '118/72', spo2: 98, fr: 15, pz: VIGILE, txt: 'Dopo magnesio e potassio: nessuna recidiva.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa noti nella ripolarizzazione?',
      opz: [
        { t: 'T appiattite, ST sottoslivellato e un’onda in più dopo la T', v: 'ok', f: 'Esatto: quell’onda è l’onda U. Si vede meglio in V2–V3. Quando si fonde con la T, il QT sembra lunghissimo.' },
        { t: 'T alte e appuntite', v: 'no', f: 'È il segno dell’iperkaliemia: qui le T sono basse.' },
        { t: 'ST sopraslivellato in un territorio', v: 'no', f: 'Il tratto ST è sottoslivellato e in modo diffuso.' }
      ],
      perche: 'Quando il potassio scende, la ripolarizzazione si allunga e si “sgonfia”: T basse, ST giù, onde U. L’entità delle alterazioni non è proporzionale al valore del potassio.', fonte: ['erc-sc-2025'] },
    { tipo: 'Diagnosi', q: 'Quale esame chiedi per primo e quale risultato ti aspetti?',
      opz: [
        { t: 'Potassio basso; e chiedo anche il magnesio', v: 'ok', f: 'Corretto: potassio 2,3 mmol/L. Diuretici e diarrea fanno perdere anche magnesio, e senza magnesio il potassio non risale.' },
        { t: 'Troponina alta', v: 'no', f: 'Il sottoslivellamento è diffuso, senza dolore e con onde U: prima gli elettroliti.' },
        { t: 'Calcio alto', v: 'no', f: 'L’ipercalcemia accorcia il QT; qui la ripolarizzazione è allungata.' }
      ],
      perche: 'Diuretico dell’ansa più perdite intestinali: la causa più comune di ipokaliemia. Il magnesio va dosato e corretto insieme al potassio.', fonte: ['rcuk-sc-2025', 'erc-sc-2025'] },
    { tipo: 'Terapia', q: 'Potassio 2,3 mmol/L, alterazioni ECG ed extrasistoli. Come lo correggi?',
      opz: [
        { t: 'Potassio endovena in infusione controllata con monitor ECG, e magnesio insieme', v: 'ok', f: 'Corretto. La velocità dipende da gravità, sintomi e ECG, e si segue il protocollo del reparto; il potassio si ricontrolla durante l’infusione.' },
        { t: 'Bolo rapido di 20 mmol di cloruro di potassio in due minuti', v: 'grave', f: 'Il bolo rapido è previsto solo nell’arresto cardiaco da ipokaliemia. In un paziente con circolo può provocare un’aritmia fatale.', cons: 'torsione' },
        { t: 'Solo una dieta ricca di potassio e controllo fra una settimana', v: 'grave', f: 'Con alterazioni ECG ed extrasistoli il rischio aritmico è immediato.', cons: 'torsione' }
      ],
      perche: 'Il trattamento è guidato dalla gravità dell’ipokaliemia e dalla presenza di sintomi o alterazioni ECG; potassio e magnesio vanno corretti insieme. Solo nell’arresto da ipokaliemia: 20 mmol di cloruro di potassio in 2–3 minuti, poi 10 mmol in 2 minuti.', fonte: ['rcuk-sc-2025'], anim: 'ev' },
    { stato: 'torsione', tipo: 'Emergenza', q: 'Prima che l’infusione faccia effetto, il monitor cambia. La paziente ha polso ma è ipotesa. Che cosa fai?',
      opz: [
        { t: 'Magnesio solfato 2 g endovena; defibrillatore pronto', v: 'ok', f: 'Corretto: è una torsione di punta. Il magnesio si dà anche se la magnesiemia è normale. Se diventa sostenuta o perde il polso, defibrillazione.' },
        { t: 'Amiodarone 300 mg', v: 'grave', f: 'L’amiodarone allunga il QT: in una torsione di punta peggiora il substrato.' },
        { t: 'Aspetto: di solito passa da sola', v: 'no', f: 'Spesso si interrompe da sola, ma recidiva e può degenerare in fibrillazione ventricolare: il substrato va trattato subito.' }
      ],
      perche: 'Torsione di punta: magnesio endovena, correzione del potassio, sospensione dei farmaci che allungano il QT; se sostenuta o senza polso, defibrillazione.', fonte: ['esc-va-2022', 'erc-als-2025'], anim: 'ev', dopo: 'meglio' }
  ],
  chiave: ['T basse, ST giù, onde U: pensa al potassio.', 'Dosa e correggi anche il magnesio.', 'Infusione controllata con monitor; il bolo rapido solo in arresto.', 'QT lungo e tachicardia polimorfa: magnesio 2 g.']
},
/* ------------------------------------------------------------------ 21 */
{
  id: 'mobitz-2', titolo: 'Una sincope senza preavviso', tag: 'Conduzione', livello: 2, minuti: 5,
  paziente: { sesso: 'M', eta: 76 },
  intro: 'Uomo di 76 anni. Stamattina è caduto a terra all’improvviso, senza alcun sintomo premonitore, e si è ripreso in pochi secondi. Non assume farmaci che rallentano la conduzione. Ora è asintomatico.',
  stati: {
    arrivo: { ecg: ['mobitz2', { hr: 76, ratio: '3', qrs: 'rbbb' }], pa: '140/80', spo2: 97, fr: 15, pz: VIGILE, txt: 'Asintomatico. Escoriazione al sopracciglio.' },
    blocco: { ecg: ['bav3', { hr: 80, esc: 'ventricolare' }], pa: '80/45', spo2: 94, fr: 20, pz: { post: 'supino', cute: 'pallido', cosc: 'confuso', polso: true }, txt: 'A casa nuova sincope. Rientra con polso a 30 al minuto.' },
    stimolato: { ecg: ['pmddd', {}], pa: '130/78', spo2: 98, fr: 15, pz: VIGILE, txt: 'Dopo l’impianto del pacemaker.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa succede prima della pausa?',
      opz: [
        { t: 'Il PR resta uguale, poi una P non è seguita dal QRS', v: 'ok', f: 'Esatto: PR costante prima e dopo, e una P bloccata all’improvviso. È un blocco AV di II grado Mobitz 2.' },
        { t: 'Il PR si allunga battito dopo battito, poi una P non conduce', v: 'no', f: 'Sarebbe il Mobitz 1 (Wenckebach). Misura i PR: qui sono tutti uguali.' },
        { t: 'Manca anche l’onda P: è una pausa sinusale', v: 'no', f: 'La P c’è, puntuale: è il QRS che manca.' }
      ],
      perche: 'La differenza fra Mobitz 1 e Mobitz 2 sta tutta nel PR dei battiti condotti: progressivo nel primo, fisso nel secondo.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Ragionamento', q: 'I QRS condotti sono larghi, a blocco di branca destra. Che cosa ti dice sulla sede del blocco?',
      opz: [
        { t: 'È sotto il nodo AV, nel sistema di His-Purkinje', v: 'ok', f: 'Corretto. Un blocco così basso può diventare completo all’improvviso, con uno scappamento lento e inaffidabile.' },
        { t: 'È nel nodo AV, per ipertono vagale', v: 'no', f: 'Il blocco nodale dà di solito Mobitz 1 con QRS stretto, e migliora con lo sforzo.' },
        { t: 'Non dice nulla sulla sede', v: 'no', f: 'Il QRS largo indica che la malattia riguarda le branche: il blocco è sottonodale.' }
      ],
      perche: 'Mobitz 2 con QRS largo significa malattia del sistema di conduzione sotto il nodo. Fra i segni di rischio di asistolia ci sono proprio il blocco Mobitz 2, il blocco completo a QRS larghi, un’asistolia recente e le pause ventricolari oltre 3 secondi.', fonte: ['erc-als-2025'] },
    { tipo: 'Decisione', q: 'Ora sta bene e vorrebbe tornare a casa. Che cosa fai?',
      opz: [
        { t: 'Ricovero con monitor continuo e stimolazione pronta; cerco cause reversibili', v: 'ok', f: 'Corretto: sincope più Mobitz 2 è un blocco che ha già dato un’asistolia. Si monitora fino al pacemaker.' },
        { t: 'Lo dimetto con un Holter programmato fra un mese', v: 'grave', f: 'Il rischio è una nuova asistolia nelle ore successive, non fra un mese.', cons: 'blocco' },
        { t: 'Atropina a domicilio al bisogno', v: 'grave', f: 'L’atropina agisce sul nodo AV: in un blocco sottonodale non è affidabile, e non è una terapia domiciliare.', cons: 'blocco' }
      ],
      perche: 'Bradicardia con rischio di asistolia: monitoraggio continuo e stimolazione disponibile. Vanno escluse le cause reversibili: farmaci, ischemia, iperkaliemia.', fonte: ['erc-als-2025'] },
    { tipo: 'Terapia', q: 'Non emergono cause reversibili. Qual è il trattamento definitivo?',
      opz: [
        { t: 'Pacemaker definitivo', v: 'ok', f: 'Corretto: nel Mobitz 2 il pacemaker è indicato anche se il paziente non avesse avuto sintomi.' },
        { t: 'Pacemaker solo se le sincopi si ripetono', v: 'no', f: 'L’indicazione non dipende dai sintomi: dipende dal rischio di blocco completo improvviso.' },
        { t: 'Isoprenalina per bocca', v: 'no', f: 'Non esiste una terapia farmacologica cronica del blocco sottonodale.' }
      ],
      perche: 'Blocco AV di II grado tipo 2, di alto grado o di III grado, permanente o parossistico: stimolazione permanente indicata indipendentemente dai sintomi.', fonte: ['esc-pacing-2021'], anim: 'pacing', dopo: 'stimolato' }
  ],
  chiave: ['PR fisso e P bloccata all’improvviso: Mobitz 2.', 'QRS largo: blocco sotto il nodo, rischio di asistolia.', 'Sincope più Mobitz 2: monitor fino al pacemaker.', 'Pacemaker anche senza sintomi.']
},
/* ------------------------------------------------------------------ 22 */
{
  id: 'wenckebach-atleta', titolo: 'Un ECG “strano” alla visita sportiva', tag: 'Conduzione', livello: 1, minuti: 4,
  paziente: { sesso: 'M', eta: 24 },
  intro: 'Uomo di 24 anni, mezzofondista. ECG di routine per l’idoneità agonistica, registrato a riposo dopo dieci minuti sdraiato. Nessun sintomo, mai sincopi, nessuna familiarità per morte improvvisa.',
  stati: {
    arrivo: { ecg: ['wenck', { hr: 56, ratio: '4' }], pa: '115/70', spo2: 99, fr: 12, pz: VIGILE, txt: 'Asintomatico, tranquillo.' },
    sforzo: { ecg: ['normale', { hr: 98, pr: 170 }], pa: '130/75', spo2: 99, fr: 18, pz: VIGILE, txt: 'Dopo venti piegamenti: ogni P è seguita dal suo QRS.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Misura il PR battito per battito. Che cosa trovi?',
      opz: [
        { t: 'Si allunga a ogni battito finché una P non conduce, poi riparte corto', v: 'ok', f: 'Esatto: è la periodicità di Wenckebach, cioè il blocco AV di II grado Mobitz 1. I QRS si presentano “a gruppi”.' },
        { t: 'È sempre uguale, poi una P non conduce', v: 'no', f: 'Sarebbe un Mobitz 2. Confronta il PR prima della pausa con quello dopo: il secondo è nettamente più corto.' },
        { t: 'Non c’è relazione fra P e QRS', v: 'no', f: 'La relazione c’è e si ripete identica a ogni ciclo.' }
      ],
      perche: 'Il PR più breve è sempre quello dopo la pausa; la pausa dura meno di due cicli PP. Sono i due controlli rapidi per riconoscere il Mobitz 1.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Ragionamento', q: 'QRS stretto, atleta, a riposo. Dov’è il blocco e perché?',
      opz: [
        { t: 'Nel nodo AV, per l’ipertono vagale dell’allenamento', v: 'ok', f: 'Corretto: il nodo AV è molto sensibile al vago. È lo stesso motivo della bradicardia sinusale dell’atleta.' },
        { t: 'Sotto il nodo, per una malattia delle branche', v: 'no', f: 'Con QRS stretto e questo contesto la sede è nodale.' },
        { t: 'Nell’atrio, per un blocco seno-atriale', v: 'no', f: 'Nel blocco seno-atriale manca l’onda P. Qui la P c’è e non conduce.' }
      ],
      perche: 'Il Mobitz 1 nasce di solito nel nodo AV e raramente progredisce a blocco avanzato.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Decisione', q: 'Come lo verifichi nel modo più semplice?',
      opz: [
        { t: 'Gli faccio fare un breve sforzo e ripeto il tracciato', v: 'ok', f: 'Corretto: togliendo il vago e aggiungendo il simpatico, un blocco nodale funzionale scompare.' },
        { t: 'Lo ricovero in unità coronarica con monitor', v: 'no', f: 'Asintomatico, QRS stretto, contesto vagale: non ci sono elementi di rischio.' },
        { t: 'Atropina endovena subito', v: 'no', f: 'Non c’è instabilità da trattare: l’atropina è un farmaco della bradicardia con segni di allarme.' }
      ],
      perche: 'La conduzione che si normalizza con l’aumento della frequenza sinusale conferma una sede nodale e una natura funzionale.', fonte: ['esc-pacing-2021'], dopo: 'sforzo' },
    { tipo: 'Seguito', q: 'Serve un pacemaker?',
      opz: [
        { t: 'No. Lo si riconsidera solo se compaiono sintomi o se il blocco risulta sotto il nodo', v: 'ok', f: 'Corretto: nel Mobitz 1 asintomatico la stimolazione non è indicata.' },
        { t: 'Sì: ogni blocco di II grado va stimolato', v: 'grave', f: 'Impiantare un pacemaker in un atleta sano con un fenomeno vagale è un danno, non una cautela.' },
        { t: 'Sì, se la frequenza a riposo è sotto 60 al minuto', v: 'no', f: 'La frequenza da sola non è un’indicazione: contano i sintomi e la sede del blocco.' }
      ],
      perche: 'Mobitz 1: la stimolazione va considerata solo se il blocco causa sintomi o se è localizzato a livello intra o infra-hisiano. Nel Mobitz 2, al contrario, è indicata comunque.', fonte: ['esc-pacing-2021'] }
  ],
  chiave: ['PR che si allunga e poi una P bloccata: Mobitz 1.', 'QRS stretto e contesto vagale: blocco nel nodo.', 'Scompare con lo sforzo.', 'Asintomatico: nessun pacemaker.']
},
/* ------------------------------------------------------------------ 23 */
{
  id: 'bradi-tachi', titolo: 'Batticuore, poi il buio', tag: 'Ritmo', livello: 2, minuti: 5,
  paziente: { sesso: 'F', eta: 79 },
  intro: 'Donna di 79 anni. Da mesi episodi di cardiopalmo che durano minuti; quando finiscono le si “annebbia la vista” e due volte è quasi svenuta. In pronto soccorso è collegata al monitor durante un episodio.',
  stati: {
    arrivo: { ecg: ['braditachi', { hr: 128, pausa: 4200 }], fc: 'variabile', pa: '125/75', spo2: 97, fr: 16, pz: VIGILE, txt: 'Cardiopalmo, poi capogiro alla fine dell’episodio.' },
    pausa: { ecg: ['arrestosinusale', { hr: 44, pausa: 4500, esc: 'no' }], fc: 'variabile', pa: '85/50', spo2: 95, fr: 18, pz: { post: 'supino', cute: 'pallido', cosc: 'confuso', polso: true }, txt: 'Dopo il farmaco: pause più lunghe, sincope in barella.' },
    stimolata: { ecg: ['pmddd', {}], pa: '128/76', spo2: 98, fr: 15, pz: VIGILE, txt: 'Dopo l’impianto: nessuna pausa; ora può assumere il farmaco per la tachiaritmia.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa succede quando la tachiaritmia si interrompe?',
      opz: [
        { t: 'Una lunga pausa senza P né QRS, poi il ritmo sinusale riparte lento', v: 'ok', f: 'Esatto: il nodo del seno, “zittito” dalla tachiaritmia, ci mette secondi a ripartire.' },
        { t: 'Il ritmo sinusale riprende subito, a frequenza normale', v: 'no', f: 'Misura la pausa: supera i 3 secondi.' },
        { t: 'Compaiono P bloccate, senza QRS', v: 'no', f: 'Nella pausa non ci sono onde P: il problema è il nodo del seno, non il nodo AV.' }
      ],
      perche: 'Una tachiaritmia atriale sopprime l’automatismo del nodo del seno. Se il nodo è malato, il tempo di recupero si allunga: è la pausa post-tachicardica.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Diagnosi', q: 'Come si chiama questo quadro?',
      opz: [
        { t: 'Malattia del nodo del seno, forma bradicardia-tachicardia', v: 'ok', f: 'Corretto. I sintomi sono legati alla pausa, non alla tachicardia.' },
        { t: 'Blocco AV di III grado parossistico', v: 'no', f: 'Nel blocco AV le P continuano regolari. Qui nella pausa mancano.' },
        { t: 'Sincope vasovagale', v: 'no', f: 'Il monitor documenta la causa: una pausa che segue ogni volta la tachiaritmia.' }
      ],
      perche: 'La diagnosi richiede la correlazione fra sintomi e bradiaritmia documentata: qui il monitor la mostra in diretta.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Decisione', q: 'Vorresti prevenire gli episodi di tachiaritmia. Che cosa fai?',
      opz: [
        { t: 'Prima il pacemaker, poi il farmaco che rallenta', v: 'ok', f: 'Corretto: il pacemaker corregge le pause e rende possibile la terapia della tachiaritmia.' },
        { t: 'Beta-bloccante subito, senza altro', v: 'grave', f: 'Un farmaco che deprime il nodo del seno allunga proprio le pause che la fanno svenire.', cons: 'pausa' },
        { t: 'Nessuna terapia: è l’età', v: 'no', f: 'Le pause sono sintomatiche e documentate: c’è un’indicazione precisa.' }
      ],
      perche: 'Nella forma bradicardia-tachicardia sintomatica la stimolazione è indicata per correggere le bradiaritmie e permettere il trattamento farmacologico, a meno che si preferisca l’ablazione della tachiaritmia.', fonte: ['esc-pacing-2021'], anim: 'pacing', dopo: 'stimolata' },
    { tipo: 'Seguito', q: 'La tachiaritmia è una fibrillazione atriale parossistica. Che cos’altro devi valutare?',
      opz: [
        { t: 'Il rischio tromboembolico con il punteggio CHA₂DS₂-VA', v: 'ok', f: 'Corretto: 79 anni valgono da soli 2 punti. L’anticoagulazione è raccomandata.' },
        { t: 'Nulla: gli episodi sono brevi', v: 'grave', f: 'Il rischio di ictus non dipende dalla durata percepita degli episodi.' },
        { t: 'Solo l’aspirina', v: 'no', f: 'L’aspirina non è un’alternativa all’anticoagulante nella prevenzione dell’ictus da fibrillazione atriale.' }
      ],
      perche: 'CHA₂DS₂-VA: 2 o più punti, anticoagulazione raccomandata; 1 punto, da considerare. L’età pari o superiore a 75 anni vale 2 punti.', fonte: ['esc-af-2024'] }
  ],
  chiave: ['Pausa lunga alla fine della tachiaritmia: nodo del seno malato.', 'I sintomi vengono dalla pausa.', 'Prima il pacemaker, poi i farmaci che rallentano.', 'Fibrillazione atriale: calcola CHA₂DS₂-VA.']
},
/* ------------------------------------------------------------------ 24 */
{
  id: 'pea-ipovolemia', titolo: 'Il monitor mostra un ritmo, ma…', tag: 'Arresto', livello: 2, minuti: 6,
  paziente: { sesso: 'M', eta: 66 },
  intro: 'Uomo di 66 anni, ricoverato per melena, in terapia anticoagulante. L’infermiera ti chiama: è pallidissimo e non risponde. Sul monitor vedi complessi regolari.',
  stati: {
    arrivo: { ecg: ['pea', { hr: 62, w: 1 }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: ARRESTO, txt: 'Non risponde, non respira. Nessun polso carotideo.' },
    rcp: { ecg: ['pea', { hr: 54, w: 1.1 }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, rcp: true, piastre: true }, txt: 'Compressioni in corso. Ritmo organizzato, nessun polso.' },
    rosc: { ecg: ['tachisinusale', { hr: 124 }], pa: '90/55', spo2: 93, fr: 14, pz: { post: 'supino', cute: 'pallido', cosc: 'confuso', polso: true, piastre: true, o2: true }, txt: 'Polso presente dopo liquidi e sangue. Riprende a respirare.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Riconoscimento', q: 'Ritmo organizzato sul monitor, nessun polso, nessun respiro. Che cos’è e che cosa fai?',
      opz: [
        { t: 'È un arresto cardiaco: chiamo aiuto e inizio le compressioni', v: 'ok', f: 'Corretto: è un’attività elettrica senza polso. L’arresto si diagnostica sul paziente, non sul monitor.' },
        { t: 'C’è ritmo, quindi c’è circolo: misuro la pressione', v: 'grave', f: 'L’ECG registra l’elettricità, non la gittata. Ogni secondo senza compressioni è cervello perso.' },
        { t: 'Controllo che gli elettrodi siano attaccati bene', v: 'grave', f: 'Il paziente non risponde e non respira: prima le compressioni.' }
      ],
      perche: 'Non risponde e non respira normalmente: arresto cardiaco, qualunque cosa mostri il monitor. Si chiama aiuto e si iniziano le compressioni.', fonte: ['erc-als-2025'], anim: 'rcp', dopo: 'rcp' },
    { tipo: 'Decisione', q: 'Le piastre sono collegate: il ritmo è lo stesso. Defibrilli?',
      opz: [
        { t: 'No: non è un ritmo defibrillabile. Continuo la rianimazione e ricontrollo ogni 2 minuti', v: 'ok', f: 'Corretto: attività elettrica senza polso e asistolia non si defibrillano.' },
        { t: 'Sì, una scarica a 200 J', v: 'grave', f: 'La scarica serve a interrompere un’attività elettrica caotica. Qui l’elettricità è organizzata: manca la gittata.' },
        { t: 'Sì, cardioversione sincronizzata', v: 'grave', f: 'La cardioversione è per le tachiaritmie con polso.' }
      ],
      perche: 'Ritmi non defibrillabili: attività elettrica senza polso e asistolia. Rianimazione continua con controllo del ritmo ogni 2 minuti.', fonte: ['erc-als-2025'] },
    { tipo: 'Terapia', q: 'Hai un accesso venoso. Quale farmaco e quando?',
      opz: [
        { t: 'Adrenalina 1 mg appena possibile, poi ogni 3–5 minuti', v: 'ok', f: 'Corretto: nei ritmi non defibrillabili l’adrenalina si dà subito, senza aspettare tre cicli.' },
        { t: 'Adrenalina 1 mg solo dopo il terzo ciclo', v: 'no', f: 'È la regola dei ritmi defibrillabili, dove si aspetta la terza scarica.' },
        { t: 'Amiodarone 300 mg', v: 'no', f: 'L’amiodarone è per i ritmi defibrillabili refrattari alle scariche.' }
      ],
      perche: 'Ritmo non defibrillabile: adrenalina 1 mg endovena appena disponibile un accesso, ripetuta ogni 3–5 minuti.', fonte: ['erc-als-2025'], anim: 'ev' },
    { tipo: 'Ragionamento', q: 'Melena, anticoagulante, pallore estremo. Quale causa reversibile tratti?',
      opz: [
        { t: 'Ipovolemia da emorragia: liquidi, sangue, antagonista dell’anticoagulante e controllo del sanguinamento', v: 'ok', f: 'Corretto: finché il letto vascolare è vuoto, né compressioni né adrenalina possono generare una gittata.' },
        { t: 'Pneumotorace iperteso: decompressione con ago', v: 'no', f: 'È una causa reversibile, ma qui la storia indica un’emorragia.' },
        { t: 'Nessuna: l’attività elettrica senza polso non ha cause trattabili', v: 'grave', f: 'È l’opposto: è il ritmo in cui cercare la causa conta di più.' }
      ],
      perche: 'Cause reversibili: ipossia, ipovolemia, ipo e iperkaliemia e altre alterazioni metaboliche, ipo e ipertermia; trombosi coronarica o polmonare, pneumotorace iperteso, tamponamento, tossici. Vanno cercate e trattate durante la rianimazione.', fonte: ['erc-als-2025'], anim: 'ev', dopo: 'rosc' }
  ],
  chiave: ['L’arresto si diagnostica sul paziente, non sul monitor.', 'Attività elettrica senza polso: non si defibrilla.', 'Adrenalina 1 mg subito, poi ogni 3–5 minuti.', 'Cerca la causa reversibile: qui è l’emorragia.']
},
/* ------------------------------------------------------------------ 25 */
{
  id: 'ipotermia', titolo: 'Trovato all’aperto dopo una notte di gelo', tag: 'Arresto', livello: 3, minuti: 7,
  paziente: { sesso: 'M', eta: 38 },
  intro: 'Uomo di 38 anni trovato all’alba in un parco, a −4 °C. Non risponde, respira lentamente. Temperatura centrale 27,5 °C. Polso carotideo presente ma molto lento.',
  stati: {
    arrivo: { ecg: ['ipotermia', { hr: 34, j: 5 }], pa: '80/50', spo2: null, fr: 6, pz: { post: 'supino', cute: 'pallido', cosc: 'incosciente', polso: true }, txt: 'Non risponde. Cute fredda, rigida. Respiro lento.' },
    fv: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, rcp: true, piastre: true }, txt: 'Durante lo spostamento perde il polso.' },
    ecls: { ecg: ['bradisinusale', { hr: 48 }], pa: '95/60', spo2: 96, fr: 12, pz: { post: 'supino', cute: 'pallido', cosc: 'incosciente', polso: true, piastre: true, o2: true }, txt: 'In circolazione extracorporea: a 31 °C una scarica ripristina il ritmo.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa vedi alla fine del QRS?',
      opz: [
        { t: 'Una gobba positiva al punto J, con bradicardia marcata', v: 'ok', f: 'Esatto: è l’onda J di Osborn. Più la temperatura scende, più è ampia.' },
        { t: 'Un sopraslivellamento ST da infarto', v: 'no', f: 'La deflessione è attaccata alla fine del QRS, è presente in molte derivazioni e si accompagna a bradicardia e intervalli lunghi.' },
        { t: 'Un’onda delta', v: 'no', f: 'L’onda delta sta all’inizio del QRS, non alla fine.' }
      ],
      perche: 'Ipotermia: onda J, bradicardia, allungamento di PR, QRS e QT, tremore muscolare sulla linea di base.', fonte: ['erc-sc-2025'] },
    { tipo: 'Valutazione', q: 'Il paziente ha ancora polso. Perché è ad alto rischio di arresto imminente?',
      opz: [
        { t: 'Temperatura sotto 30 °C, frequenza sotto 45 al minuto, pressione sistolica sotto 90 mmHg', v: 'ok', f: 'Corretto: ne basta uno, come anche un’aritmia ventricolare, per indicare il trasporto diretto in un centro con circolazione extracorporea. Va mosso con delicatezza.' },
        { t: 'Perché ha 38 anni', v: 'no', f: 'L’età non è fra i criteri.' },
        { t: 'Non lo è: finché c’è polso basta una coperta', v: 'grave', f: 'Sotto i 30 °C il miocardio è irritabile: basta una mobilizzazione brusca per innescare una fibrillazione ventricolare.', cons: 'fv' }
      ],
      perche: 'Criteri di alto rischio di arresto imminente nell’ipotermia: frequenza cardiaca < 45/min, pressione sistolica < 90 mmHg, aritmia ventricolare, temperatura centrale < 30 °C. Indicano il trasferimento in un centro con supporto extracorporeo.', fonte: ['rcuk-sc-2025'] },
    { stato: 'fv', tipo: 'Emergenza', q: 'Fibrillazione ventricolare a 27,5 °C. Come usi il defibrillatore?',
      opz: [
        { t: 'Fino a tre scariche; se persiste, sospendo le scariche finché la temperatura supera 30 °C', v: 'ok', f: 'Corretto: il cuore freddo spesso non risponde. Le compressioni continuano senza interruzione.' },
        { t: 'Una scarica ogni 2 minuti finché non riparte', v: 'no', f: 'Dopo tre tentativi inefficaci, insistere a cuore freddo non aggiunge nulla: si riscalda e si riprova sopra i 30 °C.' },
        { t: 'Nessuna scarica sotto i 30 °C', v: 'no', f: 'Tre tentativi vanno fatti: a volte funzionano.' }
      ],
      perche: 'Arresto ipotermico: se la fibrillazione ventricolare persiste dopo tre scariche, rimandare le successive finché la temperatura centrale supera 30 °C.', fonte: ['rcuk-sc-2025'], anim: 'shock' },
    { tipo: 'Terapia', q: 'E l’adrenalina?',
      opz: [
        { t: 'La sospendo sotto i 30 °C; fra 30 e 35 °C allungo l’intervallo a 6–10 minuti', v: 'ok', f: 'Corretto: a cuore freddo il farmaco non viene metabolizzato, si accumula e può fare più male che bene.' },
        { t: '1 mg ogni 3–5 minuti, come sempre', v: 'grave', f: 'Sotto i 30 °C l’adrenalina si accumula: quando il paziente si riscalda, arriva tutta insieme.' },
        { t: 'Dose doppia, perché il freddo riduce l’effetto', v: 'grave', f: 'Aumenta soltanto l’accumulo.' }
      ],
      perche: 'Sotto 30 °C l’adrenalina si accumula: si somministra 1 mg quando la temperatura centrale raggiunge 30 °C, salvo rianimazione extracorporea imminente; fra 30 e 35 °C l’intervallo fra le dosi sale a 6–10 minuti.', fonte: ['rcuk-sc-2025'], anim: 'rcp' },
    { tipo: 'Decisione', q: 'Dopo 40 minuti di rianimazione il ritmo non è cambiato. Che cosa fai?',
      opz: [
        { t: 'Continuo e trasferisco per riscaldamento in circolazione extracorporea', v: 'ok', f: 'Corretto: il freddo protegge il cervello. La prognosi si stima con il punteggio HOPE, non con la durata della rianimazione.' },
        { t: 'Sospendo: 40 minuti sono troppi', v: 'grave', f: 'Nell’arresto ipotermico sono documentati recuperi completi dopo ore di rianimazione.' },
        { t: 'Lo riscaldo con coperte e aspetto', v: 'no', f: 'Un paziente in arresto va riscaldato con la circolazione extracorporea; il riscaldamento con altri mezzi è il ripiego se il centro non è raggiungibile in tempi ragionevoli.' }
      ],
      perche: 'Il paziente ipotermico in arresto va riscaldato con ECMO veno-arteriosa; la prognosi in ospedale si basa sul punteggio HOPE. Se un centro non è raggiungibile in tempi ragionevoli (per esempio 6 ore), si inizia un riscaldamento con altri mezzi.', fonte: ['rcuk-sc-2025'], anim: 'ev', dopo: 'ecls' }
  ],
  chiave: ['Gobba alla fine del QRS e bradicardia: onda J di Osborn.', 'Sotto 30 °C: muovilo con delicatezza, centro con ECMO.', 'Tre scariche al massimo e niente adrenalina sotto 30 °C.', 'Non sospendere: il freddo protegge il cervello.']
},
/* ------------------------------------------------------------------ 26 */
{
  id: 'ripolarizzazione-precoce', titolo: 'ST sopra in un ragazzo che sta bene', tag: 'Varianti', livello: 2, minuti: 4,
  paziente: { sesso: 'M', eta: 22 },
  intro: 'Uomo di 22 anni, calciatore. ECG per la visita di idoneità. Nessun sintomo, mai sincopi, nessuna morte improvvisa in famiglia. L’interpretazione automatica segnala: “Sopraslivellamento ST: considerare infarto acuto”.',
  stati: {
    arrivo: { ecg: ['ripol-precoce', { hr: 56, j: 2 }], pa: '118/72', spo2: 99, fr: 13, pz: VIGILE, txt: 'Asintomatico, tranquillo.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Com’è fatto il passaggio fra QRS e tratto ST?',
      opz: [
        { t: 'Un’intaccatura alla fine del QRS, poi ST concavo verso l’alto e T ampia', v: 'ok', f: 'Esatto: quell’intaccatura è l’onda J. Il tratto ST che segue “sorride”.' },
        { t: 'ST convesso che ingloba la T, con onde Q', v: 'no', f: 'È la morfologia dell’infarto in evoluzione. Qui l’ST è concavo e non ci sono Q.' },
        { t: 'ST sottoslivellato', v: 'no', f: 'Il punto J è sopra la linea isoelettrica.' }
      ],
      perche: 'Ripolarizzazione precoce: sopraslivellamento del punto J di almeno 1 mm in due o più derivazioni contigue inferiori e/o laterali.', fonte: ['esc-va-2022'] },
    { tipo: 'Ragionamento', q: 'Che cosa ti fa escludere un infarto?',
      opz: [
        { t: 'Nessun sintomo, nessun sottoslivellamento reciproco, quadro identico nei tracciati precedenti', v: 'ok', f: 'Corretto. Nell’infarto il sopraslivellamento segue un territorio, ha la sua immagine reciproca e cambia nel giro di minuti.' },
        { t: 'L’età: sotto i 30 anni l’infarto non esiste', v: 'no', f: 'È raro, non impossibile. L’età da sola non esclude nulla.' },
        { t: 'Niente: va in emodinamica', v: 'grave', f: 'Una coronarografia in un ragazzo asintomatico con una variante normale è un rischio senza beneficio.' }
      ],
      perche: 'Tre domande davanti a un ST sopraslivellato: ci sono sintomi? c’è reciprocità? il tracciato cambia nel tempo? Tre “no” orientano verso una variante.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'Quando si parla di “sindrome” da ripolarizzazione precoce?',
      opz: [
        { t: 'Solo se il paziente è stato rianimato da una fibrillazione ventricolare o da una tachicardia ventricolare polimorfa senza altra causa', v: 'ok', f: 'Corretto: il solo reperto ECG è un “quadro”, non una malattia.' },
        { t: 'Ogni volta che il punto J supera 1 mm', v: 'no', f: 'Quello definisce il quadro elettrocardiografico, frequente nei giovani e negli atleti.' },
        { t: 'Quando il paziente è un atleta', v: 'no', f: 'L’attività sportiva rende il quadro più frequente, non più pericoloso.' }
      ],
      perche: 'Le linee guida ESC 2022 distinguono il quadro ECG di ripolarizzazione precoce dalla sindrome, che richiede un arresto da fibrillazione ventricolare o tachicardia ventricolare polimorfa non altrimenti spiegato.', fonte: ['esc-va-2022'] },
    { tipo: 'Seguito', q: 'Che cosa cambierebbe il tuo atteggiamento?',
      opz: [
        { t: 'Una sincope di sospetta origine aritmica o una morte improvvisa giovanile in famiglia', v: 'ok', f: 'Corretto: sono gli elementi che richiedono una valutazione aritmologica.' },
        { t: 'Una frequenza a riposo di 56 al minuto', v: 'no', f: 'È la bradicardia fisiologica dell’allenamento.' },
        { t: 'Nulla: va comunque sospeso dallo sport', v: 'no', f: 'Asintomatico e senza familiarità, il solo quadro ECG non richiede provvedimenti.' }
      ],
      perche: 'Il quadro ECG isolato, senza sintomi né familiarità, è un reperto in genere benigno; storia personale e familiare decidono se servono approfondimenti.', fonte: ['esc-va-2022'] }
  ],
  chiave: ['Intaccatura alla fine del QRS e ST concavo: onda J.', 'Sintomi? Reciprocità? Evoluzione? Tre no: variante.', 'Quadro ECG non è sindrome.', 'Sincope o familiarità: valutazione aritmologica.']
},
/* ------------------------------------------------------------------ 27 */
{
  id: 'inversione-elettrodi', titolo: 'Un ECG preoperatorio “impossibile”', tag: 'Artefatti', livello: 1, minuti: 4,
  paziente: { sesso: 'F', eta: 34 },
  intro: 'Donna di 34 anni, sana, in lista per un intervento ortopedico. L’ECG preoperatorio arriva con il referto automatico: “Possibile infarto laterale, asse deviato a destra”. La paziente sta benissimo.',
  stati: {
    arrivo: { ecg: ['inv-braccia', { hr: 72 }], pa: '115/70', spo2: 99, fr: 14, pz: VIGILE, txt: 'Asintomatica.' },
    corretto: { ecg: ['normale', { hr: 72 }], pa: '115/70', spo2: 99, fr: 14, pz: VIGILE, txt: 'Tracciato ripetuto con gli elettrodi al posto giusto.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Guarda DI e aVR. Che cosa non torna?',
      opz: [
        { t: 'In DI sono negativi P, QRS e T; in aVR la P è positiva', v: 'ok', f: 'Esatto. In ritmo sinusale la P è sempre positiva in DI e negativa in aVR: il contrario è quasi sempre un errore di montaggio.' },
        { t: 'Il QRS è largo', v: 'no', f: 'Il QRS è stretto: misura la sua durata, è sotto i 110 ms.' },
        { t: 'Mancano le onde P', v: 'no', f: 'Le P ci sono: sono capovolte in DI.' }
      ],
      perche: 'DI capovolta in tutte le sue componenti è la firma dello scambio fra i cavi delle due braccia.', fonte: ['aha-ecg-2007'] },
    { tipo: 'Ragionamento', q: 'Anche la destrocardia capovolge DI. Come le distingui?',
      opz: [
        { t: 'Guardo le precordiali: qui la R cresce regolarmente da V1 a V6', v: 'ok', f: 'Corretto: nella destrocardia la R si riduce andando verso V6, perché il cuore è dall’altra parte. Qui la progressione è normale.' },
        { t: 'Guardo aVF', v: 'no', f: 'aVF è uguale in entrambe le situazioni.' },
        { t: 'Non si possono distinguere senza una radiografia', v: 'no', f: 'Le precordiali bastano: i cavi delle braccia non le influenzano.' }
      ],
      perche: 'Lo scambio dei cavi degli arti non modifica in modo apprezzabile le precordiali; la destrocardia sì.', fonte: ['aha-ecg-2007'] },
    { tipo: 'Decisione', q: 'Che cosa fai?',
      opz: [
        { t: 'Controllo gli elettrodi e ripeto il tracciato prima di qualunque conclusione', v: 'ok', f: 'Corretto: un minuto di lavoro evita esami inutili e un intervento rinviato.' },
        { t: 'Chiedo troponina ed ecocardiogramma e rinvio l’intervento', v: 'no', f: 'Stai trattando un cavo, non una paziente.' },
        { t: 'Firmo il referto automatico', v: 'grave', f: 'Un infarto inesistente finirebbe nella cartella di una donna sana.' }
      ],
      perche: 'Gli errori di posizionamento degli elettrodi sono frequenti e simulano patologie: vanno riconosciuti dal tracciato e corretti ripetendo la registrazione.', fonte: ['aha-ecg-2007'], dopo: 'corretto' },
    { tipo: 'Ragionamento', q: 'Con i cavi delle braccia scambiati, quali derivazioni restano attendibili?',
      opz: [
        { t: 'aVF e tutte le precordiali', v: 'ok', f: 'Corretto. DI si capovolge, DII e DIII si scambiano fra loro, aVR e aVL si scambiano fra loro, aVF non cambia.' },
        { t: 'Nessuna', v: 'no', f: 'aVF e le precordiali restano valide.' },
        { t: 'Solo DI', v: 'no', f: 'DI è proprio la derivazione capovolta.' }
      ],
      perche: 'Scambio braccio destro-braccio sinistro: inversione di DI, scambio di DII con DIII e di aVR con aVL, aVF invariata.', fonte: ['aha-ecg-2007'] }
  ],
  chiave: ['P negativa in DI e positiva in aVR: sospetta i cavi.', 'Precordiali normali: non è destrocardia.', 'Ripeti il tracciato prima di refertare.', 'Il referto automatico non riconosce l’errore.']
}
];

const presenti = new Set(API.CASI.map(c => c.id));
for (const c of NUOVI) if (!presenti.has(c.id)) API.CASI.push(c);
if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof self !== 'undefined' ? self : this);
