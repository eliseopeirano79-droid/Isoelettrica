# Isoelettrica — istruzioni di progetto

La richiesta dell’utente del 23 settembre 2026 integra il laboratorio nell’app: cuore anatomico sotto gli ECG e in Coronarie, nuova Anatomia, vecchia Anatomia rinominata Fisiologia, grafica uniformata. Questa istruzione sostituisce i limiti «solo prototipo», «struttura pagine invariata» e «app online invariata» del brief originale. Nessuna autorizzazione implicita a modificare il motore ECG o i contenuti clinici esistenti.

Conservare il modello e la grafica approvati. Il GLB originale comprende 39 strutture, non 32; attribuzione Z-Anatomy CC BY-SA 4.0 / BodyParts3D DBCLS CC BY-SA 2.1 JP. Le ricostruzioni didattiche sono aggiunte separate.

Leggere `STATO.md`, `sviluppo/BRIEF-ORIGINALE.md`, il prompt corrente in `sviluppo/prompts/` e `sviluppo/modelli/COSTANTI_CLINICHE.md` prima di lavorare. Una sessione affronta un solo prompt; i criteri non verificati restano aperti. Aggiornare lo stato e un report in `reports/`. I nove prompt costituiscono una sequenza, non funzionalità già disponibili.

Nuove funzionalità in moduli separati, stack Three.js/WebGL esistente, niente refactor collaterali. CardiacClock legge gli eventi ECG senza modificarli. Preservare motore, dati clinici, quiz e geometria sorgente; verificare gli hash registrati. Numeri clinici nuovi solo con fonte verificabile. Dichiarare ogni approssimazione, struttura assente e verifica non eseguita. Non presentare una revisione automatica come certificazione di un cardiologo.

Parlare in italiano. Non chiedere conferme per lavoro già autorizzato. Chiudere con risultato, limiti e verifica visiva semplice. Non delegare ad altri agenti salvo richiesta esplicita dell’utente.

La successiva richiesta del 23 settembre autorizza inoltre correzione dell’allineamento della conduzione, vie accessorie e rientri, selezione della sede di Kent, catalogo Patologia, tema chiaro e trasparenza coronarica. Questa richiesta prevale sull’ordine di un solo prompt del kit per tali interventi. Le nuove morfologie passano come dati tramite l’API ECG esistente; engine.js e data.js restano invariati. Un catalogo non equivale alla simulazione completa di tutte le anomalie: dichiarare per ogni voce se offre ECG, animazione o sola localizzazione.

La richiesta successiva «animazione coerente di tutte le strutture; aggiungi fisica» autorizza la correzione degli attacchi e una meccanica elastica ridotta condivisa. Distinguere la risposta numerica e i vincoli geometrici da un HemoModel, da valvole guidate da pressione e da una simulazione biomeccanica validata; non dichiarare conclusi i relativi prompt del kit.

Le richieste successive autorizzano raccordi venosi e del Botallo, ricostruzione dell’arco con i tre tronchi epiaortici, cuspidi semilunari, vie atriali nominate e prime morfologie congenite. In Fisiologia sostituire soltanto il livello anatomico opzionale: conservare cuore di riferimento, assi, vettori e tracciati. Conservare la grafica approvata, correggendo sovrapposizioni e accessibilità dei controlli. Le ricostruzioni restano illustrative e devono avere copertura e limiti espliciti.
