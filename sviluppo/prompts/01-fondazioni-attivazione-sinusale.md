# PROMPT 1 — Fondazioni: orologio, regioni, attivazione sinusale fisiologica

Vale il brief permanente (`AGENTS.md`). Leggi `modelli/COSTANTI_CLINICHE.md` prima di scrivere numeri.

## Obiettivo

Costruire CardiacClock, la segmentazione regionale del mesh, il grafo del sistema di conduzione e la mappa di attivazione del ritmo sinusale, con fronte d'onda e isocrone visibili.

## Regioni (id stabili, usati da tutti i moduli futuri)

- Atrio destro: nodo seno-atriale (giunzione cava superiore-atrio, lungo la crista terminalis, subepicardico), crista terminalis, seno delle vene cave, auricola con muscoli pettinati, parete libera, setto interatriale (fossa ovale e limbo), istmo cavo-tricuspidale, triangolo di Koch, ostio del seno coronarico.
- Atrio sinistro: tetto, parete posteriore, antri delle 4 vene polmonari, auricola, cresta laterale sinistra (legamento di Marshall), setto, parete anteriore, vestibolo mitralico, regione del fascio di Bachmann.
- Ventricolo sinistro: 17 segmenti AHA (6 basali, 6 medi, 4 apicali, apice) + papillari anterolaterale e posteromediale + tratto di efflusso.
- Ventricolo destro: inlet, trabecolato apicale, infundibolo/RVOT, parete libera, setto destro, banda moderatrice, papillari anteriore, posteriore, settale (Lancisi).
- Setto: membranoso (componente atrioventricolare e interventricolare) e muscolare (inlet, trabecolare, outlet).

Se la geometria non separa una regione, assegna i vertici per prossimità e annotalo nel report.

## Grafo di conduzione (nodi con posizione 3D, archi con velocità)

NSA → vie internodali preferenziali (anteriore/Bachmann verso l'atrio sinistro, media, posteriore lungo la crista) → nodo AV (ingressi: via lenta postero-inferiore, via rapida antero-superiore; nodo compatto) → fascio di His (porzione penetrante e ramificante) → branca sinistra (fascicoli anteriore, posteriore, settale) → rete di Purkinje subendocardica del VS (capolinea: setto sinistro medio, base dei papillari, apice, pareti libere) e branca destra → banda moderatrice → papillare anteriore → parete libera del VD.

Velocità di default: NSA e nodo AV 0,02–0,05 m/s; miocardio atriale 0,8–1,0 m/s (Bachmann 1,5–2); His-Purkinje 2–4 m/s; miocardio ventricolare 0,3–0,5 m/s longitudinale, 0,15–0,2 trasversale. Refrattarietà di default: atri 200–270 ms, nodo AV 250–400 ms (decrementale: si allunga con la frequenza), ventricoli 250–300 ms, Purkinje 300–350 ms (il più lungo del sistema). Tutto nel file di costanti con range e fonte.

## Sequenza fisiologica da riprodurre a 70 bpm (misurata, non ispirata)

- Atri: partenza dal NSA, atrio destro prima, atrio sinistro via Bachmann; conclusione sull'auricola sinistra a 80–100 ms (durata della P).
- Ritardo nodale 60–90 ms, His-Purkinje 35–55 ms: PR 120–200 ms.
- Ventricoli (Durrer, Circulation 1970): prima attivazione endocardica in tre sedi del VS (superficie sinistra del setto, parasettale anteriore, parasettale posteriore) a 0–5 ms dall'onset del QRS; endocardio del VD a 5–10 ms presso l'inserzione del papillare anteriore; breakthrough epicardico sulla parete anteriore del VD a 15–20 ms; propagazione endocardio→epicardio e apice→base; ultime regioni: posterobasale del VS e cono polmonare/RVOT a 60–80 ms. Durata totale 80–100 ms.
- Ripolarizzazione: epicardio prima dell'endocardio (potenziale d'azione epicardico più breve), coerente con una T concordante; durata del potenziale d'azione ventricolare 250–300 ms con adattamento alla frequenza (restituzione).

## Visualizzazione

Sistema di conduzione come filamenti sottili luminosi percorsi dall'impulso; fronte di depolarizzazione come banda luminosa sul mesh, con dietro la regione refrattaria in colore smorzato; mappa delle isocrone (LAT) con scala tipo mappa elettroanatomica, attivabile dalla scheda Conduzione; la casella "Schema di conduzione" accende il grafo. Cursore verticale sul tracciato DII sincronizzato al frame.

## Accettazione

- A 70 bpm la P dura 80–100 ms.
- Il fronte ventricolare parte dal setto sinistro, raggiunge l'apice prima della base, finisce in posterobasale e RVOT entro 80 ms.
- Scarto tra onset QRS del motore e primo vertice attivato ≤ 1 frame.
- A ¼× la sequenza è leggibile a occhio.
- Il motore ECG risulta invariato (stesso hash dei file).
