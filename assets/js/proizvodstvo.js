/* ---------------- proizvodstvo (custom, item rows) ---------------- */
let PROD_ITEMS = { spent:[], received:[] };
let EDIT_PROD_ID = null;
function prodResetItems(record){
  if(record){
    PROD_ITEMS = {
      spent: record.spent && record.spent.length ? record.spent.map(it=>({id:uid(), ...it})) : [{id:uid()}],
      received: record.received && record.received.length
        ? record.received.map(it=>({id:uid(), ...it}))
        : [{id:uid()}]
    };
  } else {
    PROD_ITEMS = { spent:[{id:uid()}], received:[{id:uid()}] };
  }
}
function nomOptionsAll(selected){
  let opts = '<option value="">— tanlang —</option>';
  (DB.refs.nomenclature||[]).forEach(o=>{
    opts += `<option value="${esc(o.name)}" ${o.name===selected?'selected':''}>${esc(o.name)}</option>`;
  });
  return opts;
}
function prodItemRow(kind, item, idx){
  const nomOpts = nomOptionsAll(item.nomenclature);
  const percentField = `
      <div class="field"><label>${idx===0?'%':''}</label>
        <input type="number" step="any" value="${item.percent||''}" oninput="prodUpdate('${kind}','${item.id}','percent',this.value)"></div>`;
  return `
    <div class="itemsrow ${kind==='received'?'itemsrow-received':''}" data-kind="${kind}" data-id="${item.id}">
      <div class="field"><label>${idx===0?'Nomenklatura':''}</label>
        <select onchange="prodUpdate('${kind}','${item.id}','nomenclature',this.value)">${nomOpts}</select>
      </div>
      ${percentField}
      <div class="field"><label>${idx===0?'Kg':''}</label>
        <input type="number" step="any" id="prodkg_${kind}_${item.id}" value="${item.kg||''}" oninput="prodUpdate('${kind}','${item.id}','kg',this.value)"></div>
      <div class="field"><label>${idx===0?'Zichlik, kg/l':''}</label>
        <input type="number" step="any" id="proddens_${kind}_${item.id}" value="${item.density||''}" oninput="prodUpdate('${kind}','${item.id}','density',this.value)"></div>
      <div class="field"><label>${idx===0?'Litr':''}</label>
        <input type="number" step="any" id="prodlit_${kind}_${item.id}" value="${item.liter||''}" oninput="prodUpdate('${kind}','${item.id}','liter',this.value)"></div>
      <button type="button" class="btn sm danger icon" onclick="prodRemoveRow('${kind}','${item.id}')" title="Qatorni o'chirish">${ICON_CLOSE}</button>
    </div>`;
}
function prodUpdate(kind, id, key, val){
  const arr = PROD_ITEMS[kind];
  const it = arr.find(x=>x.id===id);
  if(!it) return;
  it[key] = val;
  if(key === 'liter' || key === 'density'){
    const dens = num(it.density), lit = num(it.liter);
    if(dens > 0 && lit > 0){
      it.kg = round2(lit * dens);
      const kgInput = document.getElementById(`prodkg_${kind}_${id}`);
      if(kgInput) kgInput.value = it.kg;
    }
  }
  updateProdTotals();
}
function prodAddRow(kind){
  PROD_ITEMS[kind].push({id:uid()});
  renderProdItemsUI();
}
function prodRemoveRow(kind, id){
  PROD_ITEMS[kind] = PROD_ITEMS[kind].filter(x=>x.id!==id);
  if(!PROD_ITEMS[kind].length) PROD_ITEMS[kind].push({id:uid()});
  renderProdItemsUI();
}
function prodItemsTotal(kind){ return PROD_ITEMS[kind].reduce((s,it)=>s+num(it.kg),0); }
function prodSpentSums(){
  const items = PROD_ITEMS.spent || [];
  const kg = items.reduce((s,it)=>s+num(it.kg),0);
  const liter = items.reduce((s,it)=>s+num(it.liter),0);
  // O'rtacha zichlik — og'irlik bo'yicha (aralashma zichligi): jami kg / jami litr
  const dens = liter > 0 ? kg / liter : 0;
  return { kg, liter, dens };
}
function updateProdTotals(){
  const sT = $('#prod_spent_total'), rT = $('#prod_received_total'), lT = $('#prod_loss_total');
  if(sT) sT.textContent = fmt(prodItemsTotal('spent'),1);
  if(rT) rT.textContent = fmt(prodItemsTotal('received'),1);
  if(lT) lT.textContent = fmt(prodItemsTotal('spent')-prodItemsTotal('received'),1);
  const s = prodSpentSums();
  const setTxt = (sel,v,dec) => { const el = $(sel); if(el) el.textContent = fmt(v,dec); };
  setTxt('#prod_spent_sum_kg', s.kg, 1);
  setTxt('#prod_spent_sum_dens', s.dens, 4);
  setTxt('#prod_spent_sum_liter', s.liter, 1);
}
function renderProdItemsUI(){
  const spentHost = $('#prod_spent_rows'); const recvHost = $('#prod_received_rows');
  if(spentHost) spentHost.innerHTML = PROD_ITEMS.spent.map((it,i)=>prodItemRow('spent',it,i)).join('');
  if(recvHost) recvHost.innerHTML = PROD_ITEMS.received.map((it,i)=>prodItemRow('received',it,i)).join('');
  updateProdTotals();
}

function computeNextProdDocNum(){
  const nums = (DB.docs.proizvodstvo||[]).map(d=>parseInt(d.docNum,10)).filter(n=>!isNaN(n));
  return nums.length ? Math.max(...nums)+1 : 1;
}
function renderProizvodstvoForm(){
  const record = EDIT_PROD_ID ? DB.docs.proizvodstvo.find(d=>d.id===EDIT_PROD_ID) : null;
  FORM_BASE_CTX = record ? (record.base || '') : '';
  FORM_RESERVOIR_CTX = record ? (record.reservoir || '') : '';
  prodResetItems(record);
  const headFields = [
    F('opDate','Amaliyot sanasi','date',{required:true, def: record?record.opDate:today()}),
    F('smena','Smena raqami','text',{def: record?record.smena:''}),
    F('docNum',"Ishlab chiqarish hisobot №",'text',{def: record?record.docNum:String(computeNextProdDocNum()), readonly:true}),
    F('base','Neftbaza','select',{ref:'bases', def: record?record.base:''}),
    F('organization','Tashkilot','select',{ref:'organizations', def: record?record.organization:''}),
    F('reservoir','Rezervuar','select',{ref:'reservoirs', def: record?record.reservoir:''}),
  ];
  const heading = record ? `${ICON_EDIT} Hujjatni tahrirlash — Ishlab chiqarish operatsiyasi` : `${ICON_FLASK} Yangi hujjat — Ishlab chiqarish operatsiyasi`;
  return `
    <div class="card">
      <div class="cardhead">
        <div><h2>${heading}</h2><div class="sub">Manba varaq: Призодство расход / Призодство приход</div></div>
        <button type="button" class="btn ghost sm" onclick="closeProdForm()">${ICON_BACK} Jurnalga qaytish</button>
      </div>
      <form id="form_proizvodstvo" onsubmit="return false;">
        <div class="formsection">
          <div class="fstitle">Hujjat ma'lumotlari</div>
          <div class="fieldgrid">${headFields.map(f=>fieldHtml('proizvodstvo',f)).join('')}</div>
        </div>
        <div class="formsection">
          <div class="itemtable-title">Chiqim — komponent (Izrasxodovano)</div>
          <div id="prod_spent_rows"></div>
          <div class="prod-sum-row">
            <div class="sum-lbl">Jami / o'rtacha</div>
            <div></div>
            <div><span class="sum-val" id="prod_spent_sum_kg">0</span><small>kg</small></div>
            <div><span class="sum-val" id="prod_spent_sum_dens">0</span><small>kg/l</small></div>
            <div><span class="sum-val" id="prod_spent_sum_liter">0</span><small>litr</small></div>
            <div></div>
          </div>
          <button type="button" class="btn sm ghost" onclick="prodAddRow('spent')">+ Qator qo'shish</button>
        </div>
        <div class="formsection">
          <div class="itemtable-title">Kirim — mahsulot (Oprihodovano)</div>
          <div id="prod_received_rows"></div>
          <button type="button" class="btn sm ghost" onclick="prodAddRow('received')">+ Qator qo'shish</button>
        </div>
        <div class="statgrid" style="margin-top:6px;">
          <div class="stat out"><div class="lbl">Jami sarflandi</div><div class="val"><span id="prod_spent_total">0</span><small>kg</small></div></div>
          <div class="stat in"><div class="lbl">Jami olindi</div><div class="val"><span id="prod_received_total">0</span><small>kg</small></div></div>
          <div class="stat"><div class="lbl">Texnologik yo'qotish</div><div class="val"><span id="prod_loss_total">0</span><small>kg</small></div></div>
        </div>
        <div class="formsection"><div class="fieldgrid"><div class="field wide"><label>Izoh</label><textarea id="f_proizvodstvo_note">${esc(record?record.note:'')}</textarea></div></div></div>
        <div class="formfoot">
          <button type="button" class="btn primary" onclick="saveProizvodstvo()">${ICON_SAVE} ${record?'Yangilash':'Saqlash'}</button>
          <button type="button" class="btn ghost" onclick="closeProdForm()">Bekor qilish</button>
        </div>
      </form>
    </div>
  `;
}
let PROD_VIEW_MODE = 'journal';
function openProdForm(){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  if(isUser() && !hasWorkableShift()){ toast("Avval smenani oching", 'danger'); return; }
  EDIT_PROD_ID = null; PROD_VIEW_MODE = 'form'; renderRoute();
}
function editProd(id){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const rec = DB.docs.proizvodstvo.find(d=>d.id===id);
  if(rec && !canEditDoc(rec)){ toast("Bu hujjat qulflangan smenaga tegishli", 'danger'); return; }
  EDIT_PROD_ID = id; PROD_VIEW_MODE = 'form'; renderRoute();
}
function closeProdForm(){ EDIT_PROD_ID = null; PROD_VIEW_MODE = 'journal'; renderRoute(); }
async function saveProizvodstvo(){
  const get = (k) => document.getElementById(`f_proizvodstvo_${k}`)?.value || '';
  const existing = EDIT_PROD_ID ? DB.docs.proizvodstvo.find(d=>d.id===EDIT_PROD_ID) : null;
  if(existing && !canEditDoc(existing)){ toast("Bu hujjatni tahrirlashga ruxsatingiz yo'q", 'danger'); return; }
  if(!existing && isUser() && !hasWorkableShift()){ toast("Avval smenani oching", 'danger'); return; }
  const obj = {
    id: EDIT_PROD_ID || uid(), createdAt: existing ? existing.createdAt : Date.now(),
    opDate: get('opDate'), smena: get('smena'), docNum: get('docNum'),
    base: get('base'), organization: get('organization'), reservoir: get('reservoir'),
    note: get('note'),
    spent: PROD_ITEMS.spent.filter(it=>it.nomenclature).map(it=>({nomenclature:it.nomenclature, percent:num(it.percent), kg:num(it.kg), density:num(it.density), liter:num(it.liter)})),
    received: PROD_ITEMS.received.filter(it=>it.nomenclature).map(it=>({
      nomenclature:it.nomenclature, percent:num(it.percent), kg:num(it.kg), density:num(it.density), liter:num(it.liter)
    })),
  };
  if(!obj.opDate || !obj.base){ toast("Sana va Neftbazani to'ldiring", 'danger'); return; }
  if(existing){
    obj.shiftId = existing.shiftId;
    obj.createdBy = existing.createdBy || docAuthor(existing);
    const idx = DB.docs.proizvodstvo.findIndex(d=>d.id===EDIT_PROD_ID);
    DB.docs.proizvodstvo[idx] = obj;
  } else {
    if(isUser()){ obj.shiftId = effectiveShiftId(); }
    obj.createdBy = currentAuthorName();
    DB.docs.proizvodstvo.push(obj);
  }
  await persist('docs');
  await syncLedger();
  toast(existing ? 'Hujjat yangilandi' : 'Hujjat saqlandi');
  EDIT_PROD_ID = null;
  PROD_VIEW_MODE = 'journal';
  renderRoute();
}
function renderProizvodstvoTable(){
  const rows = [...DB.docs.proizvodstvo].sort((a,b)=> (b.opDate||'').localeCompare(a.opDate||'') || b.createdAt-a.createdAt);
  const body = rows.length ? rows.map(r=>{
    const sT = r.spent.reduce((s,i)=>s+num(i.kg),0), rT = r.received.reduce((s,i)=>s+num(i.kg),0);
    return `<tr>
      <td>${fmtDate(r.opDate)}</td><td>${esc(r.docNum||'—')}</td><td>${esc(r.base)}</td>
      <td class="num neg">${fmt(sT,1)}</td><td class="num pos">${fmt(rT,1)}</td><td class="num">${fmt(sT-rT,1)}</td>
      ${metaCells(r)}
      ${isGuest() ? '' : `<td style="white-space:nowrap;">
        ${canEditDoc(r) ? `<button class="btn sm icon" onclick="editProd('${r.id}')" title="Tahrirlash">${ICON_EDIT}</button>
        <button class="btn sm danger icon" onclick="confirmDeleteProizvodstvo('${r.id}')" title="O'chirish">${ICON_CLOSE}</button>` : `<span class="hint" title="Smena yopilgan">${ICON_LOCK}</span>`}
      </td>`}
    </tr>`;
  }).join('') : `<tr class="emptyrow"><td colspan="11">Hali hujjat kiritilmagan</td></tr>`;
  return `
    <div class="card">
      <div class="cardhead">
        <h2>${ICON_FLASK} Ishlab chiqarish operatsiyasi <span class="badge-num">${rows.length}</span></h2>
        ${isGuest() ? '' : `<button type="button" class="btn primary sm" onclick="openProdForm()">+ Yangi hujjat</button>`}
      </div>
      <div class="tablewrap"><table class="datatable"><thead><tr>
        <th>Sana</th><th>Hisobot №</th><th>Neftbaza</th><th>Sarflandi, kg</th><th>Olindi, kg</th><th>Yo'qotish, kg</th>${metaHeadCells()}${isGuest()?'':'<th></th>'}
      </tr></thead><tbody>${body}</tbody></table></div>
    </div>`;
}
async function deleteProizvodstvo(id){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const rec = DB.docs.proizvodstvo.find(d=>d.id===id);
  if(rec && !canEditDoc(rec)){ toast("Bu hujjatni o'chirishga ruxsatingiz yo'q", 'danger'); return; }
  DB.docs.proizvodstvo = DB.docs.proizvodstvo.filter(d=>d.id!==id);
  await persist('docs'); await syncLedger(); toast("O'chirildi",'danger'); renderRoute();
}
function renderProizvodstvoPage(){
  if(PROD_VIEW_MODE !== 'form') return renderProizvodstvoTable();
  const html = renderProizvodstvoForm();
  setTimeout(renderProdItemsUI, 0);
  return html;
}
