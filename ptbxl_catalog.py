#!/usr/bin/env python3
"""Catalogo completo PTB-XL 1.0.3, senza alterare o incorporare i segnali.

Legge i metadati e le impronte SHA-256 ufficiali scaricati da PhysioNet.
L'app controlla queste impronte prima di visualizzare i file del mirror.
Uso: python3 ptbxl_catalog.py --sorgente /cartella/ptb-xl --out atlante-reale
"""
import argparse
import ast
import csv
import hashlib
import json
from pathlib import Path
import re

VERSION = '1.0.3'
SOURCE = 'https://physionet.org/content/ptb-xl/1.0.3/'
MIRROR = 'https://huggingface.co/datasets/longisland3/ptb-xl/resolve/34a5563a01793b150ac61fe0ec919a09fc0d044a/'

# Traduzioni descrittive dei codici originali, senza inferire diagnosi aggiuntive.
LABELS = {
 'NORM':'ECG normale', 'SR':'Ritmo sinusale', 'SBRAD':'Bradicardia sinusale',
 'STACH':'Tachicardia sinusale', 'SARRH':'Aritmia sinusale', 'AFIB':'Fibrillazione atriale',
 'AFLT':'Flutter atriale', 'SVTAC':'Tachicardia sopraventricolare',
 'PSVT':'Tachicardia parossistica sopraventricolare', 'SVARR':'Aritmia sopraventricolare',
 'PAC':'Extrasistoli atriali', 'PVC':'Extrasistoli ventricolari',
 'BIGU':'Bigeminismo, origine non specificata', 'TRIGU':'Trigeminismo, origine non specificata',
 'PRC(S)':'Battiti prematuri, origine non specificata', 'PACE':'Ritmo da pacemaker',
 '1AVB':'Blocco AV di primo grado', '2AVB':'Blocco AV di secondo grado',
 '3AVB':'Blocco AV completo', 'LPR':'PR prolungato',
 'CRBBB':'Blocco di branca destra completo', 'IRBBB':'Blocco di branca destra incompleto',
 'CLBBB':'Blocco di branca sinistra completo', 'ILBBB':'Blocco di branca sinistra incompleto',
 'LAFB':'Emiblocco anteriore sinistro', 'LPFB':'Emiblocco posteriore sinistro',
 'IVCD':'Disturbo aspecifico della conduzione intraventricolare', 'WPW':'Preeccitazione ventricolare',
 'LVH':'Ipertrofia ventricolare sinistra', 'RVH':'Ipertrofia ventricolare destra',
 'SEHYP':'Ipertrofia settale', 'LAO/LAE':'Sovraccarico o ingrandimento atriale sinistro',
 'RAO/RAE':'Sovraccarico o ingrandimento atriale destro',
 'VCLVH':'Criteri di voltaggio per ipertrofia ventricolare sinistra',
 'IMI':'Infarto inferiore', 'AMI':'Infarto anteriore', 'ASMI':'Infarto antero-settale',
 'ALMI':'Infarto antero-laterale', 'ILMI':'Infarto infero-laterale', 'LMI':'Infarto laterale',
 'IPLMI':'Infarto infero-postero-laterale', 'IPMI':'Infarto infero-posteriore', 'PMI':'Infarto posteriore',
 'ISC_':'Alterazioni ischemiche non specifiche', 'ISCAL':'Alterazioni ischemiche antero-laterali',
 'ISCIN':'Alterazioni ischemiche inferiori', 'ISCIL':'Alterazioni ischemiche infero-laterali',
 'ISCAS':'Alterazioni ischemiche antero-settali', 'ISCLA':'Alterazioni ischemiche laterali',
 'ISCAN':'Alterazioni ischemiche anteriori',
 'INJAS':'Alterazioni ST-T compatibili con lesione subendocardica antero-settale',
 'INJAL':'Alterazioni ST-T compatibili con lesione subendocardica antero-laterale',
 'INJIN':'Alterazioni ST-T compatibili con lesione subendocardica inferiore',
 'INJLA':'Alterazioni ST-T compatibili con lesione subendocardica laterale',
 'INJIL':'Alterazioni ST-T compatibili con lesione subendocardica infero-laterale',
 'ANEUR':'Alterazioni ST-T compatibili con aneurisma ventricolare',
 'NDT':'Alterazioni non diagnostiche della T', 'NST_':'Alterazioni aspecifiche ST',
 'STD_':'Sottoslivellamento ST non specifico', 'STE_':'Sopraslivellamento ST non specifico',
 'LOWT':'Onde T di bassa ampiezza', 'NT_':'Alterazioni aspecifiche della T',
 'INVT':'Onde T invertite', 'TAB_':'Anomalie della T', 'LNGQT':'QT lungo',
 'DIG':'Effetto digitalico', 'EL':'Alterazioni compatibili con elettroliti o farmaci',
 'ABQRS':'QRS anomalo', 'QWAVE':'Presenza di onde Q',
 'LVOLT':'Bassi voltaggi QRS', 'HVOLT':'Alti voltaggi QRS',
}
GROUPS = {
 'normali': ('Normalità e ritmi sinusali', ['NORM','SR','SBRAD','STACH','SARRH']),
 'sopraventricolari': ('Aritmie sopraventricolari', ['AFIB','AFLT','SVTAC','PSVT','SVARR','PAC']),
 'bav': ('Blocchi AV e intervallo PR', ['1AVB','2AVB','3AVB','LPR']),
 'branca': ('Blocchi di branca ed emiblocchi', ['CRBBB','IRBBB','CLBBB','ILBBB','LAFB','LPFB','IVCD']),
 'ischemia': ('Ischemia e infarto', ['IMI','AMI','ASMI','ALMI','ILMI','LMI','IPLMI','IPMI','PMI','ISC_','ISCAL','ISCIN','ISCIL','ISCAS','ISCLA','ISCAN','INJAS','INJAL','INJIN','INJLA','INJIL','ANEUR']),
 'ipertrofia': ('Ipertrofie e ingrandimenti', ['LVH','RVH','SEHYP','LAO/LAE','RAO/RAE','VCLVH']),
 'ventricolari': ('Extrasistoli e ritmi ripetitivi', ['PVC','BIGU','TRIGU','PRC(S)']),
 'stimolazione': ('Pacemaker e preeccitazione', ['PACE','WPW']),
 'ripolarizzazione': ('ST, T e QT', ['NDT','NST_','STD_','STE_','LOWT','NT_','INVT','TAB_','LNGQT']),
 'altro': ('Voltaggi, morfologia e altri quadri', ['DIG','EL','ABQRS','QWAVE','LVOLT','HVOLT']),
}

def truth(value):
    return str(value).strip().lower() in ('true', '1', '1.0')

def build(source, output):
    source, output = Path(source), Path(output)
    sums = {}
    for line in (source / 'SHA256SUMS.txt').read_text().splitlines():
        digest, name = line.split(maxsplit=1)
        sums[name.lstrip('*')] = digest
    for name in ['ptbxl_database.csv', 'scp_statements.csv', 'LICENSE.txt']:
        if hashlib.sha256((source / name).read_bytes()).hexdigest() != sums[name]:
            raise ValueError('Impronta ufficiale non corrispondente: ' + name)
    statements = list(csv.DictReader((source / 'scp_statements.csv').open()))
    codes = {}
    for s in statements:
        code = s['']
        if code not in LABELS:
            raise ValueError('Traduzione mancante: ' + code)
        group = next((g for g, (_, cs) in GROUPS.items() if code in cs), 'altro')
        codes[code] = {'name': LABELS[code], 'original': s['description'], 'group': group}
    records = []
    rows = list(csv.DictReader((source / 'ptbxl_database.csv').open()))
    for row in rows:
        ident = int(row['ecg_id'])
        path = row['filename_hr']
        if not re.fullmatch(r'records500/\d{5}/\d{5}_hr', path):
            raise ValueError('Percorso inatteso: ' + path)
        labels = ast.literal_eval(row['scp_codes'])
        if not isinstance(labels, dict) or any(c not in codes for c in labels):
            raise ValueError('Codici inattesi: ' + str(ident))
        age = float(row['age']) if row['age'] else None
        # PTB-XL maschera le età >89 con valori >=300; mai mostrarli come età reali.
        age = '>89' if age is not None and age > 89 else int(age) if age is not None else None
        quality = {k: row[k].strip(' ,') for k in ['baseline_drift','static_noise','burst_noise','electrodes_problems'] if row[k].strip(' ,')}
        records.append({
            'id': ident, 'age': age, 'sex': row['sex'], 'codes': labels,
            'validated': truth(row['validated_by_human']), 'second': truth(row['second_opinion']),
            'auto': truth(row['initial_autogenerated_report']), 'quality': quality,
            'report': row['report'], 'stadium': [row['infarction_stadium1'],row['infarction_stadium2']],
            'path': path, 'sha': [sums[path + '.hea'], sums[path + '.dat']],
        })
    if len({r['id'] for r in records}) != len(rows):
        raise ValueError('ID duplicati')
    catalog = {
        'schema': 2, 'version': VERSION, 'source': SOURCE, 'mirror': MIRROR,
        'licenza': 'PTB-XL 1.0.3 · Wagner e collaboratori · PhysioNet · CC BY 4.0',
        'gruppi': [{'id': k, 'nome': v[0]} for k, v in GROUPS.items()],
        'codes': codes,
        'columns': ['id','age','sex','codes','validated','second','noisy'],
        'records': [[r['id'],r['age'],r['sex'],r['codes'],r['validated'],r['second'],bool(r['quality'])] for r in records],
    }
    output.mkdir(parents=True, exist_ok=True)
    (output / 'indice.json').write_text(json.dumps(catalog, ensure_ascii=False, separators=(',',':')) + '\n')
    (output / 'LICENSE.txt').write_bytes((source / 'LICENSE.txt').read_bytes())
    details = output / 'dettagli'
    details.mkdir(exist_ok=True)
    for bucket in sorted({r['id'] // 1000 for r in records}):
        entries = {str(r['id']): r for r in records if r['id'] // 1000 == bucket}
        (details / (str(bucket) + '.json')).write_text(json.dumps(entries, ensure_ascii=False, separators=(',',':')) + '\n')
    print(json.dumps({'records':len(records),'validated':sum(r['validated'] for r in records),'catalog_bytes':(output/'indice.json').stat().st_size},indent=2))

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sorgente', required=True)
    parser.add_argument('--out', default='atlante-reale')
    args = parser.parse_args()
    build(args.sorgente, args.out)
