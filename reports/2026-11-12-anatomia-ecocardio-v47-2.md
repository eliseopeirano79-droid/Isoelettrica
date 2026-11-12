# Ecocardio Studio 03 — anatomia toracica e valvole mobili

## Richiesta e risultato

Eli ha richiesto una correzione dell’anatomia, in particolare delle coste e delle valvole immobili, citando il livello degli atlanti 3D. La revisione v47.2 sostituisce lo scheletro procedurale e introduce superfici valvolari con apertura e chiusura proprie. Il modulo resta separato e conserva lo stack Three.js, il cuore originale e il motore ECG. Il codice dell’app principale rimane nel ramo `feat/ecocardio-lab-v47`, PR #12; la distribuzione dedicata aggiorna lo stesso Site privato Ecocardio.

## Scheletro toracico

`thorax.bin` contiene 72 strutture: 24 coste, 20 cartilagini costali, manubrio/corpo/processo xifoideo dello sterno, 2 clavicole, 12 vertebre toraciche e 11 dischi intervertebrali. Le coste XI e XII non ricevono cartilagini anteriori inventate. Sono geometrie tratte dal progetto Z-Anatomy, non curve tubolari generate per somigliare a coste.

La sorgente è il file `Z-Anatomy.zip` della revisione `2b652413b1116c9119e616eabc1e63af3cc6267d`, la stessa usata dal cuore originale. Lo script `tools/build-echo-thorax.py` carica selettivamente gli oggetti senza autoesecuzione di script Blender, triangola la mesh di base e applica esattamente la trasformazione dell’esportazione cardiaca: scala 20, assi x/z/−y, traslazione −0,44/−26/−0,56. Il confronto fra i limiti dell’atrio destro e del ventricolo sinistro originali produce scarti inferiori a 0,000003 unità dell’atlante.

Le 124.101 posizioni sono quantizzate con passo 0,0005, errore massimo 0,00025 per asse; asset 2.244.556 byte. Provenienza, inventario, trasformazione e SHA-256 sono conservati in `thorax.json`. Licenze: Z-Anatomy CC BY-SA 4.0, sorgente BodyParts3D DBCLS CC BY-SA 2.1 JP; adattamento CC BY-SA 4.0. Le attribuzioni sono aggiornate.

La cute deriva dal corpo MakeHuman già disponibile: è stata adattata alle dimensioni della gabbia, senza dichiarare identità di soggetto con l’atlante. La superficie di contatto è rigenerata. Un controllo confronta oltre 25.000 campioni anteriori dello scheletro con la cute. Non è una registrazione clinica né una postura di acquisizione validata.

## Quattro valvole con movimento proprio

`valves.js` ricostruisce mitrale, tricuspide, aortica e polmonare. La mitrale ha due lembi asimmetrici e un anello a sella; la tricuspide tre settori non uguali; le semilunari tre cuspidi a tasca. I margini liberi si incontrano in chiusura, con superfici e linee di coaptazione condivise. Le valvole atrioventricolari hanno corde illustrative, con inserzioni approssimate. La vista **Valvole in movimento** isola la valvola scelta e il contesto ventricolare, permette rotazione, pausa e scorrimento del ciclo.

La precedente versione deformava le superfici valvolari insieme al cuore senza un’apertura propria dei lembi. La nuova animazione cambia la geometria locale dei lembi e applica poi la deformazione cardiaca condivisa. La temporizzazione legge CardiacClock senza modificarlo: valvole AV chiuse durante l’eiezione, semilunari aperte; sequenza opposta nel riempimento, con intervalli in cui entrambe le coppie sono chiuse.

**Questa è temporizzazione illustrativa da eventi ECG, non apertura passiva da differenza di pressione.** I coefficienti di fase e forma sono parametri grafici, non misure cliniche. Non introduce HemoModel, pressione intracavitaria, collisioni tissutali o interazione fluido–struttura. La geometria dei lembi e l’apparato sottovalvolare richiedono ulteriore lavoro, compresa una ricostruzione completa dei papillari e delle inserzioni cordali. Non completa il prompt 03.

## Stesso movimento nel 3D e nell’eco

Le superfici mobili generano campi di densità campionabili dal B-mode e dalla linea M. Il campo dei soli lembi statici viene rimosso dal volume in memoria, senza eliminare miocardio o papillari e senza modificare il GLB sorgente. La densità dinamica si combina con il volume cardiaco preesistente. Il cache riusa 33 stati di apertura per valvola; non genera un video scollegato dalla sonda.

I riferimenti PLAX, A4C, PSAX mitralico e PSAX aortico sono riallineati ai centri/assi delle valvole. Durante la verifica si è corretto un piano che passava tangenzialmente al lembo anteriore mitralico. Il preset PLAX attraversa ora entrambi i lembi. Sono ancora riferimenti geometrici illustrativi, senza revisione clinica indipendente.

## Rendering e verifica visiva

Il renderer CPU aggiorna posizioni e normali dei lembi mobili. È stata corretta la gestione delle facce posteriori e la composizione della profondità: coste e sterno anteriori si sovrappongono al cuore con l’opacità scelta, mentre le coste posteriori restano dietro. Lo scheletro e la cute hanno cache separati dalla geometria cardiaca mobile.

La prova nel browser disponibile ha verificato il torace, la selezione delle quattro valvole e il confronto mitrale/aortica tra 25% e 65% del ciclo. Le schermate salvate mostrano il cambiamento di geometria e della sezione ecografica. Il browser non ha creato un contesto WebGL, quindi le schermate documentano il percorso CPU. WebGL su hardware reale, Safari/iPad e prestazioni touch rimangono da verificare.

| Prova visiva | File |
| --- | --- |
| Torace con gabbia anatomica | [torace](assets/ecocardio-v47-2/ecocardio-studio03-torace.jpg) |
| Mitrale aperta, 65% | [aperta](assets/ecocardio-v47-2/ecocardio-studio03-mitrale-aperta.jpg) |
| Mitrale chiusa, 25% | [chiusa](assets/ecocardio-v47-2/ecocardio-studio03-mitrale-chiusa.jpg) |
| Aortica aperta, 25% | [aperta](assets/ecocardio-v47-2/ecocardio-studio03-aortica-aperta.jpg) |
| Aortica chiusa, 65% | [chiusa](assets/ecocardio-v47-2/ecocardio-studio03-aortica-chiusa.jpg) |

## Verifiche automatiche

Suite completa: **197 test Node e 5 test Python superati**. I sei nuovi test anatomici controllano inventario e simmetria del torace, registrazione con il cuore, contenimento anteriore nella cute, movimento indipendente delle quattro valvole, coaptazione, accordo fra mesh e densità, sequenza AV/semilunari, effetto del solo movimento valvolare sul B-mode e M-mode, passaggio dei piani di riferimento per le valvole ed entrambi i lembi mitralici visibili nel PLAX. Il codice di interfaccia preesistente conserva la copertura delle regressioni.

Tutti i nove SHA-256 protetti sono invariati: `engine.js`, `data.js`, `quiz.js`, `ipertrofie.js`, `atlante-digitale.js`, `ptbxl.js`, `coronarie.js`, `cuore3d.js` e `prototipo-cuore/heart-z-anatomy.glb`. Nessuna nuova dipendenza runtime. `git diff --check` superato. I test verificano invarianti del modello e regressioni software; non certificano accuratezza anatomica o clinica.

## Limiti che rimangono

- L’apparato valvolare è una ricostruzione parametrica: deve migliorare in dettaglio, inserzioni, spessori e rapporti con tutti i papillari. Il contesto ventricolare sezionato può presentare bordi di taglio visibili.
- L’apertura è temporizzata dall’ECG, non prodotta da gradienti. Nessuna validazione emodinamica o clinica indipendente.
- B-mode e M-mode sono sintetici. Non vengono simulati propagazione acustica, ombre costali fisiche, Doppler o flusso ematico. Le misure restano in unità dell’atlante.
- Lo scheletro deriva da un atlante, la cute da un modello distinto adattato. Postura, variabilità anatomica e sede delle finestre richiedono revisione.
- La revisione è mirata a coste e valvole. Non costituisce equivalenza qualitativa complessiva con Anatomy Learning, Complete Anatomy o EchoSuite, né completamento dei prompt avanzati.

## Fonti e confronto con gli atlanti professionali

- [Z-Anatomy, repository sorgente](https://github.com/Z-Anatomy/Models-of-human-anatomy), revisione fissata sopra: geometrie e attribuzioni.
- [OpenStax, gabbia toracica](https://openstax.org/books/anatomy-and-physiology-2e/pages/7-4-the-thoracic-cage): organizzazione in 12 coppie, sterno e rapporti cartilaginei.
- [OpenStax, ciclo cardiaco](https://openstax.org/books/anatomy-and-physiology/pages/19-3-cardiac-cycle): successione qualitativa di apertura/chiusura e ruolo delle pressioni; non giustifica i coefficienti grafici della simulazione.
- [Anatomy Learning, sito ufficiale](https://anatomylearning.com/): riferimenti a Netter, Gray e Sobotta. La pagina pubblica non permette di attribuire una specifica pipeline tecnica al prodotto.
- [Elsevier, fonti di Complete Anatomy](https://www.elsevier.support/complete-anatomy/answer/where-is-your-content-sourced): lavoro con esperti medici e artisti 3D, atlanti, immagini anatomiche, dati radiologici e revisione dei rapporti spaziali. È il riferimento per spiegare perché la qualità richiede geometrie curate e revisione anatomica, oltre a un motore grafico.

Le fonti dei prodotti proprietari sono usate per documentarne il metodo dichiarato; nessuna mesh o risorsa proprietaria di tali app è stata copiata.
