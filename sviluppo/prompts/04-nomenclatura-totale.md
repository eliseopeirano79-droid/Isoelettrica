# PROMPT 4 — Nomenclatura totale: ogni struttura mai documentata ha un nome

Vale il brief permanente (`AGENTS.md`). Richiede il Prompt 1 completato; da completare prima di 5, 6, 7, 9.

## Obiettivo

Un dizionario unico, gerarchico e multiscala di tutte le strutture del cuore umano descritte nella letteratura anatomica, con mappatura a geometria o a hotspot, ricerca istantanea e scheda al tocco. Fonte primaria: Terminologia Anatomica FIPAT (capitolo Cor e vasi), integrata con Anderson (anatomia clinica), Carpentier (mitrale), AHA (segmenti), Van Praagh/Anderson (analisi segmentaria) per le varianti.

## Schema per voce (JSON)

`id`, latino TA, codice TA, italiano, inglese, eponimi/alias, categoria, definizione originale ≤ 40 parole, nota clinica ≤ 40 parole, collegamenti (patologie, aritmie, moduli in cui la struttura entra in gioco), mappatura: nome mesh tra le 32 strutture / sottomesh creata / hotspot ancorato alla superficie / "non rappresentabile" con motivo.

## Elenco minimo obbligatorio (aggiungi tutto ciò che la TA elenca e qui manca)

- **Superfici, margini, solchi**: faccia sternocostale, diaframmatica, polmonare; base, apice; margini destro, sinistro, inferiore; solco coronarico, interventricolare anteriore e posteriore, crux cordis, solco terminale, solco interatriale (Waterston-Sondergaard).
- **Atrio destro**: seno delle vene cave, auricola, muscoli pettinati, crista terminalis, tubercolo intervenoso di Lower, fossa ovale e limbo, valvola di Eustachio (cava inferiore), valvola di Tebesio (seno coronarico), rete di Chiari, ostio del seno coronarico, tendine di Todaro, triangolo di Koch, torus aorticus, istmo cavo-tricuspidale, vestibolo, orifizi delle cave.
- **Atrio sinistro**: parete liscia, ostii delle vene polmonari (4, con varianti: tronco comune sinistro, vena media destra), auricola con muscoli pettinati, cresta laterale sinistra e legamento/vena di Marshall, vestibolo, setto con valvola del forame ovale, fascio di Bachmann.
- **Ventricolo destro**: inlet, trabecolato apicale, outlet/infundibolo (cono arterioso); trabecole carnee, banda moderatrice (trabecola settomarginale), cresta sopraventricolare con banda parietale e settale, papillari anteriore, posteriore, settale (Lancisi); tendine dell'infundibolo.
- **Ventricolo sinistro**: inlet, apice, outlet a parete liscia; trabecole, falsi tendini; papillari anterolaterale e posteromediale (varianti a teste multiple).
- **Valvole e apparato sottovalvolare**: tutto il Prompt 3, incluse commissure, festoni, corde per ordine, noduli di Aranzio e di Morgagni, lunule, seni di Valsalva, giunzione sinotubulare, triangoli interlembo.
- **Setti**: interatriale (septum primum, septum secundum), interventricolare membranoso (parte AV e IV) e muscolare (inlet, trabecolare, outlet).
- **Scheletro fibroso**: anelli fibrosi, trigoni destro e sinistro, corpo fibroso centrale, setto membranoso, continuità aorto-mitralica, tendine di Todaro, tendine del cono.
- **Sistema di conduzione**: nodo seno-atriale (Keith-Flack) con la sua arteria, vie internodali (Bachmann, Wenckebach, Thorel), nodo AV (Tawara) con nodo compatto, cellule transizionali, estensioni nodali inferiori (via lenta), via rapida; fascio di His penetrante e ramificante; branca destra; branca sinistra con fascicoli anteriore, posteriore, settale; rete di Purkinje; vie accessorie solo come varianti patologiche: fasci di Kent, fibre di Mahaim (atriofascicolari), fibre di James, fibre di Brechenmacher.
- **Coronarie**: tronco comune, discendente anteriore con diagonali e settali, circonflessa con marginali ottusi, ramo intermedio (variante), coronaria destra con ramo del cono, arteria del nodo del seno (~60% destra / ~40% circonflessa), marginali acuti, rami ventricolari destri, arteria del nodo AV, discendente posteriore, rami posterolaterali; anello di Vieussens, arteria di Kugel; dominanza destra 70–85%, sinistra ~8–10%, codominanza 7–20%; ponte miocardico come variante.
- **Vene**: grande vena cardiaca (con vena interventricolare anteriore), vena cardiaca media, piccola vena cardiaca, vena posteriore del VS, vena marginale sinistra, vena obliqua dell'atrio sinistro (Marshall), seno coronarico con valvola di Vieussens alla confluenza e valvola di Tebesio all'ostio, vene cardiache anteriori (drenano direttamente nell'atrio destro), vene minime (Tebesio).
- **Grandi vasi**: radice e aorta ascendente, arco con tronco brachiocefalico, carotide comune sinistra, succlavia sinistra, istmo aortico, legamento arterioso (Botallo); tronco polmonare, arterie polmonari destra e sinistra; cave superiore e inferiore, arco dell'azygos, vene polmonari; persistenza della cava superiore sinistra come variante.
- **Pericardio**: fibroso, sieroso parietale e viscerale (epicardio), cavità, seno trasverso, seno obliquo, cuscinetti adiposi, legamenti sternopericardici e frenopericardici, nervi frenici in rapporto.
- **Innervazione**: plesso cardiaco superficiale e profondo, nervi cardiaci simpatici, rami cardiaci vagali, plessi gangliari epicardici (rilevanti per l'ablazione della fibrillazione atriale).
- **Strati e microstruttura** (schede senza geometria): epicardio, miocardio con eliche subendocardica destrorsa e subepicardica sinistrorsa e organizzazione laminare, endocardio; cardiomiocita, disco intercalare, giunzioni comunicanti (connessine 43, 40, 45), sarcomero, tubuli T, reticolo sarcoplasmatico.
- **Residui embrionali e varianti dell'adulto**: forame ovale pervio (~25%), rete di Chiari, valvola di Eustachio prominente, morfologie dell'auricola sinistra (chicken wing, windsock, cactus, cauliflower), bicuspidia aortica (1–2%), varianti dei papillari e della banda moderatrice.

Eponimi da includere almeno: Bachmann, Wenckebach, Thorel, Keith-Flack, Tawara, His, Purkinje, Kent, Mahaim, James, Brechenmacher, Todaro, Koch, Eustachio, Tebesio, Chiari, Lower, Marshall, Vieussens, Kugel, Valsalva, Aranzio, Morgagni, Lancisi, Botallo, Waterston, Sondergaard, Carpentier.

## UI

Ricerca istantanea con sinonimi e tolleranza agli errori; tocco sul mesh → scheda; scheda → "mostra nel 3D" (isola, evidenzia, volo di camera); hotspot a spillo per ciò che la geometria non separa (crista terminalis, fossa ovale, triangolo di Koch, Bachmann, istmo cavo-tricuspidale, banda moderatrice, setto membranoso, trigoni, Marshall, valvole di Eustachio e Tebesio, ostio del seno coronarico, giunzione sinotubulare, legamento arterioso…); sotto-strati nel pannello Esplora. La scheda "32 strutture separate" diventa "N nominate: X con geometria, Y con hotspot, Z solo in scheda".

## Accettazione

- Report di completezza contro la TA (voce per voce: presente / geometria / hotspot / solo scheda / mancante con motivo).
- Ogni modulo successivo usa solo gli id del dizionario.
- Nessuna voce senza definizione e nota clinica originali.
