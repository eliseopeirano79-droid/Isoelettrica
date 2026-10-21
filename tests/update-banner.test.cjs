const test = require('node:test');
const assert = require('node:assert/strict');
const { environment, read } = require('./harness.cjs');

// Exercise the real PWA update handler without starting the ECG renderer.
const appCode = read('app.js');
const start = appCode.indexOf('let swReg = null, ricaricando = false, ultimoCheck = 0;');
const end = appCode.lastIndexOf('\n})();');
assert.ok(start >= 0 && end > start, 'Blocco aggiornamenti presente');
const updateHandler = appCode.slice(start, end);
const settle = async () => { for (let i = 0; i < 18; i++) await Promise.resolve(); };

async function setup(waitingVersion) {
  const h = environment(), { w } = h;
  // Wait for JSDOM's initial load; the PWA handler is installed afterwards.
  await new Promise(resolve => setImmediate(resolve));
  class Worker {
    constructor(version) { this.version = version; this.state = 'installed'; this.events = {}; this.sent = []; }
    addEventListener(type, cb) { this.events[type] = cb; }
    emit(type) { this.events[type]?.(); }
    postMessage(msg, transfer = []) {
      this.sent.push(msg.type);
      if (msg.type === 'version' && transfer[0]) transfer[0].postMessage({ type: 'version', version: this.version });
    }
  }
  const reg = {
    waiting: waitingVersion ? new Worker(waitingVersion) : null,
    installing: null, events: {}, updates: 0,
    addEventListener(type, cb) { this.events[type] = cb; },
    emit(type) { this.events[type]?.(); },
    async update() { this.updates++; }
  };
  const serviceWorker = { controller: new Worker('45.0'), events: {},
    addEventListener(type, cb) { this.events[type] = cb; },
    register: async () => reg
  };
  Object.defineProperty(w.navigator, 'serviceWorker', { configurable: true, value: serviceWorker });
  w.MessageChannel = class {
    constructor() {
      this.port1 = { onmessage: null, close() {} };
      this.port2 = { postMessage: data => this.port1.onmessage?.({ data }) };
    }
  };
  w.eval('(function(){ const $ = s => document.querySelector(s); let offlineJob = 0, offlineTimer = null, offlineBusy = false;\n' + updateHandler + '\n})();');
  w.dispatchEvent(new w.Event('load'));
  await settle();
  return { ...h, Worker, reg, serviceWorker, settle };
}

test('Il worker della stessa versione della pagina non mostra il falso aggiornamento', async t => {
  const h = await setup('45.1'); t.after(h.close);
  assert.equal(h.w.document.getElementById('updBar'), null);
  assert.ok(h.reg.updates > 0, 'Il normale controllo aggiornamenti rimane attivo');
});

test('Un worker più vecchio della pagina non produce un avviso', async t => {
  const h = await setup('45.0'); t.after(h.close);
  assert.equal(h.w.document.getElementById('updBar'), null);
});

test('Più tardi ignora lo stesso rilascio ma non nasconde il successivo', async t => {
  const h = await setup('45.2'); t.after(h.close);
  const { w, reg, Worker } = h;
  assert.ok(w.document.getElementById('updBar'), 'Una versione nuova viene annunciata');
  w.document.getElementById('updNo').click();
  assert.equal(w.document.getElementById('updBar'), null);
  assert.equal(w.sessionStorage.getItem('isoelettrica-aggiornamento-rimandato'), '45.2');
  // Another installed event must not resurrect the same update.
  reg.installing = reg.waiting;
  reg.emit('updatefound');
  reg.installing.emit('statechange');
  w.dispatchEvent(new w.Event('focus'));
  await settle();
  assert.equal(w.document.getElementById('updBar'), null);
  const next = new Worker('45.3');
  reg.waiting = next; reg.installing = next;
  reg.emit('updatefound'); next.emit('statechange');
  await settle();
  assert.ok(w.document.getElementById('updBar'), 'La release successiva viene annunciata');
  w.document.getElementById('updGo').click();
  assert.ok(next.sent.includes('skipWaiting'), 'Il pulsante aggiorna ancora il worker');
});

test('Il controllo manuale può richiamare un aggiornamento rimandato', async t => {
  const h = await setup('45.2'); t.after(h.close);
  const { w } = h;
  w.document.getElementById('updNo').click();
  w.document.getElementById('credit').click();
  await settle();
  assert.ok(w.document.getElementById('updBar'));
});
