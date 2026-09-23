# Cuore anatomico: fonte e adattamenti

Il file `heart-z-anatomy.glb` è un adattamento di **Z-Anatomy — The libre 3D atlas of anatomy — CC BY-SA 4.0**, a sua volta derivato da **BodyParts3D — The Database Center for Life Science — CC BY-SA 2.1 Japan**.

- Fonte: https://github.com/Z-Anatomy/Models-of-human-anatomy
- Revisione verificata: `2b652413b1116c9119e616eabc1e63af3cc6267d`.
- Archivio: `Z-Anatomy.zip`, file `Z-Anatomy/Startup.blend`.
- Licenza dell’adattamento del modello: https://creativecommons.org/licenses/by-sa/4.0/
- Licenza BodyParts3D: https://creativecommons.org/licenses/by-sa/2.1/jp/
- Fonte originale: https://dbarchive.biosciencedbc.jp/en/bodyparts3d/download.html
- Avviso della fonte riportato integralmente in `SOURCE-LICENSE.txt`.

Autori accreditati dalla fonte: Kousaku Okubo (BodyParts3D), Gauthier Kervyn (anatomia e modello), Marcin Zielinski (strumenti Blender), Lluis Vinent (applicazione Unity). I dati non includono rene, orecchio interno o altre strutture che nel file di licenza hanno attribuzioni diverse.

## Trasformazioni effettuate per Isoelettrica

Estrazione delle geometrie di cuore, arterie coronarie, vene cardiache selezionate, aorta ascendente, arco aortico, tronco polmonare e vena cava superiore. Escluse annotazioni, oggetti senza facce e la struttura venosa chiamata `????????`. Curve convertite in mesh con risoluzione ridotta. Coordinate traslate e scalate in modo uniforme; conversione da Z verticale a Y verticale, senza specchiatura. Rimosse le definizioni di materiali originali e conservati i nomi in `extras.sourceName`. Materiali e colori sono assegnati dal visualizzatore. Nessuno script incluso nel file Blender è stato eseguito.

32 strutture, circa 3,7 MB, senza texture esterne, senza rig o animazioni precalcolate. Il manifest `heart-parts.json` conserva la provenienza e l’inventario. La deformazione nel visualizzatore è un’aggiunta illustrativa di Isoelettrica. Il modello adattato è distribuito sotto CC BY-SA 4.0.

## Limiti verificati nel file, non dedotti dai nomi delle collezioni

- Quattro camere, sei oggetti arteriosi coronarici, cinque oggetti venosi, quattro grandi vasi, nove lembi valvolari, quattro muscoli papillari.
- Nella collezione `Heart` mancano il lembo anteriore mitralico e quello anteriore tricuspidale. Le geometrie esistenti non compongono un apparato valvolare completo e restano statiche nell’anteprima.
- La collezione `Conducting system of heart` e le sue sottocollezioni sono vuote. La conduzione dorata aggiunta è schematica, con punti di riferimento indicativi: non è una segmentazione anatomica della fonte e richiede revisione.
- Il movimento delle pareti è illustrativo, guidato dagli eventi atriali e ventricolari dello stesso motore ECG dell’app. La FV ha un tremolio senza contrazione organizzata; l’asistolia nessun movimento.
- La sezione rimuove una porzione delle pareti senza ricostruire la superficie di taglio.
- Il modello non è stato allineato ai 17 segmenti del laboratorio Coronarie né a tutti i percorsi e dispositivi del Tracciato. Il prototipo non sostituisce questi laboratori.
- Non sono inclusi un albero completo di Purkinje, validazione clinica del modello, deformazione meccanica fisica o simulazione del flusso ematico.
