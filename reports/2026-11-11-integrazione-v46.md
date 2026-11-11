# Integrazione di Isoelettrica v46.0

## Risultato

Il kit allegato `isoelettrica-v46-kit-per-agente.zip` è stato integrato in una copia locale del repository `eliseopeirano79-droid/Isoelettrica`, sul ramo `feat/casi-clinici-v46`, partendo esattamente da `22d3584c79b8182c034d359a27e3528ffea07d7f` (v45.1). Non sono stati eseguiti push, apertura di pull request, merge o pubblicazione del sito.

La proposta comprende la nuova voce **Casi clinici**, 15 percorsi guidati con 66 decisioni, 96 registrazioni PTB-XL e il paziente 3D MakeHuman. Il kit non costituisce l’intera applicazione: è stato applicato al repository completo.

## Controlli sul kit e sul perimetro

- Tutte le 20 impronte di `SHA256.txt` coincidevano prima dell’integrazione.
- Il ramo `main` remoto coincideva con il commit previsto; non erano presenti modifiche successive da riconciliare.
- Il confronto dei nove file esistenti corrispondeva agli interventi descritti nel kit: collegamento al nuovo modulo, nuova voce, aggiornamento della cache e versione 46.0, test dell’avviso aggiornamenti e documentazione.
- Il binario `paziente-corpo.bin` è stato copiato senza conversioni.
- Il kit e le sue schermate originali sono rimasti invariati; le correzioni indicate sotto riguardano la copia integrata.

## Correzioni rispetto al kit

### Tracciato e avvisi rimasti dal paziente precedente

Aprendo un ECG reale dopo un caso guidato, il modulo azzerava la propria variabile del segnale ma lasciava il vecchio segnale nel monitor. Durante il download, e anche dopo un errore, poteva quindi restare visibile l’ECG del caso precedente. Anche il messaggio di una conseguenza simulata poteva rimanere sul nuovo paziente.

`casi-clinici.js` ora cancella il segnale del monitor, il tempo e gli avvisi all’apertura di un caso. Il nuovo ECG viene mostrato solo quando il relativo caricamento è terminato. Il percorso di errore conserva il pulsante **Riprova** e il ritorno all’elenco.

### Corpo 3D non disponibile

Il modulo 3D esponeva già un richiamo per segnalare un errore nel download del corpo, ma l’interfaccia non lo usava. È stato collegato all’avviso di indisponibilità; tracciato, parametri e domande restano utilizzabili. L’avviso non viene più duplicato quando si riaprono casi su un dispositivo privo di WebGL.

### Documentazione

Il README ora distingue le verifiche tecniche eseguite dalle verifiche cliniche e visive ancora aperte. Non sono stati modificati casi, risposte, dosi o spiegazioni cliniche.

## Verifiche eseguite

| Verifica | Esito |
| --- | --- |
| `npm ci --ignore-scripts` | Completata con Node.js 24 |
| Validatore del motore | 102 scenari conformi |
| Regole ST | 28 regole rispettate |
| Audit | 329 criteri superati; 522 combinazioni senza anomalie |
| Suite finale `npm test` | 169 test Node e 5 test Python superati; nessun fallimento |
| Nuovi test dell’interfaccia | 6 test con eventi DOM e motore reali, rendering 3D simulato |
| Percorsi guidati | Tutti i 15 casi e le 66 decisioni completati; punteggi salvati |
| Scelta pericolosa prevista dal kit | Conseguenza simulata visualizzata nel DOM e successivo recupero del percorso |
| Risposta asincrona dopo l’uscita | Non sostituisce il nuovo caso |
| ECG in caricamento o in errore | Segnale e avvisi precedenti cancellati |
| Corpo 3D assente | Avviso unico e caso utilizzabile |
| `git diff --check` | Nessun errore |

Tre dei sei nuovi test fallivano sul kit originale e sono passati dopo le correzioni. I test aggiunti sono in `tests/casi-ui.test.cjs` e usano l’infrastruttura già presente, senza nuove dipendenze.

### Download di un ECG originale

È stato caricato il record PTB-XL **n. 23** dal mirror fissato nel codice al commit `34a5563a01793b150ac61fe0ec919a09fc0d044a`:

- file `records500/00000/00023_hr.hea` e `.dat`: risposta HTTP 200;
- entrambe le impronte SHA-256 verificate dal caricatore esistente;
- 12 derivazioni, 500 Hz, 5.000 campioni per derivazione;
- istanziazione del segnale campionato nell’interfaccia dei casi;
- referto originale assente prima della risposta e presente dopo;
- nessun errore DOM durante la prova.

La prova ha usato la rete reale attraverso Node.js e jsdom. Non equivale a una prova di CORS, disegno del tracciato, cache o prestazioni nel browser. Non sono stati scaricati o revisionati clinicamente tutti i 96 tracciati.

## Integrità dei file protetti

I seguenti nove file hanno mantenuto l’impronta della versione di partenza: `engine.js`, `data.js`, `quiz.js`, `ipertrofie.js`, `atlante-digitale.js`, `ptbxl.js`, `coronarie.js`, `cuore3d.js` e `prototipo-cuore/heart-z-anatomy.glb`.

| File | SHA-256 dopo l’integrazione |
| --- | --- |
| `engine.js` | `f578675e70fd9f4d7f4e0e48c34fc6979b1010d461626ff6104f94d85b931dcd` |
| `data.js` | `95d6242ea3fff572c494d751462a1afda5e11774a55e899bbaa87717561ae577` |

## Verifiche e limiti aperti

La prova visiva della copia integrata non è stata completata. Chromium locale non si avvia a causa di una restrizione dell’ambiente sui socket; il browser remoto non accede al server locale. Le schermate incluse nel kit documentano il lavoro precedente e non sono nuove schermate di verifica di questa integrazione.

Resta da provare Safari su iPad reale, oltre al comportamento visivo a dimensioni desktop e telefono e al caricamento PTB-XL dal browser. Non sono state misurate le prestazioni della scena 3D.

Non è stata svolta una nuova revisione delle raccomandazioni cliniche. Rimangono aperti i punti indicati dal kit: tempi della strategia invasiva nel caso Wellens, pericardiocentesi nel tamponamento, raccomandazioni nel caso Brugada, dose del magnesio e schema della colchicina secondo il peso. Nessuna revisione automatica viene presentata come certificazione di un cardiologo.

Le questioni pregresse di permessi sulle slide, licenza generale del repository e file duplicati restano fuori da questa integrazione, come previsto dal kit.

## Verifica visiva da completare

1. Aprire **Casi clinici** e controllare le due schede con 15 casi e 96 ECG.
2. Aprire **Arresto cardiaco in reparto** e osservare paziente, compressioni, scarica e cambio del tracciato.
3. Provare il percorso di FA pre-eccitata indicato dal kit e osservare la conseguenza simulata e il recupero.
4. Passare subito a un ECG reale: durante il download il vecchio ECG e gli avvisi devono essere assenti; dopo il caricamento e la prima risposta deve comparire il referto.
5. Verificare i comandi delle altre otto sezioni, il tema e l’impaginazione su iPad e telefono.

La pubblicazione richiede il consenso esplicito di Eliseo, come indicato in `LEGGIMI-PER-L-AGENTE.md`. Il passo successivo disponibile è caricare il ramo e aprire una pull request in bozza, mantenendo `main` e il sito pubblicato invariati.
