# Isoelettrica

App didattica per studiare l'ECG: 102 scenari simulati, teoria, quiz, confronto, atlante e laboratori di anatomia e territori coronarici.

App made by Eliseo Peirano · 2026.

## Avvio

È un'app statica senza build né backend. Aprire `index.html` tramite un server HTTP locale, per esempio:

```sh
python3 -m http.server 8000
```

Poi visitare `http://localhost:8000`. Il service worker richiede HTTPS oppure localhost. Una volta installata la shell, simulatore, teoria e quiz generati funzionano offline. Nell'atlante, **Scarica queste immagini per l'uso offline** salva la selezione corrente e mostra quante immagini sono disponibili. I tracciati PTB-XL opzionali vengono conservati dopo la prima apertura online.

## Struttura

| File | Responsabilità |
| --- | --- |
| `engine.js` | Eventi cardiaci, generazione del segnale, trasformazioni delle derivazioni, registrazioni campionate |
| `data.js` | Scenari, contenuti didattici, categorie e metadati dell'atlante |
| `quiz.js` | Generazione deterministica e vincoli dei casi del quiz |
| `app.js` | Monitor, interfaccia, misure, selezione dei casi e navigazione |
| `ipertrofie.js` | Indici in mV e conversione alle soglie standard |
| `anatomia.html`, `cuore3d.js`, `coronarie.js` | Laboratori grafici |
| `sw.js` | Installazione, versioni coerenti e risorse offline |
| `ptbxl.py`, `revisione.html` | Importazione PTB-XL e revisione dei tracciati digitalizzati |

La libreria usa otto sezioni richiudibili, mantenendo le categorie e gli identificatori dei casi. La ricerca per nome/criterio si combina con il filtro per argomento.

## Verifiche

Richiedono Node.js 22 o successivo e Python 3; nessuna dipendenza Python aggiuntiva.

```sh
npm ci --ignore-scripts
npm test
```

La suite comprende i controlli originali (`validatore.js`, `controllo-st.js`, `audit.js`), le regressioni del motore/interfaccia/service worker e l'importazione di un piccolo record WFDB sintetico in entrambi i formati. L'interfaccia viene eseguita in JSDOM con canvas simulato: questo verifica logica e gestione degli eventi, non la resa grafica di un dispositivo reale.

## Tracciati registrati e quiz

- Un canale assente è **N/D**, non una linea isoelettrica. I canali periferici si ricostruiscono solo se I e II sono entrambi presenti.
- La frequenza sui record è una stima da picchi, da verificare sul tracciato. QRS, R/S e indici automatici non vengono presentati senza una delimitazione validata; resta disponibile il compasso.
- Le immagini entrano nel quiz solo con `quizApproved`. Sei immagini sono state controllate visivamente; una usa `quizCrop` per escludere la didascalia. Le altre restano nell'atlante.
- Le domande sulle valvulopatie includono l'auscultazione. Il solo ECG non ne stabilisce eziologia o gravità.
- I casi generati conservano configurazione e seme quando vengono aperti nel Tracciato.

L'app è uno strumento didattico: i modelli simulati e i test software non costituiscono validazione diagnostica dei contenuti o certificazione clinica.

## PTB-XL facoltativo

```sh
python3 ptbxl.py --sorgente /percorso/ptb-xl/1.0.3 --modo cartella --out atlante-reale
```

Il formato cartella viene trovato automaticamente. Per `--modo file --out atlante-reale.js`, aggiungere il relativo script prima di `app.js` in `index.html`; non è richiesto se il dataset non è installato. Si conservano codici SCP originali, referto e provenienza. Un codice generico non viene trasformato in una diagnosi più specifica. `--tutti` disattiva esplicitamente i filtri di qualità; non viene attivato automaticamente.

Fonte: [PTB-XL 1.0.3, PhysioNet](https://physionet.org/content/ptb-xl/1.0.3/), CC BY 4.0.

## Aggiornamenti

La revisione 40 risolve i rilievi F01–F21: vedere [CORREZIONI-v40.md](CORREZIONI-v40.md). Per una nuova versione, mantenere coerenti i riferimenti `?v=` nell'HTML, `VERSION` nel service worker e le etichette nell'interfaccia. Un download essenziale fallito impedisce l'attivazione del nuovo worker. Le immagini offline hanno una cache separata che sopravvive agli aggiornamenti.
