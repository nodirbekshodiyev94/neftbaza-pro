/* ---------------- data model ---------------- */
function defaultRefs(){
  return {
    bases: ['Zirabod','Qorovulbozor','4-post'],
    nomenclature: [
      {id:uid(), name:'Pryamogon benzin'},
      {id:uid(), name:'Nesabilniy uglevodorod PYG'},
      {id:uid(), name:'AI-91'},
      {id:uid(), name:'AI-92'},
      {id:uid(), name:'AI-95'},
      {id:uid(), name:"Dizel yoqilg'i"},
      {id:uid(), name:'Mazut'},
      {id:uid(), name:'Aviakerosin'},
    ],
    organizations: [
      {id:uid(), name:'Davr Oil', inn:'301234567'},
      {id:uid(), name:'Petrochem', inn:'301234890'},
      {id:uid(), name:'Fuelpure', inn:''},
    ],
    contractors: [
      {id:uid(), name:'"Oltin Yo\'l" MChJ', inn:'302345671'},
      {id:uid(), name:'"TransNeft Logistika" MChJ', inn:''},
    ],
    destinations: ['Realizatsiya','Ekonom zona','Odilnaev'],
    regions: ["Buxoro","Navoiy","Samarqand","Jizzax","Toshkent","Andijon","Farg'ona","Namangan","Surxandaryo","Qashqadaryo","Xorazm","Toshkent shahri","Qoraqalpog'iston Respublikasi"],
    autos: [{number:'01 A 123 BC', org:'Davr Oil'}, {number:'30 B 777 AA', org:'Petrochem'}],
    pricepy: [{number:'01 A 456 BC', org:'Davr Oil'}],
    drivers: ['Aziz Karimov','Bekzod Yusupov'],
    reservoirs: [
      {name:'RVS-1', base:'Zirabod', kind:'RVS', volume:783000},
      {name:'RVS-2', base:'Zirabod', kind:'RVS', volume:813000},
      {name:'RVS-3', base:'Zirabod', kind:'RVS', volume:794000},
      {name:'RVS-4', base:'Zirabod', kind:'RVS', volume:786000},
      {name:'RVS-5', base:'Zirabod', kind:'RVS', volume:1608000},
      {name:'RGS-1', base:'Zirabod', kind:'RGS', volume:56925},
      {name:'RGS-2', base:'Zirabod', kind:'RGS', volume:56625},
      {name:'RGS-3', base:'Zirabod', kind:'RGS', volume:59775},
      {name:'RGS-4', base:'Zirabod', kind:'RGS', volume:59100},
      {name:'RGS-5', base:'Zirabod', kind:'RGS', volume:47820},
      {name:'RGS-6', base:'Zirabod', kind:'RGS', volume:44160},
      {name:'RGS-7', base:'Zirabod', kind:'RGS', volume:48600},
      {name:'RGS-8', base:'Zirabod', kind:'RGS', volume:47820},
      {name:'RGS-11', base:'Zirabod', kind:'RGS', volume:55948},
      {name:'RGS-12', base:'Zirabod', kind:'RGS', volume:55451},
      {name:'RGS-13', base:'Zirabod', kind:'RGS', volume:45440},
      {name:'RGS-14', base:'Zirabod', kind:'RGS', volume:44896},
    ],
    normPotr: [],
    reservoirCalib: {
      main: [
        {id:uid(), number:'RVS1', levelCm:502, volumeLiter:428843, waterLiter:0, waterCm:'', density:0.783, netWeightKg:335784, productName:'Gazolin', capacity:'V-1000'},
        {id:uid(), number:'RVS2', levelCm:454, volumeLiter:386848, waterLiter:0, waterCm:'', density:0.813, netWeightKg:314507, productName:"Nesabilniy uglevodorod PYG (Eron)", capacity:'V-1000'},
        {id:uid(), number:'RVS3', levelCm:1132, volumeLiter:965714, waterLiter:0, waterCm:'', density:0.794, netWeightKg:766777, productName:"Nesabilniy uglevodorod PYG (Eron)", capacity:'V-1000'},
        {id:uid(), number:'RVS4', levelCm:1068, volumeLiter:911956, waterLiter:0, waterCm:'', density:0.786, netWeightKg:716797, productName:'PGH', capacity:'V-1000'},
        {id:uid(), number:'RVS5', levelCm:1083.5, volumeLiter:1966339, waterLiter:0, waterCm:'', density:0.804, netWeightKg:1580937, productName:'Piroliz distilyat', capacity:'V-2000'},
        {id:uid(), number:'RGS1', levelCm:35, volumeLiter:4331, waterLiter:0, waterCm:'', density:0.759, netWeightKg:3287, productName:'AI-95 +', capacity:'V-75'},
        {id:uid(), number:'RGS2', levelCm:285, volumeLiter:70215, waterLiter:0, waterCm:'', density:0.755, netWeightKg:53012, productName:'AI-92', capacity:'V-75'},
        {id:uid(), number:'RGS3', levelCm:34, volumeLiter:4195, waterLiter:0, waterCm:'', density:0.797, netWeightKg:3343, productName:'AI-92 +', capacity:'V-75'},
        {id:uid(), number:'RGS4', levelCm:176, volumeLiter:41976, waterLiter:0, waterCm:'', density:0.788, netWeightKg:33077, productName:'AI-92 +', capacity:'V-75'},
        {id:uid(), number:'RGS5', levelCm:159, volumeLiter:38000, waterLiter:0, waterCm:'', density:0.797, netWeightKg:30286, productName:'AI-92 +', capacity:'V-60'},
        {id:uid(), number:'RGS6', levelCm:150, volumeLiter:35540, waterLiter:0, waterCm:'', density:0.736, netWeightKg:26157, productName:'AI-92 +', capacity:'V-60'},
        {id:uid(), number:'RGS7', levelCm:204, volumeLiter:50498, waterLiter:0, waterCm:'', density:0.81, netWeightKg:40903, productName:"AI-92 + udel og'ir", capacity:'V-60'},
        {id:uid(), number:'RGS8', levelCm:248, volumeLiter:60280, waterLiter:0, waterCm:'', density:0.797, netWeightKg:48043, productName:"AI-92 + udel og'ir", capacity:'V-60'},
      ],
      pending: [
        {id:uid(), number:'RGS14', levelCm:213, volumeLiter:104880, waterLiter:'', waterCm:'', density:0.736, netWeightKg:77191.68, productName:'AI-92', capacity:'61'},
        {id:uid(), number:'RGS13', levelCm:102, volumeLiter:42262, waterLiter:'', waterCm:'', density:0.64, netWeightKg:27047.68, productName:'Pramagon', capacity:'71'},
        {id:uid(), number:'RGS12', levelCm:76, volumeLiter:27437, waterLiter:'', waterCm:'', density:0.781, netWeightKg:21428.3, productName:'Komponent', capacity:'71'},
        {id:uid(), number:'RGS11', levelCm:245, volumeLiter:131441, waterLiter:'', waterCm:'', density:0.788, netWeightKg:103575.51, productName:"AI-92 + udel og'ir", capacity:'71'},
        {id:uid(), number:'BOCHKADA', levelCm:'', volumeLiter:'', waterLiter:'', waterCm:'', density:'', netWeightKg:2270, productName:'Aromatizator (yoqilgi uchun)', capacity:''},
        {id:uid(), number:'BOCHKADA', levelCm:'', volumeLiter:9000, waterLiter:'', waterCm:'', density:0.779, netWeightKg:7011, productName:'AI-92 + RASVO', capacity:''},
        {id:uid(), number:'BOCHKADA', levelCm:'', volumeLiter:1000, waterLiter:'', waterCm:'', density:10.054, netWeightKg:'', productName:'Dmitel karbonat', capacity:''},
        {id:uid(), number:'Avtosisternada', levelCm:'', volumeLiter:11000, waterLiter:'', waterCm:'', density:'', netWeightKg:'', productName:'PGH', capacity:''},
        {id:uid(), number:'Avtosisternada', levelCm:'', volumeLiter:4000, waterLiter:'', waterCm:'', density:'', netWeightKg:'', productName:'Pramagon', capacity:''},
      ]
    }
  };
}
function parseCapacityLiters(cap){
  if(!cap) return 0;
  const m = String(cap).match(/(\d+(\.\d+)?)/);
  if(!m) return 0;
  return num(m[1]) * 1000;
}
function deriveSimpleReservoirs(){
  DB.refs.reservoirs = (DB.refs.reservoirCalib.main || []).map(r => {
    const dashName = String(r.number).replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
    const kind = /^RVS/i.test(r.number) ? 'RVS' : 'RGS';
    const litersCap = parseCapacityLiters(r.capacity);
    const volumeKg = litersCap ? round2(litersCap * num(r.density)) : num(r.netWeightKg);
    return { name: dashName, base: r.base || 'Zirabod', kind, volume: volumeKg };
  });
}
function defaultDocs(){
  return {
    prihodAvto:[], rashodAvto:[], prihodVagon:[], rashodVagon:[],
    sUstanovki:[], vUstanovku:[], izlishka:[], spisaniya:[], proizvodstvo:[]
  };
}
const DB = { refs:null, docs:null, opening:null, shifts:null, movements:null, ready:false };
