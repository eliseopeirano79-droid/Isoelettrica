# Anteprima del cuore Z-Anatomy

Prototipo autonomo per valutare la sostituzione della geometria procedurale di Isoelettrica. Non è collegato alla navigazione principale né alla cache di produzione.

Dalla radice del repository, avviare un server HTTP locale e aprire `/prototipo-cuore/`. Usa le copie del motore ECG, dei dati e di Three.js già presenti nel progetto. Il codice di produzione non viene modificato.

Vedere [ATTRIBUZIONI.md](ATTRIBUZIONI.md) per licenza, modifiche e inventario delle parti mancanti. Le valvole restano statiche; la conduzione è un’aggiunta illustrativa non ancora revisionata sulla nuova anatomia. La contrazione è didattica, non biomeccanica.

Per rigenerare il GLB con Blender installato:

```
blender --background --factory-startup --disable-autoexec --python prototipo-cuore/export-source.py -- /path/to/Startup.blend /path/to/output-directory
```

Usare il file ufficiale della revisione Z-Anatomy indicata nel manifest. Gli script incorporati nel file sorgente devono restare disabilitati.

Controlli dedicati: `node --test tests/heart-preview.test.cjs` (4 superati).

La suite generale ha cinque fallimenti preesistenti, riprodotti sul commit originale b939c87: aspettative del quiz (6 immagini invece di 78) e cache ancora riferita a v42.0 invece di v42.2. Non sono stati modificati in questo prototipo.
