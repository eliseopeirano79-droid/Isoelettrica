# PROMPT 2 — Ciclo cardiaco in 7 fasi, pannello Wiggers, parametri modificabili

Vale il brief permanente (`AGENTS.md`). Richiede il Prompt 1 completato.

## Obiettivo

HemoModel completo e un pannello "Ciclo" con le 7 fasi, ciascuna con i propri dati modificabili; ogni modifica si vede subito nel cuore 3D, nelle curve, nei suoni e nella pressione venosa giugulare.

## Modello

Elastanza tempo-variante per VS, VD, AS, AD (curva di attivazione a doppia Hill, temporizzata sugli eventi di CardiacClock: atri su onset P + ritardo elettromeccanico 40–60 ms, ventricoli su onset QRS + 30–50 ms); rilasciamento con costante di tempo tau 30–40 ms; curva pressione-volume telediastolica esponenziale (VS: 8–12 mmHg a 120 mL); valvole come diodi con resistenza di apertura, conduttanza di rigurgito e isteresi minima; Windkessel a 3 elementi sistemico e polmonare; ritorni venosi con modulazione respiratoria opzionale (inspirazione: ↑ ritorno destro, ↓ riempimento sinistro).

## Default adulto a riposo, 75 bpm (ciclo 800 ms), tutti editabili con range

1. **Sistole atriale**: inizia 40–60 ms dopo l'onset della P, dura ~100 ms; contribuisce al 15–25% del riempimento ventricolare (di più se il ventricolo è rigido); onda "a" giugulare; S4 se ventricolo rigido.
2. **Contrazione isovolumetrica**: dalla chiusura mitralica (onset QRS + 40–60 ms, S1) all'apertura aortica quando la pressione VS supera la diastolica aortica (~80 mmHg); durata 40–60 ms; volume costante = VTD 120 mL; dP/dt max 1500–2000 mmHg/s; onda "c" giugulare.
3. **Eiezione rapida**: ~100 ms; pressione VS fino a 120 mmHg; ~2/3 della gittata; velocità aortica 1,0–1,7 m/s; discesa "x".
4. **Eiezione ridotta**: ~150 ms; pressione in calo; termina alla chiusura aortica (incisura dicrota, S2, ≈ fine della T). Tempo di eiezione totale 250–320 ms.
5. **Rilasciamento isovolumetrico**: 60–90 ms, dalla chiusura aortica all'apertura mitralica quando la pressione VS scende sotto quella atriale (8–12 mmHg); volume costante = VTS 50 mL; onda "v".
6. **Riempimento rapido**: 100–130 ms; onda E mitralica 0,6–1,0 m/s, tempo di decelerazione 160–240 ms; 70–80% del riempimento; S3 in questa fase se presente (120–180 ms dopo S2); discesa "y".
7. **Diastasi**: ciò che resta del ciclo (~120–200 ms a 60–75 bpm), ~5% del riempimento; è la fase che si comprime per prima quando la frequenza sale e scompare oltre ~120 bpm, dove E e A si fondono.

Cuore destro: VD 25/4 mmHg, arteria polmonare 25/10 (media 15), AD media 2–6; la tricuspide chiude 20–30 ms dopo la mitrale (S1 = M1 poi T1); la polmonare apre prima dell'aortica (diastolica polmonare più bassa) e chiude dopo (S2 = A2 poi P2, sdoppiamento 30–80 ms in inspirazione); la tricuspide apre prima della mitrale.

Volumi: VS VTD 120 (100–150), VTS 50, gittata 70, FE 58%; VD VTD leggermente maggiore, FE 45–55%; atri 50–60 mL; gittata cardiaca = gittata × FC.

Resistenze e compliance: RVS 800–1200 dyn·s/cm⁵, RVP 100–200; compliance aortica 1,5–2 mL/mmHg, polmonare 4–5.

## Parametri globali modificabili

Frequenza (30–250), intervallo PR/ritardo AV, precarico (ritorno venoso → VTD), postcarico (RVS, compliance aortica), contrattilità (Emax VS default 2–3 mmHg/mL, VD 0,5–1), lusitropia (tau), contributo atriale on/off, resistenze e frazioni di rigurgito per valvola, conduttanze degli shunt, respirazione.

Relazioni da rispettare e rendere visibili: Frank-Starling (↑VTD → ↑gittata); ↑frequenza accorcia prima la diastasi e poi il riempimento rapido; ↑postcarico → ↑VTS, ↓gittata, contrazione isovolumetrica più lunga; ↑contrattilità → ↓VTS e dP/dt più ripido; perdita del calcio atriale → VTD −15–25%.

## Pannelli

- Curve di Wiggers (ECG dal motore, pressioni VS/AS/aorta e VD/AD/polmonare, volume VS, flussi transvalvolari, fonocardiogramma, giugulare con a-c-x-v-y) con cursore comune.
- Ansa pressione-volume VS e VD in tempo reale con ESPVR ed EDPVR.
- Tabella delle 7 fasi con inizio, durata, evento di apertura/chiusura, valori; ogni cella modificabile dove ha senso fisico.

## Suoni (Web Audio, sintetizzati, niente campioni)

S1 alla chiusura mitralica, S2 alla chiusura aortica con sdoppiamento respiratorio, S3 e S4 attivabili; soffi generati dalla turbolenza (flusso oltre soglia attraverso una resistenza): eiettivo crescendo-decrescendo, olosistolico in plateau, protodiastolico decrescente, rullio mesodiastolico con rinforzo presistolico solo se ritmo sinusale, continuo "a macchina".

Nel 3D: le dimensioni delle camere seguono i volumi del modello; le valvole seguono i gradienti (Prompt 3).

## Accettazione

- Gittata = VTD − VTS; GC = gittata × FC; FE coerenti.
- Ordine degli eventi sempre rispettato: chiusura mitralica → apertura aortica → chiusura aortica → apertura mitralica; T1 dopo M1, P2 dopo A2, polmonare apre prima dell'aortica, tricuspide apre prima della mitrale.
- A 150 bpm la diastasi è zero.
- L'ECG non cambia mai quando muovi un parametro emodinamico (è in sola lettura).
