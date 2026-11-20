/* Renderer sperimentale accanto al Canvas classico. GPU preferita, riferimento CPU.
   Modello ridotto su sezione: non e' ancora un volume anatomico etichettato 3D. */
(function (root) {
'use strict';
const C = typeof module !== 'undefined' && module.exports ? require('./eco-bmode-core.js') : root.ISO_ECO_BMODE_CORE;
function creaRenderer(doc, deforma) {
  const canvas = doc.createElement('canvas'), cpu = doc.createElement('canvas'), cx = cpu.getContext('2d'), S = root.ISO_ECO_BMODE_SHADERS;
  let gl = null, programma = null, tex = null, noise = null, persa = false, errore = '', key = '', ultimo = null, elaborati = 0, ms = 0;
  const loc = {};
  function prepara() {
    try {
      gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: false });
      if (!gl) { errore = 'WebGL2 non disponibile'; return; }
      function shader(tipo, src) { const s = gl.createShader(tipo); gl.shaderSource(s, src); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { const e = gl.getShaderInfoLog(s); gl.deleteShader(s); throw new Error(e); } return s; }
      const v = shader(gl.VERTEX_SHADER, S.vert), f = shader(gl.FRAGMENT_SHADER, S.frag); programma = gl.createProgram(); gl.attachShader(programma, v); gl.attachShader(programma, f); gl.linkProgram(programma); gl.deleteShader(v); gl.deleteShader(f);
      if (!gl.getProgramParameter(programma, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(programma));
      gl.useProgram(programma);
      for (const n of ['macro','diffusori','dimensioni','origine','scala','prof','cm','contr','gammaDb','gain','focus','frequenza','alpha','riverbero','sonda','asseU','asseD','asseN','centro','asse','territorio','geom','tgcA[0]']) loc[n] = gl.getUniformLocation(programma, n);
      tex = gl.createTexture(); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE); gl.uniform1i(loc.macro, 0);
      noise = gl.createTexture(); gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, noise);
      const data = new Uint8Array(64 * 64 * 64 * 2); let i = 0;
      for (let z = 0; z < 64; z++) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) { data[i++] = Math.round(C.rumore(x, y, z, 79) * 255); data[i++] = Math.round(C.rumore(x, y, z, 110) * 255); }
      gl.texImage3D(gl.TEXTURE_3D, 0, gl.RG8, 64, 64, 64, 0, gl.RG, gl.UNSIGNED_BYTE, data);
      for (const p of [gl.TEXTURE_MIN_FILTER, gl.TEXTURE_MAG_FILTER]) gl.texParameteri(gl.TEXTURE_3D, p, gl.LINEAR);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R]) gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
      gl.uniform1i(loc.diffusori, 1);
      if (gl.getError() !== gl.NO_ERROR) throw new Error('Formato texture non supportato');
      persa = false; errore = ''; key = '';
    } catch (e) { errore = String(e.message || e); if (gl) disposeGPU(); gl = null; }
  }
  function disposeGPU() { if (gl) { if (tex) gl.deleteTexture(tex); if (noise) gl.deleteTexture(noise); if (programma) gl.deleteProgram(programma); } tex = noise = programma = null; }
  canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); persa = true; key = ''; });
  canvas.addEventListener('webglcontextrestored', () => { programma = tex = noise = null; prepara(); });
  if (S) prepara(); else errore = 'Shader non caricati';
  function gpu(input, s) {
    if (canvas.width !== input.width || canvas.height !== input.height) { canvas.width = input.width; canvas.height = input.height; }
    gl.viewport(0, 0, canvas.width, canvas.height); gl.useProgram(programma);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, tex); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, input);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_3D, noise);
    const G = s.G, q = G.q || {}, u1 = (n, v) => gl.uniform1f(loc[n], v), u3 = (n, v) => gl.uniform3fv(loc[n], v);
    gl.uniform2f(loc.dimensioni, canvas.width, canvas.height); gl.uniform2f(loc.origine, s.ox, s.oy);
    for (const [n, v] of Object.entries({ scala: s.scala, prof: s.P.prof, cm: G.Tr.cm, contr: s.contr, gammaDb: s.gammaDb, gain: s.gain, focus: s.focus, frequenza: C.FISICA.frequenza, alpha: C.FISICA.attenuazione, riverbero: s.riverbero ? 1 : 0 })) u1(n, v);
    for (const [n, v] of Object.entries({ sonda: s.P.o, asseU: s.P.u, asseD: s.P.d, asseN: s.P.n, centro: G.oC || G.apice, asse: G.aC || G.axb, territorio: G.terrIVA })) u3(n, v);
    gl.uniform4f(loc.geom, G.L, G.Rm, q.dil || 0, q.acin || 0); gl.uniform1fv(loc['tgcA[0]'], s.tgc); gl.drawArrays(gl.TRIANGLES, 0, 3);
    return canvas;
  }
  function riferimento(input, s) {
    const ratio = Math.min(1, 192 / input.width, 192 / input.height), w = Math.max(1, Math.round(input.width * ratio)), h = Math.max(1, Math.round(input.height * ratio));
    cpu.width = w; cpu.height = h; cx.drawImage(input, 0, 0, w, h); const im = cx.getImageData(0, 0, w, h), D = im.data;
    const re = new Float32Array(w * h), iq = new Float32Array(w * h), ref = [0, 0, 0], tr = s.G.Tr, scale = s.scala * ratio, ox = s.ox * ratio, oy = s.oy * ratio;
    let mancati = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x; if (!D[i * 4]) continue;
      const a = (D[i * 4] / 255) ** 1.4, u = (x - ox) / scale, d = (y - oy) / scale;
      for (let j = 0; j < 3; j++) ref[j] = s.P.o[j] + s.P.u[j] * u + s.P.d[j] * d;
      const inv = C.inversa(s.G, ref, s.contr, deforma, .002 * tr.cm, 16); if (!inv.convergente) mancati++;
      const p = inv.punto.map(v => v / tr.cm / .12), n = C.diffusori(p);
      re[i] = a * n[0] * 2; iq[i] = a * n[1] * 2;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, polar = C.polari(x, y, ox, oy, scale, s.P.prof, Math.PI / 4); let v = 0;
      if (polar) {
        const z = polar.r / tr.cm, spread = Math.max(1, Math.min(3, 1 + Math.abs(z - s.focus) * .12)), dx = Math.sin(polar.a), dy = Math.cos(polar.a); let r = 0, q = 0, total = 0;
        for (let k = -1; k <= 1; k++) for (let j = -1; j <= 1; j++) { const xx = Math.round(x + k * dx + j * dy * spread), yy = Math.round(y + k * dy - j * dx * spread); if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue; const weight = (k ? 1 : 2) * (j ? 1 : 2), at = yy * w + xx; r += re[at] * weight; q += iq[at] * weight; total += weight; }
        const loss = C.attenuazione(z, C.FISICA.frequenza, C.FISICA.attenuazione);
        v = C.luminosita(Math.hypot(r, q) / Math.max(1, total), s.gammaDb, s.gain, .2 * loss, C.tgc(s.tgc, polar.v)); // TGC automatico compensa l'80% della perdita; cursori = correzione.
        if (s.riverbero) v += .035 * Math.exp(-z / 2) * (.5 + .5 * Math.cos(z * 22)) ** 6;
      }
      D[i * 4] = D[i * 4 + 1] = D[i * 4 + 2] = Math.round(Math.min(1, v) * 255); D[i * 4 + 3] = 255;
    }
    cx.putImageData(im, 0, 0); return { canvas: cpu, mancati };
  }
  function render(input, s) {
    const current = [input.width,input.height,s.fase,s.contr,s.gain,s.gammaDb,s.focus,s.riverbero,s.P.o,s.P.u,s.P.d,s.P.prof,s.G.q,s.tgc,s.geometryKey].map(x => typeof x === 'object' ? JSON.stringify(x) : x).join('|');
    // La grana non cambia con il contatore dei frame: il freeze e' deterministico.
    if (current === key && ultimo) return ultimo;
    const start = performance.now(); let result;
    if (gl && !persa) {
      try { result = { canvas: gpu(input, s), motore: 'WebGL2', mancati: null }; }
      catch (e) { errore = String(e.message || e); disposeGPU(); gl = null; }
    }
    if (!result) result = Object.assign(riferimento(input, s), { motore: 'CPU di riferimento' });
    ms = performance.now() - start; elaborati++; key = current; ultimo = result; return result;
  }
  return { render, stato: () => ({ webgl2: !!gl && !persa, errore, elaborati, ms }), dispose: () => { disposeGPU(); gl = null; ultimo = null; key = ''; } };
}
if (typeof module !== 'undefined' && module.exports) module.exports = { creaRenderer }; else root.ISO_ECO_BMODE = { creaRenderer };
})(typeof self !== 'undefined' ? self : this);
