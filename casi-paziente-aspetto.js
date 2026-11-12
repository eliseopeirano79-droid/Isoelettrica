/* Isoelettrica — finiture del paziente, v46.2.
   Geometrie originali per tessuti, capelli e dettagli del viso, costruite sulla
   superficie MakeHuman CC0. Proporzioni e pieghe sono illustrative: niente
   simulazione biomeccanica o ricostruzione di una persona reale. */
(function (root) {
'use strict';
const T = root.THREE;
if (!T) return;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const gauss = (x, a, s) => Math.exp(-Math.pow((x - a) / s, 2));
const V = (x, y, z) => new T.Vector3(x, y, z);

function superficie(nu, nv, punto, colore) {
  const p = [], uv = [], ind = [], c = [];
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    const u = i / nu, v = j / nv, q = punto(u, v); p.push(q.x, q.y, q.z); uv.push(u, v);
    if (colore) c.push.apply(c, colore(u, v));
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + nu + 1; ind.push(a, b, a + 1, a + 1, b, b + 1);
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); if (colore) g.setAttribute('color', new T.Float32BufferAttribute(c, 3));
  g.setIndex(ind); g.computeVertexNormals(); return g;
}
function unisci(geometrie) {
  const p = [], n = [], uv = [], ix = []; let offset = 0;
  geometrie.forEach(g => {
    p.push.apply(p, g.attributes.position.array); n.push.apply(n, g.attributes.normal.array); uv.push.apply(uv, g.attributes.uv.array);
    for (const i of g.index.array) ix.push(i + offset); offset += g.attributes.position.count; g.dispose();
  });
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(p, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(n, 3));
  g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setIndex(ix); return g;
}

function raccordo(w, h, d, r) {
  r = Math.min(r, w / 2, h / 2, d / 2);
  const g = new T.BoxGeometry(w, h, d, 8, 4, 12), a = g.attributes.position;
  for (let i = 0; i < a.count; i++) {
    const p = V(a.getX(i), a.getY(i), a.getZ(i));
    const c = V(clamp(p.x, -w / 2 + r, w / 2 - r), clamp(p.y, -h / 2 + r, h / 2 - r), clamp(p.z, -d / 2 + r, d / 2 - r));
    p.sub(c).normalize().multiplyScalar(r).add(c); a.setXYZ(i, p.x, p.y, p.z);
  }
  g.computeVertexNormals(); return g;
}
function cucitura(punti, materiale, r) {
  return new T.Mesh(new T.TubeGeometry(new T.CatmullRomCurve3(punti), punti.length * 2, r || 0.0018, 5, false), materiale);
}

/* Un lenzuolo aperto, con un bordo che scende dal materasso. La superficie ha
   lo spessore visivo di un tessuto; non è un volume chiuso che inghiotte il busto. */
function biancheria(materiali) {
  const gruppo = new T.Group(); gruppo.name = 'Coperta drappeggiata';
  const supporto = new Float32Array(65 * 65), orli = []; let selezione = null;
  supporto.fill(-10);
  const pos = (u, v) => {
    const x = (u - 0.5) * 1.15, z = -0.045 + v * 1.21, ax = Math.abs(x);
    const bordo = clamp((ax - 0.465) / 0.11, 0, 1);
    const fondo = clamp((z - 1.035) / 0.13, 0, 1);
    const bacino = 0.185 * gauss(z, 0.025, 0.21) * gauss(x, 0, 0.26);
    const gambe = 0.115 * gauss(z, 0.48, 0.48) * (gauss(x, -.135, .115) + gauss(x, .135, .115));
    const piedi = 0.105 * gauss(z, .91, .18) * (gauss(x, -.12, .09) + gauss(x, .12, .09));
    const pieghe = (0.006 * Math.sin(x * 42 + z * 8) + 0.004 * Math.sin(x * 68 - z * 14)) * (0.5 + 0.5 * gauss(z, .2, .9));
    const diagonali = 0.012 * Math.sin(z * 22 + ax * 25) * gauss(ax, .31, .16);
    const y = .613 + (bacino + gambe + piedi) * (1 - bordo) * (1 - fondo) + pieghe + diagonali - .19 * Math.pow(bordo, .75) - .14 * Math.pow(fondo, .8);
    return V(x, Math.max(y, supporto[Math.round(v * 64) * 65 + Math.round(u * 64)] + .002 * Math.sin(x * 31 + z * 17)), z + .008 * Math.sin(x * 11) * (1 - v));
  };
  const coperta = new T.Mesh(superficie(64, 64, pos), materiali.coperta); coperta.name = 'Tessuto sulle gambe'; coperta.castShadow = coperta.receiveShadow = true; gruppo.add(coperta);
  const risvolto = new T.Mesh(superficie(64, 8, (u, v) => {
    const p = pos(u, .01 + v * .055); p.y += .004 + .004 * Math.sin(v * Math.PI); return p;
  }), materiali.risvolto); risvolto.name = 'Risvolto sottile'; risvolto.castShadow = risvolto.receiveShadow = true; gruppo.add(risvolto);
  for (const v of [.008, .065, .99]) {
    const pp = []; for (let i = 0; i <= 60; i++) { const p = pos(i / 60, v); p.y += .004; pp.push(p); }
    const s = cucitura(pp, materiali.cucitura, .0014); s.name = 'Orlo della coperta'; gruppo.add(s); orli.push({ mesh: s, v });
  }
  gruppo.userData.adatta = (mesh, H) => {
    if (!selezione) {
      const raw = H.varianti.M.pos, usati = new Set();
      H.gr.filter(g => g.m === 0 || g.m === 1).forEach(g => { for (let j = g.start; j < g.start + g.count; j++) usati.add(H.idx[j]); });
      selezione = Array.from(usati).filter(i => raw[i * 3 + 1] < 1.0 && Math.abs(raw[i * 3]) < 2.8);
    }
    supporto.fill(-10); const p = V(0, 0, 0);
    mesh.skeleton.update();
    for (const i of selezione) {
      p.fromBufferAttribute(mesh.geometry.attributes.position, i); mesh.boneTransform(i, p); p.applyMatrix4(mesh.matrixWorld);
      const col = Math.round((p.x / 1.15 + .5) * 64), row = Math.round((p.z + .045) / 1.21 * 64);
      for (let dz = -3; dz <= 3; dz++) for (let dx = -3; dx <= 3; dx++) {
        const u = col + dx, v = row + dz; if (u < 0 || u > 64 || v < 0 || v > 64) continue;
        const j = v * 65 + u; supporto[j] = Math.max(supporto[j], p.y + .023 - Math.hypot(dx, dz) * .005);
      }
    }
    for (const obj of [coperta, risvolto]) {
      const geo = obj.geometry, a = geo.attributes.position, uv = geo.attributes.uv;
      for (let i = 0; i < a.count; i++) {
        const u = uv.getX(i), v = uv.getY(i), q = pos(u, obj === risvolto ? .01 + v * .055 : v);
        if (obj === risvolto) q.y += .004 + .004 * Math.sin(v * Math.PI);
        a.setXYZ(i, q.x, q.y, q.z);
      }
      a.needsUpdate = true; geo.computeVertexNormals();
    }
    orli.forEach(o => {
      const punti = []; for (let i = 0; i <= 60; i++) { const p = pos(i / 60, o.v); p.y += .004; punti.push(p); }
      o.mesh.geometry.dispose(); o.mesh.geometry = new T.TubeGeometry(new T.CatmullRomCurve3(punti), 120, .0014, 5, false);
    });
  };
  return gruppo;
}
function guanciale(materiali) {
  const g = new T.Group(); g.name = 'Cuscino con federa';
  const punto = (u, v, su) => {
    const x = (u - .5) * .43, z = (v - .5) * .29;
    const bomb = Math.pow(Math.max(0, Math.sin(u * Math.PI) * Math.sin(v * Math.PI)), .54);
    const y = (su ? .014 + .039 * bomb : -.008 - .012 * bomb) + .0015 * Math.sin(u * 42) * Math.sin(v * Math.PI);
    return V(x, y, z);
  };
  [true, false].forEach(su => { const m = new T.Mesh(superficie(28, 24, (u, v) => punto(u, v, su)), materiali.federa); m.castShadow = m.receiveShadow = true; g.add(m); });
  const orlo = [];
  for (let i = 0; i <= 24; i++) orlo.push(punto(i / 24, 0, true));
  for (let i = 1; i <= 24; i++) orlo.push(punto(1, i / 24, true));
  for (let i = 1; i <= 24; i++) orlo.push(punto(1 - i / 24, 1, true));
  for (let i = 1; i <= 24; i++) orlo.push(punto(0, 1 - i / 24, true));
  g.add(cucitura(orlo, materiali.cucitura, .0013)); return g;
}

/* Le varianti del kit hanno gli stessi vertici. Queste variazioni esplicite
   rendono spalle, collo, volto e corporatura distinguibili, senza cambiare il
   binario MakeHuman. Lo stesso campo muove cute, giunti e ancore. */
function varianti(H) {
  if (H.finiture) return; H.finiture = true;
  for (const k of Object.keys(H.varianti)) {
    const v = H.varianti[k], donna = k[0] === 'F', anziano = k.length > 1;
    const trasforma = (x, y, z) => {
      const tronco = gauss(y, 3.5, 2.5), capo = clamp((y - 5.8) / 1.0, 0, 1);
      const larg = 1 + (donna ? -.025 : .075) * tronco + (anziano ? .04 : 0) * gauss(y, 1.8, 1.8);
      let xx = x * larg * (1 - capo * (donna ? .025 : -.025));
      if (!donna) xx *= 1 + .09 * gauss(y, 6.55, .48);
      let zz = z;
      if (!donna && z > .5 && y > 2.6 && y < 5) zz -= .34 * gauss(y, 3.9, .7) * gauss(Math.abs(x), .7, .48) * clamp((z - .5) * 2, 0, 1);
      if (anziano) zz += .075 * gauss(y, 1.5, 1.8) * clamp(z, 0, 1);
      return [xx, y, zz];
    };
    for (const key of ['pos', 'giunti']) {
      const a = v[key]; for (let i = 0; i < a.length; i += 3) a.set(trasforma(a[i], a[i + 1], a[i + 2]), i);
    }
    for (const key of Object.keys(v.ancore)) v.ancore[key] = trasforma.apply(null, v.ancore[key]);
  }
}
function veste(H, k, geo) {
  const p = geo.attributes.position, source = H.varianti[k].pos, shirt = new Set();
  const gr = H.gr.find(g => g.m === 1);
  for (let i = gr.start; i < gr.start + gr.count; i++) shirt.add(H.idx[i]);
  const colors = new Float32Array(p.count * 3);
  for (let i = 0; i < p.count; i++) {
    let x = source[i * 3], y = source[i * 3 + 1], z = source[i * 3 + 2];
    if (shirt.has(i)) {
      const torace = gauss(y, 3.6, 1.5), fronte = clamp((z - .1) * 2, 0, 1);
      x *= 1.035;
      if (fronte > 0 && y > .1 && y < 5.4 && Math.abs(x) < 1.65) {
        const piano = .99 + .1 * torace - .07 * x * x;
        z = Math.max(z + .05, piano) + .024 * Math.sin(x * 12 + y * 1.4) + .012 * Math.sin(y * 14 + x * 3);
      } else z += z > 0 ? .045 : -.035;
    }
    p.setXYZ(i, x, y, z);
    const fronte = clamp((z - .7) * 2, 0, 1);
    const labbro = gauss(y, 6.58, .115) * gauss(x, 0, .29) * fronte;
    const guancia = gauss(y, 6.99, .28) * gauss(Math.abs(x), .43, .2) * fronte;
    const barba = k[0] === 'M' ? .065 * gauss(y, 6.42, .31) * gauss(x, 0, .58) * fronte : 0;
    const occhi = gauss(y, 7.30, .21) * gauss(Math.abs(x), .31, .19) * fronte;
    const varia = .018 * Math.sin(x * 19 + y * 17) * Math.sin(z * 23 - y * 11);
    colors.set([1 - .16 * labbro - .08 * occhi - barba + varia, 1 - .39 * labbro - .06 * guancia - .10 * occhi - barba + varia, 1 - .28 * labbro - .045 * guancia - .11 * occhi - barba + varia], i * 3);
  }
  p.needsUpdate = true; geo.setAttribute('color', new T.BufferAttribute(colors, 3)); geo.computeVertexNormals();
}

/* Camice separato dalla cute. Il bordo del collo attraversa i triangoli con
   interpolazione dei pesi: non segue i gradini delle facce della mesh. */
function camice(H, k, corpo, materiale) {
  const source = H.varianti[k].pos, geo = corpo.geometry, gp = geo.attributes.position, gn = geo.attributes.normal;
  const si = geo.attributes.skinIndex, sw = geo.attributes.skinWeight;
  const gr = H.gr.find(g => g.m === 1), pp = [], nn = [], ii = [], ww = [];
  function vert(i) {
    const x = source[i * 3], y = source[i * 3 + 1], z = source[i * 3 + 2];
    const collo = z > .2 ? 5.44 + .65 * Math.min(Math.abs(x) / .70, 1) : 5.86;
    const pesi = {}; for (let c = 0; c < 4; c++) pesi[si.array[i * 4 + c]] = (pesi[si.array[i * 4 + c]] || 0) + sw.array[i * 4 + c];
    return { p: V(gp.getX(i), gp.getY(i), gp.getZ(i)).addScaledVector(V(gn.getX(i), gn.getY(i), gn.getZ(i)), .055), n: V(gn.getX(i), gn.getY(i), gn.getZ(i)), pesi, f: collo - y };
  }
  function inter(a, b) {
    const t = a.f / (a.f - b.f), pesi = {};
    for (const k of Object.keys(a.pesi)) pesi[k] = a.pesi[k] * (1 - t);
    for (const k of Object.keys(b.pesi)) pesi[k] = (pesi[k] || 0) + b.pesi[k] * t;
    return { p: a.p.clone().lerp(b.p, t), n: a.n.clone().lerp(b.n, t).normalize(), pesi, f: 0 };
  }
  function emetti(v) {
    pp.push(v.p.x, v.p.y, v.p.z); nn.push(v.n.x, v.n.y, v.n.z);
    const pesi = Object.entries(v.pesi).sort((a, b) => b[1] - a[1]).slice(0, 4), somma = pesi.reduce((s, p) => s + p[1], 0);
    for (let j = 0; j < 4; j++) { ii.push(pesi[j] ? +pesi[j][0] : 0); ww.push(pesi[j] ? pesi[j][1] / somma : 0); }
  }
  for (let j = gr.start; j < gr.start + gr.count; j += 3) {
    const tri = [vert(H.idx[j]), vert(H.idx[j + 1]), vert(H.idx[j + 2])], poly = [];
    for (let n = 0; n < 3; n++) {
      const a = tri[n], b = tri[(n + 1) % 3];
      if (a.f >= 0) poly.push(a); if ((a.f >= 0) !== (b.f >= 0)) poly.push(inter(a, b));
    }
    for (let n = 1; n < poly.length - 1; n++) { emetti(poly[0]); emetti(poly[n]); emetti(poly[n + 1]); }
  }
  const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pp, 3));
  g.setAttribute('skinIndex', new T.Uint16BufferAttribute(ii, 4)); g.setAttribute('skinWeight', new T.Float32BufferAttribute(ww, 4));
  g.setAttribute('normal', new T.Float32BufferAttribute(nn, 3)); materiale.skinning = true;
  const m = new T.SkinnedMesh(g, materiale); m.bind(corpo.skeleton, corpo.bindMatrix); m.frustumCulled = false;
  m.castShadow = m.receiveShadow = true; m.name = 'Camice in tessuto con scollo pulito'; return m;
}

function testa(H, k, materiali) {
  const v = H.varianti[k], donna = k[0] === 'F', anziano = k.length > 1;
  const gruppo = new T.Group(); gruppo.name = donna ? 'Capelli a caschetto e volto' : 'Capelli corti pettinati e volto';
  const hi = H.ossa.indexOf('head'); gruppo.position.set(-v.giunti[hi * 3], -v.giunti[hi * 3 + 1], -v.giunti[hi * 3 + 2]);
  const ind = [];
  H.gr.filter(g => g.m === 0 || g.m === 4).forEach(g => {
    for (let i = g.start; i < g.start + g.count; i += 3) {
      const a = H.idx[i], b = H.idx[i + 1], c = H.idx[i + 2];
      if (Math.min(v.pos[a * 3 + 1], v.pos[b * 3 + 1], v.pos[c * 3 + 1]) > 6.65) ind.push(a, b, c);
    }
  });
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.BufferAttribute(v.pos, 3)); geo.setIndex(ind);
  const supporto = new T.Mesh(geo, new T.MeshBasicMaterial({ side: T.DoubleSide })); supporto.updateMatrixWorld(true);
  const centro = V(0, 7.62, .45), ray = new T.Raycaster(), memoria = new Map();
  function punto(theta, phi) {
    const chiave = theta.toFixed(5) + ':' + phi.toFixed(5); if (memoria.has(chiave)) return memoria.get(chiave).clone();
    const d = V(Math.sin(theta) * Math.sin(phi), Math.cos(theta), Math.sin(theta) * Math.cos(phi));
    ray.set(centro.clone().addScaledVector(d, 4), d.clone().negate());
    const hit = ray.intersectObject(supporto, false)[0];
    const p = hit ? hit.point.clone() : centro.clone().add(V(d.x * .79, d.y * .9, d.z * 1.02));
    const volume = .055 + .09 * Math.pow(Math.max(0, Math.cos(theta)), 2) + (donna ? .045 : 0);
    p.addScaledVector(d, volume + .012 * Math.sin(phi * 22 + theta * 5));
    memoria.set(chiave, p.clone()); return p;
  }
  const limite = phi => 1.45 + .46 * Math.pow((1 - Math.cos(phi)) / 2, .6) + .07 * Math.sin(phi) * Math.max(0, Math.cos(phi));
  const tinta = (u, w) => {
    const st = .90 + .065 * Math.sin(u * Math.PI * 44 + w * 8) + .035 * Math.sin(u * Math.PI * 92 - w * 4);
    return [st, st * .97, st * .94];
  };
  const hairMat = materiali.capelli.clone(); hairMat.userData.privato = true; hairMat.vertexColors = true;
  hairMat.color.setHex(anziano ? 0x66645f : donna ? 0x3d281e : 0x30251f); hairMat.roughness = .88; hairMat.side = T.DoubleSide;
  const calotta = new T.Mesh(superficie(64, 24, (u, w) => punto(w * limite(u * Math.PI * 2), u * Math.PI * 2), tinta), hairMat);
  calotta.name = 'Capelli con attaccatura e volume'; calotta.castShadow = calotta.receiveShadow = true; gruppo.add(calotta);
  if (donna) {
    const bob = new T.Mesh(superficie(64, 20, (u, t) => {
      const phi = .94 + u * (Math.PI * 2 - 1.88), p = punto(1.40 + t * .34, phi);
      const curva = Math.sin(t * Math.PI * .9);
      p.x += Math.sin(phi) * (.07 * curva + .025 * Math.sin(phi * 23) * t);
      p.z += Math.cos(phi) * .055 * curva;
      p.y -= t * (.92 + .12 * Math.cos(phi)) + .035 * Math.sin(phi * 17) * t * t;
      return p;
    }, tinta), hairMat); bob.name = 'Ciocche laterali e nuca'; bob.castShadow = bob.receiveShadow = true; gruppo.add(bob);
  }
  const filoMat = hairMat.clone(); filoMat.userData.privato = true; filoMat.vertexColors = false; filoMat.color.multiplyScalar(1.15);
  const ciocche = [];
  for (let n = 0; n < 34; n++) {
    const phi = (n + .45) / 34 * Math.PI * 2, pp = [];
    for (let j = 0; j <= 18; j++) {
      const t = .12 + j / 18 * .88, ph = phi + .10 * Math.sin(t * Math.PI), p = punto(t * limite(ph), ph);
      p.addScaledVector(p.clone().sub(centro).normalize(), .009); pp.push(p);
    }
    ciocche.push(new T.TubeGeometry(new T.CatmullRomCurve3(pp), 18, .007, 4, false));
  }
  const ciocca = new T.Mesh(unisci(ciocche), filoMat); ciocca.name = 'Ciocche sottili'; gruppo.add(ciocca);
  function cute(x, y) { ray.set(V(x, y, 4), V(0, 0, -1)); const a = ray.intersectObject(supporto, false)[0]; return a ? a.point.z : 1.35; }
  const occhi = new T.Group(); occhi.name = 'Iride e pupille'; gruppo.add(occhi);
  for (const lato of [-1, 1]) {
    const x = .308 * lato, y = 7.284;
    const iride = new T.Mesh(new T.SphereGeometry(.064, 24, 16), materiali.iride); iride.scale.set(.88, 1, .21); iride.position.set(x, y, 1.387); occhi.add(iride);
    const pupilla = new T.Mesh(new T.SphereGeometry(.027, 20, 12), materiali.pupilla); pupilla.scale.z = .26; pupilla.position.set(x, y, 1.400); occhi.add(pupilla);
    const luce = new T.Mesh(new T.SphereGeometry(.008, 8, 6), materiali.riflesso); luce.position.set(x - .017, y + .022, 1.410); occhi.add(luce);
    const pp = [];
    for (let i = 0; i <= 12; i++) { const t = i / 12, xx = lato * (.13 + t * .45), yy = 7.48 + .065 * Math.sin(t * Math.PI) - .025 * t; pp.push(V(xx, yy, cute(xx, yy) + .022)); }
    const sopr = cucitura(pp, filoMat, .020); sopr.name = 'Sopracciglio'; gruppo.add(sopr);
  }
  gruppo.userData.occhi = occhi;
  geo.dispose(); supporto.material.dispose(); return gruppo;
}
function libera(gruppo) {
  const geos = new Set(), mats = new Set();
  gruppo.traverse(o => { if (o.geometry) geos.add(o.geometry); if (o.material && o.material.userData && o.material.userData.privato) mats.add(o.material); });
  geos.forEach(g => g.dispose()); mats.forEach(m => m.dispose());
}
root.ISO_PAZIENTE_ASPETTO = { raccordo, biancheria, guanciale, varianti, veste, camice, testa, libera };
})(typeof window !== 'undefined' ? window : this);
