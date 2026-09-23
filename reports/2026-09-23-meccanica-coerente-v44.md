# Isoelettrica v44 — movimento accoppiato e vincoli meccanici

## Risultato

La revisione richiesta dall’utente corregge cause concrete di incoerenza: pareti e strutture sovrapposte erano deformate con classificazioni diverse; le normali di illuminazione restavano quelle del cuore a riposo; selezione, etichette e alcuni riferimenti non seguivano la superficie visibile. I lembi e le corde erano ricostruiti senza un vincolo comune con i papillari. Il modello e la grafica approvati sono conservati.

- `cardiac-mechanics.js`: sei coordinate elastiche (atri, ventricoli, quattro aperture valvolari), integrazione implicita massa–molla–smorzatore ogni 4 ms di tempo ECG. Conserva velocità e inerzia, dissipa energia; pausa, rallentamento e ritorno indietro ricostruiscono lo stesso stato. Rigidità e smorzamento relativi modificabili in Anatomia → Ciclo → Contrazione, elasticità e vincoli.
- Un solo campo spaziale continuo per pareti, coronarie, grandi vasi, anelli, conduzione, riferimenti e marcatori. La parte superiore dei grandi vasi resta progressivamente ancorata. Anche il cuore sotto i tracciati usa questo campo e la risposta elastica; mantiene il proprio inviluppo di contrazione guidato dagli eventi ECG, mentre Anatomia conserva i controlli delle sette fasi.
- Normali ricalcolate rispetto alla deformazione, per mantenere l’illuminazione coerente. Normali coincidenti dei raccordi vascolari raccordate sul modello derivato; nessuna modifica al GLB sorgente.
- `cardiac-attachments.js`: attacchi papillari proiettati sulle superfici sorgenti, anelli e commissure condivisi, coaptazione centrale dei lembi chiusi. Corde collegate agli stessi punti aggiornati dei lembi; proiezione geometrica limita l’estensione e mantiene i lembi atrioventricolari dal lato ventricolare dell’anello. Le geometrie già deformate non ricevono una seconda deformazione nello shader.
- Le aree con ridotta contrazione sono ancora trascinate dai tessuti circostanti. Una distribuzione meccanica liscia, più ampia del colore dipinto, evita discontinuità brusche. Sovrapposizioni delle aree non amplificano senza limite la riduzione.
- Etichette, impulsi, marcatori di ostruzione e flussi illustrativi seguono la deformazione; l’orientamento delle ostruzioni segue la tangente deformata. La selezione usa la superficie corrente e ritrova le coordinate a riposo per dipingere o posizionare ostruzioni. I gruppi nascosti non intercettano la selezione.
- Le modifiche dei parametri aggiornano anche la geometria in pausa. Corretto il contrasto dei titoli espandibili nel tema chiaro.

## Verifiche

`npm test`: validatori ECG/ST/audit, **125 test Node e 5 Python superati**. Gli 11 nuovi test meccanici controllano dissipazione dell’energia, indipendenza dal numero di fotogrammi, pausa e ritorno indietro, tutti i casi ECG senza mutarne gli eventi, normali, attacchi, commissure, coaptazione, limiti delle corde, selezione e coordinate a riposo. Controllata l’assenza di inversioni locali su griglie e 5.000 campioni deterministici, con contrazione/torsione massime e danni sovrapposti: è una verifica campionata, non una prova per tutte le configurazioni possibili.

Hash invariati di `engine.js`, `data.js`, `ipertrofie.js`, `quiz.js`, `atlante-digitale.js`, `ptbxl.js` e GLB originale. Nessuna dipendenza aggiunta. I due nuovi moduli sono inclusi nella cache v44; la versione è ancora in preparazione e non è stata pubblicata.

Verifica dell’anteprima nel browser: superficie anteriore/posteriore, contrazione/rilasciamento, valvole in chiusura e apertura, rigidità modificata in pausa, conduzione e cuore nei tracciati. Nessun errore JavaScript/WebGL rilevato nel controllo. Non eseguiti benchmark di fps né prove su iPad fisico.

## Significato e limiti della fisica

È una meccanica ridotta con inerzia, elasticità, smorzamento e proiezione di vincoli. Le molle sono guidate dalle aperture e contrazioni obiettivo del ciclo esistente: **non** da gradienti di pressione calcolati. Coefficienti, massa normalizzata, distanze dell’atlante, diffusione del danno e limiti geometrici sono parametri della visualizzazione, non misure cliniche calibrate. Il passo di 4 ms è una scelta numerica.

Non sono presenti HemoModel, FEM, conservazione quantitativa dei volumi, interazione sangue–tessuto o un risolutore completo delle collisioni fra lembi, corde e miocardio. Il campo condiviso conserva gli attacchi già coincidenti ma non ripara ogni limite topologico della geometria sorgente. Le superfici originali rimangono alla risoluzione dell’atlante; le estremità sezionate dei vasi restano aperte.

Le valvole sono ricostruzioni didattiche a settori, non segmentazioni individuali dei lembi. L’atlante include un solo muscolo papillare nominato del VS: entrambi i gruppi di riferimento mitralici si ancorano a quella superficie, senza dichiarare un apparato papillare sinistro completo. Il limite della corda segue la distanza della configurazione chiusa deformata, quindi ammette la deformazione comune del cuore; non rappresenta una corda biologica perfettamente inestensibile.

Gli spostamenti e le scale manuali delle singole strutture rimangono strumenti liberi: possono separare volontariamente strutture. Non si garantisce l’assenza assoluta di artefatti in ogni combinazione arbitraria. Nessuna validazione biomeccanica o revisione indipendente di un cardiologo. I prompt avanzati del kit restano aperti.

## Fonti e distinzione dall’implementazione

- [Müller et al., Position Based Dynamics, 2007](https://www.cs.toronto.edu/~jacobson/seminar/mueller-et-al-2007.pdf): riferimento per la proiezione di vincoli geometrici. Qui è utilizzata su punti valvolari insieme a un’integrazione elastica ridotta; non è implementato l’intero metodo né un simulatore cardiaco del lavoro citato.
- [Modeling the Mitral Valve, 2022](https://arxiv.org/abs/2208.13317): riferimento per la relazione meccanica tra anello, lembi, corde e papillari. Il presente modello non ne riproduce la soluzione dell’equilibrio sotto pressione e non ne eredita una validazione.

## Verifica visiva rapida

1. Anatomia → Ciclo → Valvole; scorrere lentamente il cursore attraverso eiezione e riempimento. Osservare gli attacchi delle corde sui papillari e sui lembi.
2. In pausa, aprire Contrazione, elasticità e vincoli e modificare rigidità/smorzamento. Tornare a 1 per recuperare i valori iniziali.
3. Passare a Superficie e ruotare il cuore posteriormente; osservare il raccordo polmonare durante il battito. Conduzione mostra percorsi e impulsi trascinati nello stesso spazio.

Anteprima locale: `http://127.0.0.1:8001/?preview=1`. Proposta GitHub #7 aggiornata; nessuna pubblicazione eseguita in questa sessione.
