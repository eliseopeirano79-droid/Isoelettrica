/* Localizzatore di riserva: proiezione frontale delle stesse mesh, senza WebGL.
   La cute resta il cilindro ellittico didattico della v47.1, non una mesh cutanea. */
(function (root) {
'use strict';
function proietta(p, tr, w, h) {
  const s = Math.min(w / (2.8 * tr.a), h / (45 * tr.cm));
  return [w / 2 + (p[0] - tr.x0) * s, h * 0.40 - (p[1] - tr.hc[1]) * s, s];
}
function puntoCute(x, y, tr, w, h) {
  const q = proietta(tr.hc, tr, w, h), px = Math.max(-0.98, Math.min(0.98, (x - w / 2) / q[2] / tr.a));
  const py = Math.max(tr.basso, Math.min(tr.giugulo, tr.hc[1] + (h * 0.40 - y) / q[2]));
  return [tr.x0 + tr.a * px, py, tr.zc + tr.b * Math.sqrt(1 - px * px)];
}
function crea(canvas, stato, muovi) {
  const cx = canvas.getContext('2d'); if (!cx) return null;
  const base = canvas.ownerDocument.createElement('canvas'), bg = base.getContext('2d');
  let firma = '', scala = 1, presa = null, ultimo = null;
  function sfondo(s, w, h) {
    base.width = w; base.height = h; const tr = s.G.Tr, p = proietta(tr.hc, tr, w, h); scala = p[2];
    const top = proietta([tr.x0, tr.giugulo, tr.fronte], tr, w, h)[1], bottom = proietta([tr.x0, tr.basso, tr.fronte], tr, w, h)[1];
    bg.fillStyle = '#101822'; bg.fillRect(0, 0, w, h);
    const skin = bg.createLinearGradient(w * .2, 0, w * .8, 0); skin.addColorStop(0, '#59443e'); skin.addColorStop(.5, '#8b6c5a'); skin.addColorStop(1, '#59443e');
    const a = tr.a * scala, u = tr.cm * scala, mid = w / 2;
    bg.fillStyle = skin; bg.beginPath(); bg.moveTo(mid - .2 * a, top - 2 * u);
    bg.lineTo(mid - .2 * a, top); bg.bezierCurveTo(mid - .45 * a, top + u, mid - a, top, mid - 1.08 * a, top + 4 * u);
    bg.bezierCurveTo(mid - 1.1 * a, top + 10 * u, mid - .72 * a, bottom - 5 * u, mid - .78 * a, bottom);
    bg.quadraticCurveTo(mid, bottom + u, mid + .78 * a, bottom);
    bg.bezierCurveTo(mid + .72 * a, bottom - 5 * u, mid + 1.1 * a, top + 10 * u, mid + 1.08 * a, top + 4 * u);
    bg.bezierCurveTo(mid + a, top, mid + .45 * a, top + u, mid + .2 * a, top); bg.lineTo(mid + .2 * a, top - 2 * u); bg.closePath(); bg.fill();
    function mesh(m, color, alpha) {
      const a = m.pos, tri = m.tri; bg.fillStyle = color; bg.globalAlpha = alpha;
      for (let i = 0; i < tri.length; i += 3) {
        bg.beginPath();
        for (let j = 0; j < 3; j++) { const k = tri[i + j] * 3, q = proietta([a[k], a[k + 1], a[k + 2]], tr, w, h); if (j) bg.lineTo(q[0], q[1]); else bg.moveTo(q[0], q[1]); }
        bg.closePath(); bg.fill();
      }
      bg.globalAlpha = 1;
    }
    for (const m of s.M) if (m.tipo === 'mio' || m.tipo === 'atrio' || m.tipo === 'vaso') mesh(m, m.tipo === 'vaso' ? '#b76860' : '#a74746', .75);
    for (const m of s.ossa || []) mesh(m, '#e1d5b8', .35);
    bg.fillStyle = '#d9e5ed'; bg.font = '600 13px system-ui'; bg.textAlign = 'center'; bg.fillText('D', w * .08, h * .44); bg.fillText('S', w * .92, h * .44);
    bg.fillStyle = '#bac7d4'; bg.font = '13px system-ui'; bg.fillText('Vista frontale · destra e sinistra del paziente', w / 2, h - 58);
  }
  function disegna() {
    const s = stato(); if (!s.G || !s.P) return;
    const b = canvas.getBoundingClientRect(), dpr = Math.min(root.devicePixelRatio || 1, 1.5), w = Math.max(300, Math.round(b.width * dpr)), h = Math.max(320, Math.round(b.height * dpr));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; firma = ''; }
    const key = w + ':' + h + ':' + (s.ossa || []).length;
    if (key !== firma) { sfondo(s, w, h); firma = key; }
    cx.drawImage(base, 0, 0);
    const q = proietta(s.P.o, s.G.Tr, w, h), ghost = s.bersP && proietta(s.bersP.o, s.G.Tr, w, h);
    if (ghost && s.fantasma) { cx.strokeStyle = '#61d1ef'; cx.lineWidth = 2 * dpr; cx.setLineDash([4 * dpr, 4 * dpr]); cx.beginPath(); cx.arc(ghost[0], ghost[1], 24 * dpr, 0, 7); cx.stroke(); cx.setLineDash([]); }
    cx.strokeStyle = '#68caec'; cx.lineWidth = 2 * dpr; cx.beginPath(); cx.moveTo(q[0], q[1]); cx.lineTo(q[0] + 18 * dpr, q[1] + 38 * dpr); cx.moveTo(q[0], q[1]); cx.lineTo(q[0] - 18 * dpr, q[1] + 38 * dpr); cx.stroke();
    cx.fillStyle = '#eef3f6'; cx.strokeStyle = '#6dd3ff'; cx.lineWidth = 3 * dpr; cx.beginPath(); cx.roundRect(q[0] - 16 * dpr, q[1] - 48 * dpr, 32 * dpr, 50 * dpr, 10 * dpr); cx.fill(); cx.stroke();
    cx.fillStyle = '#111820'; cx.fillRect(q[0] - 17 * dpr, q[1] - 3 * dpr, 34 * dpr, 8 * dpr);
    cx.fillStyle = '#76def3'; cx.font = (12 * dpr) + 'px system-ui'; cx.textAlign = 'center'; cx.fillText('Trascina la sonda sulla cute', w / 2, h - 30 * dpr);
  }
  canvas.addEventListener('pointerdown', e => {
    if (!stato().G) return; presa = e.pointerId; ultimo = null; canvas.setPointerCapture(e.pointerId); canvas.classList.add('presa');
  });
  canvas.addEventListener('pointermove', e => {
    if (e.pointerId !== presa) return; const s = stato(), b = canvas.getBoundingClientRect();
    const p = puntoCute((e.clientX - b.left) * canvas.width / b.width, (e.clientY - b.top) * canvas.height / b.height, s.G.Tr, canvas.width, canvas.height);
    if (!ultimo || Math.hypot(...p.map((v, i) => v - ultimo[i])) > .01 * s.G.Tr.cm) { ultimo = p; muovi(p); }
  });
  const up = e => { if (e.pointerId === presa) { presa = null; ultimo = null; canvas.classList.remove('presa'); } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
  return { disegna };
}
const API = { proietta, puntoCute, crea };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_ECO_2D = API;
})(typeof self !== 'undefined' ? self : this);
