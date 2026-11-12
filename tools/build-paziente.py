#!/usr/bin/env python3
"""Costruisce paziente-corpo.bin dalla mesh base di MakeHuman (CC0).
Uso: corpo.py <cartella data di makehuman> <file di uscita>
Contiene: 4 varianti di forma (uomo/donna, giovane/anziano), scheletro ridotto,
pesi di skinning (4 per vertice), facce divise per materiale."""
import json, sys, struct, collections, numpy as np
src, out = sys.argv[1], sys.argv[2]
V = []; F = collections.defaultdict(list); cur = None
for l in open(src + '/3dobjs/base.obj'):
    if l.startswith('v '): V.append([float(x) for x in l.split()[1:4]])
    elif l.startswith('g '): cur = l.split()[1]
    elif l.startswith('f '): F[cur].append([int(t.split('/')[0]) - 1 for t in l.split()[1:]])
V = np.array(V)
sk = json.load(open(src + '/rigs/default.mhskel')); W = json.load(open(src + '/rigs/default_weights.mhw'))['weights']
B = sk['bones']; J = sk['joints']
KEEP = ['root', 'pelvis.L', 'pelvis.R', 'upperleg01.L', 'upperleg01.R', 'lowerleg01.L', 'lowerleg01.R', 'foot.L', 'foot.R',
        'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'neck01', 'head', 'jaw', 'orbicularis03.L', 'orbicularis03.R',
        'clavicle.L', 'clavicle.R', 'shoulder01.L', 'shoulder01.R', 'upperarm01.L', 'upperarm01.R', 'lowerarm01.L', 'lowerarm01.R', 'wrist.L', 'wrist.R']
for k in KEEP: assert k in B, k
def kept(n):
    while n not in KEEP: n = B[n]['parent']
    return n
parent = [-1 if B[k]['parent'] is None else KEEP.index(kept(B[k]['parent'])) for k in KEEP]
# vertici usati: corpo, occhi, capelli
grp = {'pelle': F['body'], 'occhi': F['helper-l-eye'] + F['helper-r-eye'], 'capelli': F['helper-hair']}
used = sorted({i for fs in grp.values() for f in fs for i in f}); remap = {o: n for n, o in enumerate(used)}; N = len(used)
wt = np.zeros((len(V), len(KEEP)))
for bone, lst in W.items():
    k = KEEP.index(kept(bone))
    for i, w in lst: wt[i, k] += w
wt = wt[used]; s = wt.sum(1); assert (s > 0).all(), 'vertici senza peso: %d' % (s == 0).sum()
idx = np.argsort(-wt, 1)[:, :4]; w4 = np.take_along_axis(wt, idx, 1); w4 /= w4.sum(1, keepdims=True)
dom = idx[:, 0]
CAMICE = {KEEP.index(k) for k in ['root', 'pelvis.L', 'pelvis.R', 'spine05', 'spine04', 'spine03', 'spine02', 'spine01', 'clavicle.L', 'clavicle.R', 'shoulder01.L', 'shoulder01.R', 'upperarm01.L', 'upperarm01.R', 'upperleg01.L', 'upperleg01.R']}
def tri(fs):
    o = []
    for f in fs:
        f = [remap[i] for i in f]
        o += [f[0], f[1], f[2]] + ([f[0], f[2], f[3]] if len(f) == 4 else [])
    return o
# camice: tronco fino alla base del collo e maniche fino a metà braccio, con bordi tagliati per geometria
# (anelli puliti) e non per osso dominante, che dava bordi seghettati
def G0(nome): return V[J[B[nome]['head']]].mean(0)
ycollo = G0('neck01')[1] - 0.05
BR = {KEEP.index('upperarm01.' + l): (G0('upperarm01.' + l), G0('lowerarm01.' + l)) for l in 'LR'}
def camice_v(i):
    k = dom[remap[i]]; v = V[i]
    if k in BR:
        a, b = BR[k]; return np.dot(v - a, b - a) / np.dot(b - a, b - a) < 0.5
    return k in CAMICE and v[1] < ycollo
CAMICE = CAMICE - set(BR)
pelle = [f for f in grp['pelle'] if not all(camice_v(i) for i in f)]
camice = [f for f in grp['pelle'] if all(camice_v(i) for i in f)]
ycapo = np.mean(V[J[B['head']['head']]], 0)[1]; zcapo = np.mean(V[J[B['head']['head']]], 0)[2]
# la mesh dei capelli ha una frangia che copre il viso: si tengono solo le facce dietro la linea della fronte
grp['capelli'] = [f for f in grp['capelli'] if not (max(V[i][2] for i in f) > zcapo + 0.62 and min(V[i][1] for i in f) < ycapo + 1.25)]
# capelli corti: la cute del capo sopra l'attaccatura (fronte alta, sopra le orecchie, nuca), non la mesh dei capelli lunghi
TESTA = KEEP.index('head')
def scalpo(i): return dom[remap[i]] == TESTA and (V[i][1] - ycapo) > 0.25 + 0.43 * (V[i][2] - zcapo + 0.65)
corti = [f for f in grp['pelle'] if all(scalpo(i) for i in f)]
pelle = [f for f in pelle if not all(scalpo(i) for i in f)]
gruppi = collections.OrderedDict([('pelle', tri(pelle)), ('camice', tri(camice)), ('occhi', tri(grp['occhi'])), ('capelli', tri(grp['capelli'])), ('capelliCorti', tri(corti))])
def variante(nome):
    P = V.copy()
    if nome:
        for l in open(src + '/targets/macrodetails/universal-%s-averagemuscle-averageweight.target' % nome):
            if l.strip() and l[0] != '#': a = l.split(); P[int(a[0])] += [float(x) for x in a[1:4]]
    joints = np.array([P[J[B[k]['head']]].mean(0) for k in KEEP])
    ancore = {k: P[J[B[k]['tail']]].mean(0).tolist() for k in ['wrist.L', 'wrist.R', 'head', 'lowerarm01.L', 'lowerarm01.R', 'upperarm01.L', 'upperarm01.R', 'lowerleg01.L', 'lowerleg01.R']}
    return P[used].astype('<f4'), joints.astype('<f4'), ancore
VAR = collections.OrderedDict((k, variante(v)) for k, v in [('M', 'male-young'), ('Mv', 'male-old'), ('F', 'female-young'), ('Fv', 'female-old')])
blobs = []; pos = 0
def add(a):
    global pos
    b = a.tobytes(); o = pos; blobs.append(b); pos += len(b); pad = (-pos) % 4
    if pad: blobs.append(b'\0' * pad); pos += pad
    return [o, len(b)]
H = {'origine': 'MakeHuman base mesh, default skeleton, macro targets — CC0 1.0', 'unita': 'dm', 'n': N, 'ossa': KEEP, 'genitori': parent, 'varianti': {}, 'gruppi': {}}
for k, (P, Jn, an) in VAR.items(): H['varianti'][k] = {'pos': add(P), 'giunti': add(Jn), 'ancore': an}
for k, t in gruppi.items(): H['gruppi'][k] = add(np.array(t, '<u2'))
H['indici'] = add(idx.astype('u1')); H['pesi'] = add(np.round(w4 * 255).astype('u1'))
hj = json.dumps(H, separators=(',', ':')).encode(); hj += b' ' * ((-len(hj)) % 4)
open(out, 'wb').write(struct.pack('<4sI', b'ISOP', len(hj)) + hj + b''.join(blobs))
print('vertici', N, 'ossa', len(KEEP), {k: len(t) // 3 for k, t in gruppi.items()}, 'byte', 8 + len(hj) + pos)
sys.exit(0)
print('giunti M', {k: np.round(VAR['M'][1][i], 2).tolist() for i, k in enumerate(KEEP) if k in ('root', 'spine02', 'head', 'upperarm01.L', 'lowerarm01.L', 'wrist.L', 'upperleg01.L', 'neck01', 'jaw', 'orbicularis03.L')})
P = VAR['M'][0]; c = (np.abs(P[:, 0]) < 0.3)
for y0 in (2.0, 3.0, 4.0, 5.0): m = c & (np.abs(P[:, 1] - y0) < 0.3); print('y', y0, 'z ant', P[m, 2].max().round(2), 'z post', P[m, 2].min().round(2))
m = (np.abs(P[:, 1] - 0.0) < 0.4); print('bacino z', P[m, 2].min().round(2), P[m, 2].max().round(2)); print('testa', P[:, 1].max().round(2), 'piedi', P[:, 1].min().round(2), 'nuca z', P[P[:, 1] > 7][:, 2].min().round(2), 'viso z', P[P[:, 1] > 7][:, 2].max().round(2))
