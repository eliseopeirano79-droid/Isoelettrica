/* Isoelettrica — interfaccia */
(function () {
'use strict';
const { LEADS, Stream, Sampled, dirAG } = window.ECG;
const ECG = window.ECG;
const PTB = window.ISO_PTBXL;
const DIG = window.ISO_ATLANTE_DIG || {};
/* Tracciati reali da PTB-XL (PhysioNet, CC BY 4.0), prodotti da ptbxl.py.
   Il file è facoltativo: se non c'è, l'app funziona esattamente come prima. */
(window.ISO_REALE || []).forEach((r, i) => { DIG[r.i || ('reale-' + i)] = Object.assign({}, r, { reale: true }); });
const { SCENARIOS, THEORY, CATS, ATLAS, ATLAS_G, LIB_SECTIONS, LIB_ORDER } = window.ISO_DATA;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FIRMA = '<p class="foot">Isoelettrica — App made by Eliseo Peirano · 2026</p>';
const DEG = Math.PI / 180;
const LIDX = {}; LEADS.forEach((L, i) => { LIDX[L.id] = i; });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, d) => Number.isFinite(v) ? (d ? v.toFixed(d) : Math.round(v).toString()).replace('.', ',') : 'N/D';
const cloneCase = value => JSON.parse(JSON.stringify(value));
// Stessa coordinata, anche nei pixel, della riga principale più vicina (5 mm).
// Si allinea lo zero grafico: i valori in mV del segnale restano invariati.
const gridBaseline = (mm, preferred) => Math.round(Math.round(preferred / (5 * mm)) * 5 * mm) + 0.5;

/* ---------- memoria ---------- */
const KEY = 'isoelettrica.v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
store.params = store.params || {};
store.quiz = store.quiz || { ok: 0, tot: 0 };
let REALE = null, realeG = store.realeG || '', realeCache = {};
let realIndexTask = null, realIndexError = '';
let atlasFonte = store.atlasFonte || 'corso';
let rebuildT = null, shockTimer = null, caseVersion = 0, recordRequest = 0, recordAbort = null;
let saveTimer = null;
function save() { clearTimeout(saveTimer); saveTimer = setTimeout(() => { try { localStorage.setItem(KEY, JSON.stringify(store)); } catch (e) {} }, 400); }
if (store.theme === 'light' || store.theme === 'dark') document.documentElement.setAttribute('data-theme', store.theme);

/* ---------- colori ---------- */
let css = {};
function readVars() { const s = getComputedStyle(document.documentElement); const g = n => s.getPropertyValue(n).trim(); css = { paper: g('--paper'), grid: g('--grid'), grid2: g('--grid2'), trace: g('--trace'), accent: g('--accent'), hl: g('--hl'), muted: g('--muted'), fg: g('--fg'), stage: g('--stage'), bad: g('--bad'), ok: g('--ok') }; }
readVars();

/* =====================================================================
   MONITOR ECG
   ===================================================================== */
const PRINT = [['I', 'aVR', 'V1', 'V4'], ['II', 'aVL', 'V2', 'V5'], ['III', 'aVF', 'V3', 'V6']];
class Monitor {
  constructor(canvas, ov, opts) {
    this.cv = canvas; this.ctx = canvas.getContext('2d'); this.ov = ov; this.octx = ov.getContext('2d');
    this.opts = opts || {};
    this.mode = 'print'; this.speed = 25; this.gain = 10;
    this.stream = null; this.t = 0; this.drawn = 0; this.pageStart = 0;
    this.bg = document.createElement('canvas');
    this.panels = []; this.last = []; this.hl = []; this.sel = null;
    this.calOn = false; this.cal = [];
    this.vec = [0, 0, 0]; this.lv = new Array(12).fill(0);
    ov.addEventListener('pointerdown', e => this.onPointer(e));
  }
  pageMs() { return (this.mode === 'print' ? 250 : 125) / this.speed * 1000; }
  setStream(st, keep) { this.stream = st; if (!keep) { this.t = 0; this.pageStart = 0; this.drawn = 0; } this.layout(); }
  layout() {
    const W = this.cv.parentElement.clientWidth; if (!W) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const panels = []; let pxmm, H;
    if (this.stream && this.stream.availableLeads && this.stream.availableLeads.length <= 6) {
      const ids = this.stream.availableLeads, m = 9, row = 25, top = 3, width = this.mode === 'print' ? 250 : 125; pxmm = W / (m + width);
      H = Math.round(pxmm * (top + ids.length * row + 2));
      ids.forEach((id, i) => panels.push({ id, li: LIDX[id], g: 0, tw0: 0, tw1: 1, base: (top + i * row + 15) * pxmm, top: (top + i * row) * pxmm, h: row * pxmm, lx: m * pxmm, strip: true }));
      this.groups = [{ x0: m * pxmm, w: width * pxmm }]; this.rows = panels.map(p => p.base);
    } else if (this.mode === 'print') {
      const m = 9, row = 23, strip = 25, top = 3; pxmm = W / (m + 250);
      H = Math.round(pxmm * (top + 3 * row + strip + 2));
      PRINT.forEach((r, ri) => r.forEach((id, c) => panels.push({ id, li: LIDX[id], g: 0, tw0: c / 4, tw1: (c + 1) / 4, base: (top + ri * row + 14) * pxmm, top: (top + ri * row) * pxmm, h: row * pxmm, lx: (m + c * 62.5) * pxmm })));
      panels.push({ id: 'II', li: 1, g: 0, tw0: 0, tw1: 1, base: (top + 3 * row + 15) * pxmm, top: (top + 3 * row) * pxmm, h: strip * pxmm, lx: m * pxmm, strip: true });
      this.groups = [{ x0: m * pxmm, w: 250 * pxmm }];
      this.rows = [0, 1, 2, 3].map(i => i < 3 ? (top + i * row + 14) * pxmm : (top + 3 * row + 15) * pxmm);
    } else {
      const m = 7, row = 19, top = 2; pxmm = W / (2 * (m + 125));
      H = Math.round(pxmm * (top + 6 * row + 2));
      LEADS.forEach((L, i) => { const c = i < 6 ? 0 : 1, r = i < 6 ? i : i - 6; panels.push({ id: L.id, li: i, g: c, tw0: 0, tw1: 1, base: (top + r * row + 11.5) * pxmm, top: (top + r * row) * pxmm, h: row * pxmm, lx: (m + c * (m + 125)) * pxmm }); });
      this.groups = [{ x0: m * pxmm, w: 125 * pxmm }, { x0: (2 * m + 125) * pxmm, w: 125 * pxmm }];
      this.rows = [];
    }
    panels.forEach(p => { p.base = gridBaseline(pxmm * dpr, p.base * dpr) / dpr; });
    this.rows = this.rows.map(base => gridBaseline(pxmm * dpr, base * dpr) / dpr);
    Object.assign(this, { W, H, dpr, pxmm, panels });
    this.last = panels.map(() => null);
    this.cv.width = this.ov.width = this.bg.width = Math.round(W * dpr);
    this.cv.height = this.ov.height = this.bg.height = Math.round(H * dpr);
    this.cv.style.height = H + 'px';
    this.buildBg(); this.redrawAll(); this.drawOverlay();
  }
  buildBg() {
    const c = this.bg.getContext('2d'), d = this.dpr, W = this.bg.width, H = this.bg.height, mm = this.pxmm * d;
    c.fillStyle = css.paper; c.fillRect(0, 0, W, H);
    const x0 = this.groups[0].x0 * d;
    const minor = mm >= 2.6;
    c.lineWidth = Math.max(1, d * 0.5);
    for (let i = -Math.ceil(x0 / mm); x0 + i * mm <= W; i++) {
      const x = Math.round(x0 + i * mm) + 0.5; const major = ((i % 5) + 5) % 5 === 0;
      if (!major && !minor) continue; c.strokeStyle = major ? css.grid2 : css.grid; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, H); c.stroke();
    }
    for (let j = 0; j * mm <= H; j++) {
      const y = Math.round(j * mm) + 0.5; const major = j % 5 === 0;
      if (!major && !minor) continue; c.strokeStyle = major ? css.grid2 : css.grid; c.beginPath(); c.moveTo(0, y); c.lineTo(W, y); c.stroke();
    }
    c.strokeStyle = css.trace; c.fillStyle = css.trace; c.lineWidth = 1.3 * d;
    const cal = (x, base) => { const h = this.gain * mm, w = 5 * mm; c.beginPath(); c.moveTo(x, base); c.lineTo(x + mm, base); c.lineTo(x + mm, base - h); c.lineTo(x + mm + w, base - h); c.lineTo(x + mm + w, base); c.lineTo(x + 2 * mm + w, base); c.stroke(); };
    const font = Math.max(10, Math.round(3.2 * this.pxmm)) * d;
    c.font = '600 ' + font + 'px -apple-system, system-ui, sans-serif'; c.textBaseline = 'top';
    if (this.mode === 'print') {
      this.rows.forEach(b => cal(0.6 * mm, b * d));
      this.panels.forEach(p => { c.fillText(p.id + (this.stream && this.stream.hasLead && !this.stream.hasLead(p.li) ? ' · N/D' : ''), p.lx * d + (p.strip ? 1.5 : 1.2) * mm + (p.lx === this.groups[0].x0 ? 0 : 0), p.top * d + 1.2 * mm); if (p.tw0 > 0 && !p.strip) { c.save(); c.strokeStyle = css.grid2; c.lineWidth = 2 * d; c.beginPath(); c.moveTo(p.lx * d, p.base * d - 3 * mm); c.lineTo(p.lx * d, p.base * d + 3 * mm); c.stroke(); c.restore(); } });
    } else {
      this.panels.forEach(p => { cal(p.lx * d - 6.4 * mm, p.base * d); c.fillText(p.id + (this.stream && this.stream.hasLead && !this.stream.hasLead(p.li) ? ' · N/D' : ''), p.lx * d + 1.2 * mm, p.top * d + 0.8 * mm); });
    }
  }
  redrawAll() {
    if (!this.W) return;
    this.ctx.drawImage(this.bg, 0, 0);
    this.last = this.panels.map(() => null);
    this.drawn = this.pageStart;
    this.draw(true);
  }
  xOf(p, frac) { const g = this.groups[p.g]; return g.x0 + frac * g.w; }
  draw(full) {
    const st = this.stream; if (!st || !this.W) return;
    const P = this.pageMs();
    if (this.t - this.drawn > P * 1.5) { this.pageStart = Math.floor(this.t / P) * P; this.drawn = this.pageStart; this.ctx.drawImage(this.bg, 0, 0); this.last = this.panels.map(() => null); }
    if (this.t <= this.drawn && !full) return;
    st.ensure(this.t);
    const ctx = this.ctx, d = this.dpr, mm = this.pxmm, g = this.gain;
    ctx.strokeStyle = css.trace; ctx.lineWidth = 1.35 * d; ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath();
    let t = this.drawn; const step = st.fs ? Math.min(3, 1000 / st.fs) : 3;
    while (t < this.t) {
      const tn = Math.min(this.t, (Math.floor((t + 1e-8) / step) + 1) * step);
      if (st.crossesBoundary && st.crossesBoundary(t, tn)) this.last = this.panels.map(() => null);
      if (tn - this.pageStart >= P) {
        ctx.stroke(); this.pageStart += P; this.last = this.panels.map(() => null); ctx.beginPath();
      }
      st.vec(tn, this.vec); st.leads(tn, this.vec, this.lv);
      const frac = (tn - this.pageStart) / P;
      for (let i = 0; i < this.panels.length; i++) {
        const p = this.panels[i];
        if (!Number.isFinite(this.lv[p.li]) || frac < p.tw0 || frac >= p.tw1) { this.last[i] = null; continue; }
        const x = this.xOf(p, frac) * d;
        let y = p.base - this.lv[p.li] * g * mm;
        y = clamp(y, 1, this.H - 1) * d;
        const l = this.last[i];
        if (l) { ctx.moveTo(l[0], l[1]); ctx.lineTo(x, y); }
        this.last[i] = [x, y];
      }
      t = tn;
    }
    ctx.stroke();
    const frac = (this.t - this.pageStart) / P;
    const w = Math.round(3.2 * mm * d);
    this.groups.forEach(gr => { const x = Math.round((gr.x0 + frac * gr.w) * d + 2 * d); if (x < this.cv.width) ctx.drawImage(this.bg, x, 0, w, this.cv.height, x, 0, w, this.cv.height); });
    this.drawn = this.t;
    if (Math.random() < 0.02) st.prune(this.t - 15000);
  }
  setHighlight(ids) { this.hl = ids || []; this.drawOverlay(); }
  /* Marcatori sugli intervalli: bracket del PR sopra ogni battito condotto e croce
     sulle P bloccate. Serve a vedere a colpo d'occhio l'allungamento progressivo
     del PR nel Wenckebach e la costanza del PR nel Mobitz 2. */
  drawMarks() {
    const st = this.stream; if (!st || !this.W) return;
    const c = this.octx, d = this.dpr, P = this.pageMs(), t0 = this.pageStart;
    const p = this.panels.find(x => x.strip) || this.panels.find(x => x.id === 'II') || this.panels[0];
    if (!p) return;
    const gr = this.groups[p.g];
    const xOf = t => (gr.x0 + (p.tw0 + ((t - t0) / P) * (p.tw1 - p.tw0)) * gr.w) * d;
    const tEnd = Math.min(this.t, t0 + P);
    const ev = st.ev.filter(e => e.t >= t0 - 60 && e.t <= tEnd);
    if (ev.length > 90) return;
    const yl = (p.top + 1.4 * this.pxmm) * d, yb = yl + 13 * d;
    c.save();
    c.font = '600 ' + Math.round(9.5 * d) + 'px -apple-system, system-ui, sans-serif';
    c.textBaseline = 'top'; c.textAlign = 'center'; c.lineWidth = 1.2 * d;
    c.strokeStyle = css.bad || css.accent; c.fillStyle = css.bad || css.accent;
    ev.forEach(a => {
      if (a.kind !== 'A' || !a.meta.blocked) return;
      const xa = xOf(a.t);
      c.beginPath();
      c.moveTo(xa - 3.5 * d, yb - 3 * d); c.lineTo(xa + 3.5 * d, yb + 4 * d);
      c.moveTo(xa + 3.5 * d, yb - 3 * d); c.lineTo(xa - 3.5 * d, yb + 4 * d);
      c.stroke();
    });
    c.strokeStyle = css.accent; c.fillStyle = css.accent;
    ev.forEach(v => {
      if (v.kind !== 'V' || v.meta.type !== 'conducted') return;
      let a = null;
      for (let i = st.ev.length - 1; i >= 0; i--) {
        const e = st.ev[i];
        if (e.kind !== 'A' || e.t >= v.t || v.t - e.t > 520) continue;
        if (e.meta.blocked || e.meta.type === 'retro') continue;
        a = e; break;
      }
      if (!a || a.t < t0 - 60) return;
      const x1 = xOf(a.t), x2 = xOf(v.t);
      if (x2 - x1 < 5 * d || x2 < gr.x0 * d) return;
      c.beginPath();
      c.moveTo(x1, yb + 4 * d); c.lineTo(x1, yb); c.lineTo(x2, yb); c.lineTo(x2, yb + 4 * d);
      c.stroke();
      c.fillText(Math.round(v.t - a.t), (x1 + x2) / 2, yl);
    });
    c.restore();
  }
  setSelected(id) { this.sel = id; this.drawOverlay(); }
  panelAt(x, y) { return this.panels.find(p => { const gw = this.groups[p.g]; const xa = gw.x0 + p.tw0 * gw.w - (p.tw0 === 0 ? 8 * this.pxmm : 0), xb = gw.x0 + p.tw1 * gw.w; return x >= xa && x < xb && y >= p.top && y < p.top + p.h; }); }
  onPointer(e) {
    const r = this.ov.getBoundingClientRect(); const x = e.clientX - r.left, y = e.clientY - r.top;
    if (this.calOn) {
      if (this.cal.length >= 2) this.cal = [];
      const gi = this.groups.findIndex(gr => x >= gr.x0 - 2 && x <= gr.x0 + gr.w + 2);
      if (gi < 0) return;
      this.cal.push({ x, y, g: gi });
      this.drawOverlay(); return;
    }
    const p = this.panelAt(x, y);
    if (p && this.opts.onSelect) this.opts.onSelect(p.id);
  }
  drawOverlay() {
    const c = this.octx, d = this.dpr; if (!this.W) return;
    c.clearRect(0, 0, this.ov.width, this.ov.height);
    this.panels.forEach(p => {
      const gw = this.groups[p.g]; const xa = (gw.x0 + p.tw0 * gw.w) * d, xb = (gw.x0 + p.tw1 * gw.w) * d;
      if (this.hl.includes(p.id) && !p.strip) { c.fillStyle = css.hl; c.fillRect(xa, p.top * d, xb - xa, p.h * d); }
      if (this.sel === p.id && !p.strip) { c.strokeStyle = css.accent; c.lineWidth = 2 * d; c.strokeRect(xa + d, p.top * d + d, xb - xa - 2 * d, p.h * d - 2 * d); }
    });
    if (this.marks) this.drawMarks();
    if (this.cal.length) {
      c.strokeStyle = css.accent; c.fillStyle = css.accent; c.lineWidth = 1.5 * d; c.setLineDash([5 * d, 4 * d]);
      this.cal.forEach(pt => { c.beginPath(); c.moveTo(pt.x * d, 0); c.lineTo(pt.x * d, this.H * d); c.stroke(); });
      c.setLineDash([]);
      this.cal.forEach(pt => { c.beginPath(); c.arc(pt.x * d, pt.y * d, 4 * d, 0, 6.283); c.fill(); });
      if (this.cal.length === 2) {
        const [a, b] = this.cal; const gw = this.groups[a.g];
        const dt = Math.abs(b.x - a.x) / (this.speed * this.pxmm) * 1000;
        const dmv = -(b.y - a.y) / (this.gain * this.pxmm);
        const txt = fmt(dt) + ' ms   ' + (dt > 150 ? fmt(60000 / dt) + '/min   ' : '') + (dmv >= 0 ? '+' : '−') + fmt(Math.abs(dmv), 2) + ' mV';
        const my = Math.min(a.y, b.y) * d;
        c.beginPath(); c.moveTo(a.x * d, my); c.lineTo(b.x * d, my); c.stroke();
        c.font = '600 ' + 13 * d + 'px -apple-system, system-ui, sans-serif';
        const tw = c.measureText(txt).width + 14 * d; const tx = clamp((a.x + b.x) / 2 * d - tw / 2, 4 * d, this.W * d - tw - 4 * d), ty = Math.max(4 * d, my - 30 * d);
        c.fillStyle = css.accent; c.beginPath(); c.roundRect ? c.roundRect(tx, ty, tw, 22 * d, 6 * d) : c.rect(tx, ty, tw, 22 * d); c.fill();
        c.fillStyle = '#fff'; c.textBaseline = 'middle'; c.fillText(txt, tx + 7 * d, ty + 11 * d);
      }
    }
  }
}

/* =====================================================================
   SCENA 3D
   ===================================================================== */
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const K3 = 1.15, LLEN = 2.3;
function frontalDir(a) { return V3(Math.cos(a * DEG), -Math.sin(a * DEG), 0); }
function horizDir(a) { return V3(Math.cos(a * DEG), 0, Math.sin(a * DEG)); }
function dirAB(a, b) { const ca = Math.cos(a * DEG), sa = Math.sin(a * DEG), cb = Math.cos(b * DEG), sb = Math.sin(b * DEG); const v = V3(ca * Math.abs(cb), -sa * Math.abs(cb), sb * Math.abs(ca)); return v.lengthSq() < 1e-9 ? V3(0, 1, 0) : v.normalize(); }
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function makeLabel(text, o) {
  o = Object.assign({ color: '#e4e9f2', h: 0.14, bg: null, weight: 600 }, o || {});
  const fs = 60, pad = o.bg ? 20 : 8; const cv = document.createElement('canvas'); let x = cv.getContext('2d');
  const font = o.weight + ' ' + fs + 'px -apple-system, system-ui, sans-serif'; x.font = font;
  const w = Math.ceil(x.measureText(text).width) + pad * 2; cv.width = w; cv.height = Math.round(fs * 1.35); x = cv.getContext('2d'); x.font = font;
  if (o.bg) { x.fillStyle = o.bg; rr(x, 2, 2, w - 4, cv.height - 4, cv.height / 2 - 2); x.fill(); }
  x.fillStyle = o.color; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, cv.height / 2 + 3);
  const tex = new THREE.CanvasTexture(cv); tex.minFilter = THREE.LinearFilter;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false }));
  s.scale.set(o.h * cv.width / cv.height, o.h, 1); s.renderOrder = 30; return s;
}
function glowTex() { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.35, 'rgba(255,230,170,.55)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(c); }
const ANAT_M = [0.5956, -0.7712, -0.2249, 0.2255, 0.4292, -0.8746, 0.771, 0.4702, 0.4295];
function cyl(a, b, r, mat) { const d = new THREE.Vector3().subVectors(b, a); const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, d.length(), 8, 1, true), mat); m.position.copy(a).addScaledVector(d, 0.5); m.quaternion.setFromUnitVectors(V3(0, 1, 0), d.clone().normalize()); return m; }

const FOCI = { rvot: V3(0.1, 0.12, 0.42), lvLat: V3(0.7, -0.3, 0), lvInf: V3(0.42, -0.72, -0.12), rvApex: V3(0.32, -0.8, 0.42) };

class Scene3D {
  constructor(el) {
    this.el = el;
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.available = true;
    r.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); this.available = false; sceneNotice(el, 'Vista 3D temporaneamente non disponibile. Il tracciato resta utilizzabile.'); });
    r.domElement.addEventListener('webglcontextrestored', () => { this.available = true; sceneNotice(el, ''); });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.insertBefore(r.domElement, el.firstChild);
    const sc = this.scene = new THREE.Scene(); sc.background = new THREE.Color(css.stage || '#121926');
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    if(window.HeartAtlasGeometry){HeartAtlasGeometry.setupRenderer(r);HeartAtlasGeometry.lighting(sc);sc.background=null;}
    else sc.add(new THREE.AmbientLight(0xffffff, 0.6));
    const l1 = new THREE.DirectionalLight(0xffffff, window.HeartAtlasGeometry?0:0.75); l1.position.set(2, 3, 4); sc.add(l1);
    const l2 = new THREE.DirectionalLight(0x9fb4ff, window.HeartAtlasGeometry?0:0.3); l2.position.set(-3, -1, -3); sc.add(l2);
    this.orbit = { theta: 0.62, phi: 1.16, r: 7.0, target: V3(0.15, -0.15, 0) }; this.anim = null;
    this.initControls();
    this.G = {}; ['leads', 'heart', 'anat', 'cond', 'fx', 'orb', 'dyn', 'proj'].forEach(k => { this.G[k] = new THREE.Group(); sc.add(this.G[k]); });
    this.GLOW = glowTex();
    this.buildLeads(); this.buildHeart(); this.buildConduction(); this.buildOrbitals(); this.buildDynamic();
    this.sel = null; this.cfg = {};
    this.v = [0, 0, 0]; this.tmp = V3(0, 0, 0);
  }
  initControls() {
    const cv = this.renderer.domElement, pts = new Map(); let pinch = null; const o = this.orbit;
    cv.addEventListener('pointerdown', e => { cv.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); this.anim = null; if (pts.size === 2) { const p = [...pts.values()]; pinch = { d: Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1, r: o.r }; } });
    cv.addEventListener('pointermove', e => { if (!pts.has(e.pointerId)) return; const pr = pts.get(e.pointerId), cu = { x: e.clientX, y: e.clientY }; pts.set(e.pointerId, cu);
      if (pts.size === 1) { o.theta -= (cu.x - pr.x) * 0.008; o.phi = clamp(o.phi - (cu.y - pr.y) * 0.008, 0.02, Math.PI - 0.02); $$('#hud3d [data-cam]').forEach(b => b.classList.remove('on')); }
      else if (pinch) { const p = [...pts.values()]; o.r = clamp(pinch.r * pinch.d / (Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y) || 1), 2.5, 16); } });
    const end = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('wheel', e => { e.preventDefault(); o.r = clamp(o.r * Math.exp(e.deltaY * 0.0012), 2.5, 16); }, { passive: false });
  }
  cam(id) { const C = { iso: { theta: 0.62, phi: 1.16, r: 7 }, front: { theta: 0, phi: Math.PI / 2, r: 6.8 }, top: { theta: 0, phi: 0.02, r: 6.8 }, conduction:{theta:0,phi:1.55,r:3.1} }[id]; const dth = (((C.theta - this.orbit.theta) / DEG + 540) % 360 - 180) * DEG; this.anim = { from: { theta: this.orbit.theta, phi: this.orbit.phi, r: this.orbit.r }, to: { theta: this.orbit.theta + dth, phi: C.phi, r: C.r }, t: 0 }; }
  buildLeads() {
    const G = this.G.leads; this.leadObj = {};
    LEADS.forEach(L => {
      const dir = L.p === 'F' ? frontalDir(L.ang) : horizDir(L.ang); const col = L.p === 'F' ? '#9db0ca' : '#d6b88c';
      const mat = new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.75 });
      const pos = cyl(V3(0, 0, 0), dir.clone().multiplyScalar(LLEN), 0.009, mat); G.add(pos);
      const ng = new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), dir.clone().multiplyScalar(-LLEN * 0.7)]);
      const nl = new THREE.Line(ng, new THREE.LineDashedMaterial({ color: col, dashSize: 0.07, gapSize: 0.06, transparent: true, opacity: 0.35 })); nl.computeLineDistances(); G.add(nl);
      const lab = makeLabel(L.id, { h: 0.19, color: '#0f1522', bg: col, weight: 700 }); lab.position.copy(dir).multiplyScalar(LLEN + 0.22); G.add(lab);
      this.leadObj[L.id] = { dir, pos, mat, lab, col };
    });
    [['F', frontalDir, '#9db0ca'], ['H', horizDir, '#d6b88c']].forEach(([k, fn, col]) => {
      const pts = []; for (let a = 0; a <= 360; a += 4) pts.push(fn(a).multiplyScalar(LLEN));
      G.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: col, transparent: true, opacity: 0.22 })));
    });
  }
  buildHeart() {
    const G = this.G.heart; this.hm = [];
    const hmat = (c, op) => { const m = new THREE.MeshPhongMaterial({ color: c, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide, shininess: 35, emissive: new THREE.Color(0, 0, 0) }); this.hm.push(m); return m; };
    this.mVent = hmat('#c64d58', 0.22); this.mAtr = hmat('#d8766a', 0.2); const mAo = hmat('#d0605a', 0.18), mVen = hmat('#5f7fcc', 0.18);
    if(window.HeartAtlas){
      this.atlasHeart=HeartAtlas.build({opacity:1});G.add(this.atlasHeart.group);
      const status=document.createElement('p');status.className='atlas-loading';status.setAttribute('role','status');status.textContent='Caricamento del cuore anatomico…';this.el.appendChild(status);
      this.atlasHeart.ready.then(()=>{status.hidden=true;}).catch(()=>{status.textContent='Cuore anatomico non caricato. Ricarica per riprovare; ECG e vettori restano disponibili.';});return;
    }
    const apex = V3(0.52, -0.66, 0.54).normalize();
    const vg = new THREE.SphereGeometry(1, 48, 32); const p = vg.attributes.position;
    for (let i = 0; i < p.count; i++) { const y = p.getY(i); const tp = 1 - 0.42 * Math.pow((y + 1) / 2, 1.3); p.setXYZ(i, p.getX(i) * tp * 0.52, y * 0.78, p.getZ(i) * tp * 0.5); }
    vg.computeVertexNormals(); const v = new THREE.Mesh(vg, this.mVent); v.quaternion.setFromUnitVectors(V3(0, 1, 0), apex); v.position.set(0.3, -0.42, 0.14); G.add(v);
    const ra = new THREE.Mesh(new THREE.SphereGeometry(0.3, 28, 20), this.mAtr); ra.position.set(-0.42, 0.38, 0.12); G.add(ra);
    const la = new THREE.Mesh(new THREE.SphereGeometry(0.27, 28, 20), this.mAtr); la.position.set(0.22, 0.36, -0.36); la.scale.set(1.15, 0.9, 0.9); G.add(la);
    const tube = (pts, r, m) => G.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(q => V3(q[0], q[1], q[2]))), 48, r, 12, false), m));
    tube([[0.02, 0.25, -0.02], [0, 0.8, 0.02], [0.12, 1.2, -0.08], [0.42, 1.28, -0.35], [0.55, 0.95, -0.55], [0.55, 0.2, -0.6], [0.52, -0.7, -0.58]], 0.1, mAo);
    tube([[0.12, 0.2, 0.32], [0.2, 0.6, 0.35], [0.38, 0.9, 0.12], [0.52, 0.98, -0.06]], 0.09, mVen);
    tube([[-0.55, 1.25, -0.08], [-0.54, 0.9, -0.04], [-0.52, 0.64, 0]], 0.08, mVen);
    tube([[-0.36, 0.12, -0.02], [-0.34, -0.4, -0.08], [-0.3, -0.95, -0.12]], 0.09, mVen);
  }
  buildConduction() {
    if(window.IsoConductionView&&this.atlasHeart){
      this.conduction=IsoConductionView.create({scale:HeartAtlas.SCALE,material:m=>this.atlasHeart.movingMaterial(m),deform:p=>this.atlasHeart.deformPoint(p)});
      this.G.cond.add(this.conduction.group);this.conduction.xray(true);this.conductionLabels=[];
      for(const [name,pos]of [['NSA',IsoConduction.anchors.sa],['NAV',IsoConduction.anchors.av],['His',IsoConduction.anchors.his]]){const label=makeLabel(name,{h:.085,color:'#785326',bg:'rgba(250,246,234,.9)',weight:600});label.position.set(pos[0]*HeartAtlas.SCALE-.09,pos[1]*HeartAtlas.SCALE+.055,pos[2]*HeartAtlas.SCALE);label.userData.rest=pos;this.conductionLabels.push(label);this.G.cond.add(label);}
      return;
    }
    const G = this.G.cond, FX = this.G.fx; this.paths = {};
    const base = new THREE.MeshBasicMaterial({ color: '#8a7446', transparent: true, opacity: 0.9 });
    this.blockMat = new THREE.MeshBasicMaterial({ color: '#ff4d6a', transparent: true, opacity: 0.95 });
    const spark = new THREE.SphereGeometry(0.032, 12, 8), sparkM = new THREE.MeshBasicMaterial({ color: '#fff6d1' });
    this.glowM = new THREE.SpriteMaterial({ map: this.GLOW, color: 0xffd36b, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending });
    const add = (name, pts, r, withSpark) => {
      const curve = new THREE.CatmullRomCurve3(pts.map(q => V3(q[0], q[1], q[2])));
      const seg = Math.max(10, Math.round(curve.getLength() * 90)), rad = 8;
      const bm = new THREE.Mesh(new THREE.TubeGeometry(curve, seg, r, rad, false), base); G.add(bm);
      const og = new THREE.TubeGeometry(curve, seg, r * 1.55, rad, false); og.setDrawRange(0, 0);
      const om = new THREE.MeshBasicMaterial({ color: '#ffe08a', transparent: true, depthWrite: false }); const ov = new THREE.Mesh(og, om); FX.add(ov);
      let part = null; if (withSpark) { part = new THREE.Mesh(spark, sparkM); const gl = new THREE.Sprite(this.glowM); gl.scale.set(0.3, 0.3, 1); part.add(gl); part.visible = false; FX.add(part); }
      const o = { curve, bm, og, om, part, seg, rad }; (this.paths[name] = this.paths[name] || []).push(o); return o;
    };
    const NSA = [-0.38, 0.46, 0.10], NAV = [0, 0, 0], BIF = [0.12, -0.25, 0.1], RB = [0.15, -0.62, 0.42], LAF = [0.55, -0.36, 0.18], LPF = [0.40, -0.63, 0.0];
    add('atr', [NSA, [-0.26, 0.34, 0.14], [-0.12, 0.16, 0.10], NAV], 0.012, true);
    add('atr', [NSA, [-0.28, 0.30, 0.02], [-0.13, 0.14, 0], NAV], 0.012, true);
    add('atr', [NSA, [-0.30, 0.26, -0.08], [-0.14, 0.10, -0.06], NAV], 0.012, true);
    add('atr', [NSA, [-0.15, 0.50, 0.0], [0.05, 0.46, -0.16], [0.18, 0.36, -0.28]], 0.012, true);
    add('his', [NAV, [0.06, -0.12, 0.06], BIF], 0.02, true);
    add('rb', [BIF, [0.1, -0.4, 0.26], [0.12, -0.55, 0.38], RB], 0.015, true);
    add('laf', [BIF, [0.3, -0.26, 0.12], [0.5, -0.3, 0.2], LAF], 0.015, true);
    add('lpf', [BIF, [0.26, -0.36, 0.02], [0.38, -0.58, -0.02], LPF], 0.015, true);
    let s = 7; const R = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
    [['rb', RB], ['laf', LAF], ['lpf', LPF]].forEach(([k, e]) => { for (let i = 0; i < 6; i++) { const d = V3(R() - 0.5, R() - 0.7, R() - 0.5).normalize().multiplyScalar(0.1 + R() * 0.12); const a = V3(...e), b = a.clone().add(d), m = a.clone().addScaledVector(d, 0.5).add(V3((R() - 0.5) * 0.05, (R() - 0.5) * 0.05, (R() - 0.5) * 0.05)); add('pk-' + k, [[a.x, a.y, a.z], [m.x, m.y, m.z], [b.x, b.y, b.z]], 0.006, false); } });
    this.kent = add('kent', [[0.42, 0.18, -0.38], [0.58, 0.02, -0.25], [0.72, -0.18, -0.06]], 0.018, true);
    const ring = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI * 2; ring.push([-0.22 + 0.24 * Math.cos(a), 0.02 + 0.2 * Math.sin(a), 0.2 + 0.08 * Math.sin(a)]); }
    this.ringCurve = new THREE.CatmullRomCurve3(ring.map(q => V3(...q)), true);
    this.ring = new THREE.Mesh(new THREE.TubeGeometry(this.ringCurve, 80, 0.012, 8, true), new THREE.MeshBasicMaterial({ color: '#b89a5a', transparent: true, opacity: 0.8 })); G.add(this.ring);
    this.ringPart = new THREE.Mesh(spark, sparkM); const rg = new THREE.Sprite(this.glowM); rg.scale.set(0.34, 0.34, 1); this.ringPart.add(rg); FX.add(this.ringPart);
    const nm = () => new THREE.MeshBasicMaterial({ color: '#ffcf5a' });
    this.nsa = new THREE.Mesh(new THREE.SphereGeometry(0.06, 16, 12), nm()); this.nsa.position.set(...NSA); G.add(this.nsa);
    this.nav = new THREE.Mesh(new THREE.SphereGeometry(0.055, 16, 12), nm()); G.add(this.nav);
    this.navGlow = new THREE.Sprite(this.glowM.clone()); this.navGlow.scale.set(0.4, 0.4, 1); this.nav.add(this.navGlow);
    this.nsaGlow = new THREE.Sprite(this.glowM.clone()); this.nsaGlow.scale.set(0.45, 0.45, 1); this.nsa.add(this.nsaGlow);
    this.focus = new THREE.Mesh(new THREE.SphereGeometry(0.07, 16, 12), new THREE.MeshBasicMaterial({ color: '#ff9b6b' })); FX.add(this.focus);
    this.wave = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 20), new THREE.MeshBasicMaterial({ color: '#ff8a5b', transparent: true, opacity: 0.2, depthWrite: false })); FX.add(this.wave);
    this.sparks = []; for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(this.glowM.clone()); sp.scale.set(0.22, 0.22, 1); FX.add(sp); this.sparks.push(sp); }
    [['Nodo del seno', [-0.82, 0.62, 0.08]], ['Nodo AV', [-0.42, -0.08, 0.2]], ['His', [-0.18, -0.3, 0.26]]].forEach(([t, p]) => { const l = makeLabel(t, { h: 0.12, color: '#ffe3a0', weight: 500, bg: 'rgba(20,16,6,.55)' }); l.position.set(...p); G.add(l); });
  }
  buildOrbitals() {
    const G = this.G.orb;
    const defs = [{ c: '#f5a623', f: [0, 75], h: [-20, 50], L: 0.45 }, { c: '#ff72c8', f: [-30, 90], h: [-50, 10], L: 1.5 }, { c: '#3fd896', f: [0, 90], h: [10, 70], L: 0.75 }];
    defs.forEach(w => {
      const ac = (w.f[0] + w.f[1]) / 2, bc = (w.h[0] + w.h[1]) / 2, ha = (w.f[1] - w.f[0]) / 2, hb = (w.h[1] - w.h[0]) / 2, NS = 22, NP = 40, pos = [], idx = [];
      for (let i = 0; i <= NS; i++) { const s = i / NS, len = w.L * Math.pow(Math.max(0, 1 - Math.pow(s, 2.4)), 0.55); for (let j = 0; j <= NP; j++) { const p = j / NP * Math.PI * 2; const d = dirAB(ac + s * ha * Math.cos(p), bc + s * hb * Math.sin(p)); pos.push(d.x * len, d.y * len, d.z * len); } }
      for (let i = 0; i < NS; i++) for (let j = 0; j < NP; j++) { const a = i * (NP + 1) + j, b = a + NP + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
      const m = new THREE.Mesh(g, new THREE.MeshPhongMaterial({ color: w.c, transparent: true, opacity: 0.12, side: THREE.DoubleSide, depthWrite: false, emissive: new THREE.Color(w.c).multiplyScalar(0.2) })); m.renderOrder = 3; G.add(m);
    });
  }
  buildDynamic() {
    const G = this.G.dyn;
    this.arMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
    const sg = new THREE.CylinderGeometry(0.022, 0.022, 1, 10); sg.translate(0, 0.5, 0);
    const hg = new THREE.ConeGeometry(0.065, 0.18, 14); hg.translate(0, -0.09, 0);
    this.shaft = new THREE.Mesh(sg, this.arMat); this.head = new THREE.Mesh(hg, this.arMat); G.add(this.shaft, this.head);
    this.NT = 160; const tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.NT * 3), 3));
    const col = new Float32Array(this.NT * 3); for (let i = 0; i < this.NT; i++) { const k = Math.pow(1 - i / this.NT, 1.5); col[i * 3] = 1 * k + 0.08; col[i * 3 + 1] = 0.75 * k + 0.1; col[i * 3 + 2] = 0.45 * k + 0.15; }
    tg.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true })); this.trail.frustumCulled = false; G.add(this.trail);
    const P = this.G.proj;
    this.projLine = new THREE.Line(new THREE.BufferGeometry().setFromPoints([V3(0, 0, 0), V3(0, 0, 0)]), new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.05, gapSize: 0.04 })); this.projLine.frustumCulled = false; P.add(this.projLine);
    const pg = new THREE.CylinderGeometry(0.03, 0.03, 1, 10); pg.translate(0, 0.5, 0);
    this.projSeg = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: '#ff5d78' })); P.add(this.projSeg);
  }
  setScenario(cfg) {
    this.cfg = cfg || {};
    if(this.conduction){this.cfg={...cfg,isoScenario:cfg.isoScenario||S.sc};this.conduction.setScenario(this.cfg);return;}
    const via = cfg.via;
    const blocked = { rbbb: ['rb', 'pk-rb'], lbbb: ['laf', 'lpf', 'pk-laf', 'pk-lpf'], lafb: ['laf', 'pk-laf'], lpfb: ['lpf', 'pk-lpf'] }[via] || [];
    Object.keys(this.paths).forEach(k => this.paths[k].forEach(p => { p.bm.material = blocked.includes(k) ? this.blockMat : p.bm.material === this.blockMat ? this.paths.his[0].bm.material : p.bm.material; }));
    this.blocked = blocked;
    this.kent.bm.visible = via === 'wpw';
    this.ring.visible = this.ringPart.visible = cfg.cont === 'flutter';
  }
  selectLead(id) { this.sel = id; Object.keys(this.leadObj).forEach(k => { const o = this.leadObj[k]; const on = k === id; o.pos.scale.set(on ? 2.8 : 1, 1, on ? 2.8 : 1); o.mat.opacity = id && !on ? 0.28 : 0.8; o.mat.color.set(on ? '#ffffff' : o.col); o.lab.material.opacity = id && !on ? 0.45 : 1; }); }
  toggle(k, on) {
    const g = { orb: this.G.orb, heart: this.G.heart, leads: this.G.leads, anat: this.G.anat }[k];
    if (g) g.visible = on;
    if (k === 'anat' && on) this.loadAnat();
  }
  loadAnat() {
    if (this._anatReq) return; this._anatReq = true;
    if (!window.ISO_CUORE) return;
    this.cuore = (window.HeartAtlas||ISO_CUORE).build({ opacity: this._anatOp == null ? 0.6 : this._anatOp });
    this.anatMats = []; this.cuore.group.traverse(o => { if (o.isMesh) this.anatMats.push(o.material); });
    this.G.anat.add(this.cuore.group);
    if(this.cuore.ready)this.cuore.ready.catch(()=>{this._anatReq=false;});
  }
  setHeartOpacity(v) {
    this._anatOp = v;
    if(this.atlasHeart){this.atlasHeart.setOpacity(v);if(this.cuore?.setOpacity)this.cuore.setOpacity(v);return;}
    (this.anatMats || []).forEach(m => { m.opacity = v; m.needsUpdate = true; });
    this.G.heart.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o.material.userData.op0 !== false) { if (o.material.userData.base == null) o.material.userData.base = o.material.opacity; o.material.opacity = o.material.userData.base * (0.3 + 1.2 * v); } });
  }
  resize() { const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.fov = w < h ? 50 : 38; this.camera.updateProjectionMatrix(); }
  lightPath(name, u, fade) { (this.paths[name] || []).forEach(p => { if (u < 0) { p.og.setDrawRange(0, 0); if (p.part) p.part.visible = false; return; } const uu = Math.min(1, u); p.og.setDrawRange(0, Math.floor(uu * p.seg) * p.rad * 6); p.om.opacity = u <= 1 ? 1 : Math.max(0, 1 - fade); if (p.part) { p.part.visible = u <= 1; if (u <= 1) p.curve.getPointAt(uu, p.part.position); } }); }
  update(t, st) {
    if (this.available === false) return;
    if (!st) return;
    const o = this.orbit;
    if (this.anim) { this.anim.t = Math.min(1, this.anim.t + 0.05); const e = 1 - Math.pow(1 - this.anim.t, 3); ['theta', 'phi', 'r'].forEach(k => { o[k] = this.anim.from[k] + (this.anim.to[k] - this.anim.from[k]) * e; }); if (this.anim.t >= 1) this.anim = null; }
    const s = Math.sin(o.phi); this.camera.position.set(o.target.x + o.r * s * Math.sin(o.theta), o.target.y + o.r * Math.cos(o.phi), o.target.z + o.r * s * Math.cos(o.theta)); this.camera.lookAt(o.target);
    // vettore e scia
    st.vec(t, this.v); const vx = this.v[0] * K3, vy = this.v[1] * K3, vz = this.v[2] * K3; const len = Math.hypot(vx, vy, vz);
    const n = this.tmp.set(vx, vy, vz); if (len > 1e-3) n.divideScalar(len);
    const q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), len > 1e-3 ? n : V3(0, 1, 0));
    const hh = Math.min(0.18, len * 0.5); this.shaft.visible = this.head.visible = len > 0.03;
    this.shaft.quaternion.copy(q); this.head.quaternion.copy(q); this.shaft.scale.set(1, Math.max(0.001, len - hh), 1); this.head.scale.setScalar(hh / 0.18 || 0.001); this.head.position.copy(n).multiplyScalar(len);
    const pa = this.trail.geometry.attributes.position, w = [0, 0, 0];
    for (let i = 0; i < this.NT; i++) { st.vec(t - i * 6, w); pa.setXYZ(i, w[0] * K3, w[1] * K3, w[2] * K3); }
    pa.needsUpdate = true;
    // proiezione
    this.G.proj.visible = !!this.sel && len > 0.02;
    if (this.sel && len > 0.02) {
      const Ld = this.leadObj[this.sel].dir; const L = LEADS[LIDX[this.sel]]; const sp = (vx * Ld.x + vy * Ld.y + vz * Ld.z);
      const foot = Ld.clone().multiplyScalar(sp);
      const pp = this.projLine.geometry.attributes.position; pp.setXYZ(0, vx, vy, vz); pp.setXYZ(1, foot.x, foot.y, foot.z); pp.needsUpdate = true; this.projLine.computeLineDistances();
      this.projSeg.visible = Math.abs(sp) > 0.01; this.projSeg.quaternion.setFromUnitVectors(V3(0, 1, 0), sp > 0 ? Ld : Ld.clone().negate()); this.projSeg.scale.set(1, Math.abs(sp) || 0.001, 1);
    }
    if(this.conduction){
      this.atlasHeart.update(t,st,this.cfg);
      for(const label of this.conductionLabels){const p=this.atlasHeart.deformPoint(new THREE.Vector3(...label.userData.rest)).multiplyScalar(HeartAtlas.SCALE);label.position.copy(p).add(new THREE.Vector3(-.09,.055,0));}
      const plan=this.conduction.update(CardiacClock.read(st,t,this.cfg),this.cfg);this.phase=plan.phase;
    }else{
    // attivazioni
    const ev = st.eventsAround(t), A = ev.A, Vt = ev.V, cfg = this.cfg;
    ['atr', 'his', 'rb', 'laf', 'lpf', 'pk-rb', 'pk-laf', 'pk-lpf', 'kent'].forEach(k => this.lightPath(k, -1));
    this.focus.visible = false; this.wave.visible = false; this.sparks.forEach(sp => { sp.visible = false; });
    let phase = '';
    let atrGlow = 0, ventGlow = 0, tGlow = 0, navRed = false;
    if (A) {
      const dA = t - A.t;
      if (A.meta.type === 'sinus' && dA < 260) { this.lightPath('atr', (dA - 5) / 78, (dA - 83) / 120); atrGlow = dA < 115 ? Math.sin(Math.PI * dA / 115) : 0; if (dA < 115) phase = 'Onda P: depolarizzazione atriale'; }
      if (A.meta.type === 'pac' && dA < 140) { const sp = this.sparks[0]; sp.visible = true; sp.position.set(-0.2, 0.18, -0.2); sp.scale.setScalar(0.25 + dA / 140 * 0.6); sp.material.opacity = 1 - dA / 140; atrGlow = Math.sin(Math.PI * Math.min(1, dA / 110)); phase = 'P prematura da focus atriale basso'; }
      if (A.meta.blocked && dA > 90 && dA < 320) {
        const site = cfg.avBlockSite || (cfg.av === 'wenck' ? 'nodale' : cfg.av === 'mobitz2' ? 'infranodale' : 'non definita');
        navRed = site === 'nodale';
        phase = A.meta.refractory ? 'P nel periodo refrattario: non condotta' : 'P non condotta: sede del blocco ' + site;
      }
      if (A.meta.type === 'retro' && dA < 80) { atrGlow = 0.6; }
    }
    if (Vt) {
      const dV = t - Vt.t, m = Vt.meta, W = m.w || 100;
      if (m.type === 'conducted' || m.type === 'escape-j') {
        if (m.type === 'conducted') { this.lightPath('his', (dV + 42) / 30, (dV + 12) / 100); }
        else { this.lightPath('his', (dV + 30) / 26, (dV) / 100); }
        const bu = (dV + 12) / 30, pu = (dV + 2) / 26;
        ['rb', 'laf', 'lpf'].forEach(k => { if (!this.blocked.includes(k)) { this.lightPath(k, bu, (dV - 18) / 120); this.lightPath('pk-' + k, pu, (dV - 24) / 120); } });
        if (m.via === 'wpw') this.lightPath('kent', (dV + 8) / 38, (dV - 30) / 120);
        if (this.blocked.length && dV > 20 && dV < W) { this.wave.visible = true; const f = (dV - 20) / (W - 20); const from = cfg.via === 'rbbb' ? V3(0.15, -0.35, 0.2) : V3(0.15, -0.35, 0.1); this.wave.position.copy(from); this.wave.scale.setScalar(0.1 + f * 0.8); this.wave.material.opacity = 0.22 * (1 - f); }
      }
      if (m.paced || m.type === 'pvc' || m.type === 'vt' || m.type === 'escape-v') {
        const fpos = FOCI[m.focus] || FOCI.lvInf; this.focus.visible = true; this.focus.position.copy(fpos);
        if (dV < W * 1.2) { this.wave.visible = true; const f = dV / (W * 1.2); this.wave.position.copy(fpos); this.wave.scale.setScalar(0.08 + f * 1.15); this.wave.material.opacity = 0.28 * (1 - f); }
      }
      if (dV < W) { ventGlow = Math.sin(Math.PI * dV / W); phase = m.type === 'paced-crt' ? 'CRT-D: stimolazione biventricolare' : m.paced ? 'Spike e depolarizzazione ventricolare stimolata' : m.type === 'pvc' ? 'Extrasistole ventricolare: il fronte parte dal focus' : m.type === 'vt' ? 'Tachicardia ventricolare: attivazione dal circuito di rientro' : m.type === 'escape-v' ? 'Scappamento ventricolare' : m.via === 'wpw' && dV < 45 ? 'Onda delta: pre-eccitazione dal fascio di Kent' : 'QRS: depolarizzazione ventricolare'; }
      else if (m.qt && dV < m.qt) { tGlow = Math.sin(Math.PI * (dV - W) / (m.qt - W)); if (!phase) phase = 'ST e T: ripolarizzazione ventricolare'; }
    }
    if (cfg.cont === 'af' || cfg.cont === 'vf' || cfg.cont === 'torsade') {
      const vent = cfg.cont !== 'af';
      this.sparks.forEach((sp, i) => { if (Math.random() < 0.25) { const c = vent ? V3(0.3, -0.45, 0.12) : (i % 2 ? V3(-0.42, 0.38, 0.12) : V3(0.22, 0.36, -0.36)); sp.position.set(c.x + (Math.random() - 0.5) * 0.5, c.y + (Math.random() - 0.5) * 0.5, c.z + (Math.random() - 0.5) * 0.4); } sp.visible = true; sp.material.opacity = 0.5 + Math.random() * 0.5; });
      if (vent) { ventGlow = 0.5 + 0.3 * Math.random(); phase = cfg.cont === 'vf' ? 'Fibrillazione ventricolare: attivazione caotica' : 'Torsione di punta: l\u2019asse ruota nello spazio'; }
      else { atrGlow = Math.max(atrGlow, 0.25 + 0.2 * Math.random()); if (!phase) phase = 'Onde f: atri attivati in modo caotico'; }
    }
    if (cfg.cont === 'flutter') { const T = 60000 / (cfg.fRate || 300); const a = ((t % T) / T); this.ringCurve.getPointAt(a, this.ringPart.position); atrGlow = Math.max(atrGlow, 0.35); if (!phase) phase = 'Onde F: macrorientro attorno alla tricuspide'; }
    this.nsaGlow.material.opacity = A && A.meta.type === 'sinus' && t - A.t < 40 ? 1 : 0.3;
    this.navGlow.material.color.set(navRed ? '#ff3b5c' : '#ffd36b'); this.navGlow.material.opacity = navRed ? 0.9 : 0.3; this.navGlow.scale.setScalar(navRed ? 0.6 : 0.35);
    this.mAtr.emissive.setRGB(0.55 * atrGlow, 0.32 * atrGlow, 0.05 * atrGlow);
    this.mVent.emissive.setRGB(0.5 * ventGlow + 0.05 * tGlow, 0.05 * ventGlow + 0.2 * tGlow, 0.08 * ventGlow + 0.22 * tGlow);
    this.phase = phase || 'Diastole elettrica';
    if(this.atlasHeart)this.atlasHeart.update(t,st,cfg);
    }
    if(this.cuore?.update)this.cuore.update(t,st,this.cfg);
    this.renderer.render(this.scene, this.camera);
  }
}

/* =====================================================================
   APP: TRACCIATO
   ===================================================================== */
const byId = {}; SCENARIOS.forEach(s => { byId[s.id] = s; });
const S = {
  sc: byId[store.sc] ? store.sc : 'normale',
  mode: store.mode || 'print', speed: store.speed || 25, gain: store.gain || 10, slow: 1,
  playing: !window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  sel: null, noise: store.noise == null ? 0 : store.noise, sesso: store.sesso === 'F' ? 'F' : 'M',
  ectTipo: store.ectTipo === 'pac' ? 'pac' : 'pvc', ectPat: store.ectPat || 'off', view: 'trace', tgl: Object.assign({ orb: true, heart: true, leads: true, anat: false }, store.tgl || {}), opac: store.opac == null ? 1 : store.opac
};
let stream = null, curCfg = null, seed = 1;
const mon = new Monitor($('#ecg'), $('#ecgOv'), { onSelect: id => { S.sel = S.sel === id ? null : id; mon.setSelected(S.sel); scene.selectLead(S.sel); $$('#p-card .chip').forEach(c => c.classList.toggle('on', c.dataset.l === S.sel)); } });
mon.mode = S.mode; mon.speed = S.speed; mon.gain = S.gain;
function sceneNotice(el, message) {
  let n = el.querySelector('.scene-notice');
  if (!n) { n = document.createElement('p'); n.className = 'scene-notice'; n.setAttribute('role', 'status'); el.appendChild(n); }
  n.textContent = message; n.hidden = !message;
  el.querySelectorAll('[data-cam], [data-tg], #hOpac').forEach(b => { b.disabled = !!message; });
}
function createScene(el) {
  try { return new Scene3D(el); }
  catch (error) {
    console.warn('Vista 3D non disponibile:', error.message);
    sceneNotice(el, 'Vista 3D non disponibile su questo dispositivo. ECG, misure, teoria e quiz restano utilizzabili.');
    return { available: false, phase: 'Vista 3D non disponibile', scene: { background: { set() {} } },
      toggle() {}, resize() {}, cam() {}, selectLead() {}, setHeartOpacity() {}, setScenario() {}, update() {} };
  }
}
const scene = createScene($('#stage'));
// Both older heart display preferences now use the shared anatomical asset.
if(window.HeartAtlas && S.tgl.anat){S.tgl.heart=true;S.tgl.anat=false;}
if (S.tgl.anat && S.tgl.heart) S.tgl.anat = false;
Object.keys(S.tgl).forEach(k => { scene.toggle(k, S.tgl[k]); const b = $('#hud3d [data-tg="' + k + '"]'); if (b) b.classList.toggle('on', S.tgl[k]); });

function defaultParams(sc) { return Object.fromEntries(sc.params.map(q => [q.k, q.def])); }
function paramsFor(sc) { return Object.assign(defaultParams(sc), store.params[sc.id] || {}); }
function cancelCaseActions() {
  caseVersion++; recordRequest++; clearTimeout(rebuildT); clearTimeout(shockTimer); rebuildT = shockTimer = null;
  if (recordAbort) { recordAbort.abort(); recordAbort = null; }
  $('#recordBar').hidden = true;
  defUI(null);
}
/* Schema di ripetizione delle extrasistoli applicato al quadro corrente.
   Funziona sui ritmi con base sinusale: negli altri (FA, flutter, TV, blocco
   completo, ritmi continui) il concetto di bigeminismo non ha senso. */
function ritmoSinusale(cfg) {
  return !cfg.mode && !cfg.atrial && !cfg.cont && !cfg.pacing && cfg.av !== 'III' && cfg.av !== 'dissoc';
}
function applicaEctopia(cfg) {
  if (!S.ectPat || S.ectPat === 'off' || !ritmoSinusale(cfg)) return;
  cfg.ectopy = {
    type: S.ectTipo, pattern: S.ectPat, prob: 0.18, coupling: 0.52,
    qrs: S.ectTipo === 'pvc' ? window.ECG.M.qrsPVC_RVOT() : null
  };
}
function aggiornaEctUI() {
  const sel = $('#ectPat'); if (sel) sel.value = S.ectPat;
  $$('#ectSeg button').forEach(b => b.classList.toggle('on', b.dataset.e === S.ectTipo));
  const runs = $('#ectPat option[value="salve"]'); if (runs) runs.textContent = S.ectTipo === 'pac' ? 'Salve atriali' : 'Salve (TV non sostenuta)';
  const ok = curCfg ? ritmoSinusale(curCfg) : true;
  $$('#ectSeg button').forEach(b => { b.disabled = !!(curCfg && curCfg.pacing); });
  if (sel) { sel.disabled = !ok; sel.title = ok ? 'Fa comparire le extrasistoli in modo continuo secondo uno schema' : 'Lo schema di ripetizione vale solo sui ritmi a base sinusale'; }
}
function buildStream(sc, p, keepTime) {
  cancelCaseActions();
  curCfg = window.IsoConduction?IsoConduction.configure(sc.id,sc.build(p),p):sc.build(p); curCfg.noise = S.noise; curCfg.t0 = keepTime ? mon.t : 0;
  applicaEctopia(curCfg);
  devicePacing(sc, curCfg);
  stream = new Stream(curCfg, ++seed);
  mon.setStream(stream, keepTime);
  scene.setScenario(curCfg);
}

/* ==================== DISPOSITIVI DIDATTICI ==================== */
const DEVICE = { type: 'none', rate: 70, pulse: 'present' };
const DEVICE_NAMES = { none: 'Nessuno', pm: 'Pacemaker', dae: 'DAE', icd: 'ICD', crtd: 'CRT-D' };
const DEF = { sc: null, coda: [], t0: 0, stage: 'idle', rhythm: null };
const DEF_DOPO = {
  sinusale: () => ({ rate: 74, pr: 170, qtc: 425, qrs: ECG.M.qrsNormal() }),
  bradi: () => ({ rate: 44, pr: 200, qtc: 450, qrs: ECG.M.qrsNormal() }),
  asistolia: () => ({ mode: 'continuous' })
};
const DEF_SHOCK = { fv: 1, fvfine: 1, tvsp: 1, flutterv: 1, tdp: 1 };
function devicePacing(sc, cfg) {
  // Nessuna cattura miracolosa in asistolia/PEA/FV o nelle tachiaritmie.
  const arrest = ['asistolia', 'pea', 'agonico'].includes(sc.id) ||
    (sc.defib && ['asistolia', 'pea', 'agonico'].includes(paramsFor(sc).ritmo));
  if (!['pm', 'icd', 'crtd'].includes(DEVICE.type) || arrest || cfg.cont ||
      cfg.mode === 'continuous' || (cfg.mode === 'vt' && cfg.vRate >= 100) ||
      (cfg.qrs && cfg.qrs.spike) || (cfg.escQrs && cfg.escQrs.spike)) return;
  cfg.pacing = { type: DEVICE.type === 'crtd' ? 'crt' : 'vvi', rate: DEVICE.rate, device: DEVICE.type };
}
function deviceRhythm(sc) {
  if (sc.defib) return paramsFor(sc).ritmo;
  if (curCfg.cont === 'vf') return 'fv';
  if (curCfg.cont === 'torsade') return 'tdp';
  if (sc.id === 'flutterv') return 'flutterv';
  if (curCfg.mode === 'vt' && curCfg.vRate >= 120) return 'tvsp';
  return sc.id;
}
function deviceShockable() {
  if (!DEF_SHOCK[DEF.rhythm]) return false;
  // Il polso è un dato dello scenario: non viene dedotto dal segnale ECG.
  return DEVICE.type !== 'dae' || DEF.sc.defib ||
    !['tvsp', 'tdp'].includes(DEF.rhythm) || DEVICE.pulse === 'absent';
}
function deviceNote(sc) {
  if (DEVICE.type === 'none') return 'Aggiungi un dispositivo per vedere i comandi sopra il tracciato. Rimuovilo per tornare al quadro originale.';
  if (DEVICE.type === 'dae') return 'Defibrilla avvia l’analisi simulata. La scarica si abilita solo per un ritmo defibrillabile nel contesto scelto.';
  const support = curCfg.pacing ? ' Stimolazione a domanda: gli spike compaiono quando il dispositivo stimola.' : ' In questo quadro non viene aggiunta stimolazione di supporto.';
  if (DEVICE.type === 'pm') return 'Pacemaker VVI: stimola il ventricolo e lascia indipendente l’attività atriale.' + support;
  if (DEVICE.type === 'icd') return 'ICD transvenoso: riconosce le tachiaritmie ventricolari e può stimolare come un VVI. Un BAV isolato non è un’indicazione all’ICD.' + support;
  return 'CRT-D: stimolazione biventricolare e funzione ICD. Esempio didattico di QRS stimolato; la scelta clinica richiede anche funzione ventricolare e quadro di scompenso.' + support;
}
function renderDeviceParams(sc, box) {
  const sec = document.createElement('div'); sec.className = 'sec device-params';
  sec.innerHTML = '<h3>Aggiungi dispositivo</h3><div class="device-options">' +
    Object.entries(DEVICE_NAMES).map(([id, name]) => '<button class="btn' + (DEVICE.type === id ? ' primary' : '') + '" data-device="' + id + '" aria-pressed="' + (DEVICE.type === id) + '">' + name + '</button>').join('') + '</div>' +
    '<p class="note">' + esc(deviceNote(sc)) + '</p>';
  sec.querySelectorAll('[data-device]').forEach(b => b.addEventListener('click', () => setDevice(b.dataset.device)));
  if (['pm', 'icd', 'crtd'].includes(DEVICE.type)) {
    const d = document.createElement('div'); d.className = 'ctrl';
    d.innerHTML = '<label class="lab" for="deviceRate">Frequenza minima di stimolazione <output>' + DEVICE.rate + ' /min</output></label><input id="deviceRate" type="range" min="40" max="100" step="5" value="' + DEVICE.rate + '">';
    const inp = d.querySelector('input');
    inp.addEventListener('input', () => { DEVICE.rate = +inp.value; d.querySelector('output').textContent = DEVICE.rate + ' /min'; buildStream(sc, paramsFor(sc), true); defUI(sc); });
    sec.appendChild(d);
  }
  if (!sc.defib && DEVICE.type === 'dae' && ['tvsp', 'tdp'].includes(deviceRhythm(sc))) {
    const d = document.createElement('div'); d.className = 'ctrl';
    d.innerHTML = '<label for="devicePulse">Contesto clinico simulato</label><select id="devicePulse"><option value="present">Polso presente</option><option value="absent">Polso assente · arresto cardiaco</option></select><p class="note">L’ECG da solo non determina la presenza del polso.</p>';
    d.querySelector('select').value = DEVICE.pulse;
    d.querySelector('select').addEventListener('change', e => { DEVICE.pulse = e.target.value; buildStream(sc, paramsFor(sc), true); defUI(sc); });
    sec.appendChild(d);
  }
  box.appendChild(sec);
}
function setDevice(type) {
  if (digCur || !Object.hasOwn(DEVICE_NAMES, type)) return;
  DEVICE.type = type;
  const sc = byId[S.sc];
  buildStream(sc, paramsFor(sc), true); defUI(sc); renderParams(sc); aggiornaEctUI();
  $('#measures').innerHTML = measure(stream, mon.t);
}
function defStato(testo, vivo) {
  const el = $('#defStato');
  el.hidden = !testo; el.textContent = testo || ''; el.classList.toggle('vivo', !!vivo);
}
function defUI(sc) {
  const active = !!sc && DEVICE.type !== 'none';
  $('#deviceBar').hidden = !active;
  DEF.sc = active ? sc : null; DEF.rhythm = null; DEF.coda = []; DEF.stage = 'idle'; DEF.t0 = mon.t;
  defStato('');
  if (!active) return;
  DEF.rhythm = deviceRhythm(sc);
  $('#deviceLab').textContent = DEVICE_NAMES[DEVICE.type] + (DEVICE.type === 'dae' ? ' collegato' : ' attivo');
  $('#deviceRemove').setAttribute('aria-label', 'Rimuovi ' + DEVICE_NAMES[DEVICE.type]);
  $('#defSeg').hidden = DEVICE.type !== 'dae';
  $('#defLab').textContent = (paramsFor(sc).j || 200) + ' J';
  const b = $('#defBtn'); b.disabled = false; b.textContent = 'Defibrilla';
  if (DEVICE.type === 'dae') defStato('Pronto per l’analisi del ritmo');
  else if (DEVICE.type === 'pm') defStato(curCfg.pacing ? 'VVI · ' + DEVICE.rate + '/min · spike sui battiti stimolati' : 'Dispositivo collegato · nessuna stimolazione aggiunta');
  else {
    defStato('Sorveglianza del ritmo · ' + (curCfg.pacing ? (DEVICE.type === 'crtd' ? 'pacing biventricolare' : 'supporto VVI') : 'analisi in corso'));
    defPrograma(sc, paramsFor(sc), deviceShockable());
  }
}
function defSchedule(dt, fn) { DEF.coda.push({ t: mon.t + dt, fn, fatta: false }); }
function defPrograma(sc, p, sh) {
  if (!sh) {
    defSchedule(2400, () => defStato('Ritmo non defibrillabile · nessuna scarica' + (curCfg.pacing ? ' · stimolazione a domanda attiva' : '')));
    return;
  }
  const monomorphic = DEF.rhythm === 'tvsp';
  const atp = monomorphic && p.terapia !== 'shock';
  defSchedule(2400, () => defStato('Aritmia ventricolare rilevata · conferma in corso…'));
  if (atp) {
    defSchedule(5200, () => {
      defStato('Stimolazione antitachicardica in corso', true);
      defCambia({ mode: 'vt', vRate: 250, aRate: 0.5, vtQrs: ECG.M.qrsPaced(), vtT: { a: 150, g: 30, amp: 0.3 }, qtc: 330 }, 250);
    });
    defSchedule(7900, () => { DEF.rhythm = 'sinusale'; defCambia(defAfter('sinusale'), 250); defStato('Esito simulato: aritmia interrotta · sorveglianza attiva', true); });
  } else if (p.terapia === 'atp') {
    defSchedule(4600, () => defStato('ATP non adatta a questo ritmo · shock disabilitato dalla modalità scelta'));
  } else {
    defSchedule(4600, () => defStato('Ritmo defibrillabile · carica in corso…', true));
    defSchedule(10400, () => { defColpo(defAfter('sinusale'), 1400); DEF.rhythm = 'sinusale'; defStato('Scarica simulata erogata', true); });
    defSchedule(12600, () => defStato('Esito simulato: ritmo organizzato · sorveglianza attiva'));
  }
}
function defAfter(esito) {
  const cfg = DEF_DOPO[esito](); cfg.noise = S.noise;
  // Dopo la terapia, la stimolazione dipende dal ritmo risultante, non dal caso iniziale.
  if (esito !== 'asistolia' && ['icd', 'crtd'].includes(DEVICE.type))
    cfg.pacing = { type: DEVICE.type === 'crtd' ? 'crt' : 'vvi', rate: DEVICE.rate, device: DEVICE.type };
  return cfg;
}
function defCambia(cfg, ritardo) {
  if (!stream || typeof stream.cambiaRitmo !== 'function') return;
  cfg.noise = S.noise; stream.cambiaRitmo(cfg, mon.t + (ritardo || 250));
  curCfg = cfg; scene.setScenario(cfg); aggiornaEctUI();
}
function defColpo(dopo, attesa) {
  if (!stream || typeof stream.scarica !== 'function') return;
  stream.scarica(mon.t + 220, dopo, attesa);
  if (dopo) { curCfg = dopo; scene.setScenario(dopo); aggiornaEctUI(); }
}
function defTick() {
  if (!DEF.sc) return;
  // Una nuova coda aggiunta da un callback viene esaminata dal frame successivo.
  for (const a of [...DEF.coda]) if (!a.fatta && mon.t >= a.t) { a.fatta = true; a.fn(); }
  DEF.coda = DEF.coda.filter(a => !a.fatta);
}
$('#deviceRemove').addEventListener('click', () => setDevice('none'));
$('#defBtn').addEventListener('click', () => {
  if (!DEF.sc || DEVICE.type !== 'dae' || !stream) return;
  if (!S.playing) setPlaying(true);
  const b = $('#defBtn'); b.disabled = true;
  if (DEF.stage === 'ready') {
    if (!deviceShockable()) return;
    DEF.stage = 'charging'; b.textContent = 'Carica…'; defStato('Carica in corso…');
    defSchedule(1600, () => {
      const p = paramsFor(DEF.sc), esito = p.esito || 'sinusale';
      defColpo(esito === 'nulla' ? null : defAfter(esito), 1400);
      if (esito !== 'nulla') DEF.rhythm = esito;
      defStato('Scarica simulata erogata · osserva il tracciato', true);
      defSchedule(1800, () => { DEF.stage = 'idle'; b.disabled = false; b.textContent = 'Analizza di nuovo'; defStato('Esito simulato · puoi ripetere l’analisi'); });
    });
  } else {
    DEF.stage = 'analysing'; b.textContent = 'Analisi…'; defStato('Analisi del ritmo in corso…');
    defSchedule(2600, () => {
      const sh = deviceShockable(); DEF.stage = sh ? 'ready' : 'idle';
      b.disabled = false; b.textContent = sh ? 'Eroga scarica' : 'Analizza di nuovo';
      defStato(sh ? 'Ritmo defibrillabile · scarica pronta' :
        (['tvsp', 'tdp'].includes(DEF.rhythm) && DEVICE.pulse === 'present' && !DEF.sc.defib
          ? 'Polso presente · defibrillazione DAE non indicata in questo contesto'
          : 'Ritmo non defibrillabile · scarica non consigliata'), sh);
    });
  }
});

function loadScenario(id, keepTime, snapshot) {
  const sc = byId[id]; if (!sc) return;
  if (id !== S.sc || !keepTime || snapshot || digCur) { DEVICE.type = snapshot ? 'none' : sc.defib ? (sc.defib.tipo === 'manuale' ? 'dae' : 'icd') : 'none'; DEVICE.rate = 70; DEVICE.pulse = 'present'; }
  digCur = null;
  S.sc = id; store.sc = id; save();
  $('#scTitle').textContent = sc.name; $('#scCat').textContent = sc.cat;
  $$('#libList .item').forEach(b => { const selected = b.dataset.id === id; b.classList.toggle('on', selected); if (selected && b.closest('details')) b.closest('details').open = true; });
  if (snapshot) {
    cancelCaseActions(); curCfg = cloneCase(snapshot.cfg);
    S.noise = curCfg.noise;
    S.ectPat = curCfg.ectopy && curCfg.ectopy.pattern || 'off';
    if (curCfg.ectopy) S.ectTipo = curCfg.ectopy.type;
    stream = new Stream(curCfg, snapshot.seed); mon.setStream(stream, false); scene.setScenario(curCfg);
    mon.t = snapshot.t; mon.draw();
  } else buildStream(sc, paramsFor(sc), keepTime);
  aggiornaEctUI();
  defUI(sc);
  mon.setHighlight(sc.look || []);
  renderCard(sc); renderParams(sc); renderVolt();
  closeLib();
}
const LIBIDX = SCENARIOS.map(s => {
  const c = s.card || {};
  const righe = [].concat(c.criteri || [], c.corso || [], c.dd || [], c.def ? [c.def] : [], c.trappole ? [c.trappole] : []);
  return { id: s.id, righe, hay: (s.name + ' ' + s.cat + ' ' + righe.join(' ')).toLowerCase() };
});
function libHit(id, f) {
  const e = LIBIDX.find(x => x.id === id); if (!e) return null;
  const r = e.righe.find(x => x.toLowerCase().includes(f));
  if (!r) return null;
  const i = r.toLowerCase().indexOf(f);
  const t = r.length > 120 ? (i > 50 ? '…' + r.slice(i - 40) : r).slice(0, 120) + '…' : r;
  const j = t.toLowerCase().indexOf(f);
  return j < 0 ? esc(t) : esc(t.slice(0, j)) + '<mark>' + esc(t.slice(j, j + f.length)) + '</mark>' + esc(t.slice(j + f.length));
}
function scenariosByCategory(cat) {
  const order = LIB_ORDER[cat] || [];
  const rank = id => { const i = order.indexOf(id); return i < 0 ? order.length : i; };
  return SCENARIOS.filter(s => s.cat === cat).sort((a, b) => rank(a.id) - rank(b.id));
}
function renderLib(filter) {
  const f = (filter || '').trim().toLowerCase(); const box = $('#libList'); box.innerHTML = '';
  const selectedSection = $('#libSection').value;
  LIB_SECTIONS.filter(section => !selectedSection || section.id === selectedSection).forEach(section => {
    const group = document.createElement('details'); group.className = 'lib-section';
    group.open = !!f || !!selectedSection || section.cats.includes((byId[S.sc] || {}).cat);
    const heading = document.createElement('summary'); group.appendChild(heading);
    let count = 0;
    section.cats.forEach(cat => {
    const items = scenariosByCategory(cat).filter(s => !f || (LIBIDX.find(x => x.id === s.id) || { hay: '' }).hay.includes(f));
    if (!items.length) return;
    count += items.length;
    const h = document.createElement('h4'); h.textContent = cat; group.appendChild(h);
    items.forEach(s => { const b = document.createElement('button'); b.className = 'item' + (s.id === S.sc ? ' on' : ''); b.dataset.id = s.id; b.innerHTML = esc(s.name) + (f && !s.name.toLowerCase().includes(f) && libHit(s.id, f) ? '<span class="hit">' + libHit(s.id, f) + '</span>' : ''); b.addEventListener('click', () => loadScenario(s.id, true)); group.appendChild(b); });
    });
    if (count) { heading.innerHTML = esc(section.name) + '<span>' + count + '</span>'; box.appendChild(group); }
  });
  if (f) { const n = $$('#libList .item').length; const t = document.createElement('p'); t.className = 'note'; t.style.padding = '8px 14px 0'; t.textContent = n + (n === 1 ? ' quadro trovato' : ' quadri trovati') + ' per "' + filter.trim() + '"'; box.insertBefore(t, box.firstChild); }
  if (!box.children.length) box.innerHTML = '<p class="note" style="padding:10px 14px">Nessun quadro corrisponde alla ricerca.</p>';
}
function renderCard(sc) {
  const c = sc.card;
  const chips = (sc.look || []).map(l => '<button class="chip' + (S.sel === l ? ' on' : '') + '" data-l="' + l + '">' + l + '</button>').join('');
  $('#p-card').innerHTML =
    '<div class="sec"><p class="lead">' + esc(c.def) + '</p></div>' +
    '<div class="sec"><h3>Criteri</h3><ul class="crit">' + c.criteri.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
    '<div class="sec"><h3>Dove guardare</h3><p>' + esc(c.guarda) + '</p><div class="chips">' + chips + '</div></div>' +
    (c.soffio ? '<div class="sec"><h3>All\u2019auscultazione</h3><p>' + esc(c.soffio) + '</p></div>' : '') +
    '<div class="sec"><h3>Meccanismo</h3><p>' + esc(c.meccanismo) + '</p></div>' +
    (c.terapia ? '<div class="sec"><h3>Gravit\u00e0 e trattamento</h3><p>' + esc(c.terapia) + '</p></div>' : '') +
    '<div class="sec"><h3>Nella vista 3D</h3><p>' + esc(c.vettori) + '</p></div>' +
    '<div class="sec"><h3>Diagnosi differenziale</h3><ul class="dd">' + c.dd.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' +
    '<div class="sec"><h3>Trappole</h3><p>' + esc(c.trappole) + '</p></div>' +
    (c.corso ? '<div class="sec corso"><h3>Criteri del corso</h3><ul class="crit">' + c.corso.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul></div>' : '') +
    (c.diff ? '<div class="sec"><h3>Rispetto al manuale</h3><p>' + esc(c.diff) + '</p></div>' : '') +
    '<div class="sec"><p class="src"><b>Criteri:</b> ' + esc(c.fonte) + '</p>' + (c.manuale ? '<p class="src"><b>Sul manuale:</b> ' + esc(c.libro || '') + ' — ' + esc(c.manuale) + '</p>' : '') + (c.slide ? '<p class="src"><b>A lezione:</b> ' + esc(c.corsoFonte || '') + ' — ' + esc(c.slide) + '</p>' : '') + '</div>' + FIRMA;
  $$('#p-card .chip').forEach(b => b.addEventListener('click', () => mon.opts.onSelect(b.dataset.l)));
}
/* ---------- tracciati reali digitalizzati dall'atlante ---------- */
let digCur = null;
function apriDigitalizzato(id, recDato) {
  const rec = recDato || DIG[id]; if (!rec) return;
  cancelCaseActions(); DEVICE.type = 'none';
  digCur = id;
  const reale = !!rec.reale;
  stream = new Sampled(rec, 1);
  curCfg = stream.cfg;
  mon.setStream(stream, false);
  mon.setHighlight([]);
  mon.cal = []; mon.drawOverlay();
  scene.setScenario({});
  $('#scTitle').textContent = rec.t;
  $('#scCat').textContent = 'Tracciato reale — ' + rec.f;
  $$('#libList .item').forEach(b => b.classList.remove('on'));
  const q = rec.q && byId[rec.q] ? byId[rec.q] : null;
  const der = Object.keys(rec.d).length;
  $('#p-card').innerHTML =
    '<div class="sec"><p class="lead">' + esc(rec.t) + '</p>' +
    '<p class="note">' + (reale
      ? 'Registrazione reale a 12 derivazioni su paziente: '
      : 'Segnale estratto dalla scansione della slide: ' + der + ' derivazioni, ') +
    fmt(rec.fs) + ' campioni al secondo, ' + fmt(rec.n / rec.fs, 1) + ' secondi che si ripetono in ciclo.</p>' +
    '<p class="note">Derivazioni disponibili: ' + stream.availableLeads.join(', ') + '. ' +
    (stream.availableLeads.length < 12 ? 'Le altre derivazioni non sono disponibili e non vengono interpretate come linee piatte.' : '') + '</p></div>' +
    (reale
      ? '<div class="sec"><h3>Come leggerlo</h3><p>È un elettrocardiogramma registrato su un paziente. ' +
        'I campioni conservano la scala del segnale originale. Intervalli e voltaggi richiedono una misura sul tracciato e una verifica della qualità. ' +
        'Il rumore, la deriva della linea di base e gli artefatti fanno parte del tracciato: è questa la differenza con il simulatore.</p>' +
        (rec.scp && rec.scp.length ? '<p class="note">Codici del referto: ' + esc(rec.scp.join(', ')) + '</p>' : '') + '</div>'
      : '') +
    (reale ? '' : '<div class="sec"><h3>Come leggerlo</h3><p>I millivolt sono ricostruiti dalla geometria della carta: ' +
    'la larghezza di ogni pannello vale 2,5 secondi a 25 mm/s. Sono attendibili per la morfologia e per gli intervalli, ' +
    'meno per i voltaggi assoluti. Per i criteri di ipertrofia continua a fidarti del tracciato simulato.</p></div>') +
    (q ? '<div class="sec"><h3>Quadro didattico correlato</h3><p>' + esc(q.name) + '</p>' +
         '<ul class="crit">' + q.card.criteri.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
         '<button class="btn" id="digQuadro">Apri il quadro simulato</button></div>' : '') +
    (rec.ptb ? ptbRecordDetails(rec) : '<div class="sec"><p class="src"><b>Origine:</b> ' + esc(rec.f) + '</p></div>') + FIRMA;
  const bq = $('#digQuadro');
  if (bq) bq.addEventListener('click', () => loadScenario(rec.q, false));
  $('#p-params').innerHTML = '<div class="sec"><h3>Parametri</h3><p class="note">Questo è un tracciato registrato su un paziente vero: non ha parametri da muovere. Scegli un quadro nella libreria per tornare al simulatore.</p></div>';
  renderVolt();
  aggiornaEctUI();
  closeLib();
  $('#recordBar').hidden = !rec.ptb;
  $('#recordOffline').textContent = rec.ptb ? (rec.offline ? 'Segnale salvato sul dispositivo' : 'Segnale disponibile online; salvataggio sul dispositivo non riuscito') : '';
  $('#measures').innerHTML = measure(stream, 0);
  recordTime();
  setPlaying(true);
}

function ptbRecordDetails(rec) {
  const p = rec.ptb, names = REALE && REALE.codes || {};
  const quality = { baseline_drift:'Oscillazione della linea di base', static_noise:'Rumore', burst_noise:'Disturbi transitori', electrodes_problems:'Problemi agli elettrodi' };
  return '<div class="sec"><h3>Referto originale PTB-XL #' + p.id + '</h3><p>' +
    (p.validated ? 'Validazione umana indicata nel dataset.' : 'Validazione umana non indicata nel dataset.') +
    (p.second ? ' È indicata anche una seconda lettura.' : '') + '</p>' +
    '<ul class="crit">' + Object.keys(p.codes).map(c => '<li>' + esc(names[c] ? names[c].name : c) + ' <span class="note">(' + esc(c) + ')</span></li>').join('') + '</ul>' +
    '<p class="note">Le etichette descrivono il referto del dataset e possono coesistere. L’etichetta «infarto» non specifica da sola un infarto acuto.</p>' +
    '<details><summary>Testo del referto nella lingua originale</summary><p>' + esc(p.report || 'Non disponibile') + '</p></details>' +
    (Object.keys(p.quality).length ? '<h3>Qualità del segnale</h3><ul>' + Object.keys(p.quality).map(k => '<li>' + esc(quality[k] || k) + ': ' + esc(p.quality[k]) + '</li>').join('') + '</ul>' : '') +
    '</div><div class="sec"><h3>Fonte e licenza</h3>' + ptbCredits() +
    '<p class="note">Segnale originale a 500 Hz, in millivolt, riprodotto senza filtri o normalizzazione. Le traduzioni e la presentazione sono di Isoelettrica. La ripetizione dei 10 secondi non rappresenta una registrazione più lunga.</p>' +
    '<p><a href="https://physionet.org/content/ptb-xl/1.0.3/' + esc(p.path) + '.hea" target="_blank" rel="noopener">Scheda del file originale</a></p></div>';
}
function ptbCredits() {
  return '<p class="src">Wagner P, Strodthoff N, Bousseljot R-D, Samek W, Schaeffter T. ' +
    '<a href="https://doi.org/10.13026/kfzx-aw45" target="_blank" rel="noopener">PTB-XL 1.0.3 · PhysioNet</a>. ' +
    '<a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · ' +
    '<a href="atlante-reale/fonti.html" target="_blank" rel="noopener">Attribuzioni e licenza completa</a>.</p>';
}
function recordTime() {
  if ($('#recordBar').hidden || !stream || !stream.dur) return;
  $('#recordTime').textContent = fmt((mon.t % stream.dur) / 1000, 1) + ' / ' + fmt(stream.dur / 1000) + ' s · riproduzione in ciclo';
}
$('#recordRestart').addEventListener('click', () => {
  if (!stream || stream.cfg.mode !== 'sampled') return;
  mon.t = mon.pageStart = mon.drawn = 0; mon.cal = []; mon.redrawAll(); mon.drawOverlay(); recordTime(); setPlaying(true);
});
$('#recordBack').addEventListener('click', () => { atlasFonte = 'reale'; showView('atlas'); });

const notePar = {};
function renderParams(sc) {
  notePar[sc.id] = [];
  const p = paramsFor(sc); const box = $('#p-params'); box.innerHTML = '';
  renderDeviceParams(sc, box);
  if(window.IsoConduction&&['wpw','avrt','avrtanti','fapreeccitata','avnrt','lgl'].includes(sc.id)){
    const panel=document.createElement('div');panel.className='sec';panel.innerHTML='<h3>Vie e circuiti elettrici</h3>';
    if(['wpw','avrt','avrtanti','fapreeccitata'].includes(sc.id)){
      const label=document.createElement('label');label.textContent='Sede della via di Kent';const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);
      IsoConduction.sites.forEach(site=>{const o=document.createElement('option');o.value=site.id;o.textContent=site.label;select.append(o);});select.value=p.kentSite||'left-lateral';select.onchange=()=>setParam(sc,'kentSite',select.value);label.append(select);panel.append(label);
    }
    if(sc.id==='lgl'){const label=document.createElement('label');label.textContent='Meccanismo illustrativo del PR corto';const select=document.createElement('select');select.setAttribute('aria-label',label.textContent);select.innerHTML='<option value="nodal">Conduzione nodale accelerata</option><option value="james">Fibre di James · ipotesi atrionodale</option>';select.value=p.jamesModel||'nodal';select.onchange=()=>setParam(sc,'jamesModel',select.value);label.append(select);panel.append(label);}
    const note=document.createElement('p');note.className='conduction-note';note.textContent=sc.id==='lgl'?'James è uno schema opzionale: un PR corto non dimostra una via accessoria. L’ECG resta stretto e senza delta.':'Rapida in azzurro, lenta in arancio, Kent in viola. I transiti seguono gli eventi ECG. Le varianti di sede illustrano la direzione della preeccitazione: non sono un algoritmo clinico di localizzazione.';panel.append(note);box.append(panel);
  }
  const sec = document.createElement('div'); sec.className = 'sec'; sec.innerHTML = '<h3>' + esc(sc.name) + '</h3>';
  sc.params.forEach(q => {
    const d = document.createElement('div'); d.className = 'ctrl';
    if (q.type === 'select') {
      d.innerHTML = '<div class="lab"><span>' + esc(q.label) + '</span></div><select>' + q.opts.map(o => '<option value="' + o[0] + '"' + (String(p[q.k]) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      d.querySelector('select').addEventListener('change', e => setParam(sc, q.k, e.target.value));
    } else {
      d.innerHTML = '<div class="lab"><span>' + esc(q.label) + '</span><output class="num">' + fmt(+p[q.k], q.step < 1 ? 1 : 0) + ' ' + (q.unit || '') + '</output></div><input type="range" min="' + q.min + '" max="' + q.max + '" step="' + q.step + '" value="' + p[q.k] + '">';
      const inp = d.querySelector('input'), out = d.querySelector('output');
      inp.addEventListener('input', () => { out.textContent = fmt(+inp.value, q.step < 1 ? 1 : 0) + ' ' + (q.unit || ''); setParam(sc, q.k, +inp.value); });
    }
    /* Alcuni cursori hanno un margine fisiologico: la nota si riscrive a ogni
       spostamento e dice se si è ancora dentro o già fuori. Il cursore non si
       blocca mai: si può uscire apposta, per vedere che aspetto ha il quadro
       patologico. */
    if (q.nota) {
      const n = document.createElement('p'); n.className = 'note pnota';
      const agg = () => { const r = q.nota(paramsFor(sc)); n.innerHTML = r.testo; n.classList.toggle('fuori', !!r.fuori); };
      agg(); d.appendChild(n); (notePar[sc.id] = notePar[sc.id] || []).push(agg);
    }
    const control = d.querySelector('input, select'); if (control) control.setAttribute('aria-label', q.label + (q.unit ? ' (' + q.unit + ')' : ''));
    sec.appendChild(d);
  });
  const reset = document.createElement('button'); reset.className = 'btn'; reset.textContent = 'Ripristina i valori tipici';
  reset.addEventListener('click', () => { delete store.params[sc.id]; save(); buildStream(sc, paramsFor(sc), true); defUI(sc); renderParams(sc); aggiornaEctUI(); });
  sec.appendChild(reset); box.appendChild(sec);
  const g = document.createElement('div'); g.className = 'sec';
  g.innerHTML = '<h3>Registrazione</h3><div class="ctrl"><div class="lab"><span>Rumore e deriva della linea di base</span><output class="num">' + Math.round(S.noise * 100) + '%</output></div><input type="range" min="0" max="1" step="0.05" value="' + S.noise + '"></div><p class="note">A 0% il tracciato è pulito. Aumenta il rumore per simulare disturbi e oscillazioni della linea di base.</p>';
  const ni = g.querySelector('input'), no = g.querySelector('output');
  ni.addEventListener('input', () => { S.noise = +ni.value; store.noise = S.noise; no.textContent = Math.round(S.noise * 100) + '%'; save(); if (stream) stream.noise = S.noise; });
  box.appendChild(g);
}
/* ---------- Voltaggi e indici di ipertrofia ----------
   Le ampiezze vengono misurate sul battito davvero generato, derivazione per
   derivazione. Le soglie sono in mV: valgono a qualunque guadagno, anche a 5 o
   20 mm/mV, perché in millimetri cambierebbero. */
const ORD_LEADS = ['I', 'II', 'III', 'aVR', 'aVL', 'aVF', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6'];
/* I voltaggi si riaggiornano due volte al secondo mentre il tracciato scorre.
   Se a ogni giro si riscrive tutto il pannello, il menù del sesso viene
   distrutto e ricreato mentre è aperto, e su iPad si richiude da solo appena lo
   tocchi. Perciò l'impalcatura e il menù si costruiscono una volta sola e a
   ogni aggiornamento si riscrivono soltanto i numeri. */
function voltShell(box) {
  if (box.dataset.shell === '1') return;
  box.innerHTML =
    '<div id="voltTop"></div>' +
    '<div class="sec"><div class="lab" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>Sesso del paziente <span class="note">(cambia le soglie di Cornell e Peguero)</span></span>' +
    '<select id="voltSex" style="width:auto;border:1px solid var(--line);background:var(--bg);border-radius:8px;padding:5px 8px"><option value="M">Uomo</option><option value="F">Donna</option></select></div></div>' +
    '<div id="voltList"></div>' +
    '<div class="sec"><p class="src"><b>Criteri:</b> Sokolow-Lyon 1949; Casale 1987 (Cornell); Molloy 1992 (Cornell product); Peguero 2017; Romhilt-Estes 1968; AHA/ACCF/HRS 2009 parte V.</p></div>' + FIRMA;
  box.dataset.shell = '1';
  const sx = $('#voltSex');
  sx.value = S.sesso;
  sx.addEventListener('change', e => { S.sesso = e.target.value; store.sesso = S.sesso; save(); renderVolt(); });
}
function renderVolt() {
  const box = $('#p-volt'); if (!box) return;
  const IP = window.ISO_IPERTROFIE;
  const amp = stream && stream.qrsAmplitudes ? stream.qrsAmplitudes(mon.t) : null;
  if (stream && stream.cfg.pacing) {
    box.dataset.shell = ''; box.innerHTML = '<div class="sec"><h3>Tracciato stimolato</h3><p>Gli indici di ipertrofia non sono applicabili al QRS stimolato. Usa il compasso per osservare spike e morfologia, oppure rimuovi il dispositivo per studiare il quadro originale.</p></div>'; return;
  }
  if (stream && stream.cfg.mode === 'sampled') {
    box.dataset.shell = ''; box.innerHTML = '<div class="sec"><h3>Misure sul tracciato registrato</h3><p>Voltaggi R/S, durata QRS e indici automatici: <b>non disponibili</b>. Il segnale non ha una delimitazione del QRS validata. Usa il compasso sul tracciato originale; i canali mancanti non valgono zero.</p></div>' + FIRMA; return;
  }
  if (!IP || !amp) {
    const attesa = mon.t < 2500 && stream && stream.cfg.mode !== 'continuous';
    box.dataset.shell = '';
    box.innerHTML = '<div class="sec"><h3>Voltaggi</h3><p class="note">' +
      (attesa ? 'Le ampiezze compaiono dopo i primi battiti: lascia scorrere il tracciato.'
              : 'Su questo quadro non c\u2019è un QRS di base misurabile: i voltaggi si calcolano sui battiti condotti o di scappamento.') +
      '</p></div>' + FIRMA;
    return;
  }
  voltShell(box);
  const sx = $('#voltSex');
  if (sx && sx.value !== S.sesso && document.activeElement !== sx) sx.value = S.sesso;
  const r = IP.calcola(amp, { sesso: S.sesso });
  if (!r) { box.dataset.shell = ''; box.innerHTML = '<div class="sec"><p>Indici non disponibili: servono tutte le derivazioni e una durata QRS valida.</p></div>'; return; }
  const sc = byId[S.sc] || {};
  const riga = i => '<li style="display:flex;gap:8px;justify-content:space-between;align-items:baseline;padding:5px 0;border-bottom:1px solid var(--line)">' +
    '<span><b>' + esc(i.nome) + '</b><br><span class="note">' + esc(i.formula) + (i.nota ? ' — ' + esc(i.nota) : '') + '</span></span>' +
    '<span class="num" style="white-space:nowrap;text-align:right;color:' + (i.positivo ? 'var(--bad)' : 'var(--muted)') + ';font-weight:600">' +
    esc(IP.testo(i)) + '<br>' + (i.positivo ? 'positivo' : 'negativo') + '</span></li>';
  const lista = a => '<ul style="list-style:none;margin:4px 0;padding:0">' + a.map(riga).join('') + '</ul>';
  const tab = '<table class="ttab num"><tr><th>Derivazione</th>' + ORD_LEADS.map(l => '<th>' + l + '</th>').join('') + '</tr>' +
    '<tr><td>R (mm)</td>' + ORD_LEADS.map(l => '<td>' + fmt(IP.mvToMm(amp.R[l]), 1) + '</td>').join('') + '</tr>' +
    '<tr><td>S (mm)</td>' + ORD_LEADS.map(l => '<td>' + fmt(IP.mvToMm(amp.S[l]), 1) + '</td>').join('') + '</tr></table>';
  const avviso = S.gain !== 10
    ? '<p class="note" style="color:var(--warn)">Il tracciato è visualizzato a ' + S.gain + ' mm/mV: i millimetri qui sotto sono sempre riferiti allo standard di 10 mm/mV, perché le soglie classiche valgono solo a quel guadagno.</p>'
    : '<p class="note">Valori a 10 mm/mV, il guadagno standard a cui sono definite tutte le soglie.</p>';
  const ord = sc.indici === 'destra' ? [['Ventricolo destro', r.destra], ['Ventricolo sinistro', r.sinistra]]
                                     : [['Ventricolo sinistro', r.sinistra], ['Ventricolo destro', r.destra]];
  $('#voltTop').innerHTML =
    '<div class="sec"><h3>Ampiezze misurate sul tracciato</h3>' + avviso +
    '<div style="overflow-x:auto">' + tab + '</div>' +
    '<p class="note">QRS ' + fmt(amp.qrsMs) + ' ms. Le ampiezze sono lette sul battito di base, dalla linea isoelettrica al picco.</p></div>';
  $('#voltList').innerHTML = ord.map(x => '<div class="sec"><h3>' + x[0] + '</h3>' + lista(x[1]) + '</div>').join('');
}

function setParam(sc, k, v) {
  setTimeout(() => (notePar[sc.id] || []).forEach(f => f()), 0);
  store.params[sc.id] = Object.assign({}, store.params[sc.id] || {}, { [k]: v }); save();
  const version = caseVersion;
  clearTimeout(rebuildT); rebuildT = setTimeout(() => {
    if (version !== caseVersion || S.sc !== sc.id || digCur) return;
    buildStream(sc, paramsFor(sc), true); defUI(sc); aggiornaEctUI();
  }, 90);
}
function openLib() { $('#lib').classList.add('open'); $('#scrim').classList.add('open'); }
function closeLib() { $('#lib').classList.remove('open'); $('#scrim').classList.remove('open'); }
$('#libBtn').addEventListener('click', openLib); $('#scrim').addEventListener('click', closeLib);
$('#q').addEventListener('input', e => renderLib(e.target.value));
LIB_SECTIONS.forEach(section => { const option = document.createElement('option'); option.value = section.id; option.textContent = section.name; $('#libSection').appendChild(option); });
$('#libSection').addEventListener('change', () => renderLib($('#q').value));

const ICON_PLAY = '<svg viewBox="0 0 14 14"><path d="M3 1.5v11l9.5-5.5z"/></svg>', ICON_PAUSE = '<svg viewBox="0 0 14 14"><rect x="2.5" y="1.5" width="3.2" height="11" rx="1"/><rect x="8.3" y="1.5" width="3.2" height="11" rx="1"/></svg>';
function setPlaying(p) {
  S.playing = p;
  $('#playBtn').innerHTML = p ? ICON_PAUSE : ICON_PLAY;
  $('#playBtn').setAttribute('aria-label', p ? 'Pausa' : 'Avvia');
  // stesso stato anche nel laboratorio a schermo intero, dove la barra degli
  // strumenti non c'è: lì il tracciato si ferma da qui o con la barra spaziatrice
  const z = $('#zenPlay');
  if (z) { z.textContent = p ? 'Pausa' : 'Riprendi'; z.classList.toggle('on', !p); }
  const sp = $('#stPlay');
  if (sp) { sp.textContent = p ? 'Pausa' : 'Riprendi'; sp.classList.toggle('on', !p); }
  const cp = $('#cmpPlay'); if (cp) cp.textContent = p ? 'Pausa confronto' : 'Riprendi confronto';
}
$('#playBtn').addEventListener('click', () => setPlaying(!S.playing));
$('#zenPlay').addEventListener('click', () => setPlaying(!S.playing));
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat) return;
  const t = e.target, tag = t && t.tagName;
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || tag === 'BUTTON' || (t && t.isContentEditable)) return;
  const vista = $('#v-trace');
  if (!(vista && vista.classList.contains('on')) && !zenOn && !ST.on) return;
  e.preventDefault(); setPlaying(!S.playing);
});
function segInit(sel, attr, cur, fn) { $$(sel + ' button').forEach(b => { b.classList.toggle('on', String(b.dataset[attr]) === String(cur)); b.addEventListener('click', () => { $$(sel + ' button').forEach(x => x.classList.toggle('on', x === b)); fn(b.dataset[attr]); }); }); }
segInit('#modeSeg', 'm', S.mode, v => { S.mode = mon.mode = v; store.mode = v; save(); mon.cal = []; mon.pageStart = Math.floor(mon.t / mon.pageMs()) * mon.pageMs(); mon.layout(); });
segInit('#speedSeg', 's', S.speed, v => { S.speed = mon.speed = +v; store.speed = +v; save(); mon.cal = []; mon.pageStart = Math.floor(mon.t / mon.pageMs()) * mon.pageMs(); mon.layout(); });
segInit('#gainSeg', 'g', S.gain, v => { S.gain = mon.gain = +v; store.gain = +v; save(); mon.cal = []; mon.layout(); });
segInit('#slowSeg', 't', 1, v => { S.slow = +v; });
$('#calBtn').addEventListener('click', () => { mon.calOn = !mon.calOn; mon.cal = []; $('#calBtn').classList.toggle('on', mon.calOn); $('#calBtn').setAttribute('aria-pressed', mon.calOn); if (mon.calOn) setPlaying(false); mon.drawOverlay(); });
$$('#cardTabs button[data-p]').forEach(b => b.addEventListener('click', () => {
  $$('#cardTabs button[data-p]').forEach(x => x.classList.toggle('on', x === b));
  $$('.card .pane').forEach(p => p.classList.toggle('on', p.id === 'p-' + b.dataset.p));
  if (b.dataset.p === 'volt') renderVolt();
}));

/* ---------- scheda a schermo intero ----------
   La stessa scheda, con una colonna di lettura larga e il testo grande: è la
   teoria del quadro che stai guardando, senza uscire dal tracciato. */
function zenCard(on) {
  document.body.classList.toggle('zen-card', on);
  const b = $('#cardFull');
  b.textContent = on ? '⤡' : '⤢';
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.title = on ? 'Torna alla vista affiancata' : 'Leggi a schermo intero';
  if (!on) requestAnimationFrame(() => { mon.layout(); scene.resize(); });
}
$('#cardFull').addEventListener('click', () => zenCard(!document.body.classList.contains('zen-card')));

/* ---------- laboratorio vettoriale a schermo intero ----------
   Sposta davvero la scena 3D e il tracciato dentro il contenitore a tutto
   schermo, così restano un unico oggetto sincronizzato, e affianca i numeri:
   vettore istantaneo, assi, proiezione su ognuna delle dodici derivazioni. */

/* ==================== STRISCIA LUNGA ====================
   Una derivazione sola, a schermo intero, su più righe che si leggono come una
   pagina di carta continua: in fondo alla riga si va a capo. Serve per i ritmi,
   dove dieci secondi non bastano. Sopra c'è il righello dei sei secondi, quello
   che si usa al letto del paziente: conti i QRS dentro la finestra e moltiplichi
   per dieci. Il conteggio lo fa anche l'app, così verifichi se l'hai preso bene. */
const ST = { on: false, lead: 'II', sei: true, cv: null, ctx: null, dpr: 1, pxmm: 0, righe: [], secRiga: 10, t0: 0 };
function stLayout() {
  const box = $('#strip').querySelector('.stbody');
  const W = box.clientWidth; if (!W) return;
  const d = Math.min(window.devicePixelRatio || 1, 2);
  const mL = 10;                                   // margine a sinistra in mm
  ST.pxmm = W / (mL + ST.secRiga * mon.speed);     // la riga contiene secRiga secondi
  const H = box.clientHeight || 600;
  const rowMm = 26;
  ST.nRighe = Math.max(3, Math.floor((H / ST.pxmm - 4) / rowMm));
  ST.mL = mL; ST.rowMm = rowMm; ST.dpr = d;
  const hTot = Math.round(ST.pxmm * (2 + ST.nRighe * rowMm));
  ST.cv.width = Math.round(W * d); ST.cv.height = Math.round(hTot * d);
  ST.cv.style.height = hTot + 'px';
  ST.W = W; ST.H = hTot;
}
function stDraw() {
  if (!ST.on || !stream || !ST.cv || !ST.pxmm) return;
  const c = ST.ctx, d = ST.dpr, mm = ST.pxmm * d, g = mon.gain;
  const durata = ST.secRiga * 1000, tot = ST.nRighe * durata;
  const fine = mon.t, inizio = Math.max(0, fine - tot);
  stream.ensure(fine);
  c.fillStyle = css.paper; c.fillRect(0, 0, ST.cv.width, ST.cv.height);
  // griglia
  c.lineWidth = Math.max(1, d * 0.5);
  const x0 = ST.mL * mm;
  for (let i = 0; x0 + i * mm <= ST.cv.width; i++) {
    const x = Math.round(x0 + i * mm) + 0.5, major = i % 5 === 0;
    if (!major && mm < 2.6) continue;
    c.strokeStyle = major ? css.grid2 : css.grid; c.beginPath(); c.moveTo(x, 0); c.lineTo(x, ST.cv.height); c.stroke();
  }
  for (let j = 0; j * mm <= ST.cv.height; j++) {
    const y = Math.round(j * mm) + 0.5, major = j % 5 === 0;
    if (!major && mm < 2.6) continue;
    c.strokeStyle = major ? css.grid2 : css.grid; c.beginPath(); c.moveTo(0, y); c.lineTo(ST.cv.width, y); c.stroke();
  }
  const li = LIDX[ST.lead], v = [0, 0, 0], lv = new Array(12);
  const font = Math.max(10, Math.round(3.4 * ST.pxmm)) * d;
  for (let r = 0; r < ST.nRighe; r++) {
    const base = gridBaseline(mm, (1 + r * ST.rowMm + ST.rowMm * 0.5) * mm);
    const tA = inizio + r * durata, tB = tA + durata;
    // secondi: tacca a ogni secondo sul bordo inferiore della riga
    c.strokeStyle = css.grid2; c.lineWidth = 1.2 * d;
    for (let sIdx = 0; sIdx <= ST.secRiga; sIdx++) {
      const x = x0 + sIdx * mon.speed * mm;
      const y1 = (1 + r * ST.rowMm + ST.rowMm - 2) * mm;
      c.beginPath(); c.moveTo(x, y1); c.lineTo(x, y1 + 2.4 * mm); c.stroke();
    }
    // righello dei sei secondi sulla prima riga
    if (ST.sei && r === 0) {
      const xa = x0, xb = x0 + 6 * mon.speed * mm;
      c.save();
      c.fillStyle = css.accent; c.globalAlpha = 0.09;
      c.fillRect(xa, (1 + r * ST.rowMm) * mm, xb - xa, ST.rowMm * mm);
      c.globalAlpha = 1; c.strokeStyle = css.accent; c.lineWidth = 1.6 * d;
      const yb = (1 + r * ST.rowMm + 1.6) * mm;
      c.beginPath(); c.moveTo(xa, yb + 2 * mm); c.lineTo(xa, yb); c.lineTo(xb, yb); c.lineTo(xb, yb + 2 * mm); c.stroke();
      c.restore();
    }
    // tracciato
    c.strokeStyle = css.trace; c.lineWidth = 1.5 * d; c.lineJoin = 'round'; c.lineCap = 'round';
    c.beginPath();
    let primo = true;
    const step = stream.fs ? Math.min(3, 1000 / stream.fs) : 3;
    for (let t = Math.ceil(tA / step) * step; t <= tB; t += step) {
      if (t > fine) break;
      stream.vec(t, v); stream.leads(t, v, lv);
      if (stream.crossesBoundary && stream.crossesBoundary(t - step, t)) primo = true;
      if (!Number.isFinite(lv[li])) { primo = true; continue; }
      const x = x0 + (t - tA) / 1000 * mon.speed * mm;
      const y = Math.max(2, Math.min(ST.cv.height - 2, base - lv[li] * g * mm));
      if (primo) { c.moveTo(x, y); primo = false; } else c.lineTo(x, y);
    }
    c.stroke();
    // etichetta della riga: derivazione e secondo di partenza
    c.fillStyle = css.muted; c.font = '600 ' + font + 'px -apple-system, system-ui, sans-serif'; c.textBaseline = 'middle';
    c.fillText(ST.lead, 1.2 * mm, base - ST.rowMm * 0.32 * mm);
    c.fillText(Math.round(tA / 1000) + ' s', 1.2 * mm, base + ST.rowMm * 0.3 * mm);
  }
  // conteggio nella finestra dei sei secondi
  if (ST.sei) {
    const n = stream.ev.filter(e => e.kind === 'V' && e.t >= inizio && e.t < inizio + 6000).length;
    $('#stMis').innerHTML = '<b>' + n + '</b> ' + (stream.cfg.mode === 'sampled' ? 'picchi stimati' : 'QRS') + ' in 6 s → <b>' + n * 10 + '/min</b>' +
      ' · ' + ST.secRiga + ' s per riga · ' + mon.speed + ' mm/s · ' + mon.gain + ' mm/mV';
  } else {
    $('#stMis').textContent = ST.secRiga + ' s per riga · ' + mon.speed + ' mm/s · ' + mon.gain + ' mm/mV';
  }
}
function stChips() {
  $('#stLeads').innerHTML = LEADS.filter(L => !stream.hasLead || stream.hasLead(L.id)).map(L => '<button data-l="' + L.id + '"' + (L.id === ST.lead ? ' class="on"' : '') + '>' + L.id + '</button>').join('');
  $$('#stLeads button').forEach(b => b.addEventListener('click', () => {
    ST.lead = b.dataset.l; store.stLead = ST.lead; save();
    $$('#stLeads button').forEach(x => x.classList.toggle('on', x.dataset.l === ST.lead));
    stDraw();
  }));
}
function stripOn(on) {
  if (on === ST.on) return;
  ST.on = on;
  $('#strip').hidden = !on;
  document.body.style.overflow = on ? 'hidden' : '';
  if (!on) return;
  if (!ST.cv) { ST.cv = $('#stCv'); ST.ctx = ST.cv.getContext('2d'); }
  ST.lead = store.stLead || (byId[S.sc] && byId[S.sc].look && byId[S.sc].look[0]) || 'II';
  if (LIDX[ST.lead] === undefined) ST.lead = 'II';
  if (stream.hasLead && !stream.hasLead(ST.lead)) ST.lead = stream.availableLeads[0];
  $('#stTitolo').textContent = $('#scTitle').textContent;
  stChips();
  requestAnimationFrame(() => { stLayout(); stDraw(); });
}
$('#stSei').classList.add('on');
$('#stripBtn').addEventListener('click', () => stripOn(true));
$('#stEsci').addEventListener('click', () => stripOn(false));
$('#stPlay').addEventListener('click', () => setPlaying(!S.playing));
$('#stSei').addEventListener('click', () => {
  ST.sei = !ST.sei;
  $('#stSei').setAttribute('aria-pressed', ST.sei ? 'true' : 'false');
  $('#stSei').classList.toggle('on', ST.sei);
  stDraw();
});
window.addEventListener('resize', () => { if (ST.on) { stLayout(); stDraw(); } });

let zenOn = false;
const zVec = [0, 0, 0], zLv = new Array(12).fill(0);
function zenStage(on) {
  if (on === zenOn) return;
  zenOn = on;
  const zen = $('#zen'), stage = $('#stage'), ecg = $('#ecgWrap');
  if (on) {
    if (document.body.classList.contains('zen-card')) zenCard(false);
    $('#zStage').appendChild(stage);
    $('#zBottom').appendChild(ecg);
    zen.hidden = false;
    document.body.style.overflow = 'hidden';
    $('#zenTitolo').textContent = $('#scTitle').textContent;
    zDati();
  } else {
    $('.lower').insertBefore(stage, $('.lower').firstChild);
    $('.main').insertBefore(ecg, $('.lower'));
    zen.hidden = true;
    document.body.style.overflow = '';
  }
  $('#zenBtn').textContent = on ? '⤡ Riduci' : '⤢ Schermo intero';
  requestAnimationFrame(() => { mon.layout(); scene.resize(); });
}
$('#zenBtn').addEventListener('click', () => zenStage(!zenOn));
$('#zenEsci').addEventListener('click', () => zenStage(false));
document.addEventListener('keydown', e => { if (e.key === 'Escape') { if (ST.on) stripOn(false); else if (zenOn) zenStage(false); else if (document.body.classList.contains('zen-card')) zenCard(false); } });

function zDati() {
  // tre riquadri di soli numeri (larghezza e altezza fisse) e la fase, che è
  // testo variabile, su una riga sua alta due righe: così le barre sotto non
  // ballano mai quando cambia la fase del ciclo.
  $('#zDati').innerHTML =
    '<h4>Vettore istantaneo</h4><div class="zgrid">' +
    '<div><span>Modulo</span><b id="zMod">—</b></div>' +
    '<div><span title="Asse frontale">Asse frontale</span><b id="zFront">—</b></div>' +
    '<div><span title="Asse orizzontale">Asse orizz.</span><b id="zOriz">—</b></div></div>' +
    '<div class="zfase"><span>Fase</span><b id="zFase">—</b></div>' +
    '<h4>Proiezione sulle dodici derivazioni</h4><div id="zLeads"></div>' +
    '<p class="note" style="margin-top:10px">La barra è la proiezione del vettore sull’asse della derivazione: a destra positiva, a sinistra negativa. È esattamente ciò che la punta scrive sulla carta in quell’istante.</p>';
  $('#zLeads').innerHTML = LEADS.map(L =>
    '<div class="zlead"><i>' + L.id + '</i><div class="zbaro"><i id="zb-' + L.id + '"></i></div><u id="zv-' + L.id + '">0,00</u></div>').join('');
}
let zT = 0, zScala = 0.6;
function zAggiorna(now) {
  if (!zenOn || !stream) return;
  $('#zenTitolo').textContent = $('#scTitle').textContent;
  stream.vec(mon.t, zVec); stream.leads(mon.t, zVec, zLv);
  const mod = Math.hypot(zVec[0], zVec[1], zVec[2]);
  const front = Math.atan2(-zVec[1], zVec[0]) / DEG;
  const oriz = Math.atan2(zVec[2], zVec[0]) / DEG;
  const grado = v => (v > 0 ? '+' : v < 0 ? '−' : '') + Math.abs(Math.round(v)) + '°';
  const e = id => document.getElementById(id);
  if (e('zMod')) {
    e('zMod').textContent = fmt(mod, 2) + ' mV';
    e('zFront').textContent = mod > 0.04 ? grado(front) : '—';
    e('zOriz').textContent = mod > 0.04 ? grado(oriz) : '—';
    e('zFase').textContent = scene.phase || '—';
  }
  // la scala non si ricalcola a ogni fotogramma: cresce subito e cala piano,
  // altrimenti a vettore piccolo le barre resterebbero lunghe e sembrerebbero
  // impazzite. Così la lunghezza della barra è confrontabile nel tempo.
  const picco = Math.max.apply(null, zLv.filter(Number.isFinite).map(Math.abs).concat([0])) * 1.15;
  zScala = Math.max(0.6, picco, zScala * 0.992);
  const scala = zScala;
  LEADS.forEach((L, i) => {
    const b = document.getElementById('zb-' + L.id), u = document.getElementById('zv-' + L.id);
    if (!b) return;
    if (!Number.isFinite(zLv[i])) { b.style.width = '0%'; u.textContent = 'N/D'; return; }
    const f = Math.max(-1, Math.min(1, zLv[i] / scala));
    b.style.left = (f >= 0 ? 50 : 50 + f * 50) + '%';
    b.style.width = Math.abs(f) * 50 + '%';
    u.textContent = (zLv[i] >= 0 ? '+' : '−') + fmt(Math.abs(zLv[i]), 2);
  });
  if (now - zT > 400) { zT = now; $('#zenMisure').innerHTML = measure(stream, mon.t); }
}
$('#markBtn').addEventListener('click', () => {
  mon.marks = !mon.marks;
  $('#markBtn').classList.toggle('on', mon.marks);
  $('#markBtn').setAttribute('aria-pressed', mon.marks);
  mon.drawOverlay();
});
/* Battito prematuro su richiesta. Ventricolare: QRS largo senza P, pausa
   compensatoria. Atriale: P prematura di forma diversa, QRS normale, pausa non
   compensatoria perché il nodo del seno viene resettato. */
function ectopia(kind) {
  S.ectTipo = kind; store.ectTipo = kind; save();
  $$('#ectSeg button').forEach(b => b.classList.toggle('on', b.dataset.e === kind));
  aggiornaEctUI();
  if (!stream || !stream.injectEctopic) return;
  if (S.ectPat !== 'off' && ritmoSinusale(curCfg)) {
    buildStream(byId[S.sc], paramsFor(byId[S.sc]), true); defUI(byId[S.sc]); return;
  }
  if (!S.playing) setPlaying(true);            // ferma il tracciato non si vedrebbe
  const r = stream.injectEctopic(mon.t, kind);
  const b = $('#ectSeg button[data-e="' + kind + '"]');
  if (b && r) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 260); }
}
$$('#ectSeg button').forEach(b => b.addEventListener('click', () => ectopia(b.dataset.e)));
$('#ectPat').addEventListener('change', e => {
  S.ectPat = e.target.value; store.ectPat = S.ectPat; save();
  if (!digCur) { buildStream(byId[S.sc], paramsFor(byId[S.sc]), true); defUI(byId[S.sc]); }
  aggiornaEctUI();
});
aggiornaEctUI();
document.addEventListener('keydown', e => {
  if (e.metaKey || e.ctrlKey || e.altKey) return;
  const t = e.target;
  if (t && (t.tagName === 'INPUT' || t.tagName === 'SELECT' || t.tagName === 'TEXTAREA')) return;
  if (S.view !== 'trace') return;
  if (e.key === 'e' || e.key === 'E') { e.preventDefault(); ectopia('pvc'); }
  if (e.key === 'a' || e.key === 'A') { e.preventDefault(); ectopia('pac'); }
});
$$('#hud3d [data-cam]').forEach(b => b.addEventListener('click', () => { $$('#hud3d [data-cam]').forEach(x => x.classList.toggle('on', x === b)); scene.cam(b.dataset.cam); }));
$$('#hud3d [data-tg]').forEach(b => b.addEventListener('click', () => {
  const k = b.dataset.tg; S.tgl[k] = !S.tgl[k];
  if (S.tgl[k] && (k === 'anat' || k === 'heart')) { const altro = k === 'anat' ? 'heart' : 'anat'; if (S.tgl[altro]) { S.tgl[altro] = false; scene.toggle(altro, false); const ab = $('#hud3d [data-tg="' + altro + '"]'); if (ab) ab.classList.remove('on'); } }
  b.classList.toggle('on', S.tgl[k]); scene.toggle(k, S.tgl[k]); store.tgl = S.tgl; save();
}));
$('#hOpac').value = Math.round(S.opac * 100);
$('#hOpac').addEventListener('input', e => { S.opac = +e.target.value / 100; scene.setHeartOpacity(S.opac); store.opac = S.opac; save(); });

/* misure dal tracciato */
function measure(st, t) {
  if (st.cfg.mode === 'sampled') {
    const B = st.battiti || [];
    if (B.length < 2) return '<span>Tracciato reale digitalizzato</span>';
    const rr = (B[B.length-1] - B[0]) / (B.length - 1);
    return '<span>FC stimata <b>' + fmt(60000/rr) + '/min</b></span><span>RR medio <b>' + fmt(rr) + ' ms</b></span>' +
      '<span>' + B.length + ' picchi rilevati nel segmento; verifica sul tracciato</span>' +
      '<span class="note">Usa il compasso per PR, QRS e QT: su un tracciato reale si misurano, non si leggono da un modello</span>';
  }
  const cont = st.cfg.mode === 'continuous';
  if (cont) return '<span>Nessun QRS riconoscibile: le misure non sono applicabili</span>';
  const Vs = st.ev.filter(e => e.kind === 'V' && e.t <= t);
  if (Vs.length < 2) return '<span>Misure in corso…</span>';
  const a = Vs[Vs.length - 2], b = Vs[Vs.length - 1];
  const rr = b.t - a.t, fc = 60000 / rr;
  const narrowOrigin = b.meta.type === 'conducted' || b.meta.type === 'escape-j';
  // ultimo battito "di base" per PR, QRS e QT
  const base = Vs.slice().reverse().find(e => e.meta.paced || e.meta.type === 'conducted' || e.meta.type === 'escape-j' || e.meta.type === 'escape-v' || e.meta.type === 'vt') || b;
  const prevBase = Vs.slice(0, Vs.indexOf(base)).reverse().find(e => e.meta.type === base.meta.type);
  const rrB = prevBase ? base.t - prevBase.t : rr;
  let pr = '—';
  if (base.meta.type === 'conducted' && st.cfg.atrial !== 'af' && st.cfg.atrial !== 'flutter' && st.cfg.mode !== 'svt') {
    const A = st.ev.filter(e => e.kind === 'A' && e.t < base.t && base.t - e.t < 450 && !e.meta.blocked && e.meta.type !== 'retro').slice(-1)[0];
    if (A) pr = fmt(base.t - A.t) + ' ms';
  } else if (base.meta.type === 'paced-crt') pr = 'stimolato';
  else if (base.meta.paced || st.cfg.mode === 'vt' || st.cfg.av === 'III') pr = 'dissociato';
  const irr = st.cfg.atrial === 'af' ? ' (RR variabile)' : '';
  let s = '<span>FC <b>' + fmt(fc) + '/min</b>' + irr + '</span><span>RR <b>' + fmt(rr) + ' ms</b></span><span>PR <b>' + pr + '</b></span><span>QRS <b>' + fmt(base.meta.w) + ' ms</b></span>';
  if (base.meta.type !== 'vt') {
    const qt = base.meta.qt, qtcB = qt / Math.sqrt(rrB / 1000), qtcF = qt / Math.cbrt(rrB / 1000);
    s += '<span>QT <b>' + fmt(qt) + ' ms</b></span><span>QTc Bazett <b>' + fmt(qtcB) + ' ms</b></span><span>QTc Fridericia <b>' + fmt(qtcF) + ' ms</b></span>';
  }
  return s;
}

/* =====================================================================
   TEORIA
   ===================================================================== */
let theoryId = store.theory || THEORY[0].id;
function renderTheory() {
  const toc = $('#toc'); toc.innerHTML = '';
  THEORY.forEach(ch => { const b = document.createElement('button'); b.textContent = ch.title; b.classList.toggle('on', ch.id === theoryId); b.addEventListener('click', () => { theoryId = ch.id; store.theory = ch.id; save(); renderTheory(); $('#article').scrollTop = 0; }); toc.appendChild(b); });
  const ch = THEORY.find(c => c.id === theoryId) || THEORY[0];
  $('#article').innerHTML = '<h1>' + esc(ch.title) + '</h1>' + ch.html + FIRMA;
  if ($('#w-fc')) widgetFC($('#w-fc'));
  if ($('#w-asse')) widgetAxis($('#w-asse'));
}
function setZen(on) {
  document.body.classList.toggle('theory-focus', on);
  const b = $('#thFull');
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.lastChild.textContent = on ? 'Esci' : 'Schermo intero';
  const el = $('#v-theory');
  try {
    if (on && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  } catch (err) {}
}
$('#thFull').addEventListener('click', () => setZen(!document.body.classList.contains('theory-focus')));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('theory-focus')) setZen(false); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('theory-focus')) setZen(false); });

function widgetFC(el) {
  el.innerHTML = '<div class="wrow"><div class="ctrl"><div class="lab"><span>Distanza tra due R</span><output class="num"></output></div><input type="range" min="8" max="75" step="1" value="20"></div><div><div class="big num" id="fcOut"></div><div class="note" id="fcNote"></div></div></div><canvas height="120"></canvas>';
  const inp = el.querySelector('input'), out = el.querySelector('output'), cv = el.querySelector('canvas');
  const draw = () => {
    const mmRR = +inp.value; out.textContent = mmRR + ' quadratini (' + fmt(mmRR * 40) + ' ms)';
    el.querySelector('#fcOut').textContent = fmt(1500 / mmRR) + '/min';
    el.querySelector('#fcNote').textContent = '1500 ÷ ' + mmRR + ' quadratini, oppure 300 ÷ ' + fmt(mmRR / 5, 1) + ' quadrati grandi';
    const d = Math.min(window.devicePixelRatio || 1, 2), W = cv.clientWidth; cv.width = W * d; cv.height = 120 * d; const c = cv.getContext('2d'); readVars();
    const mm = W / 150 * d; c.fillStyle = css.paper; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i * mm <= cv.width; i++) { c.strokeStyle = i % 5 ? css.grid : css.grid2; c.lineWidth = d * 0.6; c.beginPath(); c.moveTo(Math.round(i * mm) + 0.5, 0); c.lineTo(Math.round(i * mm) + 0.5, cv.height); c.stroke(); }
    for (let j = 0; j * mm <= cv.height; j++) { c.strokeStyle = j % 5 ? css.grid : css.grid2; c.beginPath(); c.moveTo(0, Math.round(j * mm) + 0.5); c.lineTo(cv.width, Math.round(j * mm) + 0.5); c.stroke(); }
    c.strokeStyle = css.trace; c.lineWidth = 1.6 * d; c.beginPath(); const base = gridBaseline(mm, 80 * d); c.moveTo(0, base);
    for (let x = 10; x * mm < cv.width; x += mmRR) { c.lineTo((x - 1) * mm, base); c.lineTo((x - 0.5) * mm, base + 4 * d); c.lineTo(x * mm, base - 60 * d); c.lineTo((x + 0.6) * mm, base + 10 * d); c.lineTo((x + 1.2) * mm, base); }
    c.lineTo(cv.width, base); c.stroke();
  };
  inp.addEventListener('input', draw); draw();
}
function widgetAxis(el) {
  el.innerHTML = '<div class="wrow"><div class="ctrl"><div class="lab"><span>QRS netto in DI</span><output class="num"></output></div><input id="axI" type="range" min="-10" max="10" step="0.5" value="6"></div><div class="ctrl"><div class="lab"><span>QRS netto in aVF</span><output class="num"></output></div><input id="axF" type="range" min="-10" max="10" step="0.5" value="4"></div></div><div class="wrow"><svg viewBox="-120 -120 240 240" width="240" height="240" id="axSvg"></svg><div><div class="big num" id="axOut"></div><p id="axTxt" style="margin:4px 0"></p></div></div>';
  const I = el.querySelector('#axI'), Fv = el.querySelector('#axF'), outs = el.querySelectorAll('output'), svg = el.querySelector('#axSvg');
  const draw = () => {
    outs[0].textContent = (+I.value > 0 ? '+' : '') + fmt(+I.value, 1) + ' mm'; outs[1].textContent = (+Fv.value > 0 ? '+' : '') + fmt(+Fv.value, 1) + ' mm';
    const a = Math.atan2(+Fv.value, +I.value) / DEG; const r = Math.round(a);
    el.querySelector('#axOut').textContent = (+I.value === 0 && +Fv.value === 0) ? '—' : (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r) + '°';
    let txt = 'Asse nei limiti della norma (−30° / +90°).';
    if (r < -30 && r >= -90) txt = 'Deviazione assiale sinistra: controlla se è un emiblocco anteriore sinistro (−45° / −90°).';
    else if (r > 90) txt = 'Deviazione assiale destra: pensa a ipertrofia destra, embolia polmonare, emiblocco posteriore, infarto laterale.';
    else if (r < -90) txt = 'Asse estremo: in una tachicardia a QRS largo orienta verso la TV.';
    el.querySelector('#axTxt').textContent = txt;
    let s = '<circle r="100" fill="none" stroke="var(--line)"/>';
    s += '<path d="M0 0 L' + 100 * Math.cos(-30 * DEG) + ' ' + 100 * Math.sin(-30 * DEG) + ' A100 100 0 0 1 0 100 Z" fill="var(--hl)"/>';
    [['DI', 0], ['DII', 60], ['DIII', 120], ['aVR', -150], ['aVL', -30], ['aVF', 90]].forEach(([n, g]) => { const x = Math.cos(g * DEG), y = Math.sin(g * DEG); s += '<line x1="' + (-x * 100) + '" y1="' + (-y * 100) + '" x2="' + x * 100 + '" y2="' + y * 100 + '" stroke="var(--line)" stroke-width="1.2"/><text x="' + x * 112 + '" y="' + (y * 112 + 4) + '" font-size="11" text-anchor="middle" fill="var(--muted)">' + n + '</text>'; });
    const x = Math.cos(a * DEG) * 88, y = Math.sin(a * DEG) * 88;
    s += '<line x1="0" y1="0" x2="' + x + '" y2="' + y + '" stroke="var(--accent)" stroke-width="4" stroke-linecap="round"/><circle cx="' + x + '" cy="' + y + '" r="5" fill="var(--accent)"/>';
    svg.innerHTML = s;
  };
  I.addEventListener('input', draw); Fv.addEventListener('input', draw); draw();
}

/* =====================================================================
   QUIZ
   ===================================================================== */
const qmon = new Monitor($('#qEcg'), $('#qEcgOv'), {});
/* Senza atlante (versione senza i riferimenti al corso) la linguetta e il quiz
   sulle immagini non hanno più niente da mostrare: spariscono. */
if (!ATLAS.length) {
  const q = document.querySelector('[data-qm="atlas"]'); if (q) q.hidden = true;
  const seg = $('#qModeSeg'); if (seg) seg.hidden = true;
  /* La linguetta però resta se ci sono i tracciati reali: quelli sono
     pubblicabili, e senza le slide del corso l'atlante diventa proprio loro.
     Lo si sa solo dopo aver letto l'indice, quindi si decide lì. */
  const t = document.querySelector('[data-v="atlas"]');
  if (t) {
    t.hidden = true;
    caricaIndiceReale().then(r => { if (r && r.voci.length) { t.hidden = false; atlasFonte = 'reale'; } });
  }
}
const Q = { cat: 'Tutte', cur: null, done: false, playing: true, stream: null, mode: (store.qmode === 'atlas' && ATLAS.length) ? 'atlas' : 'gen', atlasDecks: {} };
/* immagini dell'atlante utilizzabili come domanda: quelle con un quadro collegato */
const QATL = ATLAS.filter(a => a.quizApproved && a.q && byId[a.q]);
$('#qPause').addEventListener('click', () => {
  Q.playing = !Q.playing;
  $('#qPause').textContent = Q.playing ? 'Pausa' : 'Riprendi';
  $('#qPause').classList.toggle('on', !Q.playing);
});
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
/* Mazzo del quiz Atlante: ogni immagine idonea compare una sola volta prima
   che il gruppo venga rimescolato. I mazzi sono separati per categoria, così
   cambiare filtro non azzera il giro già iniziato. */
function nextAtlasCard(pool) {
  const key = Q.cat || 'Tutte';
  const signature = pool.map(a => a.id).join('|');
  let deck = Q.atlasDecks[key];
  if (!deck || deck.signature !== signature || !deck.items.length) {
    const items = shuffle(pool.slice());
    if (Q.cur && Q.cur.atl && items.length > 1 && items[0].id === Q.cur.atl.id) items.push(items.shift());
    deck = Q.atlasDecks[key] = { signature, items, total: pool.length };
  }
  const a = deck.items.shift();
  return { a, shown: deck.total - deck.items.length, total: deck.total };
}
function catDisponibili() {
  if (Q.mode !== 'atlas') return CATS.filter(c => SCENARIOS.some(s => s.cat === c && s.quiz));
  const set = {}; QATL.forEach(a => { set[byId[a.q].cat] = 1; });
  return CATS.filter(c => set[c]);
}
function renderQFilter() {
  const box = $('#qFilter'); box.innerHTML = '';
  const cats = catDisponibili();
  if (Q.cat !== 'Tutte' && cats.indexOf(Q.cat) < 0) Q.cat = 'Tutte';
  ['Tutte'].concat(cats).forEach(c => { const b = document.createElement('button'); b.className = 'chip' + (Q.cat === c ? ' on' : ''); b.textContent = c; b.addEventListener('click', () => { Q.cat = c; renderQFilter(); newQuestion(); }); box.appendChild(b); });
  $('#score').textContent = 'Corrette ' + store.quiz.ok + ' su ' + store.quiz.tot;
}
$$('#qModeSeg button').forEach(b => b.addEventListener('click', () => {
  $$('#qModeSeg button').forEach(x => x.classList.toggle('on', x === b));
  Q.mode = b.dataset.qm; store.qmode = Q.mode; save();
  renderQFilter(); newQuestion();
}));
if (Q.mode === 'atlas') $$('#qModeSeg button').forEach(b => b.classList.toggle('on', b.dataset.qm === 'atlas'));
function opzioni(sc) {
  const same = shuffle(SCENARIOS.filter(x => x.quiz && x.id !== sc.id && x.cat === sc.cat));
  const other = shuffle(SCENARIOS.filter(x => x.quiz && x.id !== sc.id && x.cat !== sc.cat));
  return shuffle([sc].concat(same.slice(0, 2), other).slice(0, 4));
}
function feedback(sc, ok, extra) {
  const c = sc.card;
  return '<div class="sec"><h3>' + (ok ? 'Corretto' : 'Era: ' + esc(sc.name)) + '</h3><p>' + esc(c.def) + '</p>' +
    (extra || '') +
    '<ul class="crit">' + c.criteri.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
    '<p><b>Dove guardare:</b> ' + esc(c.guarda) + '</p>' +
    (c.trappole ? '<p><b>Trappola:</b> ' + esc(c.trappole) + '</p>' : '') + '</div>';
}
function newQuestionAtlas() {
  const pool = QATL.filter(a => Q.cat === 'Tutte' || byId[a.q].cat === Q.cat);
  if (!pool.length) { Q.mode = 'gen'; return newQuestion(); }
  const pick = nextAtlasCard(pool), a = pick.a;
  const sc = byId[a.q];
  $('#qEcgWrap').hidden = true; $('#qImg').hidden = false;
  const img = $('#qImgEl');
  img.onerror = () => { img.alt = 'Immagine non disponibile in questa copia dell\u2019app.'; };
  img.onload = null; img.alt = 'Tracciato ECG da interpretare';
  if (a.quizCrop) {
    img.hidden = true;
    const source = new Image(), question = a.id;
    source.onload = () => {
      if (!Q.cur || !Q.cur.atl || Q.cur.atl.id !== question) return;
      const c = document.createElement('canvas'), crop = a.quizCrop; c.width = crop[2]; c.height = crop[3];
      c.getContext('2d').drawImage(source, ...crop, 0, 0, crop[2], crop[3]);
      img.src = c.toDataURL('image/png'); img.hidden = false;
    }; source.onerror = () => { if (!Q.cur || !Q.cur.atl || Q.cur.atl.id !== question) return; img.hidden = false; img.removeAttribute('src'); img.alt = 'Immagine non disponibile offline.'; };
    source.src = 'atlante/' + a.id + '.jpg';
  } else { img.hidden = false; img.src = 'atlante/' + a.id + '.jpg'; }
  $('#qImg').classList.remove('zoom'); $('#qImg').scrollTop = 0; $('#qImg').scrollLeft = 0;
  $('#qMeasures').innerHTML = '<span>Tracciato reale dalle slide del corso — ' + esc(a.f) + ' · Giro ' + pick.shown + '/' + pick.total + '</span>';
  const opts = opzioni(sc);
  Q.cur = { sc, atl: a, opts }; Q.done = false;
  const r = $('#qRight');
  r.innerHTML = '<p class="note">Leggi il tracciato e scegli la diagnosi. Tocca l\u2019immagine per ingrandirla.</p><div class="opts">' +
    opts.map(o => '<button data-id="' + o.id + '">' + esc(o.name) + '</button>').join('') + '</div><div id="qFeed"></div>';
  r.querySelectorAll('.opts button').forEach(b => b.addEventListener('click', () => answerAtlas(b)));
}
function answerAtlas(btn) {
  if (Q.done) return; Q.done = true;
  const a = Q.cur.atl, sc = Q.cur.sc;
  const ok = btn.dataset.id === sc.id;
  store.quiz.tot++; if (ok) store.quiz.ok++; save();
  $$('#qRight .opts button').forEach(b => { b.disabled = true; if (b.dataset.id === sc.id) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
  const commento = a.n ? '<div class="sec corso"><h3>Il commento del professore</h3><p>' + esc(a.n) + '</p><p class="src">' + esc(a.f) + '</p></div>' : '';
  $('#qFeed').innerHTML = feedback(sc, ok) + commento +
    '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="qNext">Prossima immagine</button><button class="btn" id="qOpen">Apri il quadro simulato</button></div>';
  $('#qNext').addEventListener('click', newQuestion);
  $('#qOpen').addEventListener('click', () => { showView('trace'); loadScenario(sc.id, false); });
  renderQFilter();
}
$('#qImg').addEventListener('click', () => $('#qImg').classList.toggle('zoom'));
function randomParams(sc) { return window.ISO_QUIZ.params(sc); }
function newQuestion() {
  if (Q.mode === 'atlas') return newQuestionAtlas();
  $('#qEcgWrap').hidden = false; $('#qImg').hidden = true;
  qmon.layout();
  const pool = SCENARIOS.filter(s => s.quiz && (Q.cat === 'Tutte' || s.cat === Q.cat));
  let sc = pool[Math.floor(Math.random() * pool.length)];
  if (Q.cur && pool.length > 1 && sc.id === Q.cur.sc.id) sc = pool[(pool.indexOf(sc) + 1) % pool.length];
  if (!sc) { $('#qRight').textContent = 'Nessun caso disponibile in questa categoria.'; return; }
  const qSeed = Math.floor(Math.random() * 1e6);
  const caso = window.ISO_QUIZ.create(sc, qSeed), p = caso.p, cfg = caso.cfg;
  Q.stream = new Stream(cfg, qSeed);
  Q.seed = qSeed;
  qmon.setStream(Q.stream, false);
  qmon.t = qmon.pageMs() - 40; qmon.draw();
  const opts = opzioni(sc);
  Q.cur = { sc, p, opts, cfg: cloneCase(cfg), seed: qSeed }; Q.done = false;
  $('#qMeasures').innerHTML = '<span>Le misure compaiono dopo la risposta. Usa il tempo: guarda ritmo, P, PR, QRS, ST, T.</span>';
  const r = $('#qRight');
  const context = window.ISO_QUIZ.context(sc);
  r.innerHTML = (context ? '<p class="note">' + esc(context) + '</p>' : '') + '<p class="note">' + (context ? 'Quale quadro è più compatibile con tracciato e dati clinici?' : 'Osserva il tracciato e scegli il quadro ECG.') + '</p><div class="opts">' + opts.map(o => '<button data-id="' + o.id + '">' + esc(o.name) + '</button>').join('') + '</div><div id="qFeed"></div>';
  r.querySelectorAll('.opts button').forEach(b => b.addEventListener('click', () => answer(b)));
}
function answer(btn) {
  if (Q.done) return; Q.done = true;
  const ok = btn.dataset.id === Q.cur.sc.id;
  store.quiz.tot++; if (ok) store.quiz.ok++; save();
  $$('#qRight .opts button').forEach(b => { b.disabled = true; if (b.dataset.id === Q.cur.sc.id) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
  $('#qFeed').innerHTML = feedback(Q.cur.sc, ok) + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="qNext">Prossimo ECG</button><button class="btn" id="qOpen">Apri nel Tracciato</button></div>';
  $('#qNext').addEventListener('click', newQuestion);
  $('#qOpen').addEventListener('click', () => { store.params[Q.cur.sc.id] = Q.cur.p; save(); showView('trace'); loadScenario(Q.cur.sc.id, false, { cfg: Q.cur.cfg, seed: Q.cur.seed, t: qmon.t }); });
  qmon.setHighlight(Q.cur.sc.look || []);
  $('#qMeasures').innerHTML = measure(Q.stream, qmon.t);
  renderQFilter();
}


/* =====================================================================
   ATLANTE: tracciati reali dalle lezioni
   ===================================================================== */
let atlasG = store.atlasG || (ATLAS_G[0] ? ATLAS_G[0].id : '');
let atlasQ = '';
let realPage = 0, realValidation = 'all', realQuality = 'all', realOfflineOnly = false, realOffline = new Set();
const REAL_PAGE_SIZE = 60;
/* ---------- atlante dei tracciati reali (PTB-XL, CC BY 4.0) ----------
   Sezione separata da quelle delle slide. L'indice è un file solo, leggero; il
   segnale di ogni tracciato si scarica quando lo apri, così la raccolta può
   contenerne migliaia senza appesantire l'avvio. Se la cartella non c'è,
   la sezione semplicemente non compare. */
function caricaIndiceReale() {
  if (REALE === null && window.ISO_REALE && window.ISO_REALE.length) {
    const groups = new Map();
    const voci = window.ISO_REALE.map((r, i) => { const g = r.g || 'altro'; groups.set(g, r.gn || 'Altri quadri'); return Object.assign({}, r, { i: r.i || ('reale-' + i), g }); });
    REALE = { voci, gruppi: [...groups].map(([id, nome]) => ({ id, nome })), licenza: 'PTB-XL v1.0.3 - PhysioNet - CC BY 4.0 - https://doi.org/10.13026/kfzx-aw45' };
  }
  if (REALE !== null) return Promise.resolve(REALE);
  if (realIndexTask) return realIndexTask;
  realIndexError = '';
  realIndexTask = fetch('atlante-reale/indice.json').then(r => {
    if (!r.ok) throw Error('Catalogo non disponibile'); return r.json();
  }).then(d => { REALE = d.schema === 2 ? PTB.expandCatalog(d) : d; return REALE; })
    .catch(() => { realIndexError = 'Il catalogo non è disponibile. Collegati a Internet e riprova.'; return null; })
    .finally(() => { realIndexTask = null; });
  return realIndexTask;
}
function gruppiReali() {
  const g = [];
  (REALE.gruppi || []).forEach(x => { if (REALE.voci.some(v => v.groups ? v.groups.includes(x.id) : v.g === x.id)) g.push(x); });
  return g;
}
function apriReale(v) {
  if (recordAbort) recordAbort.abort();
  const request = ++recordRequest;
  const status = $('#realStatus');
  status.textContent = 'Caricamento di ' + v.f + '…';
  const fatto = rec => {
    if (request !== recordRequest) return;
    recordAbort = null;
    rec = Object.assign({}, rec, { reale: true, t: rec.ptb && rec.t ? rec.t : v.t, f: v.f, q: v.q, scp: v.scp });
    status.textContent = '';
    showView('trace');
    apriDigitalizzato(v.i, rec);
  };
  if (DIG[v.i]) return fatto(DIG[v.i]);
  if (realeCache[v.i]) return fatto(realeCache[v.i]);
  recordAbort = new AbortController();
  const options = { signal:recordAbort.signal, progress:message => { if (request === recordRequest) status.textContent = v.f + ' · ' + message; } };
  const loading = REALE && REALE.schema === 2 ? PTB.load(v, options)
    : fetch('atlante-reale/' + v.i + '.json', options).then(r => { if (!r.ok) throw new Error('Tracciato non disponibile'); return r.json(); });
  return loading.then(rec => {
    if (request !== recordRequest) return;
    if (rec.offline) realOffline.add(v.id);
    const keys = Object.keys(realeCache); if (keys.length >= 8) delete realeCache[keys[0]];
    realeCache[v.i] = rec; fatto(rec);
  }).catch(error => {
    if (request !== recordRequest) return;
    if (recordAbort) recordAbort.abort();
    recordAbort = null;
    status.textContent = 'ECG non caricato. ' + (error.name === 'AbortError' ? 'Il download è stato interrotto.' : error.message) + ' Se sei offline, scegli un ECG già salvato. Tocca di nuovo la scheda per riprovare.';
  });
}
function atlasFiltered() {
  const q = atlasQ.trim().toLowerCase();
  if (q) return ATLAS.filter(a => (a.t + ' ' + a.n + ' ' + a.f).toLowerCase().indexOf(q) >= 0);
  return ATLAS.filter(a => a.g === atlasG);
}
let offlineBusy = false, offlineJob = 0, offlineTimer = null;
function offlineRequest(save) {
  const status = $('#offlineStatus'), button = $('#offlineSave');
  if (!('serviceWorker' in navigator)) { status.textContent = 'Il browser non supporta il salvataggio offline.'; button.disabled = true; return; }
  const urls = atlasFiltered().map(a => 'atlante/' + a.id + '.jpg');
  if (!urls.length) { status.textContent = 'Nessuna immagine in questa selezione.'; return; }
  const id = ++offlineJob;
  clearTimeout(offlineTimer);
  const failed = () => { if (id !== offlineJob) return; offlineJob++; offlineBusy = false; button.disabled = false; status.textContent = 'Salvataggio offline non disponibile. Riapri l’app quando sei collegato.'; };
  offlineTimer = setTimeout(failed, 12000);
  if (save) { offlineBusy = true; button.disabled = true; status.textContent = 'Salvataggio delle immagini…'; }
  navigator.serviceWorker.ready.then(reg => {
    if (id !== offlineJob) return;
    const worker = navigator.serviceWorker.controller || reg.active;
    if (!worker) throw new Error('Servizio offline non ancora disponibile');
    worker.postMessage({ type: save ? 'offline-save' : 'offline-status', urls, id });
  }).catch(() => { clearTimeout(offlineTimer); failed(); });
}
$('#offlineSave').addEventListener('click', () => offlineRequest(true));
function renderAtlas() {
  const real = atlasFonte === 'reale';
  $('#offlineSave').hidden = $('#offlineStatus').hidden = !!real;
  $('#realTools').hidden = !real;
  $('#aSearch').placeholder = real ? 'Cerca diagnosi, codice o numero ECG…' : 'Cerca nell’atlante del corso…';
  if (!offlineBusy && !real) offlineRequest(false);
  const toc = $('#atoc'); toc.innerHTML = '';
  if (PTB || REALE && REALE.voci.length) {
    const barra = document.createElement('div'); barra.className = 'afonti';
    [['corso', 'Slide del corso', ATLAS.length], ['reale', 'PTB-XL', REALE ? REALE.voci.length : null]].forEach(([id, nome, n]) => {
      const b = document.createElement('button');
      b.className = 'afonte' + (atlasFonte === id ? ' on' : '');
      b.textContent = nome + (n == null ? '' : ' (' + Number(n).toLocaleString('it-IT') + ')');
      b.setAttribute('aria-pressed', atlasFonte === id ? 'true' : 'false');
      b.addEventListener('click', () => {
        if (recordAbort) { recordAbort.abort(); recordAbort = null; recordRequest++; $('#realStatus').textContent = ''; }
        atlasFonte = id; atlasQ = ''; realPage = 0; const c = $('#aSearch'); if (c) c.value = '';
        store.atlasFonte = id; save(); renderAtlas(); const w = $('.agrid-wrap'); if (w) w.scrollTop = 0;
        if (id === 'reale' && !REALE) caricaIndiceReale().then(renderAtlas);
      });
      barra.appendChild(b);
    });
    toc.appendChild(barra);
  }
  if (real) return renderAtlasReale(toc);
  ATLAS_G.forEach(g => {
    const n = ATLAS.filter(a => a.g === g.id).length;
    const b = document.createElement('button');
    b.textContent = g.nome + ' (' + n + ')';
    b.classList.toggle('on', !atlasQ && g.id === atlasG);
    b.addEventListener('click', () => { atlasG = g.id; atlasQ = ''; $('#aSearch').value = ''; store.atlasG = g.id; save(); renderAtlas(); $('.agrid-wrap').scrollTop = 0; });
    toc.appendChild(b);
  });
  const grid = $('#agrid'); grid.innerHTML = '';
  const list = atlasFiltered();
  if (!list.length) { grid.innerHTML = '<p class="ahead">Nessun tracciato trovato</p>'; return; }
  if (window.ISO_NOATLAS) {
    const w = document.createElement('p'); w.className = 'ahead';
    w.textContent = 'Anteprima: le immagini dei tracciati ci sono solo nell\u2019app installata. Qui vedi l\u2019elenco e le didascalie.';
    grid.appendChild(w);
  }
  const head = document.createElement('p'); head.className = 'ahead';
  head.textContent = atlasQ ? list.length + ' tracciati trovati' : (ATLAS_G.find(g => g.id === atlasG) || {}).nome || '';
  grid.appendChild(head);
  list.forEach(a => {
    const b = document.createElement('button');
    b.className = 'acard';
    b.innerHTML = (window.ISO_NOATLAS ? '' : '<img loading="lazy" decoding="async" src="atlante/' + a.id + '.jpg" alt="' + esc(a.t) + '" onerror="this.style.display=\'none\'">') +
      '<div class="at">' + esc(a.t) + '</div><div class="as">' + (DIG[a.id] ? '▶ animabile · ' : '') + esc(a.f) + '</div>';
    b.addEventListener('click', () => openLightbox(a));
    grid.appendChild(b);
  });
}
function renderAtlasReale(toc) {
  const grid = $('#agrid'); grid.innerHTML = '';
  if (!REALE) {
    $('#realSummary').textContent = 'ECG reali PTB-XL';
    const p = document.createElement('p'); p.className = 'ahead'; p.textContent = realIndexError || 'Caricamento del catalogo…'; grid.appendChild(p);
    if (realIndexError) { const retry = document.createElement('button'); retry.className = 'btn'; retry.textContent = 'Riprova'; retry.addEventListener('click', () => { caricaIndiceReale().then(renderAtlas); renderAtlas(); }); grid.appendChild(retry); }
    return;
  }
  const modern = REALE.schema === 2;
  $('#realFilters').hidden = !modern;
  const eligible = REALE.voci.filter(v => (realValidation !== 'validated' || v.validated) && (realQuality !== 'clean' || !v.noisy) && (!realOfflineOnly || realOffline.has(v.id)));
  const gr = gruppiReali();
  if (!realeG || realeG !== 'all' && !gr.some(g => g.id === realeG)) realeG = 'all';
  const inGroup = (v, id) => id === 'all' || (v.groups ? v.groups.includes(id) : v.g === id);
  [{id:'all',nome:'Tutti i tracciati'}, ...gr].forEach(g => {
    const n = eligible.filter(v => inGroup(v, g.id)).length;
    const b = document.createElement('button');
    b.textContent = g.nome + ' (' + Number(n).toLocaleString('it-IT') + ')';
    b.classList.toggle('on', g.id === realeG);
    b.addEventListener('click', () => { realeG = g.id; atlasQ = ''; realPage = 0; const c = $('#aSearch'); if (c) c.value = ''; store.realeG = g.id; save(); renderAtlas(); const w = $('.agrid-wrap'); if (w) w.scrollTop = 0; });
    toc.appendChild(b);
  });
  const words = atlasQ.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const exact = /^(?:ptb[- ]?xl[-# ]*)?#?(\d+)$/i.exec(atlasQ.trim());
  const list = eligible.filter(v => {
    if (!inGroup(v, realeG)) return false;
    if (exact) return v.id === Number(exact[1]);
    const text = v.search || (v.t + ' ' + (v.scp || []).join(' ') + ' ' + v.gn).toLowerCase();
    return words.every(word => text.includes(word));
  });
  const pages = Math.max(1, Math.ceil(list.length / REAL_PAGE_SIZE)); realPage = Math.min(realPage, pages - 1);
  const start = realPage * REAL_PAGE_SIZE;
  $('#realSummary').textContent = Number(REALE.voci.length).toLocaleString('it-IT') + ' ECG reali · 12 derivazioni · 10 secondi · 500 Hz';
  $('#realCount').textContent = Number(realOffline.size).toLocaleString('it-IT') + ' segnali salvati sul dispositivo. Apri un ECG online per conservarlo anche offline.';
  const head = document.createElement('p'); head.className = 'ahead';
  head.textContent = Number(list.length).toLocaleString('it-IT') + ' tracciati' + (list.length ? ' · ' + (start + 1) + '–' + Math.min(start + REAL_PAGE_SIZE, list.length) : ' trovati');
  grid.appendChild(head);
  if (!list.length) { grid.insertAdjacentHTML('beforeend', '<p class="ahead">Nessun tracciato trovato</p>'); return; }
  list.slice(start, start + REAL_PAGE_SIZE).forEach(v => {
    const b = document.createElement('button');
    b.className = 'acard areale';
    b.dataset.record = v.i;
    b.innerHTML = '<div class="as">' + esc(v.f) + (v.person ? ' · ' + esc(v.person) : '') + '</div><div class="at">' + esc(v.t) + '</div>' +
      '<div class="ascp">' + (v.scp || []).map(c => '<span title="' + esc(modern ? REALE.codes[c].name : c) + '">' + esc(c) + '</span>').join('') + '</div>' +
      (modern ? '<div class="as validation">' + (v.validated ? '✓ Referto con validazione umana' : 'Validazione umana non indicata') + (v.noisy ? ' · Artefatti segnalati' : '') + '</div>' : '') +
      '<div class="as play-record">▶ Anima ECG · ' + fmt(v.n / v.fs, 0) + ' s' + (realOffline.has(v.id) ? ' · Offline' : '') + '</div>';
    b.addEventListener('click', () => apriReale(v));
    grid.appendChild(b);
  });
  if (pages > 1) {
    const nav = document.createElement('nav'); nav.className = 'real-pages'; nav.setAttribute('aria-label', 'Pagine dei tracciati PTB-XL');
    [['Precedente', -1], ['Successiva', 1]].forEach(([label, delta]) => {
      const button = document.createElement('button'); button.className = 'btn'; button.textContent = label;
      button.disabled = realPage + delta < 0 || realPage + delta >= pages;
      button.addEventListener('click', () => { realPage += delta; renderAtlas(); $('.agrid-wrap').scrollTop = 0; });
      nav.appendChild(button);
      if (delta === -1) { const text = document.createElement('span'); text.textContent = 'Pagina ' + (realPage + 1) + ' di ' + pages; nav.appendChild(text); }
    });
    grid.appendChild(nav);
  }
  const nota = document.createElement('div'); nota.className = 'arealenota';
  nota.innerHTML = modern ? ptbCredits() : esc(REALE.licenza || '');
  grid.appendChild(nota);
}
$('#realValidation').addEventListener('change', e => { realValidation = e.target.value; realPage = 0; renderAtlas(); });
$('#realQuality').addEventListener('change', e => { realQuality = e.target.value; realPage = 0; renderAtlas(); });
$('#realOffline').addEventListener('change', e => { realOfflineOnly = e.target.checked; realPage = 0; renderAtlas(); });
let lbCur = null;
function openLightbox(a) {
  lbCur = a;
  $('#lbTitle').textContent = a.t;
  const img = $('#lbImg'), miss = $('#lbMiss');
  miss.hidden = true; img.hidden = false;
  img.onerror = () => {
    img.hidden = true; miss.hidden = false;
    miss.textContent = window.ISO_NOATLAS
      ? 'Questa è l\u2019anteprima: i tracciati dell\u2019atlante ci sono solo nell\u2019app installata. Qui restano il titolo e la didascalia della slide.'
      : 'Immagine non trovata. Controlla di aver caricato su GitHub anche la cartella atlante, accanto agli altri file.';
  };
  img.onload = null; img.alt = 'Tracciato ECG da interpretare';
  if (a.quizCrop) {
    img.hidden = true;
    const source = new Image(), question = a.id;
    source.onload = () => {
      if (!Q.cur || !Q.cur.atl || Q.cur.atl.id !== question) return;
      const c = document.createElement('canvas'), crop = a.quizCrop; c.width = crop[2]; c.height = crop[3];
      c.getContext('2d').drawImage(source, ...crop, 0, 0, crop[2], crop[3]);
      img.src = c.toDataURL('image/png'); img.hidden = false;
    }; source.onerror = () => { img.hidden = false; img.removeAttribute('src'); img.alt = 'Immagine non disponibile offline.'; };
    source.src = 'atlante/' + a.id + '.jpg';
  } else { img.hidden = false; img.src = 'atlante/' + a.id + '.jpg'; }
  img.alt = a.t;
  $('#lbNote').textContent = a.n || '';
  $('#lbNote').hidden = !a.n;
  $('#lbSrc').textContent = 'Slide del corso — ' + a.f;
  $('#lbOpen').hidden = !a.q;
  $('#lbAnim').hidden = !DIG[a.id];
  $('#lwrap').classList.remove('zoom');
  $('#lwrap').scrollTop = 0; $('#lwrap').scrollLeft = 0;
  $('#lbox').hidden = false;
}
function closeLightbox() { $('#lbox').hidden = true; const i = $('#lbImg'); i.onerror = null; i.removeAttribute('src'); }
$('#lbClose').addEventListener('click', closeLightbox);
$('#lbZoom').addEventListener('click', () => {
  const w = $('#lwrap'); const z = w.classList.toggle('zoom');
  $('#lbZoom').textContent = z ? 'Riduci' : 'Ingrandisci';
});
$('#lbOpen').addEventListener('click', () => { if (!lbCur || !lbCur.q) return; closeLightbox(); showView('trace'); loadScenario(lbCur.q, false); });
$('#lbAnim').addEventListener('click', () => { if (!lbCur || !DIG[lbCur.id]) return; closeLightbox(); showView('trace'); apriDigitalizzato(lbCur.id); });
$('#lbImg').addEventListener('click', () => $('#lbZoom').click());
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('#lbox').hidden) closeLightbox(); });
let aTimer = null;
$('#aSearch').addEventListener('input', e => {
  clearTimeout(aTimer); const v = e.target.value;
  aTimer = setTimeout(() => { atlasQ = v; realPage = 0; renderAtlas(); }, 180);
});


/* =====================================================================
   CONFRONTA: due quadri affiancati
   ===================================================================== */
const CMP = {
  A: { sel: 'stemi-inferiore', p: {}, mon: null, st: null },
  B: { sel: 'normale', p: {}, mon: null, st: null },
  ready: false
};
function cmpCardHTML(sc) {
  const c = sc.card || {};
  const ul = a => '<ul>' + (a || []).map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>';
  let s = '<p>' + esc(c.def || '') + '</p>';
  if (c.criteri) s += '<h4>Criteri</h4>' + ul(c.criteri);
  if (c.guarda) s += '<h4>Dove guardare</h4><p>' + esc(c.guarda) + '</p>';
  if (c.soffio) s += '<h4>All\u2019auscultazione</h4><p>' + esc(c.soffio) + '</p>';
  if (c.meccanismo) s += '<h4>Meccanismo</h4><p>' + esc(c.meccanismo) + '</p>';
  if (c.terapia) s += '<h4>Gravit\u00e0 e trattamento</h4><p>' + esc(c.terapia) + '</p>';
  if (c.dd) s += '<h4>Diagnosi differenziale</h4>' + ul(c.dd);
  if (c.trappole) s += '<h4>Trappole</h4><p>' + esc(c.trappole) + '</p>';
  if (c.corso) s += '<h4>Criteri del corso</h4>' + ul(c.corso);
  if (c.fonte) s += '<p class="src"><b>Criteri:</b> ' + esc(c.fonte) + '</p>';
  return s;
}
function cmpParams(side) {
  const S2 = CMP[side], sc = byId[S2.sel], box = $('#cmpPar' + side);
  box.innerHTML = '';
  const sec = document.createElement('div'); sec.className = 'sec';
  sec.innerHTML = '<h3>Parametri</h3>';
  (sc.params || []).forEach(q => {
    const d = document.createElement('div'); d.className = 'ctrl';
    const v = S2.p[q.k];
    if (q.type === 'select') {
      d.innerHTML = '<div class="lab"><span>' + esc(q.label) + '</span></div><select>' +
        q.opts.map(o => '<option value="' + o[0] + '"' + (String(v) === String(o[0]) ? ' selected' : '') + '>' + esc(o[1]) + '</option>').join('') + '</select>';
      d.querySelector('select').addEventListener('change', e => { S2.p[q.k] = e.target.value; cmpBuild(side, true); });
    } else {
      d.innerHTML = '<div class="lab"><span>' + esc(q.label) + '</span><output class="num">' + fmt(+v, q.step < 1 ? 1 : 0) + ' ' + (q.unit || '') + '</output></div>' +
        '<input type="range" min="' + q.min + '" max="' + q.max + '" step="' + q.step + '" value="' + v + '">';
      const inp = d.querySelector('input'), out = d.querySelector('output');
      inp.addEventListener('input', () => { out.textContent = fmt(+inp.value, q.step < 1 ? 1 : 0) + ' ' + (q.unit || ''); S2.p[q.k] = +inp.value; cmpBuild(side, true); });
    }
    const control = d.querySelector('input, select'); if (control) control.setAttribute('aria-label', q.label + (q.unit ? ' (' + q.unit + ')' : ''));
    sec.appendChild(d);
  });
  const r = document.createElement('button'); r.className = 'btn'; r.textContent = 'Valori tipici';
  r.addEventListener('click', () => { S2.p = defaultParams(byId[S2.sel]); cmpParams(side); cmpBuild(side, true); });
  sec.appendChild(r); box.appendChild(sec);
}
function cmpBuild(side, keep) {
  const S2 = CMP[side], sc = byId[S2.sel];
  const cfg = sc.build(S2.p); cfg.noise = S.noise; cfg.t0 = keep ? S2.mon.t : 0;
  S2.st = new Stream(cfg, ++seed);
  S2.mon.setStream(S2.st, keep);
  S2.mon.setHighlight(sc.look || []);
}
function cmpLoad(side, id, snapshot) {
  const S2 = CMP[side]; S2.sel = id; S2.p = snapshot ? cloneCase(snapshot.p) : paramsFor(byId[id]);
  store['cmp' + side] = id; save();
  $('#cmpSel' + side).value = id;
  $('#cmpCard' + side).innerHTML = cmpCardHTML(byId[id]);
  cmpParams(side);
  if (snapshot) { S2.st = snapshot.st; S2.mon.setStream(S2.st, false); S2.mon.t = snapshot.t; S2.mon.pageStart = snapshot.pageStart; S2.mon.setHighlight(byId[id].look || []); S2.mon.layout(); }
  else cmpBuild(side, false);
}
function cmpInit() {
  if (CMP.ready) return; CMP.ready = true;
  $('#cmpPlay').addEventListener('click', () => setPlaying(!S.playing));
  ['A', 'B'].forEach(side => {
    const sel = $('#cmpSel' + side);
    CATS.forEach(cat => {
      const g = document.createElement('optgroup'); g.label = cat;
      scenariosByCategory(cat).forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; g.appendChild(o); });
      sel.appendChild(g);
    });
    CMP[side].mon = new Monitor($('#cmpEcg' + side), $('#cmpOv' + side), {});
    CMP[side].mon.mode = 'print'; CMP[side].mon.speed = 25; CMP[side].mon.gain = 10;
    sel.addEventListener('change', e => cmpLoad(side, e.target.value));
    if (window.ResizeObserver) new ResizeObserver(() => { if (S.view === 'cmp') CMP[side].mon.layout(); }).observe($('#cmpWrap' + side));
  });
  $('#cmpSwap').addEventListener('click', () => {
    const snapshot = s => ({ sel: s.sel, p: cloneCase(s.p), st: s.st, t: s.mon.t, pageStart: s.mon.pageStart });
    const a = snapshot(CMP.A), b = snapshot(CMP.B); cmpLoad('A', b.sel, b); cmpLoad('B', a.sel, a);
  });
  cmpLoad('A', byId[store.cmpA] ? store.cmpA : 'stemi-inferiore');
  cmpLoad('B', byId[store.cmpB] ? store.cmpB : 'normale');
}
function cmpShow() {
  cmpInit();
  setPlaying(S.playing);
  ['A', 'B'].forEach(s => { const m = CMP[s].mon; if (!m.t) m.t = m.pageMs() - 40; m.layout(); m.draw(); });
}

/* =====================================================================
   NAVIGAZIONE, TEMA, LOOP
   ===================================================================== */
function showView(v) {
  if (recordAbort) { recordAbort.abort(); recordAbort = null; recordRequest++; $('#realStatus').textContent = ''; }
  if (zenOn && v !== 'trace') zenStage(false);
  if (v !== 'trace') document.body.classList.remove('zen-card');
  S.view = v; $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.view').forEach(el => el.classList.toggle('on', el.id === 'v-' + v));
  if (v === 'trace') { requestAnimationFrame(() => { mon.layout(); scene.resize(); }); }
  if (v === 'theory') renderTheory();
  if (v === 'atlas') {
    renderAtlas(); caricaIndiceReale().then(renderAtlas);
    if (PTB) PTB.offlineIds().then(ids => { realOffline = ids; if (S.view === 'atlas') renderAtlas(); }).catch(() => {});
  }
  if (v === 'cmp') cmpShow();
  if (v === 'cor' && window.ISO_CORONARIE) window.ISO_CORONARIE.init();
  if (v === 'anat') {
    const f = $('#anatFrame');
    if (!f.getAttribute('src')) {
      const inl = document.getElementById('anatSrc');
      if (inl) f.setAttribute('src', URL.createObjectURL(new Blob([inl.textContent.replace(/<\\\/script/g, '</script')], { type: 'text/html' })));
      else f.setAttribute('src', 'anatomia.html');
    }
  }
  if(window.IsoAnatomyHost)IsoAnatomyHost.show(v);
  if (v === 'quiz') { renderQFilter(); requestAnimationFrame(() => { qmon.layout(); if (!Q.cur) newQuestion(); }); }
}
$$('#nav button').forEach(b => b.addEventListener('click', () => showView(b.dataset.v)));
$('#themeBtn').addEventListener('click', () => {
  const r = document.documentElement; const dark = getComputedStyle(r).getPropertyValue('color-scheme').trim() === 'dark';
  r.setAttribute('data-theme', dark ? 'light' : 'dark'); store.theme = dark ? 'light' : 'dark'; save(); onTheme();
});
function onTheme() { readVars(); if(scene.scene.background)scene.scene.background.set(css.stage); if (S.view === 'trace') mon.layout(); if (S.view === 'quiz') qmon.layout(); if (S.view === 'theory') renderTheory(); if (CMP.ready) ['A', 'B'].forEach(s => CMP[s].mon.layout()); }
if (window.matchMedia) { const mq = window.matchMedia('(prefers-color-scheme: dark)'); if (mq.addEventListener) mq.addEventListener('change', onTheme); }

let lastW = 0;
function onResize() { if (S.view === 'trace') { const w = $('#ecgWrap').clientWidth; if (w !== lastW) { lastW = w; mon.layout(); } scene.resize(); } if (S.view === 'quiz') qmon.layout(); }
if (window.ResizeObserver) { new ResizeObserver(onResize).observe($('#ecgWrap')); new ResizeObserver(() => scene.resize()).observe($('#stage')); new ResizeObserver(() => { if (S.view === 'quiz') qmon.layout(); }).observe($('#qEcgWrap')); }
window.addEventListener('resize', onResize);

let last = performance.now(), mT = 0, phT = 0;
function loop(now) {
  const dt = Math.min(80, now - last); last = now;
  if (S.view === 'trace' && stream) {
    if (S.playing) mon.t += dt * S.slow;
    defTick();
    if (ST.on) stDraw();
    mon.draw();
    scene.update(mon.t, stream);
    if (mon.marks) mon.drawOverlay();
    if (zenOn) zAggiorna(now);
    if (now - mT > 500) { mT = now; $('#measures').innerHTML = measure(stream, mon.t); recordTime(); if ($('#p-volt').classList.contains('on')) renderVolt(); }
    if (now - phT > 120) { phT = now; $('#phase3d').textContent = scene.phase; }
  } else if (S.view === 'quiz' && Q.stream && Q.mode !== 'atlas') {
    if (Q.playing) qmon.t += dt;
    qmon.draw();
  } else if (S.view === 'cmp' && CMP.ready) {
    ['A', 'B'].forEach(s => { const m = CMP[s].mon; if (!m.stream) return; if (S.playing) m.t += dt * S.slow; m.draw(); });
    if (now - mT > 500) { mT = now; ['A', 'B'].forEach(s => { const m = CMP[s].mon; if (m.stream) $('#cmpMeas' + s).innerHTML = measure(m.stream, m.t); }); }
  }
  requestAnimationFrame(loop);
}

window.ISO_OPEN = (id, params) => { if (!byId[id]) return; if (params) store.params[id] = Object.assign(defaultParams(byId[id]), params); showView('trace'); loadScenario(id, false); };
renderLib('');
setPlaying(S.playing);
const requestedCase=new URL(location.href).searchParams.get('scenario');
loadScenario(requestedCase&&byId[requestedCase]?requestedCase:S.sc, false);
showView('trace');
requestAnimationFrame(loop);
/* =====================================================================
   AGGIORNAMENTI DELL'APP INSTALLATA
   L'app aggiunta al Dock resta sospesa e non ricarica mai da sola: qui si
   controlla a ogni riapertura se sul sito c'è una versione più recente.
   ===================================================================== */
let swReg = null, ricaricando = false, ultimoCheck = 0;
function barraAggiornamento() {
  if (document.getElementById('updBar')) return;
  const d = document.createElement('div');
  d.id = 'updBar'; d.className = 'updbar';
  d.innerHTML = '<span>È pronta una versione aggiornata di Isoelettrica.</span>' +
    '<button class="btn primary" id="updGo">Aggiorna adesso</button>' +
    '<button class="btn" id="updNo">Più tardi</button>';
  document.body.appendChild(d);
  document.getElementById('updGo').addEventListener('click', () => {
    const w = swReg && swReg.waiting;
    if (w) { document.getElementById('updGo').disabled = true; w.postMessage({ type: 'skipWaiting' }); }
  });
  document.getElementById('updNo').addEventListener('click', () => d.remove());
}
function controllaAggiornamenti(forza) {
  const ora = Date.now();
  if (!forza && ora - ultimoCheck < 20000) return Promise.resolve('recent');
  ultimoCheck = ora;
  if (!swReg) return Promise.resolve('unavailable');
  return swReg.update().then(() => swReg.waiting ? 'ready' : swReg.installing ? 'installing' : 'checked').catch(() => 'offline');
}
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol) && !(location.hostname==='127.0.0.1' && new URLSearchParams(location.search).has('preview'))) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ricaricando) return; ricaricando = true; location.reload();
  });
  navigator.serviceWorker.addEventListener('message', e => {
    if (e.data && e.data.type === 'offline-progress' && e.data.id === offlineJob) {
      clearTimeout(offlineTimer);
      const d = e.data; $('#offlineStatus').textContent = d.done + '/' + d.total + ' immagini disponibili offline' + (d.failed ? ' · ' + d.failed + ' non salvate: verifica rete e spazio disponibile.' : d.complete ? '.' : '…');
      if (d.complete) { offlineBusy = false; $('#offlineSave').disabled = false; }
      else offlineTimer = setTimeout(() => { offlineJob++; offlineBusy = false; $('#offlineSave').disabled = false; $('#offlineStatus').textContent += ' Download interrotto: puoi riprovare.'; }, 12000);
    }
    if (e.data && e.data.type === 'version') {
      const el = $('#credit');
      if (el) el.textContent = 'App made by Eliseo Peirano · 2026 · v' + e.data.version;
    }
  });
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(r => {
      swReg = r;
      if (r.waiting && navigator.serviceWorker.controller) barraAggiornamento();
      r.addEventListener('updatefound', () => {
        const nw = r.installing; if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) barraAggiornamento();
        });
      });
      controllaAggiornamenti(true);
      if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'version' });
    }).catch(() => {});
  });
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') controllaAggiornamenti(); });
  window.addEventListener('focus', () => controllaAggiornamenti());
  /* tocca la firma in alto a destra per forzare il controllo e, se serve, ripulire tutto */
  const cr = $('#credit');
  if (cr) cr.addEventListener('click', async () => {
    cr.textContent = 'Controllo aggiornamenti…';
    const result = await controllaAggiornamenti(true);
    const messages = { ready: 'Aggiornamento disponibile', installing: 'Aggiornamento in download…', checked: 'Controllo completato', offline: 'Controllo non riuscito: verifica la rete', unavailable: 'Servizio aggiornamenti non disponibile' };
    cr.textContent = 'Isoelettrica · v45.0 · ' + (messages[result] || 'Controllo completato');
    if (result === 'ready') barraAggiornamento();
  });
  if (cr) cr.addEventListener('dblclick', () => {
    if (!navigator.onLine) { cr.textContent = 'Per ripristinare la cache è necessaria una connessione.'; return; }
    const worker = navigator.serviceWorker.controller; if (!worker) return;
    const channel = new MessageChannel();
    channel.port1.onmessage = e => { if (e.data.type === 'purged') { channel.port1.close(); ricaricando = true; location.reload(); } };
    worker.postMessage({ type: 'purge' }, [channel.port2]);
  });
}
})();
