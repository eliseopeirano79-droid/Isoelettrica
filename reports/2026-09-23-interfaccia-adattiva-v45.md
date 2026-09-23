# Interfaccia adattiva · v45.0

## Richiesta e risultato

Correzione dei cinque punti segnalati il 23 settembre: Teoria adattabile, tema coerente a schermo intero, più spazio al cuore, uniformità tra Anatomia e Fisiologia, menu ispirati all’interfaccia Apple.

- Teoria ha una misura comune e fluida per titoli, paragrafi, elenchi, tabelle e strumenti interattivi. Testo 16–19 px, larghezza massima 1100 px, capitoli scorrevoli sul telefono. Il contenuto clinico non è stato riscritto.
- Il contenitore di Teoria e il backdrop fullscreen ricevono esplicitamente colori e sfondo del tema. La classe della modalità lettura non collide più con quella delle finestre ECG.
- Anatomia usa tutta la larghezza disponibile. Titolo e barra inferiore sono compatti: lo spazio destinato al modello aumenta anche a 1280×720. Un comando condiviso ingrandisce il cuore adulto, la circolazione fetale e la vista di Fisiologia senza ricreare la scena. Pulsante Esci ed Esc ripristinano il laboratorio. Dove la Fullscreen API non è disponibile, una modalità nell’intera finestra dell’app resta utilizzabile.
- Pannelli, schede, interruttori, dettagli espandibili, bordi, tipografia e colori sono comuni ai laboratori. Materiali anatomici, geometrie, cuore di riferimento e vettori non sono stati modificati.
- Menu desktop con superficie morbida, selezione marcata, ricerca per elenchi di almeno 12 opzioni, tastiera, opzioni disabilitate e ritorno del focus. Il select originale conserva valori ed eventi; i dispositivi touch mantengono il selettore nativo della piattaforma.

I principi di menu contestuali al controllo e selezioni riconoscibili fanno riferimento alle [Apple Human Interface Guidelines — Menus](https://developer.apple.com/design/human-interface-guidelines/menus). Si tratta di uno stile web ispirato ad Apple, non di componenti nativi macOS.

## File e architettura

Nuovi moduli `ui-surface.css`, `ui-surface.js`, `lab-ui.js`; collegamenti nelle pagine principale, Fisiologia, Anatomia e circolazione fetale. `anatomy-host.js` gestisce solo l’espansione del frame; `app.js` separa la classe della modalità lettura. Cache e riferimenti degli asset passano a v45.0. Nessuna dipendenza aggiunta.

## Verifiche

- Suite completa: 145 test Node e 5 Python superati, inclusi ECG, ST, audit e hash protetti.
- Cinque nuove prove comportamentali: ricerca/selezione/eventi del menu; tastiera/annullamento/opzioni dinamiche; fallback touch; tema e contenuto di Teoria durante fullscreen; ingresso e uscita dalla vista cuore senza Fullscreen API e senza ricreare il canvas.
- Prova offline estesa ai tre nuovi asset; controlli UI/cache rieseguiti dopo gli ultimi aggiornamenti.
- I sette hash protetti di STATO.md coincidono; tutti gli script inline di Fisiologia sono identici alla v44, compreso il cuore di riferimento e il codice dei vettori.
- Verifica nel browser a 1920×1080, 1440×900, 1280×720, 1024×768 e 390×844. Controllati i temi chiaro/scuro, Teoria a schermo intero, Anatomia e Fisiologia a schermo intero, selezione ricercata di Tronco polmonare, rientro ai pannelli e navigazione. Nessun errore console rilevato nella verifica finale.
- Anteprime in `outputs/` della cartella di lavoro: `v45-cuore-schermo-intero.png`, `v45-teoria-adattiva.png`.

## Limiti e verifica rapida

Le dimensioni tablet/telefono sono state verificate ridimensionando il browser; non è un collaudo su iPad o iPhone fisici né con VoiceOver. Nei browser senza fullscreen il cuore riempie la finestra dell’app, non nasconde l’interfaccia del sistema. Le funzioni cliniche ancora aperte nel kit restano aperte.

In 30 secondi: aprire Teoria in tema chiaro → Schermo intero → Esci; aprire Anatomia → Schermo intero → Esci; aprire il menu Struttura e cercare «polmonare»; confrontare i controlli con Fisiologia.
