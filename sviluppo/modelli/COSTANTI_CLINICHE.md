# COSTANTI CLINICHE — valori di riferimento citati nei prompt

Valori di default per adulto a riposo (salvo indicazione), con range e fonte da consultare. Ogni cifra va confermata sulla fonte prima di entrare nel file di costanti del codice; se una fonte più recente o più autorevole dà un valore diverso, si usa quello e si annota qui la discrepanza. Le fonti indicate sono opere da consultare, non citazioni testuali: nel codice va il numero con la sua fonte, mai un testo copiato.

Fonti abbreviate: **GH** Guyton & Hall, Textbook of Medical Physiology · **BR** Braunwald's Heart Disease · **JO** Josephson's Clinical Cardiac Electrophysiology · **ZJ** Zipes & Jalife, Cardiac Electrophysiology: From Cell to Bedside · **DU** Durrer et al., Circulation 1970;41:899 · **GR** Grossman & Baim's Cardiac Catheterization · **KL** Klabunde, Cardiovascular Physiology Concepts · **OT** Otto, Textbook of Clinical Echocardiography · **ASE** linee guida ASE (quantificazione delle camere 2015; funzione diastolica 2016) · **AN** Anderson, Cardiac Anatomy · **CA** Carpentier, Reconstructive Valve Surgery · **RU** Rudolph, Congenital Diseases of the Heart · **PA** Park's Pediatric Cardiology for Practitioners · **ESC/AHA** documenti di consenso sulle definizioni delle aritmie.

## Conduzione ed elettrofisiologia

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| Velocità di conduzione, nodo seno-atriale e nodo AV | 0,03 m/s | 0,02–0,05 | GH, JO |
| Velocità, miocardio atriale | 0,9 m/s | 0,8–1,0; fascio di Bachmann 1,5–2 | JO, ZJ |
| Velocità, His-Purkinje | 3 m/s | 2–4 | GH |
| Velocità, miocardio ventricolare longitudinale | 0,4 m/s | 0,3–0,5 | ZJ |
| Velocità, miocardio ventricolare trasversale | 0,17 m/s | 0,15–0,2 (anisotropia ~3:1) | ZJ |
| Periodo refrattario effettivo, atri | 230 ms | 200–270 | JO |
| Periodo refrattario effettivo, nodo AV | 320 ms | 250–400; decrementale, si allunga con la frequenza | JO |
| Periodo refrattario effettivo, ventricoli | 270 ms | 250–300 a 70 bpm | JO |
| Periodo refrattario, Purkinje | 320 ms | 300–350; il più lungo del sistema | JO |
| Durata del potenziale d'azione ventricolare | 280 ms | 250–300; si accorcia con la frequenza (restituzione) | ZJ |
| Durata del potenziale d'azione atriale | 180 ms | 150–200 | ZJ |
| Onda P | 90 ms | 80–100 (patologica > 120) | ESC/AHA |
| Intervallo PR | 160 ms | 120–200 | ESC/AHA |
| Intervallo AH (conduzione nodale) | 90 ms | 60–125 | JO |
| Intervallo HV (His-Purkinje) | 45 ms | 35–55 | JO |
| Durata del QRS | 90 ms | 80–100 (patologico ≥ 120) | ESC/AHA |
| QT corretto | 400 ms | 350–440 (uomo), fino a 460 (donna) | ESC/AHA |
| Attivazione ventricolare: prime sedi endocardiche del VS | 0–5 ms dall'onset del QRS | setto sinistro, parasettale anteriore e posteriore | DU |
| Attivazione: endocardio del VD | 5–10 ms | presso il papillare anteriore | DU |
| Attivazione: breakthrough epicardico del VD | 15–20 ms | parete anteriore | DU |
| Attivazione: ultime regioni (posterobasale VS, cono polmonare) | 60–80 ms | — | DU |
| Ritardo elettromeccanico atriale | 50 ms | 40–60 | BR, OT |
| Ritardo elettromeccanico ventricolare | 40 ms | 30–50 | BR |
| Onset QRS → chiusura mitralica (S1) | 50 ms | 40–60 | OT |
| Periodo di pre-eiezione | 100 ms | 80–120 | OT |

## Ciclo cardiaco (75 bpm, ciclo 800 ms)

| Fase | Durata di default | Note | Fonte |
|------|-------------------|------|-------|
| 1. Sistole atriale | 100 ms | inizia 40–60 ms dopo l'onset P; 15–25% del riempimento (30–40% se ventricolo rigido) | GH, KL |
| 2. Contrazione isovolumetrica | 50 ms | 40–60; da chiusura mitralica ad apertura aortica | GH, KL |
| 3. Eiezione rapida | 100 ms | ~2/3 della gittata | GH, KL |
| 4. Eiezione ridotta | 150 ms | fino alla chiusura aortica (incisura dicrota, ≈ fine T) | GH, KL |
| 5. Rilasciamento isovolumetrico | 80 ms | 60–90 | GH, ASE |
| 6. Riempimento rapido | 120 ms | 100–130; 70–80% del riempimento | GH, ASE |
| 7. Diastasi | 200 ms | 120–200 a 60–75 bpm; ~5% del riempimento; zero oltre ~120 bpm | GH, KL |
| Tempo di eiezione VS | 300 ms | 250–320 | OT |
| Tempo di rilasciamento isovolumetrico (IVRT) | 75 ms | 60–90 | ASE |
| Onda E mitralica (velocità di picco) | 0,8 m/s | 0,6–1,0 | ASE |
| Onda A mitralica (velocità di picco) | 0,55 m/s | 0,4–0,7; E/A 1–2 | ASE |
| Tempo di decelerazione dell'onda E | 200 ms | 160–240 | ASE |
| Velocità aortica di picco | 1,3 m/s | 1,0–1,7; LVOT 0,8–1,2 | ASE |
| Fusione di E e A | > 120 bpm | — | OT |
| T1 dopo M1 | 25 ms | 20–30 | BR |
| Sdoppiamento inspiratorio di S2 (A2–P2) | 50 ms | 30–80 | BR |
| S3 dopo A2 | 150 ms | 120–180 | BR |
| Costante di tempo del rilasciamento (tau) | 35 ms | 30–40 | GR |
| dP/dt max del VS | 1700 mmHg/s | 1500–2000 | GR |

## Pressioni (mmHg)

| Sede | Default | Range / note | Fonte |
|------|---------|--------------|-------|
| VS sistolica / telediastolica | 120 / 10 | telediastolica 8–12 | GR, BR |
| Aorta sistolica / diastolica / media | 120 / 80 / 93 | — | GR |
| Atrio sinistro media | 8 | onda a 10, onda v 12 | GR |
| VD sistolica / telediastolica | 25 / 4 | telediastolica 0–8 | GR |
| Arteria polmonare sistolica / diastolica / media | 25 / 10 / 15 | media 10–20 | GR |
| Atrio destro media | 4 | 2–6; onda a 6, onda v 5 | GR |

## Volumi e funzione

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| VS volume telediastolico | 120 mL | 100–150 | ASE |
| VS volume telesistolico | 50 mL | 40–60 | ASE |
| Gittata sistolica | 70 mL | 60–80 | BR |
| Frazione di eiezione VS | 58% | 55–70 | ASE |
| VD volume telediastolico | 135 mL | 130–150 | ASE |
| Frazione di eiezione VD | 50% | 45–55 | ASE |
| Volume atriale (ciascuno) | 55 mL | 50–60 | ASE |
| Gittata cardiaca | 5,25 L/min | 4,5–6; indice 2,5–4 L/min/m² | BR |
| Emax (elastanza telesistolica) VS | 2,5 mmHg/mL | 2–3 | KL, Suga-Sagawa |
| Emax VD | 0,7 mmHg/mL | 0,5–1,0 | KL |
| Contributo atriale al riempimento | 20% | 15–25; 30–40 se ventricolo rigido | GH |
| Perdita del calcio atriale (fibrillazione) | VTD −20% | −15–25 | GH, BR |

## Resistenze e compliance

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| Resistenze vascolari sistemiche | 1000 dyn·s/cm⁵ | 800–1200 (1 unità Wood = 80) | GR |
| Resistenze vascolari polmonari | 150 dyn·s/cm⁵ | 100–200 (< 2,5 unità Wood) | GR |
| Compliance aortica | 1,75 mL/mmHg | 1,5–2 | KL |
| Compliance arteriosa polmonare | 4,5 mL/mmHg | 4–5 | KL |

## Valvole

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| Area mitralica | 5 cm² | 4–6 | CA, OT |
| Lunghezza di coaptazione mitralica | 9 mm | 8–10 | CA |
| Riduzione sistolica dell'anello mitralico | 25% | 20–30 | CA |
| Anello tricuspidale rispetto al mitralico | 8 mm più apicale | 5–10 (Ebstein: > 8 mm/m²) | AN, OT |
| Area aortica | 3,5 cm² | 3–4 | OT |
| Apertura della valvola aortica | 25 ms | 20–30 | BR |
| Chiusura della valvola aortica | 30 ms | volume di chiusura 1–3% della gittata | BR |
| Bicuspidia aortica: fusione più comune | destra-sinistra | ~70–80% dei casi | BR |
| Prevalenza bicuspidia aortica | 1–2% | — | BR |

## Aritmie

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| Fibrillazione atriale, frequenza atriale | 450/min | 350–600 (6–10 Hz) | ESC/AHA, JO |
| Flutter atriale tipico | 300/min | 250–350 | ESC/AHA |
| Fibrillazione ventricolare | 5 Hz | 4–7 Hz (240–420/min) | ZJ |
| Flutter ventricolare | 300/min | 250–350 | ESC/AHA |
| Scappamento giunzionale | 50/min | 40–60 | ESC/AHA |
| Scappamento ventricolare | 30/min | 20–40 | ESC/AHA |
| Ritmo idioventricolare accelerato | 80/min | 60–100 | ESC/AHA |
| Tachicardia ventricolare | 170/min | > 100, tipicamente 130–220 | ESC/AHA |
| AVNRT tipica: intervallo VA (RP) | < 70 ms | atri e ventricoli quasi simultanei | JO |
| AVRT ortodromica: intervallo VA (RP) | > 70 ms | — | JO |
| Vie accessorie: laterale sinistra | 55% | 50–60 | JO, BR |
| Vie accessorie: posterosettale | 25% | 20–30 | JO, BR |
| Vie accessorie: parete libera destra | 15% | 10–20 | JO, BR |
| Vie accessorie: anterosettale | 7% | 5–10 | JO, BR |
| Velocità nell'auricola sinistra: soglia di stasi | < 20 cm/s | normale > 40 | OT |
| Rigurgito mitralico diastolico | PR > 300 ms | anche nel blocco AV completo | OT |

## Coronarie

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| Dominanza destra | 80% | 70–85 | BR, AN |
| Dominanza sinistra | 9% | 8–10 | BR, AN |
| Codominanza | 10% | 7–20 secondo la definizione | BR, AN |
| Arteria del nodo del seno dalla coronaria destra | 60% | il resto dalla circonflessa | AN |
| Arteria del nodo AV dalla coronaria dominante | 90% | — | AN |
| Ramo intermedio presente | 25% | 20–30 | AN |
| Flusso coronarico a riposo | 250 mL/min | 4–5% della gittata cardiaca; prevalentemente diastolico a sinistra | GH |

## Circolazione fetale e neonatale

| Grandezza | Default | Range / note | Fonte |
|-----------|---------|--------------|-------|
| Saturazione, vena ombelicale | 82% | 80–85 | RU |
| Saturazione, cava inferiore (mista) | 70% | 67–72 | RU |
| Saturazione, atrio sinistro / aorta ascendente | 65% | — | RU |
| Saturazione, VD / arteria polmonare | 55% | — | RU |
| Saturazione, aorta discendente | 60% | — | RU |
| Quota di sangue ombelicale che salta il fegato (dotto venoso) | 40% | 30–50 | RU |
| Quota dell'uscita del VD che passa dal dotto arterioso | 75% | 60–90 secondo la fonte (dichiararla) | RU |
| Gittata combinata fetale | 450 mL/kg/min | VD 55–60% | RU |
| Frequenza cardiaca fetale | 140/min | 110–160 | RU |
| Chiusura funzionale del dotto arterioso | 10–15 h | fino a 72 h; anatomica 2–3 settimane | RU, PA |
| Chiusura del forame ovale | funzionale alla nascita | anatomica in mesi; pervio nel ~25% degli adulti | PA, BR |
| Chiusura del dotto venoso | giorni | anatomica 1–3 settimane | RU |
| ECG neonatale: frequenza | 140/min | 120–160 | PA |
| ECG neonatale: asse del QRS | +135° | +60/+180 | PA |
| ECG neonatale: T in V1 | negativa dal 7° giorno | resta negativa fino a ~8 anni; positiva dopo il 7° giorno = ipertrofia VD | PA |
| ECG neonatale: PR / QRS | 100 / 60 ms | PR 80–150, QRS 40–80 | PA |

## Varianti anatomiche

| Variante | Prevalenza | Fonte |
|----------|------------|-------|
| Forame ovale pervio nell'adulto | ~25% | BR (serie autoptiche) |
| Persistenza della cava superiore sinistra | 0,3–0,5% (3–10% nelle cardiopatie congenite) | BR |
| Rete di Chiari | 2–3% | AN |
| Ponte miocardico (angiografico) | 1–5% (autoptico molto più alto) | BR |
