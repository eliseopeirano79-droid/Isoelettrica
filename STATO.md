# STATO — registro di avanzamento

Aggiorna questa pagina alla fine di ogni sessione. Stati ammessi: `da fare` · `in corso` (con criteri aperti) · `completato` · `bloccato` (con motivo).

| # | Prompt | Stato | Ultima sessione | Criteri aperti / note |
|---|--------|-------|-----------------|-----------------------|
| 01 | Fondazioni: orologio, regioni, attivazione sinusale | in corso | 2026-09-23 · v44 | CardiacClock in sola lettura; 17 segmenti VS; grafo illustrativo condiviso e registrato sul cuore, rientri e Kent selezionabile. Mancano attivazione regionale validata, regioni atriali/VD/setto, LAT/APD/isocrone e validazione sinusale a 70 bpm. |
| 02 | Ciclo cardiaco in 7 fasi, pannello Wiggers, parametri | da fare | — | — |
| 03 | Valvole: anatomia e animazione passiva | in corso | 2026-09-23 · v44 | Cuspidi semilunari ricostruite, inserzioni e coaptazione condivise. Mancano gradienti di pressione, anatomia completa e validazione. |
| 04 | Nomenclatura totale | da fare | — | — |
| 05 | Cardiopatie congenite | in corso | 2026-09-23 · v44 | Sette morfologie illustrative modificabili oltre al Botallo. Mancano cardiopatie complesse, shunt e conseguenze emodinamiche. |
| 06 | Cardiopatie acquisite e dispositivi | da fare | — | — |
| 07 | Aritmie: attivazione e movimento | da fare | — | — |
| 08 | Flusso sanguigno e resa grafica | da fare | — | — |
| 09 | Circolazione fetale e transizione neonatale | da fare | — | — |
| 10 | Revisione clinica e tecnica (ricorrente) | in corso | 2026-09-23 | Revisione tecnica e limiti documentati. Nessuna certificazione indipendente di un cardiologo; verifica iPad non eseguita. |

## Hash di riferimento del motore ECG

Alla prima sessione registra qui il percorso e l'hash (sha256) di ogni file del motore ECG e di ogni file dell'app pubblicata che il prototipo condivide. Ogni sessione successiva li ricontrolla e riporta l'esito nel report.

| File | sha256 |
|------|--------|
| engine.js | f578675e70fd9f4d7f4e0e48c34fc6979b1010d461626ff6104f94d85b931dcd |
| data.js | 95d6242ea3fff572c494d751462a1afda5e11774a55e899bbaa87717561ae577 |
| ipertrofie.js | aa1f1377c6304fd009e21bdfa728dbf685a7dda0343b6fc9c7f3cd9a4a88a39d |
| quiz.js | 24bafdf1d0108b6926cc6c28d36a9c3ad47fca923e25fb5e0d70e70e623a4c54 |
| atlante-digitale.js | 1f86e2147fbc5a805416f0cb164e72b39b01f2135419f80e037f9f5072aa02ea |
| ptbxl.js | 246c9ca8b5ee57c0d74e5bedc4819cdcba0e48c2075b05b6d37fed85a0ab4b02 |
| prototipo-cuore/heart-z-anatomy.glb | 66c3c5d1de97663d8b82a10d57968c2bc2a938fba05d5b11911d402290c5c1af |

## Registro delle sessioni

Una riga per sessione, la più recente in alto.

| Data | Prompt (e parte) | Ramo | Commit finale | Esito |
|------|------------------|------|---------------|-------|
| 2026-09-23 | Osti venosi/cavali, infundibolo e tronco polmonare · v44 | feat/conduzione-patologia-v44 | commit che contiene questo report | 140 test Node + 5 Python; raccordi interno/esterno e biforcazione continua; anteprima desktop verificata; non pubblicata |
| 2026-09-23 | Raccordi vascolari, semilunari, congenite e Fisiologia · v44 | feat/conduzione-patologia-v44 | commit che contiene questo report | 135 test Node + 5 Python; anteprima desktop/mobile; riferimento di Fisiologia invariato; non pubblicata |
| 2026-09-23 | Meccanica coerente richiesta dall’utente · v44 | feat/conduzione-patologia-v44 | commit che contiene questo report | 125 test Node + 5 Python; elasticità e vincoli geometrici; anteprima verificata; non pubblicata |
| 2026-09-23 | Correzioni richieste dall’utente · v44 | feat/conduzione-patologia-v44 | commit che contiene questo report | 114 test Node + 5 Python; anteprima verificata; pubblicazione da autorizzare |
| 2026-09-23 | Integrazione app + 01 A | feat/anatomia-app | 99302d7 | v43 pubblicata con consenso esplicito tramite PR #6; Pages e aggiornamento cache verificati; prompt 01 aperto |

## Cosa è completo e cosa manca

Copia sincronizzata con la scheda "Cosa è completo e cosa manca" del prototipo. Aggiornala a ogni sessione.

- Completo: nuova Anatomia con laboratorio adulto e fetale separato; vecchi assi e orbitali preservati in Fisiologia; cuore Z-Anatomy sotto ECG e in Coronarie; raccordo polmonare aggiunto; grafica comune; controlli preesistenti delle occlusioni e territori; funzionamento offline degli asset; CardiacClock in sola lettura. Il laboratorio precedente conserva sezioni, valvole animate, parametri, Botallo, ostruzioni, mappe tissutali e importazione/esportazione.
- Aggiunto in v44: conduzione e impulsi nello stesso spazio del modello, vie rapida/lenta, Kent in 10 sedi e James opzionale; rientri AVNRT/AVRT illustrativi; BAV III e blocchi di branca con animazione dedicata; Patologia con 172 voci (101 ECG, 8 valvole animate, Botallo configurabile, 7 morfologie congenite illustrative, 55 localizzazioni); trasparenza e coronarie nascoste; tema chiaro; correzione del restringimento polmonare. Queste aggiunte non completano i moduli avanzati del kit.
- Aggiunta nella revisione meccanica v44: risposta massa–molla–smorzatore a passo temporale fisso, deformazione continua comune e normali aggiornate; attacchi valvolari e corde vincolati, riferimenti e selezione sulla superficie deformata, rigidità/smorzamento relativi modificabili. È un modello elastico ridotto, non una simulazione completa di pressioni o tessuti.
- Aggiunta nella revisione anatomica v44: arco raccordato e tre tronchi epiaortici; quattro osti venosi condivisi con la parete atriale; polmonari prossimali e Botallo collegati sulle superfici; cuspidi semilunari a tasca; vie internodali anteriore/Wenckebach/Thorel e Bachmann. Il livello anatomico di Fisiologia usa lo stesso atlante, con riferimento preesistente invariato.
- Mancante o non ancora modellato: attivazione regionale validata e isocrone, grafo elettrofisiologico validato, dizionario TA completo, HemoModel, valvole passive guidate da gradienti, simulazioni complete di cardiopatie congenite/acquisite, mezzo eccitabile per rientri/FV, streaming e saturazioni fetali cliniche, suoni, prestazioni iPad. I controlli meccanici del laboratorio precedente possono ancora impostare la frequenza sinusale: separazione da completare nel prompt 01 prima di avanzare al 02.

## Priorità confermate dall’utente il 23 settembre

La richiesta attuale supera il vincolo originario «solo prototipo»: integrare nell’app preservando la grafica approvata, chiamare **Fisiologia** il laboratorio preesistente degli assi e **Anatomia** quello nuovo. Nessun’altra sezione viene eliminata o rinominata. v43 pubblicata e verificata. v44 preparata separatamente; pubblicazione non ancora eseguita.

Tutti i prompt originali restano in `sviluppo/prompts/`; non si considerano completati dalla presenza delle animazioni illustrative precedenti. La parte 01 A non soddisfa ancora l’intera accettazione del prompt 01. I prompt 03 e 05 sono avviati soltanto nelle parti richieste; gli altri moduli restano aperti secondo la tabella.

La richiesta successiva sulle vie accessorie, Patologia, trasparenza e tema è stata affrontata come correzione esplicitamente richiesta, senza dichiarare completati i prompt 02–09. Dettagli, fonti e limiti nel report `reports/2026-09-23-conduzione-patologia-v44.md`.

L’ulteriore richiesta di fisica è trattata nella stessa proposta v44, con vincoli geometrici e dinamica elastica semplificata. Non completa i prompt 02–03 né introduce pressioni calibrate, interazione fluido–struttura o collisioni complete. Dettagli nel report `reports/2026-09-23-meccanica-coerente-v44.md`.

La revisione di osti, Botallo, arco e semilunari è documentata in `reports/2026-09-23-raccordi-anatomici-v44.md`. Anteprima aggiornata senza cache: `http://127.0.0.1:8002/?preview=1`.
