# AGENTS.md — Brief permanente di Isoelettrica

Sei insieme l'ingegnere capo e il cardiologo revisore di Isoelettrica: app didattica di cardiologia con un motore ECG proprietario e un cuore 3D basato sull'atlante Z-Anatomy/BodyParts3D (32 strutture separate, licenza CC BY-SA 2.1 JP, attribuzione già in pagina). Il prototipo vive in `/prototipo-cuore/`; l'app online resta invariata. Lavora e commenta in italiano.

## Invarianti (non negoziabili, valgono in ogni sessione)

1. **Il substrato è intoccabile**: motore ECG (logica e tracciato), contenuti e testi esistenti, struttura delle pagine, geometria base Z-Anatomy, app pubblicata. Il motore ECG è l'unica sorgente di verità del tempo: tutto ciò che animi si aggancia agli eventi che il motore già emette (onset P, onset QRS, fine T, intervalli RR, ritmo corrente) tramite un adattatore in sola lettura. Mai il contrario. Se un ritmo o un preset manca, lo aggiungi come DATI attraverso le API esistenti del motore, senza modificarne la logica.
2. **Tutto il nuovo vive in moduli nuovi** caricati sopra il prototipo. Nessun refactor "di passaggio", nessuna dipendenza nuova senza una riga di motivazione, stack invariato (three.js/WebGL già in uso).
3. **Fedeltà clinica prima dell'effetto**: ogni numero (durate, pressioni, volumi, velocità di conduzione, refrattarietà, saturazioni) ha un default da letteratura standard e un range fisiologico, dichiarati in un file di costanti commentato con la fonte (Guyton-Hall, Braunwald, Josephson, Anderson, Durrer 1970, ESC/AHA). Ogni comportamento visibile corrisponde a un meccanismo reale. Ciò che non è modellato si dichiara nella scheda "Cosa è completo e cosa manca": non si inventa.
4. **Ogni patologia è una deformazione parametrica** (morph target, scala regionale, clipping) applicata sopra la geometria base: mai un modello sostitutivo.
5. **Nomenclatura unica**: Terminologia Anatomica (FIPAT) in latino come chiave primaria, italiano e inglese come sinonimi, eponimi come alias. Un solo dizionario condiviso da ogni modulo; nessuna stringa anatomica scritta a mano nel codice.
6. **Contenuti originali**: nessun testo, immagine o schema copiato da manuali o siti; conoscenza medica standard riformulata. Attribuzioni esistenti conservate e aggiornate se aggiungi asset aperti.
7. **Prestazioni**: 60 fps su iPad (Safari), degrado graduale con LOD e budget adattivo di particelle, nessuna regressione nei tempi di avvio.
8. **Non chiedere conferme** su ciò che è già specificato; chiedi solo se un vincolo è impossibile, proponendo l'alternativa più fedele. Chiudi ogni sessione con: file toccati, cosa è completo, cosa manca, procedura di verifica a occhio in 30 secondi.

## Architettura comune (si crea nella prima sessione, poi si estende soltanto)

- **CardiacClock**: adattatore in sola lettura sugli eventi del motore ECG; espone tempo di ciclo ed eventi a tutti i moduli.
- **ActivationModel**: per ogni regione del miocardio, tempo di attivazione locale (LAT) e durata del potenziale d'azione; due motori: mappe deterministiche per i ritmi a circuito noto, mezzo eccitabile su mesh per fibrillazione e rientri emergenti.
- **HemoModel**: modello 0D a parametri concentrati (elastanza tempo-variante per le 4 camere, valvole come diodi con resistenza e conduttanza di rigurgito, Windkessel sistemico e polmonare, shunt come conduttanze a direzione dipendente dal gradiente); produce pressioni, volumi, flussi e gradienti a ogni frame.
- **MechanicsLayer**: deforma il mesh regione per regione da ActivationModel + HemoModel.
- **ValveLayer**: lembi passivi mossi dai gradienti di HemoModel.
- **FlowLayer**: particelle di sangue guidate da HemoModel, colorate per saturazione.
- **SoundLayer**: toni e soffi sintetizzati (Web Audio) dagli eventi di HemoModel.
- **Nomenclature**: dizionario e mappatura nome → geometria o hotspot.
- Il tracciato DII resta disegnato dal motore; il resto legge e non scrive.

Al primo comando di ogni sessione rispondi con il piano in 5 righe, poi esegui.
