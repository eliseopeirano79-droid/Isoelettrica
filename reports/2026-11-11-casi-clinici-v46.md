# Casi clinici con paziente 3D — v46.0 (11 novembre 2026)

## Richiesta
Sezione di casi clinici interattivi con paziente di fronte, farmaci da somministrare e animazione 3D, medicalmente verificata.

## Che cosa è stato fatto
- Nuova voce **Casi clinici** nella barra, con 11 casi e 50 decisioni: STEMI anteriore con fibrillazione ventricolare, tachicardia da rientro nodale, fibrillazione atriale pre-eccitata, blocco AV completo, iperkaliemia, arresto in fibrillazione ventricolare, tachicardia ventricolare con polso, torsione di punta, embolia polmonare ad alto rischio, pericardite acuta, fibrillazione atriale ad alta risposta.
- ECG di ogni fase generato dal motore esistente; passaggi di stato con `Stream.cambiaRitmo` e artefatto di scarica con `Stream.scarica`.
- Paziente 3D stilizzato in Three.js (stessa libreria già presente), con stati clinici e manovre animate.
- Punteggio per caso salvato sul dispositivo (`localStorage`, chiave `iso-casi-v1`).
- `app.js`: tre righe aggiunte (interfaccia `window.ISO_APP` in sola lettura, richiamo in `showView` e `onTheme`). `sw.js`: quattro file aggiunti alla cache. Versione 46.0.

## Verifica dei contenuti
Ogni dose e ogni soglia è stata confrontata con la fonte citata nel passaggio. Punti controllati espressamente: adrenalina 1 mg e amiodarone 300 mg dopo la terza scarica, 150 mg dopo la quinta; atropina 500 µg fino a 3 mg e sua esclusione nel blocco AV di alto grado a QRS larghi; isoprenalina 5 µg/min, adrenalina 2–10 µg/min; calcio cloruro 10% 10 mL o gluconato 10% 30 mL, insulina 10 U con glucosio 25 g, salbutamolo 10–20 mg; aspirina 150–300 mg, ossigeno solo se SpO₂ < 90%, angioplastica entro 120 min; adenosina 6–18 mg; farmaci controindicati nella fibrillazione atriale pre-eccitata; CHA₂DS₂-VA e soglia delle 24 ore; alteplase 100 mg in 2 ore; antinfiammatorio più colchicina.

## Limiti dichiarati
- Nessuna revisione o certificazione da parte di un cardiologo.
- Il paziente è una figura stilizzata, non un modello anatomico né un video pre-renderizzato.
- Le conseguenze delle scelte errate sono semplificazioni didattiche dichiarate a schermo.
- La dose del magnesio (2 g) segue la pratica ERC; la linea guida ESC 2022 raccomanda il magnesio endovena.
- Schema posologico della colchicina secondo il peso: indicato in forma generale.
- Provato in Chrome simulato (1180×820 e 390×844). Safari su iPad reale: da fare.

## Test
`npm test`: 102/102 scenari, 329/329 criteri, 159 test Node, 5 test Python. Hash di `engine.js` e `data.js` invariati rispetto a `STATO.md`.

## Seconda parte della stessa sessione

Richiesta: casi veri da fonti aperte, più casi, immagini più verosimili.

- **ECG reali.** 96 tracciati di PTB-XL 1.0.3 (CC BY 4.0), scelti dai metadati con `tools/build-casi-reali.py`: validati, senza artefatti segnalati, una sola diagnosi a probabilità 100. Mostrano età, sesso e referto originale. L’archivio non contiene sintomi né decorso, e l’app lo dichiara: nessuna storia clinica è stata attribuita a questi pazienti.
- **Casi guidati.** Aggiunti flutter atriale 2:1, sindrome di Wellens, tamponamento cardiaco, sindrome di Brugada con febbre: 15 casi, 66 decisioni.
- **Paziente.** Sostituita la figura a primitive con la mesh umana di MakeHuman (CC0) con scheletro e pesi originali, quattro corporature, presìdi agganciati alle ossa.

### Limiti aggiunti
- Da questo ambiente il mirror dei segnali PTB-XL non è raggiungibile: la modalità è stata provata con una registrazione sostitutiva e sul percorso di errore, non con i file veri. I 96 tracciati non sono stati riguardati uno per uno.
- Senza una texture con licenza aperta a disposizione, la pelle è a tinta unita; nessuna mimica facciale; negli anziani gli occhi risultano poco visibili.
- Flecainide nel flutter, tempi della strategia invasiva, pericardiocentesi e raccomandazioni nella sindrome di Brugada sono formulate secondo ESC 2019, 2023, 2025 e 2022; le ultime tre non sono state riverificate sul testo in questa sessione.
- Il caso sull’intossicazione da triciclici è stato escluso perché la dose del bicarbonato non era verificabile sulla fonte 2025.
