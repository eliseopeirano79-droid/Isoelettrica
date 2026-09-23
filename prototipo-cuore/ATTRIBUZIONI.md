# Fonte e adattamenti del cuore anatomico

`heart-z-anatomy.glb` e `coronary-paths.json` derivano da **Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0**, a sua volta derivato da **BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan**.

- Fonte: https://github.com/Z-Anatomy/Models-of-human-anatomy
- Revisione: `2b652413b1116c9119e616eabc1e63af3cc6267d`.
- Archivio: `Z-Anatomy.zip`, file `Z-Anatomy/Startup.blend`.
- Licenza del modello adattato e delle curve derivate: https://creativecommons.org/licenses/by-sa/4.0/
- Licenza BodyParts3D: https://creativecommons.org/licenses/by-sa/2.1/jp/
- Fonte originale: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Avviso della fonte riportato integralmente in `SOURCE-LICENSE.txt`.

Autori accreditati dalla fonte: Kousaku Okubo (BodyParts3D), Gauthier Kervyn (anatomia e modello), Marcin Zielinski (strumenti Blender), Lluis Vinent (applicazione Unity). L’estrazione non include rene, orecchio interno o altre strutture con attribuzioni diverse nel documento originale.

## Modifiche

Estrazione di cuore, arterie coronarie, vene cardiache selezionate e grandi vasi. Escluse annotazioni, oggetti senza facce e la struttura venosa chiamata `????????`. Curve convertite in mesh a risoluzione ridotta; 41 curve coronariche campionate separatamente. Parte inferiore della cava inferiore rifilata per mantenere il campo cardiaco. Coordinate traslate e scalate uniformemente; conversione da Z verticale a Y verticale, senza specchiatura. Materiali originali rimossi; nomi conservati in `extras.sourceName`. Nessuno script incorporato nel file Blender è stato eseguito.

Il modello contiene **39 oggetti**, 93.967 vertici prima dell’esportazione, 3.817.708 byte, nessuna texture esterna, nessuna animazione precalcolata. `heart-parts.json` conserva inventario e provenienza. Le aggiunte geometriche di questo laboratorio e l’adattamento delle superfici sono rilasciati sotto CC BY-SA 4.0 con le attribuzioni sopra riportate.

Inventario originale: quattro camere, sei oggetti arteriosi coronarici, cinque oggetti venosi cardiaci, undici grandi vasi, nove lembi valvolari e quattro muscoli papillari. I grandi vasi comprendono aorta ascendente e arco, tronco e due arterie polmonari, due cave e quattro vene polmonari.

## Ricostruzioni e limiti

La fonte non contiene i lembi anteriori mitralico e tricuspidale; i nove lembi statici sono conservati nel file ma sostituiti nella scena da undici lembi procedurali animati, quattro anelli e quindici corde illustrative. Le forme, gli ancoraggi e le deformazioni devono essere revisionati anatomicamente. Non costituiscono un apparato valvolare validato; anche l’inventario dei papillari della fonte è incompleto.

La collezione di conduzione della fonte è vuota. Nodi, His, branche, Bachmann e dodici rami di Purkinje sono ricostruzioni indicative. Lo stesso vale per Botallo e i cinque marcatori di apice, setti, fossa ovale ed endocardio. I marcatori nominano punti, non superfici segmentate di quelle strutture.

La revisione v44 offre 125 strutture selezionabili, fra oggetti derivati dalla fonte, ricostruzioni e riferimenti. Questo numero non misura la completezza anatomica. Non comprende ogni vaso, strato, variante o struttura microscopica del cuore.

Contrazione, torsione, restringimenti coronarici e colori tissutali sono visualizzazioni qualitative. Le sezioni non generano superfici di taglio chiuse. Non esiste ancora un allineamento validato ai 17 segmenti cardiaci, ai dispositivi dell’app o ai territori perfusionali. Non sono simulati pressioni, stress meccanici, flussi fisici, rigurgiti o accoppiamento tissutale-elettrofisiologico completo.

La schermata fetale usa le quattro camere adulte come riferimento trasparente; organi e vasi sono disposti convenzionalmente. Il modello di rete conserva i flussi ma non simula streaming preferenziale, pressioni, crescita, anatomia neonatale specifica o cardiopatie congenite complesse.

## Riferimenti fisiologici

I riferimenti orientano topologia e fasi; non validano il simulatore né forniscono i valori numerici dei suoi preset.

- Ciclo cardiaco: https://openstax.org/books/anatomy-and-physiology/pages/19-3-cardiac-cycle
- Circolazione fetale: https://openstax.org/books/anatomy-and-physiology-2e/pages/20-6-development-of-blood-vessels-and-fetal-circulation
- Percorsi sistemici e portali: https://openstax.org/books/anatomy-and-physiology-2e/pages/20-5-circulatory-pathways
- Dotto arterioso pervio: https://www.msdmanuals.com/professional/pediatrics/congenital-cardiovascular-anomalies/patent-ductus-arteriosus-pda

## Integrazione nell’app — 23 settembre 2026

Il GLB è identico al file approvato. `atlas-geometry.js` aggiunge una parete di raccordo tra il margine distale del tronco e i margini prossimali delle due arterie polmonari. La superficie ha tre aperture, non tappa il lume, e conserva i margini originali. Forma interpolata, da revisionare anatomicamente; non proviene dalla segmentazione sorgente.

`atlas-coronary-map.json` deriva dalle curve e dalle superfici sopra citate, con la stessa licenza CC BY-SA 4.0. Lo strumento `tools/build-atlas-map.cjs` rende riproducibile la mappatura per la sezione Coronarie. Le superfici originali sono suddivise per la sola colorazione; i rami minuti sono attribuiti per prossimità ai percorsi. Ramo del nodo del seno, ramo del nodo AV, PDA, ramo intermedio e due settali posteriori hanno percorsi ricostruiti e indicativi. La fonte non identifica singolarmente ogni ramo del laboratorio clinico preesistente. Non è una mappatura anatomica o perfusionale validata.

Il ventricolo sinistro è ripartito geometricamente in 17 territori per mantenere i controlli esistenti. Nomi e orientamento seguono il modello AHA; asse, confini e corrispondenze arteriose sono approssimazioni di visualizzazione. Fonte primaria: [AHA, Standardized Myocardial Segmentation, 2002](https://www.ahajournals.org/doi/pdf/10.1161/hc0402.102975?download=true). Le arterie di irrorazione variano fra individui. Non sono state modificate le spiegazioni cliniche e le corrispondenze preesistenti dell’app.


## Raccordi e ricostruzioni anatomiche — revisione v44

`anatomy-refinements.js` sostituisce in memoria le superfici di aorta ascendente/arco e dei tratti polmonari, aggiunge aorta discendente e tre tronchi epiaortici. Gli osti atriali polmonari vengono levigati localmente e aperti; le vene condividono gli stessi vertici sul bordo. Il Botallo si raccorda alle superfici dell’istmo aortico e della polmonare sinistra prossimale. Sono correzioni di visualizzazione, con unità dell’atlante non calibrate clinicamente. Il GLB originale resta identico.

Le cuspidi semilunari sono ricostruzioni a tasca con inserzioni festonate, lunule e noduli illustrativi. `congenital-morphology.js` aggiunge sette morfologie semplificate reversibili, senza simulazione emodinamica. Le geometrie derivate seguono la licenza CC BY-SA 4.0 e le attribuzioni sopra riportate. Limiti e fonti anatomiche: `../reports/2026-09-23-raccordi-anatomici-v44.md`.
