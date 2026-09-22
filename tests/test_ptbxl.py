import base64
import csv
import importlib.util
import json
from pathlib import Path
import struct
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('ptbxl', ROOT / 'ptbxl.py')
ptbxl = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ptbxl)


class ImportTests(unittest.TestCase):
    def row(self, codes, **extra):
        return dict(scp_codes=repr(codes), validated_by_human='True', **extra)

    def test_sinus_rhythm_does_not_hide_infarction(self):
        selected, _ = ptbxl.scegli([self.row({'SR': 100, 'IMI': 80})], 8, True, True)
        self.assertEqual(selected[0][1], 'IMI')
        self.assertIsNone(ptbxl.MAPPA['IMI'][0])  # Infarction alone does not establish acute STEMI.
        self.assertEqual(set(selected[0][2]), {'SR', 'IMI'})

    def test_generic_labels_do_not_become_specific_diagnoses(self):
        for code in ['SR', '2AVB', 'SVTAC', 'PSVT', 'LAO/LAE', 'RAO/RAE', 'PACE', 'ELECTRICAL_ALTERNANS']:
            self.assertIsNone(ptbxl.MAPPA[code][0], code)
        self.assertEqual(ptbxl.MAPPA['AFIB'][0], 'fa')

    def test_validation_and_noise_filters_remain_active(self):
        unvalidated = {'scp_codes': "{'NORM': 100}", 'validated_by_human': 'False'}
        noisy = self.row({'NORM': 100}, static_noise='yes')
        self.assertEqual(ptbxl.scegli([unvalidated, noisy], 8, True, True)[0], [])
        self.assertEqual(len(ptbxl.scegli([unvalidated, noisy], 8, False, False)[0]), 2)

    def test_scp_field_is_data_not_executable_code(self):
        malformed = {'scp_codes': "__import__('os').getcwd()", 'validated_by_human': 'True'}
        self.assertEqual(ptbxl.scegli([malformed], 8, True, True)[0], [])

    def test_import_both_formats_preserves_calibration_labels_and_provenance(self):
        with tempfile.TemporaryDirectory() as tmp:
            d = Path(tmp)
            channels = ptbxl.ORDINE
            header = 'case 12 100.5 4\n' + '\n'.join('case.dat 16 100(10)/mV 16 0 0 0 0 ' + c for c in channels)
            (d / 'case.hea').write_text(header)
            (d / 'case.dat').write_bytes(struct.pack('<48h', *([10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120] * 4)))
            row = self.row({'SR': 100, 'IMI': 80}, ecg_id='7', filename_lr='case', report='Old inferior infarction', infarction_stadium1='old')
            with (d / 'ptbxl_database.csv').open('w', newline='') as f:
                writer = csv.DictWriter(f, fieldnames=list(row)); writer.writeheader(); writer.writerow(row)
            for mode in ['cartella', 'file']:
                out = d / ('records' if mode == 'cartella' else 'records.js')
                result = subprocess.run([sys.executable, str(ROOT / 'ptbxl.py'), '--sorgente', str(d), '--out', str(out), '--modo', mode], capture_output=True, text=True)
                self.assertEqual(result.returncode, 0, result.stderr)
                if mode == 'cartella':
                    rec = json.loads((out / 'ptbxl-7.json').read_text())
                    self.assertIsNone(json.loads((out / 'indice.json').read_text())['voci'][0]['q'])
                else:
                    rec = json.loads(out.read_text().split('window.ISO_REALE = ', 1)[1].rstrip(';\n'))[0]
                self.assertIsNone(rec['q']); self.assertEqual(set(rec['scp']), {'SR', 'IMI'})
                self.assertEqual(rec['fs'], 100.5); self.assertEqual(rec['report'], 'Old inferior infarction')
                self.assertEqual(rec['infarction_stadium1'], 'old'); self.assertTrue(rec['reale'])
                self.assertEqual(struct.unpack('<4h', base64.b64decode(rec['d']['II'])), (10, 10, 10, 10))


if __name__ == '__main__':
    unittest.main()
