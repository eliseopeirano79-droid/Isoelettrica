# Correzioni della revisione 40

Base: `ae4476c477af8250c86c4380879e881686c6e5fd` (v39). Revisione del 22 settembre 2026.

| Rilievo | Correzione |
| --- | --- |
| F01 | Fallback in assenza di WebGL: ECG e interfaccia restano utilizzabili; messaggio anche nei laboratori Anatomia e Coronarie |
| F02 | Ogni cambio di caso annulla la ricostruzione differita dei parametri |
| F03 | Timer di scarica e sequenze ICD invalidati al cambio di caso; terapie applicabili solo allo stream corretto |
| F04 | Stato dell'atlante inizializzato prima dell'uso nella modalità solo linee guida |
| F05 | Parametri del quiz separati dai limiti liberi del laboratorio; normale vincolato e nessuna variazione nascosta dopo la verifica |
| F06 | Quiz immagini limitato a sei tracciati verificati; ritaglio del flutter per escludere la didascalia; tutte le immagini restano nell'atlante |
| F07 | Dati di auscultazione nelle domande valvolari; contesto clinico per NSTEMI; formulazione della domanda adeguata |
| F08 | Apertura dal quiz con gli stessi parametri, configurazione, seme e tempo |
| F09 | Bigeminismo/trigeminismo/quadrigeminismo contati sui battiti condotti; coppie, triplette e salve PAC effettive; cambio del tipo aggiornato |
| F10 | Ampiezze misurate dopo le trasformazioni applicate al segnale visualizzato |
| F11 | Canali assenti distinti da zero; visualizzazione dei soli canali disponibili nei record con fino a sei derivazioni |
| F12 | Indici/QRS automatici indisponibili senza delineazione validata; FC esplicitamente stimata; eventi mantenuti anche dopo numerose ripetizioni |
| F13 | A 50 mm/s: 20 ms per quadratino, 600/quadrati grandi e 3000/quadratini; metodo dei sei secondi descritto come stima |
| F14 | −60° classificato come deviazione sinistra; corretta interpretazione di DI/aVF tramite DII e dell'asse della P |
| F15 | Fattore delle derivazioni aumentate corretto in Anatomia; verificati Einthoven e Goldberger |
| F16 | Localizzazione del blocco distinta fra nodale, infranodale e non definita; nessuna localizzazione automatica nodale per tutte le P bloccate |
| F17 | Pulizia limitata alle cache Isoelettrica; migrazione/conservazione delle immagini durante gli aggiornamenti |
| F18 | Installazione completa richiesta, fallback per tipo di risorsa, gestione HTTP/offline/quota, ricaricamento dopo attivazione e download immagini con progresso |
| F19 | Scambio completo dei casi nel confronto, reset ai valori tipici, tempo conservato al ritorno e aggiornamento del tema |
| F20 | Ridisegno della revisione associato all'identificatore effettivo del record filtrato |
| F21 | Mapping PTB-XL conservativo, codici originali preservati, nessuna disattivazione implicita dei filtri e integrazione anche del formato file |

Altri interventi: libreria in otto sezioni richiudibili con filtro; pausa nel confronto; etichette accessibili dei controlli e focus visibile; gesto di zoom nel modulo Coronarie; autonomia di Anatomia e natura illustrativa delle percentuali coronariche dichiarate nell'interfaccia. L'apertura dal modulo Coronarie indica esplicitamente che mostra un esempio acuto del territorio.

## Contenuti di rianimazione

Confrontato il testo [ERC 2025 Adult Advanced Life Support](https://www.erc.edu/umbraco/api/download-page/download/d01b6e5a-0de7-4b07-913a-58445e8630fc), DOI [10.1016/j.resuscitation.2025.110769](https://doi.org/10.1016/j.resuscitation.2025.110769). Aggiornati riferimento ALS, FV fine e indicazione di defibrillazione nella torsione senza polso. Non è una certificazione clinica completa di tutte le schede.

## Prove e limiti

`npm test` esegue le verifiche degli scenari esistenti e le regressioni aggiunte. Include 1.260 casi generati, altri 1.000 ECG normali, tutti i 59 record digitalizzati, schemi PVC/PAC, trasformazioni delle derivazioni, passaggi fra viste e simulazione dei guasti offline. Le importazioni Python usano dati sintetici per controllare metadati e calibrazione.

I test di interfaccia usano JSDOM con canvas simulato. Restano necessari il collaudo fisico su Safari/iOS e Android, la revisione clinica indipendente e la verifica immagine/segnale di ogni digitalizzazione. Le funzioni proposte nel rapporto come nuove evoluzioni — percorso di lettura guidata, ripetizione dilazionata, preferiti e link condivisibili — sono sviluppi successivi, separati dalla correzione dei difetti.
