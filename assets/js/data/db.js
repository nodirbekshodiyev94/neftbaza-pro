async function loadDB(){
  try{ const r = await window.storage.get('refs'); DB.refs = r ? JSON.parse(r.value) : defaultRefs(); }
  catch(e){ DB.refs = defaultRefs(); }
  try{ const r = await window.storage.get('shifts'); DB.shifts = r ? JSON.parse(r.value) : []; }
  catch(e){ DB.shifts = []; }
  try{ const r = await window.storage.get('docs'); DB.docs = r ? JSON.parse(r.value) : defaultDocs(); }
  catch(e){ DB.docs = defaultDocs(); }
  try{ const r = await window.storage.get('openingBalances'); DB.opening = r ? JSON.parse(r.value) : {}; }
  catch(e){ DB.opening = {}; }
  // ensure all keys exist (in case of future field additions)
  const dd = defaultDocs();
  Object.keys(dd).forEach(k => { if(!DB.docs[k]) DB.docs[k] = []; });
  // one-time migration: replace reservoir list with real RVS/RGS calibration data
  try{
    const migrated = await window.storage.get('reservoirsMigratedV2');
    if(!migrated){
      DB.refs.reservoirs = defaultRefs().reservoirs;
      await window.storage.set('reservoirsMigratedV2', '1');
      await persist('refs');
    }
  }catch(e){}
  // one-time migration: introduce rich reservoir calibration table (Rezervuarlar)
  try{
    const migrated2 = await window.storage.get('reservoirCalibMigratedV1');
    if(!migrated2 || !DB.refs.reservoirCalib){
      DB.refs.reservoirCalib = defaultRefs().reservoirCalib;
      deriveSimpleReservoirs();
      await window.storage.set('reservoirCalibMigratedV1', '1');
      await persist('refs');
    }
  }catch(e){}
  // migration: har bir rezervuar neftbazaga bog'lansin (bo'sh bo'lsa — mavjud birinchi neftbaza)
  try{
    const defBase = (DB.refs.bases && DB.refs.bases[0]) || 'Zirabod';
    let changed = false;
    const cal = DB.refs.reservoirCalib || {main:[],pending:[]};
    ['main','pending'].forEach(t=>{ (cal[t]||[]).forEach(r=>{ if(r && !r.base){ r.base = defBase; changed = true; } }); });
    (DB.refs.reservoirs||[]).forEach(r=>{ if(r && !r.base){ r.base = defBase; changed = true; } });
    if(changed){ deriveSimpleReservoirs(); await persist('refs'); }
  }catch(e){}
  // migration: har bir foydalanuvchi biriktirilgan neftbazaga ega bo'lsin (bo'sh bo'lsa — mavjud birinchi neftbaza)
  try{
    const defBase = (DB.refs.bases && DB.refs.bases[0]) || 'Zirabod';
    let uChanged = false;
    (AUTH.users||[]).forEach(u=>{ if(u && !u.assignedBase){ u.assignedBase = defBase; uChanged = true; } });
    if(uChanged) await persistAuth();
  }catch(e){}
  // migration: eski (muddatsiz) unlocked=true smenalarga vaqt chegarasi biriktiriladi (1 soat)
  try{
    let sChanged = false;
    (DB.shifts||[]).forEach(s=>{
      if(s && s.unlocked && !s.unlockedUntil){ s.unlockedUntil = Date.now() + 60*60000; sChanged = true; }
    });
    if(sChanged) await persist('shifts');
  }catch(e){}
  // one-time migration: convert nomenclature from flat strings to {name} objects
  try{
    if(Array.isArray(DB.refs.nomenclature) && DB.refs.nomenclature.length && typeof DB.refs.nomenclature[0] === 'string'){
      DB.refs.nomenclature = DB.refs.nomenclature.map(n => ({name:n}));
      await persist('refs');
    }
    let needIdFix = false;
    DB.refs.nomenclature = (DB.refs.nomenclature||[]).map(o => {
      if(!o.id){ needIdFix = true; return {...o, id:uid()}; }
      return o;
    });
    if(needIdFix) await persist('refs');
    // Nomenklaturadagi mahsulot turi tasnifi tizimdan olib tashlandi — eski 'type' maydoni tozalanadi
    let typeStrip = false;
    DB.refs.nomenclature = (DB.refs.nomenclature||[]).map(o => {
      if(o && Object.prototype.hasOwnProperty.call(o,'type')){ typeStrip = true; const {type, ...rest} = o; return rest; }
      return o;
    });
    if(typeStrip) await persist('refs');
  }catch(e){}
  // one-time migration: convert organizations/contractors from flat strings to {name,inn} objects
  try{
    let orgFix = false;
    ['organizations','contractors'].forEach(tab => {
      if(Array.isArray(DB.refs[tab]) && DB.refs[tab].length && typeof DB.refs[tab][0] === 'string'){
        DB.refs[tab] = DB.refs[tab].map(n => ({id:uid(), name:n, inn:''}));
        orgFix = true;
      } else {
        DB.refs[tab] = (DB.refs[tab]||[]).map(o => {
          if(!o.id){ orgFix = true; return {...o, id:uid(), inn: o.inn||''}; }
          if(o.inn === undefined){ orgFix = true; return {...o, inn:''}; }
          return o;
        });
      }
    });
    if(orgFix) await persist('refs');
  }catch(e){}
  // one-time migration: ensure regions (viloyatlar) reference list exists
  try{
    if(!DB.refs.regions || !DB.refs.regions.length){
      DB.refs.regions = defaultRefs().regions;
      await persist('refs');
    }
  }catch(e){}
  // Markazlashgan Movement Ledger — hujjatlardan avtomatik quriladi (yagona haqiqat manbai)
  rebuildLedger();
  DB.ready = true;
}
async function persist(part){
  try{
    if(part==='refs') await window.storage.set('refs', JSON.stringify(DB.refs));
    if(part==='docs') await window.storage.set('docs', JSON.stringify(DB.docs));
    if(part==='opening') await window.storage.set('openingBalances', JSON.stringify(DB.opening));
    if(part==='shifts') await window.storage.set('shifts', JSON.stringify(DB.shifts));
    if(part==='movements') await window.storage.set('movements', JSON.stringify(DB.movements||[]));
  }catch(e){ console.error('storage error', e); toast('Saqlashda xatolik yuz berdi', 'danger'); }
}
