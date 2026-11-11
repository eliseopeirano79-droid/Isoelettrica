#!/usr/bin/env python3
"""Seleziona dal catalogo PTB-XL locale i tracciati per la modalità «ECG reali» dei Casi clinici.
Criteri: validato da un cardiologo, senza artefatti segnalati, età nota, una sola
diagnosi principale con probabilità 100 e nessun'altra affermazione diagnostica.
Uso: python3 tools/build-casi-reali.py   (scrive casi-reali.js)"""
import json, os
qui = os.path.join(os.path.dirname(__file__), '..')
d = json.load(open(os.path.join(qui, 'atlante-reale', 'indice.json')))
RIT = {'SR', 'STACH', 'SBRAD', 'SARRH'}
# classe: (codici principali, altri codici ammessi, il codice principale è un ritmo)
CL = {'NORM': (['NORM'], {'SR'}, False), 'AFIB': (['AFIB'], set(), True), 'AFLT': (['AFLT'], set(), True), 'SVT': (['PSVT', 'SVTAC'], set(), True),
      'STACH': (['STACH'], {'NORM'}, True), 'SBRAD': (['SBRAD'], {'NORM'}, True), '1AVB': (['1AVB'], RIT | {'LPR'}, False),
      'CRBBB': (['CRBBB'], RIT, False), 'CLBBB': (['CLBBB'], RIT, False), 'LAFB': (['LAFB'], RIT, False), 'WPW': (['WPW'], RIT, False),
      'PVC': (['PVC'], RIT | {'NORM'}, False), 'PACE': (['PACE'], set(), True), 'LVH': (['LVH'], RIT | {'VCLVH', 'HVOLT'}, False),
      'IMI': (['IMI'], RIT | {'QWAVE'}, False), 'ASMI': (['ASMI'], RIT | {'QWAVE'}, False)}
PER_CLASSE = 6
casi = []
for k, (main, extra, ritmo) in CL.items():
    ok = []
    for id, age, sex, codes, val, sec, noisy in d['records']:
        if not val or noisy or not isinstance(age, int) or age < 18 or sex not in ('0', '1'): continue
        ks = set(codes); m = [c for c in main if c in ks]
        if not m or ks - set(main) - extra: continue
        if not ritmo and any(codes[c] != 100.0 for c in m): continue
        if k in ('STACH', 'SBRAD') and codes.get('NORM', 100.0) != 100.0: continue
        ok.append((not sec, id, age, sex, sorted(ks)))
    ok.sort()                                   # prima quelli con seconda opinione, poi per numero
    passo = max(1, len(ok) // PER_CLASSE)       # distribuiti lungo il database
    for _, id, age, sex, ks in ([x for x in ok if not x[0]] + [x for x in ok if x[0]][::passo])[:PER_CLASSE]:
        casi.append([id, age, 'M' if sex == '0' else 'F', k, ks])
casi.sort(key=lambda x: x[0])                # ordine per numero: l'elenco non rivela i gruppi diagnostici
usati = sorted({c for x in casi for c in x[4]})
nomi = {c: d['codes'][c]['name'] for c in usati}
testa = open(os.path.join(qui, 'tools', 'casi-reali-banca.js'), encoding='utf-8').read()
corpo = 'const CASI = ' + json.dumps(casi, ensure_ascii=False, separators=(',', ':')) + ';\nconst CODICI = ' + json.dumps(nomi, ensure_ascii=False, separators=(',', ':')) + ';\n'
open(os.path.join(qui, 'casi-reali.js'), 'w', encoding='utf-8').write(testa.replace('/*__DATI__*/', corpo))
import collections; print(len(casi), dict(collections.Counter(x[3] for x in casi)))
