// Browser APIs are mocked, but the application's real event handlers and engine run.
const fs = require('node:fs');
const path = require('node:path');
const { JSDOM, VirtualConsole } = require('jsdom');
const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

function environment(file = 'index.html') {
  const errors = [], virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', e => errors.push(e));
  const dom = new JSDOM(read(file), { url: 'https://example.test/Isoelettrica/', runScripts: 'outside-only', pretendToBeVisual: true, virtualConsole });
  const w = dom.window, timers = new Map(), frames = [];
  let clock = 0, next = 1;
  w.setTimeout = (f, delay = 0) => { const id = next++; timers.set(id, { f, due: clock + delay }); return id; };
  w.clearTimeout = id => timers.delete(id);
  w.requestAnimationFrame = f => { frames.push(f); return frames.length; };
  w.cancelAnimationFrame = () => {};
  w.matchMedia = () => ({ matches: false, addEventListener() {} });
  w.fetch = () => Promise.resolve({ ok: false, json: () => Promise.reject(new Error('optional asset absent')) });
  Object.defineProperty(w.HTMLElement.prototype, 'clientWidth', { get: () => 1000 });
  Object.defineProperty(w.HTMLElement.prototype, 'clientHeight', { get: () => 500 });
  w.HTMLCanvasElement.prototype.getContext = function(type) {
    if (type !== '2d') return null; // Reproduce a real WebGL startup failure.
    const gradient = () => ({ addColorStop() {} });
    return new Proxy({ canvas: this, measureText: s => ({ width: String(s).length * 7 }), createLinearGradient: gradient, createRadialGradient: gradient }, {
      get: (o, k) => k in o ? o[k] : () => {}, set: (o, k, v) => (o[k] = v, true)
    });
  };
  w.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,';
  function advance(ms) {
    const target = clock + ms;
    for (let guard = 0; guard < 1000; guard++) {
      const due = [...timers].filter(([, v]) => v.due <= target).sort((a, b) => a[1].due - b[1].due)[0];
      if (!due) break;
      const [id, v] = due; clock = v.due; timers.delete(id); v.f();
    }
    clock = target;
  }
  return { dom, w, errors, advance, frames, close: () => dom.window.close() };
}
function app(options = {}) {
  const h = environment(), w = h.w;
  w.ISO_SOLO_LINEE_GUIDA = !!options.onlyGuidelines;
  if (options.records) w.ISO_REALE = options.records;
  for (const f of ['three.min.js', 'engine.js', 'ipertrofie.js', 'data.js', 'atlante-digitale.js', 'ptbxl.js', 'quiz.js']) w.eval(read(f));
  if(options.conduction)w.eval(read('conduction-model.js'));
  if (options.renderer) w.THREE.WebGLRenderer = class {
    constructor() { this.domElement=w.document.createElement('canvas'); }
    setPixelRatio() {} setSize() {} render() {}
  };
  const expose = `window.__test={S,mon,qmon,Q,QATL,CMP,DEF,store,paramsFor,defaultParams,loadScenario,showView,setParam,ectopia,apriDigitalizzato,randomParams,newQuestion,newQuestionAtlas,answer,cmpLoad,cmpShow,cmpBuild,measure,Monitor,scene,caricaIndiceReale,apriReale,renderVolt,defTick,stripOn,stDraw,get stream(){return stream;},get curCfg(){return curCfg;},get real(){return REALE;}};`;
  w.eval(read('app.js').replace(/\}\)\(\);\s*$/, expose + '})();'));
  h.A = w.__test;
  return h;
}
module.exports = { read, environment, app };
