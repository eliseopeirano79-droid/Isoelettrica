/* Regressione end-to-end su Chrome/ChromeDriver installati nel runner GitHub.
   Per eseguirla in locale: ECO_BROWSER_TEST=1 node --test tests/eco-browser.test.cjs */
const test=require('node:test'), assert=require('node:assert/strict');
const http=require('node:http'),fs=require('node:fs'),path=require('node:path');
const {spawn,execFileSync}=require('node:child_process');
const os=require('node:os');
const radice=path.join(__dirname,'..');
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const listen=s=>new Promise((ok,no)=>s.once('error',no).listen(0,'127.0.0.1',()=>ok(s.address().port)));
test('Browser Eco: immagini e gesti sulla sonda nei localizzatori 3D e 2D',{skip:!process.env.GITHUB_ACTIONS && !process.env.ECO_BROWSER_TEST,timeout:300000},async()=>{
  const temp=fs.mkdtempSync(path.join(os.tmpdir(),'iso-eco-')), standalone=path.join(temp,'eco.html');
  execFileSync('python3',[path.join(radice,'tools/esporta-eco-offline.py'),standalone]);
  const server=http.createServer((req,res)=>{
    if(req.url==='/standalone.html'){res.setHeader('Content-Type','text/html');fs.createReadStream(standalone).pipe(res);return;}
    const file=path.resolve(radice,'.'+new URL(req.url,'http://localhost').pathname);
    if(!file.startsWith(radice+path.sep)||!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    const tipi={'.js':'text/javascript','.html':'text/html','.css':'text/css','.json':'application/json','.glb':'model/gltf-binary'};
    res.setHeader('Content-Type',tipi[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
  });
  const port=await listen(server), reserve=http.createServer(), wd=await listen(reserve);
  await new Promise(r=>reserve.close(r));
  const driver=spawn('chromedriver',['--port='+wd],{stdio:'ignore'});
  let startup;driver.on('error',e=>{startup=e;});
  const base='http://127.0.0.1:'+wd;
  let sid;
  async function request(url,method='GET',body) {
    const resp=await fetch(base+url,{method,headers:{'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
    const json=await resp.json();if(!resp.ok)throw Error(json.value?.message||resp.statusText);return json.value;
  }
  const api=(p,m,b)=>request('/session/'+sid+p,m,b);
  const js=(script,...args)=>api('/execute/sync','POST',{script,args});
  async function wait(check,n=180) {for(let i=0;i<n;i++){if(await check())return;await sleep(200);}throw Error('Timeout: '+String(check));}
  const frame=()=>api('/execute/async','POST',{script:'const end=arguments[arguments.length-1]; requestAnimationFrame(()=>requestAnimationFrame(()=>end(true)));',args:[]});
  try {
    await wait(async()=>{if(startup)throw startup;try{return !!(await request('/status')).ready;}catch{return false;}});
    for(const mode of ['3d','2d']){
      const args=['--headless=new','--no-sandbox','--disable-dev-shm-usage','--window-size=1280,980'];
      args.push(...(mode==='3d'?['--use-angle=swiftshader','--enable-unsafe-swiftshader']:['--disable-webgl']));
      sid=(await request('/session','POST',{capabilities:{alwaysMatch:{browserName:'chrome','goog:chromeOptions':{args}}}})).sessionId;
      await api('/url','POST',{url:'http://127.0.0.1:'+port+'/index.html'});
      await js("document.querySelector('#nav [data-v=eco]').click()");
      await wait(()=>js("return document.querySelector('#v-eco').dataset.torace==='1' && !!window.ISO_ECO?.stato().pronto"));
      await js("document.querySelector('#ecoTD').click()");await frame();
      assert.equal(await js('return ISO_ECO.stato().localizzatore'),mode);
      const views=await js("return [...document.querySelectorAll('#ecoViste [data-v]')].map(b=>b.dataset.v)");
      assert.equal(views.length,15);
      let idx=0;
      for(const id of views){
        await js("ISO_ECO.vista(arguments[0]);const e=document.querySelector('#ecoCine');e.value=415;e.dispatchEvent(new Event('input'))",id);
        await frame();
        const rep=await js(`const e=document.querySelector('#ecoTela'), s=ISO_ECO.stato();
          const small=document.createElement('canvas');small.width=112;small.height=84;const c=small.getContext('2d');c.drawImage(e,0,0,112,84);
          if(!window.ecoMosaico){const m=document.createElement('canvas');m.width=560;m.height=306;window.ecoMosaico=m;}
          const mc=ecoMosaico.getContext('2d'), ix=arguments[0]%5*112, iy=Math.floor(arguments[0]/5)*102;
          mc.drawImage(small,ix,iy);mc.fillStyle='#fff';mc.font='11px sans-serif';mc.fillText(s.vista,ix+4,iy+96);
          const rgb=c.getImageData(0,0,112,84).data;let lit=0;for(let k=0;k<rgb.length;k+=4)if(rgb[k]>45)lit++;
          return [s.vista,s.fase,s.catene,lit];`,idx++);
        assert.equal(rep[0],id);assert.ok(Math.abs(rep[1]-.415)<.001);assert.ok(rep[2]>0 && rep[3]>20,id+': '+rep);
      }
      if(mode==='3d')console.log('ECO_MOSAICO_JPEG '+await js("return ecoMosaico.toDataURL('image/jpeg',.49).split(',')[1]"));
      await js("ISO_ECO.vista('a4c');document.querySelector('#eco3d').scrollIntoView({block:'center'})");await frame();
      const pose=()=>js("return [ISO_ECO._geo().mi.slice(0,2),...['ecoRot','ecoFan','ecoInc'].map(id=>Number(document.getElementById(id).value))]");
      for(const man of ['presa','anello','fan','rock']){
        for(const dir of [-1,1]){
          await js("document.querySelector('#ecoZero').click();document.querySelector('#ecoManovra').value=arguments[0]",man);await frame();
          const before=await pose();
          const [x,y]=await js('return ISO_ECO._sonda().map(Math.round)');
          await api('/actions','POST',{actions:[{type:'pointer',id:'mano',parameters:{pointerType:'mouse'},actions:[
            {type:'pointerMove',duration:0,x,y},{type:'pointerDown',button:0},{type:'pointerMove',duration:110,x:x+dir*24,y:y+dir*15},{type:'pointerUp',button:0}]}]});
          await frame();assert.notDeepEqual(await pose(),before,mode+' '+man+' '+dir);
        }
      }
      await js("document.querySelector('#ecoZero').click();document.querySelector('#ecoStudio').open=true; document.querySelector('#ecoArchivio').open=true;");
      for(const v of ['biplano','mitrale','tricuspide','aortica','polmonare']){
        await js("const e=document.querySelector('#ecoStudioModo');e.value=arguments[0];e.dispatchEvent(new Event('change'))",v);await frame();
        assert.ok(await js("return document.querySelector('#ecoStudioTela').toDataURL('image/png').length>1900"),v);
      }
      await js("document.querySelector('#ecoAcquisisci').click()");assert.equal(await js("return document.querySelectorAll('#ecoAcquisizioni figure').length"),1);
      await js("document.querySelector('#ecoPW').click();document.querySelector('#ecoNyq').value=55;document.querySelector('#ecoNyq').dispatchEvent(new Event('input'))");
      assert.equal(await js("return document.querySelector('#ecoNyqV').textContent"),'55 cm/s');
      if(mode==='3d') {
        for(const les of ['sa','ia','sm','im','it'])for(const grado of ['lieve','moderata','severa']){
          await js("document.querySelector('[data-l='+arguments[0]+']').click();document.querySelector('[data-g='+arguments[1]+']').click()",les,grado);
          for(const [r,f,b,z] of [[-180,-45,45,8],[180,45,-45,24],[0,0,0,16]]) {
            await js("for(const [i,id] of ['ecoRot','ecoFan','ecoInc','ecoProf'].entries()){const e=document.getElementById(id);e.value=arguments[i];e.dispatchEvent(new Event('input'))}",r,f,b,z);
            await frame();assert.ok(await js("return ISO_ECO._geo().mi.every(Number.isFinite)"),les+' '+grado);
          }
        }
        await js("document.querySelector('#ecoValv [data-l=\"\"]').click();document.querySelector('#ecoZero').click()");
        await frame();
        for(const k of ['a4c-d','a2c-d','a4c-s','a2c-s']) {
          await js("document.querySelector('#ecoSimScelta').value=arguments[0];document.querySelector('#ecoSimInizia').click()",k);await frame();
          const total=await js(`const e=document.querySelector('#ecoTela'),box=e.getBoundingClientRect(),g=ISO_ECO._geo();
            const x=e.width/2,y=e.height*.57,scale=arguments[0].endsWith('s')?.70:1;
            for(let i=0;i<=16;i++){const a=Math.PI*i/16;
              const u=x+scale*e.width*.09*Math.cos(a),v=y-scale*e.height*.18*Math.sin(a);
              e.dispatchEvent(new PointerEvent('pointerdown',{clientX:box.left+u*box.width/e.width,clientY:box.top+v*box.height/e.height,bubbles:true}));}
            document.querySelector('#ecoSimFine').click();return document.querySelector('#ecoSimRis').textContent;`,k);
          assert.ok(total.includes(k.toUpperCase()),k+': '+total);
        }
        assert.match(await js("return document.querySelector('#ecoSimRis').textContent"),/FE \d+%/);
      }
      await api('/url','POST',{url:'http://127.0.0.1:'+port+'/standalone.html'});
      await wait(()=>js("return !!window.ISO_ECO?.stato().pronto && document.querySelector('#v-eco').dataset.torace==='1'"));
      assert.equal(await js("return [...document.querySelectorAll('#ecoViste [data-v]')].length"),15);
      assert.deepEqual(await js("return performance.getEntriesByType('resource').map(e=>e.name).filter(n=>/^https?:/.test(n) && !n.endsWith('favicon.ico'))"),[]);
      await api('','DELETE');sid=null;
    }
  } finally {if(sid)await api('','DELETE').catch(()=>{});driver.kill();server.closeAllConnections();await new Promise(r=>server.close(r));fs.rmSync(temp,{recursive:true,force:true});}
});
