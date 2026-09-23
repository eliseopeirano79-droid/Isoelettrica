# Estensione alle cardiopatie congenite

Il circuito fetale è una base funzionante, non un catalogo già completo di cardiopatie. Il dotto pervio è indipendente dagli altri passaggi e dal resto dei parametri. Le quattro configurazioni attuali non modificano o sovrascrivono il laboratorio adulto.

## Struttura attuale da conservare

- Geometria, nomi e provenienza restano separati dalle regole del flusso.
- Nodi identificati stabilmente: `ra`, `rv`, `pa`, `lungs`, `la`, `lv`, `aorta`, `descending`, ritorni sistemici e placenta.
- Connessioni nominate, inclusi `da` (Botallo), `fo` e `dv`.
- Parametri, configurazioni e validazione indipendenti per adulto e feto.
- Calcolo deterministico e testabile senza la scena 3D.
- Stato serializzato con formato e versione; le future estensioni dovranno avere migrazioni esplicite. La versione attuale rifiuta parametri sconosciuti, evitando applicazioni silenziose di lesioni non supportate.

La topologia è definita in `fetal-core.js`; percorsi e controlli sono in `fetal.js`. Questo consente di aggiungere connessioni e geometrie senza riscrivere il visualizzatore adulto. Attualmente la direzione del Botallo è imposta; non è una conseguenza delle pressioni.

## Tipi di modifica da introdurre

| Famiglia | Modifiche necessarie al modello |
|---|---|
| Comunicazioni settali | Nuove connessioni fra camere, geometria del difetto, diametro, posizione, direzione e apertura nel tempo. Un forame ovale non deve diventare automaticamente qualsiasi tipo di DIA. |
| Ostruzioni e atresie | Resistenze locali e geometria di valvole, efflussi, arco e rami; gestione dei percorsi interrotti e delle dipendenze da altri passaggi. |
| Connessioni anomale | Possibilità di collegare efflussi e ritorni a camere differenti, con percorsi geometrici corrispondenti. |
| Dimensioni e sviluppo delle camere | Geometrie e proprietà meccaniche per ipoplasie, dilatazioni, ventricolo unico e varianti di sviluppo. |
| Anomalie valvolari | Numero e forma dei lembi, ancoraggi, stenosi e rigurgito; un solo cursore di apertura non è sufficiente. |
| Ritorni venosi e arco aortico | Collegamenti venosi sistemici/polmonari, varianti dell’arco, interruzioni e coartazioni. |
| Circolazioni dopo intervento | Connessioni chirurgiche, condotti e shunt come elementi distinti, con provenienza e configurazione proprie. |
| Varianti coronariche | Origini, decorso, dominanza e territori; la vicinanza fra curve non certifica una connessione anatomica. |

Ogni cardiopatia specifica potrà essere una combinazione di queste modifiche. Non vanno inserite etichette diagnostiche su semplici variazioni di colore: una configurazione deve cambiare connessioni, anatomia e comportamento in modo coerente.

## Botallo e modello delle pressioni

Conservare parametri distinti per presenza anatomica, calibro, lunghezza, resistenza, direzione e variazione nel tempo. Il modello attuale ha un diametro geometrico nel laboratorio adulto e una conduttanza relativa nel laboratorio fetale: non sono ancora collegati da una legge fisica.

Prima di rappresentare cardiopatie dotto-dipendenti, introdurre un modello di pressioni e resistenze che calcoli la direzione e l’eventuale inversione del flusso. Separare resistenza polmonare, sistemica e placentare; includere compliance, contrazione ventricolare, valvole e bilancio dei volumi. Un’interfaccia potrà offrire pochi cursori principali, lasciando i parametri approfonditi nei pannelli avanzati.

## Criteri per aggiungere un caso

1. Anatomia e connessioni descritte da fonti cliniche primarie o istituzionali e revisionate.
2. Geometrie interne/esterne modificabili, con punti di ancoraggio e superfici sezionabili; attribuzioni conservate.
3. Scenario con valori iniziali dichiarati e intervalli di modifica, senza presentarli come dati di un paziente.
4. Test su conservazione dei flussi e volumi, apertura/chiusura, inversione del dotto e percorsi di ritorno.
5. Verifica visiva da tutte le direzioni, sulle sezioni e durante le sette fasi.
6. Collegamento ai dispositivi dell’app e al motore ECG dove la patologia lo richiede.

I casi specifici e il modello pressorio restano da implementare. Questa scheda definisce dove estendere il lavoro e impedisce di confondere un preset illustrativo con una simulazione clinica completa.
