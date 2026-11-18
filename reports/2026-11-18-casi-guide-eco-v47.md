# Isoelettrica v47.0 — casi, guide, laboratorio Eco

Base: `main` e35f7ea (v46.2). Ramo `v47`. Nessun file esistente cancellato; `engine.js` e `data.js` invariati (hash verificati).

## Aggiunto
- `casi-dati-2.js`: 12 casi guidati nuovi, 50 decisioni. Si aggiungono a `ISO_CASI_DATI.CASI` senza modificare `casi-dati.js`.
- `casi-guide.js` e scheda **Guide** nei Casi clinici: 7 guide con sezioni, errori frequenti, collegamenti a casi e tracciati, fonti.
- `eco.js`, `eco.css`, scheda **Eco** (vedi README, sezione Laboratorio Eco).
- `tests/eco.test.cjs` (10 test); `tests/casi.test.cjs` e `tests/casi-ui.test.cjs` estesi (seconda serie, guide, 27 casi percorsi dal DOM).

## Revisione del torace (stessa giornata)
Su richiesta di Eliseo («la gabbia toracica fa schifo, vorrei qualcosa di anatomicamente accurato») le coste procedurali e il manichino sono stati sostituiti dal torace di Z-Anatomy, estratto con Blender (`bpy` 5.3) dalla stessa revisione e con la stessa trasformazione del cuore: rapporti cuore-scheletro dell'atlante, verificati dai test. Le viste parasternali partono ora tutte dalla finestra parasternale sinistra.

## Verifica di coerenza dell'Eco (stessa giornata)
Richiesta di Eliseo: «testa meglio che l'indagine a ultrasuoni della sonda sia coerente e mostri un'immagine realistica». Problemi trovati con misure e corretti:
- Scala sottostimata del 27% (anello aortico 1,8 cm, ventricolo 3,8 cm): ricalibrata su 8 cm apice endocardico–mitrale; ora anello aortico 2,3 cm, mitralico 3,4 cm, ventricolo 4,8–5,0 cm, torace osseo 31 cm.
- Asse lungo tagliato lungo una corda (asse geometrico eccentrico): proiezioni ridefinite dai punti di repere apice–mitrale–aorta/tricuspide.
- Setto 1,8 cm contro parete posteriore 1,0 (falso quadro di ipertrofia settale): correzione dichiarata della superficie settale del ventricolo destro; setto 0,6–1,0 cm.
- Assi corti con la sonda sullo sterno; viste apicali con la sonda sulla 6ª costa: finestre scelte fra le coste vere, fascio inclinato nel piano nelle apicali.
- Distanza delle valvole dal piano calcolata dalla sonda invece che dal piano: segno «Mercedes» ripristinato.
- Ombre costali, riflessione speculare dipendente dall'angolo, risoluzione laterale in profondità.
Test aggiunti: `tests/eco-coerenza.test.cjs` (6); strumento `tools/verifica-eco.py` sul fotogramma reale.

## Comandi dell'ecografo (stessa giornata)
Profondità, guadagno, calibro in cm e M-mode a schermo diviso; collegamento per ogni proiezione a un esame reale normale su Radiopaedia (solo link). Verificato nel browser: calibro di 5,00 cm su un segmento costruito di 5 cm, M-mode con setto e parete posteriore che si avvicinano in sistole, profondità 12 cm che ingrandisce il settore. Test aggiunto per i collegamenti (198 test Node).

## Fonti verificate in questa sessione
- ESC 2023 SCA: V3R/V4R e V7–V9 nell'infarto inferiore (classe I); soglia V7–V9 ≥ 0,5 mm; criteri di rischio molto alto e alto; niente pretrattamento P2Y12 di routine nell'NSTE-ACS con anatomia non nota (classe III); angioplastica entro 120 minuti; pacemaker se il blocco AV di alto grado non regredisce entro 5 giorni.
- ESC 2021 stimolazione: Mobitz 2, alto grado e III grado indicati indipendentemente dai sintomi; forma bradi-tachi sintomatica.
- ESC 2022 aritmie ventricolari: quadro di ripolarizzazione precoce (J ≥ 1 mm in due derivazioni contigue inferiori/laterali) distinto dalla sindrome.
- Resuscitation Council UK 2025 (dalle linee guida ERC 2025): ipotermia (tre scariche, adrenalina sospesa sotto 30 °C e ogni 6–10 min fra 30 e 35 °C, criteri di rischio, ECMO e punteggio HOPE); ipokaliemia (bolo solo in arresto).
- ASE/EACVI 2015: FE 52–72% (uomo), classi di riduzione; spessori 0,6–1,0 cm. ESC 2015: versamento lieve < 10, moderato 10–20, grande > 20 mm.

## Verifiche
- `npm test`: 198 test Node e 5 Python superati.
- Browser (Chrome senza GPU): i 12 casi nuovi percorsi fino al riepilogo senza errori; guide aperte con collegamenti funzionanti; Eco in tutte le proiezioni e i quadri, 60 fotogrammi al secondo, ciclo fermo fuori scheda.

## Aperto
- Revisione di un cardiologo (casi nuovi, guide, Eco).
- Prova su iPad reale (WebGL Safari, prestazioni dell'elaborazione in pixel).
- La pubblicazione richiede il consenso esplicito di Eliseo.
