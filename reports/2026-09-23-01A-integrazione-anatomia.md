# Integrazione Anatomia e fondazioni 01 A

Data: 23 settembre 2026. Ramo: `feat/anatomia-app`. Commit: quello che contiene questo report.

## Piano seguito

1. Conservare geometria e grafica del laboratorio approvato.
2. Riutilizzare il cuore sotto gli ECG e in Coronarie, conservando i relativi controlli.
3. Integrare nuova Anatomia e laboratorio fetale; rinominare gli assi esistenti in Fisiologia.
4. Correggere il raccordo polmonare e introdurre l’adattatore temporale in sola lettura.
5. Verificare invarianti, interfaccia, regressioni e registrare ciò che resta aperto nel kit.

## File e scopo

- Nuovi `atlas-geometry.js`, `heart-atlas.js`, `atlas-theme.css`: asset condiviso, parete polmonare aggiunta, mappatura visiva e materiali.
- Nuovi `anatomy-host.js`, `lab-embed.js`: navigazione e sospensione dei laboratori nascosti; adulto/feto conservano stato indipendente.
- Nuovo `cardiac-clock.js`: snapshot immutabile di P, QRS, fine T, RR, ritmo, prossimo evento QRS già generato. Nessun timer né mutatore del motore.
- `index.html`, `app.js`, `coronarie.js`, `anatomia.html`: soli collegamenti dell’integrazione e aspetto. Contenuti clinici e logica ECG non modificati.
- Piccoli innesti in `prototipo-cuore/` per raccordo, clock, cursore DII, integrazione e dichiarazione dello stato reale.
- `sw.js`, versioni e test: cache coerente 43.0, asset dei due laboratori inclusi; nuove verifiche geometriche e di regressione.
- `tools/build-atlas-map.cjs`, `atlas-coronary-map.json`: derivazione riproducibile della mappatura visiva.
- `AGENTS.md`, `STATO.md`, `sviluppo/`: kit originale e aggiornamento delle priorità espresse direttamente dall’utente.

## Invarianti e test

- Hash SHA-256 invariati per `engine.js`, `data.js`, `ipertrofie.js`, `quiz.js`, `atlante-digitale.js`, `ptbxl.js` e GLB originale; verificati automaticamente contro STATO.
- Nessuna nuova dipendenza. Stesso Three.js 128 e loader già presenti nel prototipo.
- Test completi: 102 Node e 5 Python superati, oltre ai validatori ECG/ST/audit esistenti.
- Cinque fallimenti della base precedente erano aspettative obsolete: quattro test cache fermi a 42.0 e un conteggio immagini quiz fermo a 6, a fronte delle 78 già approvate in main. Aggiornati i test alla versione corrente e ai dati preesistenti; nessun contenuto quiz modificato.
- Asset sorgente: 39 oggetti, 3.817.708 byte. Il raccordo separato è una parete con tre contorni aperti, manifold, caratteristica di Eulero −1; margini originali conservati. Non è un tappo nel lume.
- Tutti i 17 segmenti del VS hanno geometria; i 28 rami arteriosi mantengono riferimenti e comandi. Sei rami senza identificazione sorgente sono dichiarati ricostruiti.
- Controllo visivo nel browser: ECG, Coronarie con selezione LAD/RCA, nuova Anatomia, laboratorio fetale, Fisiologia preesistente, layout 390 px senza overflow orizzontale. Nessun errore WebGL osservato.
- Disponibilità offline degli asset coperta dai test del service worker; non equivale a un collaudo fisico su iPad. Non dichiarati 60 fps su Safari/iPad.

## Accettazione del prompt 01

| Criterio | Esito | Evidenza / motivo |
|---|---|---|
| P di 80–100 ms a 70 bpm | Aperto | Nessun preset 70 bpm introdotto. Il motore esistente dichiara P nominale 110 ms: non alterato né mascherato nell’adattatore. |
| Sequenza regionale di Durrer entro 80 ms | Aperto | Non è stata implementata una mappa LAT regionale validata. |
| Primo vertice entro un frame dall’onset QRS | Aperto | L’adattatore espone l’onset esatto, verificato; non basta a validare una mappa di attivazione ancora assente. |
| Sequenza leggibile a ¼× | Aperto per nuova mappa | Il rallentamento già presente è conservato; grafo completo e isocrone restano da sviluppare. |
| Motore invariato | Superato | Confronto SHA-256 automatico. |

Non si avviano i prompt 02–09 finché il prompt 01 non è completato. È stata data precedenza all’integrazione richiesta direttamente dall’utente, che modifica l’ambito del vecchio brief.

## Numeri e riferimenti

Non sono stati introdotti nuovi valori clinici di pressione, portata, saturazione, ERP o velocità di conduzione. Il clock riporta i dati effettivi del motore. Tempi delle deformazioni restano convenzioni illustrative ereditate dal prototipo, non risultati emodinamici.

La partizione VS usa 17 nomi e orientamento del modello [AHA 2002](https://www.ahajournals.org/doi/pdf/10.1161/hc0402.102975?download=true); asse lungo e confini sono approssimazioni geometriche da revisionare. [Durrer 1970](https://www.ahajournals.org/doi/pdf/10.1161/01.cir.41.6.899) è stato verificato come riferimento primario per la futura attivazione, non applicato come validazione delle animazioni attuali. Evitare di confondere questi riferimenti con una validazione del simulatore.

## Esito della revisione richiesta dal prompt 10

Revisione tecnica dell’autore con verifiche automatiche; non una revisione indipendente o certificazione di un cardiologo.

- **Visiva, corretta:** discontinuità polmonare. Aggiunta parete con continuità dei margini e tre vie aperte.
- **Tecnica, corretta:** laboratori nascosti continuavano a renderizzare. Sospensione con messaggi verificati per origine e finestra mittente; tempi conservati al ritorno.
- **Tecnica, corretta:** intestazione compressa su telefono. Altezza non comprimibile e iframe che occupa lo spazio restante; controlli accessibili tramite scorrimento interno.
- **Clinica, aperta:** regioni AHA e rami minuti mappati per visualizzazione; non equivalgono a una segmentazione anatomica/perfusionale individuale.
- **Clinica/architetturale, aperta:** il vecchio laboratorio collega ancora somma delle fasi, PR e frequenza sinusale. L’adattatore è in sola lettura, ma la separazione completa fra parametri elettrici e meccanici va completata nella parte 01 B.
- **Clinica, aperta:** valvole procedurali, flussi qualitativi e circuito fetale semplificato. Nessun HemoModel o comportamento congenito avanzato dichiarato completo.
- **Prestazioni, non verificata:** manca collaudo su iPad fisico; nessuna promessa di frequenza fotogrammi.

## Verifica visiva in 30 secondi

1. In Tracciato osservare il cuore anatomico e provare la trasparenza.
2. In Coronarie selezionare LCA → LAD e spostare il punto di occlusione: disco, vaso e territorio seguono i comandi.
3. In Fisiologia verificare gli assi originali; in Anatomia aprire Interno e poi Circolazione fetale. Il ritorno al cuore adulto conserva i controlli impostati.
