/* Nomenclatura e preset del laboratorio ecocardio.
 * Finestre e manovre: ASE 2019, DOI 10.1016/j.echo.2018.06.004;
 * BSE 2020, DOI 10.1530/ERP-20-0026. Testi riformulati.
 * Coordinate, angoli relativi, soglie esercizio e profondità sono parametri
 * grafici calibrati sull'atlante, NON misure/range fisiologici né competenza.
 */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory(require('./core.js'));else root.EchoViews=factory(root.EchoCore);})(typeof window!=='undefined'?window:globalThis,function(C){
'use strict';
const dictionary={
 'Right atrium':{id:'atrium_dextrum',label:'Atrio destro',short:'AD',color:'#74b1c6'},
 'Left atrium':{id:'atrium_sinistrum',label:'Atrio sinistro',short:'AS',color:'#e9a5a0'},
 'Right ventricle':{id:'ventriculus_dexter',label:'Ventricolo destro',short:'VD',color:'#81b8c8'},
 'Left ventricle':{id:'ventriculus_sinister',label:'Ventricolo sinistro',short:'VS',color:'#dd8790'},
 'Ascending aorta':{id:'aorta_ascendens',label:'Aorta ascendente',short:'Ao',color:'#e7ae7d'},
 'Aortic arch':{id:'arcus_aortae',label:'Arco aortico',short:'Arco',color:'#e7ae7d'},
 'Aorta thoracica descendens':{id:'aorta_thoracica_descendens',label:'Aorta discendente',short:'Ao desc.',color:'#e7ae7d'},
 'Inferior vena cava (thoracic part)':{id:'vena_cava_inferior',label:'Vena cava inferiore',short:'VCI',color:'#82a8ce'},
 'Superior vena cava':{id:'vena_cava_superior',label:'Vena cava superiore',short:'VCS',color:'#82a8ce'},
 'Pulmonary trunk':{id:'truncus_pulmonalis',label:'Tronco polmonare',short:'TP',color:'#85a8c9'},
 'Posterior leaflet of left atrioventricular valve':{id:'valva_atrioventricularis_sinistra_cuspis_posterior',label:'Mitrale · lembo posteriore',short:'M',color:'#f0dbad'},
 'Inferior leaflet of right atrioventricular valve':{id:'valva_atrioventricularis_dextra_cuspis_inferior',label:'Tricuspide · lembo inferiore',short:'T',color:'#f0dbad'},
 'Septal leaflet of right atrioventricular valve':{id:'valva_atrioventricularis_dextra_cuspis_septalis',label:'Tricuspide · lembo settale',short:'T',color:'#f0dbad'},
 'Left coronary leaflet':{id:'valva_aortae_valvula_semilunaris_sinistra',label:'Valvola aortica · cuspide sinistra',short:'VAo',color:'#f0dbad'},
 'Right coronary leaflet':{id:'valva_aortae_valvula_semilunaris_dextra',label:'Valvola aortica · cuspide destra',short:'VAo',color:'#f0dbad'},
 'Non-coronary leaflet':{id:'valva_aortae_valvula_semilunaris_posterior',label:'Valvola aortica · cuspide non coronarica',short:'VAo',color:'#f0dbad'}
};
const groups=[{id:'para',name:'Parasternale'},{id:'apical',name:'Apicale'},{id:'sub',name:'Sottocostale'},{id:'ssn',name:'Soprasternale'}];
// Shared semantic keys for every additional source structure displayed by this
// module. Source names are aliases, never the learner-facing nomenclature.
for(const [name,id,label,short,color] of [
 ['Inferior papillary muscle of right ventricle','musculus_papillaris_inferior_ventriculi_dextri','Papillare inferiore del VD','Pap VD','#d9c598'],
 ['Anterior papillary muscle of right ventricle','musculus_papillaris_anterior_ventriculi_dextri','Papillare anteriore del VD','Pap VD','#d9c598'],
 ['Septal papillary muscle of right ventricle','musculus_papillaris_septalis','Papillare settale del VD','Pap VD','#d9c598'],
 ['Inferior papillary muscle of left ventricle','musculus_papillaris_inferior_ventriculi_sinistri','Papillare inferiore del VS','Pap VS','#d9c598'],
 ['Anterior semilunar leaflet of pulmonary valve','valva_trunci_pulmonalis_valvula_semilunaris_anterior','Polmonare · cuspide anteriore','VP','#d9c598'],
 ['Left semilunar leaflet of pulmonary valve','valva_trunci_pulmonalis_valvula_semilunaris_sinistra','Polmonare · cuspide sinistra','VP','#d9c598'],
 ['Right semilunar leaflet of pulmonary valve','valva_trunci_pulmonalis_valvula_semilunaris_dextra','Polmonare · cuspide destra','VP','#d9c598'],
 ['Left pulmonary artery','arteria_pulmonalis_sinistra','Arteria polmonare sinistra','AP sx','#85a8c9'],
 ['Right pulmonary artery','arteria_pulmonalis_dextra','Arteria polmonare destra','AP dx','#85a8c9'],
 ['Left superior pulmonary vein','vena_pulmonalis_superior_sinistra','Vena polmonare superiore sinistra','VP sx','#d89598'],
 ['Left inferior pulmonary vein','vena_pulmonalis_inferior_sinistra','Vena polmonare inferiore sinistra','VP sx','#d89598'],
 ['Right superior pulmonary vein','vena_pulmonalis_superior_dextra','Vena polmonare superiore destra','VP dx','#d89598'],
 ['Right inferior pulmonary vein','vena_pulmonalis_inferior_dextra','Vena polmonare inferiore destra','VP dx','#d89598'],
 ['Truncus brachiocephalicus','truncus_brachiocephalicus','Tronco brachiocefalico','TBC','#e7ae7d'],
 ['Arteria carotis communis sinistra','arteria_carotis_communis_sinistra','Carotide comune sinistra','CC sx','#e7ae7d'],
 ['Arteria subclavia sinistra','arteria_subclavia_sinistra','Succlavia sinistra','SC sx','#e7ae7d'],
 ['botallo','ligamentum_arteriosum','Legamento arterioso','LA','#cdbba4']
])dictionary[name]={id,label,short,color};
const plax={origin:[.10,.65,1.90],target:[.22,-.45,-.12],right:[-.67,1.51,-.76],depth:3.75};
const apical={origin:[1.14,-1.93,.79],target:[.17,.26,-.31],right:[.6,.12,-.55],depth:4.0};
function psax(center){const normal=C.unit([.67,-1.51,.76]),origin=[.12,0,1.9];origin[1]=center[1]-(normal[0]*(origin[0]-center[0])+normal[2]*(origin[2]-center[2]))/normal[1];const d=C.unit(C.sub(center,origin));let right=C.unit(C.cross(d,normal));if(right[0]<0)right=C.mul(right,-1);return {origin,target:center,right,depth:3.75};}
function apicalRotation(deg){const f=C.frame(apical.origin,apical.target,apical.right);return {...apical,right:C.rotate(f.u,f.d,deg)};}
const views=[
 {id:'plax',group:'para',code:'PLAX',title:'Asse lungo parasternale',...plax,focus:['ventriculus_sinister','atrium_sinistrum','aorta_ascendens'],tip:'Marker verso la spalla destra. Cerca la continuità fra ventricolo sinistro, mitrale e radice aortica.',learn:'Il settore è una fetta del cuore: ruotando la sonda cambi le strutture attraversate, anche senza spostare il punto di contatto.'},
 {id:'psax-ao',group:'para',code:'PSAX · Ao',title:'Asse corto · livello aortico',...psax([-.15,.29,-.07]),focus:['aorta_ascendens','ventriculus_dexter'],tip:'Dalla parasternale lunga ruota verso la spalla sinistra, poi orienta il fascio verso la base.',learn:'Confronta questo taglio basale con quello ai muscoli papillari: il nome della finestra è lo stesso, ma cambia il livello attraversato.'},
 {id:'psax-mv',group:'para',code:'PSAX · M',title:'Asse corto · livello mitralico',...psax([.26,-.19,-.28]),focus:['ventriculus_sinister','ventriculus_dexter'],tip:'Inclina il fascio dalla base verso la mitrale mantenendo l’orientamento dell’asse corto.',learn:'Scorri i livelli dell’asse corto e osserva la posizione della cavità sinistra rispetto al ventricolo destro.'},
 {id:'psax-pm',group:'para',code:'PSAX · Pap',title:'Asse corto · muscoli papillari',...psax([.58,-.73,.12]),focus:['ventriculus_sinister','ventriculus_dexter'],tip:'Prosegui l’inclinazione verso l’apice fino al livello dei muscoli papillari.',learn:'I papillari appartengono al ventricolo: nel taglio trasversale appaiono come isole di tessuto all’interno della cavità.'},
 {id:'a4c',group:'apical',code:'A4C',title:'Apicale quattro camere',...apical,focus:['ventriculus_sinister','ventriculus_dexter','atrium_dextrum','atrium_sinistrum'],tip:'Parti dall’itto apicale e dirigi il fascio verso la base del cuore.',learn:'Qui il fascio entra dall’apice: i ventricoli sono più vicini alla sonda degli atri. Prova un’inclinazione e osserva quali cavità perdi.'},
 {id:'a5c',group:'apical',code:'A5C',title:'Apicale cinque camere',...apicalRotation(-15),target:[-.15,.29,-.03],focus:['ventriculus_sinister','aorta_ascendens'],tip:'Dalla quattro camere inclina il fascio anteriormente per includere il tratto di efflusso sinistro.',learn:'La “quinta camera” è il tratto di efflusso con la radice aortica: il cuore conserva le sue quattro camere.'},
 {id:'a2c',group:'apical',code:'A2C',title:'Apicale due camere',...apicalRotation(-75),focus:['ventriculus_sinister','atrium_sinistrum'],tip:'Ruota dalla quattro camere mantenendo il contatto apicale.',learn:'Segui il ventricolo e l’atrio sinistri mentre ruoti: il cuore destro esce progressivamente dal piano.'},
 {id:'a3c',group:'apical',code:'A3C',title:'Apicale tre camere',...apicalRotation(30),focus:['ventriculus_sinister','atrium_sinistrum','aorta_ascendens'],tip:'Prosegui la rotazione apicale fino a includere mitrale e radice aortica.',learn:'Ritrovi le strutture del lungo asse da un punto di osservazione diverso. Confronta dove entra il fascio in PLAX e in A3C.'},
 {id:'sc4c',group:'sub',code:'SC4C',title:'Sottocostale quattro camere',origin:[-.15,-2.7,1.45],target:[-.15,-.05,-.12],right:[1,.1,0],depth:5.0,focus:['ventriculus_sinister','ventriculus_dexter','atrium_dextrum','atrium_sinistrum'],tip:'Sonda sotto lo xifoide, paziente supino; orienta il fascio verso il cuore attraverso la finestra epatica.',learn:'Il punto di ingresso cambia la disposizione sullo schermo. Il piano resta collegato alla stessa anatomia tridimensionale.'},
 {id:'ivc',group:'sub',code:'VCI',title:'Cava inferiore · tratto toracico',origin:[-.65,-2.8,1.4],target:[-.65,-.55,-.12],right:[0,1,0],depth:4.7,focus:['vena_cava_inferior','atrium_dextrum'],tip:'Dalla sottocostale orienta il taglio lungo la cava, seguendone l’arrivo nell’atrio destro.',learn:'L’atlante disponibile comprende il tratto toracico: questa vista non riproduce la cava addominale completa né la sua variazione respiratoria.'},
 {id:'ssn',group:'ssn',code:'Arco',title:'Soprasternale · arco aortico',origin:[-.15,3.35,.55],target:[-.12,1.08,-.55],right:[0,.1,-1],depth:4.4,focus:['arcus_aortae','aorta_ascendens','aorta_thoracica_descendens'],tip:'Accedi dalla fossetta giugulare e orienta il fascio lungo l’arco, con il collo esteso.',learn:'L’arco prosegue dall’aorta ascendente alla discendente. Il piano in 3D aiuta a capire perché le due estremità compaiono nello stesso settore.'}
];
// Revised A4C plane includes both atrial bodies. This registration is geometric,
// not a validated clinical acquisition. The same plane is used in both displays.
const four=views.find(v=>v.id==='a4c'),fourPose=C.pose(four,{rotation:10,fan:-10});
four.target=C.add(fourPose.origin,C.mul(fourPose.d,2.5));four.right=fourPose.u;
const sources=[{title:'ASE · Esame ecocardiografico transtoracico, 2019',href:'https://www.asecho.org/wp-content/uploads/2019/01/2019_Comprehensive-TTE.pdf'},{title:'BSE · Minimum dataset, 2020',href:'https://pmc.ncbi.nlm.nih.gov/articles/PMC7923056/'}];
return {dictionary,groups,views,sources};
});
