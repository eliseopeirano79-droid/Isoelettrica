# PROMPT 10 — Revisione del cardiologo puntiglioso (dopo ogni sessione)

Vale il brief permanente (`AGENTS.md`). Si esegue al termine di ogni altro prompt, prima di dichiararlo completato in `STATO.md`.

Agisci come revisore clinico e tecnico indipendente. Non aggiungere funzioni: verifica, documenta, correggi solo incoerenze.

1. **Invarianti**: hash dei file del motore ECG identico a `STATO.md`; app online intatta; nessuna dipendenza nuova non motivata; attribuzioni presenti; geometria base invariata.
2. **Coerenza tra moduli**: ogni ritmo, patologia e struttura usa gli id del dizionario; per ogni scenario l'ordine è ECG del motore → attivazione → meccanica → emodinamica → valvole → flusso → suoni, e nessun livello contraddice il precedente (nessuna contrazione atriale coordinata in fibrillazione, nessuna apertura aortica in fibrillazione ventricolare, rigurgito mitralico solo in sistole, flusso del dotto continuo, PR lungo → rigurgito diastolico).
3. **Numeri**: test automatici su HemoModel (gittata, GC, FE, ordine degli eventi valvolari, diastasi nulla a 150 bpm, Frank-Starling, Qp/Qs negli shunt, saturazioni fetali) e su ActivationModel (durata P, sequenza di Durrer, tempi di conduzione per segmento); ogni valore nel codice ha la sua riga in `COSTANTI_CLINICHE.md`.
4. **Completezza**: rigenera "Cosa è completo e cosa manca" (nel prototipo e in `STATO.md`) e il report di nomenclatura (geometria / hotspot / solo scheda / mancante).
5. **Prestazioni**: profilo su iPad con lo scenario più pesante (fibrillazione ventricolare + particelle + mappe); LOD attivo; nessun frame > 33 ms.
6. **Consegna**: ogni discrepanza con gravità (clinica, visiva, tecnica), correzione applicata o motivo per non farla, e la procedura di verifica a occhio in 30 secondi; esito riportato nella sezione 11 del report di sessione.
