/* Integrazione dei casi: eventi DOM reali e motore reale; rendering 3D simulato. */
const test = require('node:test');
const assert = require('node:assert/strict');
const { app, read } = require('./harness.cjs');

function casi(options = {}) {
  const h = app(), { w } = h;
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const Monitor = w.ISO_APP.Monitor;
  w.ISO_APP.Monitor = class extends Monitor {
    constructor(...args) { super(...args); h.monitor = this; }
  };
  h.patient = { imposta() {}, vitali() {}, effetto() {}, battito() {}, aggiorna() {}, misura() {}, suErrore: null };
  w.ISO_PAZIENTE = { crea: () => options.no3d ? null : h.patient };
  if (options.load) w.ISO_PTBXL.load = options.load;
  for (const file of ['casi-dati.js', 'casi-reali.js', 'casi-clinici.js']) w.eval(read(file));
  w.document.querySelector('#nav [data-v="casi"]').click();
  h.click = selector => {
    const element = w.document.querySelector(selector);
    assert.ok(element, 'Controllo mancante: ' + selector);
    element.click();
  };
  return h;
}

test('I 15 casi guidati completano tutte le 66 decisioni e salvano il punteggio', t => {
  const h = casi(); t.after(h.close); const { w } = h;
  let decisions = 0;
  assert.equal(w.document.querySelectorAll('#nav button').length, 9);
  assert.equal(w.document.querySelectorAll('#casiHome [data-caso]').length, 15);
  for (const c of w.ISO_CASI_DATI.CASI) {
    h.click('[data-caso="' + c.id + '"]');
    for (const p of c.passi) {
      h.click('#casiPanel .opts [data-k="' + p.opz.findIndex(o => o.v === 'ok') + '"]');
      assert.ok(w.document.querySelector('#casiFb .casi-fb.ok'), c.id);
      h.click('#casiAvanti'); decisions++;
    }
    assert.equal(w.document.querySelector('.casi-punti b').textContent, c.passi.length + '/' + c.passi.length);
    h.click('#casiAltri');
  }
  assert.equal(decisions, 66);
  assert.equal(Object.keys(JSON.parse(w.localStorage.getItem('iso-casi-v1'))).length, 15);
  assert.equal(h.errors.length, 0);
});

test('Verapamil nel caso di FA pre-eccitata mostra la conseguenza e permette di proseguire', t => {
  const h = casi(); t.after(h.close); const { w } = h;
  const c = w.ISO_CASI_DATI.CASI.find(c => c.passi.some(p => p.opz.some(o => /verapamil/i.test(o.t) && o.cons)));
  h.click('[data-caso="' + c.id + '"]');
  for (const p of c.passi) {
    const dangerous = p.opz.findIndex(o => /verapamil/i.test(o.t) && o.cons);
    h.click('#casiPanel .opts [data-k="' + (dangerous < 0 ? p.opz.findIndex(o => o.v === 'ok') : dangerous) + '"]');
    if (dangerous >= 0) {
      assert.match(w.document.querySelector('#casiEvento').textContent, /fibrillazione ventricolare/i);
      assert.equal(h.monitor.stream.cfg.mode, 'continuous');
      h.click('#casiAvanti');
      assert.notEqual(h.monitor.stream.cfg.mode, 'continuous');
      break;
    }
    h.click('#casiAvanti');
  }
  assert.equal(h.errors.length, 0);
});

test('Un ECG reale in caricamento o in errore non mostra il tracciato e gli avvisi del caso precedente', async t => {
  let fail;
  const h = casi({ load: () => new Promise((resolve, reject) => { fail = reject; }) }); t.after(h.close);
  const { w } = h;
  const c = w.ISO_CASI_DATI.CASI.find(c => c.passi.some(p => p.opz.some(o => o.cons)));
  h.click('[data-caso="' + c.id + '"]');
  for (const p of c.passi) {
    const wrong = p.opz.findIndex(o => o.cons);
    h.click('#casiPanel .opts [data-k="' + (wrong < 0 ? p.opz.findIndex(o => o.v === 'ok') : wrong) + '"]');
    if (wrong >= 0) break;
    h.click('#casiAvanti');
  }
  assert.ok(w.document.querySelector('#casiEvento').classList.contains('on'));
  h.monitor.t = 4000; h.monitor.draw();
  h.click('#casiEsci'); h.click('[data-s="reali"]');
  assert.equal(w.document.querySelectorAll('#casiHome [data-caso]').length, 96);
  h.click('#casiHome [data-caso]');
  assert.equal(h.monitor.stream, null, 'Il monitor deve cancellare il segnale precedente durante il download');
  assert.equal(w.document.querySelector('#casiEvento').classList.contains('on'), false);
  fail(new Error('Network error')); await new Promise(resolve => setImmediate(resolve));
  assert.match(w.document.querySelector('#casiPanel').textContent, /Tracciato non disponibile/);
  assert.ok(w.document.querySelector('#casiRiprova'));
  assert.equal(h.monitor.stream, null);
  assert.equal(h.errors.length, 0);
});

test('Un caricamento completato dopo l’uscita non sostituisce il nuovo caso guidato', async t => {
  let finish;
  const h = casi({ load: () => new Promise(resolve => { finish = resolve; }) }); t.after(h.close);
  h.click('[data-s="reali"]'); h.click('#casiHome [data-caso]'); h.click('#casiEsci');
  h.click('[data-s="guidati"]'); h.click('#casiHome [data-caso]');
  const stream = h.monitor.stream, heading = h.w.document.querySelector('#casiChi').textContent;
  finish({}); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.monitor.stream, stream);
  assert.equal(h.w.document.querySelector('#casiChi').textContent, heading);
  assert.equal(h.errors.length, 0);
});

test('L’assenza del corpo 3D viene dichiarata una volta e il caso resta utilizzabile', t => {
  const h = casi(); t.after(h.close);
  h.click('#casiHome [data-caso]');
  assert.equal(typeof h.patient.suErrore, 'function', 'Il fallimento del download del corpo deve essere gestito');
  h.patient.suErrore(); h.patient.suErrore();
  assert.equal(h.w.document.querySelectorAll('#casiStage .casi-no3d').length, 1);
  assert.match(h.w.document.querySelector('#casiStage .casi-no3d').textContent, /non disponibile/);
  assert.ok(h.monitor.stream);
  assert.ok(h.w.document.querySelector('#casiPanel .opts button'));
});

test('Senza WebGL la riapertura dei casi non duplica l’avviso', t => {
  const h = casi({ no3d: true }); t.after(h.close);
  for (let i = 0; i < 3; i++) { h.click('#casiHome [data-caso]'); h.click('#casiEsci'); }
  assert.equal(h.w.document.querySelectorAll('#casiStage .casi-no3d').length, 1);
  assert.equal(h.errors.length, 0);
});
