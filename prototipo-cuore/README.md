# Laboratori cardiaci di Isoelettrica

Due schermate autonome e collegate fra loro, ancora locali: `/prototipo-cuore/` per l’adulto e `/prototipo-cuore/fetale.html` per il circuito fetale. La navigazione, la cache e il codice della versione online non sono modificati.

Dalla radice del repository avviare un server HTTP locale. Le pagine usano Three.js r128, GLTFLoader e il motore ECG già presenti nel progetto; nessuna dipendenza remota a runtime. Non aprire direttamente i file sorgenti HTML senza server: GLB e percorsi coronarici vengono caricati come risorse relative. Le copie autonome nella consegna incorporano invece le risorse.

## Adulto

39 geometrie Z-Anatomy, 86 elementi selezionabili includendo le ricostruzioni e nascondendo i nove lembi statici sostituiti. Quattro camere, coronarie, vene, grandi vasi e apparati valvolari; sezioni sui tre assi, inversione e isolamento di una fetta, per tutte le strutture o solo alcune. I tagli sono aperti e non generano superfici di chiusura.

Sette fasi regolabili, 38 parametri globali, 11 lembi animati, anelli e corde ricostruiti. La durata complessiva controlla il ritmo sinusale; atri e ventricoli seguono eventi ECG separati nel BAV III. Le branche possono essere bloccate; il blocco di entrambe attiva uno scappamento ventricolare. I transiti terminali scalano il QRS in modo illustrativo. Asistolia e FV non generano un ciclo di pompaggio organizzato.

41 percorsi coronarici conservano le curve della fonte. Fino a 16 lesioni con posizione, lunghezza e riduzione del diametro; i marcatori vengono attenuati a valle, anche sulle diramazioni geometricamente connesse. La connessione fra rami è inferita per prossimità, non validata come albero clinico. Non si calcolano FFR, pressioni, collaterali o territori ischemici automatici.

Fino a 32 regioni tissutali con colore libero, centro, raggio e intensità. Ischemia, necrosi e fibrosi attenuano localmente il movimento; non costituiscono modelli istologici e non generano automaticamente alterazioni ECG. Ogni struttura ha colore, posizione, dimensione e opacità. Il Botallo adulto passa da legamento a dotto pervio con diametro modificabile.

`lab-core.js` contiene registro dei parametri, meccanica, validazione, geometria dei percorsi e trasmissione delle ostruzioni; `lab.js` collega questi dati a UI e scene. Configurazione JSON versionata; salvataggio locale, esportazione, importazione e ripristino. I limiti di 16/32 sono capacità esplicite di questa implementazione, non una promessa di dati infiniti. Il registro è estendibile.

## Circolazione fetale

Schermata, configurazione e memoria locale indipendenti. Rete spaziale con 19 nodi e 28 percorsi: placenta, vena e due arterie ombelicali, dotto venoso, forame ovale, dotto arterioso, camere e valvole, polmoni, ritorni cavali, distretti superiore/inferiore, coronarie, fegato e circolo portale. L’anatomia cardiaca di riferimento è adulta; il circuito è uno schema funzionale, non una segmentazione fetale.

13 parametri, alcuni raccolti in un pannello avanzato. Quattro configurazioni: fetale, transizione, neonatale e dotto pervio postnatale. La rete conserva il bilancio dei flussi ai nodi; flussi e colori sono relativi. Le percentuali sono impostazioni illustrative, non valori normativi. Direzione del dotto imposta manualmente, senza predizione pressoria. Mescolamento omogeneo, senza streaming preferenziale.

`fetal-core.js` separa topologia e calcolo dalla geometria di `fetal.js`. Vedere [SVILUPPO-CONGENITE.md](SVILUPPO-CONGENITE.md) per le estensioni da implementare prima di introdurre cardiopatie specifiche.

## Provenienza e verifica

Vedere [ATTRIBUZIONI.md](ATTRIBUZIONI.md) e [SOURCE-LICENSE.txt](SOURCE-LICENSE.txt). Anatomia modificata e curve derivate distribuite sotto CC BY-SA 4.0 con attribuzione BodyParts3D e Z-Anatomy.

Rigenerazione, con gli script incorporati nella fonte disabilitati:

```
blender --background --factory-startup --disable-autoexec --python prototipo-cuore/export-source.py -- /path/to/Startup.blend /path/to/output-directory
```

Test dedicati: `node --test tests/heart-preview.test.cjs tests/heart-lab.test.cjs` — 20 superati. Controllano integrità del GLB, accoppiamento dei tempi, valvole durante le fasi isovolumetriche, BAV, FV/asistolia, deformazione locale, ostruzioni sui rami, importazioni e conservazione dei flussi fetali.

La suite generale conserva cinque fallimenti già riprodotti sul commit originale b939c87: aspettative del quiz (6 immagini invece di 78) e cache ancora riferita a v42.0 invece di v42.2. Non sono stati modificati in questo laboratorio.
