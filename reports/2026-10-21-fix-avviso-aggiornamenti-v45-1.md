# Isoelettrica v45.1 — avviso di aggiornamento PWA

Data: 21 ottobre 2026. Ambito: esclusivamente il popup di aggiornamento, senza cambiamenti al motore ECG, ai contenuti didattici o all'interfaccia.

## Problema osservato
Il messaggio «È pronta una versione aggiornata di Isoelettrica» poteva ricomparire dopo «Più tardi». L'interfaccia mostrava l'avviso ogni volta che rilevava un service worker \`waiting\` o appena \`installed\`, senza confrontare la sua versione con quella del codice caricato. La scelta «Più tardi» eliminava il nodo HTML, ma non registrava il rinvio. I controlli su focus/visibilità sono limitati a intervalli minimi di 20 s: ripetuti eventi di aggiornamento potevano così riproporre l'avviso.

## Correzione
- Legge la versione del file \`app.js?v=\` effettivamente caricato.
- Chiede al worker in attesa la versione con il messaggio \`version\` già previsto da \`sw.js\`, tramite \`MessageChannel\` e timeout. Annuncia soltanto una versione numericamente superiore.
- Memorizza in \`sessionStorage\` la versione rimandata, più un riferimento in memoria al worker, senza inibire avvisi per versioni successive. Il controllo manuale sulla firma mantiene la possibilità di riproporre una release rimandata.
- Mantiene \`skipWaiting\` per l'aggiornamento effettivo, \`controllerchange\` per il reload e la possibilità di funzionare con worker legacy che non rispondono al messaggio \`version\`.
- Incrementa da 45.0 a 45.1 la versione del service worker e dei riferimenti agli asset nelle pagine HTML, così anche le installazioni offline ricevono il file aggiornato da una cache coerente.

## Regressioni
Aggiunto \`tests/update-banner.test.cjs\` con casi: stessa versione (nessun banner), versione precedente (nessun banner), versione successiva (banner), «Più tardi» (nessun riavviso per la stessa versione), rilascio ulteriore (nuovo banner), comando di aggiornamento e controllo manuale.

**Verifiche:** test da eseguire nella pipeline GitHub Actions con \`npm test\`. Non è stata effettuata una prova visiva sull'installazione Safari/iPad. Nessuna modifica ai valori clinici né alle geometrie o alle animazioni del cuore.
