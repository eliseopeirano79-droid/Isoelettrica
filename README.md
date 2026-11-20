# Isoelettrica

App didattica per studiare l'ECG: 102 scenari simulati, teoria, quiz, confronto, atlante e laboratori di anatomia e territori coronarici.

App made by Eliseo Peirano · 2026.

## Avvio

È un'app statica senza build né backend. Aprire `index.html` tramite un server HTTP locale, per esempio:

```sh
python3 -m http.server 8000
```

Poi visitare `http://localhost:8000`. Il service worker richiede HTTPS oppure localhost. Una volta installata la shell, simulatore, teoria e quiz generati funzionano offline. Nell'atlante, **Scarica queste immagini per l'uso offline** salva la selezione corrente e mostra quante immagini sono disponibili. I tracciati PTB-XL opzionali vengono conservati dopo la prima apertura online.

## Struttura

| File | Responsabilità |
| --- | --- |
| `engine.js` | Eventi cardiaci, generazione del segnale, trasformazioni delle derivazioni, registrazioni campionate |
| `data.js` | Scenari, contenuti didattici, categorie e metadati dell'atlante |
| `quiz.js` | Generazione deterministica e vincoli dei casi del quiz |
| `app.js` | Monitor, interfaccia, misure, selezione dei casi e navigazione |
| `ipertrofie.js` | Indici in mV e conversione alle soglie standard |
| `anatomia.html`, `cuore3d.js`, `coronarie.js` | Laboratori grafici |
| `sw.js` | Installazione, versioni coerenti e risorse offline |
| `ptbxl.py`, `revisione.html` | Importazione PTB-XL e revisione dei tracciati digitalizzati |

La libreria usa otto sezioni richiudibili, mantenendo le categorie e gli identificatori dei casi. La ricerca per nome/criterio si combina con il filtro per argomento.

## Verifiche

Richiedono Node.js 22 o successivo e Python 3; nessuna dipendenza Python aggiuntiva.

```sh
npm ci --ignore-scripts
npm test
```

La suite comprende i controlli originali (`validatore.js`, `controllo-st.js`, `audit.js`), le regressioni del motore/interfaccia/service worker e l'importazione di un piccolo record WFDB sintetico in entrambi i formati. L'interfaccia viene eseguita in JSDOM con canvas simulato: questo verifica logica e gestione degli eventi, non la resa grafica di un dispositivo reale.

## Tracciati registrati e quiz

- Un canale assente è **N/D**, non una linea isoelettrica. I canali periferici si ricostruiscono solo se I e II sono entrambi presenti.
- La frequenza sui record è una stima da picchi, da verificare sul tracciato. QRS, R/S e indici automatici non vengono presentati senza una delimitazione validata; resta disponibile il compasso.
- Le immagini entrano nel quiz solo con `quizApproved`. Sei immagini sono state controllate visivamente; una usa `quizCrop` per escludere la didascalia. Le altre restano nell'atlante.
- Le domande sulle valvulopatie includono l'auscultazione. Il solo ECG non ne stabilisce eziologia o gravità.
- I casi generati conservano configurazione e seme quando vengono aperti nel Tracciato.

L'app è uno strumento didattico: i modelli simulati e i test software non costituiscono validazione diagnostica dei contenuti o certificazione clinica.

## Atlante PTB-XL completo (v41.0)

La sezione **Atlante → PTB-XL** include tutti i **21.799 ECG** della versione 1.0.3, di cui **16.056** con `validated_by_human=true`. Ricerca per diagnosi/codice/ID, filtri combinati per validazione, artefatti segnalati e segnali già salvati, categorie multiple e pagine di 60 schede mantengono utilizzabile il catalogo completo.

**Anima ECG** apre il tracciato originale nel monitor, con pausa, riavvio, rallentamento, guadagno, velocità della carta e compasso. Si conservano tutti i 5.000 campioni di ciascuna delle 12 derivazioni a 500 Hz e la calibrazione WFDB: nessuna quantizzazione aggiuntiva, filtro, normalizzazione o ricostruzione. La ripetizione del segmento di 10 secondi interrompe il tratto grafico al confine del file; non viene interpolato un battito tra fine e inizio. Le misure automatiche di FC rimangono stime dichiarate, senza inventare PR/QRS/QT o vettori 3D.

Il catalogo locale occupa circa 1,4 MB. Referti dettagliati e segnali si caricano all'apertura: circa 120 kB di segnale per ECG. Il server PhysioNet non espone i file con CORS; `ptbxl.js` usa la copia pubblica `longisland3/ptb-xl` su Hugging Face, fissata al commit `34a5563a01793b150ac61fe0ec919a09fc0d044a`. **Ogni intestazione e segnale deve corrispondere allo SHA-256 ufficiale PhysioNet prima della visualizzazione**, anche dalla cache. Un errore di download, di integrità o di calibrazione impedisce l'apertura del caso e permette di riprovare. L'inventario del mirror comprende tutti i 43.598 file necessari.

Una prima apertura richiede la rete. Segnale e referto vengono poi salvati nella cache `isoelettrica-ptbxl-1.0.3`, nei limiti di spazio e disponibilità del browser. La cache sopravvive agli aggiornamenti dell'app; il filtro «Solo salvati sul dispositivo» mostra le registrazioni complete presenti. Non sono previsti account o un database utenti. La disponibilità online dei casi ancora da scaricare dipende dal mirror pubblico; le copie già salvate rimangono utilizzabili offline.

Per rigenerare il catalogo, scaricare `ptbxl_database.csv`, `scp_statements.csv`, `SHA256SUMS.txt` e `LICENSE.txt` dalla versione **1.0.3** ufficiale, poi eseguire:

```sh
python3 ptbxl_catalog.py --sorgente /percorso/ptb-xl/1.0.3 --out atlante-reale
```

Il generatore verifica le impronte dei metadati, conserva le etichette originali e i referti senza inferire diagnosi più specifiche, e maschera correttamente le età anonimizzate oltre 89 anni. Attribuzioni, modifiche e licenza sono visibili in `atlante-reale/fonti.html` e nelle schede del tracciato.

### Importazione locale precedente

`ptbxl.py` resta disponibile per importare sottoinsiemi autonomi nel vecchio formato:

```sh
python3 ptbxl.py --sorgente /percorso/ptb-xl/1.0.3 --modo cartella --out atlante-reale
```

Il formato cartella viene trovato automaticamente. Per `--modo file --out atlante-reale.js`, aggiungere il relativo script prima di `app.js` in `index.html`; non è richiesto se il dataset non è installato. Si conservano codici SCP originali, referto e provenienza. Un codice generico non viene trasformato in una diagnosi più specifica. `--tutti` disattiva esplicitamente i filtri di qualità; non viene attivato automaticamente.

Fonte: [PTB-XL 1.0.3, PhysioNet](https://physionet.org/content/ptb-xl/1.0.3/), CC BY 4.0.

## Aggiornamenti

La revisione 40 risolve i rilievi F01–F21: vedere [CORREZIONI-v40.md](CORREZIONI-v40.md). Per una nuova versione, mantenere coerenti i riferimenti `?v=` nell'HTML, `VERSION` nel service worker e le etichette nell'interfaccia. Un download essenziale fallito impedisce l'attivazione del nuovo worker. Le immagini offline hanno una cache separata che sopravvive agli aggiornamenti.

## Dispositivi sul tracciato (v42.0)

In **Parametri → Aggiungi dispositivo** scegli Pacemaker, DAE, ICD o CRT-D. La barra sopra l’ECG mostra il dispositivo attivo; **Rimuovi** ricrea il quadro originale con i suoi parametri. Il dispositivo è temporaneo e viene tolto cambiando caso o aprendo una registrazione reale. Nei due scenari dedicati DAE/ICD è già collegato all’apertura.

- **Pacemaker**: VVI a domanda, frequenza minima 40–100/min. I QRS spontanei inibiscono lo stimolo; nel BAV III le P continuano indipendenti e lo spike precede il QRS stimolato.
- **DAE**: Defibrilla → analisi simulata → ritmo defibrillabile/non defibrillabile → eventuale Eroga scarica. Asistolia e PEA non generano scariche né cambi di ritmo. Per TV/torsione di punta il contesto di polso è esplicito; non viene ricavato dall’ECG. Le analisi successive valutano l’esito corrente, non il ritmo iniziale.
- **ICD transvenoso**: riconoscimento, ATP per la TV monomorfa oppure carica/scarica, con supporto VVI nei ritmi compatibili. Non trasforma l’asistolia in un ritmo stimolato efficace.
- **CRT-D**: funzione ICD e stimolazione biventricolare; esempio di QRS da 130 ms, con tracking delle P rilevate a 120 ms e frequenza massima di tracking 150/min. La morfologia non predice il beneficio clinico della CRT.

Modello didattico con rilevazione e cattura ideali: tempi ed esiti esemplificativi, senza guasti o fusione. Non simula l’impianto né ne determina l’indicazione clinica. Gli indici di ipertrofia e l’inserimento manuale di extrasistoli sono disabilitati durante la stimolazione aggiunta. Le sequenze seguono il tempo del simulatore (pausa e rallentamento inclusi) e sono annullate quando cambia il caso, il dispositivo o un parametro del ritmo. I dati PTB-XL rimangono registrazioni originali.

Riferimenti: [AHA 2025, Adult Advanced Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support), [ESC 2021, Pacing e CRT](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/cardiac-pacing-and-cardiac-resynchronization-therapy/).

## Casi clinici (v47.0)

La sezione **Casi clinici** comprende casi guidati, ECG reali e un Turno di guardia.

**Casi guidati (27, 116 decisioni).** Dodici casi nuovi nella v47 (`casi-dati-2.js`, file additivo): infarto inferiore con blocco AV e ventricolo destro, infarto posteriore, sottoslivellamento diffuso con aVR, de Winter, ipokaliemia, Mobitz 2, Wenckebach dell’atleta, bradicardia-tachicardia, attività elettrica senza polso da emorragia, ipotermia, ripolarizzazione precoce, inversione degli elettrodi. Lettura dell’ECG, diagnosi, decisione, farmaco e dose, seguito. Il tracciato di ogni fase è generato dal motore con gli scenari esistenti e cambia in continuità sulla stessa striscia quando lo stato del paziente cambia (per esempio fibrillazione ventricolare → scarica → ritmo sinusale). La frequenza mostrata è letta dai battiti generati. Le scelte pericolose mostrano una conseguenza simulata, dichiarata come tale.

**Guide (7).** Metodo di lettura in otto passi, tachicardia, bradicardia, arresto, dolore toracico, ST sopraslivellato non ischemico, potassio. Ogni guida riassume criteri e dosi già citati nei casi, con le stesse fonti, e rimanda ai casi e ai tracciati collegati (`casi-guide.js`).

**ECG reali (96).** Tracciati veri dall’archivio PTB-XL 1.0.3 (CC BY 4.0), con età, sesso e referto originale del cardiologo. `tools/build-casi-reali.py` li sceglie dal catalogo locale: validati da un cardiologo, senza artefatti segnalati, con una sola diagnosi principale a probabilità 100 e nessun’altra affermazione diagnostica; sei per ciascuna di 16 classi. PTB-XL non contiene sintomi, terapia né decorso: la prima domanda chiede il reperto, la seconda è generale sul quadro riconosciuto e non descrive la storia di quel paziente. Il segnale si scarica alla prima apertura dal mirror già usato dall’Atlante, con verifica SHA-256, e resta poi disponibile offline.

**Turno di guardia.** Dieci chiamate: otto passaggi da casi diversi e due esercizi di calcolo della dose. Le risposte e le fonti vengono mostrate alla fine; si può saltare una chiamata. Le diluizioni dei calcoli sono esempi didattici espliciti. Dopo le risposte ai casi guidati sono disponibili anche le spiegazioni delle altre alternative e la scheda ECG già presente nell’app.

**Paziente 3D.** Corpo umano MakeHuman (CC0 1.0), con scheletro e pesi originali. Il binario del kit contiene quattro insiemi di vertici identici: `casi-paziente-aspetto.js` applica ora variazioni parametriche dichiarate a proporzioni, spalle e volto, muovendo anche giunti e ancore. Capelli volumetrici, sopracciglia, iridi, colorazione del viso e camice separato completano la scena. La coperta è una superficie aperta con pieghe, orlo e risvolto: si adatta ai punti del corpo durante il cambio di postura. Letto raccordato, cuscino con federa, sponde e ombre rendono più leggibili i contatti. Il modello mostra postura, colorito, sudorazione, coscienza, respiro, presìdi e manovre. I capelli e gli abiti vengono conservati in memoria per riutilizzarli nei casi successivi. Si ruota con un dito e si ingrandisce con due dita o con i pulsanti; ↺ ripristina la vista.

Sono forme illustrative, con colorazione procedurale: non sono persone fotorealistiche, non includono una mimica completa né un modello anatomico interno, e non simulano l’emodinamica o la fisica completa dei tessuti.

Fonti cliniche: Resuscitation Council UK 2025 (adattamento delle linee guida ERC 2025 sulle circostanze speciali: ipotermia, ipokaliemia), AHA/ACC/HRS 2007 (standardizzazione dell’ECG), ESC 2023 (sindromi coronariche acute), ESC 2019 (tachicardie sopraventricolari), ESC 2024 (fibrillazione atriale), ESC 2022 (aritmie ventricolari), ESC 2021 (stimolazione), ESC 2019 (embolia polmonare), ESC 2025 (miocardite e pericardite), ERC 2025 (supporto avanzato e circostanze speciali), AHA/ACCF/HRS 2009 (criteri ECG).

| File | Responsabilità |
| --- | --- |
| `casi-dati.js`, `casi-dati-2.js` | Casi guidati: stati del paziente, domande, commenti, fonti (la seconda serie si aggiunge alla prima senza modificarla) |
| `casi-guide.js` | Guide di ragionamento della scheda Guide |
| `casi-reali.js` | Elenco dei tracciati PTB-XL e domande per classe (generato) |
| `casi-paziente.js`, `casi-paziente-aspetto.js`, `paziente-corpo.bin` | Scena 3D, corporature, capelli, abiti e biancheria |
| `casi-clinici.js` | Svolgimento, punteggio, collegamento a monitor e motore tramite `window.ISO_APP` |
| `tests/casi.test.cjs`, `tests/casi-ui.test.cjs`, `tests/paziente-aspetto.test.cjs` | Dati, calcoli, percorsi DOM, geometria, cambio paziente e comandi 3D |

`engine.js` e `data.js` non sono modificati. I contenuti sono stati confrontati con le linee guida citate ma **non sono stati rivisti né certificati da un cardiologo**; dosi e scelte sono quelle dell’adulto e non sostituiscono i protocolli locali. I tracciati reali sono stati scelti dai metadati dell’archivio, non riguardati uno per uno. Verifica su iPad reale non eseguita.

Restano da ricontrollare sul testo delle fonti i tempi della strategia invasiva nel caso Wellens, la pericardiocentesi nel tamponamento, le raccomandazioni nel caso Brugada, la dose del magnesio e lo schema della colchicina secondo il peso. I test automatici non verificano l’appropriatezza clinica di queste indicazioni.

Il rilascio v46.0 è stato verificato nel browser pubblico, compreso l’aggiornamento della PWA e il tracciato reale n. 23 con referto. Per la v46.2: 176 test Node e 5 Python superati; nove file protetti invariati; rendering offline della geometria Three.js nelle pose semiseduta e supina, con varianti e compressioni. Il browser disponibile per questa revisione non dispone di WebGL: i rendering Blender verificano le forme e i contatti, ma non certificano shader, prestazioni o resa su Safari/iPad. Dettagli in `reports/2026-11-12-pazienti-v46-2.md`.

La verifica grafica offline è riproducibile con `tools/esporta-paziente.cjs` e `tools/render-paziente.py`. Richiede, solo per questi strumenti, `@napi-rs/canvas` e Blender 4; non aggiunge dipendenze al sito.

Attribuzioni: PTB-XL — Wagner P et al., PhysioNet, CC BY 4.0. MakeHuman base mesh, default skeleton e macro targets — MakeHuman Community, CC0 1.0.

## Laboratorio Eco (v47.0)

Nuova scheda **Eco**: un ecocardiogramma simulato a partire dal cuore anatomico già presente nell’app (`prototipo-cuore/heart-z-anatomy.glb`, Z-Anatomy, CC BY-SA 4.0).

- **Immagine.** Il piano del fascio taglia le superfici del modello. La parete è ricostruita in pixel come chiusura morfologica (dilatazione e poi erosione di metà spessore, distanza chamfer 3-4): la cavità resta nera, la parete grigia con grana sintetica. Pericardio brillante, parete toracica in campo vicino, fegato nella finestra sottocostale, scala in centimetri.
- **Proiezioni (9).** Parasternale asse lungo, asse corto a base, mitrale, papillari e apice, apicale 4, 2 e 3 camere, sottocostale. Due camere a +70° dalla quattro camere, dove il piano non incontra più le camere destre; tre camere attraverso il centro dell’anello aortico; assi corti di base e mitrale perpendicolari all’anello. La sonda è appoggiata sulla cute del torace: la profondità risultante è di 16–19 cm. Rotazione e inclinazione della sonda sono libere.
- **Movimento.** Accorciamento radiale e longitudinale del ventricolo sinistro attorno alla linea mediana della cavità, in fase con un ECG schematico. Valvole ricostruite dagli anelli stimati sul modello (il modello d’origine non ha i lembi anteriori di mitrale e tricuspide): atrioventricolari con onda E e onda A, semilunari aperte in eiezione; «bocca di pesce» mitralica e «Y» aortica negli assi corti.
- **Quadri (5).** Normale, versamento pericardico (16 mm, moderato), ipertrofia ventricolare sinistra, cardiomiopatia dilatata, acinesia del territorio dell’interventricolare anteriore. La frazione d’eiezione del modello è mostrata con la classe ASE/EACVI 2015. Versamento e infarto anteriore aprono il caso clinico collegato.
- **Localizzatore 3D.** Torace anatomico di Z-Anatomy estratto dalla stessa scena del cuore con la stessa trasformazione (`prototipo-cuore/torace-z-anatomy.glb`, generato da `prototipo-cuore/export-torace.py`): 24 coste, cartilagini, sterno, vertebre toraciche, clavicole, scapole, fegato, polmoni, diaframma e cute di tronco e testa, nei rapporti reali col cuore. Strati attivabili (pelle, polmoni, fegato), sonda con repere e ventaglio del fascio.
- **Sonda libera (v47.1).** Come su un ecografo vero la sonda è un oggetto: nel torace 3D la si afferra e la si fa scivolare sulla pelle (mantiene l'angolo con la superficie), l'anello blu la ruota, la coda nera la inclina; cursori «Ruota», «Ventaglio», «Bascula». Le proiezioni standard sono bersagli: una sonda fantasma mostra la posizione giusta e la guida sopra l'immagine dice cosa fare (scivolare, ruotare, inclinare), fino a «Proiezione allineata». «Allenati» parte da una posizione sbagliata. Funzioni pure e testate: `orienta3`, `suPelle`, `scivola`, `guida`.
- **Valvulopatie e Doppler (v47.1).** Stenosi e insufficienza aortica, stenosi e insufficienza mitralica, insufficienza tricuspidale, ciascuna lieve, moderata o severa, con la tabella dei criteri e la fonte (EACVI/ASE 2017 per la stenosi aortica, ASE 2017 per i rigurgiti, EAE/ASE 2009 per la stenosi mitralica). In 2D: lembi ispessiti e apertura ridotta nelle stenosi, coaptazione incompleta nei rigurgiti, ipertrofia o dilatazione del ventricolo sinistro. Color Doppler (rosso verso la sonda, blu in allontanamento, mosaico oltre Nyquist, convergenza PISA) e Doppler continuo lungo la linea scelta, con velocità di picco, gradiente di picco e medio (4v²) e avviso quando il fascio non è parallelo al flusso (la velocità misurata è moltiplicata per il coseno dell'angolo). I test controllano che le misure simulate di ogni grado cadano nell'intervallo della linea guida.
- **Immagine.** Tessuti attorno al cuore a bassa intensità, bordo del miocardio più brillante, sangue nero; pulsante «Coste» per togliere ombre e riflessi ossei.
- **Assi corti (v47.1).** Ogni asse corto è perpendicolare all'asse del ventricolo sinistro (alla radice aortica per la base): la sonda scivola nella zona parasternale sinistra (1–7 cm dalla linea mediana) fino al punto in cui la sezione è rotonda e il settore non incontra coste, cartilagini o sterno, come fa l'ecografista. Obliquità residua: base ≈ 13°, papillari ≈ 12°, apice ≈ 2°, mitrale ≈ 34° (oltre non si scende senza uscire dalla finestra parasternale in questo modello). I muscoli papillari sono disegnati a parte, non più saldati alla parete; la ricostruzione della parete segue l’ispessimento sistolico, così in sistole non compaiono falsi «buchi» nel miocardio. Test: `tests/eco-coerenza.test.cjs`.
- **Comandi dell'ecografo.** Pulsante «Coste» per togliere ombre e riflessi di coste e sterno quando si studia l'anatomia; profondità (8–24 cm, torna automatica al cambio di proiezione), guadagno, calibro (immagine ferma, due misure in cm sul piano del fascio, con l'indicazione di dove si misura il ventricolo sinistro), M-mode a schermo diviso (la linea tratteggiata si sposta toccando l'immagine; quattro secondi per schermata, tacche ogni 5 cm).
- **Confronto con esami reali.** Ogni proiezione ha il collegamento a un esame transtoracico normale con strutture etichettate su Radiopaedia (asse lungo 62652, assi corti 62654, quattro camere 62756, sottocostale 154437; due e tre camere dalla voce «transthoracic echocardiography»). Sono solo collegamenti: nessuna immagine viene copiata. I dataset aperti con clip reali (EchoNet-Dynamic, CAMUS) non permettono la ridistribuzione in un'app.
- **Finestre acustiche.** Parasternale al 3°–4° spazio intercostale, circa 1,5 cm a sinistra del margine sternale, comune a tutte le viste parasternali; apicale sull'apice; sottocostale sotto lo xifoide. La sonda poggia sulla cute misurata sull'atlante.

Fonti: ASE 2019 per le proiezioni (Mitchell C et al. J Am Soc Echocardiogr 2019;32:1–64), ASE/EACVI 2015 per frazione d’eiezione e spessori (Lang RM et al. J Am Soc Echocardiogr 2015;28:1–39), ESC 2015 per la classificazione del versamento (Adler Y et al. Eur Heart J 2015;36:2921–2964).

**Verifica di coerenza (v47).** `tests/eco-coerenza.test.cjs` controlla, vista per vista, che cosa la sonda incontra: disposizione delle camere secondo le convenzioni ASE (per esempio asse lungo con ventricolo destro vicino alla sonda e aorta a destra, due camere senza camere destre, quattro camere senza aorta, fegato come finestra sottocostale), misure telediastoliche in asse lungo (diametro del ventricolo sinistro 4,2–5,8 cm, setto e parete posteriore 0,4–1,3 cm, rapporto setto/parete < 1,3), anelli valvolari nei limiti dell'adulto, nessuna sonda appoggiata su un osso e centro del settore libero da ombre costali, continuità dell'immagine a ogni grado di rotazione o inclinazione. `tools/verifica-eco.py` ripete la misura sui pixel del fotogramma nel browser: setto 0,64 cm, ventricolo sinistro 5,01 cm, parete posteriore 1,08 cm (pericardio escluso).

**Scelte di costruzione.** Scala: 8 cm fra apice endocardico e centro della mitrale; con questa scala anello aortico, anello mitralico, diametro del ventricolo e larghezza del torace risultano normali in modo indipendente. Proiezioni definite dai punti di repere dell'ecografista (apice, mitrale, aorta, tricuspide); finestre acustiche scelte fra le coste vere; nelle viste apicali il fascio è inclinato nel proprio piano (+18°, +8°, −8°) perché la sonda cada in uno spazio intercostale. Correzione dichiarata del modello: la superficie settale del ventricolo destro di BodyParts3D dista fino a 1 cm dal ventricolo sinistro e darebbe un setto quasi doppio della parete posteriore; i soli vertici settali del ventricolo destro sono avvicinati.

**Fisica dell'immagine.** Superfici costali brillanti con ombra acustica dietro, calcolate dalle coste vere nel piano del fascio; bordi più brillanti quando sono perpendicolari al fascio e quasi assenti quando sono paralleli; risoluzione laterale che peggiora con la profondità; attenuazione con compensazione; parete toracica o fegato in campo vicino.

**Correzione delle sezioni.** Eliminata la chiusura automatica di contorni distanti, che introduceva segmenti di tessuto attraverso le cavità. Verifica delle nove viste in due fasi e limiti ancora visibili: [contorni e WebGL](reports/2026-11-19-eco-contorni-e-webgl.md). La pagina `tools/qa-webgl.html` verifica separatamente le capacità grafiche del browser senza caricare il cuore.

**Prototipo F1 in corso (ramo `feat/eco-bmode-f1`, versione di sviluppo 47.2).** Il selettore del B-mode affianca al Canvas classico un renderer sperimentale: diffusori complessi in coordinate materiali, risposta impulsiva ridotta, attenuazione/TGC, fuoco e compressione logaritmica. Usa WebGL2 quando disponibile e un riferimento CPU ridotto altrimenti. Il localizzatore e la sonda 3D originali restano il percorso principale; il localizzatore 2D si attiva soltanto quando il contesto WebGL non può essere creato. Le scelte e i criteri ancora aperti sono in [avanzamento F1](reports/2026-11-19-eco-f1-avanzamento.md). Il confronto [EchoSuite / Isoelettrica](reports/2026-11-19-echosuite-confronto.md) censisce 15 viste e 70 famiglie di strumenti da coprire; non implica che siano già implementate.

**Limiti dichiarati.** Non è un’ecografia reale: il movimento è geometrico, senza accoppiamento emodinamico completo, e color/CW restano illustrativi. Il nuovo B-mode elabora ancora una sezione macroscopica Canvas: mancano volume anatomico 3D etichettato, buffer di identità, formazione polare completa, spessore di fetta e artefatti completi. Nelle viste apicali a due e tre camere il modello mostra anche vene polmonari e seno coronarico. La mesh d'origine ha superfici e papillari non sempre separati; le correzioni di pareti/papillari e le valvole procedurali non costituiscono una ricostruzione anatomica validata. La resa completa dell'interposizione polmonare resta aperta. Non rivista da un cardiologo né da un ecocardiografista. Compilazione/rendering GPU e prova su iPad reale non verificati in questa sessione: nessuna misura di fps disponibile. Il ciclo si ferma quando la scheda non è visibile.

| File | Responsabilità |
| --- | --- |
| `eco.js` | Taglio delle superfici, reperi, anelli valvolari, proiezioni, deformazione, immagine, localizzatore 3D |
| `prototipo-cuore/torace-z-anatomy.glb`, `torace-parts.json`, `export-torace.py` | Scheletro toracico e visceri di contesto (Z-Anatomy, CC BY-SA 4.0) e lo script che li estrae |
| `eco.css` | Impaginazione della scheda |
| `tests/eco.test.cjs` | Proiezioni, profondità, sonda sulla cute, valvole, ciclo, frazione d’eiezione, quadri |
