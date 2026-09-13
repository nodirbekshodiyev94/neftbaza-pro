/* ---------------- Hisobot: Moddiy otchyot ---------------- */
let MO_STATE = { base:'', smena:'', from:'', to:'', generated:false };
function inRange(d, from, to){ return (!from || d.opDate>=from) && (!to || d.opDate<=to); }
/* =========================================================================
   MARKAZLASHGAN HARAKAT JURNALI (Movement Ledger)
   Har bir saqlangan hujjat avtomatik ravishda harakat yozuvi(lari)ni hosil qiladi.
   Moddiy hisobot faqat shu jurnaldan hisoblanadi (qo'lda hisob yo'q).
   ========================================================================= */
const fmtTime = (ts) => { if(!ts) return '—'; const d = new Date(ts); return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
function nomId(name){ const o = (DB.refs?.nomenclature||[]).find(x=>x.name===name); return o ? o.id : ''; }

/* Har bir hujjat turining harakatga o'girilish qoidasi */
const MOVEMENT_MAP = {
  prihodAvto:  {op:'IN',  cat:'avto',         bucket:'avto',     qty:'accepted',    net:d=>d.factKg||d.docKg,  density:d=>d.factDensity||d.docDensity, temp:()=>'',    vehicle:d=>d.driver||d.autoNum, docNum:d=>d.ttn,   transit:d=>d.cargoStatus==="Yo'lda"},
  rashodAvto:  {op:'OUT', cat:'avto',         bucket:'avto',     qty:'docKg',       net:d=>d.docKg,            density:d=>d.docDensity,                temp:()=>'',    vehicle:d=>d.driver||d.autoNum, docNum:d=>d.ttn},
  prihodVagon: {op:'IN',  cat:'vagon',        bucket:'vagon',    qty:'oprihodovano',net:d=>d.netKg||d.invNetKg,density:d=>d.density,                   temp:d=>d.temp, vehicle:d=>d.vagonNum,          docNum:d=>d.invNum, gross:d=>d.tara, transit:d=>d.status==="Yo'lda"},
  rashodVagon: {op:'OUT', cat:'vagon',        bucket:'vagon',    qty:'netKg',       net:d=>d.netKg,            density:d=>d.density,                   temp:d=>d.temp, vehicle:d=>d.vagonNum,          docNum:d=>d.invNum, gross:d=>d.tara},
  sUstanovki:  {op:'IN',  cat:'installation', bucket:'qurilma',  qty:'kg',          net:d=>d.kg,               density:d=>d.density,                   temp:d=>d.temp, docNum:d=>d.docNum},
  vUstanovku:  {op:'OUT', cat:'installation', bucket:'qurilma',  qty:'kg',          net:d=>d.kg,               density:d=>d.density,                   temp:d=>d.temp, docNum:d=>d.docNum},
  izlishka:    {op:'IN',  cat:'adjustment',   bucket:'ortiqcha', qty:'kg',          net:d=>d.kg,               density:d=>d.density,                   temp:d=>d.temp, docNum:d=>d.docNum},
  spisaniya:   {op:'OUT', cat:'adjustment',   bucket:'kamomad',  qty:'kg',          net:d=>d.kg,               density:d=>d.density,                   temp:d=>d.temp, docNum:d=>d.docNum},
};

/* Bitta oddiy hujjatdan bitta harakat yozuvi */
function createMovement(doc, docType){
  const map = MOVEMENT_MAP[docType]; if(!map) return null;
  const cfg = DOC_TYPES[docType] || {};
  const tv = map.temp ? map.temp(doc) : '';
  return {
    id: 'mv_' + doc.id,
    sourceDocId: doc.id, sourceDocType: docType,
    date: doc.opDate || '', time: fmtTime(doc.createdAt), createdAt: doc.createdAt || 0,
    productId: nomId(doc.nomenclature), productName: doc.nomenclature || '',
    operation: map.op, sourceModule: cfg.title || docType, category: map.cat, bucket: map.bucket,
    quantity: round2(num(doc[map.qty])),
    density: map.density ? num(map.density(doc)) : 0,
    temp: (tv===''||tv==null) ? '' : num(tv),
    netWeight: map.net ? round2(num(map.net(doc))) : 0,
    grossWeight: map.gross ? round2(num(map.gross(doc))) : 0,
    tank: doc.reservoir || '', organization: doc.organization || '',
    vehicle: map.vehicle ? (map.vehicle(doc)||'') : '',
    user: doc.createdBy || '', docNumber: map.docNum ? (map.docNum(doc)||'') : '',
    notes: doc.note || '', base: doc.base || '', smena: doc.smena || '',
    transit: map.transit ? !!map.transit(doc) : false
  };
}

/* Ishlab chiqarish hujjati — har bir komponent/mahsulot uchun alohida harakat */
function prodMovement(doc, it, op, idx, rawSelf){
  return {
    id: 'mv_'+doc.id+'_'+op+idx,
    sourceDocId: doc.id, sourceDocType: 'proizvodstvo',
    date: doc.opDate || '', time: fmtTime(doc.createdAt), createdAt: doc.createdAt || 0,
    productId: nomId(it.nomenclature), productName: it.nomenclature || '',
    operation: op, sourceModule: 'Ishlab chiqarish', category: 'proizvodstvo', bucket: 'proizvodstvo',
    quantity: round2(num(it.kg)), density: num(it.density), temp: '',
    netWeight: round2(num(it.kg)), grossWeight: 0,
    tank: doc.reservoir || '', organization: doc.organization || '', vehicle: '',
    user: doc.createdBy || '', docNumber: doc.docNum || '', notes: doc.note || '',
    base: doc.base || '', smena: doc.smena || '', transit: false, rawSelf: !!rawSelf
  };
}
function createProductionMovements(doc){
  const list = [];
  const spentNoms = (doc.spent||[]).map(it=>it.nomenclature);
  (doc.spent||[]).forEach((it,i)=>{ if(it.nomenclature) list.push(prodMovement(doc, it, 'OUT', i, false)); });
  (doc.received||[]).forEach((it,i)=>{
    if(!it.nomenclature) return;
    // sarflangan komponentdan qayta olingan mahsulot — hisobot KIRIMiga qo'shilmaydi (parity bilan matOtchet)
    const rawSelf = spentNoms.includes(it.nomenclature);
    list.push(prodMovement(doc, it, 'IN', i, rawSelf));
  });
  return list;
}

/* Butun jurnalni hujjatlardan qayta quramiz (tahrir/o'chirishda ham izchil) */
function buildAllMovements(){
  const out = [];
  Object.keys(MOVEMENT_MAP).forEach(dt=>{
    (DB.docs[dt]||[]).forEach(doc=>{ const m = createMovement(doc, dt); if(m) out.push(m); });
  });
  (DB.docs.proizvodstvo||[]).forEach(doc=>{ createProductionMovements(doc).forEach(m=>out.push(m)); });
  return out;
}
function rebuildLedger(){ DB.movements = buildAllMovements(); }
async function syncLedger(){ rebuildLedger(); await persist('movements'); }

/* Yo'ldagi (transit) qoldiq — jurnaldan */
function transitBalance(base, nom, cutoffDate, strictBefore){
  let bal = 0;
  (DB.movements||[]).forEach(m=>{
    if(!m.transit || m.base!==base || m.productName!==nom) return;
    if(cutoffDate){ if(strictBefore ? !(m.date<cutoffDate) : !(m.date<=cutoffDate)) return; }
    bal += num(m.quantity);
  });
  return round2(bal);
}

/* Moddiy hisobot — faqat harakat jurnalidan hisoblanadi */
function calculateMaterialReport(base, smena, from, to){
  return refList('nomenclature').map(o=>o.name).map(nom=>{
    const key = base+'|'+nom;
    const begin = num(DB.opening[key]);
    const beginTransit = from ? transitBalance(base, nom, from, true) : 0;
    const endTransit = transitBalance(base, nom, to || null, false);
    const inB  = { avto:0, vagon:0, proizvodstvo:0, qurilma:0, ortiqcha:0 };
    const outB = { avto:0, vagon:0, proizvodstvo:0, qurilma:0, kamomad:0 };
    (DB.movements||[]).forEach(m=>{
      if(m.base!==base || m.productName!==nom) return;
      if(!inRange({opDate:m.date}, from, to)) return;
      if(smena && String(m.smena)!==String(smena)) return;
      if(m.operation==='IN'){
        if(m.rawSelf) return;
        if(inB[m.bucket]!=null) inB[m.bucket] += num(m.quantity);
      } else {
        if(outB[m.bucket]!=null) outB[m.bucket] += num(m.quantity);
      }
    });
    const totalIn  = Object.values(inB).reduce((a,b)=>a+b,0);
    const totalOut = Object.values(outB).reduce((a,b)=>a+b,0);
    return { nom, begin, beginTransit, inB, totalIn, outB, totalOut, end: round2(begin+totalIn-totalOut), endTransit };
  });
}
/* Orqaga moslik: eski chaqiruvlar ishlashi uchun */
function matOtchetData(base, smena, from, to){ return calculateMaterialReport(base, smena, from, to); }
