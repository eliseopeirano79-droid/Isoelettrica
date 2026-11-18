"""Verifica del laboratorio Eco sul fotogramma reale: misura i pixel come un ecografista.

Avvia il sito (python3 -m http.server 8123 nella cartella del repository), poi:
    python3 tools/verifica-eco.py [http://127.0.0.1:8123/index.html]
Richiede Playwright con Chrome/Chromium. Ferma l'immagine in telediastole, traccia la linea standard
perpendicolare all'asse del ventricolo sinistro, legge il profilo di luminosità e separa sangue (scuro),
miocardio e pericardio (più brillante). Confronta con ASE/EACVI 2015 e salva le immagini con la linea."""
import asyncio, json, sys
import numpy as np
from playwright.async_api import async_playwright
URL = sys.argv[1] if len(sys.argv) > 1 else 'http://127.0.0.1:8123/index.html'
JS = """([z, mezza, orizz]) => {
  ISO_ECO._fase(0);
  const g = ISO_ECO._geo(), A = g.apE, M = g.mi, c = [A[0] + (M[0] - A[0]) * z, A[1] + (M[1] - A[1]) * z];
  let ax = [M[0] - A[0], M[1] - A[1]]; const l = Math.hypot(ax[0], ax[1]); ax = [ax[0] / l, ax[1] / l];
  let p = orizz ? [1, 0] : [-ax[1], ax[0]]; if (!orizz && p[1] < 0) p = [-p[0], -p[1]];
  const L = mezza * g.cmPx, tela = document.getElementById('ecoTela'), im = tela.getContext('2d').getImageData(0, 0, tela.width, tela.height).data, prof = [];
  for (let s = -L; s <= L; s += 0.5) { let v = 0, n = 0;
    for (let t = -2; t <= 2; t++) { const x = Math.round(c[0] + p[0] * s - p[1] * t), y = Math.round(c[1] + p[1] * s + p[0] * t); if (x < 0 || y < 0 || x >= tela.width || y >= tela.height) continue; v += im[(y * tela.width + x) * 4]; n++; }
    prof.push(n ? v / n : 0); }
  return { prof, pxCm: g.cmPx / 0.5, a: [c[0] - p[0] * L, c[1] - p[1] * L], b: [c[0] + p[0] * L, c[1] + p[1] * L] };
}"""
def segmenti(prof, pxcm):
    from numpy.lib.stride_tricks import sliding_window_view
    a = np.array(prof, float); k = max(3, int(pxcm * 0.25)) | 1
    m = np.median(sliding_window_view(np.pad(a, k // 2, mode='edge'), k), axis=1)
    lo, hi = np.percentile(m, 15), np.percentile(m, 85); th = (lo + hi) / 2
    tess = np.median(m[m > th]) if (m > th).any() else hi
    cls = np.where(m <= th, 'S', np.where(m > tess * 1.3, 'P', 'T'))   # S sangue, T miocardio, P pericardio/superficie brillante
    out, i = [], 0
    while i < len(cls):
        j = i
        while j < len(cls) and cls[j] == cls[i]: j += 1
        out.append((str(cls[i]), (j - i) / pxcm)); i = j
    return [(t, l) for t, l in out if l > 0.12]
async def main():
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'])
        pg = await (await b.new_context(viewport={'width': 1366, 'height': 1024}, service_workers='block')).new_page()
        await pg.goto(URL); await pg.wait_for_timeout(1200)
        await pg.click('#nav button[data-v="eco"]')
        for _ in range(60):
            await pg.wait_for_timeout(400)
            if await pg.evaluate("document.getElementById('v-eco').dataset.pronto==='1'"): break
        await pg.click('#ecoEt'); await pg.click('#ecoPausa'); await pg.wait_for_timeout(1500)
        ris = {}
        for vista, z, mezza, orizz in [('plax', 0.6, 7, False), ('plax', 0.7, 7, False), ('psax-pm', 0.5, 6, True)]:
            await pg.evaluate(f"ISO_ECO.vista('{vista}')"); await pg.evaluate("ISO_ECO._fase(0)"); await pg.wait_for_timeout(700)
            r = await pg.evaluate(JS, [z, mezza, orizz]); seg = segmenti(r['prof'], r['pxCm'])
            ris[f'{vista}@{z}'] = seg
            print(f'{vista:8} z={z}:', ' '.join(f'{t}{l:.2f}' for t, l in seg))
            el = await pg.query_selector('#ecoTela'); await el.screenshot(path=f'verifica-eco-{vista}-{z}.png')
        await b.close()
    seg = ris['plax@0.6']; pos, x = [], 0.0
    for t, l in seg: pos.append((t, x, x + l)); x += l
    meta = x / 2; i = next(k for k, (t, a0, a1) in enumerate(pos) if t == 'S' and a0 <= meta <= a1)   # cavità del VS: il sangue al centro della linea
    lvid = pos[i][2] - pos[i][1]; ivs = 0.0; k = i - 1
    while k >= 0 and pos[k][0] != 'S': ivs += pos[k][2] - pos[k][1]; k -= 1                     # setto: tutto il tessuto fino alla cavità del VD
    pw = 0.0; k = i + 1
    while k < len(pos) and pos[k][0] == 'T': pw += pos[k][2] - pos[k][1]; k += 1                # parete posteriore: miocardio, escluso il pericardio brillante
    print(f'\nAsse lungo z=0,6 (fotogramma): setto {ivs:.2f} cm · VS telediastolico {lvid:.2f} cm · parete posteriore {pw:.2f} cm')
    ok = 4.2 <= lvid <= 5.8 and 0.4 <= ivs <= 1.4 and 0.5 <= pw <= 1.5
    print('ESITO:', 'nei limiti (ASE/EACVI 2015, con tolleranza di risoluzione)' if ok else 'FUORI DAI LIMITI'); sys.exit(0 if ok else 1)
asyncio.run(main())
