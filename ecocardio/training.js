/* Model-specific acquisition exercises. Scores are geometric, never clinical
 * competence. Assistance is sticky for an attempt and cannot earn independent
 * completion by resetting to the target. The controller supplies observed data. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.EchoTraining=factory(root.EchoCore);})(typeof window!=='undefined'?window:globalThis,function(C){
'use strict';
const missions=[
 {id:'plax-align',level:'01 · GESTO',title:'Ritrova il lungo asse',view:'plax',kind:'pose',intro:'Correggi contatto e orientamento di una sonda fuori asse.',instruction:'Ritrova il riferimento PLAX con i controlli. Osserva come cambiano ventricolo sinistro, atrio sinistro e aorta.'},
 {id:'a4-align',level:'02 · GESTO',title:'Mantieni quattro camere',view:'a4c',kind:'pose',intro:'Lavora su inclinazione e rotazione nella finestra apicale.',instruction:'Riallinea la quattro camere. Usa i due atri e i due ventricoli come riferimenti spaziali.'},
 {id:'identify-lv',level:'03 · ANATOMIA',title:'Riconosci il ventricolo',view:'a4c',kind:'identify',answer:'ventriculus_sinister',intro:'Individua una struttura senza i nomi sovrapposti.',instruction:'Tocca una parete del ventricolo sinistro nell’eco, poi premi Verifica. I nomi restano nascosti durante il tentativo.'},
 {id:'identify-ao',level:'04 · ANATOMIA',title:'Segui l’aorta',view:'ssn',kind:'identify',answer:'arcus_aortae',intro:'Ritrova l’arco nella finestra soprasternale.',instruction:'Tocca la parete dell’arco aortico nel settore, poi premi Verifica. Distinguilo dagli altri vasi attraversati.'},
 {id:'biplane',level:'05 · SPAZIO',title:'Due piani, un’origine',view:'psax-pm',kind:'biplane',intro:'Esplora due tagli simultanei con la stessa sonda.',instruction:'Attiva Doppio piano, imposta 90° e cambia Rotazione di almeno 15°. Guarda i due tagli aggiornarsi insieme, poi verifica.'},
 {id:'gain',level:'06 · IMMAGINE',title:'Recupera i grigi',view:'plax',kind:'gain',intro:'Rendi leggibile un’immagine con guadagno eccessivo.',instruction:'Apri Ottimizza immagine e riduci il guadagno. Nel modello, una posizione fra 40 e 65 conserva grigi e cavità scure. Poi verifica.'},
 {id:'mmode',level:'07 · TEMPO',title:'Costruisci una linea M',view:'psax-pm',kind:'mmode',intro:'Scegli dove osservare il movimento nel tempo.',instruction:'Attiva M-mode, scegli una linea toccando il settore e lascia scorrere il ciclo per almeno due secondi. Poi verifica.'},
 {id:'cine',level:'08 · TEMPO',title:'Leggi il ciclo fermo',view:'a4c',kind:'cine',intro:'Confronta due fasi senza cambiare la sonda.',instruction:'Ferma il ciclo e scorri almeno un quarto della timeline. Osserva la variazione delle pareti; acquisisci un fotogramma, poi verifica.'}
];
function perturb(seed=1){
 let z=(seed*2654435761)>>>0;const next=()=>{z=(Math.imul(z,1664525)+1013904223)>>>0;return z/4294967296;};
 return {...C.defaults,slideX:(next()-.5)*.48,slideY:(next()-.5)*.4,rotation:Math.round((next()>.5?1:-1)*(15+next()*22)),fan:Math.round((next()>.5?1:-1)*(9+next()*11)),rock:Math.round((next()-.5)*24)};
}
function start(id,seed=1){const mission=missions.find(m=>m.id===id);if(!mission)throw Error('Esercizio non disponibile');return {mission,assisted:false,checks:0,finished:false,selected:null,phaseMin:Infinity,phaseMax:-Infinity,captured:false,lineChosen:false,biplaneMoved:false,started:Date.now(),initial:mission.kind==='pose'?perturb(seed):{...C.defaults}};}
function observe(session,event,value){if(!session||session.finished)return;
 if(event==='help')session.assisted=true;
 if(event==='select')session.selected=value;
 if(event==='phase'){session.phaseMin=Math.min(session.phaseMin,value);session.phaseMax=Math.max(session.phaseMax,value);}
 if(event==='capture')session.captured=true;
 if(event==='line')session.lineChosen=true;
 if(event==='biplane'&&Math.abs(value)>=15)session.biplaneMoved=true;
}
function check(session,context){
 if(!session)return {success:false,message:'Scegli un esercizio dal Percorso.'};
 session.checks++;const m=session.mission;let success=false,message='';
 if(context.view!==m.view)return {success:false,assisted:session.assisted,message:'Torna alla vista '+m.view.toUpperCase()+' per completare questo esercizio.'};
 switch(m.kind){
  case 'pose':{const a=C.alignment(context.state);success=a.reached&&context.contact!==false;message=success?'Allineamento al riferimento raggiunto.':'Il riferimento non è ancora raggiunto. '+(context.hint||'Correggi il movimento con lo scarto maggiore.');break;}
  case 'identify':success=session.selected===m.answer;message=success?'Struttura riconosciuta. Ritrovala ora nel cuore 3D.':'La struttura selezionata non è ancora quella richiesta. Confronta i rapporti fra camere e vasi.';break;
  case 'biplane':success=context.layout==='biplane'&&Math.abs(context.planeAngle-90)<=2&&session.biplaneMoved;message=success?'Hai confrontato due piani ortogonali con origine e asse centrale condivisi.':'Mostra i due piani a 90° e ruota la sonda di almeno 15°.';break;
  case 'gain':success=context.gain>=40&&context.gain<=65;message=success?'Il guadagno è tornato nell’intervallo di lavoro scelto per questo modello.':'Riduci il guadagno fino all’intervallo indicato e confronta pareti e cavità.';break;
  case 'mmode':success=context.layout==='mmode'&&session.lineChosen&&context.mDuration>=2000&&context.mSamples>=12;message=success?'Hai costruito una traccia da campioni successivi della linea scelta.':'Scegli la linea nel settore e lascia scorrere il ciclo per due secondi senza cambiare la sonda.';break;
  case 'cine':success=!context.playing&&session.phaseMax-session.phaseMin>=.25&&session.captured;message=success?'Hai confrontato fasi diverse dello stesso ciclo e conservato un fotogramma.':'Ferma il ciclo, scorri almeno un quarto della timeline e acquisisci un fotogramma.';break;
 }
 if(success){session.finished=true;message+=session.assisted?' Prova assistita: ripetila senza mostrare aiuti per completarla in autonomia.':' Prova completata senza mostrare il riferimento.';}
 return {success,assisted:session.assisted,message,checks:session.checks,mission:m.id};
}
const explanations={
 ventriculus_sinister:'Il ventricolo sinistro si continua con la mitrale verso l’atrio e con il tratto di efflusso verso l’aorta. Confronta A4C e PLAX: cambia il piano, la camera resta la stessa.',
 ventriculus_dexter:'Il ventricolo destro avvolge anteriormente parte del ventricolo sinistro. In asse corto il suo profilo è diverso dalla cavità sinistra: il doppio piano aiuta a capirne il motivo.',
 atrium_sinistrum:'L’atrio sinistro è posteriore e riceve le vene polmonari. Nel lungo asse si trova oltre la mitrale; dalla finestra apicale compare più lontano dalla sonda rispetto al ventricolo.',
 atrium_dextrum:'L’atrio destro riceve le vene cave e comunica con il ventricolo destro attraverso la tricuspide. Segui questi collegamenti nel modello, poi ritrovali nella sezione.',
 aorta_ascendens:'La radice e l’aorta ascendente sono in continuità con il tratto di efflusso sinistro. Una piccola variazione del piano può includerle o escluderle dalla vista apicale.',
 arcus_aortae:'L’arco collega aorta ascendente e discendente. Nella finestra soprasternale il fascio entra dall’alto: osserva il cambio di prospettiva rispetto alla parasternale.',
 vena_cava_inferior:'Segui il vaso fino all’atrio destro. Qui è disponibile il tratto toracico dell’atlante: non sono simulate la cava addominale completa e la variazione respiratoria.',
 vena_cava_superior:'La vena cava superiore entra nell’atrio destro dall’alto. Usa il modello 3D per distinguere il suo decorso da quello dell’aorta ascendente.',
 truncus_pulmonalis:'Il tronco polmonare origina dall’efflusso destro. La sua posizione anteriore rispetto all’aorta aiuta a orientarti nei tagli basali.'
};
return {missions,perturb,start,observe,check,explanations};
});
