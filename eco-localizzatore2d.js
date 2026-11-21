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
function crea(canvas, stato, muovi, iniziaAngoli, trascinaAngoli) {
  const cx = canvas.getContext('2d'); if (!cx) return null;
  const base = canvas.ownerDocument.createElement('canvas'), bg = base.getContext('2d');
  const raster=root.EchoRaster.create();let heart=null,bones=[];
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
    // Both layers use the same orthographic camera and depth buffer. Posterior
    // ribs cannot shine through the myocardium or obscure the anterior trunk.
    const T=root.THREE;
    function prepare(m, color) {
      const geo=new T.BufferGeometry();
      geo.setAttribute('position',new T.BufferAttribute(m.pos,3));geo.setIndex(new T.BufferAttribute(m.tri,1));
      const material=new T.MeshBasicMaterial({color,side:T.DoubleSide});material.color.convertSRGBToLinear();
      const obj=new T.Mesh(geo,material);obj.userData.sourceName=m.nome;
      return root.EchoRaster.prepare(obj);
    }
    if(!heart)heart=s.M.filter(m=>['mio','atrio','vaso','cor'].includes(m.tipo)).map(m=>prepare(m,root.ISO_ECO_ANATOMIA.colore(m.nome,m.layer)));
    if(s.ossa.length && bones.length!==s.ossa.length)bones=s.ossa.map(m=>prepare(m,'#e1d5b8'));
    const lateral=w/(2*scala),vertical=h/(2*scala),cy=tr.hc[1]-.1*h/scala;
    const camera=new T.OrthographicCamera(-lateral,lateral,vertical,-vertical,.1,80);
    camera.position.set(tr.x0,cy,30);camera.lookAt(tr.x0,cy,0);camera.updateMatrixWorld();
    let skeleton;
    if(s.ossa.length){raster.render(bones,w,h,camera,{});skeleton=raster.snapshot();}
    const img=raster.render(heart,w,h,camera,{});
    bg.drawImage(skeleton?raster.overlay(skeleton,.70):img,0,0);
    bg.fillStyle = '#d9e5ed'; bg.font = '600 13px system-ui'; bg.textAlign = 'center'; bg.fillText('D', w * .08, h * .44); bg.fillText('S', w * .92, h * .44);

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
    // Proiezione frontale del settore e del repere della posa corrente.
    const { o, d, u, prof } = s.P;
    const nelPiano = (asse, lato) => proietta(o.map((v, i) => v + d[i] * asse + u[i] * lato), s.G.Tr, w, h);
    cx.beginPath(); cx.moveTo(q[0], q[1]);
    for (let i = 0; i <= 24; i++) {
      const a = (i / 24 - 0.5) * Math.PI / 2;
      const p = nelPiano(prof * Math.cos(a), prof * Math.sin(a));
      cx.lineTo(p[0], p[1]);
    }
    cx.closePath(); cx.fillStyle = 'rgba(82,195,233,.15)'; cx.fill();
    cx.strokeStyle = '#70d2eb'; cx.lineWidth = 1.5 * dpr; cx.stroke();
    const retro = nelPiano(-4.2 * s.G.Tr.cm, 0), repere = nelPiano(0, 1.15 * s.G.Tr.cm);
    cx.lineCap = 'round'; cx.beginPath(); cx.moveTo(q[0], q[1]); cx.lineTo(retro[0], retro[1]);
    cx.strokeStyle = '#15232b'; cx.lineWidth = 16 * dpr; cx.stroke();
    cx.strokeStyle = '#e9f2f4'; cx.lineWidth = 11 * dpr; cx.stroke();
    cx.beginPath(); cx.moveTo(q[0], q[1]); cx.lineTo(repere[0], repere[1]); cx.strokeStyle = '#71dfff'; cx.lineWidth = 4 * dpr; cx.stroke();
    cx.beginPath(); cx.arc(q[0], q[1], 4 * dpr, 0, 2 * Math.PI); cx.fillStyle = '#fff'; cx.fill(); cx.lineCap = 'butt';
  }
  function coord(e) {
    const b = canvas.getBoundingClientRect();
    return [(e.clientX - b.left) * canvas.width / b.width, (e.clientY - b.top) * canvas.height / b.height];
  }
  canvas.addEventListener('pointerdown', e => {
    const s = stato(); if (!s.G || !s.P || presa || e.button !== 0) return;
    const pt = coord(e), q = proietta(s.P.o, s.G.Tr, canvas.width, canvas.height);
    const presaSonda = s.modo === 'auto' && Math.hypot(pt[0] - q[0], pt[1] - q[1]) < 42 * canvas.width / canvas.clientWidth;
    presa = { id: e.pointerId, modo: s.modo, dx: presaSonda ? q[0] - pt[0] : 0, dy: presaSonda ? q[1] - pt[1] : 0,
      angoli: iniziaAngoli(e.clientX, e.clientY) };
    ultimo = null; canvas.setPointerCapture(e.pointerId); canvas.classList.add('presa');
  });
  canvas.addEventListener('pointermove', e => {
    if (!presa || e.pointerId !== presa.id) return;
    if (presa.modo !== 'auto' && presa.modo !== 'presa') {
      trascinaAngoli(presa.modo, presa.angoli, e.clientX, e.clientY);
      return;
    }
    const s = stato(), pt = coord(e), w = canvas.width, h = canvas.height;
    const x = pt[0] + presa.dx, y = pt[1] + presa.dy, tr = s.G.Tr;
    const centro = proietta(tr.hc, tr, w, h), py = tr.hc[1] + (h * 0.40 - y) / centro[2];
    if (Math.abs(x - w / 2) > .98 * tr.a * centro[2] || py < tr.basso || py > tr.giugulo) return;
    const p = puntoCute(x, y, tr, w, h);
    if (!ultimo || Math.hypot(...p.map((v, i) => v - ultimo[i])) > .01 * tr.cm) { ultimo = p; muovi(p); }
  });
  const up = e => { if (presa && e.pointerId === presa.id) { presa = null; ultimo = null; canvas.classList.remove('presa'); } };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up); canvas.addEventListener('lostpointercapture', up);
  return { disegna };
}
const API = { proietta, puntoCute, crea };
if (typeof module !== 'undefined' && module.exports) module.exports = API; else root.ISO_ECO_2D = API;
})(typeof self !== 'undefined' ? self : this);
