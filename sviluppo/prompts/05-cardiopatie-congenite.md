# PROMPT 5 — Cuori patologici I: atlante delle cardiopatie congenite

Vale il brief permanente (`AGENTS.md`). Richiede i Prompt 1–4 completati.

## Obiettivo

Ogni cardiopatia congenita come "file di morfologia" che deforma la geometria base, imposta HemoModel, colora il flusso per saturazione, applica il preset ECG (come dati del motore) e mostra la propria correzione chirurgica come seconda morfologia.

## Modello dati

Analisi segmentaria sequenziale (Van Praagh/Anderson): situs (solitus, inversus, ambiguus), posizione (levo-, destro-, mesocardia), connessione atrioventricolare (concordante, discordante, doppio ingresso, assente destra/sinistra, ambigua), ansa ventricolare (D/L), connessione ventricolo-arteriosa (concordante, discordante, doppia uscita, uscita unica), lesioni associate, morfologia valvolare, pattern coronarico, connessioni venose; più: ipoplasia/dilatazione/ipertrofia per camera, difetti con sede e diametro, posizione dei grandi vasi, saturazioni attese per camera, Qp/Qs, soffio tipico, ECG atteso, storia naturale, complicanze, chirurgia con anatomia post-operatoria.

Sindromi associate come metadati: Down → canale AV; 22q11 → conotroncali; Turner → bicuspidia e coartazione; Williams → stenosi sopravalvolare; Noonan → stenosi polmonare; Holt-Oram → DIA; Alagille → stenosi polmonari periferiche; Marfan → radice aortica.

## Livello 1 (prima sessione, i più frequenti)

- DIV: perimembranoso, muscolare, inlet, outlet/sottoarterioso doppiamente committed, da malallineamento.
- DIA: ostium secundum, ostium primum, seno venoso superiore e inferiore, seno coronarico "unroofed"; forame ovale pervio.
- Dotto arterioso pervio.
- Stenosi polmonare: valvolare, infundibolare, sopravalvolare, dei rami.
- Tetralogia di Fallot: deviazione anterocefalica del setto infundibolare → stenosi sottopolmonare, aorta a cavaliere, DIV, ipertrofia VD; asse destro e ipertrofia VD all'ECG; cianosi proporzionale all'ostruzione; scenario "crisi ipossica" con shunt destro-sinistro che aumenta; varianti: Fallot rosa, con atresia polmonare e MAPCA, con assenza della valvola polmonare.
- Coartazione: preduttale, iuxtaduttale, con arco ipoplasico, collaterali.
- Stenosi aortica: bicuspide/unicuspide, sottovalvolare a membrana o a tunnel, sopravalvolare.
- Canale atrioventricolare: completo con Rastelli A/B/C, parziale, transizionale; asse superiore all'ECG.
- Trasposizione delle grandi arterie: d-TGA con/senza DIV, con ostruzione dell'efflusso sinistro; circuiti in parallelo con mescolamento solo a DIA/DIV/dotto.
- Sindrome del cuore sinistro ipoplasico.

## Livello 2

Trasposizione congenitamente corretta (l-TGA); ventricolo destro a doppia uscita (DIV sottoaortico, sottopolmonare/Taussig-Bing, doppiamente committed, remoto); tronco arterioso (Collett-Edwards I–IV); ritorno venoso polmonare anomalo totale (sopracardiaco, cardiaco, infracardiaco, misto) e parziale; anomalia di Ebstein; atresia tricuspidale; atresia polmonare a setto intatto e con DIV; ventricolo unico/doppio ingresso; interruzione dell'arco (A, B, C); cor triatriatum; complesso di Shone (anello sopramitralico, mitrale a paracadute, stenosi sottoaortica, coartazione); finestra aorto-polmonare; difetto di Gerbode; ventricolo destro a doppia camera; Uhl; non compattazione; stenosi mitralica congenita.

## Livello 3

Eterotassie (isomerismo destro/asplenia, sinistro/polisplenia), destrocardia e situs inversus, cuore criss-cross, ventricoli sovrapposti; anelli vascolari (doppio arco, arco destro con succlavia sinistra aberrante e diverticolo di Kommerell, sling polmonare, arteria lusoria); anomalie coronariche (ALCAPA/Bland-White-Garland con furto e flusso retrogrado, ARCAPA, origine anomala dal seno opposto con decorso interarterioso, coronaria unica, fistole); persistenza della cava superiore sinistra; cardiomiopatie genetiche pediatriche; blocco AV congenito; canalopatie come preset elettrici.

## Livello 4 (post-chirurgico, come seconda morfologia di ogni lesione)

Blalock-Taussig classico e modificato, Glenn bidirezionale, Fontan (classico, tunnel laterale, condotto extracardiaco: flusso venoso sistemico passivo ai polmoni senza ventricolo), Norwood (Sano/BT), switch arterioso (Jatene con manovra di LeCompte), switch atriale (Mustard/Senning), Rastelli, Ross, Damus-Kaye-Stansel, Konno, chiusura percutanea di DIA e dotto (occlusori), correzione del Fallot con patch transanulare (insufficienza polmonare e dilatazione VD tardive, blocco di branca destra).

## Flusso in ogni lesione

Particelle colorate per saturazione, direzione dello shunt calcolata dal gradiente istante per istante (sinistro-destro, destro-sinistro, bidirezionale, inversione di Eisenmenger quando le RVP superano le RVS), mescolamento visibile nelle sedi di comunicazione, Qp/Qs a schermo.

## Accettazione

- Ogni lesione carica in < 1 s e passa dalla morfologia nativa a quella riparata con transizione morph.
- Le saturazioni per camera coincidono con quelle attese dalla scheda.
- Il preset ECG arriva dal motore come dati.
- Ogni struttura anomala esiste nel dizionario (ductus arteriosus persistens, foramen ovale apertum…).
