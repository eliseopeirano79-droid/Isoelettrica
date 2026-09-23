# Isoelettrica v44.0 — conduzione, visibilità e Patologia

## Esito e ambito

La richiesta del 23 settembre corregge il cuore già approvato senza sostituire il GLB né il motore ECG. La v43 resta la versione pubblicata; questa proposta prepara v44.0 su `feat/conduzione-patologia-v44`. I prompt avanzati del kit restano aperti.

## Comportamento

- Il grafo elettrico di Tracciato e Anatomia usa le stesse coordinate dell’atlante. His attraversa il riferimento settale, poi branche e rete subendocardica illustrativa. Percorsi e impulsi seguono la deformazione del cuore; nessuna segmentazione istologica viene dichiarata.
- Vie rapida e lenta del NAV distinte; AVNRT lenta-rapida, AVRT ortodromica e antidromica con verso diverso, collegamenti atriale e miocardico ventricolare del circuito. BAV III separa impulsi atriali e scappamenti; branche bloccate rosse, senza falsa attivazione dei rami distali; propagazione ritardata illustrativa.
- Kent selezionabile in 10 sedi periannulari, nei Parametri e in Patologia. La posizione attraversa il passaggio Anatomia → Tracciati. Per WPW, AVRT antidromica e FA preeccitata le sedi non predefinite variano qualitativamente il vettore iniziale della delta tramite l’API QRS esistente. Il preset originale sinistro resta identico; AVRT ortodromica mantiene QRS stretto.
- James è un’ipotesi atrionodale selezionabile nel caso LGL, non la diagnosi automatica di ogni PR corto; nessuna delta aggiunta.
- Patologia contiene **172 voci**, non 172 malformazioni ricostruite: 101 casi ECG esistenti, 8 dimostrazioni valvolari, 1 dotto pervio configurabile, 62 localizzazioni sul cuore di riferimento. Ricerca, famiglie, parametri numerici/cursori, collegamento ai tracciati e ripristino reversibile.
- Le anteprime valvolari limitano apertura/coaptazione dei lembi esistenti. L’anteprima clinica conserva la configurazione precedente e non la sovrascrive nel salvataggio locale. Il ripristino la recupera.
- Il tema chiaro usa fondo bianco nelle viste 3D e nei laboratori adulto/fetale; il cambio di tema si propaga senza ricaricare. Corretti contrasti di testi, comandi e tracciato nel laboratorio.
- Coronarie: opacità 0–100% di pareti, valvole e grandi vasi, con opzione per rendere visibili anche i rami nascosti. Le arterie, comprese le ricostruzioni, mantengono la propria opacità e i controlli delle occlusioni.
- Il raccordo del tronco polmonare manteneva i margini ma si restringeva per lo smoothing. Ora conserva due punti opposti del lume e usa smoothing senza contrazione progressiva. Restano tre aperture e una parete manifold; non è una stenosi anatomica normale.
- Riuso dei percorsi e rilascio delle geometrie sostituite al cambio di Kent; conservata sospensione dei laboratori nascosti. Nessuna promessa misurata di 60 fps o di prestazioni iPad.

## Verifiche

`npm test`: validatori ECG/ST/audit, **114 test Node e 5 Python superati**. Copertura aggiuntiva: tutti i casi ECG producono piani finiti senza mutare il motore; His associato al proprio QRS, BAV III, blocchi fascicolari, direzioni di rientro, sedi Kent/default, James senza delta, riuso geometrie, catalogo, RR meccanico, assenza di sistole atriale organizzata in FA/flutter, selettore reale dei Parametri, lume polmonare, trasparenza coronarica, nuovi asset in cache.

Hash invariati di motore, dati clinici, quiz, atlanti e GLB originale, confrontati con STATO. Nessuna dipendenza aggiunta. Cache aggiornata a 44.0.

Controllo nel browser dell’anteprima: AVNRT/AVRT e cambio Kent, passaggio della sede ai Tracciati, correzione dei colori, trasparenza coronarica, valvole, Botallo 4→8/9 mm e ritorno a 4, tema scuro/chiaro con laboratori, layout a 390 px e controlli accessibili. Nessun errore JavaScript/WebGL rilevato. Non eseguito un collaudo su iPad fisico.

## Limiti ancora aperti

Il catalogo **non è esaustivo** di tutte le anomalie, varianti e combinazioni. Le 62 schede di localizzazione non mostrano una malformazione ricostruita: lo dichiarano in vista. Mancano ancora geometrie congenite specifiche, deformazioni delle camere per cardiomiopatie, pressione/volume e gradienti, simulazione completa del tessuto eccitabile e dei rientri da cicatrice. Nei casi senza meccanismo anatomico specifico si mostrano gli eventi ECG disponibili.

Il grafo è una registrazione anatomica indicativa, non LAT/APD, modello cellulare o validazione Durrer. Le frazioni temporali dei percorsi interpolano gli eventi del motore; non sono velocità cliniche. La sede Kent non è un algoritmo diagnostico validato a 12 derivazioni. La geometria originale conserva la sua risoluzione e alcune giunzioni grossolane. Il laboratorio sinusale mantiene il precedente legame fra fasi meccaniche e frequenza; l’anteprima dei casi clinici preserva invece il ritmo del preset. Non è una revisione indipendente di un cardiologo.

## Riferimenti utilizzati

- [Li et al., ricostruzione tridimensionale del nodo AV, 2008](https://pmc.ncbi.nlm.nih.gov/articles/PMC2650269/): riferimento per gli ingressi nodali. I punti inseriti nell’atlante non derivano da una registrazione istologica di quel dataset.
- [ESC, vie accessorie: sedi e circuiti](https://www.escardio.org/communities/councils/cardiology-practice/scientific-documents-and-publications/ejournal/volume-21/ablation-of-accessory-pathways-indications-and-contraindications/): orientamento anatomico e distinzione ortodromica/antidromica; non validazione delle morfologie sintetiche nuove.
- [Caso elettrofisiologico su LGL/James, 2018](https://pubmed.ncbi.nlm.nih.gov/29550833/): distinguere ipotesi di via atrionodale e conduzione nodale accelerata.
- [CDC, principali difetti cardiaci congeniti](https://www.cdc.gov/heart-defects/about/specific-heart-defects.html), [ESC cardiomiopatie](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/cardiomyopathy/), [ESC valvulopatie 2025](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/valvular-heart-disease/), [ESC miocardite/pericardite 2025](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/myocarditis-and-pericarditis/): riferimenti delle famiglie del catalogo, non prova di completezza o validazione di ciascuna geometria.

Non introdotti valori clinici di pressione, saturazione, portata, ERP o velocità di conduzione. Le coordinate, gli spessori grafici e le quote dei tempi sono convenzioni della visualizzazione.

## Verifica visiva rapida

1. Anatomia → Patologia → cercare “rientro”: AVNRT, poi AVRT ortodromica; premere “Ingrandisci il circuito”, rallentare a ¼× e osservare i versi.
2. In AVRT selezionare Kent laterale destro e aprire il caso nei Tracciati: Parametri conserva la sede. Per la delta scegliere WPW.
3. Coronarie → Opacità 15–20% → “Mostra anche le coronarie nascoste”; cambiare tema.
4. Patologia → Valvulopatie oppure Botallo; modificare un valore e usare “Ritorna al cuore di riferimento”.
