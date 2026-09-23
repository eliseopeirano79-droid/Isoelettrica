/* Navigation only. The adult and fetal laboratories keep independent state. */
(function(){
'use strict';
let view='trace',page='adult';const frames={adult:document.getElementById('heartFrame')};
function ensure(which){if(!frames[which]){const f=document.createElement('iframe');f.id='fetalFrame';f.className='heart-frame';f.title='Circolazione fetale interattiva';f.loading='lazy';document.getElementById('v-heart').appendChild(f);frames[which]=f;}const f=frames[which];f.classList.add('heart-frame');if(!f.getAttribute('src')){f.addEventListener('load',sync);f.src=which==='adult'?'prototipo-cuore/index.html':'prototipo-cuore/fetale.html';}return f;}
function send(f,active){f.contentWindow?.postMessage({type:'iso-lab-visibility',active},location.origin);}
function sync(){for(const [key,f]of Object.entries(frames)){f.hidden=page!==key;send(f,view==='heart'&&key===page);}document.querySelectorAll('[data-heart-page]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.heartPage===page)));const physiology=document.getElementById('anatFrame');if(physiology)send(physiology,view==='anat');}
function select(which){if(!['adult','fetal'].includes(which))return;page=which;ensure(which);sync();}
document.querySelectorAll('[data-heart-page]').forEach(b=>b.addEventListener('click',()=>select(b.dataset.heartPage)));
window.addEventListener('message',e=>{if(e.origin!==location.origin)return;if(e.data?.type==='iso-lab-ready'){if(Object.values(frames).some(f=>f.contentWindow===e.source)||document.getElementById('anatFrame')?.contentWindow===e.source)sync();}if(e.data?.type==='iso-lab-page'&&Object.values(frames).some(f=>f.contentWindow===e.source))select(e.data.page);});
window.IsoAnatomyHost={show(next){const entering=next==='heart'&&view!=='heart';view=next;if(entering)window.scrollTo(0,0);if(view==='heart')ensure(page);sync();}};
})();
