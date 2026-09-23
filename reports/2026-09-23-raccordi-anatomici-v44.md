# Isoelettrica v44 — raccordi anatomici e prime morfologie congenite

## Risultato

La sporgenza beige segnalata dall’utente è stata identificata selezionandola nel modello: **inserzione della cuspide destra della valvola polmonare**. La ricostruzione usava un asse non coincidente con quello dell’orifizio prossimale; una parte della cuspide attraversava la parete. Ora piano, orientamento e quota delle semilunari sono riferiti alle aperture vascolari. Il controllo visivo anteriore non mostra più quella sporgenza.

- Arco e aorta ascendente ricostruiti con bordi coincidenti, aorta discendente aggiunta. Tronco brachiocefalico, carotide comune sinistra e succlavia sinistra originano da aperture reali della superficie ricostruita. Sono i tre tronchi prossimali della disposizione standard, non l’intero albero epiaortico né tutte le sue varianti.
- Quattro vene polmonari con proporzioni e decorso rivisti. Levigatura locale dei vecchi manicotti atriali, apertura degli osti e raccordi che condividono esattamente il bordo atriale. La parametrizzazione per lunghezza del bordo evita che un ostio irregolare produca pieghe o lumi incompleti nel tratto distale. Il GLB sorgente è conservato.
- Polmonari destra e sinistra ricostruite sui bordi della biforcazione. La sinistra parte nella direzione dell’orifizio prima di dirigersi lateralmente: corretto il ripiegamento causato da un decorso iniziale tangenziale.
- Botallo ancorato alle superfici dell’istmo aortico e della polmonare sinistra prossimale, in continuità con il tronco e la sua biforcazione. Sono disponibili legamento arterioso e dotto pervio con calibro modificabile. La funzione «Osserva il Botallo» porta al raccordo. Il dotto, le pareti e i bordi usano lo stesso campo di deformazione.
- Semilunari a tasca: inserzioni festonate, margini di coaptazione, lunule e noduli illustrativi di Aranzio/Morgagni. Apertura e chiusura condividono commissure e inserzioni. Viste ravvicinate aortica e polmonare nel pannello Ciclo.
- Via internodale anteriore, media di **Wenckebach**, posteriore di **Thorel** e fascio interatriale di **Bachmann**, animati nel grafo condiviso. I nomi media/posteriore sono corretti rispetto all’inversione nella richiesta. Sono percorsi preferenziali illustrativi, non tre cavi isolati istologicamente.
- Sette morfologie congenite modificabili: DIA ostium secundum, DIV perimembranoso, DIV muscolare, coartazione iuxtaduttale, interruzione dell’arco tipo B, bicuspidia aortica e cor triatriatum sinistro. I difetti settali aprono realmente le superfici; la membrana atriale ha un’apertura e un margine proiettato sulla parete. Il ripristino conserva il cuore di base. Il catalogo resta di 172 voci: 101 ECG, 8 valvulopatie animate, Botallo, 7 morfologie congenite e 55 sole localizzazioni.
- In Fisiologia cambia soltanto il livello anatomico opzionale, ora basato sullo stesso atlante. Opacità indipendente. Il codice di geometria e materiali del cuore di riferimento è identico; assi, vettori e tracciati preesistenti non sono modificati.
- Titolo separato dal campo 3D, pannelli consultabili senza spostare il modello, comandi di dettaglio vicini ai relativi controlli, spazio per testi su telefono. Mantenuti colori e carattere visivo approvati.

## Verifiche

`npm test`: validatori ECG, ST e audit, **135 test Node e 5 Python**. I dieci nuovi test controllano: conservazione delle sorgenti; aperture epiaortiche; bordi venosi coincidenti durante la contrazione; partenza delle polmonari senza ripiegamento; inserzioni del Botallo sulle superfici; semilunari contenute sotto l’apertura e coaptazione; reversibilità delle malformazioni; apertura reale dei setti con raggi prima/dopo; ordine di caricamento dei moduli; identità del cuore di riferimento; lumi venosi completi. Alcuni aspetti sono raggruppati nello stesso test.

Hash invariati dei sette file protetti elencati in STATO, incluso il GLB. Hash del blocco «Cuore di riferimento» in Fisiologia: `da0008a46537852d460c4b5f9e727a1ef89bc58be2a75b0126335fe8d2af7b97`. Nessuna dipendenza aggiunta. Nuovi moduli inclusi nella cache dell’app.

Verifica nel browser: viste anteriori/posteriori durante contrazione e rilasciamento, quattro vene, cuspidi aperte/chiuse, Botallo pervio e variazione di calibro, DIA, interruzione dell’arco, bicuspidia, membrana atriale e ripristino; caricamento del nuovo livello di Fisiologia e opacità; impaginazione desktop e 390 × 844. I controlli finali usano una nuova origine locale senza cache, dopo aver rilevato copie obsolete nell’anteprima precedente. Nessun nuovo errore JavaScript/WebGL nel controllo finale. Non eseguiti benchmark fps, iPad fisico o una verifica clinica indipendente.

Anteprima: `http://127.0.0.1:8002/?preview=1`. Proposta GitHub #7 aggiornata. Nessuna pubblicazione o fusione su main.

## Limiti

Sono ricostruzioni didattiche, con misure interne in unità dell’atlante, non anatomia individuale calibrata. Il controllo del calibro di Botallo conserva la convenzione grafica preesistente; non aggiunge una misura clinica del modello. I tratti vascolari finiscono con sezioni aperte. Le superfici originali conservano parte della loro risoluzione e irregolarità; non si garantisce assenza assoluta di artefatti per ogni vista o combinazione arbitraria dei controlli.

Il campo elastico condiviso conserva gli attacchi coincidenti durante il battito. Le trasformazioni manuali libere delle singole strutture possono separarle volontariamente. Non sono introdotti FEM, collisioni complete, pressione, flusso fisico, conservazione quantitativa dei volumi o valvole mosse dai gradienti. La registrazione in Fisiologia è rigida e illustrativa, centrata sul nodo AV; non è una validazione della corrispondenza di ogni via elettrica.

Le sette morfologie non coprono tutte le cardiopatie congenite né le combinazioni complesse. La bicuspidia rappresenta due cuspidi funzionali senza classificare tutte le varianti di raphe. DIA e DIV indicano comunicazioni localizzate sul setto, senza shunt calcolato; interruzione e membrana sono forme semplificate. I moduli avanzati del kit restano aperti.

## Fonti consultate

Le fonti orientano anatomia e organizzazione; non validano geometrie, distanze o coefficienti del simulatore.

- [Anatomic Atrial Connections Between Sinus and A-V Node, Circulation](https://www.ahajournals.org/doi/pdf/10.1161/01.cir.37.4.566): nomenclatura storica delle vie atriali.
- [Morphology of the patent arterial duct: features relevant to treatment](https://pmc.ncbi.nlm.nih.gov/articles/PMC3232584/): relazione del dotto con polmonare sinistra e istmo aortico.
- [A geometric model for the human pulmonary valve in its fully open case](https://pmc.ncbi.nlm.nih.gov/articles/PMC6016897/): geometria tridimensionale delle cuspidi; il modello dell’articolo non viene riprodotto o assunto come validazione.
- [CDC — difetto interatriale](https://www.cdc.gov/heart-defects/about/atrial-septal-defect.html), [difetto interventricolare](https://www.cdc.gov/heart-defects/about/ventricular-septal-defect.html), [coartazione](https://www.cdc.gov/heart-defects/about/coarctation-of-the-aorta.html): definizione delle comunicazioni e del restringimento.
- [Interrupted Aortic Arch](https://www.ncbi.nlm.nih.gov/books/NBK553173/): classificazione anatomica del tipo B.
- [Apple HIG — Layout](https://developer.apple.com/design/human-interface-guidelines/layout), [Apple Design Q&A](https://developer.apple.com/news/?id=s8sl4tpa): gerarchia visiva, spazio, contesto e progressione dei controlli.

## Verifica visiva rapida

1. Anatomia → Superficie: ruotare posteriormente e osservare le quattro vene mentre il cuore batte.
2. Patologia → Dotto arterioso pervio → Osserva il Botallo: variare il calibro e scorrere il ciclo in pausa.
3. Ciclo → Osserva la polmonare / l’aortica: confrontare eiezione e rilasciamento.
4. Fisiologia → Cuore anatomico: regolare la sua opacità; riattivare Cuore di riferimento per ritrovare il modello precedente.
