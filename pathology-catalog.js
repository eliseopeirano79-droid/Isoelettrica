/* Original educational summaries; references are linked per family.
 * 'localization' explicitly means that no pathological geometry/hemodynamics
 * has yet been implemented. Never label a catalog entry as a simulation. */
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.IsoPathologyCatalog=factory();})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';
const refs={congenital:'https://www.cdc.gov/heart-defects/about/specific-heart-defects.html',muscle:'https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/cardiomyopathy/',valves:'https://www.escardio.org/guidelines/clinical-practice-guidelines/all-esc-practice-guidelines/valvular-heart-disease/',electrical:'https://www.escardio.org/communities/councils/cardiology-practice/scientific-documents-and-publications/ejournal/volume-21/ablation-of-accessory-pathways-indications-and-contraindications/'};
const rows=[
 ['pda','Congenite · shunt','Dotto arterioso pervio · Botallo','botallo','Persiste la comunicazione tra arteria polmonare e aorta. Nell’adulto il verso dello shunt dipende dal gradiente di pressione.','duct'],
 ['pfo','Congenite · shunt','Forame ovale pervio','fossa-ovalis','Mancata fusione della valvola del forame ovale; non equivale alla perdita di tessuto di un difetto interatriale.'],
 ['asd2','Congenite · shunt','Difetto interatriale ostium secundum','septum-atrial','Comunicazione nella regione della fossa ovale, con possibile sovraccarico delle sezioni destre.'],
 ['asd1','Congenite · shunt','Difetto interatriale ostium primum','septum-atrial','Difetto inferiore del setto atriale nello spettro dei difetti del setto atrioventricolare.'],
 ['sinusvenosus','Congenite · shunt','Difetto del seno venoso','Superior vena cava','Comunicazione vicino allo sbocco cavale, spesso associata a ritorno venoso polmonare anomalo.'],
 ['unroofed','Congenite · shunt','Seno coronarico senza tetto','Coronary sinus','Comunicazione tra seno coronarico e atrio sinistro per difetto della parete che li separa.'],
 ['vsdperi','Congenite · shunt','Difetto interventricolare perimembranoso','septum-vent','Comunicazione presso il setto membranoso, in prossimità del sistema di conduzione.'],
 ['vsdmuscle','Congenite · shunt','Difetto interventricolare muscolare','septum-vent','Comunicazione nel setto muscolare; può essere unica oppure multipla.'],
 ['vsdinlet','Congenite · shunt','Difetto interventricolare di inlet','Septal leaflet of right atrioventricular valve','Difetto del setto nella porzione di afflusso ventricolare.'],
 ['vsdoutlet','Congenite · shunt','Difetto interventricolare di outlet','Pulmonary trunk','Comunicazione nella regione di efflusso, vicina alle valvole semilunari.'],
 ['avsd','Congenite · shunt','Canale atrioventricolare completo','annulus-tricuspid','Giunzione atrioventricolare comune con difetti dei setti atriale e ventricolare e apparato valvolare comune.'],
 ['avsdpartial','Congenite · shunt','Canale atrioventricolare parziale','annulus-mitral','Difetto del setto atrioventricolare con orifizi valvolari separati; la componente valvolare sinistra può essere insufficiente.'],
 ['apwindow','Congenite · shunt','Finestra aortopolmonare','Ascending aorta','Comunicazione fra aorta e arteria polmonare con due valvole semilunari distinte.'],
 ['fallot','Congenite · connessioni','Tetralogia di Fallot','Right ventricle','Associa difetto interventricolare, aorta a cavaliere, ostruzione dell’efflusso destro e ipertrofia ventricolare destra.'],
 ['tga','Congenite · connessioni','Trasposizione delle grandi arterie','Ascending aorta','Discordanza ventricoloarteriosa: i due circoli sono in parallelo; la sopravvivenza dipende dalla mescolanza.'],
 ['cctga','Congenite · connessioni','Trasposizione congenitamente corretta','Right ventricle','Discordanza atrioventricolare e ventricoloarteriosa: il ventricolo morfologicamente destro sostiene il circolo sistemico.'],
 ['dorv','Congenite · connessioni','Ventricolo destro a doppia uscita','Right ventricle','Entrambe le grandi arterie originano prevalentemente dal ventricolo destro; la fisiologia dipende dai rapporti con il difetto settale.'],
 ['truncus','Congenite · connessioni','Tronco arterioso comune','Ascending aorta','Un unico tronco arterioso fornisce circolo sistemico, polmonare e coronarico.'],
 ['hlhs','Congenite · connessioni','Sindrome del cuore sinistro ipoplasico','Left ventricle','Sviluppo insufficiente delle strutture sinistre, con circolazione sistemica neonatale dipendente dal dotto.'],
 ['singlevent','Congenite · connessioni','Cuore funzionalmente univentricolare','Left ventricle','Un solo ventricolo sostiene funzionalmente la circolazione; comprende anatomie differenti.'],
 ['doubleinlet','Congenite · connessioni','Ventricolo a doppia entrata','annulus-mitral','Entrambe le connessioni atrioventricolari raggiungono prevalentemente la stessa camera ventricolare.'],
 ['ebstein','Congenite · valvole','Anomalia di Ebstein','annulus-tricuspid','Dislocazione apicale dei lembi settale e inferiore della tricuspide, con atrializzazione di parte del ventricolo destro.'],
 ['tricuspatresia','Congenite · valvole','Atresia della tricuspide','annulus-tricuspid','Manca una connessione atrioventricolare destra pervia; è necessaria una comunicazione interatriale.'],
 ['pulmatresia','Congenite · valvole','Atresia polmonare','annulus-pulmonary','Assenza di una via di efflusso polmonare pervia; distinguere i quadri con setto integro e con DIV.'],
 ['mitralatresia','Congenite · valvole','Atresia mitralica','annulus-mitral','Manca una connessione atrioventricolare sinistra pervia; anatomia e circoli associati determinano il quadro.'],
 ['bicuspid','Congenite · valvole','Valvola aortica bicuspide','annulus-aortic','Due cuspidi funzionali; può associarsi a stenosi, insufficienza e dilatazione dell’aorta.'],
 ['parachute','Congenite · valvole','Mitrale a paracadute','annulus-mitral','Corde tendinee convergenti su un unico muscolo papillare dominante, con possibile ostruzione all’afflusso.'],
 ['cleftmitral','Congenite · valvole','Cleft della mitrale','rig-mitral-0','Fessura del lembo mitralico con possibile rigurgito; distinguere la zona di apposizione nel canale AV.'],
 ['coarct','Congenite · vasi','Coartazione aortica','Aortic arch','Restringimento dell’aorta, tipicamente nella regione dell’istmo.'],
 ['iaa','Congenite · vasi','Interruzione dell’arco aortico','Aortic arch','Discontinuità anatomica fra porzioni dell’arco aortico.'],
 ['doublearch','Congenite · vasi','Doppio arco aortico','Aortic arch','Anello vascolare che può circondare e comprimere trachea ed esofago.'],
 ['rightarch','Congenite · vasi','Arco aortico destro','Aortic arch','Variante del decorso dell’arco; i rapporti con i rami e il legamento possono creare un anello vascolare.'],
 ['pulmsling','Congenite · vasi','Sling dell’arteria polmonare','Left pulmonary artery','Origine anomala dell’arteria polmonare sinistra dalla destra con decorso vicino alle vie aeree.'],
 ['tapvr','Congenite · vasi','Ritorno venoso polmonare anomalo totale','Left atrium','Tutte le vene polmonari drenano nel circolo venoso sistemico; è necessaria una comunicazione interatriale.'],
 ['papvr','Congenite · vasi','Ritorno venoso polmonare anomalo parziale','Right superior pulmonary vein','Una parte delle vene polmonari drena fuori dall’atrio sinistro.'],
 ['scimitar','Congenite · vasi','Sindrome della scimitarra','Right inferior pulmonary vein','Ritorno polmonare destro anomalo verso la cava inferiore, con possibili anomalie polmonari associate.'],
 ['plsvc','Congenite · vasi','Persistenza della cava superiore sinistra','Coronary sinus','Persistenza di una vena sistemica sinistra che spesso drena nel seno coronarico.'],
 ['cortriat','Congenite · camere','Cor triatriatum','Left atrium','Membrana che suddivide una camera atriale e può ostacolarne il flusso.'],
 ['dextro','Congenite · camere','Destrocardia','apex','Posizione del cuore con apice a destra; occorre descrivere separatamente situs e connessioni.'],
 ['heterotaxy','Congenite · camere','Eterotassia e isomerismo atriale','Right atrium','Disposizione laterale anomala degli organi e delle strutture cardiache, con combinazioni variabili.'],
 ['alcapa','Coronarie · anomalie','Origine della coronaria sinistra dalla polmonare · ALCAPA','Left coronary artery','La coronaria sinistra origina dal circolo polmonare anziché dall’aorta.'],
 ['arcapa','Coronarie · anomalie','Origine della coronaria destra dalla polmonare · ARCAPA','Right coronary artery','La coronaria destra origina dall’arteria polmonare.'],
 ['aaoCA','Coronarie · anomalie','Origine coronarica dal seno opposto','Left coronary artery','Il rischio dipende anche dal decorso prossimale, dall’ostio e dall’eventuale tratto intramurale.'],
 ['fistula','Coronarie · anomalie','Fistola coronarica','Right coronary artery','Connessione anomala tra coronaria e camera cardiaca o altro vaso.'],
 ['bridge','Coronarie · anomalie','Ponte miocardico','Anterior interventricular artery','Un segmento coronarico decorre nel miocardio e può essere compresso in sistole.'],
 ['aneurysmcor','Coronarie · anomalie','Aneurisma coronarico','Right coronary artery','Dilatazione focale di un segmento coronarico; le cause sono diverse.'],
 ['hcm','Miocardio','Cardiomiopatia ipertrofica','septum-vent','Ispessimento miocardico non spiegato esclusivamente dal carico; può interessare setto, apice o altri segmenti.'],
 ['dcm','Miocardio','Cardiomiopatia dilatativa','Left ventricle','Dilatazione ventricolare con disfunzione sistolica, da valutare nel contesto eziologico.'],
 ['rcm','Miocardio','Cardiomiopatia restrittiva','Left ventricle','Ridotta distensibilità ventricolare e alterazione del riempimento; la geometria può non essere dilatata.'],
 ['arvc','Miocardio','Cardiomiopatia aritmogena','Right ventricle','Substrato miocardico che favorisce aritmie e disfunzione; può coinvolgere anche il ventricolo sinistro.'],
 ['ndlv','Miocardio','Cardiomiopatia ventricolare sinistra non dilatata','Left ventricle','Fenotipo con cicatrice o disfunzione sinistra senza dilatazione, secondo la classificazione ESC.'],
 ['trabeculation','Miocardio','Ipertrabecolazione ventricolare','Left ventricle','Prominenza delle trabecole: reperto morfologico che richiede interpretazione clinica, non una diagnosi autonoma in ogni caso.'],
 ['amyloid','Miocardio','Amiloidosi cardiaca','Left ventricle','Deposito extracellulare che può aumentare lo spessore delle pareti e alterare funzione e conduzione.'],
 ['sarcoid','Miocardio','Sarcoidosi cardiaca','septum-vent','Interessamento infiammatorio e cicatriziale a distribuzione variabile, con possibili blocchi e aritmie.'],
 ['myocarditis','Miocardio','Miocardite','Left ventricle','Infiammazione del miocardio con estensione e conseguenze elettriche o meccaniche variabili.'],
 ['takotsubo','Miocardio','Sindrome di Takotsubo','apex','Disfunzione regionale transitoria con distribuzioni diverse, non limitata a un singolo territorio coronarico.'],
 ['lvaneurysm','Miocardio','Aneurisma ventricolare','apex','Porzione di parete ventricolare deformata con alterata contrazione; distinguere aneurisma vero e pseudoaneurisma.'],
 ['effusion','Pericardio e masse','Versamento pericardico','Left ventricle','Liquido nello spazio pericardico. Il pericardio non è segmentato in questo atlante.'],
 ['tamponade','Pericardio e masse','Tamponamento cardiaco','Right atrium','Compressione cardiaca da pressione pericardica elevata: è una condizione emodinamica, non definita dal solo volume del liquido.'],
 ['constrictive','Pericardio e masse','Pericardite costrittiva','Left ventricle','Vincolo pericardico che limita il riempimento e accentua l’interdipendenza ventricolare.'],
 ['myxoma','Pericardio e masse','Mixoma atriale','fossa-ovalis','Massa che si sviluppa spesso in rapporto con il setto interatriale; sede e mobilità ne determinano gli effetti.'],
 ['thrombus','Pericardio e masse','Trombo intracardiaco','Left atrium','Formazione trombotica in una camera cardiaca; sedi e fattori predisponenti variano.'],
 ['endocarditis','Pericardio e masse','Endocardite infettiva','annulus-mitral','Infezione dell’endocardio, spesso valvolare, con possibili vegetazioni, distruzione dei lembi e ascessi.']
];
for(const [key,label,target]of [['mitral','mitralica','mitral'],['aortic','aortica','aortic'],['tricuspid','tricuspidale','tricuspid'],['pulmonary','polmonare','pulmonary']]){
 rows.push([key+'-stenosis','Valvulopatie','Stenosi '+label,'annulus-'+target,'Riduzione dell’apertura valvolare. Qui si osserva una restrizione illustrativa dei lembi; gradienti e area efficace non sono calcolati.','valve-stenosis',key]);
 rows.push([key+'-regurgitation','Valvulopatie','Insufficienza '+label,'annulus-'+target,'Coaptazione incompleta dei lembi. L’apertura residua è illustrativa; non calcola volume o frazione rigurgitante.','valve-regurgitation',key]);
}
const structural=rows.map(([id,family,name,target,description,preview='localization',valve])=>({id:'anomaly-'+id,family,name,target,description,preview,valve,source:family==='Miocardio'?refs.muscle:family==='Valvulopatie'?refs.valves:family.startsWith('Congenite')?refs.congenital:null}));
function catalog(scenarios){return [...scenarios.filter(s=>s.id!=='normale').map(s=>({id:'ecg-'+s.id,scenario:s.id,family:'ECG · '+s.cat,name:s.name,description:s.card?.def||'Quadro presente nella libreria ECG.',preview:'ecg',source:null})),...structural];}
return {structural,catalog,refs};
});
