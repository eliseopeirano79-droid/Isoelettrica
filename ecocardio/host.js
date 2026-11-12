/* Modulo di navigazione caricato con la shell; il laboratorio parte soltanto
 * all'apertura della sezione, conserva lo stato e si sospende quando è nascosto. */
(function(){'use strict';
const section=document.getElementById('v-echo');if(!section)return;let frame;
function sync(){const active=section.classList.contains('on');if(active&&!frame){frame=document.createElement('iframe');frame.id='echoFrame';frame.title='Laboratorio di ecocardiografia interattivo';frame.src='ecocardio/index.html';frame.style.cssText='width:100%;height:calc(100dvh - 82px);min-height:650px;border:0;display:block;';frame.addEventListener('load',sync);section.append(frame);}frame?.contentWindow?.postMessage({type:'iso-echo-visibility',active,theme:document.documentElement.dataset.theme||'dark'},location.origin);}
new MutationObserver(sync).observe(section,{attributes:true,attributeFilter:['class']});new MutationObserver(sync).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===frame?.contentWindow&&e.data?.type==='iso-echo-ready')sync();});
sync();
})();
