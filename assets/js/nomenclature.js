/* ---------------- Nomenklatura — yagona jadval (Barcha turdagi mahsulotlar) ---------------- */
let NOM_EDIT = null; // id
let NOM_FORM_OPEN = false;
let NOM_FILTER_BASE = ''; // Admin/Guest uchun — jadval ustidagi Neftbaza filtri ('' = tanlanmagan)
function openNomForm(){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  NOM_FORM_OPEN = true; NOM_EDIT = null;
  renderRoute();
}
function closeNomForm(){ NOM_FORM_OPEN = false; NOM_EDIT = null; renderRoute(); }
function editNomOpen(id){
  const rec = (DB.refs.nomenclature||[]).find(o=>o.id===id);
  if(isUser() && rec && rec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli mahsulotni tahrirlay olasiz", 'danger'); return; }
  NOM_EDIT = id; NOM_FORM_OPEN = true; renderRoute();
}
function renderNomenclaturePage(){
  const userBase = currentUserBase();
  const filterBase = isUser() ? userBase : NOM_FILTER_BASE; // User uchun — o'zgartirib bo'lmaydigan, biriktirilgan neftbaza

  const filterCard = `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_FACTORY} Neftbaza</h2><div class="sub">Nomenklatura ro'yxati shu neftbaza bo'yicha ko'rsatiladi</div></div></div>
      <div class="field" style="max-width:340px;">
        <label>Neftbaza <span class="req">*</span></label>
        ${isUser()
          ? `<select disabled><option>${esc(userBase||'— biriktirilmagan —')}</option></select>`
          : `<select onchange="NOM_FILTER_BASE=this.value;renderRoute();">
               <option value="">— Neftbazani tanlang —</option>
               ${(DB.refs.bases||[]).map(b=>`<option value="${esc(b)}" ${b===NOM_FILTER_BASE?'selected':''}>${esc(b)}</option>`).join('')}
             </select>`}
      </div>
    </div>`;

  if(!filterBase){
    return `${filterCard}<div class="card"><div class="empty-illustration"><div class="big">${ICON_FLASK}</div>Avval Neftbazani tanlang</div></div>`;
  }

  const list = (DB.refs.nomenclature||[]).filter(o => o.base === filterBase);
  const record = NOM_EDIT ? list.find(o=>o.id===NOM_EDIT) : null;
  const baseVal = record ? (record.base||'') : (isUser() ? userBase : filterBase);

  const baseFieldHtml = `<div class="field"><label>Neftbaza <span class="req">*</span></label>
    <select id="nom_new_base"${isUser()?' disabled':''}>
      ${isUser()
        ? `<option value="${esc(userBase)}" selected>${esc(userBase||'— biriktirilmagan —')}</option>`
        : `<option value="">— tanlang —</option>${(DB.refs.bases||[]).map(b=>`<option value="${esc(b)}" ${b===baseVal?'selected':''}>${esc(b)}</option>`).join('')}`}
    </select></div>`;

  const form = (NOM_FORM_OPEN || record) ? `
    <div class="card">
      <div class="cardhead">
        <div><h2>${ICON_FLASK} ${record ? 'Yozuvni tahrirlash' : "Yangi mahsulot qo'shish"}</h2></div>
        <button type="button" class="btn ghost sm" onclick="closeNomForm()">${ICON_BACK} Yopish</button>
      </div>
      <div class="fieldgrid">
        ${baseFieldHtml}
        <div class="field"><label>Nomenklatura nomi</label><input type="text" id="nom_new_name" value="${record?esc(record.name):''}" placeholder="Masalan, AI-92"></div>
      </div>
      <div class="formfoot">
        <button type="button" class="btn primary" onclick="saveNomenclature()">${ICON_SAVE} ${record?'Yangilash':"Qo'shish"}</button>
        <button type="button" class="btn ghost" onclick="closeNomForm()">Bekor qilish</button>
      </div>
    </div>` : '';

  const listTable = list.length ? `<div class="tablewrap"><table class="datatable"><thead><tr><th>Nomenklatura nomi</th>${isGuest()?'':'<th></th>'}</tr></thead><tbody>
      ${list.map(o=>`<tr><td>${esc(o.name)}</td>${isGuest()?'':`<td style="width:1%;white-space:nowrap;">
        <button class="btn sm icon" onclick="editNomOpen('${o.id}')" title="Tahrirlash">${ICON_EDIT}</button>
        <button class="btn sm danger icon" onclick="confirmDeleteNomenclature('${o.id}')" title="O'chirish">${ICON_CLOSE}</button>
      </td>`}</tr>`).join('')}
    </tbody></table></div>` : emptyBlock();

  return `
    ${filterCard}
    ${form}
    <div class="card">
      <div class="cardhead">
        <h2>${ICON_TANK} ${esc(filterBase)} — mahsulotlar <span class="badge-num">${list.length}</span></h2>
        ${isGuest() ? '' : `<button type="button" class="btn primary sm" onclick="openNomForm()">+ Qo'shish</button>`}
      </div>
      ${listTable}
    </div>
  `;
}
async function saveNomenclature(){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const name = $('#nom_new_name').value.trim();
  const baseEl = $('#nom_new_base');
  const base = isUser() ? currentUserBase() : (baseEl ? baseEl.value : '');
  if(!base){ toast("Neftbazani tanlang (majburiy)", 'danger'); return; }
  if(!name){ toast("Nomenklatura nomini kiriting", 'danger'); return; }
  if(isUser() && NOM_EDIT){
    const existingRec = (DB.refs.nomenclature||[]).find(o=>o.id===NOM_EDIT);
    if(existingRec && existingRec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli mahsulotni tahrirlay olasiz", 'danger'); return; }
  }
  if(NOM_EDIT){
    const idx = DB.refs.nomenclature.findIndex(o=>o.id===NOM_EDIT);
    if(idx>-1) DB.refs.nomenclature[idx] = { id:NOM_EDIT, name, base };
  } else {
    DB.refs.nomenclature.push({ id:uid(), name, base });
  }
  if(!isUser()) NOM_FILTER_BASE = base; // yangi/yangilangan yozuv darhol filtrlangan ro'yxatda ko'rinsin
  await persist('refs');
  toast(NOM_EDIT ? 'Yozuv yangilandi' : "Qo'shildi");
  NOM_EDIT = null; NOM_FORM_OPEN = false;
  renderRoute();
}
function confirmDeleteNomenclature(id){
  const rec = (DB.refs.nomenclature||[]).find(o=>o.id===id);
  if(isUser() && rec && rec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli mahsulotni o'chira olasiz", 'danger'); return; }
  askConfirm("Bu nomenklaturani o'chirmoqchimisiz?", function(){ deleteNomenclature(id); });
}
async function deleteNomenclature(id){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const rec = (DB.refs.nomenclature||[]).find(o=>o.id===id);
  if(isUser() && rec && rec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli mahsulotni o'chira olasiz", 'danger'); return; }
  DB.refs.nomenclature = DB.refs.nomenclature.filter(o=>o.id!==id);
  await persist('refs');
  toast("O'chirildi", 'danger');
  renderRoute();
}
