#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Converte un sottoinsieme di PTB-XL nel formato dei tracciati registrati di
Isoelettrica, così da avere ECG VERI dentro l'app accanto a quelli del motore.

PTB-XL è pubblicato su PhysioNet con licenza Creative Commons Attribution 4.0:
si può usare anche in un'applicazione a pagamento, a condizione di citare gli
autori. La citazione viene scritta dentro il file prodotto e va mostrata
nell'app, nella scheda "Fonti".

    Wagner P, Strodthoff N, Bousseljot R-D, Samek W, Schaeffter T.
    PTB-XL, a large publicly available electrocardiography dataset (v1.0.3).
    PhysioNet. https://doi.org/10.13026/kfzx-aw45

Uso (una volta sola, sul computer, dopo aver scaricato il dataset):

    wget -r -N -c -np https://physionet.org/files/ptb-xl/1.0.3/
    python3 ptbxl.py --sorgente .../ptb-xl/1.0.3 --per-classe 8 \
                     --out atlante-reale.js

Produce un file JavaScript con i tracciati a 100 Hz, pronto per il visualizzatore
dei tracciati registrati già presente nell'app.
"""
import argparse, ast, base64, csv, json, os, re, struct, sys

# SCP-ECG -> quadro di Isoelettrica. Solo le corrispondenze sicure: dove il
# codice è generico o ambiguo si lascia il tracciato senza quadro associato.
MAPPA = {
    'NORM': ('normale', 'ECG normale'),
    'SR': (None, 'Ritmo sinusale'),
    'SBRAD': ('bradisinusale', 'Bradicardia sinusale'),
    'STACH': ('tachisinusale', 'Tachicardia sinusale'),
    'SARRH': ('aritmiasinusale', 'Aritmia sinusale'),
    'AFIB': ('fa', 'Fibrillazione atriale'),
    'AFLT': ('flutter', 'Flutter atriale'),
    'SVTAC': (None, 'Tachicardia sopraventricolare'),
    'PSVT': (None, 'Tachicardia parossistica sopraventricolare'),
    '1AVB': ('bav1', 'Blocco atrioventricolare di primo grado'),
    '2AVB': (None, 'Blocco atrioventricolare di secondo grado'),
    '3AVB': ('bav3', 'Blocco atrioventricolare completo'),
    'CRBBB': ('bbdx', 'Blocco di branca destra completo'),
    'IRBBB': ('bbdxinc', 'Blocco di branca destra incompleto'),
    'CLBBB': ('bbsx', 'Blocco di branca sinistra completo'),
    'ILBBB': ('bbsxinc', 'Blocco di branca sinistra incompleto'),
    'LAFB': ('eas', 'Emiblocco anteriore sinistro'),
    'LPFB': ('eps', 'Emiblocco posteriore sinistro'),
    'IVCD': ('ivcd', 'Disturbo aspecifico della conduzione intraventricolare'),
    'WPW': ('wpw', 'Preeccitazione ventricolare'),
    'LVH': ('ivs', 'Ipertrofia ventricolare sinistra'),
    'RVH': ('ivd', 'Ipertrofia ventricolare destra'),
    'LAO/LAE': (None, 'Ingrandimento atriale sinistro'),
    'RAO/RAE': (None, 'Ingrandimento atriale destro'),
    'IMI': (None, 'Infarto inferiore'),
    'ILMI': (None, 'Infarto infero-laterale'),
    'AMI': (None, 'Infarto anteriore'),
    'ASMI': (None, 'Infarto antero-settale'),
    'ALMI': (None, 'Infarto antero-laterale'),
    'LMI': (None, 'Infarto laterale'),
    'IPLMI': (None, 'Infarto postero-laterale'),
    'IPMI': (None, 'Infarto posteriore'),
    'PVC': ('esv', 'Extrasistoli ventricolari'),
    'PAC': ('esa', 'Extrasistoli atriali'),
    'PACE': (None, 'Ritmo da pacemaker'),
    'LNGQT': ('qtlungo', 'QT lungo'),
    'ELECTRICAL_ALTERNANS': (None, 'Alternanza elettrica'),
}
# gruppi dell'atlante reale: come sono organizzate le sezioni nell'app
GRUPPI = {
    'normali': ('Normalità e ritmi sinusali', ['NORM', 'SR', 'SBRAD', 'STACH', 'SARRH']),
    'sopraventricolari': ('Aritmie sopraventricolari', ['AFIB', 'AFLT', 'SVTAC', 'PSVT', 'PAC']),
    'bav': ('Blocchi atrioventricolari', ['1AVB', '2AVB', '3AVB']),
    'branca': ('Blocchi di branca ed emiblocchi', ['CRBBB', 'IRBBB', 'CLBBB', 'ILBBB', 'LAFB', 'LPFB', 'IVCD']),
    'ischemia': ('Cardiopatia ischemica', ['IMI', 'ILMI', 'AMI', 'ASMI', 'ALMI', 'LMI', 'IPLMI', 'IPMI']),
    'ipertrofia': ('Ipertrofie e ingrandimenti', ['LVH', 'RVH', 'LAO/LAE', 'RAO/RAE']),
    'ventricolari': ('Aritmie ventricolari', ['PVC']),
    'stimolazione': ('Stimolazione e preeccitazione', ['PACE', 'WPW']),
    'altro': ('Altri quadri', ['LNGQT', 'ELECTRICAL_ALTERNANS']),
}
def gruppo_di(c):
    for gid, (nome, codici) in GRUPPI.items():
        if c in codici: return gid, nome
    return 'altro', 'Altri quadri'

# solo le otto derivazioni indipendenti: le altre quattro l'app le ricostruisce
INDIP = ['I', 'II', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
ORDINE = ['I', 'II', 'III', 'AVR', 'AVL', 'AVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6']
NOSTRI = {'I': 'I', 'II': 'II', 'III': 'III', 'AVR': 'aVR', 'AVL': 'aVL', 'AVF': 'aVF',
          'V1': 'V1', 'V2': 'V2', 'V3': 'V3', 'V4': 'V4', 'V5': 'V5', 'V6': 'V6'}


def leggi_hea(path):
    """Intestazione WFDB: nome, n canali, frequenza, n campioni, poi una riga per canale."""
    with open(path, 'r') as f:
        righe = [r.strip() for r in f if r.strip() and not r.startswith('#')]
    t = righe[0].split()
    nsig, fs, n = int(t[1]), float(t[2]), int(t[3])
    canali = []
    for r in righe[1:1 + nsig]:
        c = r.split()
        m = re.match(r'(\d+)', c[1])
        fmt = int(m.group(1))
        g = c[2].split('/')[0].split('(')[0]
        gain = float(g) if float(g) else 200.0
        base = 0
        if '(' in c[2]:
            base = int(c[2].split('(')[1].split(')')[0])
        canali.append({'fmt': fmt, 'gain': gain, 'base': base, 'nome': c[-1].upper()})
    return {'fs': fs, 'n': n, 'canali': canali}


def leggi_dat(path, hea):
    """Formato 16: interi a 16 bit con segno, canali interlacciati."""
    nsig = len(hea['canali'])
    if any(c['fmt'] != 16 for c in hea['canali']):
        raise ValueError('formato WFDB non gestito (atteso 16): ' + path)
    with open(path, 'rb') as f:
        raw = f.read()
    tot = len(raw) // 2
    campioni = struct.unpack('<%dh' % tot, raw[:tot * 2])
    n = min(hea['n'], tot // nsig)
    sig = {}
    for k, c in enumerate(hea['canali']):
        v = [(campioni[i * nsig + k] - c['base']) / c['gain'] for i in range(n)]
        sig[c['nome']] = v          # in mV
    return sig, n


def codifica(v):
    """int16 little endian, valore in centesimi di millivolt: come l'atlante."""
    b = bytearray()
    for x in v:
        i = int(round(x * 100))
        i = -32768 if i < -32768 else (32767 if i > 32767 else i)
        b += struct.pack('<h', i)
    return base64.b64encode(bytes(b)).decode('ascii')


def scegli(db, per_classe, solo_validati, max_rumore):
    scelti, conta = [], {}
    for r in db:
        try:
            codici = ast.literal_eval(r['scp_codes'])
        except Exception:
            continue
        if solo_validati and r.get('validated_by_human', '').strip() not in ('True', 'true', '1'):
            continue
        if max_rumore and (r.get('static_noise', '').strip() or r.get('burst_noise', '').strip()):
            continue
        if not isinstance(codici, dict):
            continue
        # Preserve all labels; sinus rhythm must not hide another diagnosis.
        cand = [(c, float(l or 0)) for c, l in codici.items() if c in MAPPA]
        if not cand:
            continue
        cand.sort(key=lambda x: (x[0] in ('SR', 'NORM'), -x[1], x[0]))
        c = cand[0][0]
        if conta.get(c, 0) >= per_classe:
            continue
        conta[c] = conta.get(c, 0) + 1
        scelti.append((r, c, list(codici.keys())))
    return scelti, conta


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--sorgente', required=True, help='cartella di ptb-xl (quella con ptbxl_database.csv)')
    ap.add_argument('--out', default='atlante-reale.js')
    ap.add_argument('--per-classe', type=int, default=8)
    ap.add_argument('--modo', choices=['cartella', 'file'], default='cartella',
                    help="cartella: indice + un file per tracciato, caricati solo all'apertura (per migliaia di ECG). file: tutto in un unico .js")
    ap.add_argument('--tutti', action='store_true', help='non filtrare per validazione umana e rumore')
    a = ap.parse_args()

    csvp = os.path.join(a.sorgente, 'ptbxl_database.csv')
    if not os.path.exists(csvp):
        sys.exit('non trovo ptbxl_database.csv in ' + a.sorgente)
    with open(csvp, newline='', encoding='utf-8') as f:
        db = list(csv.DictReader(f))
    print('%d referti nel database' % len(db))

    scelti, conta = scegli(db, a.per_classe, not a.tutti, not a.tutti)
    if not scelti and not a.tutti:
        sys.exit('Nessun tracciato supera i filtri. Usa --tutti soltanto per importare esplicitamente casi non filtrati.')
    print('%d tracciati scelti su %d classi' % (len(scelti), len(conta)))

    cartella = a.modo == 'cartella'
    dirout = a.out if cartella else None
    if cartella:
        if dirout.endswith('.js'): dirout = 'atlante-reale'
        os.makedirs(dirout, exist_ok=True)
    rec, indice = [], []
    for r, c, tutti_i_codici in scelti:
        base = os.path.join(a.sorgente, r['filename_lr'])
        try:
            hea = leggi_hea(base + '.hea')
            sig, n = leggi_dat(base + '.dat', hea)
        except Exception as e:
            print('  salto %s: %s' % (r['ecg_id'], e)); continue
        campi = INDIP if cartella else ORDINE
        d = {}
        for nome in campi:
            if nome in sig:
                d[NOSTRI[nome]] = codifica(sig[nome])
        if len(d) < len(campi):
            continue
        quadro, etichetta = MAPPA[c]
        if c == 'NORM' and any(k not in ('NORM', 'SR') for k in tutti_i_codici):
            quadro = None
        eta = r.get('age', ''); sesso = {'0': 'uomo', '1': 'donna'}.get(r.get('sex', ''), '')
        titolo = etichetta
        if eta and sesso:
            try: titolo += ' — %s, %d anni' % (sesso, int(float(eta)))
            except Exception: pass
        gid, gnome = gruppo_di(c)
        ident = 'ptbxl-%s' % r['ecg_id']
        voce = {'t': titolo, 'f': 'PTB-XL #%s (CC BY 4.0)' % r['ecg_id'], 'q': quadro,
                'fs': hea['fs'], 'n': n, 'scp': list(tutti_i_codici), 'd': d, 'reale': True,
                'g': gid, 'gn': gnome, 'validated_by_human': r.get('validated_by_human', ''),
                'report': r.get('report', ''), 'infarction_stadium1': r.get('infarction_stadium1', '')}
        if cartella:
            with open(os.path.join(dirout, ident + '.json'), 'w', encoding='utf-8') as f:
                json.dump(voce, f, ensure_ascii=False, separators=(',', ':'))
            indice.append({'i': ident, 't': titolo, 'g': gid, 'gn': gnome, 'q': quadro,
                           'f': voce['f'], 'scp': list(tutti_i_codici), 'n': n, 'fs': voce['fs']})
        else:
            voce['i'] = ident; rec.append(voce)

    CIT = ('Wagner P, Strodthoff N, Bousseljot R-D, Samek W, Schaeffter T. '
           'PTB-XL, a large publicly available electrocardiography dataset (v1.0.3). '
           'PhysioNet. https://doi.org/10.13026/kfzx-aw45 — licenza CC BY 4.0')
    if cartella:
        with open(os.path.join(dirout, 'indice.json'), 'w', encoding='utf-8') as f:
            json.dump({'licenza': CIT, 'gruppi': [{'id': k, 'nome': v[0]} for k, v in GRUPPI.items()],
                       'voci': indice}, f, ensure_ascii=False, separators=(',', ':'))
        tot = sum(os.path.getsize(os.path.join(dirout, x)) for x in os.listdir(dirout))
        print('scritta la cartella %s — %d tracciati, %.1f MB in tutto, indice %.0f kB'
              % (dirout, len(indice), tot / 1048576, os.path.getsize(os.path.join(dirout, 'indice.json')) / 1024))
        for k in sorted(conta): print('   %-6s %d' % (k, conta[k]))
        return
    testa = ('/* Tracciati reali da PTB-XL, PhysioNet, licenza CC BY 4.0.\n'
             '   Wagner P, Strodthoff N, Bousseljot R-D, Samek W, Schaeffter T.\n'
             '   PTB-XL, a large publicly available electrocardiography dataset (v1.0.3).\n'
             '   PhysioNet. https://doi.org/10.13026/kfzx-aw45\n'
             '   Generato da ptbxl.py: non modificare a mano. */\n')
    corpo = 'window.ISO_REALE = %s;\n' % json.dumps(rec, ensure_ascii=False, separators=(',', ':'))
    with open(a.out, 'w', encoding='utf-8') as f:
        f.write(testa + corpo)
    kb = os.path.getsize(a.out) / 1024
    print('scritto %s — %d tracciati, %.0f kB' % (a.out, len(rec), kb))
    for k in sorted(conta): print('   %-6s %d' % (k, conta[k]))


if __name__ == '__main__':
    main()
