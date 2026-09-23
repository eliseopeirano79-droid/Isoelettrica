/* A hidden embedded laboratory does not run its render loop. Standalone pages
   keep their original header and links. Accept messages only from own parent. */
(function(){
'use strict';
const embedded=window.parent!==window;window.IsoLabEmbedded={active:!embedded};if(!embedded)return;
document.documentElement.classList.add('embedded');
window.addEventListener('message',e=>{if(e.source!==window.parent||e.origin!==location.origin)return;if(e.data?.type==='iso-lab-visibility')window.IsoLabEmbedded.active=e.data.active===true;});
document.addEventListener('click',e=>{const a=e.target.closest('header a');if(!a)return;const next=a.getAttribute('href');if(next==='fetale.html'||next==='./'||next==='../'){e.preventDefault();parent.postMessage({type:'iso-lab-page',page:next==='fetale.html'?'fetal':'adult'},location.origin);}});
parent.postMessage({type:'iso-lab-ready'},location.origin);
})();
