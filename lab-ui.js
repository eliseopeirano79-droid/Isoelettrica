/* Shared model focus mode. Browser fullscreen is optional; the embedded host
   supplies a full-window fallback without reloading either laboratory. */
(function(){
'use strict';
document.documentElement.classList.add('lab-page');
function init(){const target=document.querySelector('.viewer')||document.getElementById('view');if(!target)return;target.classList.add('lab-focus-target');const b=document.createElement('button');b.type='button';b.className='lab-focus-button';b.setAttribute('aria-pressed','false');target.append(b);let active=false;
 function draw(){b.textContent=active?'↙ Esci da schermo intero':'⤢ Schermo intero';b.setAttribute('aria-pressed',String(active));b.title=active?'Torna al laboratorio (Esc)':'Ingrandisci il cuore a schermo intero';}
 function set(on){active=on;target.classList.toggle('is-model-focus',on);document.body.classList.toggle('model-focus',on);draw();if(parent!==window)parent.postMessage({type:'iso-lab-focus',active:on},location.origin);window.dispatchEvent(new Event('resize'));}
 function exit(){set(false);if(document.fullscreenElement&&document.exitFullscreen)document.exitFullscreen().catch(()=>{});b.focus();}
 b.addEventListener('click',()=>{if(active){exit();return;}set(true);if(target.requestFullscreen)try{target.requestFullscreen().catch(()=>{});}catch(_){} });
 document.addEventListener('fullscreenchange',()=>{if(active&&!document.fullscreenElement)exit();});document.addEventListener('keydown',e=>{if(e.key==='Escape'&&active&&!e.defaultPrevented){e.preventDefault();exit();}});
 window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='iso-lab-exit-focus'&&active)exit();});draw();}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
