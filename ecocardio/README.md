# Ecocardio Studio 02 — v47.1

Laboratorio didattico di Isoelettrica. Il settore ecografico viene campionato da un volume derivato dal cuore dell’atlante e dallo stesso movimento usato nella scena 3D. Non sono immagini cliniche né una simulazione acustica validata.

## Prova rapida

1. Apri `ecocardio/index.html` tramite lo stesso server HTTP dell’app.
2. Seleziona **Apicale → A4C → Doppio piano**. Ruota il piano B: i due settori condividono origine e istante cardiaco.
3. Attiva **Anatomia**, tocca una parete nel settore A e osserva la struttura evidenziata nel 3D. **Seziona** rimuove la porzione anteriore rispetto al piano per guardare l’interno.
4. In **Parasternale → PSAX · Pap → M-mode**, scegli la linea nel settore e riproduci il ciclo. Il grafico accumula i campioni lungo quella linea. Cambiare sonda o impostazioni svuota la storia precedente.
5. Usa **Acquisisci**, quindi **Acquisizioni → Affianca** o **Riapri**. Si conservano fino a quattro fotogrammi con vista, sonda, impostazioni e fase, nel browser corrente.
6. **Percorso** propone otto esercizi. La guida e il ripristino del riferimento registrano un tentativo assistito; il contatore indipendente non avanza con il solo reset.

## Moduli

| File | Responsabilità |
| --- | --- |
| `core.js` | Basi ortonormali, contatto sulla superficie, coordinate del settore, intersezioni di mesh e riscontro geometrico |
| `views.js` | Undici preset geometrici, dizionario delle 33 strutture visualizzate, fonti |
| `volume.js`, `tissue.bin`, `tissue.json` | Volume derivato, decodifica RLE, campionamento trilineare, inversione della deformazione condivisa |
| `body.js`, `body.bin` | Torace derivato dal paziente MakeHuman esistente e superficie di contatto |
| `imaging.js` | B-mode illustrativo, sezione anatomica, linea M, guadagno/contrasto/fuoco/TGC relativi |
| `scene.js`, `raster.js` | Scena Three.js e percorso CPU con profondità e illuminazione delle superfici |
| `training.js` | Obiettivi degli otto esercizi e condizioni di completamento |
| `app.js` | Interazioni, ciclo, doppio piano, M-mode, misure, acquisizioni e progressi locali |
| `host.js` | Iframe a caricamento differito nell’app principale, sospensione fuori vista |

Il runtime non aggiunge dipendenze. Legge CardiacClock e CardiacMechanics senza cambiare il motore ECG. La continuità temporale è quella del ciclo sinusale ripetuto del modello; non è la registrazione di un paziente.

## Rigenerazione degli asset

I file binari sono già inclusi: non occorre eseguire questi comandi per usare l’app. Per rigenerarli servono Node.js, Python 3, NumPy e SciPy. Dal percorso principale del repository:

```sh
node tools/export-echo-atlas.cjs /tmp/isoelettrica-echo-atlas.json
python3 tools/build-echo-volume.py /tmp/isoelettrica-echo-atlas.json ecocardio/tissue.bin
python3 tools/build-echo-body.py paziente-corpo.bin ecocardio/body.bin
node --test tests/ecocardio.test.cjs
```

Il volume ha 128 × 204 × 120 celle, passo 0,024 in unità dell’atlante. Il generatore combina il conteggio delle intersezioni di parete su tre assi, esclude raggi non chiusi, limita le ricostruzioni in prossimità delle superfici originali e applica una regolarizzazione. Vasi e superfici valvolari hanno uno spessore illustrativo dichiarato; non vengono riempiti i modelli solidi dei lumi come se fossero miocardio. `tissue.json` riporta algoritmo, parametri, inventario, licenza e SHA-256 dell’esportazione sorgente. Il GLB originale rimane immutato.

## Confini

- Preset, torace, coste e registrazione cuore/cute sono illustrativi. La superficie guida il contatto, senza pressione, deformazione cutanea o postura clinica del paziente.
- Le strutture originali e le ricostruzioni disponibili restano incomplete. In particolare non è un apparato valvolare completo e dinamico guidato da pressioni; il tratto di VCI è quello toracico.
- Guadagno, fuoco, TGC, texture e attenuazione sono trasformazioni grafiche relative. Niente propagazione acustica, ombre costali fisiche, Doppler o velocità del sangue.
- M-mode campiona il modello alla frequenza effettiva di rendering. Non ha una risoluzione temporale superiore al B-mode come un M-mode clinico dedicato. Il tempo riportato è quello della simulazione, influenzato dalla velocità scelta.
- Il calibro misura il piano in **unità dell’atlante**, non centimetri; non produce FE, volumi clinici o diagnosi.
- Gli esercizi controllano azioni e corrispondenza al modello. Non certificano competenza clinica. I progressi e le quattro acquisizioni sono locali al browser e non sono sincronizzati fra dispositivi.
- Verifica visuale eseguita nel renderer CPU del browser disponibile. WebGL su hardware reale, Safari/iPad, prestazioni touch e uso in modalità aereo restano da verificare.

Fonti didattiche: [ASE 2019](https://www.asecho.org/wp-content/uploads/2019/01/2019_Comprehensive-TTE.pdf), [BSE minimum dataset](https://pmc.ncbi.nlm.nih.gov/articles/PMC7923056/). Licenze e adattamenti: [attribuzioni](../prototipo-cuore/ATTRIBUZIONI.md). Report della revisione: [Studio 02](../reports/2026-11-12-ecocardio-studio-02.md).
