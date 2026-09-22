/* PTB-XL 1.0.3: catalogo completo e riproduzione dei file WFDB originali.
   Fonte e licenza: atlante-reale/fonti.html, CC BY 4.0.
   Il mirror è fissato a un commit. Ogni file viene verificato con lo SHA-256
   pubblicato da PhysioNet, anche quando viene riletto dalla cache offline. */
(function (root) {
'use strict';
const MIRROR = 'https://huggingface.co/datasets/longisland3/ptb-xl/resolve/34a5563a01793b150ac61fe0ec919a09fc0d044a/';
const SOURCE = 'https://physionet.org/content/ptb-xl/1.0.3/';
const CACHE = 'isoelettrica-ptbxl-1.0.3';
const LEADS = ['I','II','III','aVR','aVL','aVF','V1','V2','V3','V4','V5','V6'];
const DETAILS = new Map();
const metadataURL = id => new URL('atlante-reale/registrazioni/' + id + '.json', root.location ? root.location.href : 'https://isoelettrica.test/').href;
const ALIASES = { CRBBB:'bbdx bbd bbdx completo rbbb', IRBBB:'bbdx bbd incompleto rbbb', CLBBB:'bbsx bbs bbsx completo lbbb', ILBBB:'bbsx bbs incompleto lbbb', LAFB:'eas', LPFB:'eps', '1AVB':'bav primo grado', '2AVB':'bav secondo grado', '3AVB':'bav terzo grado', AFIB:'fa' };
function count(n) { return Number(n).toLocaleString('it-IT'); }
function expandCatalog(data) {
  if (data.schema !== 2 || !Array.isArray(data.records) || !data.codes) throw Error('Catalogo PTB-XL non valido');
  const seen = new Set();
  const voci = data.records.map(row => {
    const [id, age, sex, codes, validated, second, noisy] = row;
    if (!Number.isInteger(id) || id < 1 || seen.has(id) || !codes || Object.keys(codes).some(c => !data.codes[c])) throw Error('Voce PTB-XL non valida');
    seen.add(id);
    const scp = Object.keys(codes);
    const groups = [...new Set(scp.map(c => data.codes[c].group))];
    const important = scp.filter(c => !['SR','NORM'].includes(c));
    const main = important.length ? important : scp;
    const title = main.slice(0, 2).map(c => data.codes[c].name).join(' · ') || 'ECG registrato';
    const person = [sex === '0' ? 'uomo' : sex === '1' ? 'donna' : '', age === '>89' ? 'oltre 89 anni' : age != null ? age + ' anni' : ''].filter(Boolean).join(', ');
    return { i:'ptbxl-' + id, id, t:title, person, f:'PTB-XL #' + id, q:null, scp, codes, groups, g:groups[0] || 'altro', fs:500, n:5000,
      validated:!!validated, second:!!second, noisy:!!noisy,
      search: [id, 'ptbxl-' + id, title, person, ...scp, ...scp.map(c => data.codes[c].name), ...scp.map(c => data.codes[c].original), ...scp.map(c => ALIASES[c] || '')].join(' ').toLowerCase() };
  });
  return Object.assign({}, data, { records:undefined, voci });
}
function decodeWFDB(header, buffer) {
  const lines = header.split(/\r?\n/).map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const first = lines[0] && lines[0].split(/\s+/);
  const channels = Number(first && first[1]), fs = Number(first && first[2]), n = Number(first && first[3]);
  if (channels !== 12 || fs !== 500 || n !== 5000 || lines.length !== channels + 1 || buffer.byteLength !== channels * n * 2) throw Error('Dimensioni del segnale PTB-XL non valide');
  const view = new DataView(buffer), d = {};
  for (let c = 0; c < channels; c++) {
    const parts = lines[c + 1].split(/\s+/);
    const gain = /^([\d.eE+-]+)(?:\((-?\d+)\))?\/mV$/.exec(parts[2]);
    const name = LEADS.find(l => l.toUpperCase() === parts.at(-1).toUpperCase());
    const scale = gain && Number(gain[1]), baseline = gain && Number(gain[2] == null ? parts[4] : gain[2]);
    if (parts[1] !== '16' || !name || d[name] || !Number.isFinite(scale) || scale <= 0 || !Number.isFinite(baseline)) throw Error('Calibrazione del segnale PTB-XL non riconosciuta');
    const values = new Float64Array(n);
    for (let k = 0; k < n; k++) {
      const raw = view.getInt16((k * channels + c) * 2, true);
      values[k] = raw === -32768 ? NaN : (raw - baseline) / scale;
    }
    d[name] = values;
  }
  return { fs, n, d, encoding:'mv' };
}
async function verify(buffer, expected) {
  if (!root.crypto || !root.crypto.subtle) throw Error('La verifica dei tracciati richiede una connessione HTTPS.');
  if (!/^[a-f0-9]{64}$/.test(expected || '')) throw Error('Impronta ufficiale del tracciato mancante');
  const digest = await root.crypto.subtle.digest('SHA-256', buffer);
  const actual = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2,'0')).join('');
  if (actual !== expected) throw Error('Il file non corrisponde all’originale PhysioNet. Riprova il download.');
}
async function cache() {
  try { return root.caches ? await root.caches.open(CACHE) : null; } catch (_) { return null; }
}
async function download(url, signal) {
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal) { if (signal.aborted) abort(); else signal.addEventListener('abort', abort, { once:true }); }
  const timer = setTimeout(abort, 45000);
  try {
    const response = await fetch(url, { signal:controller.signal, credentials:'omit', referrerPolicy:'no-referrer' });
    if (!response.ok) throw Error('Download non riuscito (HTTP ' + response.status + ').');
    return await response.arrayBuffer();
  } finally { clearTimeout(timer); if (signal) signal.removeEventListener('abort', abort); }
}
async function checkedFile(url, sha, c, signal) {
  const hit = c && await c.match(url);
  if (hit) {
    const buffer = await hit.arrayBuffer();
    try { await verify(buffer, sha); return buffer; }
    catch (_) { await c.delete(url); }
  }
  const buffer = await download(url, signal);
  await verify(buffer, sha);
  return buffer;
}
async function details(id, signal) {
  const c = await cache(), saved = c && await c.match(metadataURL(id));
  if (saved) {
    const record = await saved.json();
    if (record.id === id && /^records500\/\d{5}\/\d{5}_hr$/.test(record.path) && Array.isArray(record.sha)) return record;
  }
  const bucket = Math.floor(id / 1000);
  if (!DETAILS.has(bucket)) {
    const response = await fetch('atlante-reale/dettagli/' + bucket + '.json', { signal });
    if (!response.ok) throw Error('Dati del referto non disponibili. Collegati a Internet e riprova.');
    DETAILS.set(bucket, await response.json());
  }
  const record = DETAILS.get(bucket)[id];
  if (!record || record.id !== id || !/^records500\/\d{5}\/\d{5}_hr$/.test(record.path) || !Array.isArray(record.sha)) throw Error('Metadati PTB-XL non validi');
  return record;
}
async function load(entry, options = {}) {
  const { signal, progress = () => {} } = options;
  progress('Caricamento del referto…');
  const metadata = await details(entry.id, signal);
  const c = await cache(), urls = ['.hea','.dat'].map(ext => MIRROR + metadata.path + ext);
  progress('Caricamento dell’ECG originale…');
  const [header, signalData] = await Promise.all(urls.map((url, i) => checkedFile(url, metadata.sha[i], c, signal)));
  const decoded = decodeWFDB(new TextDecoder().decode(header), signalData);
  if (signal && signal.aborted) throw new DOMException('Annullato', 'AbortError');
  let offline = false;
  if (c) {
    try {
      await c.put(urls[0], new Response(header)); await c.put(urls[1], new Response(signalData));
      await c.put(metadataURL(entry.id), new Response(JSON.stringify(metadata), { headers:{'Content-Type':'application/json'} }));
      offline = true;
    } catch (_) { /* La visualizzazione online resta possibile con spazio esaurito. */ }
  }
  return Object.assign(decoded, { t:entry.t + (entry.person ? ' — ' + entry.person : ''), f:entry.f, q:null, scp:entry.scp, reale:true, ptb:metadata, offline });
}
async function offlineIds() {
  const c = await cache(); if (!c) return new Set();
  const keys = (await c.keys()).map(r => r.url), set = new Set(keys), ids = new Set();
  keys.forEach(url => { const m = /\/(\d{5})_hr\.dat$/.exec(url); if (url.startsWith(MIRROR) && m && set.has(url.replace(/\.dat$/,'.hea')) && set.has(metadataURL(Number(m[1])))) ids.add(Number(m[1])); });
  return ids;
}
const api = { SOURCE, MIRROR, CACHE, count, expandCatalog, decodeWFDB, verify, load, offlineIds };
if (typeof module !== 'undefined' && module.exports) module.exports = api;
else root.ISO_PTBXL = api;
})(typeof window !== 'undefined' ? window : globalThis);
