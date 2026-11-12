/* Geometria e ciclo di vita reali Three.js; solo il renderer GPU è sostituito. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { environment, read } = require('./harness.cjs');

async function paziente() {
  const h = environment(), { w } = h;
  w.TextDecoder = TextDecoder;
  w.eval(read('three.min.js'));
  w.THREE.WebGLRenderer = class {
    constructor() { this.domElement = w.document.createElement('canvas'); this.shadowMap = {}; h.renderer = this; }
    setPixelRatio() {} setClearColor() {} setSize() {} dispose() { this.disposed = true; }
    render(scene, camera) { h.scene = scene; h.camera = camera; }
  };
  const buf = fs.readFileSync(path.join(__dirname, '../paziente-corpo.bin'));
  w.fetch = async () => ({ ok: true, arrayBuffer: async () => buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength) });
  for (const file of ['casi-paziente-aspetto.js', 'casi-paziente.js']) w.eval(read(file));
  h.api = w.ISO_PAZIENTE.crea(w.document.querySelector('#casiStage'));
  for (let i = 0; i < 10 && !h.api.pronto; i++) await new Promise(resolve => setImmediate(resolve));
  assert.ok(h.api.pronto);
  h.frame = () => { for (let i = 0; i < 30; i++) h.api.aggiorna(100); h.scene.updateMatrixWorld(true); };
  h.frame(); return h;
}

test('Le quattro corporature producono superfici distinte, finite e vestite anche cambiando postura', async t => {
  const h = await paziente(); t.after(h.close);
  const forme = new Set();
  for (const sesso of ['M', 'F']) for (const eta of [35, 76]) {
    h.api.imposta({ post: 'semi', fr: 18, cosc: 'vigile' }, { sesso, eta }); h.frame();
    const corpo = h.scene.getObjectByName('Paziente MakeHuman');
    forme.add(Buffer.from(corpo.geometry.attributes.position.array.buffer).toString('base64'));
    assert.ok(h.scene.getObjectByName('Capelli con attaccatura e volume'));
    assert.ok(h.scene.getObjectByName('Camice in tessuto con scollo pulito'));
    for (const post of ['semi', 'supino']) {
      h.api.imposta({ post, fr: 18 }, { sesso, eta }); h.frame();
      h.scene.traverse(o => {
        if (!o.geometry) return;
        const p = o.geometry.attributes.position.array;
        assert.ok(p.every(Number.isFinite), o.name + ': geometria finita');
        const sw = o.geometry.attributes.skinWeight;
        if (sw) for (let i = 0; i < sw.count; i++) assert.ok(Math.abs(sw.getX(i) + sw.getY(i) + sw.getZ(i) + sw.getW(i) - 1) < 1e-5);
      });
      const lenzuolo = h.scene.getObjectByName('Tessuto sulle gambe').geometry;
      lenzuolo.computeBoundingBox();
      assert.ok(lenzuolo.boundingBox.max.y < 1 && lenzuolo.boundingBox.min.y > .2, 'Niente ingombro gonfio o vertici fuori scala');
    }
  }
  assert.equal(forme.size, 4);
  assert.equal(h.errors.length, 0);
});

test('Il cambio del paziente sostituisce capelli e camice, e chiude gli occhi nell’incoscienza', async t => {
  const h = await paziente(); t.after(h.close);
  for (let i = 0; i < 6; i++) {
    h.api.imposta({ post: 'supino', fr: 0, cosc: 'incosciente', rcp: true }, { sesso: i % 2 ? 'M' : 'F', eta: i % 3 ? 35 : 76 }); h.frame();
    let capelli = 0, camici = 0;
    h.scene.traverse(o => { if (o.name === 'Capelli con attaccatura e volume') capelli++; if (/^Camice in tessuto/.test(o.name)) camici++; });
    assert.equal(capelli, 1); assert.equal(camici, 1);
    assert.equal(h.scene.getObjectByName('Iride e pupille').visible, false);
  }
  h.api.imposta({ post: 'semi', fr: 18, cosc: 'vigile' }, { sesso: 'M', eta: 35 }); h.frame();
  assert.equal(h.scene.getObjectByName('Iride e pupille').visible, true);
  h.api.distruggi();
  assert.equal(h.renderer.disposed, true);
  assert.equal(h.w.document.querySelectorAll('#casiStage canvas,.casi-vista3d').length, 0);
});

test('I controlli di zoom e ripristino modificano la camera e funzionano senza trascinare', async t => {
  const h = await paziente(); t.after(h.close);
  const w = h.w, prima = h.camera.position.length();
  w.document.querySelector('[aria-label="Avvicina il paziente"]').click(); h.frame();
  assert.ok(h.camera.position.length() < prima);
  w.document.querySelector('[aria-label="Ripristina la vista"]').click(); h.frame();
  assert.ok(Math.abs(h.camera.position.length() - prima) < 1e-9);
});
