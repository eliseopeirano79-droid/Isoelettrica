/* Strumenti di studio per la scheda Eco. Le due viste usano le superfici
   del fotogramma corrente, nelle stesse coordinate del settore principale. */
(function(root) {
  'use strict';
  const dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]];
  const unit=a=>{const l=Math.hypot(...a)||1;return a.map(x=>x/l);};
  const cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  function collega(panel, api) {
    const $=q=>panel.querySelector(q), cine=$('#ecoCine'), percent=$('#ecoCineV');
    const studio=$('#ecoStudio'), modo=$('#ecoStudioModo'), cv=$('#ecoStudioTela'), lista=$('#ecoAcquisizioni');
    const status=$('#ecoAcqStato'), key='isoelettrica.eco.acquisizioni.v1';
    let prese=[], ultimo=null;
    try {
      const saved=JSON.parse(localStorage.getItem(key)||'[]');
      if(Array.isArray(saved))prese=saved.filter(p=>p && typeof p.label==='string' && typeof p.img==='string' && p.img.startsWith('data:image/jpeg;base64,') && p.pose).slice(0,4);
    } catch(_) {}
    function salva() {
      try {localStorage.setItem(key,JSON.stringify(prese));status.textContent='';}
      catch(_) {status.textContent='Memoria del browser indisponibile. Le immagini restano in questa sessione.';}
    }
    function elenco() {
      lista.replaceChildren();
      for(const p of prese) {
        const fig=document.createElement('figure'), im=new Image(), cap=document.createElement('figcaption');
        im.src=p.img; im.alt=p.label; cap.textContent=p.label;
        const restore=document.createElement('button');restore.type='button';restore.textContent='Ripristina posa';
        restore.onclick=()=>{if(!api.ripristina(p.pose))status.textContent='Posa incompatibile con questa sessione.';};
        const rm=document.createElement('button');rm.type='button';rm.textContent='Rimuovi';
        rm.onclick=()=>{prese=prese.filter(x=>x!==p);salva();elenco();};
        fig.append(im,cap,restore,rm);lista.append(fig);
      }
      $('#ecoAcquisisci').disabled=prese.length>=4;
    }
    elenco();
    $('#ecoAcquisisci').onclick=()=>{
      if(prese.length>=4)return;
      const p=api.acquisisci();if(!p)return;
      prese.push(p);salva();elenco();
    };
    cine.oninput=()=>api.ferma(Number(cine.value)/1000);
    modo.onchange=()=>{ ultimo=null; };
    studio.ontoggle=()=>{ultimo=null;};
    function disegna(s) {
      const f=Math.round(s.fase*1000);
      cine.value=f;percent.textContent=(f/10).toFixed(1)+'%';
      if(!studio.open || (ultimo && ultimo.P===s.P && ultimo.fase===s.fase && ultimo.les===s.les && ultimo.q===s.G.q && ultimo.c===s.c && ultimo.modo===modo.value))return;
      ultimo={P:s.P,fase:s.fase,les:s.les,q:s.G.q,c:s.c,modo:modo.value};
      const g=cv.getContext('2d'), w=cv.width,h=cv.height;
      g.fillStyle='#091118';g.fillRect(0,0,w,h);
      if(modo.value==='biplano') {
        const p=api.ortogonale(s.P), k=(h-18)/p.prof, x=w/2,y=6;
        g.save();g.beginPath();g.moveTo(x,y);g.arc(x,y,k*p.prof,Math.PI/4,3*Math.PI/4);g.closePath();g.clip();
        for(const item of s.parti) {
          for(const ch of api.taglia(item,p.o,p.n,true)) {
            g.beginPath();
            for(let j=0;j<ch.p.length;j+=3){
              const v=sub(ch.p.subarray(j,j+3),p.o),u=x+k*dot(v,p.u),z=y+k*dot(v,p.d);
              if(j)g.lineTo(u,z);else g.moveTo(u,z);
            }
            if(ch.chiusa)g.closePath();g.strokeStyle=item.valvola?'#ffd785':'#b9d8dd';g.lineWidth=item.valvola?2:1;g.stroke();
          }
        }
        g.restore();return;
      }
      const i=s.valvole.findIndex(v=>v.nome===modo.value);if(i<0)return;
      const v=s.valvole[i],leaflets=s.lembi[i], forward=v.avanti || v.cus[0], delta=sub(forward,v.c);
      const y=unit(delta.map((x,i)=>x-dot(delta,v.n)*v.n[i])),x=unit(cross(y,v.n));
      const k=Math.min(w,h)*.40/v.r, faces=[];
      leaflets.forEach((leaf,id)=>{
        const pts=[];
        for(let j=0;j<leaf.pos.length;j+=3) {
          const d=sub(leaf.pos.subarray(j,j+3),v.c);
          pts.push([w/2+k*dot(d,x),h/2-k*dot(d,y),dot(d,v.n)]);
        }
        for(let j=0;j<leaf.tri.length;j+=3) {
          const a=pts[leaf.tri[j]],b=pts[leaf.tri[j+1]],c=pts[leaf.tri[j+2]];
          faces.push({a,b,c,id,z:a[2]+b[2]+c[2]});
        }
      });
      // Vista dal lato di ingresso per le AV e dal vaso per le semilunari.
      faces.sort((a,b)=>v.tipo==='av'?b.z-a.z:a.z-b.z);
      const colori=['#d29b75','#ecd1aa','#ae866e'];
      for(const {a,b,c,id} of faces) {
        g.fillStyle=g.strokeStyle=colori[id];g.lineWidth=.65;
        g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.lineTo(c[0],c[1]);g.closePath();g.fill();g.stroke();
      }
    }
    return {disegna};
  }
  root.EcoStudio={collega};
})(window);