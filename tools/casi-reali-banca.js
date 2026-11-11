/* Isoelettrica — Casi clinici: ECG reali.
   File generato da tools/build-casi-reali.py: non modificare a mano l'elenco.
   Tracciato, età, sesso e referto provengono da PTB-XL 1.0.3 (Wagner et al.,
   PhysioNet, CC BY 4.0). Il database non contiene sintomi, terapia né decorso:
   la seconda domanda di ogni caso è generale sul quadro riconosciuto e non
   descrive la storia di quel paziente. */
(function (root) {
'use strict';
/*__DATI__*/
const FONTI = {
  'aha-ecg-2009-3': { t: 'AHA/ACCF/HRS 2009 — Interpretazione dell’ECG, parte III: disturbi di conduzione intraventricolare', r: 'Surawicz B et al. Circulation 2009;119:e235–e240', u: 'https://doi.org/10.1161/CIRCULATIONAHA.108.191095' },
  'aha-ecg-2009-5': { t: 'AHA/ACCF/HRS 2009 — Interpretazione dell’ECG, parte V: ipertrofie', r: 'Hancock EW et al. Circulation 2009;119:e251–e261', u: 'https://doi.org/10.1161/CIRCULATIONAHA.108.191097' },
  'aha-ecg-2009-6': { t: 'AHA/ACCF/HRS 2009 — Interpretazione dell’ECG, parte VI: ischemia e infarto', r: 'Wagner GS et al. Circulation 2009;119:e262–e270', u: 'https://doi.org/10.1161/CIRCULATIONAHA.108.191098' }
};
/* nome: risposta mostrata · simili: classi usate come alternative · q/opz/perche/fonte: seconda domanda */
const CLASSI = {
  NORM: { nome: 'ECG nei limiti della norma', simili: ['1AVB', 'SBRAD', 'LAFB'], q: 'Quali valori di PR e QRS sono normali nell’adulto?',
    opz: [['PR tra 120 e 200 ms, QRS inferiore a 120 ms', 'ok', 'Sono i limiti di riferimento: un PR più lungo è un blocco AV di I grado, un QRS di 120 ms o più è un blocco di branca completo o un’altra conduzione anomala.'], ['PR tra 200 e 300 ms, QRS inferiore a 120 ms', 'no', 'Un PR oltre 200 ms è già un blocco AV di I grado.'], ['PR tra 120 e 200 ms, QRS tra 120 e 160 ms', 'no', 'Un QRS di 120 ms o più non è normale.']],
    perche: 'Riconoscere il normale è la prima competenza: ogni alterazione si legge per differenza.', fonte: ['aha-ecg-2009-3'] },
  AFIB: { nome: 'Fibrillazione atriale', simili: ['AFLT', 'SVT', 'PVC'], q: 'Da che cosa dipende l’indicazione all’anticoagulante in un paziente con questo ritmo?',
    opz: [['Dal rischio tromboembolico, stimato con il punteggio CHA₂DS₂-VA', 'ok', 'Con 2 o più punti l’anticoagulazione è raccomandata, con 1 punto va considerata. Il sesso non fa più parte del punteggio.'], ['Dalla frequenza ventricolare', 'no', 'La frequenza guida la terapia dei sintomi, non la prevenzione dell’ictus.'], ['Dal fatto che l’aritmia sia parossistica o permanente', 'no', 'Il rischio di ictus non dipende dal tipo di fibrillazione atriale.']],
    perche: 'Nella fibrillazione atriale la prevenzione dell’ictus si decide sul rischio del paziente, non sul ritmo del momento.', fonte: ['esc-af-2024'] },
  AFLT: { nome: 'Flutter atriale', simili: ['AFIB', 'SVT', 'STACH'], q: 'Una frequenza ventricolare regolare intorno a 150/min deve far pensare a un flutter. Perché?',
    opz: [['Gli atri battono a circa 300/min e il nodo AV conduce un impulso ogni due', 'ok', 'La conduzione 2:1 nasconde una delle due onde di flutter nel QRS o nella T: vanno cercate in DII, DIII, aVF e V1.'], ['Perché il nodo del seno scarica a 150/min', 'no', 'Sarebbe una tachicardia sinusale, con una P davanti a ogni QRS.'], ['Perché i ventricoli hanno un loro segnapassi a 150/min', 'no', 'L’origine è atriale: un circuito di rientro, di solito attorno alla tricuspide.']],
    perche: 'Flutter tipico: rientro nell’atrio destro, onde a dente di sega nelle derivazioni inferiori.', fonte: ['esc-svt-2019'] },
  SVT: { nome: 'Tachicardia sopraventricolare', simili: ['STACH', 'AFIB', 'AFLT'], q: 'Nel paziente stabile con questo ritmo, qual è la sequenza di trattamento?',
    opz: [['Manovre vagali, poi adenosina in bolo rapido', 'ok', 'Se compaiono segni di instabilità si passa alla cardioversione elettrica sincronizzata.'], ['Cardioversione elettrica come primo passo', 'no', 'È riservata al paziente instabile.'], ['Amiodarone in infusione', 'no', 'Non è il trattamento di prima scelta delle tachicardie sopraventricolari da rientro.']],
    perche: 'Le tachicardie da rientro che coinvolgono il nodo AV si interrompono bloccandolo per pochi secondi.', fonte: ['esc-svt-2019'] },
  STACH: { nome: 'Tachicardia sinusale', simili: ['SVT', 'AFLT', 'AFIB'], q: 'Qual è l’atteggiamento corretto davanti a una tachicardia sinusale?',
    opz: [['Cercare e trattare la causa', 'ok', 'Febbre, dolore, ipovolemia, anemia, ipossia, embolia polmonare, ipertiroidismo: la tachicardia sinusale è quasi sempre una risposta, non la malattia.'], ['Rallentarla subito con un beta-bloccante', 'no', 'Se è una risposta compensatoria, rallentarla può peggiorare la situazione.'], ['Cardioversione elettrica', 'no', 'Il nodo del seno riprende subito alla stessa frequenza: non c’è un circuito da interrompere.']],
    perche: 'La tachicardia sinusale è un segno: il trattamento è quello della condizione che la provoca.', fonte: ['esc-svt-2019'] },
  SBRAD: { nome: 'Bradicardia sinusale', simili: ['1AVB', 'NORM', 'AFIB'], q: 'Quando una bradicardia va trattata in urgenza?',
    opz: [['Quando ci sono shock, sincope, scompenso o ischemia', 'ok', 'In quel caso il primo farmaco è l’atropina, 500 µg ripetibili fino a 3 mg. Senza sintomi, in un atleta o nel sonno, la bradicardia sinusale è fisiologica.'], ['Sempre, sotto i 60/min', 'no', 'La soglia numerica da sola non è un’indicazione.'], ['Mai: è sempre benigna', 'no', 'Può essere il segno di ischemia inferiore, farmaci, ipotiroidismo, ipertensione endocranica.']],
    perche: 'Si tratta il paziente, non il numero: contano i segni di ridotta perfusione.', fonte: ['erc-als-2025'] },
  '1AVB': { nome: 'Blocco AV di I grado', simili: ['NORM', 'SBRAD', 'CRBBB'], q: 'Che cosa definisce il blocco AV di I grado?',
    opz: [['PR oltre 200 ms, con ogni onda P seguita da un QRS', 'ok', 'È un rallentamento, non un vero blocco: nessun impulso va perduto. Di norma non richiede stimolazione.'], ['PR che si allunga fino a una P non condotta', 'no', 'È il blocco di II grado tipo 1.'], ['P e QRS indipendenti', 'no', 'È il blocco di III grado.']],
    perche: 'I grado: tutti gli impulsi passano, in ritardo. II grado: alcuni non passano. III grado: non ne passa nessuno.', fonte: ['esc-pacing-2021'] },
  CRBBB: { nome: 'Blocco di branca destra completo', simili: ['CLBBB', 'LAFB', 'WPW'], q: 'Quali sono i criteri del blocco di branca destra completo?',
    opz: [['QRS di 120 ms o più, rsR′ in V1–V2, onda S larga in DI e V6', 'ok', 'Il ventricolo destro si attiva per ultimo: la parte finale del QRS punta a destra e in avanti.'], ['QRS di 120 ms o più, R larga e intaccata in DI e V6, nessuna q settale', 'no', 'Sono i criteri del blocco di branca sinistra.'], ['QRS stretto con asse oltre −45°', 'no', 'È l’emiblocco anteriore sinistro.']],
    perche: 'Nel blocco di branca destra la parte iniziale del QRS resta normale: onde Q e asse si possono ancora interpretare.', fonte: ['aha-ecg-2009-3'] },
  CLBBB: { nome: 'Blocco di branca sinistra completo', simili: ['CRBBB', 'LVH', 'PACE'], q: 'Quali sono i criteri del blocco di branca sinistra completo?',
    opz: [['QRS di 120 ms o più, R larga e intaccata in DI, aVL, V5–V6, assenza di q settali', 'ok', 'Il setto si attiva da destra a sinistra: scompaiono le q settali e tutta la depolarizzazione è alterata, con ST e T discordanti dal QRS.'], ['QRS di 120 ms o più con rsR′ in V1', 'no', 'È il blocco di branca destra.'], ['PR corto con onda delta', 'no', 'È la pre-eccitazione.']],
    perche: 'Nel blocco di branca sinistra ST e T secondari rendono difficile riconoscere un infarto: conta la clinica.', fonte: ['aha-ecg-2009-3'] },
  LAFB: { nome: 'Emiblocco anteriore sinistro', simili: ['IMI', 'CLBBB', 'NORM'], q: 'Quali sono i criteri dell’emiblocco anteriore sinistro?',
    opz: [['Asse tra −45° e −90°, qR in aVL, rS nelle derivazioni inferiori, QRS sotto 120 ms', 'ok', 'Le piccole r iniziali in DII, DIII e aVF lo distinguono da un infarto inferiore, che dà onde Q.'], ['Asse oltre +90° con qR in DIII', 'no', 'È il quadro dell’emiblocco posteriore sinistro.'], ['QRS oltre 120 ms con R intaccata in V6', 'no', 'È il blocco di branca sinistra.']],
    perche: 'Una deviazione assiale sinistra marcata, senza altra causa, è un emiblocco anteriore sinistro.', fonte: ['aha-ecg-2009-3'] },
  WPW: { nome: 'Pre-eccitazione ventricolare', simili: ['CLBBB', 'CRBBB', 'LVH'], q: 'Quale triade definisce la pre-eccitazione sull’ECG?',
    opz: [['PR corto, onda delta, QRS allargato', 'ok', 'Una via accessoria attiva in anticipo una parte dei ventricoli. Se compare una fibrillazione atriale, i farmaci che bloccano il nodo AV sono controindicati.'], ['PR lungo, QRS stretto', 'no', 'È un blocco AV di I grado.'], ['QRS largo senza onde P', 'no', 'Qui le P ci sono e il PR è corto.']],
    perche: 'L’onda delta è la parte di ventricolo attivata dalla via accessoria prima che arrivi l’impulso dal nodo AV.', fonte: ['esc-svt-2019'] },
  PVC: { nome: 'Extrasistoli ventricolari', simili: ['AFIB', 'WPW', 'CRBBB'], q: 'Che cosa distingue un’extrasistole ventricolare?',
    opz: [['Battito prematuro a QRS largo, non preceduto da P, seguito da pausa compensatoria', 'ok', 'Il nodo del seno non viene azzerato: il battito successivo arriva al suo tempo previsto.'], ['Battito prematuro a QRS stretto preceduto da una P diversa', 'no', 'È un’extrasistole atriale.'], ['Pausa senza alcun battito prematuro', 'no', 'Fa pensare a un blocco seno-atriale o a una P bloccata.']],
    perche: 'Origine sotto il fascio di His: attivazione lenta da cellula a cellula, quindi QRS largo.', fonte: ['esc-va-2022'] },
  PACE: { nome: 'Ritmo da pacemaker', simili: ['CLBBB', 'PVC', 'WPW'], q: 'Perché i QRS stimolati dal ventricolo destro somigliano a un blocco di branca sinistra?',
    opz: [['L’attivazione parte dal ventricolo destro e raggiunge il sinistro in ritardo', 'ok', 'La sequenza è la stessa del blocco di branca sinistra. Lo spike prima del QRS fa la diagnosi.'], ['Perché il pacemaker blocca la branca sinistra', 'no', 'La branca non è bloccata: semplicemente non viene usata.'], ['Perché lo stimolo parte dagli atri', 'no', 'La stimolazione atriale dà una P stimolata e un QRS normale.']],
    perche: 'Ogni attivazione che nasce dal ventricolo destro dà un QRS largo con morfologia da blocco di branca sinistra.', fonte: ['esc-pacing-2021'] },
  LVH: { nome: 'Ipertrofia ventricolare sinistra', simili: ['CLBBB', 'ASMI', 'NORM'], q: 'Qual è il criterio di voltaggio di Sokolow-Lyon?',
    opz: [['S in V1 più R in V5 o V6 oltre 35 mm', 'ok', 'È specifico ma poco sensibile: un ECG senza criteri non esclude l’ipertrofia. Il sovraccarico (ST sottoslivellato e T negativa asimmetrica in V5–V6) ne aumenta il valore.'], ['R in aVL oltre 5 mm', 'no', 'La soglia per aVL è 11 mm.'], ['QRS oltre 120 ms', 'no', 'La durata definisce i disturbi di conduzione, non l’ipertrofia.']],
    perche: 'I criteri di voltaggio dipendono da età, sesso e corporatura: vanno interpretati nel contesto.', fonte: ['aha-ecg-2009-5'] },
  IMI: { nome: 'Infarto inferiore', simili: ['LAFB', 'ASMI', 'NORM'], q: 'In quali derivazioni si legge l’infarto inferiore, e quale arteria è più spesso coinvolta?',
    opz: [['DII, DIII e aVF; la coronaria destra', 'ok', 'Meno spesso la circonflessa. In fase acuta vanno registrate anche le derivazioni destre per cercare l’estensione al ventricolo destro.'], ['V1–V4; l’interventricolare anteriore', 'no', 'È il territorio antero-settale.'], ['DI, aVL, V5–V6; la circonflessa', 'no', 'È il territorio laterale.']],
    perche: 'Le derivazioni contigue indicano il territorio; il referto del database non distingue sempre tra infarto acuto ed esiti.', fonte: ['aha-ecg-2009-6'] },
  ASMI: { nome: 'Infarto antero-settale', simili: ['IMI', 'LVH', 'CLBBB'], q: 'In quali derivazioni si legge l’infarto antero-settale, e quale arteria è coinvolta?',
    opz: [['V1–V3 o V4; l’interventricolare anteriore', 'ok', 'Onde Q o complessi QS e mancata progressione dell’onda R nelle precordiali destre.'], ['DII, DIII, aVF; la coronaria destra', 'no', 'È il territorio inferiore.'], ['DI e aVL; la circonflessa', 'no', 'È il territorio laterale alto.']],
    perche: 'Una scarsa progressione dell’onda R da V1 a V3 può dipendere anche da ipertrofia, blocco di branca sinistra o elettrodi mal posizionati.', fonte: ['aha-ecg-2009-6'] }
};
const API = { CASI, CODICI, CLASSI, FONTI, licenza: 'PTB-XL 1.0.3 · Wagner et al. · PhysioNet · CC BY 4.0', fonte: 'https://physionet.org/content/ptb-xl/1.0.3/' };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_CASI_REALI = API;
})(typeof window !== 'undefined' ? window : this);
