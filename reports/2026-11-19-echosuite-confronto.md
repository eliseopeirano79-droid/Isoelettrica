# EchoSuite e Isoelettrica - audit funzionale

Data di lavoro: 19 novembre 2026. Ambito: uso dell interfaccia, lettura delle guide e confronto con il codice Isoelettrica v47.1 / prototipo F1.

## Obiettivo del confronto

EchoSuite e il riferimento funzionale da raggiungere e superare. Isoelettrica mantiene la sua identita, il suo codice e il laboratorio 3D gia approvato. Una sonda 2D non e il risultato finale: e soltanto la riserva quando WebGL manca.

## Che cosa ho provato davvero

Aperti tutti i 70 strumenti nelle 11 categorie. Eseguiti 68 esempi nel ciclo sistematico e un ulteriore esempio RA prima del ciclo. Il WMSI e stato provato modificando un segmento ed escludendolo come non visualizzato. Provati ricerca, nessun risultato, preferiti, cambio metodo 2D/3D, aiuto per una misura, fotogrammi ED/ES e copertura/ritaglio della figura 3D.

## Limite della prova 3D

Il Probe Lab non si avvia nel browser disponibile: Error creating WebGL context, anche dopo Try again. Non ho trascinato la sonda di EchoSuite, non ho verificato il rendering delle 15 viste nel laboratorio e non ho misurato le prestazioni del suo 3D. Le guide delle 15 viste sono state lette; una guida consultata non equivale a una prova interattiva.

## Limite della verifica dei calcolatori

Aprire uno strumento ed eseguire un esempio ne verifica il percorso principale. Non dimostra che ogni soglia clinica, tutte le varianti, i casi limite e ogni combinazione di input siano corretti. Non sono stati certificati 70 algoritmi clinici.

## Controllo sul nostro 3D

Le funzioni crea3d(gltf) e sonda(cm, ghost) coincidono con quelle del ramo v47.1. Anche engine.js, data.js e il GLB cardiaco protetto mantengono le impronte di riferimento. La nuova riserva non rimpiazza il percorso 3D quando disponibile.

## Copertura delle viste

Presente significa presente nel catalogo di Isoelettrica: non certifica fedelta anatomica, prestazioni o parita della vista. Mancano sei proiezioni rispetto alle quindici documentate da EchoSuite.

| Vista | Isoelettrica | ID attuale |
|---|---|---|
| PLAX | Presente | plax |
| PSAX aortica | Presente | psax-ao |
| PSAX mitrale | Presente | psax-mv |
| PSAX papillari | Presente | psax-pm |
| PSAX apice | Presente | psax-ap |
| Apicale quattro camere | Presente | a4c |
| Apicale cinque camere | Da aggiungere | - |
| Apicale due camere | Presente | a2c |
| Apicale tre camere | Presente | a3c |
| Sottocostale quattro camere | Presente | sub |
| Vena cava inferiore | Da aggiungere | - |
| Aorta addominale | Da aggiungere | - |
| Arco aortico soprasternale | Da aggiungere | - |
| Afflusso del VD | Da aggiungere | - |
| Efflusso del VD | Da aggiungere | - |

## Matrice di parita

| Area | EchoSuite | Isoelettrica | Criterio di sviluppo |
|---|---|---|---|
| Sonda 3D e contatto sul torace | Documentato; prova diretta bloccata | Presente; codice preservato | F4: contatto sulla mesh cutanea, non sul cilindro didattico |
| Impugnatura, rotazione, inclinazione | Documentato nelle guide | Presenti nel 3D esistente | Provare gesti e sincronizzazione, senza sostituire il 3D |
| Orbita della camera e zoom touch | Da provare nel laboratorio 3D | Presenti nel codice attuale | Verifica su dispositivo e correzioni mirate |
| Fantasma e istruzioni di allineamento | Documentati | Presenti | Rendere misurabili posizione, rotazione e inclinazione |
| Tour e ricentramento | Descritti nel brief; non riprovati qui | Ricentramento legato alle viste; tour assente | Aggiungere comandi espliciti e prova guidata |
| Livelli anatomici | Cute, trasparenza, anatomia documentati | Pelle, polmoni, fegato; controllo parziale | Preset chiari e anatomia registrata nello stesso spazio |
| Viste e accesso diretto | 15 guide lette | 9 viste a catalogo | Aggiungere le 6 mancanti; mantenere obiettivo del brief di 20 |
| Ottimizzazione e profondita | Guida per vista documentata | Cursori e profondita automatica | Banda consigliata ricavata dalla geometria e guida per errori |
| Video clinici nello schermo | Documentati; riproduzione non verificata | Collegamenti esterni | Integrare confronti autorizzati da fonti originali |
| Etichette anatomiche | Documentate | Etichette sul B-mode presenti | Puntamento coerente tra immagine e anatomia 3D |
| Sovrimpressioni e comandi immagine | Da confrontare dal vivo nel Probe Lab | Profondita, FC, FE, ECG; nuovi comandi sperimentali | Uniformare strumenti e riportare solo misure effettive |
| Libreria di calcolatori | 70 strumenti aperti | Nessuna libreria Eco equivalente | F5 ampliata a 70 famiglie, con varianti e test |
| Formule, unita e risultati live | Provati | Formule isolate nei modelli | Unita esplicite, conversioni e calcoli collegati alle misure |
| Esempi svolti | 69 esempi provati, incluso RA iniziale | Assenti come sistema Eco dedicato | Un esempio verificato indipendentemente per ogni metodo |
| Errori e input incompatibili | Provati su EF | Non ancora un sistema di calcolatori | Bloccare risultati incoerenti e spiegare il dato da correggere |
| Didattica interattiva delle misure | Provata; ED/ES, dischi, copertura e crop | Testi per vista; non equivalente | Figure originali collegate alla misura e alla fase cardiaca |
| Riferimenti indipendenti dagli input | Provati | Criteri per 5 valvulopatie | Consultazione separata, riferimento preciso e limiti |
| Ricerca e preferiti | Provati, anche nessun risultato | Non presenti come libreria Eco | Ricerca per concetto e raccolta locale |
| WMSI interattivo | Provata variazione del punteggio e NV | Cinetica illustrativa, senza mappa di referto | Segmenti, esclusioni e risultato coerente |
| Metodi 2D e 3D distinti | Provato sul calcolatore EF | Non disponibili come metodi di misura | Non applicare automaticamente i riferimenti di un metodo all altro |
| Esportazione e studio offline | Offline/PDF non verificati in EchoSuite | PWA presente; PDF Eco da costruire | Conservare offline e aggiungere riepiloghi PDF |
| Patologie, ECG e ambulatorio | Copertura completa non dimostrata in EchoSuite | ECG e casi esistenti; Eco ancora illustrativa | F2-F9: anatomia, emodinamica e casi sullo stesso paziente |

## Categorie dei 70 strumenti

| Categoria | Numero |
|---|---|
| Atri | 5 |
| Ventricolo destro | 7 |
| Ventricolo sinistro | 9 |
| Valvola aortica | 7 |
| Valvola mitrale | 7 |
| Valvola tricuspide | 2 |
| Valvola polmonare | 2 |
| Diastologia | 12 |
| Pericardio | 6 |
| Fisica e superficie corporea | 7 |
| Shunt e congenite | 6 |

## Prove approfondite

### WMSI

Un segmento passa da 1 a 2: 17/16, mostrato 1,06. Escluso quel segmento: 15/15, mostrato 1,00. L azzeramento ripristina i segmenti.

### EF e input

Con ESV superiore a EDV compare un errore e la EF valida non viene prodotta. Il calcolatore conserva i risultati parziali pertinenti.

### Modalita EF

Passando al metodo 3D misurato cambia il contesto interpretativo. I riferimenti 2D restano consultabili nella scheda separata, senza diventare automaticamente il giudizio del metodo 3D.

### Didattica

Nella spiegazione dei volumi sono stati selezionati ED/ES. La figura combina due piani, contorni/dischi e riferimento temporale. Nella figura 3D sono stati provati copertura in due piani e crop del display.

### Ricerca

Una ricerca utile filtra la libreria; una stringa senza corrispondenze produce uno stato vuoto esplicito.

### Preferiti

Provate aggiunta, filtro, riapertura e rimozione. Il preferito creato per il test e stato rimosso.

## Priorita aggiornate

### F1 - immagine

Completare il motore d immagine, mantenendo il Canvas classico come confronto. Il prototipo aggiunto usa diffusori in coordinate materiali su una sezione macroscopica esistente: non e ancora il volume anatomico 3D etichettato richiesto dal brief. Restano aperti buffer di identita, pipeline polare completa, tutti gli artefatti, validazione GPU e prestazioni iPad.

### F2 e F3 - fondamenti

Completare l anatomia e le valvole, quindi collegare il movimento a pressioni, volumi e flussi. Aggiungere strumenti sopra una geometria o una fisiologia incompleta non basta a simulare una patologia.

### F4 - acquisizione

Preservare sonda, maniglie e navigazione 3D. Coprire almeno le 15 viste di EchoSuite e le ulteriori viste del brief; sonda su cute reale, guida a piu livelli, allenamento e verifica dei gesti. Ogni vista richiede contenuto anatomico, fase, orientamento e resa controllati.

### F5 - misure e calcoli

Il requisito si amplia dalle formule minime del brief alla copertura delle 70 famiglie censite. Ogni metodo deve avere unita, formula, esempio controllato, gestione degli input incompatibili, acquisizione, limiti, fonte primaria e collegamento alla misura del simulatore. Servono anche varianti, non soltanto 70 nomi nel menu.

### F6-F9 - valore aggiunto

Patologie graduate, confronto col normale, Doppler coerente, valvole studiabili, casi ambulatoriali con ECG e auscultazione, referto e PDF. Sono obiettivi di sviluppo: la sola presenza di un catalogo non li rende completati.

### Autonomia e pubblicazione

Eli ha autorizzato a sviluppare e controllare le fasi senza chiedere un nuovo ok a ogni passaggio. Restano PR separate, limiti dichiarati e nessun merge su main senza consenso esplicito. La prova su iPad reale e la revisione clinica restano controlli esterni alla verifica automatica.

## Risorse e metodo

Non sono stati importati codice, testi didattici, figure o modelli di EchoSuite nel prodotto. Le soglie del futuro calcolatore Isoelettrica dovranno essere verificate sulle fonti primarie, non assunte corrette perche presenti nel concorrente. Le licenze mostrate nel menu About sono dichiarazioni del sito: prima di un eventuale uso si devono verificare le risorse presso gli autori originali.

Le immagini usate per la verifica sono prove di interazione e analisi del prodotto, non asset da inserire nell applicazione.

- App analizzata e calcolatori: https://echosuite.app/calculators/
- Presentazione Probe Lab e indice delle 15 viste: https://echosuite.app/echo-simulator/
- Guide e percorsi di apprendimento: https://echosuite.app/guides/
- Scopo e revisione dichiarati dal prodotto: https://echosuite.app/about/
- Risorse pubbliche e indice del catalogo: https://echosuite.app/agents/
- Isoelettrica: base F0 / PR 14: https://github.com/eliseopeirano79-droid/Isoelettrica/pull/14

## Inventario dei 70 strumenti aperti

Ogni riga e stata aperta nel browser. Esempio: SI indica il pulsante eseguito nel ciclo; RA era gia stato provato prima; WMSI e stato verificato tramite la mappa. I nomi sono identificatori funzionali del catalogo, non descrizioni o testi da riutilizzare nel prodotto.

| Categoria | Strumento | ID | Prova |
|---|---|---|---|
| Atri | RA size | #ra-size | Esempio precedente |
| Atri | Right atrial pressure · IVC & hepatic flow | #rap | Esempio |
| Atri | LA size · volume index | #la-size | Esempio |
| Atri | Left atrial pressure · E/e′ | #lap-ee | Esempio |
| Atri | Left atrial pressure · MR velocity | #lap-mr | Esempio |
| Ventricolo destro | RV size | #rv-size-calc | Esempio |
| Ventricolo destro | RV function & coupling | #rv-function-calc | Esempio |
| Ventricolo destro | RV myocardial performance index | #mpi | Esempio |
| Ventricolo destro | RVSP and PASP · TR velocity | #rvsp | Esempio |
| Ventricolo destro | Pulmonary artery pressures | #pa-pressure | Esempio |
| Ventricolo destro | Mean PA pressure · RVOT acceleration time | #mpap-rvot | Esempio |
| Ventricolo destro | Pulmonary vascular resistance | #pvr | Esempio |
| Ventricolo sinistro | LV linear dimensions | #lv-linear | Esempio |
| Ventricolo sinistro | LV volumes | #lv-volume-index | Esempio |
| Ventricolo sinistro | Wall thickness & mass | #lv-mass | Esempio |
| Ventricolo sinistro | LV ejection fraction | #lv-ef | Esempio |
| Ventricolo sinistro | LV strain · GLS & serial change | #lv-gls | Esempio |
| Ventricolo sinistro | Wall-motion score index | #wmsi | Mappa interattiva |
| Ventricolo sinistro | Fractional shortening | #fractional-shortening | Esempio |
| Ventricolo sinistro | LVOT stroke volume & cardiac output | #lvot-flow | Esempio |
| Ventricolo sinistro | Left ventricular pressures | #lv-pressure | Esempio |
| Valvola aortica | Aortic size & index | #aortic-size | Esempio |
| Valvola aortica | Aortic stenosis · continuity & stress | #aortic-stenosis | Esempio |
| Valvola aortica | Aortic regurgitation · PISA | #ar-pisa | Esempio |
| Valvola aortica | Aortic regurgitation · continuity | #ar-continuity | Esempio |
| Valvola aortica | Aortic prosthesis · EOA, DVI, PPM | #aortic-prosthesis | Esempio |
| Valvola aortica | Surgical aortic prosthesis · obstruction | #aortic-prosthesis-screen | Esempio |
| Valvola aortica | Aortic prosthesis · serial comparison | #aortic-prosthesis-serial | Esempio |
| Valvola mitrale | Mitral valve area · pressure half-time | #mitral-pht | Esempio |
| Valvola mitrale | Mitral valve area · continuity | #mitral-continuity | Esempio |
| Valvola mitrale | Mitral stenosis · PISA valve area | #mitral-pisa | Esempio |
| Valvola mitrale | Mitral regurgitation · PISA | #mr-pisa | Esempio |
| Valvola mitrale | Mitral regurgitation · continuity | #mr-continuity | Esempio |
| Valvola mitrale | Mitral prosthesis · EOA, DVI, PPM | #mitral-prosthesis | Esempio |
| Valvola mitrale | Mitral prosthesis · obstruction | #mitral-prosthesis-screen | Esempio |
| Valvola tricuspide | Tricuspid stenosis · significance | #tricuspid-stenosis | Esempio |
| Valvola tricuspide | Tricuspid regurgitation · quantification | #tr-pisa | Esempio |
| Valvola polmonare | Pulmonic stenosis · peak gradient | #pulmonic-stenosis | Esempio |
| Valvola polmonare | Pulmonic regurgitation · continuity | #pulmonic-regurg | Esempio |
| Diastologia | Sinus rhythm · general pathway | #diastolic-sinus | Esempio |
| Diastologia | Atrial fibrillation | #diastolic-af | Esempio |
| Diastologia | Sinus tachycardia | #diastolic-tachycardia | Esempio |
| Diastologia | Moderate/severe MAC | #diastolic-mac | Esempio |
| Diastologia | Significant mitral regurgitation | #diastolic-mr | Esempio |
| Diastologia | Mitral stenosis | #diastolic-ms | Esempio |
| Diastologia | Hypertrophic cardiomyopathy | #diastolic-hcm | Esempio |
| Diastologia | Restrictive cardiomyopathy | #diastolic-restrictive | Esempio |
| Diastologia | Pulmonary hypertension | #diastolic-ph | Esempio |
| Diastologia | Heart transplant · sinus rhythm | #diastolic-transplant | Esempio |
| Diastologia | LV assist device | #diastolic-lvad | Esempio |
| Diastologia | Diastolic exercise echo | #diastolic-exercise | Esempio |
| Pericardio | Pericardial effusion · size | #effusion-size | Esempio |
| Pericardio | Mitral inflow · respiratory variation | #mitral-respiratory | Esempio |
| Pericardio | Tricuspid inflow · respiratory variation | #tricuspid-respiratory | Esempio |
| Pericardio | LVOT · respiratory variation | #lvot-respiratory | Esempio |
| Pericardio | Hepatic vein · expiratory reversal | #hepatic-expiratory-reversal | Esempio |
| Pericardio | Annulus reversus · medial / lateral e′ | #annulus-reversus | Esempio |
| Fisica e superficie corporea | Wave relationships | #wave-relations | Esempio |
| Fisica e superficie corporea | Acoustic impedance and intensity | #acoustic | Esempio |
| Fisica e superficie corporea | Pulse repetition and Nyquist | #pulse-repetition | Esempio |
| Fisica e superficie corporea | Pulse length and near field | #pulse-geometry | Esempio |
| Fisica e superficie corporea | Doppler equation | #doppler-equation | Esempio |
| Fisica e superficie corporea | Poiseuille flow | #poiseuille | Esempio |
| Fisica e superficie corporea | Body surface area · height and weight | #bsa | Esempio |
| Shunt e congenite | Qp/Qs · Doppler stroke volumes | #qpqs | Esempio |
| Shunt e congenite | ASD · anatomy, shunt & Doppler | #asd | Esempio |
| Shunt e congenite | VSD · size & right-heart pressure | #vsd-pressure | Esempio |
| Shunt e congenite | PDA · shunt & PA pressure | #pda-pressure | Esempio |
| Shunt e congenite | Coarctation · anatomy & gradients | #coarctation | Esempio |
| Shunt e congenite | Fontan · circulation & gradients | #fontan-gradient | Esempio |
