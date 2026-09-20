/* Isoelettrica — interfaccia */
(function () {
'use strict';
const { LEADS, Stream, Sampled, dirAG } = window.ECG;
const ECG = window.ECG;
const DIG = window.ISO_ATLANTE_DIG || {};
/* Tracciati reali da PTB-XL (PhysioNet, CC BY 4.0), prodotti da ptbxl.py.
   Il file è facoltativo: se non c'è, l'app funziona esattamente come prima. */
(window.ISO_REALE || []).forEach((r, i) => { DIG['reale-' + i] = r; });
const { SCENARIOS, THEORY, CATS, ATLAS, ATLAS_G } = window.ISO_DATA;
const $ = s => document.querySelector(s);
const $$ = s => Array.from(document.querySelectorAll(s));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const FIRMA = '<p class="foot">Isoelettrica — App made by Eliseo Peirano · 2026</p>';
const DEG = Math.PI / 180;
const LIDX = {}; LEADS.forEach((L, i) => { LIDX[L.id] = i; });
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmt = (v, d) => (d ? v.toFixed(d) : Math.round(v).toString()).replace('.', ',');

/* ---------- memoria ---------- */
const KEY = 'isoelettrica.v1';
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { store = {}; }
store.params = store.params || {};
store.quiz = store.quiz || { ok: 0, tot: 0 };
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
  setStream(st, keep) { this.stream = st; if (!keep) { this.t = 0; this.pageStart = 0; this.drawn = 0; this.redrawAll(); } }
  layout() {
    const W = this.cv.parentElement.clientWidth; if (!W) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const panels = []; let pxmm, H;
    if (this.mode === 'print') {
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
      this.panels.forEach(p => { c.fillText(p.id, p.lx * d + (p.strip ? 1.5 : 1.2) * mm + (p.lx === this.groups[0].x0 ? 0 : 0), p.top * d + 1.2 * mm); if (p.tw0 > 0 && !p.strip) { c.save(); c.strokeStyle = css.grid2; c.lineWidth = 2 * d; c.beginPath(); c.moveTo(p.lx * d, p.base * d - 3 * mm); c.lineTo(p.lx * d, p.base * d + 3 * mm); c.stroke(); c.restore(); } });
    } else {
      this.panels.forEach(p => { cal(p.lx * d - 6.4 * mm, p.base * d); c.fillText(p.id, p.lx * d + 1.2 * mm, p.top * d + 0.8 * mm); });
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
    let t = this.drawn; const step = 3;
    while (t < this.t) {
      const tn = Math.min(this.t, t + step);
      if (tn - this.pageStart >= P) {
        ctx.stroke(); this.pageStart += P; this.last = this.panels.map(() => null); ctx.beginPath();
      }
      st.vec(tn, this.vec); st.leads(tn, this.vec, this.lv);
      const frac = (tn - this.pageStart) / P;
      for (let i = 0; i < this.panels.length; i++) {
        const p = this.panels[i];
        if (frac < p.tw0 || frac >= p.tw1) { this.last[i] = null; continue; }
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
    const r = this.renderer = new THREE.WebGLRenderer({ antialias: true });
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    el.insertBefore(r.domElement, el.firstChild);
    const sc = this.scene = new THREE.Scene(); sc.background = new THREE.Color(css.stage || '#121926');
    this.camera = new THREE.PerspectiveCamera(38, 1, 0.05, 100);
    sc.add(new THREE.AmbientLight(0xffffff, 0.6));
    const l1 = new THREE.DirectionalLight(0xffffff, 0.75); l1.position.set(2, 3, 4); sc.add(l1);
    const l2 = new THREE.DirectionalLight(0x9fb4ff, 0.3); l2.position.set(-3, -1, -3); sc.add(l2);
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
  cam(id) { const C = { iso: { theta: 0.62, phi: 1.16, r: 7 }, front: { theta: 0, phi: Math.PI / 2, r: 6.8 }, top: { theta: 0, phi: 0.02, r: 6.8 } }[id]; const dth = (((C.theta - this.orbit.theta) / DEG + 540) % 360 - 180) * DEG; this.anim = { from: { theta: this.orbit.theta, phi: this.orbit.phi, r: this.orbit.r }, to: { theta: this.orbit.theta + dth, phi: C.phi, r: C.r }, t: 0 }; }
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
    this.cuore = ISO_CUORE.build({ opacity: this._anatOp == null ? 0.6 : this._anatOp });
    this.anatMats = []; this.cuore.group.traverse(o => { if (o.isMesh) this.anatMats.push(o.material); });
    this.G.anat.add(this.cuore.group);
  }
  setHeartOpacity(v) {
    this._anatOp = v;
    (this.anatMats || []).forEach(m => { m.opacity = v; m.needsUpdate = true; });
    this.G.heart.traverse(o => { if (o.isMesh && o.material && o.material.transparent && o.material.userData.op0 !== false) { if (o.material.userData.base == null) o.material.userData.base = o.material.opacity; o.material.opacity = o.material.userData.base * (0.3 + 1.2 * v); } });
  }
  resize() { const w = this.el.clientWidth, h = this.el.clientHeight; if (!w || !h) return; this.renderer.setSize(w, h, false); this.camera.aspect = w / h; this.camera.fov = w < h ? 50 : 38; this.camera.updateProjectionMatrix(); }
  lightPath(name, u, fade) { (this.paths[name] || []).forEach(p => { if (u < 0) { p.og.setDrawRange(0, 0); if (p.part) p.part.visible = false; return; } const uu = Math.min(1, u); p.og.setDrawRange(0, Math.floor(uu * p.seg) * p.rad * 6); p.om.opacity = u <= 1 ? 1 : Math.max(0, 1 - fade); if (p.part) { p.part.visible = u <= 1; if (u <= 1) p.curve.getPointAt(uu, p.part.position); } }); }
  update(t, st) {
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
      if (A.meta.blocked && dA > 90 && dA < 320) { navRed = true; phase = A.meta.refractory ? 'P nel periodo refrattario: non condotta' : 'P non condotta: blocco nel nodo AV'; }
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
      if (m.type === 'pvc' || m.type === 'vt' || m.type === 'escape-v') {
        const fpos = FOCI[m.focus] || FOCI.lvInf; this.focus.visible = true; this.focus.position.copy(fpos);
        if (dV < W * 1.2) { this.wave.visible = true; const f = dV / (W * 1.2); this.wave.position.copy(fpos); this.wave.scale.setScalar(0.08 + f * 1.15); this.wave.material.opacity = 0.28 * (1 - f); }
      }
      if (dV < W) { ventGlow = Math.sin(Math.PI * dV / W); phase = m.type === 'pvc' ? 'Extrasistole ventricolare: il fronte parte dal focus' : m.type === 'vt' ? 'Tachicardia ventricolare: attivazione dal circuito di rientro' : m.type === 'escape-v' ? 'Scappamento ventricolare' : m.via === 'wpw' && dV < 45 ? 'Onda delta: pre-eccitazione dal fascio di Kent' : 'QRS: depolarizzazione ventricolare'; }
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
  sel: null, noise: store.noise == null ? 0.35 : store.noise, sesso: store.sesso === 'F' ? 'F' : 'M',
  ectTipo: store.ectTipo === 'pac' ? 'pac' : 'pvc', ectPat: store.ectPat || 'off', view: 'trace', tgl: Object.assign({ orb: true, heart: true, leads: true, anat: false }, store.tgl || {}), opac: store.opac == null ? 0.6 : store.opac
};
let stream = null, curCfg = null, seed = 1;
const mon = new Monitor($('#ecg'), $('#ecgOv'), { onSelect: id => { S.sel = S.sel === id ? null : id; mon.setSelected(S.sel); scene.selectLead(S.sel); $$('#p-card .chip').forEach(c => c.classList.toggle('on', c.dataset.l === S.sel)); } });
mon.mode = S.mode; mon.speed = S.speed; mon.gain = S.gain;
const scene = new Scene3D($('#stage'));
if (S.tgl.anat && S.tgl.heart) S.tgl.anat = false;
Object.keys(S.tgl).forEach(k => { scene.toggle(k, S.tgl[k]); const b = $('#hud3d [data-tg="' + k + '"]'); if (b) b.classList.toggle('on', S.tgl[k]); });

function paramsFor(sc) { const p = {}; sc.params.forEach(q => { p[q.k] = q.def; }); Object.assign(p, store.params[sc.id] || {}); return p; }
/* Schema di ripetizione delle extrasistoli applicato al quadro corrente.
   Funziona sui ritmi con base sinusale: negli altri (FA, flutter, TV, blocco
   completo, ritmi continui) il concetto di bigeminismo non ha senso. */
function ritmoSinusale(cfg) {
  return !cfg.mode && !cfg.atrial && !cfg.cont && cfg.av !== 'III' && cfg.av !== 'dissoc';
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
  const ok = curCfg ? ritmoSinusale(curCfg) : true;
  if (sel) { sel.disabled = !ok; sel.title = ok ? 'Fa comparire le extrasistoli in modo continuo secondo uno schema' : 'Lo schema di ripetizione vale solo sui ritmi a base sinusale'; }
}
function buildStream(sc, p, keepTime) {
  curCfg = sc.build(p); curCfg.noise = S.noise; curCfg.t0 = keepTime ? mon.t : 0;
  applicaEctopia(curCfg);
  stream = new Stream(curCfg, ++seed);
  mon.setStream(stream, keepTime);
  scene.setScenario(curCfg);
}

/* ==================== DEFIBRILLATORE ====================
   Due modi. Manuale: il pulsante c'è solo in quel quadro, lo premi tu e la
   scarica parte da dove sta scorrendo il tracciato. Automatico (dispositivo
   impiantabile): nessun pulsante, il dispositivo riconosce, conferma, carica e
   interviene da solo, con i tempi veri. Sui ritmi non defibrillabili premere non
   cambia niente: si vede solo l'artefatto, ed è la cosa da imparare. */
const DEF = { sc: null, coda: [], t0: 0, fatto: false };
const DEF_DOPO = {
  sinusale: () => ({ rate: 74, pr: 170, qtc: 425, qrs: ECG.M.qrsNormal() }),
  bradi: () => ({ rate: 44, pr: 200, qtc: 450, qrs: ECG.M.qrsNormal() }),
  asistolia: () => ({ mode: 'continuous' }),
  paced: () => ({ mode: 'vt', vRate: 60, aRate: 0.5, vtQrs: ECG.M.qrsPaced(), vtT: { a: 150, g: 30, amp: 0.4 }, qtc: 440 })
};
const DEF_SHOCK = { fv: 1, fvfine: 1, tvsp: 1, flutterv: 1, tdp: 1 };
function defStato(testo, vivo) {
  const el = $('#defStato'); if (!el) return;
  el.hidden = !testo; el.textContent = testo || ''; el.classList.toggle('vivo', !!vivo);
}
function defUI(sc) {
  const d = sc && sc.defib;
  $('#defSeg').hidden = !d;
  DEF.sc = d ? sc : null; DEF.coda = []; DEF.fatto = false; DEF.t0 = mon.t;
  defStato('');
  if (!d) return;
  const p = paramsFor(sc), sh = !!DEF_SHOCK[p.ritmo];
  if (d.tipo === 'manuale') {
    $('#defLab').textContent = p.j + ' J';
    $('#defBtn').hidden = false;
    $('#defBtn').disabled = false;
    $('#defBtn').textContent = 'Carica e scarica';
    defStato(sh ? 'Ritmo defibrillabile: premi quando vuoi.' : 'Ritmo non defibrillabile: la scarica non serve.', sh);
  } else {
    $('#defLab').textContent = 'Dispositivo impiantabile';
    $('#defBtn').hidden = true;
    defPrograma(sc, p, sh);
  }
}
/* Sequenza del dispositivo impiantabile, con i tempi che ha davvero */
function defPrograma(sc, p, sh) {
  const atp = p.terapia === 'atp' || (p.terapia === 'auto' && (p.ritmo === 'tvsp' || p.ritmo === 'flutterv'));
  const q = [];
  if (!sh) {
    q.push([1200, () => defStato(p.ritmo === 'asistolia'
      ? 'Nessuna attività da trattare: il dispositivo passa alla stimolazione di supporto.'
      : 'Ritmo non in zona di terapia: il dispositivo osserva e non interviene.')]);
    if (p.ritmo === 'asistolia') q.push([5200, () => { defStato('Stimolazione di supporto', true); defCambia(DEF_DOPO.paced(), 300); }]);
  } else if (atp && p.terapia !== 'shock') {
    q.push([2600, () => defStato('Aritmia in zona di tachicardia: conteggio degli intervalli…')]);
    q.push([5200, () => defStato('Stimolazione antitachicardica in corso', true)]);
    q.push([5600, () => defCambia({ mode: 'vt', vRate: 250, aRate: 0.5, vtQrs: ECG.M.qrsPaced(), vtT: { a: 150, g: 30, amp: 0.3 }, qtc: 330 }, 250)]);
    q.push([7900, () => { defStato('Aritmia interrotta, ritmo proprio ripreso', true); defCambia(DEF_DOPO.sinusale(), 250); }]);
  } else {
    q.push([2400, () => defStato('Aritmia rilevata: conferma sugli intervalli…')]);
    q.push([4600, () => defStato('Carica del condensatore in corso', true)]);
    q.push([10400, () => { defStato('Scarica erogata', true); defColpo(DEF_DOPO.sinusale(), 1500); }]);
    q.push([12600, () => defStato('Ritmo sinusale ripristinato')]);
  }
  DEF.coda = q.map(([dt, fn]) => ({ t: DEF.t0 + dt, fn: fn, fatta: false }));
}
function defCambia(cfg, ritardo) {
  if (!stream) return;
  cfg.noise = S.noise;
  stream.cambiaRitmo(cfg, mon.t + (ritardo || 250));
  scene.setScenario(cfg);
}
function defColpo(dopo, attesa) {
  if (!stream) return;
  if (dopo) dopo.noise = S.noise;
  stream.scarica(mon.t + 220, dopo, attesa);
  if (dopo) scene.setScenario(dopo);
}
function defTick() {
  if (!DEF.sc || !DEF.coda.length) return;
  DEF.coda.forEach(a => { if (!a.fatta && mon.t >= a.t) { a.fatta = true; a.fn(); } });
}
$('#defBtn').addEventListener('click', () => {
  const sc = DEF.sc; if (!sc || !stream) return;
  const p = paramsFor(sc), sh = !!DEF_SHOCK[p.ritmo];
  if (!S.playing) setPlaying(true);
  const b = $('#defBtn');
  b.disabled = true; b.textContent = 'Carica…';
  defStato('Condensatore in carica…');
  setTimeout(() => {
    const esito = sh && p.esito !== 'nulla' ? DEF_DOPO[p.esito]() : null;
    defColpo(esito, 1400);
    b.disabled = false; b.textContent = 'Carica e scarica';
    defStato(!sh
      ? 'Scarica erogata su un ritmo non defibrillabile: solo artefatto, il ritmo è identico. Riprendi le compressioni.'
      : esito ? 'Scarica erogata: guarda che cosa esce dopo l\u2019artefatto.' : 'Scarica erogata: l\u2019aritmia persiste, serve un nuovo ciclo.', true);
  }, 2600);
});

function loadScenario(id, keepTime) {
  const sc = byId[id]; if (!sc) return;
  digCur = null;
  S.sc = id; store.sc = id; save();
  $('#scTitle').textContent = sc.name; $('#scCat').textContent = sc.cat;
  $$('#libList .item').forEach(b => b.classList.toggle('on', b.dataset.id === id));
  buildStream(sc, paramsFor(sc), keepTime);
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
function renderLib(filter) {
  const f = (filter || '').trim().toLowerCase(); const box = $('#libList'); box.innerHTML = '';
  CATS.forEach(cat => {
    const items = SCENARIOS.filter(s => s.cat === cat && (!f || (LIBIDX.find(x => x.id === s.id) || { hay: '' }).hay.includes(f)));
    if (!items.length) return;
    const h = document.createElement('h4'); h.textContent = cat; box.appendChild(h);
    items.forEach(s => { const b = document.createElement('button'); b.className = 'item' + (s.id === S.sc ? ' on' : ''); b.dataset.id = s.id; b.innerHTML = esc(s.name) + (f && !s.name.toLowerCase().includes(f) && libHit(s.id, f) ? '<span class="hit">' + libHit(s.id, f) + '</span>' : ''); b.addEventListener('click', () => loadScenario(s.id, true)); box.appendChild(b); });
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
  digCur = id;
  const reale = !!rec.reale;
  stream = new Sampled(rec, 1);
  curCfg = stream.cfg;
  mon.setStream(stream, false);
  mon.setHighlight([]);
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
    fmt(rec.fs) + ' campioni al secondo, ' + fmt(rec.n / rec.fs, 1) + ' secondi che si ripetono in ciclo.</p></div>' +
    (reale
      ? '<div class="sec"><h3>Come leggerlo</h3><p>È un elettrocardiogramma vero, registrato in ospedale e refertato da uno o due cardiologi. ' +
        'I voltaggi sono quelli misurati dall\u2019apparecchio, quindi i criteri di ipertrofia e gli intervalli valgono davvero. ' +
        'Il rumore, la deriva della linea di base e gli artefatti fanno parte del tracciato: è questa la differenza con il simulatore.</p>' +
        (rec.scp && rec.scp.length ? '<p class="note">Codici del referto: ' + esc(rec.scp.join(', ')) + '</p>' : '') + '</div>'
      : '') +
    (reale ? '' : '<div class="sec"><h3>Come leggerlo</h3><p>I millivolt sono ricostruiti dalla geometria della carta: ' +
    'la larghezza di ogni pannello vale 2,5 secondi a 25 mm/s. Sono attendibili per la morfologia e per gli intervalli, ' +
    'meno per i voltaggi assoluti. Per i criteri di ipertrofia continua a fidarti del tracciato simulato.</p></div>') +
    (q ? '<div class="sec"><h3>Quadro corrispondente</h3><p>' + esc(q.name) + '</p>' +
         '<ul class="crit">' + q.card.criteri.map(x => '<li>' + esc(x) + '</li>').join('') + '</ul>' +
         '<button class="btn" id="digQuadro">Apri il quadro simulato</button></div>' : '') +
    '<div class="sec"><p class="src"><b>Origine:</b> ' + esc(rec.f) + '</p></div>' + FIRMA;
  const bq = $('#digQuadro');
  if (bq) bq.addEventListener('click', () => loadScenario(rec.q, false));
  $('#p-params').innerHTML = '<div class="sec"><h3>Parametri</h3><p class="note">Questo è un tracciato registrato su un paziente vero: non ha parametri da muovere. Scegli un quadro nella libreria per tornare al simulatore.</p></div>';
  renderVolt();
  aggiornaEctUI();
  closeLib();
  setPlaying(true);
}

let rebuildT = null;
function renderParams(sc) {
  const p = paramsFor(sc); const box = $('#p-params'); box.innerHTML = '';
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
    sec.appendChild(d);
  });
  const reset = document.createElement('button'); reset.className = 'btn'; reset.textContent = 'Ripristina i valori tipici';
  reset.addEventListener('click', () => { delete store.params[sc.id]; save(); renderParams(sc); buildStream(sc, paramsFor(sc), true); defUI(sc); });
  sec.appendChild(reset); box.appendChild(sec);
  const g = document.createElement('div'); g.className = 'sec';
  g.innerHTML = '<h3>Registrazione</h3><div class="ctrl"><div class="lab"><span>Rumore e deriva della linea di base</span><output class="num">' + Math.round(S.noise * 100) + '%</output></div><input type="range" min="0" max="1" step="0.05" value="' + S.noise + '"></div><p class="note">Un po\u2019 di rumore rende il tracciato più simile a un ECG reale.</p>';
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
  store.params[sc.id] = Object.assign({}, store.params[sc.id] || {}, { [k]: v }); save();
  clearTimeout(rebuildT); rebuildT = setTimeout(() => { buildStream(sc, paramsFor(sc), true); defUI(sc); }, 90);
}
function openLib() { $('#lib').classList.add('open'); $('#scrim').classList.add('open'); }
function closeLib() { $('#lib').classList.remove('open'); $('#scrim').classList.remove('open'); }
$('#libBtn').addEventListener('click', openLib); $('#scrim').addEventListener('click', closeLib);
$('#q').addEventListener('input', e => renderLib(e.target.value));

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
    const base = (1 + r * ST.rowMm + ST.rowMm * 0.5) * mm;
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
    for (let t = tA; t <= tB; t += 3) {
      if (t > fine) break;
      stream.vec(t, v); stream.leads(t, v, lv);
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
    $('#stMis').innerHTML = '<b>' + n + '</b> QRS in 6 s → <b>' + n * 10 + '/min</b>' +
      ' · ' + ST.secRiga + ' s per riga · ' + mon.speed + ' mm/s · ' + mon.gain + ' mm/mV';
  } else {
    $('#stMis').textContent = ST.secRiga + ' s per riga · ' + mon.speed + ' mm/s · ' + mon.gain + ' mm/mV';
  }
}
function stChips() {
  $('#stLeads').innerHTML = LEADS.map(L => '<button data-l="' + L.id + '"' + (L.id === ST.lead ? ' class="on"' : '') + '>' + L.id + '</button>').join('');
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
  $('#stTitolo').textContent = byId[S.sc] ? byId[S.sc].name : '—';
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
  const picco = Math.max.apply(null, zLv.map(Math.abs)) * 1.15;
  zScala = Math.max(0.6, picco, zScala * 0.992);
  const scala = zScala;
  LEADS.forEach((L, i) => {
    const b = document.getElementById('zb-' + L.id), u = document.getElementById('zv-' + L.id);
    if (!b) return;
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
  if (!stream || !stream.injectEctopic) return;
  if (!S.playing) setPlaying(true);            // ferma il tracciato non si vedrebbe
  const r = stream.injectEctopic(mon.t, kind);
  const b = $('#ectSeg button[data-e="' + kind + '"]');
  if (b && r) { b.classList.add('flash'); setTimeout(() => b.classList.remove('flash'), 260); }
}
$$('#ectSeg button').forEach(b => b.addEventListener('click', () => ectopia(b.dataset.e)));
$('#ectPat').addEventListener('change', e => {
  S.ectPat = e.target.value; store.ectPat = S.ectPat; save();
  buildStream(byId[S.sc], paramsFor(byId[S.sc]), true);
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
    return '<span>FC <b>' + fmt(60000/rr) + '/min</b></span><span>RR medio <b>' + fmt(rr) + ' ms</b></span>' +
      '<span>' + B.length + ' battiti nel segmento</span>' +
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
  const base = Vs.slice().reverse().find(e => e.meta.type === 'conducted' || e.meta.type === 'escape-j' || e.meta.type === 'escape-v' || e.meta.type === 'vt') || b;
  const prevBase = Vs.slice(0, Vs.indexOf(base)).reverse().find(e => e.meta.type === base.meta.type);
  const rrB = prevBase ? base.t - prevBase.t : rr;
  let pr = '—';
  if (base.meta.type === 'conducted' && st.cfg.atrial !== 'af' && st.cfg.atrial !== 'flutter' && st.cfg.mode !== 'svt') {
    const A = st.ev.filter(e => e.kind === 'A' && e.t < base.t && base.t - e.t < 450 && !e.meta.blocked && e.meta.type !== 'retro').slice(-1)[0];
    if (A) pr = fmt(base.t - A.t) + ' ms';
  } else if (st.cfg.mode === 'vt' || st.cfg.av === 'III') pr = 'dissociato';
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
  document.body.classList.toggle('zen', on);
  const b = $('#thFull');
  b.setAttribute('aria-pressed', on ? 'true' : 'false');
  b.lastChild.textContent = on ? 'Esci' : 'Schermo intero';
  const el = $('#v-theory');
  try {
    if (on && el.requestFullscreen) el.requestFullscreen().catch(() => {});
    else if (!on && document.fullscreenElement && document.exitFullscreen) document.exitFullscreen().catch(() => {});
  } catch (err) {}
}
$('#thFull').addEventListener('click', () => setZen(!document.body.classList.contains('zen')));
document.addEventListener('keydown', e => { if (e.key === 'Escape' && document.body.classList.contains('zen')) setZen(false); });
document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement && document.body.classList.contains('zen')) setZen(false); });

function widgetFC(el) {
  el.innerHTML = '<div class="wrow"><div class="ctrl"><div class="lab"><span>Distanza tra due R</span><output class="num"></output></div><input type="range" min="8" max="75" step="1" value="20"></div><div><div class="big num" id="fcOut"></div><div class="note" id="fcNote"></div></div></div><canvas height="120"></canvas>';
  const inp = el.querySelector('input'), out = el.querySelector('output'), cv = el.querySelector('canvas');
  const draw = () => {
    const mmRR = +inp.value; out.textContent = mmRR + ' quadratini (' + fmt(mmRR * 40) + ' ms)';
    el.querySelector('#fcOut').textContent = fmt(1500 / mmRR) + '/min';
    el.querySelector('#fcNote').textContent = '1500 ÷ ' + mmRR + ' quadratini, oppure 300 ÷ ' + fmt(mmRR / 5, 1) + ' quadrati grandi';
    const d = Math.min(window.devicePixelRatio || 1, 2), W = cv.clientWidth; cv.width = W * d; cv.height = 120 * d; const c = cv.getContext('2d'); readVars();
    const mm = W / 150 * d; c.fillStyle = css.paper; c.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i * mm <= cv.width; i++) { c.strokeStyle = i % 5 ? css.grid : css.grid2; c.lineWidth = d * 0.6; c.beginPath(); c.moveTo(i * mm + 0.5, 0); c.lineTo(i * mm + 0.5, cv.height); c.stroke(); }
    for (let j = 0; j * mm <= cv.height; j++) { c.strokeStyle = j % 5 ? css.grid : css.grid2; c.beginPath(); c.moveTo(0, j * mm + 0.5); c.lineTo(cv.width, j * mm + 0.5); c.stroke(); }
    c.strokeStyle = css.trace; c.lineWidth = 1.6 * d; c.beginPath(); const base = 80 * d; c.moveTo(0, base);
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
const Q = { cat: 'Tutte', cur: null, done: false, playing: true, stream: null, mode: (store.qmode === 'atlas' && ATLAS.length) ? 'atlas' : 'gen' };
/* immagini dell'atlante utilizzabili come domanda: quelle con un quadro collegato */
const QATL = ATLAS.filter(a => a.q && byId[a.q]);
$('#qPause').addEventListener('click', () => {
  Q.playing = !Q.playing;
  $('#qPause').textContent = Q.playing ? 'Pausa' : 'Riprendi';
  $('#qPause').classList.toggle('on', !Q.playing);
});
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function catDisponibili() {
  if (Q.mode !== 'atlas') return CATS;
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
  const same = shuffle(SCENARIOS.filter(x => x.id !== sc.id && x.cat === sc.cat));
  const other = shuffle(SCENARIOS.filter(x => x.id !== sc.id && x.cat !== sc.cat));
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
  let a = pool[Math.floor(Math.random() * pool.length)];
  if (Q.cur && Q.cur.atl && pool.length > 1 && a.id === Q.cur.atl.id) a = pool[(pool.indexOf(a) + 1) % pool.length];
  const sc = byId[a.q];
  $('#qEcgWrap').hidden = true; $('#qImg').hidden = false;
  const img = $('#qImgEl');
  img.onerror = () => { img.alt = 'Immagine non disponibile in questa copia dell\u2019app.'; };
  img.src = 'atlante/' + a.id + '.jpg';
  $('#qImg').classList.remove('zoom'); $('#qImg').scrollTop = 0; $('#qImg').scrollLeft = 0;
  $('#qMeasures').innerHTML = '<span>Tracciato reale dalle slide del corso — ' + esc(a.f) + '</span>';
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
const QZ = { 'iperk.k': [6.4, 8.6], 'ipok.k': [1.9, 2.9], 'qtlungo.qtc': [500, 620], 'bav1.pr': [240, 380], 'wpw.pr': [88, 112], 'normale.axis': [-20, 90], 'pericardite.st': [1.5, 3.5], 'normale.hr': [60, 95], 'aritmiasinusale.sa': [12, 28], 'esa.prob': [18, 40] };
function randomParams(sc) {
  const p = {};
  sc.params.forEach(q => {
    if (q.type === 'select') { let opts = q.opts; if (q.k === 'fase') opts = opts.slice(0, 3); p[q.k] = opts[Math.floor(Math.random() * opts.length)][0]; return; }
    let r = QZ[sc.id + '.' + q.k];
    if (!r && q.k === 'hr' && !['bradisinusale', 'tachisinusale'].includes(sc.id)) r = [Math.max(q.min, q.def * 0.85), Math.min(q.max, q.def * 1.15)];
    if (!r && sc.id.startsWith('stemi') && q.k === 'st') r = [2, 5];
    if (!r) r = [q.min + (q.max - q.min) * 0.1, q.max - (q.max - q.min) * 0.1];
    p[q.k] = Math.round((r[0] + Math.random() * (r[1] - r[0])) / q.step) * q.step;
  });
  return p;
}
function newQuestion() {
  if (Q.mode === 'atlas') return newQuestionAtlas();
  $('#qEcgWrap').hidden = false; $('#qImg').hidden = true;
  qmon.layout();
  const pool = SCENARIOS.filter(s => s.quiz && (Q.cat === 'Tutte' || s.cat === Q.cat));
  let sc = pool[Math.floor(Math.random() * pool.length)];
  if (Q.cur && pool.length > 1 && sc.id === Q.cur.sc.id) sc = pool[(pool.indexOf(sc) + 1) % pool.length];
  const p = randomParams(sc);
  const cfg = sc.build(p); cfg.noise = 0.35;
  // stessa patologia, paziente diverso: asse, voltaggi, P, T, frequenza e rumore
  const qSeed = Math.floor(Math.random() * 1e6);
  if (window.ECG.applyVariation) {
    const stretto = sc.cat === 'Ipertrofie' || sc.indici;   // qui i voltaggi sono la diagnosi
    window.ECG.applyVariation(cfg, qSeed, stretto ? { ampiezza: 0.05, asse: 6, onT: 0.12 } : null);
  }
  Q.stream = new Stream(cfg, qSeed);
  Q.seed = qSeed;
  qmon.setStream(Q.stream, false);
  qmon.t = qmon.pageMs() - 40; qmon.draw();
  const opts = opzioni(sc);
  Q.cur = { sc, p, opts }; Q.done = false;
  $('#qMeasures').innerHTML = '<span>Le misure compaiono dopo la risposta. Usa il tempo: guarda ritmo, P, PR, QRS, ST, T.</span>';
  const r = $('#qRight');
  r.innerHTML = '<p class="note">Osserva il tracciato e scegli la diagnosi.</p><div class="opts">' + opts.map(o => '<button data-id="' + o.id + '">' + esc(o.name) + '</button>').join('') + '</div><div id="qFeed"></div>';
  r.querySelectorAll('.opts button').forEach(b => b.addEventListener('click', () => answer(b)));
}
function answer(btn) {
  if (Q.done) return; Q.done = true;
  const ok = btn.dataset.id === Q.cur.sc.id;
  store.quiz.tot++; if (ok) store.quiz.ok++; save();
  $$('#qRight .opts button').forEach(b => { b.disabled = true; if (b.dataset.id === Q.cur.sc.id) b.classList.add('right'); else if (b === btn) b.classList.add('wrong'); });
  $('#qFeed').innerHTML = feedback(Q.cur.sc, ok) + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn primary" id="qNext">Prossimo ECG</button><button class="btn" id="qOpen">Apri nel Tracciato</button></div>';
  $('#qNext').addEventListener('click', newQuestion);
  $('#qOpen').addEventListener('click', () => { store.params[Q.cur.sc.id] = Q.cur.p; save(); showView('trace'); loadScenario(Q.cur.sc.id, true); });
  qmon.setHighlight(Q.cur.sc.look || []);
  $('#qMeasures').innerHTML = measure(Q.stream, qmon.t);
  renderQFilter();
}


/* =====================================================================
   ATLANTE: tracciati reali dalle lezioni
   ===================================================================== */
let atlasG = store.atlasG || (ATLAS_G[0] ? ATLAS_G[0].id : '');
let atlasQ = '';
/* ---------- atlante dei tracciati reali (PTB-XL, CC BY 4.0) ----------
   Sezione separata da quelle delle slide. L'indice è un file solo, leggero; il
   segnale di ogni tracciato si scarica quando lo apri, così la raccolta può
   contenerne migliaia senza appesantire l'avvio. Se la cartella non c'è,
   la sezione semplicemente non compare. */
let atlasFonte = store.atlasFonte || 'corso';
let REALE = null, realeG = store.realeG || '', realeCache = {};
function caricaIndiceReale() {
  if (REALE !== null) return Promise.resolve(REALE);
  return fetch('atlante-reale/indice.json').then(r => r.ok ? r.json() : null)
    .catch(() => null)
    .then(d => { REALE = d || { voci: [], gruppi: [], licenza: '' }; return REALE; });
}
function gruppiReali() {
  const g = [];
  (REALE.gruppi || []).forEach(x => { if (REALE.voci.some(v => v.g === x.id)) g.push(x); });
  return g;
}
function apriReale(v) {
  const fatto = rec => {
    rec = Object.assign({}, rec, { reale: true, t: v.t, f: v.f, q: v.q, scp: v.scp });
    apriDigitalizzato(v.i, rec);
  };
  if (realeCache[v.i]) return fatto(realeCache[v.i]);
  fetch('atlante-reale/' + v.i + '.json').then(r => r.json()).then(rec => {
    realeCache[v.i] = rec; fatto(rec);
  }).catch(() => alert('Non riesco a caricare questo tracciato. Se stai usando l\u2019app senza rete, aprilo una prima volta da collegato.'));
}
function atlasFiltered() {
  const q = atlasQ.trim().toLowerCase();
  if (q) return ATLAS.filter(a => (a.t + ' ' + a.n + ' ' + a.f).toLowerCase().indexOf(q) >= 0);
  return ATLAS.filter(a => a.g === atlasG);
}
function renderAtlas() {
  const toc = $('#atoc'); toc.innerHTML = '';
  if (REALE && REALE.voci.length) {
    const barra = document.createElement('div'); barra.className = 'afonti';
    [['corso', 'Slide del corso', ATLAS.length], ['reale', 'ECG reali', REALE.voci.length]].forEach(([id, nome, n]) => {
      const b = document.createElement('button');
      b.className = 'afonte' + (atlasFonte === id ? ' on' : '');
      b.textContent = nome + ' (' + n + ')';
      b.addEventListener('click', () => {
        atlasFonte = id; atlasQ = ''; const c = $('#aSearch'); if (c) c.value = '';
        store.atlasFonte = id; save(); renderAtlas(); const w = $('.agrid-wrap'); if (w) w.scrollTop = 0;
      });
      barra.appendChild(b);
    });
    toc.appendChild(barra);
  }
  if (atlasFonte === 'reale' && REALE) return renderAtlasReale(toc);
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
  const gr = gruppiReali();
  if (!realeG || !gr.some(g => g.id === realeG)) realeG = gr.length ? gr[0].id : '';
  gr.forEach(g => {
    const n = REALE.voci.filter(v => v.g === g.id).length;
    const b = document.createElement('button');
    b.textContent = g.nome + ' (' + n + ')';
    b.classList.toggle('on', !atlasQ && g.id === realeG);
    b.addEventListener('click', () => { realeG = g.id; atlasQ = ''; const c = $('#aSearch'); if (c) c.value = ''; store.realeG = g.id; save(); renderAtlas(); const w = $('.agrid-wrap'); if (w) w.scrollTop = 0; });
    toc.appendChild(b);
  });
  const grid = $('#agrid'); grid.innerHTML = '';
  const q = atlasQ.trim().toLowerCase();
  const list = q
    ? REALE.voci.filter(v => (v.t + ' ' + (v.scp || []).join(' ') + ' ' + v.gn).toLowerCase().indexOf(q) >= 0)
    : REALE.voci.filter(v => v.g === realeG);
  const head = document.createElement('p'); head.className = 'ahead';
  head.textContent = q ? list.length + ' tracciati trovati' : (gr.find(g => g.id === realeG) || {}).nome || '';
  grid.appendChild(head);
  if (!list.length) { grid.insertAdjacentHTML('beforeend', '<p class="ahead">Nessun tracciato trovato</p>'); return; }
  list.forEach(v => {
    const b = document.createElement('button');
    b.className = 'acard areale';
    b.innerHTML = '<div class="at">' + esc(v.t) + '</div>' +
      '<div class="ascp">' + (v.scp || []).slice(0, 5).map(c => '<span>' + esc(c) + '</span>').join('') + '</div>' +
      '<div class="as">▶ ' + fmt(v.n / v.fs, 0) + ' s · ' + esc(v.f) + '</div>';
    b.addEventListener('click', () => apriReale(v));
    grid.appendChild(b);
  });
  const nota = document.createElement('p'); nota.className = 'ahead arealenota';
  nota.textContent = REALE.licenza || '';
  grid.appendChild(nota);
}
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
  img.src = 'atlante/' + a.id + '.jpg';
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
  aTimer = setTimeout(() => { atlasQ = v; renderAtlas(); }, 180);
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
    sec.appendChild(d);
  });
  const r = document.createElement('button'); r.className = 'btn'; r.textContent = 'Valori tipici';
  r.addEventListener('click', () => { S2.p = paramsFor(byId[S2.sel]); cmpParams(side); cmpBuild(side, true); });
  sec.appendChild(r); box.appendChild(sec);
}
function cmpBuild(side, keep) {
  const S2 = CMP[side], sc = byId[S2.sel];
  const cfg = sc.build(S2.p); cfg.noise = S.noise; cfg.t0 = keep ? S2.mon.t : 0;
  S2.st = new Stream(cfg, ++seed);
  S2.mon.setStream(S2.st, keep);
  S2.mon.setHighlight(sc.look || []);
}
function cmpLoad(side, id) {
  const S2 = CMP[side]; S2.sel = id; S2.p = paramsFor(byId[id]);
  store['cmp' + side] = id; save();
  $('#cmpSel' + side).value = id;
  $('#cmpCard' + side).innerHTML = cmpCardHTML(byId[id]);
  cmpParams(side); cmpBuild(side, false);
}
function cmpInit() {
  if (CMP.ready) return; CMP.ready = true;
  ['A', 'B'].forEach(side => {
    const sel = $('#cmpSel' + side);
    CATS.forEach(cat => {
      const g = document.createElement('optgroup'); g.label = cat;
      SCENARIOS.filter(s => s.cat === cat).forEach(s => { const o = document.createElement('option'); o.value = s.id; o.textContent = s.name; g.appendChild(o); });
      sel.appendChild(g);
    });
    CMP[side].mon = new Monitor($('#cmpEcg' + side), $('#cmpOv' + side), {});
    CMP[side].mon.mode = 'print'; CMP[side].mon.speed = 25; CMP[side].mon.gain = 10;
    sel.addEventListener('change', e => cmpLoad(side, e.target.value));
    if (window.ResizeObserver) new ResizeObserver(() => { if (S.view === 'cmp') CMP[side].mon.layout(); }).observe($('#cmpWrap' + side));
  });
  $('#cmpSwap').addEventListener('click', () => { const a = CMP.A.sel, b = CMP.B.sel; cmpLoad('A', b); cmpLoad('B', a); });
  cmpLoad('A', byId[store.cmpA] ? store.cmpA : 'stemi-inferiore');
  cmpLoad('B', byId[store.cmpB] ? store.cmpB : 'normale');
}
function cmpShow() {
  cmpInit();
  ['A', 'B'].forEach(s => { CMP[s].mon.layout(); CMP[s].mon.t = CMP[s].mon.pageMs() - 40; CMP[s].mon.draw(); });
}

/* =====================================================================
   NAVIGAZIONE, TEMA, LOOP
   ===================================================================== */
function showView(v) {
  if (zenOn && v !== 'trace') zenStage(false);
  if (v !== 'trace') document.body.classList.remove('zen-card');
  S.view = v; $$('#nav button').forEach(b => b.classList.toggle('on', b.dataset.v === v));
  $$('.view').forEach(el => el.classList.toggle('on', el.id === 'v-' + v));
  if (v === 'trace') { requestAnimationFrame(() => { mon.layout(); scene.resize(); }); }
  if (v === 'theory') renderTheory();
  if (v === 'atlas') caricaIndiceReale().then(renderAtlas);
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
  if (v === 'quiz') { renderQFilter(); requestAnimationFrame(() => { qmon.layout(); if (!Q.cur) newQuestion(); }); }
}
$$('#nav button').forEach(b => b.addEventListener('click', () => showView(b.dataset.v)));
$('#themeBtn').addEventListener('click', () => {
  const r = document.documentElement; const dark = getComputedStyle(r).getPropertyValue('color-scheme').trim() === 'dark';
  r.setAttribute('data-theme', dark ? 'light' : 'dark'); store.theme = dark ? 'light' : 'dark'; save(); onTheme();
});
function onTheme() { readVars(); scene.scene.background.set(css.stage); if (S.view === 'trace') mon.layout(); if (S.view === 'quiz') qmon.layout(); if (S.view === 'theory') renderTheory(); }
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
    if (now - mT > 500) { mT = now; $('#measures').innerHTML = measure(stream, mon.t); if ($('#p-volt').classList.contains('on')) renderVolt(); }
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

window.ISO_OPEN = id => { showView('trace'); loadScenario(id, false); };
renderLib('');
setPlaying(S.playing);
loadScenario(S.sc, false);
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
    const w = swReg && (swReg.waiting || swReg.installing);
    if (w) w.postMessage({ type: 'skipWaiting' });
    setTimeout(() => { if (!ricaricando) { ricaricando = true; location.reload(); } }, 600);
  });
  document.getElementById('updNo').addEventListener('click', () => d.remove());
}
function controllaAggiornamenti(forza) {
  const ora = Date.now();
  if (!forza && ora - ultimoCheck < 20000) return;
  ultimoCheck = ora;
  if (swReg) swReg.update().catch(() => {});
}
if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (ricaricando) return; ricaricando = true; location.reload();
  });
  navigator.serviceWorker.addEventListener('message', e => {
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
  if (cr) cr.addEventListener('click', () => {
    controllaAggiornamenti(true);
    if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'version' });
    const t = cr.textContent; cr.textContent = 'Controllo aggiornamenti…';
    setTimeout(() => { if (!document.getElementById('updBar')) cr.textContent = t + ' · aggiornata'; }, 1600);
  });
  if (cr) cr.addEventListener('dblclick', () => {
    if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage({ type: 'purge' });
    setTimeout(() => { ricaricando = true; location.reload(); }, 400);
  });
}
})();
