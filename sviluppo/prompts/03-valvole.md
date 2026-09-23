# PROMPT 3 — Valvole: anatomia completa e animazione passiva realistica

Vale il brief permanente (`AGENTS.md`). Richiede i Prompt 1 e 2 completati.

## Obiettivo

Rendere le quattro valvole anatomicamente corrette e farle muovere come nella vita: lembi passivi che rispondono ai gradienti di HemoModel, vincolati da corde e papillari.

## Anatomia da costruire (ogni parte con nome nel dizionario)

- **Mitrale**: lembo anteriore (aortico), semicircolare, 1/3 della circonferenza anulare ma la quota maggiore di area; lembo posteriore (murale) con festoni P1, P2, P3 e settori corrispondenti A1, A2, A3 (Carpentier); commissure anterolaterale e posteromediale; zona rugosa e zona chiara, linea di coaptazione 8–10 mm; anello a sella, area 4–6 cm², che si riduce ~25% in sistole; continuità aorto-mitralica con trigoni fibrosi destro e sinistro; corde primarie (marginali), secondarie (di supporto), terziarie (basali, solo posteriore); papillare anterolaterale (irrorazione doppia, IVA + circonflessa) che sostiene A1/P1 e metà di A2/P2; papillare posteromediale (irrorazione singola da coronaria destra/discendente posteriore, il più vulnerabile all'infarto) che sostiene A3/P3 e l'altra metà.
- **Tricuspide**: lembi settale, anteriore, posteriore; papillare anteriore dalla banda moderatrice, posteriore, settale (piccolo/multiplo); corde del lembo settale inserite direttamente sul setto; anello più apicale del mitralico di 5–10 mm.
- **Aortica**: cuspidi coronarica destra, coronarica sinistra, non coronarica; seni di Valsalva; giunzione sinotubulare; anello virtuale basale; triangoli interlembo; noduli di Aranzio; lunule; commissure.
- **Polmonare**: cuspidi anteriore, destra e sinistra; noduli di Morgagni; regola dell'affacciamento con l'aortica.

## Movimento (tutto derivato, niente keyframe scritti a mano)

- Lo stato di ogni lembo dipende dal gradiente monte/valle di HemoModel con isteresi minima; velocità dei bordi limitata a valori fisici (apertura aortica in 20–30 ms, chiusura ~30 ms con volume di chiusura 1–3% della gittata).
- Mitrale e tricuspide non evertono mai: le corde vanno in tensione e bloccano i lembi al piano dell'anello; i papillari si contraggono prima della salita di pressione ventricolare (li raggiunge per primi il Purkinje) e mantengono la coaptazione; le corde si tendono visibilmente.
- Doppia apertura mitralica per ciclo: onda E precoce, semichiusura in diastasi, riapertura con la sistole atriale (onda A); oltre ~120 bpm le due si fondono; senza sistole atriale (fibrillazione) niente riapertura A; con PR lungo o blocco AV completo il lembo si richiude in anticipo e compare rigurgito mitralico diastolico.
- Aortica: vortici nei seni di Valsalva che avviano la chiusura, rimbalzo lieve all'incisura dicrota.
- Pannello M-mode del lembo anteriore mitralico (pendenza E-F, punto A) e della cuspide aortica (box di apertura).

## Patologie come set di parametri (usati dai Prompt 5 e 6)

Stenosi (fusione commissurale, ispessimento, apertura a bocca di pesce/doming), prolasso di P2, flail da rottura di corde, rigurgito funzionale da dilatazione anulare o tethering ischemico, bicuspidia aortica con rafe (fusione destra-sinistra la più comune), vegetazioni, SAM del lembo anteriore nell'ipertrofica (trascinamento nell'efflusso a metà sistole), calcificazione anulare, valvola reumatica (fusione commissurale + corde accorciate), Ebstein (spostamento apicale dei lembi settale e posteriore).

## Viste dedicate

"Dal chirurgo" (mitrale vista dall'atrio), "dal ventricolo", asse corto al piano valvolare, piani ecocardiografici (parasternale asse lungo e corto, apicale 4 camere).

## Accettazione

- Tempi di apertura/chiusura entro 1 frame da HemoModel; nessuna compenetrazione tra lembi.
- Ordine: T1 dopo M1; polmonare apre prima dell'aortica; P2 dopo A2; tricuspide apre prima della mitrale.
- E e A distinte a 70 bpm e fuse oltre 120 bpm; niente onda A in fibrillazione atriale.
- Rigurgito mitralico diastolico con PR > 300 ms.
