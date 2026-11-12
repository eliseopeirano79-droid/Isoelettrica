# Ecocardio Studio 03 — v47.2

Laboratorio didattico di Isoelettrica. Il settore ecografico viene campionato da un volume derivato dal cuore dell’atlante e dallo stesso movimento usato nella scena 3D. Non sono immagini cliniche né una simulazione acustica validata.

## Prova rapida

1. Apri `ecocardio/index.html` tramite lo stesso server HTTP dell’app.
2. In **Torace**, apri **Livelli** e regola la trasparenza di cute e scheletro: il modello comprende le 12 coppie di coste dell’atlante, cartilagini costali, sterno, clavicole, vertebre e dischi toracici.
3. Scegli **Valvole in movimento → Mitrale**, metti in pausa e sposta il cursore fra 25% e 65% del ciclo sinusale predefinito. I due lembi si chiudono e si aprono; selezionando **Aortica** osservi la sequenza opposta. Tricuspide e polmonare sono selezionabili nello stesso menu. La vista dalla base è ruotabile per osservare le corde. A ¼× il movimento è più facile da seguire.
4. Seleziona **Apicale → A4C → Doppio piano**. Ruota il piano B: i due settori condividono origine e istante cardiaco.
5. Attiva **Anatomia**, tocca una parete nel settore A e osserva la struttura evidenziata nel 3D. **Seziona** rimuove la porzione anteriore rispetto al piano per guardare l’interno.
6. In **Parasternale → PSAX · Pap → M-mode**, scegli la linea nel settore e riproduci il ciclo. Il grafico accumula i campioni lungo quella linea. Cambiare sonda o impostazioni svuota la storia precedente.
7. Usa **Acquisisci**, quindi **Acquisizioni → Affianca** o **Riapri**. Si conservano fino a quattro fotogrammi con vista, sonda, impostazioni e fase, nel browser corrente.
8. **Percorso** propone otto esercizi. La guida e il ripristino del riferimento registrano un tentativo assistito; il contatore indipendente non avanza con il solo reset.

## Moduli

| File | Responsabilità |
| --- | --- |
| `core.js` | Basi ortonormali, contatto sulla superficie, coordinate del settore, intersezioni di mesh e riscontro geometrico |
| `views.js` | Undici preset geometrici, allineamento dei riferimenti valvolari, dizionario di 35 strutture cardiache visualizzate, fonti |
| `volume.js`, `tissue.bin`, `tissue.json` | Volume derivato, decodifica RLE, campionamento trilineare, inversione della deformazione condivisa |
| `body.js`, `body.bin` | Torace derivato dal paziente MakeHuman esistente e superficie di contatto |
| `thorax.js`, `thorax.bin`, `thorax.json` | 72 strutture dello scheletro toracico tratte dalla stessa revisione Z-Anatomy del cuore, con trasformazione comune e provenienza |
| `valves.js` | Quattro valvole mobili, lembi e cuspidi separati, corde illustrative, coaptazione e campi di densità condivisi con l’imaging |
| `imaging.js` | B-mode illustrativo, sezione anatomica, linea M, guadagno/contrasto/fuoco/TGC relativi |
| `scene.js`, `raster.js` | Scena Three.js e percorso CPU con profondità e illuminazione delle superfici |
| `training.js` | Obiettivi degli otto esercizi e condizioni di completamento |
| `app.js` | Interazioni, ciclo, doppio piano, M-mode, misure, acquisizioni e progressi locali |
| `host.js` | Iframe a caricamento differito nell’app principale, sospensione fuori vista |

Il runtime non aggiunge dipendenze. Legge CardiacClock e CardiacMechanics senza cambiare il motore ECG. La continuità temporale è quella del ciclo sinusale ripetuto del modello; non è la registrazione di un paziente. Le valvole seguono una temporizzazione illustrativa legata agli eventi ECG: non sono mosse da gradienti di pressione. Le superfici mobili producono anche la densità letta da B-mode e M-mode; il volume statico dei soli lembi originali viene escluso in memoria, conservando pareti e papillari.

## Rigenerazione degli asset

I file binari sono già inclusi: non occorre eseguire questi comandi per usare l’app. Per rigenerarli servono Node.js, Python 3, NumPy e SciPy. Dal percorso principale del repository:

```sh
node tools/export-echo-atlas.cjs /tmp/isoelettrica-echo-atlas.json
python3 tools/build-echo-volume.py /tmp/isoelettrica-echo-atlas.json ecocardio/tissue.bin
python3 tools/build-echo-body.py paziente-corpo.bin ecocardio/body.bin
node --test tests/ecocardio.test.cjs
node --test tests/echo-anatomy.test.cjs
```

Per rigenerare lo scheletro serve anche Blender. Scaricare `Z-Anatomy.zip` dalla revisione `2b652413b1116c9119e616eabc1e63af3cc6267d` del repository [Z-Anatomy](https://github.com/Z-Anatomy/Models-of-human-anatomy), estrarre `Startup.blend`, quindi:

```sh
blender --factory-startup -b -Y --python tools/build-echo-thorax.py -- /percorso/Startup.blend ecocardio/thorax.bin
```

Il generatore carica soltanto gli oggetti necessari, senza eseguire script del file Blender. Conserva la topologia triangolata di base e quantizza le posizioni con passo 0,0005 in unità dell’atlante. La trasformazione coincide con l’esportazione del cuore originale; il controllo sui limiti di atrio destro e ventricolo sinistro rileva una differenza inferiore a 0,000003 unità. La cute MakeHuman è un modello indipendente adattato alle dimensioni del torace, non il corpo originario dell’atlante.

Il volume ha 128 × 204 × 120 celle, passo 0,024 in unità dell’atlante. Il generatore combina il conteggio delle intersezioni di parete su tre assi, esclude raggi non chiusi, limita le ricostruzioni in prossimità delle superfici originali e applica una regolarizzazione. Vasi e superfici valvolari hanno uno spessore illustrativo dichiarato; non vengono riempiti i modelli solidi dei lumi come se fossero miocardio. `tissue.json` riporta algoritmo, parametri, inventario, licenza e SHA-256 dell’esportazione sorgente. Il GLB originale rimane immutato.

## Confini

- Le coste e lo scheletro derivano dall’atlante; preset, registrazione della cute e postura di acquisizione restano illustrativi. La superficie guida il contatto, senza pressione o deformazione cutanea.
- Le strutture originali e le ricostruzioni disponibili restano incomplete. I lembi parametrici si muovono, ma non costituiscono un apparato valvolare completo guidato da pressioni: inserzioni cordali e geometria dei lembi sono approssimate, manca una ricostruzione completa dei papillari. Il tratto di VCI è quello toracico.
- Guadagno, fuoco, TGC, texture e attenuazione sono trasformazioni grafiche relative. Niente propagazione acustica, ombre costali fisiche, Doppler o velocità del sangue.
- M-mode campiona il modello alla frequenza effettiva di rendering. Non ha una risoluzione temporale superiore al B-mode come un M-mode clinico dedicato. Il tempo riportato è quello della simulazione, influenzato dalla velocità scelta.
- Il calibro misura il piano in **unità dell’atlante**, non centimetri; non produce FE, volumi clinici o diagnosi.
- Gli esercizi controllano azioni e corrispondenza al modello. Non certificano competenza clinica. I progressi e le quattro acquisizioni sono locali al browser e non sono sincronizzati fra dispositivi.
- Verifica visuale eseguita nel renderer CPU del browser disponibile. WebGL su hardware reale, Safari/iPad, prestazioni touch e uso in modalità aereo restano da verificare.

Fonti didattiche: [ASE 2019](https://www.asecho.org/wp-content/uploads/2019/01/2019_Comprehensive-TTE.pdf), [BSE minimum dataset](https://pmc.ncbi.nlm.nih.gov/articles/PMC7923056/), [OpenStax: ciclo cardiaco](https://openstax.org/books/anatomy-and-physiology/pages/19-3-cardiac-cycle), [OpenStax: gabbia toracica](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-4-the-thoracic-cage). Licenze e adattamenti: [attribuzioni](../prototipo-cuore/ATTRIBUZIONI.md). Report della revisione: [Studio 03](../reports/2026-11-12-anatomia-ecocardio-v47-2.md).
