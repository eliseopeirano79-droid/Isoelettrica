# PROMPT 8 — Flusso sanguigno e resa grafica: l'app del futuro

Vale il brief permanente (`AGENTS.md`). Richiede i Prompt 2 e 3 completati.

## Obiettivo

FlowLayer con particelle guidate da HemoModel e una resa che faccia sembrare il cuore vivo, mantenendo l'identità visiva attuale (fondo scuro, tipografia editoriale) e i 60 fps su iPad.

## Flusso

- Particelle istanziate su GPU (budget adattivo 20–50k), avvezione lagrangiana lungo linee di flusso precalcolate per camera e vaso, velocità istantanea proporzionale a flusso/area da HemoModel, per ogni fase.
- Colore per saturazione con scala continua 40→100% (dal rosso scuro-violaceo al rosso vivo, con legenda; opzione "colori didattici" blu/rosso dichiarata come convenzione, non come realtà); saturazione trasportata dalle particelle e mescolata alle confluenze e negli shunt con media pesata sui flussi.
- Direzione degli shunt dal gradiente istantaneo; getti di rigurgito con forma corretta (eccentrico in direzione opposta al lembo prolassante, centrale nel rigurgito funzionale), getti stenotici con turbolenza post-stenotica (vorticità), anello vorticoso fisiologico all'ingresso mitralico, lavaggio apicale del VS, stasi in auricola sinistra durante la fibrillazione.
- Flusso coronarico dai seni di Valsalva, prevalentemente diastolico a sinistra e più continuo a destra, lungo le epicardiche fino a un lavaggio sottile del miocardio, poi vene → seno coronarico → atrio destro; ritorno venoso modulato dal respiro.

## Resa

- Materiali PBR con approssimazione di scattering sottosuperficiale per il miocardio, specularità umida, grasso epicardico lungo i solchi, trabecolatura endocardica con normal map, lembi semitrasparenti con tessitura fibrosa, corde come cilindri sottili, coronarie con raggio pulsatile.
- Sangue nelle camere come fluido traslucido in screen-space più particelle.
- Illuminazione HDRI a tre punti; post-processing leggero (bloom solo sull'impulso elettrico, SSAO); niente profondità di campo su iPad.
- Quattro modalità di camera: **Anatomica** (orbita libera con i preset esistenti), **Chirurgica** (viste di approccio reali: mitrale attraverso il solco interatriale, tricuspide dall'atriotomia, aortica dall'aortotomia), **Eco** (piani parasternale asse lungo, asse corto basale/medio/apicale, apicale 4-2-3 camere, sottocostale, soprasternale: piano di taglio con superfici chiuse e shader "eco" opzionale in scala di grigi con speckle e settore), **Elettrofisiologica** (miocardio traslucido, sistema di conduzione, mappe LAT e di voltaggio, cateteri e lesioni di ablazione).
- Piani di taglio con sezioni chiuse ed endocardio visibile, vista esplosa, modalità fantasma/raggi X; scala LAT accessibile ai daltonici.

## Tempo

Timeline globale con marcatori dei battiti, velocità da 1/16× a 2×, passo a frame, loop di un ciclo, cursore comune che attraversa tracciato DII, curve di Wiggers e 3D.

## Accettazione

- Mai sotto 45 fps su iPad Pro con 30k particelle e tutte le mappe attive, con LOD che scala.
- Saturazioni corrette in Fallot, TGA, dotto, Eisenmenger.
- Getti temporizzati alla fase giusta (rigurgito mitralico in sistole, aortico in diastole, dotto continuo).
- Ogni preset di camera riproduce il piano ecocardiografico dichiarato.
