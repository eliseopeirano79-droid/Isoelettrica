/* Isoelettrica — Casi clinici: contenuti.
   File di soli dati. Ogni scelta terapeutica rimanda a una linea guida in FONTI.
   Simulazione didattica: non sostituisce protocolli locali né il giudizio clinico.
   Le dosi sono quelle dell'adulto riportate nelle fonti citate.

   Schema di un caso
   stati:  nome -> { ecg:[idScenario, parametri], pa, spo2, fr, fc (solo se non ricavabile dal tracciato),
                     pz:{ post:'semi'|'supino', cute:'norm'|'pallido'|'cianosi', sudore, cosc:'vigile'|'sofferente'|'confuso'|'incosciente',
                          mano (al petto), polso (false = arresto), rcp, o2, piastre }, txt }
   passi:  { stato?, tipo, q, opz:[{ t, v:'ok'|'no'|'grave', f, cons? }], perche, fonte:[...], anim?, dopo? }
           v:'grave' = scelta pericolosa; cons = stato mostrato come conseguenza simulata;
           dopo = stato raggiunto dopo la scelta corretta; anim = animazione sul paziente. */
(function (root) {
'use strict';

const FONTI = {
  'esc-acs-2023': { t: 'ESC 2023 — Sindromi coronariche acute', r: 'Byrne RA et al. Eur Heart J 2023;44:3720–3826', u: 'https://doi.org/10.1093/eurheartj/ehad191' },
  'esc-svt-2019': { t: 'ESC 2019 — Tachicardie sopraventricolari', r: 'Brugada J et al. Eur Heart J 2020;41:655–720', u: 'https://doi.org/10.1093/eurheartj/ehz467' },
  'esc-af-2024': { t: 'ESC 2024 — Fibrillazione atriale', r: 'Van Gelder IC et al. Eur Heart J 2024;45:3314–3414', u: 'https://doi.org/10.1093/eurheartj/ehae176' },
  'erc-als-2025': { t: 'ERC 2025 — Supporto avanzato delle funzioni vitali nell’adulto', r: 'Soar J et al. Resuscitation 2025;215(Suppl 1):110769', u: 'https://doi.org/10.1016/j.resuscitation.2025.110769' },
  'erc-sc-2025': { t: 'ERC 2025 — Circostanze speciali', r: 'Resuscitation 2025;215(Suppl 1):110753', u: 'https://doi.org/10.1016/j.resuscitation.2025.110753' },
  'esc-pe-2019': { t: 'ESC 2019 — Embolia polmonare acuta', r: 'Konstantinides SV et al. Eur Heart J 2020;41:543–603', u: 'https://doi.org/10.1093/eurheartj/ehz405' },
  'esc-peri-2025': { t: 'ESC 2025 — Miocardite e pericardite', r: 'Schulz-Menger J et al. Eur Heart J 2025;46:3952–4041', u: 'https://doi.org/10.1093/eurheartj/ehaf192' },
  'esc-va-2022': { t: 'ESC 2022 — Aritmie ventricolari e morte improvvisa', r: 'Zeppenfeld K et al. Eur Heart J 2022;43:3997–4126', u: 'https://doi.org/10.1093/eurheartj/ehac262' },
  'esc-pacing-2021': { t: 'ESC 2021 — Stimolazione cardiaca e CRT', r: 'Glikson M et al. Eur Heart J 2021;42:3427–3520', u: 'https://doi.org/10.1093/eurheartj/ehab364' }
};

const VIGILE = { post: 'semi', cute: 'norm', cosc: 'vigile', polso: true };

const CASI = [
/* ------------------------------------------------------------------ 1 */
{
  id: 'stemi-anteriore', titolo: 'Dolore toracico in pronto soccorso', tag: 'Ischemia', livello: 1, minuti: 6,
  paziente: { sesso: 'M', eta: 58 },
  intro: 'Uomo di 58 anni, fumatore e iperteso. Da 40 minuti dolore retrosternale oppressivo irradiato al braccio sinistro, con sudorazione fredda. Hai l’ECG entro 10 minuti dall’arrivo.',
  stati: {
    arrivo: { ecg: ['stemi-anteriore', { fase: '1', st: 4, hr: 94 }], pa: '145/90', spo2: 97, fr: 20, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Sofferente, sudato, mano al petto.' },
    fv: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, piastre: true }, txt: 'Non risponde, non respira. Nessun polso.' },
    rosc: { ecg: ['stemi-anteriore', { fase: '1', st: 3, hr: 104 }], pa: '105/65', spo2: 95, fr: 16, pz: { post: 'supino', cute: 'pallido', cosc: 'confuso', polso: true, piastre: true, o2: true }, txt: 'Polso presente dopo la scarica. Riprende a respirare.' },
    riperfuso: { ecg: ['stemi-anteriore', { fase: '2', st: 1, hr: 78 }], pa: '120/75', spo2: 97, fr: 15, pz: VIGILE, txt: 'Dopo l’angioplastica: dolore scomparso.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Dove si trova il sopraslivellamento del tratto ST?',
      opz: [
        { t: 'Nelle precordiali V1–V4', v: 'ok', f: 'Sì: è il territorio anteriore. Cerca sempre anche il sottoslivellamento reciproco nelle derivazioni inferiori.' },
        { t: 'In DII, DIII e aVF', v: 'no', f: 'Quello sarebbe il territorio inferiore. Qui il sopraslivellamento è nelle precordiali.' },
        { t: 'In tutte le derivazioni, concavo, con PR sottoslivellato', v: 'no', f: 'È il quadro della pericardite: diffuso e senza reciprocità. Qui il sopraslivellamento segue un territorio coronarico.' },
        { t: 'Non c’è sopraslivellamento', v: 'no', f: 'Guarda il punto J in V2–V3: è nettamente sopra la linea isoelettrica.' }
      ],
      perche: 'Un sopraslivellamento ST in almeno due derivazioni contigue, che segue un territorio coronarico e ha alterazioni reciproche, è un infarto con occlusione coronarica fino a prova contraria.', fonte: ['esc-acs-2023'] },
    { tipo: 'Diagnosi', q: 'Qual è la coronaria più probabilmente occlusa?',
      opz: [
        { t: 'Interventricolare anteriore (IVA)', v: 'ok', f: 'Esatto: V1–V4 corrispondono al setto e alla parete anteriore, irrorati dall’IVA.' },
        { t: 'Coronaria destra', v: 'no', f: 'La coronaria destra dà di solito un infarto inferiore (DII, DIII, aVF).' },
        { t: 'Circonflessa', v: 'no', f: 'La circonflessa dà quadri laterali o posteriori.' }
      ],
      perche: 'Localizzare l’infarto dall’ECG orienta su arteria colpevole, estensione del miocardio a rischio e complicanze attese.', fonte: ['esc-acs-2023'] },
    { tipo: 'Decisione', q: 'La sala di emodinamica è disponibile entro 30 minuti. La troponina non è ancora pronta. Che cosa fai?',
      opz: [
        { t: 'Attivo subito l’emodinamica per angioplastica primaria', v: 'ok', f: 'Corretto. La diagnosi di STEMI è clinica ed elettrocardiografica: la riperfusione non deve aspettare la troponina.' },
        { t: 'Aspetto la troponina per confermare', v: 'grave', f: 'Ogni minuto di ritardo è miocardio perso. Nello STEMI la troponina non serve per decidere la riperfusione.' },
        { t: 'Somministro subito il fibrinolitico', v: 'no', f: 'La fibrinolisi è riservata a quando l’angioplastica primaria non è eseguibile entro 120 minuti dalla diagnosi.' },
        { t: 'Richiedo una TC coronarica', v: 'no', f: 'Ritarda la riperfusione senza cambiare la strategia.' }
      ],
      perche: 'Angioplastica primaria se eseguibile entro 120 minuti dalla diagnosi ECG; altrimenti fibrinolisi e trasferimento a un centro con emodinamica.', fonte: ['esc-acs-2023'] },
    { tipo: 'Farmaco', q: 'La saturazione è 97% in aria ambiente. Quale terapia iniziale imposti?',
      opz: [
        { t: 'Acido acetilsalicilico in dose di carico (150–300 mg per os) e anticoagulante al momento della procedura', v: 'ok', f: 'Corretto. A questo si aggiunge un inibitore P2Y12 (prasugrel o ticagrelor). Niente ossigeno: la saturazione è normale.' },
        { t: 'Ossigeno ad alto flusso, poi il resto', v: 'no', f: 'L’ossigeno è indicato solo se la saturazione è inferiore al 90%. Nel paziente normossico non è raccomandato di routine.' },
        { t: 'Solo morfina, il resto lo deciderà l’emodinamista', v: 'no', f: 'L’analgesia è utile ma non sostituisce la terapia antitrombotica, che va iniziata subito.' }
      ],
      perche: 'Terapia antitrombotica per tutti: aspirina in carico, inibitore P2Y12 e anticoagulante parenterale. Ossigeno solo se SpO₂ < 90%.', fonte: ['esc-acs-2023'], anim: 'ev' },
    { stato: 'fv', tipo: 'Emergenza', q: 'Durante il trasporto in sala il paziente perde coscienza. Sul monitor compare questo ritmo. Che cosa fai?',
      opz: [
        { t: 'Compressioni toraciche e defibrillazione immediata', v: 'ok', f: 'Corretto: è una fibrillazione ventricolare. Nell’arresto testimoniato e monitorizzato la scarica va erogata appena possibile.' },
        { t: 'Amiodarone 300 mg in bolo e osservo', v: 'grave', f: 'Nessun farmaco sostituisce la scarica. L’amiodarone trova posto solo dopo tre scariche inefficaci.' },
        { t: 'Controllo il polso per un minuto', v: 'grave', f: 'Paziente incosciente che non respira con un ritmo defibrillabile: ogni secondo senza compressioni e senza scarica riduce la sopravvivenza.' }
      ],
      perche: 'La fibrillazione ventricolare è la complicanza aritmica più temuta delle prime ore dell’infarto. Scarica precoce e compressioni di qualità sono le due sole priorità.', fonte: ['erc-als-2025'], anim: 'shock', dopo: 'rosc' },
    { stato: 'riperfuso', tipo: 'Evoluzione', q: 'Angioplastica eseguita sull’IVA prossimale. Che cosa ti aspetti di vedere sull’ECG nelle ore successive?',
      opz: [
        { t: 'Riduzione del sopraslivellamento ST e comparsa di onde T negative', v: 'ok', f: 'Sì: la risoluzione dell’ST è il segno elettrocardiografico della riperfusione riuscita. Le onde Q possono comparire se parte del miocardio è andata perduta.' },
        { t: 'Normalizzazione completa immediata', v: 'no', f: 'L’ECG evolve nel tempo: ST che scende, T che si invertono, eventuali onde Q.' },
        { t: 'Sopraslivellamento invariato per settimane', v: 'no', f: 'Un ST che resta sopraslivellato a distanza fa pensare a un aneurisma ventricolare, non a un decorso normale.' }
      ],
      perche: 'Le fasi dell’infarto sull’ECG: iperacuta (T alte), acuta (ST sopraslivellato), evoluzione (T negative, onde Q), esiti (onde Q persistenti).', fonte: ['esc-acs-2023'] }
  ],
  chiave: ['STEMI: la riperfusione non aspetta la troponina.', 'Angioplastica primaria entro 120 minuti dalla diagnosi, altrimenti fibrinolisi.', 'Ossigeno solo se SpO₂ < 90%.', 'Fibrillazione ventricolare: scarica subito, i farmaci dopo.']
},
/* ------------------------------------------------------------------ 2 */
{
  id: 'tpsv', titolo: 'Cardiopalmo improvviso in una giovane donna', tag: 'Sopraventricolari', livello: 1, minuti: 5,
  paziente: { sesso: 'F', eta: 27 },
  intro: 'Donna di 27 anni, nessuna malattia nota. Da 30 minuti batticuore regolare e rapidissimo, iniziato di colpo mentre era seduta. Nessun dolore toracico, nessuna sincope.',
  stati: {
    arrivo: { ecg: ['avnrt', { vr: 190 }], pa: '115/70', spo2: 99, fr: 18, pz: { post: 'semi', cute: 'norm', cosc: 'sofferente', polso: true }, txt: 'Ansiosa, vigile, ben perfusa.' },
    sinusale: { ecg: ['normale', { hr: 88, pr: 150, qtc: 410, axis: 55, axP: 55, axT: 45 }], pa: '118/72', spo2: 99, fr: 15, pz: VIGILE, txt: 'Ritmo sinusale. Si sente subito meglio.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Come descrivi questo tracciato?',
      opz: [
        { t: 'Tachicardia regolare a QRS stretti, onde P non riconoscibili', v: 'ok', f: 'Esatto. In una tachicardia da rientro nodale atri e ventricoli si attivano quasi insieme: la P è nascosta nel QRS o subito dopo.' },
        { t: 'Fibrillazione atriale ad alta risposta', v: 'no', f: 'La fibrillazione atriale è irregolarmente irregolare. Qui gli intervalli RR sono identici.' },
        { t: 'Tachicardia ventricolare', v: 'no', f: 'Il QRS è stretto: l’attivazione ventricolare passa per il sistema di conduzione normale.' },
        { t: 'Tachicardia sinusale', v: 'no', f: 'A 190/min, con esordio improvviso e senza P visibili prima del QRS, la tachicardia sinusale è improbabile.' }
      ],
      perche: 'Primo bivio di ogni tachicardia: QRS stretto o largo, ritmo regolare o irregolare.', fonte: ['esc-svt-2019'] },
    { tipo: 'Valutazione', q: 'La paziente è emodinamicamente stabile?',
      opz: [
        { t: 'Sì: nessun segno di shock, sincope, scompenso o ischemia', v: 'ok', f: 'Corretto. Sono questi quattro i segni di allarme che impongono la cardioversione elettrica.' },
        { t: 'No: la frequenza è 190/min', v: 'no', f: 'La frequenza da sola non definisce l’instabilità. Contano le conseguenze: shock, sincope, scompenso, ischemia.' }
      ],
      perche: 'Segni di instabilità nelle aritmie peri-arresto: shock, sincope, scompenso cardiaco, ischemia miocardica.', fonte: ['erc-als-2025'] },
    { tipo: 'Decisione', q: 'Qual è il primo intervento?',
      opz: [
        { t: 'Manovre vagali, meglio in posizione supina con sollevamento delle gambe', v: 'ok', f: 'Corretto: sono il primo passo raccomandato. La manovra di Valsalva modificata interrompe più episodi di quella standard.' },
        { t: 'Cardioversione elettrica sincronizzata', v: 'no', f: 'È la scelta nel paziente instabile. Qui c’è tempo per manovre e farmaci.' },
        { t: 'Amiodarone in infusione', v: 'no', f: 'Non è il farmaco delle tachicardie da rientro nodale stabili.' }
      ],
      perche: 'Le manovre vagali rallentano la conduzione nel nodo AV, che è un braccio obbligato del circuito di rientro.', fonte: ['esc-svt-2019'], anim: 'vagale' },
    { tipo: 'Farmaco', q: 'Le manovre vagali non hanno effetto. Quale farmaco e come lo somministri?',
      opz: [
        { t: 'Adenosina 6 mg in bolo rapido seguito da lavaggio; se inefficace 12 mg, poi 18 mg', v: 'ok', f: 'Corretto. L’emivita è di pochi secondi: bolo rapido in una vena prossimale e lavaggio immediato. Avvisa la paziente: per alcuni secondi sentirà oppressione al petto e calore.' },
        { t: 'Adenosina 6 mg diluita in 10 minuti', v: 'no', f: 'Somministrata lentamente viene degradata prima di arrivare al cuore e non funziona.' },
        { t: 'Digossina endovena', v: 'no', f: 'Agisce in ore e non interrompe il rientro in acuto.' },
        { t: 'Flecainide per bocca', v: 'no', f: 'Non è il trattamento acuto di prima scelta della tachicardia da rientro nodale.' }
      ],
      perche: 'L’adenosina blocca per pochi secondi il nodo AV: interrompe i rientri che lo coinvolgono e, quando non interrompe l’aritmia, smaschera l’attività atriale.', fonte: ['esc-svt-2019'], anim: 'ev', dopo: 'sinusale' },
    { tipo: 'Seguito', q: 'Ritmo sinusale ripristinato. Che cosa controlli sull’ECG di base e che cosa proponi se gli episodi si ripetono?',
      opz: [
        { t: 'Cerco PR corto e onda delta; per le recidive propongo l’ablazione transcatetere', v: 'ok', f: 'Corretto. L’ECG a riposo serve a escludere una pre-eccitazione. Nelle forme recidivanti e sintomatiche l’ablazione è il trattamento risolutivo raccomandato.' },
        { t: 'Nessun controllo: è stato un episodio benigno', v: 'no', f: 'L’ECG di base dopo il ripristino è parte della valutazione: una via accessoria cambia la gestione.' },
        { t: 'Anticoagulante orale a lungo termine', v: 'no', f: 'Non c’è indicazione: la tachicardia da rientro nodale non comporta rischio tromboembolico.' }
      ],
      perche: 'Ablazione transcatetere: prima scelta nelle tachicardie da rientro nodale sintomatiche e recidivanti.', fonte: ['esc-svt-2019'] }
  ],
  chiave: ['QRS stretto e regolare, senza P: pensa al rientro.', 'Stabile: manovre vagali, poi adenosina 6–12–18 mg in bolo rapido.', 'Instabile: cardioversione elettrica sincronizzata.', 'Dopo il ripristino cerca sempre l’onda delta.']
},
/* ------------------------------------------------------------------ 3 */
{
  id: 'fa-preeccitata', titolo: 'Tachicardia irregolare a QRS larghi in un ragazzo', tag: 'Sopraventricolari', livello: 3, minuti: 5,
  paziente: { sesso: 'M', eta: 24 },
  intro: 'Uomo di 24 anni, sportivo. Cardiopalmo violento da 20 minuti dopo una serata con alcol. Riferisce brevi episodi di batticuore fin dall’adolescenza.',
  stati: {
    arrivo: { ecg: ['fapreeccitata', { hr: 215 }], pa: '105/65', spo2: 98, fr: 22, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', polso: true }, txt: 'Pallido, sudato, vigile.' },
    fv: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, piastre: true }, txt: 'Conseguenza simulata: fibrillazione ventricolare.' },
    delta: { ecg: ['wpw', { hr: 82, pr: 96 }], pa: '120/75', spo2: 99, fr: 15, pz: VIGILE, txt: 'Ritmo sinusale con onda delta.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Tre caratteristiche di questo tracciato indicano la diagnosi. Quali?',
      opz: [
        { t: 'Ritmo irregolare, QRS larghi di forma variabile, frequenza oltre 200/min', v: 'ok', f: 'Esatto: è la triade della fibrillazione atriale pre-eccitata. Gli impulsi scendono ai ventricoli lungo una via accessoria che non ha il freno del nodo AV.' },
        { t: 'Ritmo regolare, QRS larghi tutti uguali', v: 'no', f: 'Sarebbe una tachicardia ventricolare monomorfa. Qui gli RR cambiano di continuo e i QRS non sono identici.' },
        { t: 'Ritmo irregolare, QRS stretti', v: 'no', f: 'Sarebbe una fibrillazione atriale condotta dal nodo AV. Qui i QRS sono larghi.' }
      ],
      perche: 'Una tachicardia irregolare a QRS larghi molto rapida in un giovane è una fibrillazione atriale pre-eccitata fino a prova contraria.', fonte: ['esc-svt-2019'] },
    { tipo: 'Farmaco', q: 'Viene proposto verapamil endovena «per rallentare». Che cosa rispondi?',
      opz: [
        { t: 'No: i farmaci che bloccano il nodo AV sono controindicati', v: 'ok', f: 'Corretto. Verapamil, diltiazem, beta-bloccanti, digossina e adenosina rallentano solo il nodo AV: la conduzione passa tutta sulla via accessoria e la frequenza ventricolare può degenerare in fibrillazione ventricolare. Anche l’amiodarone endovena non è raccomandato.' },
        { t: 'Sì: verapamil 5 mg endovena', v: 'grave', f: 'Bloccando il nodo AV si favorisce la conduzione lungo la via accessoria: la frequenza ventricolare aumenta e l’aritmia degenera.', cons: 'fv' },
        { t: 'Meglio digossina', v: 'grave', f: 'La digossina può accorciare la refrattarietà della via accessoria: stesso rischio.', cons: 'fv' }
      ],
      perche: 'Nella fibrillazione atriale pre-eccitata digossina, beta-bloccanti, diltiazem, verapamil e amiodarone non sono raccomandati e possono essere dannosi.', fonte: ['esc-svt-2019'] },
    { tipo: 'Decisione', q: 'Qual è allora il trattamento?',
      opz: [
        { t: 'Cardioversione elettrica sincronizzata; se stabile, in alternativa ibutilide o procainamide endovena', v: 'ok', f: 'Corretto. La cardioversione elettrica è obbligatoria nell’instabile ed è la via più sicura quando i farmaci indicati non sono disponibili.' },
        { t: 'Solo osservazione: passerà da sola', v: 'grave', f: 'Con frequenze ventricolari sopra 200/min il rischio di fibrillazione ventricolare è reale.', cons: 'fv' },
        { t: 'Adenosina 6 mg', v: 'grave', f: 'Blocca il nodo AV e non la via accessoria: può accelerare la risposta ventricolare.', cons: 'fv' }
      ],
      perche: 'Instabile: cardioversione elettrica sincronizzata. Stabile: ibutilide o procainamide endovena; la cardioversione elettrica se i farmaci falliscono.', fonte: ['esc-svt-2019'], anim: 'shock', dopo: 'delta' },
    { tipo: 'Seguito', q: 'Dopo la cardioversione l’ECG mostra PR corto e onda delta. Che cosa proponi?',
      opz: [
        { t: 'Studio elettrofisiologico e ablazione della via accessoria', v: 'ok', f: 'Corretto. Un episodio di fibrillazione atriale pre-eccitata identifica una via accessoria ad alto rischio: l’ablazione è raccomandata.' },
        { t: 'Beta-bloccante a vita', v: 'no', f: 'Non protegge dalla conduzione rapida lungo la via accessoria.' },
        { t: 'Nessun seguito se resta asintomatico', v: 'grave', f: 'Il paziente ha già avuto l’aritmia che può portare a morte improvvisa.' }
      ],
      perche: 'Ablazione transcatetere raccomandata nei pazienti con via accessoria e fibrillazione atriale pre-eccitata.', fonte: ['esc-svt-2019'] }
  ],
  chiave: ['Irregolare, largo, velocissimo: fibrillazione atriale pre-eccitata.', 'Mai farmaci che bloccano il nodo AV.', 'Cardioversione elettrica, oppure ibutilide o procainamide se stabile.', 'Poi ablazione della via accessoria.']
},
/* ------------------------------------------------------------------ 4 */
{
  id: 'bav3', titolo: 'Sincope in un uomo di 79 anni', tag: 'Blocchi AV', livello: 2, minuti: 6,
  paziente: { sesso: 'M', eta: 79 },
  intro: 'Uomo di 79 anni portato dai familiari dopo una perdita di coscienza di pochi secondi, senza prodromi. Da una settimana stanchezza marcata e capogiri. Non assume farmaci che rallentano la frequenza.',
  stati: {
    arrivo: { ecg: ['bav3', { hr: 84, esc: 'ventricolare' }], pa: '85/50', spo2: 95, fr: 18, pz: { post: 'semi', cute: 'pallido', cosc: 'confuso', polso: true }, txt: 'Pallido, rallentato, cute fredda.' },
    stimolato: { ecg: ['pmvvi', { hr: 40, pm: 70 }], pa: '115/70', spo2: 97, fr: 16, pz: { post: 'semi', cute: 'norm', cosc: 'vigile', polso: true, piastre: true }, txt: 'Stimolazione efficace: ogni spike è seguito da un QRS.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che rapporto c’è tra onde P e complessi QRS?',
      opz: [
        { t: 'P e QRS sono regolari ma indipendenti, con più P che QRS', v: 'ok', f: 'Esatto: dissociazione atrio-ventricolare completa. È un blocco AV di III grado.' },
        { t: 'Il PR si allunga progressivamente fino a una P bloccata', v: 'no', f: 'Sarebbe un blocco di II grado tipo Wenckebach. Qui il PR cambia senza alcuna regola.' },
        { t: 'Ogni P è seguita da un QRS con PR lungo e costante', v: 'no', f: 'Sarebbe un blocco di I grado. Qui molte P non sono seguite da QRS.' }
      ],
      perche: 'Nel blocco completo nessun impulso atriale raggiunge i ventricoli: li attiva un segnapassi di scappamento.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Lettura ECG', q: 'I QRS sono larghi e la frequenza ventricolare è inferiore a 40/min. Da dove nasce lo scappamento?',
      opz: [
        { t: 'Dai ventricoli, sotto il fascio di His', v: 'ok', f: 'Corretto. Uno scappamento a QRS larghi e lento è basso, instabile e può fermarsi senza preavviso.' },
        { t: 'Dalla giunzione AV', v: 'no', f: 'Lo scappamento giunzionale ha di solito QRS stretti e frequenza 40–60/min.' },
        { t: 'Dal nodo del seno', v: 'no', f: 'Il nodo del seno genera le onde P, che qui non vengono condotte.' }
      ],
      perche: 'Più basso è il segnapassi di scappamento, più è lento e inaffidabile.', fonte: ['esc-pacing-2021'] },
    { tipo: 'Farmaco', q: 'Il paziente è ipoteso e ha avuto una sincope: è instabile. Quale farmaco scegli?',
      opz: [
        { t: 'Isoprenalina 5 µg/min oppure adrenalina 2–10 µg/min in infusione', v: 'ok', f: 'Corretto: sono i farmaci di seconda linea, qui direttamente indicati, mentre si prepara la stimolazione.' },
        { t: 'Atropina 500 µg, ripetibile fino a 3 mg', v: 'no', f: 'È il primo farmaco nella bradicardia instabile, ma agisce sul nodo AV. Le linee guida ERC 2025 indicano di non somministrarla nel blocco AV di alto grado a QRS larghi: il blocco è più in basso e l’atropina non lo raggiunge.' },
        { t: 'Amiodarone', v: 'grave', f: 'Rallenta ulteriormente la conduzione e sopprime lo scappamento: rischio di asistolia.' },
        { t: 'Beta-bloccante', v: 'grave', f: 'Deprime il segnapassi di scappamento da cui il paziente dipende.' }
      ],
      perche: 'Bradicardia con segni di instabilità: atropina 500 µg fino a 3 mg, tranne nel blocco di alto grado a QRS larghi e nel trapiantato; poi isoprenalina o adrenalina in infusione e stimolazione.', fonte: ['erc-als-2025'], anim: 'ev' },
    { tipo: 'Decisione', q: 'La risposta ai farmaci è insufficiente. Qual è il passo successivo?',
      opz: [
        { t: 'Stimolazione transcutanea come ponte e stimolazione transvenosa appena possibile', v: 'ok', f: 'Corretto. La stimolazione transcutanea è dolorosa e richiede analgesia e sedazione; verifica sempre la cattura meccanica, cioè il polso.' },
        { t: 'Attendo l’effetto dell’infusione per un’ora', v: 'grave', f: 'Lo scappamento ventricolare può arrestarsi in qualsiasi momento.' },
        { t: 'Cardioversione elettrica sincronizzata', v: 'no', f: 'La cardioversione tratta le tachiaritmie. Qui serve stimolare, non interrompere.' }
      ],
      perche: 'Stimolazione transvenosa precoce nella bradicardia instabile refrattaria ai farmaci; transcutanea come ponte.', fonte: ['erc-als-2025'], anim: 'pacing', dopo: 'stimolato' },
    { tipo: 'Seguito', q: 'Stabilizzato il paziente ed escluse cause reversibili (farmaci, iperkaliemia, ischemia), qual è il trattamento definitivo?',
      opz: [
        { t: 'Impianto di pacemaker definitivo', v: 'ok', f: 'Corretto. Nel blocco AV di III grado non dovuto a cause reversibili la stimolazione permanente è indicata, con o senza sintomi.' },
        { t: 'Solo controlli periodici con Holter', v: 'grave', f: 'Il blocco completo non reversibile ha indicazione alla stimolazione permanente.' },
        { t: 'Defibrillatore impiantabile', v: 'no', f: 'Il problema è la bradicardia: il defibrillatore si valuta solo se coesistono indicazioni proprie.' }
      ],
      perche: 'Stimolazione permanente indicata nel blocco AV di III grado o di II grado tipo 2, anche asintomatico.', fonte: ['esc-pacing-2021'] }
  ],
  chiave: ['Più P che QRS, senza rapporto: blocco completo.', 'Scappamento largo e lento: sotto-hissiano, instabile.', 'Niente atropina nel blocco di alto grado a QRS larghi.', 'Isoprenalina o adrenalina, stimolazione, poi pacemaker.']
},
/* ------------------------------------------------------------------ 5 */
{
  id: 'iperkaliemia', titolo: 'Astenia in una paziente in dialisi', tag: 'Elettroliti', livello: 2, minuti: 5,
  paziente: { sesso: 'F', eta: 71 },
  intro: 'Donna di 71 anni con insufficienza renale cronica in emodialisi. Ha saltato l’ultima seduta. Debolezza muscolare ingravescente e formicolii. L’emogasanalisi mostra potassio 7,4 mmol/L.',
  stati: {
    arrivo: { ecg: ['iperk', { k: 7.4, hr: 58 }], pa: '130/80', spo2: 96, fr: 18, pz: { post: 'semi', cute: 'pallido', cosc: 'sofferente', polso: true }, txt: 'Astenica, vigile.' },
    calcio: { ecg: ['iperk', { k: 6.3, hr: 62 }], pa: '132/80', spo2: 96, fr: 18, pz: VIGILE, txt: 'Dopo il calcio il QRS si restringe. Il potassio nel sangue non è cambiato.' },
    spostato: { ecg: ['iperk', { k: 5.6, hr: 68 }], pa: '128/78', spo2: 97, fr: 16, pz: VIGILE, txt: 'Potassio 5,9 mmol/L a un’ora.' },
    arresto: { ecg: ['asistolia', {}], fc: '0', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, rcp: true }, txt: 'Conseguenza simulata: asistolia.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Quali alterazioni riconosci?',
      opz: [
        { t: 'Onde T alte e appuntite, onde P appiattite, QRS allargato', v: 'ok', f: 'Esatto: è la sequenza dell’iperkaliemia grave. Il passo successivo è il tracciato sinusoidale e l’arresto.' },
        { t: 'Onde T piatte e onde U prominenti', v: 'no', f: 'È il quadro opposto, dell’ipokaliemia.' },
        { t: 'Sopraslivellamento ST in un territorio coronarico', v: 'no', f: 'Qui domina l’alterazione di T, P e QRS in tutte le derivazioni.' }
      ],
      perche: 'L’ECG guida l’urgenza più del numero: alterazioni elettrocardiografiche con potassio elevato impongono il trattamento immediato.', fonte: ['erc-sc-2025'] },
    { tipo: 'Farmaco', q: 'Qual è il primo farmaco, e perché?',
      opz: [
        { t: 'Calcio endovena: cloruro 10% 10 mL in 5 minuti, oppure gluconato 10% 30 mL in 10 minuti', v: 'ok', f: 'Corretto. Il calcio antagonizza l’effetto del potassio sul miocardio in pochi minuti. Non abbassa la kaliemia: protegge il cuore mentre agiscono gli altri farmaci.' },
        { t: 'Furosemide endovena', v: 'no', f: 'In una paziente anurica in dialisi non elimina potassio, e comunque non protegge il miocardio.' },
        { t: 'Resina a scambio ionico per bocca e rivalutazione domani', v: 'grave', f: 'Agisce in ore. Con queste alterazioni ECG il rischio di arresto è immediato.', cons: 'arresto' },
        { t: 'Potassio cloruro, il valore sarà un errore', v: 'grave', f: 'L’ECG conferma il dato di laboratorio: somministrare potassio sarebbe fatale.', cons: 'arresto' }
      ],
      perche: 'Iperkaliemia grave con alterazioni ECG: calcio cloruro 10% 10 mL in 5 min; se non disponibile, calcio gluconato 10% 30 mL in 10 min.', fonte: ['erc-sc-2025'], anim: 'ev', dopo: 'calcio' },
    { tipo: 'Farmaco', q: 'Il cuore è protetto per 30–60 minuti. Come sposti il potassio dentro le cellule?',
      opz: [
        { t: 'Insulina rapida 10 unità con glucosio 25 g endovena, e salbutamolo 10–20 mg per aerosol', v: 'ok', f: 'Corretto. Controlla la glicemia per le ore successive: l’ipoglicemia è la complicanza più frequente, soprattutto nell’insufficienza renale.' },
        { t: 'Insulina rapida 10 unità senza glucosio', v: 'grave', f: 'Senza glucosio, con glicemia normale, provochi un’ipoglicemia grave.' },
        { t: 'Solo bicarbonato', v: 'no', f: 'Da solo ha un effetto modesto e incostante; non è il trattamento cardine fuori dall’arresto.' }
      ],
      perche: 'Insulina 10 U più glucosio 25 g nell’iperkaliemia moderata e grave; salbutamolo nebulizzato 10–20 mg come aggiunta.', fonte: ['erc-sc-2025'], anim: 'ev', dopo: 'spostato' },
    { tipo: 'Decisione', q: 'Calcio, insulina e salbutamolo non eliminano potassio dall’organismo. Come lo rimuovi in questa paziente?',
      opz: [
        { t: 'Emodialisi urgente', v: 'ok', f: 'Corretto: è il trattamento definitivo, tanto più in una paziente già in dialisi. Le misure precedenti sono solo un ponte.' },
        { t: 'Ripeto il calcio ogni ora', v: 'no', f: 'Il calcio non riduce il potassio: protegge soltanto il miocardio.' },
        { t: 'Idratazione abbondante', v: 'no', f: 'In una paziente anurica causa sovraccarico senza eliminare potassio.' }
      ],
      perche: 'Rimozione del potassio: dialisi nell’iperkaliemia grave refrattaria o nell’insufficienza renale; chelanti come il sodio zirconio ciclosilicato 10 g.', fonte: ['erc-sc-2025'] }
  ],
  chiave: ['T appuntite, P piatte, QRS largo: trattare subito.', 'Calcio: protegge il cuore, non abbassa il potassio.', 'Insulina 10 U con glucosio 25 g, più salbutamolo.', 'Poi rimuovere il potassio: dialisi.']
},
/* ------------------------------------------------------------------ 6 */
{
  id: 'arresto-fv', titolo: 'Arresto cardiaco in reparto', tag: 'Arresto cardiaco', livello: 2, minuti: 7,
  paziente: { sesso: 'M', eta: 66 },
  intro: 'Uomo di 66 anni ricoverato in medicina per polmonite. L’infermiera lo trova nel letto che non risponde. Sei il primo medico ad arrivare.',
  stati: {
    arresto: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false }, txt: 'Non risponde. Respiro assente.' },
    rcp: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, rcp: true, piastre: true, o2: true }, txt: 'Compressioni in corso. Piastre applicate.' },
    rosc: { ecg: ['stemi-inferiore', { fase: '1', st: 3, hr: 98 }], pa: '100/60', spo2: 93, fr: 12, pz: { post: 'supino', cute: 'pallido', cosc: 'incosciente', polso: true, piastre: true, o2: true }, txt: 'Polso carotideo presente. Respiro spontaneo.' }
  },
  passi: [
    { stato: 'arresto', tipo: 'Riconoscimento', q: 'Il paziente non risponde e non respira normalmente. Che cosa fai per prima cosa?',
      opz: [
        { t: 'Chiamo la squadra di rianimazione e inizio le compressioni toraciche 30:2', v: 'ok', f: 'Corretto. Incosciente con respiro assente o anormale è un arresto cardiaco: aiuto, compressioni e defibrillatore, in quest’ordine e senza pause.' },
        { t: 'Cerco un accesso venoso', v: 'grave', f: 'L’accesso venoso viene dopo. Senza compressioni il cervello resta senza flusso.' },
        { t: 'Eseguo un ECG a 12 derivazioni', v: 'grave', f: 'Ritarda le uniche due manovre che cambiano la sopravvivenza: compressioni e scarica.' }
      ],
      perche: 'Riconoscere l’arresto, chiamare aiuto, iniziare subito le compressioni e collegare il defibrillatore.', fonte: ['erc-als-2025'], anim: 'rcp', dopo: 'rcp' },
    { tipo: 'Ritmo', q: 'Il defibrillatore è collegato. Questo è il ritmo. Come procedi?',
      opz: [
        { t: 'Scarica (almeno 150 J bifasico) e ripresa immediata delle compressioni per 2 minuti', v: 'ok', f: 'Corretto. Dopo la scarica non si controlla il polso: si riprendono subito le compressioni, salvo segni evidenti di ripresa del circolo.' },
        { t: 'Scarica, poi controllo polso e ritmo per 30 secondi', v: 'no', f: 'Anche se la scarica riesce, il cuore impiega tempo a generare un flusso efficace: le compressioni vanno riprese subito.' },
        { t: 'Ritmo non defibrillabile: solo compressioni e adrenalina', v: 'grave', f: 'È una fibrillazione ventricolare: è il ritmo defibrillabile per eccellenza.' }
      ],
      perche: 'Ritmi defibrillabili: fibrillazione ventricolare e tachicardia ventricolare senza polso. Una scarica, poi 2 minuti di rianimazione.', fonte: ['erc-als-2025'], anim: 'shock' },
    { tipo: 'Farmaco', q: 'Dopo la terza scarica il ritmo è ancora fibrillazione ventricolare. Quali farmaci somministri?',
      opz: [
        { t: 'Adrenalina 1 mg e amiodarone 300 mg', v: 'ok', f: 'Corretto. Poi adrenalina 1 mg ogni 3–5 minuti; una seconda dose di amiodarone da 150 mg dopo la quinta scarica.' },
        { t: 'Adrenalina 1 mg subito dopo la prima scarica', v: 'no', f: 'Nei ritmi defibrillabili l’adrenalina si somministra dopo la terza scarica. Nei non defibrillabili, invece, appena possibile.' },
        { t: 'Atropina 3 mg', v: 'no', f: 'L’atropina non fa parte dell’algoritmo dell’arresto.' },
        { t: 'Nessun farmaco: solo scariche', v: 'no', f: 'Dopo tre scariche inefficaci adrenalina e amiodarone sono indicati.' }
      ],
      perche: 'Ritmo defibrillabile: adrenalina 1 mg dopo la terza scarica, poi ogni 3–5 min; amiodarone 300 mg dopo la terza e 150 mg dopo la quinta.', fonte: ['erc-als-2025'], anim: 'ev' },
    { tipo: 'Ragionamento', q: 'Durante i cicli cerchi le cause reversibili. Quale elenco è corretto?',
      opz: [
        { t: 'Ipossia, ipovolemia, alterazioni di potassio e metaboliche, ipotermia; trombosi coronarica o polmonare, pneumotorace iperteso, tamponamento, tossici', v: 'ok', f: 'Corretto: le quattro I e le quattro T. L’ecografia durante la rianimazione aiuta a riconoscerle.' },
        { t: 'Ipertensione, ipertiroidismo, ipercolesterolemia, iperuricemia', v: 'no', f: 'Non sono cause reversibili di arresto.' },
        { t: 'Le cause si cercano solo dopo la ripresa del circolo', v: 'no', f: 'Vanno cercate e trattate durante la rianimazione: senza correggerle il circolo non riprende.' }
      ],
      perche: 'Identificare e trattare precocemente le cause reversibili è parte dell’algoritmo.', fonte: ['erc-als-2025'], anim: 'shock', dopo: 'rosc' },
    { stato: 'rosc', tipo: 'Dopo la ripresa', q: 'Il circolo è ripreso. L’ECG a 12 derivazioni mostra questo quadro. Quali sono le priorità?',
      opz: [
        { t: 'Valutazione ABCDE, SpO₂ 94–98%, pressione sistolica sopra 100 mmHg, coronarografia urgente', v: 'ok', f: 'Corretto. L’ECG mostra un sopraslivellamento ST inferiore: la causa dell’arresto è coronarica e va trattata.' },
        { t: 'Ossigeno al 100% a tempo indefinito', v: 'no', f: 'Dopo la ripresa del circolo l’ossigeno va titolato a SpO₂ 94–98%: l’iperossia è dannosa.' },
        { t: 'Estubazione e trasferimento in reparto ordinario', v: 'grave', f: 'Il paziente è incosciente dopo un arresto: richiede terapia intensiva, controllo della temperatura e trattamento della causa.' }
      ],
      perche: 'Dopo la ripresa del circolo: ABCDE, SpO₂ 94–98% e normocapnia, pressione sistolica > 100 mmHg, ECG a 12 derivazioni, trattamento della causa, controllo della temperatura.', fonte: ['erc-als-2025'] }
  ],
  chiave: ['Non risponde, non respira: compressioni e defibrillatore.', 'Dopo la scarica, subito compressioni per 2 minuti.', 'Dopo la terza scarica: adrenalina 1 mg e amiodarone 300 mg.', 'Cerca le cause reversibili durante la rianimazione.']
},
/* ------------------------------------------------------------------ 7 */
{
  id: 'tv-polso', titolo: 'Tachicardia a QRS larghi dopo un infarto', tag: 'Ventricolari', livello: 2, minuti: 5,
  paziente: { sesso: 'M', eta: 63 },
  intro: 'Uomo di 63 anni con infarto anteriore due anni fa e frazione di eiezione del 35%. Da 15 minuti cardiopalmo, oppressione toracica e sensazione di svenimento.',
  stati: {
    arrivo: { ecg: ['tv', { vr: 185, ar: 80 }], pa: '80/50', spo2: 93, fr: 24, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'confuso', mano: true, polso: true }, txt: 'Confuso, sudato, polso debole e rapido.' },
    fv: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, piastre: true }, txt: 'Conseguenza simulata: arresto.' },
    sinusale: { ecg: ['stemi-anteriore', { fase: '3', st: 1, hr: 84 }], pa: '110/70', spo2: 96, fr: 16, pz: { post: 'semi', cute: 'norm', cosc: 'vigile', polso: true, piastre: true }, txt: 'Ritmo sinusale. Onde Q anteriori del vecchio infarto.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Tachicardia regolare a QRS larghi in un paziente con pregresso infarto. Qual è la diagnosi da assumere?',
      opz: [
        { t: 'Tachicardia ventricolare, fino a prova contraria', v: 'ok', f: 'Corretto. Con una cardiopatia strutturale, una tachicardia a QRS larghi è ventricolare nella grande maggioranza dei casi. Trattarla come sopraventricolare è l’errore pericoloso.' },
        { t: 'Tachicardia sopraventricolare con aberranza', v: 'no', f: 'È possibile ma molto meno probabile, e sbagliare in questa direzione espone a farmaci dannosi.' },
        { t: 'Tachicardia sinusale con blocco di branca', v: 'no', f: 'Non si vedono onde P sinusali davanti a ogni QRS, e l’esordio è stato improvviso.' }
      ],
      perche: 'Dissociazione atrio-ventricolare, battiti di cattura e di fusione confermano l’origine ventricolare; la loro assenza non la esclude.', fonte: ['esc-va-2022'] },
    { tipo: 'Decisione', q: 'Pressione 80/50, confusione, dolore toracico. Qual è il trattamento?',
      opz: [
        { t: 'Cardioversione elettrica sincronizzata in sedazione', v: 'ok', f: 'Corretto: il paziente ha segni di shock e ischemia. Nella tachicardia ventricolare con polso la prima scarica è di 120–150 J, con energie crescenti se inefficace.' },
        { t: 'Verapamil endovena', v: 'grave', f: 'Vasodilatatore e inotropo negativo in una tachicardia ventricolare con disfunzione ventricolare: provoca collasso emodinamico.', cons: 'fv' },
        { t: 'Manovre vagali e adenosina, con calma', v: 'no', f: 'Con segni di instabilità non c’è tempo per tentativi farmacologici.' },
        { t: 'Scarica non sincronizzata', v: 'no', f: 'Nel paziente con polso la scarica va sincronizzata sull’onda R: una scarica sull’onda T può indurre fibrillazione ventricolare.' }
      ],
      perche: 'Tachiaritmia con shock, sincope, scompenso o ischemia: cardioversione elettrica sincronizzata.', fonte: ['erc-als-2025'], anim: 'shock', dopo: 'sinusale' },
    { tipo: 'Farmaco', q: 'Se la cardioversione non avesse avuto effetto, quale sarebbe stato il passo successivo?',
      opz: [
        { t: 'Amiodarone 300 mg endovena in 10–20 minuti, poi nuovo tentativo di cardioversione', v: 'ok', f: 'Corretto. Può seguire un’infusione di 900 mg nelle 24 ore. In alternativa, dove disponibile, procainamide.' },
        { t: 'Amiodarone 300 mg in bolo rapido come nell’arresto', v: 'no', f: 'Il bolo rapido è dell’arresto. Nel paziente con circolo va infuso in 10–20 minuti per evitare l’ipotensione.' },
        { t: 'Digossina', v: 'no', f: 'Non ha alcun ruolo nelle tachicardie ventricolari.' }
      ],
      perche: 'Cardioversione inefficace con instabilità persistente: amiodarone 300 mg in 10–20 min o procainamide, poi ripetere la cardioversione.', fonte: ['erc-als-2025'] },
    { tipo: 'Seguito', q: 'Ritmo sinusale ripristinato. Non emergono cause reversibili. Quale presidio va valutato prima della dimissione?',
      opz: [
        { t: 'Defibrillatore impiantabile in prevenzione secondaria', v: 'ok', f: 'Corretto. Una tachicardia ventricolare emodinamicamente non tollerata, senza causa reversibile, è indicazione al defibrillatore impiantabile.' },
        { t: 'Pacemaker bicamerale', v: 'no', f: 'Il pacemaker tratta le bradicardie: non interrompe una tachicardia ventricolare.' },
        { t: 'Nessuno: basta l’amiodarone per bocca', v: 'no', f: 'L’antiaritmico riduce le recidive ma non protegge dalla morte improvvisa come il defibrillatore.' }
      ],
      perche: 'Defibrillatore impiantabile raccomandato dopo fibrillazione ventricolare o tachicardia ventricolare non tollerata in assenza di cause reversibili.', fonte: ['esc-va-2022'] }
  ],
  chiave: ['QRS largo e cardiopatia strutturale: è ventricolare.', 'Instabile con polso: cardioversione sincronizzata.', 'Mai verapamil in una tachicardia a QRS larghi.', 'Poi valutare il defibrillatore impiantabile.']
},
/* ------------------------------------------------------------------ 8 */
{
  id: 'torsione', titolo: 'Sincopi ripetute in corso di terapia antibiotica', tag: 'Ventricolari', livello: 3, minuti: 5,
  paziente: { sesso: 'F', eta: 68 },
  intro: 'Donna di 68 anni in terapia con un diuretico e, da quattro giorni, con claritromicina. Da ieri vomito. Due episodi di perdita di coscienza di pochi secondi nelle ultime ore. Potassio 2,9 mmol/L.',
  stati: {
    arrivo: { ecg: ['qtlungo', { qtc: 590, tipo: '2', hr: 54 }], pa: '110/65', spo2: 97, fr: 16, pz: { post: 'semi', cute: 'pallido', cosc: 'vigile', polso: true }, txt: 'Vigile, spaventata.' },
    tdp: { ecg: ['tdp', { r: 230 }], fc: '—', pa: '60/—', spo2: 90, fr: 10, pz: { post: 'supino', cute: 'pallido', cosc: 'incosciente', polso: true }, txt: 'Perde coscienza. Il polso è appena percettibile.' },
    fv: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, piastre: true }, txt: 'Conseguenza simulata: fibrillazione ventricolare.' },
    stabile: { ecg: ['qtlungo', { qtc: 520, tipo: '2', hr: 86 }], pa: '115/70', spo2: 97, fr: 16, pz: VIGILE, txt: 'Nessuna recidiva dopo magnesio e correzione del potassio.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Qual è l’alterazione principale del tracciato di base?',
      opz: [
        { t: 'Intervallo QT corretto molto prolungato, oltre 500 ms', v: 'ok', f: 'Esatto. Sopra i 500 ms il rischio di torsione di punta aumenta nettamente. Qui si sommano tre fattori: un farmaco che allunga il QT, ipokaliemia e bradicardia.' },
        { t: 'Blocco AV di II grado', v: 'no', f: 'Ogni P è condotta. L’anomalia è nella ripolarizzazione.' },
        { t: 'Sopraslivellamento ST', v: 'no', f: 'Il tratto ST non è sopraslivellato: è la distanza tra QRS e fine della T a essere eccessiva.' }
      ],
      perche: 'QT lungo acquisito: farmaci, ipokaliemia, ipomagnesiemia, bradicardia. Sesso femminile ed età avanzata aumentano il rischio.', fonte: ['esc-va-2022'] },
    { stato: 'tdp', tipo: 'Emergenza', q: 'Sul monitor compare questa aritmia. Di che cosa si tratta?',
      opz: [
        { t: 'Torsione di punta', v: 'ok', f: 'Corretto: tachicardia ventricolare polimorfa con QRS che ruotano attorno alla linea di base, su un QT lungo.' },
        { t: 'Tachicardia ventricolare monomorfa', v: 'no', f: 'Nella monomorfa i QRS sono tutti uguali. Qui ampiezza e polarità cambiano di continuo.' },
        { t: 'Artefatto da movimento', v: 'no', f: 'La paziente ha perso coscienza: è un’aritmia reale.' }
      ],
      perche: 'Torsione di punta: tachicardia ventricolare polimorfa associata a QT lungo, spesso innescata da una sequenza ciclo corto–lungo–corto.', fonte: ['esc-va-2022'] },
    { tipo: 'Farmaco', q: 'L’episodio si interrompe da solo dopo pochi secondi. Quale farmaco somministri subito?',
      opz: [
        { t: 'Magnesio solfato 2 g endovena', v: 'ok', f: 'Corretto, anche se la magnesiemia è normale. Sopprime le post-depolarizzazioni che innescano l’aritmia.' },
        { t: 'Amiodarone 300 mg', v: 'grave', f: 'L’amiodarone allunga ulteriormente il QT: può aggravare la torsione di punta.', cons: 'fv' },
        { t: 'Sotalolo', v: 'grave', f: 'È tra i farmaci che più allungano il QT.', cons: 'fv' },
        { t: 'Beta-bloccante endovena', v: 'no', f: 'Nella forma acquisita, favorita dalla bradicardia, rallentare la frequenza non aiuta.' }
      ],
      perche: 'Torsione di punta: magnesio endovena, potassio, sospensione dei farmaci responsabili; se sostenuta o senza polso, defibrillazione.', fonte: ['esc-va-2022', 'erc-als-2025'], anim: 'ev' },
    { tipo: 'Decisione', q: 'Che cos’altro è necessario per prevenire le recidive?',
      opz: [
        { t: 'Sospendere la claritromicina, correggere il potassio e aumentare la frequenza cardiaca con isoprenalina o stimolazione se le recidive sono favorite dalla bradicardia', v: 'ok', f: 'Corretto. Il potassio va portato nella parte alta della norma. Una frequenza più alta accorcia il QT e sopprime le pause che innescano l’aritmia.' },
        { t: 'Continuare la claritromicina: l’infezione ha la priorità', v: 'grave', f: 'Il farmaco responsabile va sospeso e sostituito con un antibiotico che non allunghi il QT.', cons: 'fv' },
        { t: 'Solo monitoraggio', v: 'no', f: 'Senza rimuovere le cause, la torsione di punta recidiva.' }
      ],
      perche: 'Rimuovere i farmaci che allungano il QT, correggere gli elettroliti; isoprenalina o stimolazione nelle recidive favorite dalla bradicardia.', fonte: ['esc-va-2022'], dopo: 'stabile' }
  ],
  chiave: ['QT corretto oltre 500 ms: rischio alto.', 'Torsione di punta: magnesio 2 g endovena.', 'Mai amiodarone o sotalolo: allungano il QT.', 'Togli il farmaco, correggi il potassio, alza la frequenza.']
},
/* ------------------------------------------------------------------ 9 */
{
  id: 'embolia', titolo: 'Dispnea improvvisa e sincope', tag: 'Quadri combinati', livello: 3, minuti: 6,
  paziente: { sesso: 'F', eta: 54 },
  intro: 'Donna di 54 anni in terapia estroprogestinica, rientrata ieri da un volo di 11 ore. Dispnea improvvisa seguita da una sincope. Polpaccio destro gonfio e dolente.',
  stati: {
    arrivo: { ecg: ['ep-s1q3t3', { hr: 128 }], pa: '75/45', spo2: 84, fr: 32, pz: { post: 'semi', cute: 'cianosi', sudore: true, cosc: 'sofferente', polso: true }, txt: 'Tachipnoica, cianotica, giugulari turgide.' },
    arresto: { ecg: ['pea', { hr: 40, w: 1.5 }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, rcp: true }, txt: 'Conseguenza simulata: attività elettrica senza polso.' },
    meglio: { ecg: ['ep-s1q3t3', { hr: 102 }], pa: '105/65', spo2: 94, fr: 22, pz: { post: 'semi', cute: 'norm', cosc: 'vigile', polso: true, o2: true }, txt: 'Dopo la riperfusione: pressione e saturazione in ripresa.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Quale reperto di questo tracciato è il più frequente nell’embolia polmonare?',
      opz: [
        { t: 'La tachicardia sinusale', v: 'ok', f: 'Corretto. Il quadro S1Q3T3 e le T negative in V1–V4 indicano sovraccarico destro ma sono incostanti. Un ECG normale non esclude l’embolia.' },
        { t: 'Il quadro S1Q3T3', v: 'no', f: 'È il reperto più noto, ma è presente in una minoranza dei casi.' },
        { t: 'Il sopraslivellamento ST diffuso', v: 'no', f: 'Non appartiene al quadro dell’embolia polmonare.' }
      ],
      perche: 'L’ECG nell’embolia polmonare serve soprattutto a escludere altre cause e a riconoscere il sovraccarico del ventricolo destro.', fonte: ['esc-pe-2019'] },
    { tipo: 'Valutazione', q: 'Come classifichi il rischio di questa paziente?',
      opz: [
        { t: 'Alto rischio: instabilità emodinamica', v: 'ok', f: 'Corretto. Arresto, shock ostruttivo o ipotensione persistente definiscono l’embolia ad alto rischio, indipendentemente dagli altri punteggi.' },
        { t: 'Rischio intermedio: serve prima la troponina', v: 'no', f: 'Troponina e punteggi stratificano i pazienti stabili. L’ipotensione persistente basta a definire l’alto rischio.' },
        { t: 'Basso rischio: può essere trattata a domicilio', v: 'grave', f: 'Paziente ipotesa e ipossica dopo una sincope: è la forma più grave.', cons: 'arresto' }
      ],
      perche: 'La gravità dell’embolia polmonare si definisce dal rischio di morte precoce, cioè dalla stabilità emodinamica, e non dall’estensione dei trombi.', fonte: ['esc-pe-2019'] },
    { tipo: 'Decisione', q: 'Sospetta embolia ad alto rischio. Qual è l’esame da eseguire subito?',
      opz: [
        { t: 'Ecocardiogramma al letto, oppure angio-TC se immediatamente eseguibile', v: 'ok', f: 'Corretto. Nel paziente instabile il sovraccarico acuto del ventricolo destro all’ecocardiogramma giustifica la riperfusione senza altri esami.' },
        { t: 'D-dimero', v: 'no', f: 'Serve a escludere l’embolia quando la probabilità clinica è bassa o intermedia. Qui non cambia nulla.' },
        { t: 'Scintigrafia polmonare domani mattina', v: 'grave', f: 'La paziente può morire nelle prossime ore.', cons: 'arresto' }
      ],
      perche: 'Sospetta embolia ad alto rischio: ecocardiogramma al letto o angio-TC d’urgenza, secondo disponibilità e condizioni cliniche.', fonte: ['esc-pe-2019'] },
    { tipo: 'Farmaco', q: 'L’ecocardiogramma mostra un ventricolo destro dilatato e ipocinetico. Non ci sono controindicazioni alla fibrinolisi. Quale terapia?',
      opz: [
        { t: 'Eparina non frazionata endovena subito e fibrinolisi sistemica (alteplase 100 mg in 2 ore)', v: 'ok', f: 'Corretto. L’anticoagulazione inizia senza ritardo, con bolo aggiustato per il peso. Ossigeno, noradrenalina se serve e cautela con i liquidi: il ventricolo destro è già sovraccarico.' },
        { t: 'Solo eparina a basso peso molecolare', v: 'no', f: 'È adeguata nel paziente stabile. Nell’alto rischio serve la riperfusione.' },
        { t: 'Due litri di cristalloidi in bolo', v: 'grave', f: 'Un carico di liquidi abbondante distende ulteriormente il ventricolo destro e peggiora la gittata.', cons: 'arresto' },
        { t: 'Anticoagulante orale diretto e dimissione', v: 'grave', f: 'È il trattamento delle forme a basso rischio.', cons: 'arresto' }
      ],
      perche: 'Embolia ad alto rischio: anticoagulazione immediata con eparina non frazionata e fibrinolisi sistemica. Alteplase 100 mg in 2 ore.', fonte: ['esc-pe-2019'], anim: 'ev', dopo: 'meglio' },
    { tipo: 'Ragionamento', q: 'Se la fibrinolisi fosse stata controindicata o inefficace, quale alternativa?',
      opz: [
        { t: 'Embolectomia chirurgica o trattamento percutaneo con catetere', v: 'ok', f: 'Corretto: sono le alternative di riperfusione raccomandate.' },
        { t: 'Filtro cavale da solo', v: 'no', f: 'Previene nuove embolie ma non risolve l’ostruzione in atto.' },
        { t: 'Nessuna: si prosegue con sola eparina', v: 'no', f: 'Nell’alto rischio la sola anticoagulazione non basta quando la riperfusione è possibile.' }
      ],
      perche: 'Embolectomia chirurgica raccomandata, e trattamento percutaneo da considerare, quando la fibrinolisi è controindicata o fallisce.', fonte: ['esc-pe-2019'] }
  ],
  chiave: ['Il reperto ECG più frequente è la tachicardia sinusale.', 'Ipotensione persistente: embolia ad alto rischio.', 'Eparina subito e fibrinolisi sistemica.', 'Cautela con i liquidi: il ventricolo destro è sovraccarico.']
},
/* ------------------------------------------------------------------ 10 */
{
  id: 'pericardite', titolo: 'Dolore toracico in un trentenne dopo un’influenza', tag: 'Ischemia', livello: 2, minuti: 5,
  paziente: { sesso: 'M', eta: 31 },
  intro: 'Uomo di 31 anni, non fumatore. Da ieri dolore toracico trafittivo che peggiora con il respiro e da sdraiato e migliora seduto piegato in avanti. Una settimana fa sindrome influenzale. Temperatura 37,6 °C. All’auscultazione sfregamento pericardico.',
  stati: {
    arrivo: { ecg: ['pericardite', { st: 2.5, hr: 98 }], pa: '125/75', spo2: 98, fr: 20, pz: { post: 'semi', cute: 'norm', cosc: 'sofferente', mano: true, polso: true }, txt: 'Seduto, piegato in avanti, respiro superficiale.' },
    meglio: { ecg: ['pericardite', { st: 1, hr: 76 }], pa: '120/75', spo2: 98, fr: 15, pz: VIGILE, txt: 'A una settimana: dolore scomparso.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa distingue questo sopraslivellamento ST da quello di un infarto?',
      opz: [
        { t: 'È diffuso, concavo verso l’alto, senza alterazioni reciproche, con PR sottoslivellato', v: 'ok', f: 'Esatto. Non segue un territorio coronarico. In aVR il quadro è speculare: PR sopraslivellato e ST sottoslivellato.' },
        { t: 'È limitato a V1–V4 con sottoslivellamento inferiore', v: 'no', f: 'Quello sarebbe uno STEMI anteriore con alterazioni reciproche.' },
        { t: 'È accompagnato da onde Q profonde', v: 'no', f: 'Nella pericardite non compaiono onde Q: l’infiammazione è epicardica, non c’è necrosi transmurale.' }
      ],
      perche: 'Pericardite: sopraslivellamento ST diffuso e concavo più sottoslivellamento del PR. Infarto: sopraslivellamento localizzato con alterazioni reciproche.', fonte: ['esc-peri-2025'] },
    { tipo: 'Decisione', q: 'Attivi la sala di emodinamica?',
      opz: [
        { t: 'No: dolore pleuritico, sfregamento ed ECG indicano una pericardite acuta', v: 'ok', f: 'Corretto. Completa con ecocardiogramma, indici di flogosi e troponina, che se elevata indica un interessamento miocardico.' },
        { t: 'Sì: ogni sopraslivellamento ST è un infarto', v: 'no', f: 'Una coronarografia inutile espone a rischi, e un fibrinolitico in una pericardite può causare emopericardio.' },
        { t: 'Somministro subito il fibrinolitico', v: 'grave', f: 'In una pericardite la fibrinolisi può provocare emopericardio e tamponamento.' }
      ],
      perche: 'La diagnosi di pericardite acuta combina dolore tipico, sfregamento, alterazioni ECG, versamento e indici di infiammazione.', fonte: ['esc-peri-2025'] },
    { tipo: 'Farmaco', q: 'Quale terapia imposti?',
      opz: [
        { t: 'Antinfiammatorio non steroideo o aspirina a dose piena, più colchicina per 3 mesi', v: 'ok', f: 'Corretto. La colchicina dimezza le recidive ed è parte integrante della terapia: 0,5 mg una o due volte al giorno secondo il peso. Aggiungi gastroprotezione e riposo dall’attività fisica.' },
        { t: 'Cortisone ad alte dosi subito', v: 'no', f: 'I corticosteroidi non sono la prima linea: favoriscono le recidive. Si usano a basse dosi solo se gli antinfiammatori sono controindicati o inefficaci.' },
        { t: 'Solo paracetamolo', v: 'no', f: 'Non tratta l’infiammazione pericardica e non previene le recidive.' },
        { t: 'Anticoagulante', v: 'no', f: 'Non è indicato e aumenta il rischio di emopericardio.' }
      ],
      perche: 'Pericardite acuta: antinfiammatorio non steroideo o aspirina più colchicina in prima linea; corticosteroidi in seconda linea.', fonte: ['esc-peri-2025'], anim: 'ev', dopo: 'meglio' },
    { tipo: 'Valutazione', q: 'Quale di questi elementi avrebbe imposto il ricovero?',
      opz: [
        { t: 'Febbre oltre 38 °C, versamento abbondante o tamponamento, mancata risposta alla terapia', v: 'ok', f: 'Corretto: sono segni di alto rischio, come anche l’interessamento miocardico, l’immunodepressione e la terapia anticoagulante.' },
        { t: 'Età inferiore a 40 anni', v: 'no', f: 'Non è un fattore di rischio.' },
        { t: 'Dolore che migliora da seduto', v: 'no', f: 'È una caratteristica tipica della pericardite, non un segno di gravità.' }
      ],
      perche: 'Le pericarditi ad alto rischio vanno ricoverate per monitoraggio e ricerca della causa.', fonte: ['esc-peri-2025'] }
  ],
  chiave: ['ST diffuso e concavo con PR sottoslivellato: pericardite.', 'Nessuna reciprocità, nessuna onda Q.', 'Antinfiammatorio più colchicina per 3 mesi.', 'Il cortisone non è la prima scelta.']
},
/* ------------------------------------------------------------------ 11 */
{
  id: 'fa-rapida', titolo: 'Cardiopalmo irregolare da tre giorni', tag: 'Sopraventricolari', livello: 1, minuti: 5,
  paziente: { sesso: 'F', eta: 76 },
  intro: 'Donna di 76 anni, ipertesa e diabetica. Da tre giorni batticuore irregolare e affanno per sforzi lievi. Nessun dolore toracico. Ecocardiogramma di un anno fa: frazione di eiezione 55%.',
  stati: {
    arrivo: { ecg: ['fa', { vr: 142, f: '1' }], pa: '135/85', spo2: 96, fr: 20, pz: { post: 'semi', cute: 'norm', cosc: 'sofferente', polso: true }, txt: 'Vigile, lievemente affannata.' },
    controllata: { ecg: ['fa', { vr: 88, f: '1' }], pa: '125/80', spo2: 97, fr: 16, pz: VIGILE, txt: 'Frequenza controllata. La fibrillazione atriale persiste.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Quali due elementi fanno la diagnosi?',
      opz: [
        { t: 'Intervalli RR irregolarmente irregolari e assenza di onde P', v: 'ok', f: 'Esatto: fibrillazione atriale. La linea di base mostra onde f fini e disordinate.' },
        { t: 'Onde a dente di sega a 300/min', v: 'no', f: 'Sarebbe un flutter atriale, di solito con risposta regolare.' },
        { t: 'QRS larghi e regolari', v: 'no', f: 'Qui i QRS sono stretti e gli RR tutti diversi.' }
      ],
      perche: 'Fibrillazione atriale: nessuna onda P distinguibile e intervalli RR irregolari.', fonte: ['esc-af-2024'] },
    { tipo: 'Farmaco', q: 'La paziente è stabile. Quale farmaco scegli per rallentare la frequenza?',
      opz: [
        { t: 'Beta-bloccante, oppure diltiazem o verapamil dato che la frazione di eiezione supera il 40%', v: 'ok', f: 'Corretto. Obiettivo iniziale: frequenza a riposo sotto 110/min. La digossina è un’alternativa o un’aggiunta.' },
        { t: 'Verapamil anche se la frazione di eiezione fosse del 30%', v: 'no', f: 'Con frazione di eiezione pari o inferiore al 40% diltiazem e verapamil sono da evitare: si usano beta-bloccante e digossina.' },
        { t: 'Adenosina', v: 'no', f: 'Il suo effetto dura pochi secondi: non controlla la frequenza nella fibrillazione atriale.' }
      ],
      perche: 'Controllo della frequenza: beta-bloccanti e digossina con qualsiasi frazione di eiezione; diltiazem e verapamil solo se superiore al 40%.', fonte: ['esc-af-2024'], anim: 'ev', dopo: 'controllata' },
    { tipo: 'Valutazione', q: 'Calcola il punteggio CHA₂DS₂-VA: 76 anni, ipertensione, diabete.',
      opz: [
        { t: '4 punti: anticoagulazione orale raccomandata', v: 'ok', f: 'Corretto: età pari o superiore a 75 anni vale 2, ipertensione 1, diabete 1. Con 2 o più punti l’anticoagulante è raccomandato; si preferisce un anticoagulante orale diretto.' },
        { t: '5 punti, perché è una donna', v: 'no', f: 'Le linee guida ESC 2024 hanno tolto il sesso dal punteggio: ora è CHA₂DS₂-VA.' },
        { t: '1 punto: basta l’aspirina', v: 'grave', f: 'Il punteggio è 4, e in ogni caso l’aspirina non è raccomandata per prevenire l’ictus nella fibrillazione atriale.' }
      ],
      perche: 'CHA₂DS₂-VA: 2 o più punti, anticoagulazione raccomandata; 1 punto, da considerare.', fonte: ['esc-af-2024'] },
    { tipo: 'Decisione', q: 'La paziente chiede di «rimettere a posto il ritmo» oggi stesso. L’aritmia dura da tre giorni.',
      opz: [
        { t: 'Non oggi: servono almeno 3 settimane di anticoagulazione, oppure un ecocardiogramma transesofageo che escluda trombi', v: 'ok', f: 'Corretto. Oltre le 24 ore di durata può essersi formato un trombo in auricola: la cardioversione potrebbe mobilizzarlo. Dopo la cardioversione l’anticoagulante prosegue per almeno 4 settimane.' },
        { t: 'Cardioversione elettrica immediata', v: 'grave', f: 'Senza anticoagulazione adeguata o esclusione di trombi il rischio è l’ictus embolico.' },
        { t: 'La cardioversione non si può mai fare dopo i 75 anni', v: 'no', f: 'Non esiste un limite di età: il controllo del ritmo va considerato in tutti i pazienti idonei.' }
      ],
      perche: 'Fibrillazione atriale di durata superiore a 24 ore: cardioversione solo dopo almeno 3 settimane di anticoagulazione o dopo ecocardiogramma transesofageo.', fonte: ['esc-af-2024'] }
  ],
  chiave: ['RR irregolari senza onde P: fibrillazione atriale.', 'Frequenza: beta-bloccante, diltiazem o verapamil se la frazione di eiezione supera il 40%.', 'CHA₂DS₂-VA: il sesso non conta più.', 'Oltre 24 ore: niente cardioversione senza anticoagulazione.']
},
/* ------------------------------------------------------------------ 12 */
{
  id: 'flutter', titolo: 'Frequenza fissa a 150 al minuto', tag: 'Sopraventricolari', livello: 2, minuti: 5,
  paziente: { sesso: 'M', eta: 67 },
  intro: 'Uomo di 67 anni, iperteso. Da due giorni batticuore regolare e fiato corto salendo le scale. Il saturimetro di casa segna sempre 150 battiti al minuto, a riposo come sotto sforzo.',
  stati: {
    arrivo: { ecg: ['flutter', { ratio: '2', fr: 300 }], pa: '125/80', spo2: 96, fr: 18, pz: { post: 'semi', cute: 'norm', cosc: 'sofferente', polso: true }, txt: 'Vigile, lievemente affannato.' },
    unoauno: { ecg: ['flutterv', { hr: 280 }], fc: '280', pa: '75/45', spo2: 90, fr: 26, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'confuso', polso: true, piastre: true }, txt: 'Conseguenza simulata: conduzione 1:1, frequenza ventricolare 280/min.' },
    rallentato: { ecg: ['flutter', { ratio: '4', fr: 300 }], pa: '122/78', spo2: 97, fr: 16, pz: VIGILE, txt: 'Conduzione 4:1: ora le onde di flutter si vedono bene.' },
    sinusale: { ecg: ['normale', { hr: 70, pr: 165, qtc: 410, axis: 40, axP: 55, axT: 40 }], pa: '120/75', spo2: 97, fr: 15, pz: VIGILE, txt: 'Ritmo sinusale dopo la cardioversione.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Tachicardia regolare a QRS stretti, 150/min esatti. Che cosa cerchi nelle derivazioni inferiori e in V1?',
      opz: [
        { t: 'Onde a dente di sega a 300/min, due per ogni QRS', v: 'ok', f: 'Esatto: flutter atriale con conduzione 2:1. Una delle due onde è nascosta nel QRS o nella T, per questo sfugge.' },
        { t: 'Onde P sinusali davanti a ogni QRS', v: 'no', f: 'Una tachicardia sinusale varia con lo sforzo e il riposo. Qui la frequenza è inchiodata a 150.' },
        { t: 'Assenza di attività atriale con RR irregolari', v: 'no', f: 'Sarebbe una fibrillazione atriale. Qui gli RR sono perfettamente regolari.' }
      ],
      perche: 'Una frequenza ventricolare fissa a 150/min è un flutter atriale 2:1 fino a prova contraria.', fonte: ['esc-svt-2019'] },
    { tipo: 'Farmaco', q: 'Il paziente è stabile. Viene proposta la flecainide «per rimettere il ritmo». Che cosa fai?',
      opz: [
        { t: 'Rallento la frequenza con beta-bloccante, diltiazem o verapamil, e programmo la cardioversione', v: 'ok', f: 'Corretto. Per la cardioversione le opzioni raccomandate sono quella elettrica a bassa energia oppure ibutilide o dofetilide endovena.' },
        { t: 'Flecainide endovena', v: 'grave', f: 'I farmaci di classe IC rallentano il circuito atriale: a 200/min il nodo AV può condurre ogni impulso. Il risultato è una frequenza ventricolare più alta di prima, con QRS largo.', cons: 'unoauno' },
        { t: 'Propafenone per bocca', v: 'grave', f: 'Stesso meccanismo della flecainide: rischio di conduzione 1:1.', cons: 'unoauno' }
      ],
      perche: 'Flutter atriale: flecainide e propafenone non sono raccomandati per la conversione acuta. Controllo della frequenza con beta-bloccanti o calcio-antagonisti non diidropiridinici.', fonte: ['esc-svt-2019'], anim: 'ev', dopo: 'rallentato' },
    { tipo: 'Valutazione', q: 'Il flutter comporta un rischio tromboembolico?',
      opz: [
        { t: 'Sì: l’anticoagulazione va considerata con gli stessi criteri della fibrillazione atriale', v: 'ok', f: 'Corretto. Flutter e fibrillazione spesso coesistono nello stesso paziente, e anche nel flutter l’atrio si contrae in modo inefficace.' },
        { t: 'No: l’atrio si contrae in modo regolare', v: 'no', f: 'La contrazione è regolare ma meccanicamente inefficace: i trombi si formano comunque.' },
        { t: 'Solo se dura più di un mese', v: 'no', f: 'Il rischio non ha una soglia di un mese: valgono le regole della fibrillazione atriale.' }
      ],
      perche: 'Nei pazienti con flutter atriale l’anticoagulazione va considerata come nella fibrillazione atriale.', fonte: ['esc-svt-2019'] },
    { tipo: 'Seguito', q: 'Cardioversione riuscita. Per evitare le recidive, qual è il trattamento di scelta?',
      opz: [
        { t: 'Ablazione transcatetere dell’istmo cavo-tricuspidale', v: 'ok', f: 'Corretto. Il circuito del flutter tipico passa obbligatoriamente da quell’istmo: interromperlo è risolutivo nella grande maggioranza dei casi.' },
        { t: 'Amiodarone a vita', v: 'no', f: 'È meno efficace dell’ablazione e gravato da effetti collaterali a lungo termine.' },
        { t: 'Pacemaker', v: 'no', f: 'Non ha alcun ruolo nella prevenzione del flutter.' }
      ],
      perche: 'Ablazione dell’istmo cavo-tricuspidale raccomandata nel flutter tipico sintomatico e recidivante.', fonte: ['esc-svt-2019'], dopo: 'sinusale' }
  ],
  chiave: ['150/min fissi: cerca le onde di flutter.', 'Mai flecainide o propafenone da soli: rischio di conduzione 1:1.', 'Anticoagulazione come nella fibrillazione atriale.', 'Ablazione dell’istmo cavo-tricuspidale per le recidive.']
},
/* ------------------------------------------------------------------ 13 */
{
  id: 'wellens', titolo: 'Dolore toracico passato, ECG che non va', tag: 'Ischemia', livello: 3, minuti: 5,
  paziente: { sesso: 'M', eta: 52 },
  intro: 'Uomo di 52 anni, fumatore, con familiarità per infarto. Nelle ultime 24 ore due episodi di oppressione toracica a riposo, di dieci minuti ciascuno. Ora non ha dolore. Chiede di tornare a casa.',
  stati: {
    arrivo: { ecg: ['wellens', { hr: 66, tipo: 'a' }], pa: '135/85', spo2: 98, fr: 15, pz: VIGILE, txt: 'Asintomatico, tranquillo.' },
    stemi: { ecg: ['stemi-anteriore', { fase: '1', st: 5, hr: 102 }], pa: '100/65', spo2: 95, fr: 22, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', mano: true, polso: true }, txt: 'Dolore intenso, sudorazione: occlusione dell’interventricolare anteriore.' },
    riperfuso: { ecg: ['stemi-anteriore', { fase: '2', st: 1, hr: 76 }], pa: '120/75', spo2: 97, fr: 15, pz: VIGILE, txt: 'Dopo l’angioplastica.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Il paziente è senza dolore. Che cosa mostrano V2 e V3?',
      opz: [
        { t: 'Onde T bifasiche, con ST quasi isoelettrico e senza onde Q', v: 'ok', f: 'Esatto: è il quadro di Wellens, tipo A. Compare a dolore risolto e indica una stenosi critica dell’interventricolare anteriore prossimale.' },
        { t: 'Un tracciato normale', v: 'grave', f: 'Le T bifasiche in V2–V3 sono facili da trascurare proprio perché compaiono quando il paziente sta bene.' },
        { t: 'Un sopraslivellamento ST da STEMI', v: 'no', f: 'L’ST non è sopraslivellato: l’arteria in questo momento è aperta, ma su una stenosi critica.' }
      ],
      perche: 'Sindrome di Wellens: T bifasiche o profondamente negative in V2–V3 in un paziente con angina recente, ora asintomatico.', fonte: ['esc-acs-2023'] },
    { tipo: 'Decisione', q: 'Il paziente propone un test da sforzo «per stare tranquilli». Che cosa rispondi?',
      opz: [
        { t: 'No: ricovero, monitoraggio, terapia antitrombotica e coronarografia', v: 'ok', f: 'Corretto. È una sindrome coronarica acuta ad alto rischio, anche con troponina normale o poco mossa.' },
        { t: 'Sì: test da sforzo oggi stesso', v: 'grave', f: 'Lo sforzo su una stenosi critica dell’interventricolare anteriore può provocare l’occlusione completa.', cons: 'stemi' },
        { t: 'Dimissione con aspirina e controllo tra un mese', v: 'grave', f: 'Senza trattamento questo quadro evolve spesso, in giorni o settimane, in un infarto anteriore esteso.', cons: 'stemi' }
      ],
      perche: 'Alterazioni dinamiche di ST e T identificano una sindrome coronarica acuta senza sopraslivellamento ad alto rischio: è indicata la strategia invasiva.', fonte: ['esc-acs-2023'], anim: 'ev' },
    { tipo: 'Decisione', q: 'Entro quando va eseguita la coronarografia in un paziente ad alto rischio, stabile e senza dolore?',
      opz: [
        { t: 'Entro 24 ore: strategia invasiva precoce', v: 'ok', f: 'Corretto. Diventa immediata, entro 2 ore, se compaiono dolore refrattario, instabilità emodinamica, aritmie maligne o scompenso.' },
        { t: 'Entro 72 ore va sempre bene', v: 'no', f: 'Con criteri di alto rischio la finestra è di 24 ore.' },
        { t: 'Solo se la troponina supera dieci volte il limite', v: 'no', f: 'La decisione non dipende da una soglia di troponina: contano il quadro clinico e le alterazioni ECG.' }
      ],
      perche: 'Strategia invasiva immediata nel rischio molto alto; precoce, entro 24 ore, nell’alto rischio.', fonte: ['esc-acs-2023'] },
    { stato: 'stemi', tipo: 'Emergenza', q: 'Durante l’attesa il dolore ricompare, con questo tracciato. Che cosa cambia?',
      opz: [
        { t: 'È uno STEMI anteriore: coronarografia immediata', v: 'ok', f: 'Corretto. La stenosi critica si è chiusa: ogni minuto conta.' },
        { t: 'Nitrato sublinguale e attendo l’orario programmato', v: 'grave', f: 'Con un sopraslivellamento ST la riperfusione è immediata.' },
        { t: 'Ripeto la troponina', v: 'grave', f: 'La troponina non serve per decidere la riperfusione in uno STEMI.' }
      ],
      perche: 'Sopraslivellamento ST persistente con sintomi ischemici: angioplastica primaria senza ritardi.', fonte: ['esc-acs-2023'], dopo: 'riperfuso' }
  ],
  chiave: ['T bifasiche in V2–V3 a dolore risolto: Wellens.', 'Stenosi critica dell’interventricolare anteriore prossimale.', 'Mai test da sforzo.', 'Coronarografia entro 24 ore, subito se il dolore ritorna.']
},
/* ------------------------------------------------------------------ 14 */
{
  id: 'tamponamento', titolo: 'Dispnea e ipotensione in una paziente oncologica', tag: 'Quadri combinati', livello: 2, minuti: 5,
  paziente: { sesso: 'F', eta: 61 },
  intro: 'Donna di 61 anni con carcinoma mammario metastatico. Da tre giorni affanno crescente, ora anche a riposo. Giugulari turgide, toni cardiaci ovattati, polso che quasi scompare in inspirazione.',
  stati: {
    arrivo: { ecg: ['tamponamento', { hr: 122, alt: 22, volt: 30 }], pa: '85/60', spo2: 93, fr: 28, pz: { post: 'semi', cute: 'pallido', sudore: true, cosc: 'sofferente', polso: true }, txt: 'Tachipnoica, seduta, giugulari turgide.' },
    arresto: { ecg: ['pea', { hr: 45, w: 1.4 }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, rcp: true }, txt: 'Conseguenza simulata: attività elettrica senza polso.' },
    drenata: { ecg: ['tamponamento', { hr: 98, alt: 0, volt: 78 }], pa: '115/70', spo2: 96, fr: 18, pz: VIGILE, txt: 'Dopo il drenaggio: i voltaggi risalgono, l’alternanza scompare.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Quali tre reperti compongono questo tracciato?',
      opz: [
        { t: 'Tachicardia sinusale, bassi voltaggi, alternanza elettrica del QRS', v: 'ok', f: 'Esatto. L’alternanza nasce dal cuore che oscilla dentro un versamento abbondante: l’ampiezza del QRS cambia a battiti alterni.' },
        { t: 'Fibrillazione atriale con QRS larghi', v: 'no', f: 'Il ritmo è sinusale e regolare, i QRS sono stretti.' },
        { t: 'Sopraslivellamento ST diffuso con PR sottoslivellato', v: 'no', f: 'È il quadro della pericardite acuta senza versamento importante.' }
      ],
      perche: 'Bassi voltaggi e alternanza elettrica in un paziente tachicardico e ipoteso indicano un versamento pericardico abbondante.', fonte: ['esc-peri-2025'] },
    { tipo: 'Diagnosi', q: 'Ipotensione, giugulari turgide e toni ovattati. Come si chiama questa triade, e che cosa indica?',
      opz: [
        { t: 'Triade di Beck: tamponamento cardiaco', v: 'ok', f: 'Corretto. Il polso paradosso, cioè un calo della pressione sistolica oltre 10 mmHg in inspirazione, completa il quadro.' },
        { t: 'Triade di Virchow: trombosi venosa', v: 'no', f: 'La triade di Virchow riguarda i fattori che favoriscono la trombosi.' },
        { t: 'Triade di Cushing: ipertensione endocranica', v: 'no', f: 'Quella comprende ipertensione, bradicardia e respiro irregolare.' }
      ],
      perche: 'Il tamponamento è una diagnosi clinica: il liquido impedisce il riempimento delle camere cardiache.', fonte: ['esc-peri-2025'] },
    { tipo: 'Decisione', q: 'Quale esame conferma il sospetto al letto della paziente?',
      opz: [
        { t: 'Ecocardiogramma', v: 'ok', f: 'Corretto: mostra il versamento e il collasso diastolico delle camere destre, e guida il drenaggio.' },
        { t: 'TC del torace con mezzo di contrasto', v: 'no', f: 'Una paziente instabile non va spostata se la diagnosi si può fare al letto.' },
        { t: 'Dosaggio della troponina', v: 'no', f: 'Non conferma né esclude un tamponamento.' }
      ],
      perche: 'L’ecocardiografia è l’esame di prima scelta nel sospetto di versamento pericardico e tamponamento.', fonte: ['esc-peri-2025'] },
    { tipo: 'Decisione', q: 'Tamponamento confermato. Qual è il trattamento?',
      opz: [
        { t: 'Pericardiocentesi urgente sotto guida ecografica', v: 'ok', f: 'Corretto. Un carico di liquidi può sostenere la pressione per pochi minuti, come ponte al drenaggio. In una paziente oncologica il liquido va analizzato.' },
        { t: 'Furosemide endovena per ridurre le giugulari', v: 'grave', f: 'Il turgore giugulare qui è la pressione che ancora riempie il cuore: ridurre il precarico fa crollare la gittata.', cons: 'arresto' },
        { t: 'Nitrato endovena', v: 'grave', f: 'La vasodilatazione riduce il ritorno venoso da cui dipende il riempimento.', cons: 'arresto' },
        { t: 'Solo antinfiammatori e colchicina', v: 'no', f: 'Trattano la pericardite, non un tamponamento in atto.' }
      ],
      perche: 'Nel tamponamento cardiaco il drenaggio pericardico urgente è il trattamento; diuretici e vasodilatatori sono controindicati.', fonte: ['esc-peri-2025'], anim: 'ev', dopo: 'drenata' }
  ],
  chiave: ['Bassi voltaggi e alternanza elettrica: versamento abbondante.', 'Triade di Beck e polso paradosso.', 'Ecocardiogramma al letto.', 'Pericardiocentesi; mai diuretici o vasodilatatori.']
},
/* ------------------------------------------------------------------ 15 */
{
  id: 'brugada', titolo: 'Sincope notturna con febbre alta', tag: 'Elettroliti', livello: 3, minuti: 5,
  paziente: { sesso: 'M', eta: 34 },
  intro: 'Uomo di 34 anni con influenza e febbre a 39,2 °C. Stanotte, a letto, ha perso coscienza per circa un minuto con respiro rumoroso, secondo la moglie. Un fratello è morto nel sonno a 38 anni. Nessun dolore toracico.',
  stati: {
    arrivo: { ecg: ['brugada', { hr: 98 }], pa: '120/75', spo2: 97, fr: 20, pz: { post: 'semi', cute: 'norm', sudore: true, cosc: 'vigile', polso: true }, txt: 'Febbrile, sudato, vigile.' },
    fv: { ecg: ['fv', { amp: '0.55' }], fc: '—', pa: 'non rilevabile', spo2: null, fr: 0, pz: { post: 'supino', cute: 'cianosi', cosc: 'incosciente', polso: false, piastre: true }, txt: 'Conseguenza simulata: fibrillazione ventricolare.' },
    sfebbrato: { ecg: ['brugada2', { hr: 74 }], pa: '118/72', spo2: 98, fr: 15, pz: VIGILE, txt: 'Temperatura 37,1 °C: il sopraslivellamento si attenua.' }
  },
  passi: [
    { stato: 'arrivo', tipo: 'Lettura ECG', q: 'Che cosa vedi in V1 e V2?',
      opz: [
        { t: 'ST sopraslivellato di almeno 2 mm, discendente «a tenda», seguito da T negativa', v: 'ok', f: 'Esatto: pattern di Brugada tipo 1. La febbre lo smaschera o lo accentua.' },
        { t: 'Un blocco di branca destra con rsR′', v: 'no', f: 'Nel blocco di branca destra c’è una S larga in DI e V6, e l’ST non è sopraslivellato in questo modo.' },
        { t: 'Uno STEMI anteriore', v: 'no', f: 'Non ci sono dolore né alterazioni reciproche, e il quadro è confinato a V1–V2 con questa forma caratteristica.' }
      ],
      perche: 'Il pattern tipo 1, spontaneo o indotto dalla febbre, è l’unico diagnostico per la sindrome di Brugada.', fonte: ['esc-va-2022'] },
    { tipo: 'Decisione', q: 'Qual è il primo provvedimento?',
      opz: [
        { t: 'Abbassare subito la febbre con antipiretici, con monitoraggio ECG continuo', v: 'ok', f: 'Corretto. La febbre riduce ulteriormente la corrente del sodio: trattarla è una misura antiaritmica.' },
        { t: 'Attivare la sala di emodinamica', v: 'no', f: 'Non è un’occlusione coronarica.' },
        { t: 'Dimettere con paracetamolo al bisogno', v: 'grave', f: 'Sincope a riposo, familiarità per morte improvvisa e pattern tipo 1: è un paziente ad alto rischio.', cons: 'fv' }
      ],
      perche: 'Nella sindrome di Brugada è raccomandato il trattamento tempestivo della febbre con antipiretici.', fonte: ['esc-va-2022'], anim: 'ev', dopo: 'sfebbrato' },
    { tipo: 'Farmaco', q: 'Quali farmaci vanno evitati in questo paziente?',
      opz: [
        { t: 'I bloccanti dei canali del sodio, come flecainide e propafenone, e gli altri farmaci che accentuano il pattern', v: 'ok', f: 'Corretto. Riducono la stessa corrente già carente. Vanno evitati anche l’eccesso di alcol e i pasti molto abbondanti.' },
        { t: 'Nessuno in particolare', v: 'grave', f: 'Diversi farmaci di uso comune possono scatenare aritmie ventricolari in questi pazienti.', cons: 'fv' },
        { t: 'Solo gli antipiretici', v: 'grave', f: 'Gli antipiretici sono al contrario raccomandati.', cons: 'fv' }
      ],
      perche: 'Raccomandato evitare i farmaci che possono indurre il sopraslivellamento ST nelle precordiali destre, l’eccesso di alcol e i pasti abbondanti.', fonte: ['esc-va-2022'] },
    { tipo: 'Seguito', q: 'La sincope è stata con ogni probabilità aritmica. Quale presidio va valutato?',
      opz: [
        { t: 'Defibrillatore impiantabile', v: 'ok', f: 'Corretto. È raccomandato dopo un arresto cardiaco e va considerato nei pazienti con pattern tipo 1 e sincope aritmica.' },
        { t: 'Pacemaker', v: 'no', f: 'Non protegge dalla fibrillazione ventricolare.' },
        { t: 'Nessuno: basta evitare la febbre', v: 'no', f: 'Le misure generali restano necessarie ma non bastano dopo una sincope aritmica.' }
      ],
      perche: 'Sindrome di Brugada: defibrillatore impiantabile nei sopravvissuti ad arresto cardiaco e, da considerare, dopo sincope aritmica con pattern tipo 1.', fonte: ['esc-va-2022'] }
  ],
  chiave: ['ST «a tenda» in V1–V2 con T negativa: Brugada tipo 1.', 'La febbre lo smaschera: antipiretici subito.', 'Evitare i bloccanti dei canali del sodio.', 'Sincope aritmica: valutare il defibrillatore.']
}
];


const API = { FONTI, CASI };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_CASI_DATI = API;
})(typeof window !== 'undefined' ? window : this);
