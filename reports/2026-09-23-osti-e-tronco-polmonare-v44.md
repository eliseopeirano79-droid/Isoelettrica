# Isoelettrica v44 — osti e tronco polmonare

## Problema e risultato

Le immagini delle 20:14–20:16 mostravano vene collocate accanto ai veri manicotti atriali, una cava inferiore di calibro e posizione discordi rispetto all’ostio, una radice polmonare separata dal ventricolo e una biforcazione con pieghe triangolari. I precedenti test verificavano la coincidenza dei nuovi bordi, ma non che fossero i manicotti originali né che la superficie polmonare fosse regolare. Questa revisione corregge queste carenze.

- Quattro vene polmonari allineate ai manicotti muscolari realmente presenti nella geometria dell’atrio sinistro. La sezione individua il componente distale del manicotto e i suoi due contorni, esterno e interno. Si sostituisce solo quel componente; le altre parti dell’atrio e i raccordi già realizzati restano conservati. Continuazione muscolare raccordata a un tubo con spessore e lume aperto; nessun foro aggiunto accanto al manicotto.
- Cava inferiore ricostruita sul bordo dell’ostio cavale inferiore, con parete e calibro coerenti. Il nuovo vaso parte dal manicotto, anziché penetrare disassato nell’atrio lasciando una fessura circolare.
- Radice del tronco polmonare collegata ai contorni interno ed esterno dell’infundibolo del ventricolo destro. Il sostegno muscolare rimane presente; non viene abbassato arbitrariamente l’intero vaso dentro il ventricolo.
- Tronco, biforcazione e due arterie polmonari derivano da un’unica superficie tubulare arrotondata, con parete interna e margini distali con spessore. Eliminata la precedente superficie a ventaglio fra tre poligoni. Le parti rimangono selezionabili separatamente, ma condividono bordi e normali. Il Botallo viene ricalcolato sulle nuove superfici parentali.
- Tutti gli attacchi usano la deformazione cardiaca già condivisa. La correzione è comune ad Anatomia, ECG, Coronarie e livello anatomico opzionale di Fisiologia. Grafica, motore ECG e cuore di riferimento di Fisiologia invariati.

## Implementazione

`vascular-cuffs.js` gestisce sezione locale, selezione del componente distale, conservazione delle facce non interessate, continuazione di parete/lume e raccordo delle normali. La levigatura locale conserva i bordi aperti e gli attacchi finali. `pulmonary-arteries.js` campiona una superficie implicita di tubi raccordati; la ricostruzione viene calcolata una volta per contesto e riutilizzata. L’intero albero polmonare ha meno di 50.000 triangoli, comprese le superfici interne. Coordinate in unità dell’atlante: nessun nuovo valore clinico o diametro in mm.

`anatomy-refinements.js` applica le ricostruzioni alle copie di visualizzazione; `atlas-geometry.js` fornisce lo stesso raccordo a tutte le viste. I due moduli nuovi sono caricati prima delle loro dipendenze e inclusi nella cache v44. Nessuna nuova libreria o risorsa remota necessaria al funzionamento.

## Verifiche

`npm test`: validatori ECG, ST e audit; **140 test Node e 5 Python superati**.

I controlli aggiunti o sostituiti verificano:

1. I bordi iniziali appartengono alle due superfici dei manicotti del GLB originale; asse e collo venoso restano concordi.
2. Il lume attraversa il manicotto senza lembi o tappi residui, mediante intersezioni di raggi.
3. Le superfici unite di atrio e vene non aggiungono bordi aperti, fori adiacenti o inversioni di facce; i bordi atrioventricolari mantengono l’area originale.
4. Cava inferiore e tronco condividono con la parete cardiaca entrambi i bordi, a riposo e in quattro stati di contrazione. La cava conserva un calibro vicino a quello della sezione muscolare.
5. Il raccordo polmonare è connesso, non aggiunge difetti topologici al ventricolo e conserva il lume in più sezioni di tronco e rami; non si limita più alla distanza tra due vertici del vecchio raccordo.
6. Margini venosi circolari, spessore e assenza di tappi distali; continuità degli attacchi del Botallo dopo la nuova geometria.
7. Ordine di caricamento e disponibilità offline dei moduli in tutte le pagine interessate.

Verifica visiva desktop nell’anteprima senza cache su porta 8002: quattro vene dalla vista posteriore, vene sinistre lateralmente, cava inferiore isolata a forte ingrandimento da due angoli, radice e biforcazione polmonare in diastole ed eiezione. Controllati caricamento e resa nelle viste Anatomia, Coronarie, ECG e Fisiologia. Nessun errore JavaScript/WebGL nei registri dell’anteprima controllata. Acquisite immagini di verifica in `../../../outputs/` (`v44-cava-raccordo.png`, `v44-vene-sistole.png`, `v44-polmonare-sistole.png`).

Hash dei sette file protetti di STATO invariati, incluso il GLB. Anche il blocco del cuore di riferimento in Fisiologia conserva il suo hash. Non sono stati eseguiti un benchmark fps, una nuova verifica mobile o una prova su iPad fisico in questa revisione.

## Limiti e stato

La superficie resta una ricostruzione didattica dell’atlante, non un modello anatomico individuale validato. Parti originali conservano la loro risoluzione e irregolarità. La coerenza del battito deriva da attacchi geometrici e campo elastico comune; non è stata aggiunta una simulazione FEM, un calcolo di pressione/portata o una gestione completa delle collisioni. Le trasformazioni manuali libere dei singoli oggetti possono ancora separarli. Nessuna validazione cardiologica indipendente.

Proposta GitHub #7 aggiornata; anteprima `http://127.0.0.1:8002/?preview=1`. Nessuna fusione o pubblicazione: la versione online resta v43.

## Fonti anatomiche

Riferimenti per le relazioni anatomiche, non una validazione delle superfici o dei coefficienti del simulatore:

- [Left atrial myocardial extension onto pulmonary veins in humans](https://pubmed.ncbi.nlm.nih.gov/10969751/): continuità miocardica atriale e manicotti polmonari.
- [Myocardium of the superior vena cava, coronary sinus, vein of Marshall, and the pulmonary vein ostia](https://pubmed.ncbi.nlm.nih.gov/22830489/): disposizione miocardica attorno agli osti venosi.
- [Clinical Anatomy of the Normal Pulmonary Root Compared With That in Isolated Pulmonary Valvular Stenosis](https://www.jacc.org/doi/full/10.1016/S0735-1097%2898%2900089-8): relazione tra radice polmonare, giunzione ventricolo-arteriosa e infundibolo.
- [Anderson, Cardiac anatomy revisited](https://pmc.ncbi.nlm.nih.gov/articles/PMC1571338/): sostegno muscolare della radice polmonare.

## Verifica rapida

Anatomia → Superficie: ruotare posteriormente per osservare i quattro manicotti. Ruotare lateralmente e ingrandire la radice polmonare. Con il cursore del ciclo confrontare diastasi ed eiezione: i raccordi rimangono uniti. La cava inferiore segue il bordo del manicotto atriale senza l’anello vuoto precedente.
