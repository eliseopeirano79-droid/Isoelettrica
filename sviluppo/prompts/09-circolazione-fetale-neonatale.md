# PROMPT 9 — Circolazione fetale e transizione neonatale (schermata separata)

Vale il brief permanente (`AGENTS.md`). Richiede i Prompt 2, 4 e 8 completati.

## Obiettivo

Raccordare la schermata fetale già avviata con tutta l'architettura (nomenclatura, HemoModel, FlowLayer, preset ECG) senza contaminare la fisiologia adulta.

## Anatomia e nomi

Placenta, vena ombelicale (unica), dotto venoso (Aranzio; ~30–50% del sangue salta il fegato), cava inferiore, valvola di Eustachio che indirizza al forame ovale, atrio sinistro, ventricolo sinistro, aorta ascendente verso coronarie e cervello; cava superiore → atrio destro → ventricolo destro → arteria polmonare → dotto arterioso (Botallo; la maggior parte dell'uscita del VD: 60–90% secondo la fonte, dichiararla) → aorta discendente → arterie ombelicali (due) → placenta. Residui dell'adulto già nel dizionario: legamento venoso, legamento arterioso, fossa ovale, legamento rotondo del fegato, legamenti ombelicali mediali.

## Emodinamica

Circuiti in parallelo; pressione polmonare ≈ sistemica per RVP alte; VD dominante (55–60% della gittata combinata, ~450 mL/kg/min); frequenza 110–160; saturazioni: vena ombelicale 80–85%, cava inferiore mista ~70, atrio sinistro e aorta ascendente ~65, VD e polmonare ~55, aorta discendente ~60. Parametri modificabili: RVP, RVS, conduttanze di dotto venoso, forame ovale e dotto arterioso, resistenza placentare, età gestazionale.

## Transizione alla nascita (animazione parametrica continua)

Primi respiri → RVP in caduta e flusso polmonare in salita → pressione atriale sinistra sopra la destra → chiusura funzionale del forame ovale; ossigeno in salita e prostaglandine in calo → costrizione del dotto arterioso (funzionale in 10–15 h, fino a 72 h; anatomica in 2–3 settimane); clampaggio del cordone → RVS in salita; chiusura del dotto venoso in giorni.

Scenari: dotto pervio del pretermine, forame ovale pervio, ipertensione polmonare persistente del neonato; lesioni dotto-dipendenti sistemiche (cuore sinistro ipoplasico, coartazione critica, interruzione dell'arco) e polmonari (atresia polmonare, stenosi polmonare critica, TGA per il mescolamento) con scenario "prostaglandina E1 mantiene il dotto aperto".

## Preset ECG neonatale (dati del motore, in sola lettura)

120–160 bpm, asse +60/+180, dominanza destra (R alta in V1, S profonda in V6), T negativa in V1 dal 7° giorno fino a ~8 anni, PR e QRS brevi. Il cuore fetale non batte mai con un tracciato adulto.

## Accettazione

- Le saturazioni per segmento coincidono con la tabella.
- Lo scorrimento "nascita" mostra le tre chiusure nell'ordine e nei tempi dichiarati.
- La schermata adulta non cambia di un byte.
