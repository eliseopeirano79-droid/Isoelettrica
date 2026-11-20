# Eco: robustezza delle intersezioni e stato delle immagini

Ramo `feat/eco-bmode-f1`, aggiornamento della PR #15. Questo intervento non completa F1 o F2 e non risolve i difetti di forma già segnalati nelle viste standard.

## Correzione

La routine di taglio registrava al massimo due vicini per ogni punto e percorreva i vertici anziché gli archi. Un bordo condiviso da tre facce perdeva un ramo; facce duplicate potevano cancellare un segmento; una superficie esattamente sul piano veniva ignorata. Tre test sintetici riproducono i guasti prima della modifica.

Ora ogni segmento è registrato una volta e percorso una volta. Le catene si interrompono nei nodi ramificati; un anello viene dichiarato chiuso soltanto se torna all'inizio lungo un arco effettivo. I vertici esattamente sul piano condividono la stessa identità. Le facce coplanari contribuiscono col perimetro, senza diagonali interne. Piani nulli o non finiti vengono rifiutati.

Non vengono riempiti buchi anatomici né inventate pareti: questa è una correzione geometrica dei casi limite, non una ricostruzione di camere o valvole. Sonda 3D, gesti e geometria sorgente restano preservati.

## Verifica

- Cinque nuovi test: nodo a tre rami, duplicati, vertice sul piano, faccia coplanare e piano degenere. I tre casi principali fallivano prima della correzione.
- Suite completa: 219 test Node + 5 Python superati. Log: `2026-11-20-eco-taglio-npm-test.txt`.
- Audit indipendente dei triangoli sulle nove viste: 19.004 segmenti attesi e prodotti; nessuna aggiunta o mancanza oltre la tolleranza numerica. Otto confronti richiedono la tolleranza di una cella, `1e-4` unità del modello per coordinata, per la conversione Float64/Float32. Le facce coplanari hanno il test sintetico dedicato. Strumento ripetibile: `node tools/audit-eco-taglio.cjs`; dettagli in `eco-audit/taglio-2026-11-20/audit-taglio.json`.
- Il confronto con la routine precedente sui nove piani standard dà gli stessi conteggi: i nuovi casi limite non spiegano i principali difetti anatomici osservati in quei preset. Il test geometrico non è una validazione ecocardiografica.
- Nuova serie acquisita nel browser e ispezionata: nove viste normali in telediastole e telesistole, motore classico. Immagini, indice e tre tavole in `eco-audit/taglio-2026-11-20/`.

## Risultato visivo e limiti aperti

Le viste continuano a mostrare i limiti già censiti: geometria del VD, PSAX mitrale obliqua, strutture aggiuntive nelle apicali e ricostruzione incompleta di pareti e valvole. Non si dichiara un miglioramento generale dell'immagine da questo intervento. Servono ancora la revisione anatomica e quella dei piani di acquisizione, oltre al motore volumetrico previsto dal piano F1.

Il nuovo browser è stato provato direttamente su EchoSuite: il Probe Lab fallisce ancora con `Error creating WebGL context`. Le schermate Isoelettrica sono quindi prove del B-mode Canvas, non di rendering o trascinamento 3D. Il localizzatore 2D resta una riserva condizionata: nessuna sostituzione della sonda 3D originale.

Per una verifica rapida: aprire Eco, scegliere A4C, poi Telediastole e Telesistole; ripetere su PSAX mitrale e papillari. Confrontare le quattro camere, i rapporti delle cavità e i limiti illustrati nelle tavole, senza assumere che un test passato renda la vista clinicamente corretta.
