/* Geometria condivisa dal localizzatore e dal settore Eco. Coordinate dell'atlante. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EcoSezioni = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const dot = (a,b) => a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const sub = (a,b) => a.map((x,i)=>x-b[i]);
  const unit = a => { const l=Math.hypot(...a); return a.map(x=>x/l); };
  const cross = (a,b) => [a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];
  const index = (a,i) => [a[i],a[i+1],a[i+2]];
  const minC = -.08, maxC = 1.2;

  // In deforma() lo spostamento assiale è lineare in c, il quadrato del
  // fattore radiale è affine in c. Si ricavano i coefficienti dallo stesso
  // campo utilizzato da lembi e reperi, anche nei quadri dilatato e acinetico.
  function movimento(mesh, G, deforma) {
    const n=mesh.nv, pos=new Float32Array(3*n), base=new Float64Array(3*n);
    const radial=new Float64Array(3*n), axial=new Float64Array(n), factor=new Float64Array(n);
    const axis=G.aC || G.axb, origin=G.oC || G.apice, ed=[0,0,0], es=[0,0,0];
    for(let i=0;i<n;i++) {
      const j=i*3, p=index(mesh.pos,j);
      deforma(G,p,0,ed); deforma(G,p,1,es);
      base.set(ed,j);
      const w=sub(ed,origin), z=dot(w,axis), dz=dot(sub(es,ed),axis);
      axial[i]=dz;
      let r2=0, prod=0;
      for(let k=0;k<3;k++) {
        const r=w[k]-axis[k]*z;
        radial[j+k]=r; r2+=r*r; prod+=r*(es[k]-ed[k]-axis[k]*dz);
      }
      const scale=r2>1e-20 ? 1+prod/r2 : 1;
      factor[i]=scale*scale-1;
    }
    const current={pos,tri:mesh.tri,nv:n};
    let previous=NaN;
    function aggiorna(c) {
      if(c===previous)return current;
      previous=c;
      for(let i=0,j=0;i<n;i++,j+=3) {
        const dr=Math.sqrt(Math.max(0,1+factor[i]*c))-1, dz=axial[i]*c;
        for(let k=0;k<3;k++)pos[j+k]=base[j+k]+dr*radial[j+k]+dz*axis[k];
      }
      return current;
    }
    // Scarta solo facce che rimangono interamente dallo stesso lato per
    // l'intero ciclo. Gli estremi radiali e assiali sono limitati separatamente.
    function candidati(P) {
      const sides=new Int8Array(n), dir=dot(P.n,axis), offset=dot(P.o,P.n);
      for(let i=0,j=0;i<n;i++,j+=3) {
        const d=base[j]*P.n[0]+base[j+1]*P.n[1]+base[j+2]*P.n[2]-offset;
        const r=radial[j]*P.n[0]+radial[j+1]*P.n[1]+radial[j+2]*P.n[2];
        const z=axial[i]*dir, a=r*(Math.sqrt(1+minC*factor[i])-1), b=r*(Math.sqrt(1+maxC*factor[i])-1);
        if(d+Math.min(z*minC,z*maxC)+Math.min(a,b)>1e-5)sides[i]=1;
        else if(d+Math.max(z*minC,z*maxC)+Math.max(a,b)<-1e-5)sides[i]=-1;
      }
      const result=[], tri=mesh.tri;
      for(let j=0;j<tri.length;j+=3) {
        const a=tri[j],b=tri[j+1],c=tri[j+2];
        if(!sides[a] || sides[a]!==sides[b] || sides[a]!==sides[c])result.push(a,b,c);
      }
      return new Uint32Array(result);
    }
    return {aggiorna,candidati};
  }

  // Approssimazione geometrica delle superfici, con commissure condivise.
  // Due lembi mitralici e tre lembi per le altre valvole. Nessun salto di
  // rappresentazione quando un taglio longitudinale diventa trasversale.
  function lembi(v) {
    const n=v.n, r=v.r, center=v.c;
    const ref=v.avanti ? sub(v.avanti,center) : v.cus && v.cus.length ? sub(v.cus[0],center) : (Math.abs(n[0])<.8?[1,0,0]:[0,1,0]);
    const ex=unit(ref.map((x,i)=>x-dot(ref,n)*n[i])), ey=cross(n,ex);
    const count=v.nome==='mitrale'?2:3, cols=16, rows=5, leaves=[];
    const angles=v.tipo==='sl' && v.cus?.length===3 ? v.cus.map(p=>{const d=sub(p,center);return Math.atan2(dot(d,ey),dot(d,ex));}).sort((a,b)=>a-b) : Array.from({length:count},(_,i)=>i*2*Math.PI/count);
    const boundaries=angles.map((a,i)=>(a+(i?angles[i-1]:angles.at(-1)-2*Math.PI))/2);
    for(let leaf=0;leaf<count;leaf++) {
      const left=boundaries[leaf], right=leaf+1<count?boundaries[leaf+1]:boundaries[0]+2*Math.PI;
      const closed=[],open=[],tri=[];
      for(let row=0;row<=rows;row++)for(let col=0;col<=cols;col++) {
        const u=col/cols,t=row/rows,a=left+(right-left)*u;
        const hinge=[Math.cos(a),Math.sin(a)], edge=u<=.5?left:right;
        const side=Math.abs(2*u-1), belly=Math.sin(Math.PI*u);
        // Coaptazione mitralica lungo una linea, semilunari e tricuspide su tre raggi.
        const tip=[Math.cos(edge)*side,Math.sin(edge)*side];
        if(count===2)tip[0]-=.14*(1-side);
        // Sospensione semilunare: nadir al centro della cuspide e
        // commissure più alte. L'inserzione resta la stessa nelle due pose.
        const semi=v.tipo==='sl', inserzione=semi?.47*side*side:.075*Math.cos(2*a);
        const bordoChiuso=semi?.35+.12*side:.20*(1-side)+.075*side*Math.cos(2*edge);
        const hClosed=(1-t)*inserzione+t*bordoChiuso+.18*Math.sin(Math.PI*t)*belly;
        const hOpen=inserzione*(1-t*belly)+t*belly*(semi?.82:leaf===0?1.1:.87);
        const openRad=1-(semi?.18:.23)*t*belly;
        for(let k=0;k<3;k++) {
          closed.push(center[k]+r*((hinge[0]*(1-t)+tip[0]*t)*ex[k]+(hinge[1]*(1-t)+tip[1]*t)*ey[k]+hClosed*n[k]));
          open.push(center[k]+r*(openRad*(hinge[0]*ex[k]+hinge[1]*ey[k])+hOpen*n[k]));
        }
        if(row<rows&&col<cols) {
          const i=row*(cols+1)+col, j=i+cols+1;
          tri.push(i,j,i+1,i+1,j,j+1);
        }
      }
      leaves.push({cols,rows,chiuso:new Float32Array(closed),aperto:new Float32Array(open),pos:new Float32Array(open.length),tri:new Uint32Array(tri),nv:open.length/3});
    }
    return leaves;
  }
  function animaLembo(leaf,G,c,opening,deforma) {
    const p=[0,0,0],q=[0,0,0];
    for(let j=0;j<leaf.pos.length;j+=3) {
      for(let k=0;k<3;k++)p[k]=leaf.chiuso[j+k]+opening*(leaf.aperto[j+k]-leaf.chiuso[j+k]);
      deforma(G,p,c,q);leaf.pos.set(q,j);
    }
  }

  // Riempi solo pareti delimitate da due anelli effettivamente annidati.
  // Un anello isolato può essere il lume di un vaso intersecato.
  function paretiAnnidate(catene, P) {
    const loops=catene.filter(ch=>ch.chiusa && ch.p.length>=9).map(ch=>{
      const xy=[];
      for(let j=0;j<ch.p.length;j+=3) {
        const p=sub(index(ch.p,j),P.o);xy.push([dot(p,P.u),dot(p,P.d)]);
      }
      let area=0;
      for(let i=0,j=xy.length-1;i<xy.length;j=i++)area+=xy[j][0]*xy[i][1]-xy[i][0]*xy[j][1];
      return {ch,xy,area:Math.abs(area)};
    });
    const contains=(poly,[x,y])=>{
      let inside=false;
      for(let i=0,j=poly.length-1;i<poly.length;j=i++){
        const a=poly[j],b=poly[i];
        if((a[1]>y)!==(b[1]>y) && x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0])inside=!inside;
      }
      return inside;
    };
    const walls=new Set();
    for(const a of loops)for(const b of loops)if(a.area>b.area && contains(a.xy,b.xy[0])){walls.add(a.ch);walls.add(b.ch);}
    return [...walls];
  }
  function visibile(x,z,P,mezzo,ombre) {
    const r=Math.hypot(x,z),ang=Math.atan2(x,z);
    if(z<=0 || r>P.prof || Math.abs(ang)>=mezzo)return false;
    if(!ombre)return true;
    const bin=Math.min(ombre.length-1,Math.floor((ang+mezzo)/(2*mezzo)*ombre.length));
    return r<=ombre[bin];
  }
  return {movimento,lembi,animaLembo,paretiAnnidate,visibile};
});