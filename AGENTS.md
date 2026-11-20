# Isoelettrica — istruzioni di progetto

La richiesta dell’utente del 23 settembre 2026 integra il laboratorio nell’app: cuore anatomico sotto gli ECG e in Coronarie, nuova Anatomia, vecchia Anatomia rinominata Fisiologia, grafica uniformata. Questa istruzione sostituisce i limiti «solo prototipo», «struttura pagine invariata» e «app online invariata» del brief originale. Nessuna autorizzazione implicita a modificare il motore ECG o i contenuti clinici esistenti.

Conservare il modello e la grafica approvati. Il GLB originale comprende 39 strutture, non 32; attribuzione Z-Anatomy CC BY-SA 4.0 / BodyParts3D DBCLS CC BY-SA 2.1 JP. Le ricostruzioni didattiche sono aggiunte separate.

Leggere `STATO.md`, `sviluppo/BRIEF-ORIGINALE.md`, il prompt corrente in `sviluppo/prompts/` e `sviluppo/modelli/COSTANTI_CLINICHE.md` prima di lavorare. Una sessione affronta un solo prompt; i criteri non verificati restano aperti. Aggiornare lo stato e un report in `reports/`. I nove prompt costituiscono una sequenza, non funzionalità già disponibili.

Nuove funzionalità in moduli separati, stack Three.js/WebGL esistente, niente refactor collaterali. CardiacClock legge gli eventi ECG senza modificarli. Preservare motore, dati clinici, quiz e geometria sorgente; verificare gli hash registrati. Numeri clinici nuovi solo con fonte verificabile. Dichiarare ogni approssimazione, struttura assente e verifica non eseguita. Non presentare una revisione automatica come certificazione di un cardiologo.

Parlare in italiano. Non chiedere conferme per lavoro già autorizzato. Chiudere con risultato, limiti e verifica visiva semplice. Non delegare ad altri agenti salvo richiesta esplicita dell’utente.

La successiva richiesta del 23 settembre autorizza inoltre correzione dell’allineamento della conduzione, vie accessorie e rientri, selezione della sede di Kent, catalogo Patologia, tema chiaro e trasparenza coronarica. Questa richiesta prevale sull’ordine di un solo prompt del kit per tali interventi. Le nuove morfologie passano come dati tramite l’API ECG esistente; engine.js e data.js restano invariati. Un catalogo non equivale alla simulazione completa di tutte le anomalie: dichiarare per ogni voce se offre ECG, animazione o sola localizzazione.

La richiesta successiva «animazione coerente di tutte le strutture; aggiungi fisica» autorizza la correzione degli attacchi e una meccanica elastica ridotta condivisa. Distinguere la risposta numerica e i vincoli geometrici da un HemoModel, da valvole guidate da pressione e da una simulazione biomeccanica validata; non dichiarare conclusi i relativi prompt del kit.

Le richieste successive autorizzano raccordi venosi e del Botallo, ricostruzione dell’arco con i tre tronchi epiaortici, cuspidi semilunari, vie atriali nominate e prime morfologie congenite. In Fisiologia sostituire soltanto il livello anatomico opzionale: conservare cuore di riferimento, assi, vettori e tracciati. Conservare la grafica approvata, correggendo sovrapposizioni e accessibilità dei controlli. Le ricostruzioni restano illustrative e devono avere copertura e limiti espliciti.

La richiesta successiva autorizza impaginazione adattiva di Teoria, correzione del tema a schermo intero, ingrandimento del cuore a tutto schermo e controlli uniformi tra Anatomia e Fisiologia con menu ispirati ad Apple. Si tratta di interfaccia: testi clinici, geometrie, motore ECG e cuore di riferimento restano invariati.

La richiesta del 19 novembre 2026 autorizza a procedere autonomamente nelle fasi del laboratorio Eco, con controlli visivi e senza un nuovo consenso per ogni fase. Supera il requisito di approvazione intermedia del brief e del piano F1. Conservare PR separate e stati di avanzamento veritieri; nessuna autorizzazione al merge su main o alla pubblicazione.

EchoSuite (https://echosuite.app) è il riferimento di copertura funzionale, da analizzare con prove effettive e da migliorare con implementazioni originali. Conservare la sonda 3D già presente come percorso principale. Un localizzatore 2D è soltanto una riserva quando WebGL non è disponibile; non sostituisce né riduce il 3D. Distinguere funzionalità provate, documentate e ancora da verificare. Il report `reports/2026-11-19-echosuite-confronto.md` e l'inventario in `reports/eco-audit/` descrivono la copertura osservata, non certificano algoritmi clinici o il laboratorio 3D non eseguito.

La segnalazione visiva successiva del 19 novembre richiede di dare priorità alla correttezza delle sezioni e dell'acquisizione. Non considerare risolti difetti anatomici migliorando la sola tessitura. La rimozione dei raccordi artificiali è verificata, ma i rilievi ancora visibili sono elencati in `reports/2026-11-19-eco-contorni-e-webgl.md`. Conservare la distinzione tra collaudo Canvas effettivamente eseguito e collaudo 3D bloccato dal browser.
