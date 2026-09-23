const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const {read} = require('./harness.cjs');
const base='https://example.test/Isoelettrica/';
const version=/const VERSION = '([^']+)'/.exec(read('sw.js'))[1],cacheName='isoelettrica-v'+version;
function worker(fetcher=async()=>new Response('ok')) {
  const listeners={}, maps=new Map(), replies=[], calls=[];
  let claimed=0, quota=false;
  const key=req=>typeof req==='string'?req:req.url;
  const caches={
    keys:async()=>[...maps.keys()], delete:async name=>maps.delete(name),
    open:async name=>{
      if(!maps.has(name)) maps.set(name,new Map()); const map=maps.get(name);
      return {
        match:async req=>map.get(key(req))?.clone(),
        put:async(req,res)=>{if(quota && name==='isoelettrica-assets-v1') throw Error('quota');map.set(key(req),res.clone());},
        keys:async()=>[...map.keys()].map(url=>new Request(url))
      };
    }
  };
  const self={location:{href:base+'sw.js'},addEventListener:(name,fn)=>listeners[name]=fn,skipWaiting(){},clients:{claim:async()=>claimed++}};
  vm.runInNewContext(read('sw.js'),{self,caches,URL,Response,AbortController,setTimeout,clearTimeout,fetch:(...a)=>{calls.push(a[0]);return fetcher(...a);}});
  async function dispatch(name,data={}) { let p; listeners[name]({...data,waitUntil:x=>p=x,respondWith:x=>p=x,source:{postMessage:r=>replies.push(r)}}); return p; }
  const put=async(name,path,body)=>{const c=await caches.open(name);await c.put(base+path,new Response(body));};
  return {dispatch,maps,caches,replies,calls,put,get claimed(){return claimed;},set quota(v){quota=v;}};
}
test('Installazione completa: tutte le risorse richieste sono in cache',async()=>{
  const w=worker();await w.dispatch('install');
  const c=await w.caches.open(cacheName);
  for(const f of ['index.html','quiz.js?v='+version,'engine.js?v='+version,'app.js?v='+version,'anatomia.html']) assert.ok(await c.match(base+f),f);
});
test('Un download essenziale fallito annulla l’installazione e preserva la versione precedente',async()=>{
  const w=worker(async req=>new Response('x',{status:String(req).endsWith('quiz.js?v='+version)?503:200}));
  await w.put('isoelettrica-v39','index.html','old');
  await assert.rejects(w.dispatch('install'),/indispensabile/);
  assert.ok(w.maps.has('isoelettrica-v39'));assert.equal(w.maps.has(cacheName),false);
});
test('Aggiornamento migra le immagini e non elimina cache di altre app',async()=>{
  const w=worker();await w.put('isoelettrica-v39','atlante/a.jpg','image');await w.put('another-app','x.js','foreign');
  await w.dispatch('install');await w.dispatch('activate');
  assert.equal(await (await w.caches.open('isoelettrica-assets-v1')).match(base+'atlante/a.jpg').then(r=>r.text()),'image');
  assert.equal(w.maps.has('isoelettrica-v39'),false);assert.ok(w.maps.has('another-app'));assert.equal(w.claimed,1);
});
test('Quota esaurita durante la migrazione conserva la vecchia cache e attiva l’app',async()=>{
  const w=worker();await w.put('isoelettrica-v39','atlante/a.jpg','image');w.quota=true;
  await w.dispatch('activate');assert.ok(w.maps.has('isoelettrica-v39'));assert.equal(w.claimed,1);
});
test('Offline: pagina da cache, script assente mai sostituito da HTML',async()=>{
  const w=worker(async()=>{throw Error('offline');});await w.put(cacheName,'index.html','<html>offline</html>');
  const page=await w.dispatch('fetch',{request:{url:base,method:'GET',mode:'navigate'}});assert.equal(await page.text(),'<html>offline</html>');
  const script=await w.dispatch('fetch',{request:new Request(base+'missing.js')});assert.equal(script.type,'error');assert.equal(script.status,0);
});
test('HTTP 503 usa la copia disponibile e la shell non mescola versioni',async()=>{
  const w=worker(async()=>new Response('unavailable',{status:503}));await w.put(cacheName,'aux.js','cached');
  const response=await w.dispatch('fetch',{request:new Request(base+'aux.js')});assert.equal(await response.text(),'cached');
  await w.put(cacheName,'app.js?v='+version,'version40');const calls=w.calls.length;
  const core=await w.dispatch('fetch',{request:new Request(base+'app.js?v='+version)});assert.equal(await core.text(),'version40');assert.equal(w.calls.length,calls);
});
test('Archivio offline conta successi/errori e ignora risorse esterne',async()=>{
  const w=worker(async url=>new Response('image',{status:url.includes('bad.jpg')?404:200}));
  await w.dispatch('message',{data:{type:'offline-save',id:4,urls:['atlante/good.jpg','atlante/good.jpg','atlante/bad.jpg','https://other.test/image.jpg']}});
  const end=w.replies.at(-1);assert.equal(end.done,1);assert.equal(end.failed,1);assert.equal(end.total,2);assert.equal(end.complete,true);
  w.replies.length=0;await w.dispatch('message',{data:{type:'offline-status',urls:['atlante/good.jpg']}});assert.equal(w.replies.at(-1).done,1);
});
test('Ripristino elimina solo le cache Isoelettrica e conferma dopo il completamento',async()=>{
  const w=worker();await w.put(cacheName,'index.html','x');await w.put('isoelettrica-assets-v1','atlante/a.jpg','x');await w.put('foreign-cache','index.html','y');
  await w.dispatch('message',{data:{type:'purge'}});assert.deepEqual([...w.maps.keys()],['foreign-cache']);assert.equal(w.replies.at(-1).type,'purged');
});

test('Anatomia adulta e fetale: geometria, controlli e attribuzioni disponibili offline',async()=>{const w=worker();await w.dispatch('install');const c=await w.caches.open(cacheName);for(const f of ['prototipo-cuore/index.html','prototipo-cuore/fetale.html','prototipo-cuore/heart-z-anatomy.glb','prototipo-cuore/atlas-coronary-map.json','prototipo-cuore/coronary-paths.json','prototipo-cuore/viewer.js','prototipo-cuore/lab.js','prototipo-cuore/fetal.js','prototipo-cuore/fetal-core.js','prototipo-cuore/ATTRIBUZIONI.md','atlas-geometry.js?v='+version,'cardiac-clock.js?v='+version,'lab-embed.js?v='+version])assert.ok(await c.match(base+f),f);});
