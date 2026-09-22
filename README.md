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

## Atlante PTB-XL completo (v41.0)

La sezione **Atlante → PTB-XL** include tutti i **21.799 ECG** della versione 1.0.3, di cui **16.056** con `validated_by_human=true`. Ricerca per diagnosi/codice/ID, filtri combinati per validazione, artefatti segnalati e segnali già salvati, categorie multiple e pagine di 60 schede mantengono utilizzabile il catalogo completo.

**Anima ECG** apre il tracciato originale nel monitor, con pausa, riavvio, rallentamento, guadagno, velocità della carta e compasso. Si conservano tutti i 5.000 campioni di ciascuna delle 12 derivazioni a 500 Hz e la calibrazione WFDB: nessuna quantizzazione aggiuntiva, filtro, normalizzazione o ricostruzione. La ripetizione del segmento di 10 secondi interrompe il tratto grafico al confine del file; non viene interpolato un battito tra fine e inizio. Le misure automatiche di FC rimangono stime dichiarate, senza inventare PR/QRS/QT o vettori 3D.

Il catalogo locale occupa circa 1,4 MB. Referti dettagliati e segnali si caricano all'apertura: circa 120 kB di segnale per ECG. Il server PhysioNet non espone i file con CORS; `ptbxl.js` usa la copia pubblica `longisland3/ptb-xl` su Hugging Face, fissata al commit `34a5563a01793b150ac61fe0ec919a09fc0d044a`. **Ogni intestazione e segnale deve corrispondere allo SHA-256 ufficiale PhysioNet prima della visualizzazione**, anche dalla cache. Un errore di download, di integrità o di calibrazione impedisce l'apertura del caso e permette di riprovare. L'inventario del mirror comprende tutti i 43.598 file necessari.

Una prima apertura richiede la rete. Segnale e referto vengono poi salvati nella cache `isoelettrica-ptbxl-1.0.3`, nei limiti di spazio e disponibilità del browser. La cache sopravvive agli aggiornamenti dell'app; il filtro «Solo salvati sul dispositivo» mostra le registrazioni complete presenti. Non sono previsti account o un database utenti. La disponibilità online dei casi ancora da scaricare dipende dal mirror pubblico; le copie già salvate rimangono utilizzabili offline.

Per rigenerare il catalogo, scaricare `ptbxl_database.csv`, `scp_statements.csv`, `SHA256SUMS.txt` e `LICENSE.txt` dalla versione **1.0.3** ufficiale, poi eseguire:

```sh
python3 ptbxl_catalog.py --sorgente /percorso/ptb-xl/1.0.3 --out atlante-reale
```

Il generatore verifica le impronte dei metadati, conserva le etichette originali e i referti senza inferire diagnosi più specifiche, e maschera correttamente le età anonimizzate oltre 89 anni. Attribuzioni, modifiche e licenza sono visibili in `atlante-reale/fonti.html` e nelle schede del tracciato.

### Importazione locale precedente

`ptbxl.py` resta disponibile per importare sottoinsiemi autonomi nel vecchio formato:

```sh
python3 ptbxl.py --sorgente /percorso/ptb-xl/1.0.3 --modo cartella --out atlante-reale
```

Il formato cartella viene trovato automaticamente. Per `--modo file --out atlante-reale.js`, aggiungere il relativo script prima di `app.js` in `index.html`; non è richiesto se il dataset non è installato. Si conservano codici SCP originali, referto e provenienza. Un codice generico non viene trasformato in una diagnosi più specifica. `--tutti` disattiva esplicitamente i filtri di qualità; non viene attivato automaticamente.

Fonte: [PTB-XL 1.0.3, PhysioNet](https://physionet.org/content/ptb-xl/1.0.3/), CC BY 4.0.

## Aggiornamenti

La revisione 40 risolve i rilievi F01–F21: vedere [CORREZIONI-v40.md](CORREZIONI-v40.md). Per una nuova versione, mantenere coerenti i riferimenti `?v=` nell'HTML, `VERSION` nel service worker e le etichette nell'interfaccia. Un download essenziale fallito impedisce l'attivazione del nuovo worker. Le immagini offline hanno una cache separata che sopravvive agli aggiornamenti.

## Dispositivi sul tracciato (v42.0)

In **Parametri → Aggiungi dispositivo** scegli Pacemaker, DAE, ICD o CRT-D. La barra sopra l’ECG mostra il dispositivo attivo; **Rimuovi** ricrea il quadro originale con i suoi parametri. Il dispositivo è temporaneo e viene tolto cambiando caso o aprendo una registrazione reale. Nei due scenari dedicati DAE/ICD è già collegato all’apertura.

- **Pacemaker**: VVI a domanda, frequenza minima 40–100/min. I QRS spontanei inibiscono lo stimolo; nel BAV III le P continuano indipendenti e lo spike precede il QRS stimolato.
- **DAE**: Defibrilla → analisi simulata → ritmo defibrillabile/non defibrillabile → eventuale Eroga scarica. Asistolia e PEA non generano scariche né cambi di ritmo. Per TV/torsione di punta il contesto di polso è esplicito; non viene ricavato dall’ECG. Le analisi successive valutano l’esito corrente, non il ritmo iniziale.
- **ICD transvenoso**: riconoscimento, ATP per la TV monomorfa oppure carica/scarica, con supporto VVI nei ritmi compatibili. Non trasforma l’asistolia in un ritmo stimolato efficace.
- **CRT-D**: funzione ICD e stimolazione biventricolare; esempio di QRS da 130 ms, con tracking delle P rilevate a 120 ms e frequenza massima di tracking 150/min. La morfologia non predice il beneficio clinico della CRT.

Modello didattico con rilevazione e cattura ideali: tempi ed esiti esemplificativi, senza guasti o fusione. Non simula l’impianto né ne determina l’indicazione clinica. Gli indici di ipertrofia e l’inserimento manuale di extrasistoli sono disabilitati durante la stimolazione aggiunta. Le sequenze seguono il tempo del simulatore (pausa e rallentamento inclusi) e sono annullate quando cambia il caso, il dispositivo o un parametro del ritmo. I dati PTB-XL rimangono registrazioni originali.

Riferimenti: [AHA 2025, Adult Advanced Life Support](https://cpr.heart.org/en/resuscitation-science/cpr-and-ecc-guidelines/adult-advanced-life-support), [ESC 2021, Pacing e CRT](https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/cardiac-pacing-and-cardiac-resynchronization-therapy/).
