/* Isoelettrica — Guide rapide dei Casi clinici (v47).
   File di soli dati. Ogni soglia o dose compare già in un caso o in una scheda dell'app
   ed è riferita alla fonte indicata (identificatori di ISO_CASI_DATI.FONTI).
   Schema: { id, titolo, sotto, minuti, sezioni:[{ h, p?, punti?[] }], errori[], casi[], tracciati[[idScenario, etichetta]], fonte[] } */
(function (root) {
'use strict';
const GUIDE = [
{
  id: 'metodo', titolo: 'Leggere un ECG in otto passi', sotto: 'Sempre nello stesso ordine, anche quando la diagnosi sembra ovvia.', minuti: 5,
  sezioni: [
    { h: '0 · Prima del tracciato', punti: ['Nome, data e ora: è l’ECG del paziente giusto?', 'Taratura: 25 mm/s e 10 mm/mV. Un quadretto piccolo vale 40 ms e 0,1 mV.', 'Qualità: linea di base stabile, nessuna derivazione staccata.', 'Montaggio: P positiva in DI e negativa in aVR. Se è il contrario, sospetta i cavi.'] },
    { h: '1 · Frequenza', punti: ['Ritmo regolare: 300 diviso il numero di quadrati grandi fra due R.', 'Ritmo irregolare: conta i QRS in 10 secondi (tutta la striscia) e moltiplica per 6.', 'Normale 60–100 al minuto.'] },
    { h: '2 · Ritmo', punti: ['Gli intervalli RR sono regolari, irregolari a gruppi, o del tutto irregolari?', 'Sinusale se: P positiva in DI, DII e aVF, negativa in aVR, e ogni P è seguita da un QRS.'] },
    { h: '3 · Onda P e intervallo PR', punti: ['C’è una P davanti a ogni QRS? C’è un QRS dopo ogni P?', 'PR normale 120–200 ms: corto pensa alla pre-eccitazione, lungo al blocco AV di I grado.', 'PR che cambia: si allunga progressivamente (Mobitz 1) o non ha alcun rapporto con il QRS (blocco completo)?'] },
    { h: '4 · QRS', punti: ['Durata normale fino a 110 ms; da 120 ms in su cerca un blocco di branca, un ritmo ventricolare, una pre-eccitazione, l’iperkaliemia.', 'Onde Q patologiche? Voltaggi alti o bassi?', 'Progressione dell’onda R da V1 a V6.'] },
    { h: '5 · Asse', punti: ['DI e aVF entrambi positivi: asse normale.', 'DI positivo e aVF negativo: guarda DII. Se è negativo, deviazione a sinistra.', 'DI negativo e aVF positivo: deviazione a destra. Prima di crederci, controlla i cavi.'] },
    { h: '6 · Tratto ST', punti: ['Misuralo al punto J rispetto al tratto TP.', 'Sopra o sotto? In quali derivazioni? Seguono un territorio coronarico? C’è l’immagine reciproca?'] },
    { h: '7 · Onda T', punti: ['Concorde con il QRS? Simmetrica? Alta, piatta, invertita?', 'Dopo la T c’è un’onda U?'] },
    { h: '8 · QT', punti: ['Misuralo in DII o V5, dall’inizio del QRS alla fine della T, e correggilo per la frequenza.', 'QTc prolungato: da 450 ms nell’uomo e da 460 ms nella donna. Oltre 500 ms il rischio di torsione di punta è alto.'] },
    { h: 'Alla fine', p: 'Metti insieme i reperti in una frase e confrontala con il paziente: un tracciato si referta sempre accanto a una persona, a un sintomo e, se esiste, a un ECG precedente.' }
  ],
  errori: ['Partire dal tratto ST e dimenticare il ritmo.', 'Fidarsi dell’interpretazione automatica.', 'Non confrontare con un tracciato precedente.', 'Non guardare aVR: spesso è la derivazione che decide.'],
  casi: ['inversione-elettrodi', 'ripolarizzazione-precoce'], tracciati: [['normale', 'ECG normale']], fonte: ['aha-ecg-2007', 'esc-va-2022']
},
{
  id: 'tachicardia', titolo: 'Tachicardia: quattro domande', sotto: 'Polso? Instabile? Stretta o larga? Regolare o irregolare?', minuti: 5,
  sezioni: [
    { h: '1 · Ha polso?', p: 'Se non risponde e non respira è un arresto cardiaco: vai alla guida dell’arresto.' },
    { h: '2 · È instabile?', punti: ['Segni di allarme: shock, sincope, scompenso cardiaco, ischemia miocardica.', 'Se è presente anche uno solo: cardioversione elettrica sincronizzata, qualunque sia la tachiaritmia.'] },
    { h: '3 · QRS stretto e regolare', punti: ['Manovre vagali.', 'Se inefficaci: adenosina 6 mg in bolo rapido con lavaggio; poi 12 mg, poi 18 mg.', 'Quando l’adenosina non interrompe l’aritmia, rallenta i ventricoli quel tanto che basta per vedere che cosa fanno gli atri (per esempio le onde di un flutter).'] },
    { h: '4 · QRS stretto e irregolare', punti: ['Di solito è una fibrillazione atriale.', 'Controllo della frequenza: beta-bloccanti e digossina con qualsiasi frazione di eiezione; diltiazem e verapamil solo se è superiore al 40%.', 'Calcola CHA₂DS₂-VA: 2 o più punti, anticoagulazione raccomandata.'] },
    { h: '5 · QRS largo e regolare', p: 'Fino a prova contraria è una tachicardia ventricolare. Nel dubbio si tratta come tale: trattare una tachicardia ventricolare come sopraventricolare è l’errore pericoloso, non il contrario.' },
    { h: '6 · QRS largo e irregolare', punti: ['Molto rapida, con QRS che cambiano forma battito per battito: fibrillazione atriale pre-eccitata. Niente farmaci che bloccano il nodo AV (adenosina, verapamil, diltiazem, beta-bloccanti, digossina) e niente amiodarone: cardioversione elettrica, oppure ibutilide o procainamide se stabile.', 'Polimorfa con asse che ruota e QT lungo: torsione di punta. Magnesio solfato 2 g endovena, correggi il potassio, sospendi i farmaci che allungano il QT.'] }
  ],
  errori: ['Dare un calcio-antagonista a una tachicardia a QRS largo.', 'Dare adenosina a una tachicardia irregolare a QRS largo.', 'Dare amiodarone in una torsione di punta.', 'Aspettare i farmaci in un paziente instabile.'],
  casi: ['tpsv', 'fa-preeccitata', 'tv-polso', 'torsione', 'fa-rapida', 'flutter'], tracciati: [['avnrt', 'Tachicardia da rientro nodale'], ['tv', 'Tachicardia ventricolare'], ['fapreeccitata', 'Fibrillazione atriale pre-eccitata']], fonte: ['erc-als-2025', 'esc-svt-2019', 'esc-af-2024', 'esc-va-2022']
},
{
  id: 'bradicardia', titolo: 'Bradicardia: dove si è fermato l’impulso', sotto: 'Prima il paziente, poi la sede del blocco.', minuti: 5,
  sezioni: [
    { h: '1 · È instabile?', punti: ['Segni di allarme: shock, sincope, scompenso cardiaco, ischemia miocardica.', 'Atropina 500 µg endovena, ripetibile fino a 3 mg.', 'Se non basta: isoprenalina, oppure adrenalina 2–10 µg/min in infusione, e stimolazione (transcutanea come ponte, transvenosa appena possibile).', 'Niente atropina nel blocco AV di alto grado a QRS larghi e nel cuore trapiantato.'] },
    { h: '2 · C’è rischio di asistolia?', punti: ['Asistolia recente.', 'Blocco AV di II grado Mobitz 2.', 'Blocco AV completo a QRS larghi.', 'Pause ventricolari oltre 3 secondi.', 'Con uno di questi: monitor continuo e stimolazione pronta, anche se ora il paziente sta bene.'] },
    { h: '3 · Dove si è fermato l’impulso?', punti: ['Mancano le P: è il nodo del seno (bradicardia sinusale, pause, arresto sinusale).', 'Le P ci sono ma non tutte conducono: è la giunzione AV.', 'PR che si allunga fino a una P bloccata: Mobitz 1, di solito nel nodo, di solito benigno.', 'PR fisso e P bloccata all’improvviso: Mobitz 2, sotto il nodo, pericoloso.', 'P e QRS indipendenti: blocco completo. QRS stretto, scappamento alto e più affidabile; QRS largo, scappamento basso e instabile.'] },
    { h: '4 · C’è una causa reversibile?', p: 'Farmaci che rallentano (beta-bloccanti, calcio-antagonisti non diidropiridinici, digossina), ischemia (soprattutto infarto inferiore), iperkaliemia, ipotermia, ipotiroidismo.' },
    { h: '5 · Chi ha bisogno del pacemaker', punti: ['Blocco AV di II grado tipo 2, di alto grado o di III grado, permanente o parossistico: sì, anche senza sintomi.', 'Mobitz 1: solo se dà sintomi o se la sede è sotto il nodo.', 'Malattia del nodo del seno: quando i sintomi sono chiaramente dovuti alla bradicardia. Nella forma bradicardia-tachicardia il pacemaker permette anche di usare i farmaci per la tachiaritmia.', 'Blocco AV dopo infarto: si aspetta; pacemaker se il blocco di alto grado non regredisce entro 5 giorni.'] }
  ],
  errori: ['Contare la frequenza e non guardare il PR.', 'Dimettere un Mobitz 2 perché «ora sta bene».', 'Impiantare un pacemaker a un atleta con un Wenckebach notturno.', 'Dare un beta-bloccante a una sindrome bradicardia-tachicardia senza pacemaker.'],
  casi: ['bav3', 'mobitz-2', 'wenckebach-atleta', 'bradi-tachi', 'stemi-inferiore-vd'], tracciati: [['wenck', 'Mobitz 1'], ['mobitz2', 'Mobitz 2'], ['bav3', 'Blocco completo']], fonte: ['erc-als-2025', 'esc-pacing-2021', 'esc-acs-2023']
},
{
  id: 'arresto', titolo: 'Arresto cardiaco: due strade', sotto: 'Defibrillabile o no. Tutto il resto è uguale.', minuti: 4,
  sezioni: [
    { h: '1 · Riconoscere', p: 'Non risponde e non respira normalmente: è un arresto, qualunque cosa mostri il monitor. Chiama aiuto, inizia le compressioni, collega il defibrillatore.' },
    { h: '2 · Ritmo defibrillabile', punti: ['Fibrillazione ventricolare e tachicardia ventricolare senza polso.', 'Una scarica, poi subito 2 minuti di compressioni senza ricontrollare il polso.', 'Dopo la terza scarica: adrenalina 1 mg e amiodarone 300 mg.', 'Adrenalina 1 mg ogni 3–5 minuti; amiodarone 150 mg dopo la quinta scarica.'] },
    { h: '3 · Ritmo non defibrillabile', punti: ['Asistolia e attività elettrica senza polso.', 'Nessuna scarica. Compressioni e controllo del ritmo ogni 2 minuti.', 'Adrenalina 1 mg appena c’è un accesso, poi ogni 3–5 minuti.'] },
    { h: '4 · Cause reversibili', punti: ['Ipossia.', 'Ipovolemia.', 'Ipo e iperkaliemia e altre alterazioni metaboliche.', 'Ipo e ipertermia.', 'Trombosi coronarica o polmonare.', 'Pneumotorace iperteso.', 'Tamponamento cardiaco.', 'Tossici.'] },
    { h: '5 · Tre eccezioni da ricordare', punti: ['Iperkaliemia in arresto: calcio cloruro 10% 10 mL e sodio bicarbonato 50 mmol, in vie separate o con lavaggio fra l’uno e l’altro.', 'Ipokaliemia in arresto: cloruro di potassio 20 mmol in 2–3 minuti, poi 10 mmol in 2 minuti.', 'Ipotermia sotto 30 °C: al massimo tre scariche e niente adrenalina finché non si superano i 30 °C; fra 30 e 35 °C intervallo fra le dosi di 6–10 minuti.'] }
  ],
  errori: ['Fermarsi a guardare il monitor dopo la scarica.', 'Defibrillare un’asistolia.', 'Dare adrenalina subito in un ritmo defibrillabile, o tardi in uno non defibrillabile.', 'Non cercare la causa.'],
  casi: ['arresto-fv', 'pea-ipovolemia', 'ipotermia', 'iperkaliemia'], tracciati: [['fv', 'Fibrillazione ventricolare'], ['pea', 'Attività elettrica senza polso'], ['asistolia', 'Asistolia']], fonte: ['erc-als-2025', 'erc-sc-2025', 'rcuk-sc-2025']
},
{
  id: 'dolore-toracico', titolo: 'Dolore toracico: l’ECG in dieci minuti', sotto: 'La domanda non è «c’è un infarto?» ma «c’è una coronaria chiusa?».', minuti: 6,
  sezioni: [
    { h: '1 · Sopraslivellamento ST: le soglie', punti: ['In almeno due derivazioni contigue, misurato al punto J.', 'In V2–V3: almeno 2,5 mm nell’uomo sotto i 40 anni, 2 mm nell’uomo da 40 anni in su, 1,5 mm nella donna.', 'Nelle altre derivazioni: almeno 1 mm.', 'In V7–V9 e in V3R–V4R: almeno 0,5 mm.', 'Le soglie valgono in assenza di ipertrofia ventricolare sinistra e di blocco di branca sinistra.'] },
    { h: '2 · I territori', punti: ['V1–V4: anteriore, discendente anteriore.', 'DI, aVL, V5–V6: laterale, circonflessa o un ramo diagonale.', 'DII, DIII, aVF: inferiore, di solito coronaria destra.', 'V7–V9: posteriore. V3R–V4R: ventricolo destro.'] },
    { h: '3 · Quando l’ST non sale ma la coronaria è chiusa', punti: ['Sottoslivellamento in V1–V3 con T terminale positiva: infarto posteriore. Registra V7–V9.', 'Sottoslivellamento al punto J che risale in T alte e simmetriche nelle precordiali: quadro di de Winter.', 'Sottoslivellamento di almeno 1 mm in sei o più derivazioni con sopraslivellamento in aVR e/o V1: più vasi o tronco comune, soprattutto se c’è compromissione emodinamica.'] },
    { h: '4 · Derivazioni aggiuntive', p: 'V3R, V4R e V7–V9 sono raccomandate in ogni infarto inferiore e quando si sospetta un’occlusione ma le derivazioni standard non sono conclusive.' },
    { h: '5 · Che cosa fare', punti: ['Infarto con sopraslivellamento o equivalente: angioplastica primaria immediata. Se non è eseguibile entro 120 minuti dalla diagnosi, fibrinolisi.', 'Senza sopraslivellamento, rischio molto alto (instabilità emodinamica o shock, dolore ricorrente o refrattario, scompenso acuto, aritmie minacciose, complicanze meccaniche, alterazioni ECG dinamiche ricorrenti): coronarografia immediata.', 'Senza sopraslivellamento, rischio alto (infarto confermato dalla troponina, alterazioni dinamiche di ST o T, sopraslivellamento transitorio, GRACE oltre 140): coronarografia da considerare entro 24 ore.', 'Tutti: aspirina in carico e anticoagulante parenterale. Ossigeno solo se la saturazione è sotto il 90%.', 'Niente nitrati se c’è ipotensione o infarto del ventricolo destro.'] }
  ],
  errori: ['Aspettare la troponina davanti a un sopraslivellamento.', 'Chiamare NSTEMI un infarto posteriore.', 'Non ripetere l’ECG se il dolore continua.', 'Dimenticare V4R nell’infarto inferiore ipoteso.'],
  casi: ['stemi-anteriore', 'stemi-inferiore-vd', 'stemi-posteriore', 'de-winter', 'nstemi-diffuso', 'wellens'], tracciati: [['stemi-anteriore', 'STEMI anteriore'], ['stemi-posteriore', 'STEMI posteriore'], ['dewinter', 'de Winter']], fonte: ['esc-acs-2023']
},
{
  id: 'st-sopra', titolo: 'ST sopraslivellato: non è sempre infarto', sotto: 'Tre domande e sei quadri da distinguere.', minuti: 5,
  sezioni: [
    { h: 'Le tre domande', punti: ['Ci sono sintomi compatibili con ischemia?', 'Il sopraslivellamento segue un territorio e ha un’immagine reciproca?', 'Il tracciato cambia rispetto a uno precedente o a uno ripetuto dopo 10–15 minuti?'] },
    { h: 'Infarto', p: 'Segue un territorio coronarico, ST spesso convesso, sottoslivellamento reciproco, evoluzione in minuti-ore, onde Q.' },
    { h: 'Pericardite', p: 'Diffuso, concavo, senza reciprocità tranne in aVR e V1; PR sottoslivellato; dolore che cambia con il respiro e la posizione.' },
    { h: 'Ripolarizzazione precoce', p: 'Onda J (intaccatura alla fine del QRS) con punto J sopraslivellato di almeno 1 mm in due derivazioni contigue inferiori e/o laterali; ST concavo; stabile nel tempo; persona giovane, asintomatica.' },
    { h: 'Brugada', p: 'Solo in V1–V2: ST «a tenda» discendente con T negativa (tipo 1). Controlla la temperatura: la febbre lo smaschera e va trattata.' },
    { h: 'Blocco di branca sinistra e ipertrofia ventricolare sinistra', p: 'ST sopraslivellato in V1–V3 discordante rispetto a un QRS profondo e negativo: è secondario alla depolarizzazione anomala. Le soglie dell’infarto qui non valgono.' },
    { h: 'Ipotermia e iperkaliemia', p: 'Onda J di Osborn alla fine del QRS con bradicardia nel paziente freddo. Nell’iperkaliemia grave può comparire un sopraslivellamento nelle precordiali destre, con T a tenda e QRS largo.' }
  ],
  errori: ['Decidere dalla sola morfologia senza guardare il paziente.', 'Portare in emodinamica una pericardite.', 'Rassicurare un infarto inferiore perché «l’ST è solo 1 mm».'],
  casi: ['stemi-anteriore', 'pericardite', 'ripolarizzazione-precoce', 'brugada', 'ipotermia'], tracciati: [['pericardite', 'Pericardite'], ['ripol-precoce', 'Ripolarizzazione precoce'], ['brugada', 'Brugada tipo 1']], fonte: ['esc-acs-2023', 'esc-peri-2025', 'esc-va-2022']
},
{
  id: 'potassio', titolo: 'Potassio: alto e basso', sotto: 'Due tracciati opposti, due terapie opposte.', minuti: 4,
  sezioni: [
    { h: 'Iperkaliemia: che cosa si vede', p: 'In ordine di comparsa: T alte e appuntite; P che si appiattisce fino a scomparire, PR lungo; QRS che si allarga; infine un’onda sinusoidale che precede l’arresto.' },
    { h: 'Iperkaliemia: che cosa si fa', punti: ['Grave con alterazioni ECG: calcio cloruro 10% 10 mL endovena in 5 minuti; se non disponibile, calcio gluconato 10% 30 mL in 10 minuti. Protegge il cuore, non abbassa il potassio.', 'Moderata (6,0–6,4 mmol/L) e grave (da 6,5 mmol/L): insulina rapida 10 unità con glucosio 25 g endovena.', 'In aggiunta: salbutamolo nebulizzato 10–20 mg.', 'Poi si rimuove il potassio dall’organismo e si tratta la causa.'] },
    { h: 'Ipokaliemia: che cosa si vede', p: 'T basse o piatte, ST sottoslivellato, onde U (meglio in V2–V3), QT apparentemente lungo. Il rischio è la torsione di punta.' },
    { h: 'Ipokaliemia: che cosa si fa', punti: ['La terapia è guidata dalla gravità e dalla presenza di sintomi o alterazioni ECG.', 'Potassio endovena in infusione controllata con monitor ECG, secondo il protocollo del reparto.', 'Correggi insieme il magnesio: senza magnesio il potassio non risale.', 'Il bolo rapido di potassio esiste solo nell’arresto cardiaco da ipokaliemia.'] }
  ],
  errori: ['Aspettare il laboratorio davanti a T a tenda e QRS largo.', 'Pensare che il calcio abbassi il potassio.', 'Correggere il potassio e dimenticare il magnesio.', 'Somministrare potassio in bolo a un paziente con polso.'],
  casi: ['iperkaliemia', 'ipokaliemia', 'torsione'], tracciati: [['iperk', 'Iperkaliemia'], ['ipok', 'Ipokaliemia']], fonte: ['erc-sc-2025', 'rcuk-sc-2025']
}
];
if (typeof module !== 'undefined' && module.exports) module.exports = GUIDE; else root.ISO_CASI_GUIDE = GUIDE;
})(typeof self !== 'undefined' ? self : this);
