/* ---------------- Rezervuarlar — rich calibration table ---------------- */
const RESCAL_FIELDS = [
  ['number','Rezervuar №'],
  ['levelCm','Umumiy sath, sm'],
  ['volumeLiter','Umumiy hajm, litr'],
  ['waterLiter','Mahsulot osti suvi, litr'],
  ['waterCm','Mahsulot osti suvi, sm'],
  ['density','Mahsulot zichligi'],
  ['netWeightKg',"Sof og'irligi, kg"],
  ['productName','Mahsulot nomi'],
  ['capacity','Rezervuar hajmi'],
];
let RESCAL_EDIT = null; // {table:'main'|'pending', id}
let RESCAL_FORM_OPEN = false;
let RESCAL_DEFAULT_TABLE = 'main';
let RESCAL_FILTER_BASE = '';
function rescalRow(field, value, disabled){
  const id = `rescal_${field}`;
  const isNum = ['levelCm','volumeLiter','waterLiter','waterCm','density','netWeightKg'].includes(field);
  return `<div class="field"><label>${esc(RESCAL_FIELDS.find(f=>f[0]===field)[1])}</label>
    <input type="${isNum?'number':'text'}" step="any" id="${id}" value="${value!=null?esc(value):''}"${disabled?' disabled':''}></div>`;
}
/* Neftbaza tanlangunicha kalibrovka maydonlari va tugmasi disabled bo'ladi */
function onRescalBaseChange(){
  const base = (document.getElementById('rescal_base')||{}).value || '';
  const on = !!base;
  ['rescal_table','rescal_save_btn', ...RESCAL_FIELDS.map(f=>'rescal_'+f[0])].forEach(id=>{
    const el = document.getElementById(id); if(el) el.disabled = !on;
  });
}
function openRescalForm(table){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  RESCAL_FORM_OPEN = true;
  RESCAL_EDIT = null;
  RESCAL_DEFAULT_TABLE = table || 'main';
  renderRoute();
  setTimeout(()=>{ const el = $('#rescal_base'); if(el && el.scrollIntoView) el.scrollIntoView({behavior:'smooth', block:'center'}); }, 50);
}
function closeRescalForm(){
  RESCAL_FORM_OPEN = false;
  RESCAL_EDIT = null;
  renderRoute();
}
function renderReservoirCalibPage(){
  const cal = DB.refs.reservoirCalib;
  const userBase = currentUserBase();
  const bases = isUser() ? (userBase ? [userBase] : []) : (DB.refs.bases || []);
  if(isUser()) RESCAL_FILTER_BASE = userBase; // User faqat o'z neftbazasini ko'radi/tahrirlaydi
  const editRecord = RESCAL_EDIT ? cal[RESCAL_EDIT.table].find(r=>r.id===RESCAL_EDIT.id) : null;
  const activeTable = editRecord ? RESCAL_EDIT.table : RESCAL_DEFAULT_TABLE;
  const baseVal = editRecord ? (editRecord.base || '') : (isUser() ? userBase : '');
  const gate = baseVal ? '' : ' disabled';
  const baseSel = `<div class="field"><label>Neftbaza <span class="req">*</span></label>
    <select id="rescal_base" onchange="onRescalBaseChange()"${isUser()?' disabled':''}>
      ${isUser()
        ? (userBase ? `<option value="${esc(userBase)}" selected>${esc(userBase)}</option>` : `<option value="">— biriktirilmagan —</option>`)
        : `<option value="">— Neftbazani tanlang —</option>${bases.map(b=>`<option value="${esc(b)}" ${b===baseVal?'selected':''}>${esc(b)}</option>`).join('')}`}
    </select></div>`;
  const tableSel = `<div class="field"><label>Jadval turi</label>
    <select id="rescal_table"${gate}>
      <option value="main" ${activeTable==='main' ? 'selected':''}>Asosiy ro'yxat (rezervuarlar)</option>
      <option value="pending" ${activeTable==='pending' ? 'selected':''}>Tushirib olinmagan mahsulotlar</option>
    </select></div>`;

  const formFields = RESCAL_FIELDS.map(([fk]) => rescalRow(fk, editRecord ? editRecord[fk] : '', !baseVal)).join('');

  const addForm = (RESCAL_FORM_OPEN || editRecord) ? `
    <div class="card">
      <div class="cardhead">
        <div><h2>${ICON_TANK} ${editRecord ? "Yozuvni tahrirlash" : "Yangi yozuv qo'shish"} — Rezervuarlar</h2><div class="sub">Avval Neftbazani tanlang, so'ng ma'lumotlarni kiriting</div></div>
        <button type="button" class="btn ghost sm" onclick="closeRescalForm()">${ICON_BACK} Yopish</button>
      </div>
      <div class="fieldgrid">
        ${baseSel}
        ${tableSel}
        ${formFields}
      </div>
      <div class="formfoot">
        <button type="button" class="btn primary" id="rescal_save_btn"${gate} onclick="saveReservoirCalib()">${ICON_SAVE} ${editRecord ? 'Yangilash' : "Qo'shish"}</button>
        <button type="button" class="btn ghost" onclick="closeRescalForm()">Bekor qilish</button>
      </div>
    </div>` : '';

  const tableHtml = (rows, table) => {
    const head = `<th>Neftbaza</th>` + RESCAL_FIELDS.map(([,fl])=>`<th>${esc(fl)}</th>`).join('') + (isGuest()?'':'<th></th>');
    const body = rows.length ? rows.map(r => `
      <tr>
        <td>${esc(r.base||'—')}</td>
        ${RESCAL_FIELDS.map(([fk]) => `<td class="${['levelCm','volumeLiter','waterLiter','waterCm','density','netWeightKg'].includes(fk)?'num':''}">${r[fk]!==''&&r[fk]!=null ? (['volumeLiter','netWeightKg'].includes(fk)? fmt(r[fk], fk==='netWeightKg'?2:0) : esc(r[fk])) : '—'}</td>`).join('')}
        ${isGuest() ? '' : `<td style="white-space:nowrap;">
          <button class="btn sm icon" onclick="editReservoirCalibOpen('${table}','${r.id}')" title="Tahrirlash">${ICON_EDIT}</button>
          <button class="btn sm danger icon" onclick="confirmDeleteReservoirCalib('${table}','${r.id}')" title="O'chirish">${ICON_CLOSE}</button>
        </td>`}
      </tr>
    `).join('') : `<tr class="emptyrow"><td colspan="${RESCAL_FIELDS.length+2}">Hali yozuv yo'q</td></tr>`;
    return `<div class="tablewrap"><table class="datatable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
  };

  const filterCard = `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_FACTORY} Neftbaza</h2><div class="sub">Rezervuarlar holati va tushirib olinmagan mahsulotlar shu neftbaza bo'yicha birga ko'rsatiladi</div></div></div>
      <div class="field" style="max-width:340px;">
        <label>Neftbaza <span class="req">*</span></label>
        ${isUser()
          ? `<select disabled><option>${esc(userBase||'— biriktirilmagan —')}</option></select>`
          : `<select onchange="RESCAL_FILTER_BASE=this.value;renderRoute();">
               <option value="">— Neftbazani tanlang —</option>
               ${bases.map(b=>`<option value="${esc(b)}" ${b===RESCAL_FILTER_BASE?'selected':''}>${esc(b)}</option>`).join('')}
             </select>`}
      </div>
    </div>`;

  const mainRows = RESCAL_FILTER_BASE ? cal.main.filter(r=>r.base===RESCAL_FILTER_BASE) : [];
  const pendingRows = RESCAL_FILTER_BASE ? cal.pending.filter(r=>r.base===RESCAL_FILTER_BASE) : [];

  const lists = RESCAL_FILTER_BASE ? `
    <div class="card">
      <div class="cardhead">
        <h2>${ICON_TANK} Rezervuarlar ro'yxati — ${esc(RESCAL_FILTER_BASE)} <span class="badge-num">${mainRows.length}</span></h2>
        ${isGuest() ? '' : `<button type="button" class="btn primary sm" onclick="openRescalForm('main')">+ Yangi yozuv</button>`}
      </div>
      ${tableHtml(mainRows, 'main')}
    </div>
    <div class="card">
      <div class="cardhead">
        <div><h2>${ICON_BOX} Tushirib olinmagan mahsulotlar — ${esc(RESCAL_FILTER_BASE)} <span class="badge-num">${pendingRows.length}</span></h2>
        <div class="sub">Rezervuarlarga tushirib olinmagan yoki vagonlarga ortilib chiqarilmay qolgan mahsulotlar ko'rsatiladi</div></div>
        ${isGuest() ? '' : `<button type="button" class="btn primary sm" onclick="openRescalForm('pending')">+ Yangi yozuv</button>`}
      </div>
      ${tableHtml(pendingRows, 'pending')}
    </div>`
    : `<div class="card"><div class="empty-illustration"><div class="big">${ICON_TANK}</div>Avval Neftbazani tanlang</div></div>`;

  return `${addForm}${filterCard}${lists}`;
}
function editReservoirCalibOpen(table, id){
  const rec = (DB.refs.reservoirCalib[table]||[]).find(r=>r.id===id);
  if(isUser() && rec && rec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli rezervuarni tahrirlay olasiz", 'danger'); return; }
  RESCAL_EDIT = {table, id}; RESCAL_FORM_OPEN = true; renderRoute();
}
async function saveReservoirCalib(){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const table = document.getElementById('rescal_table').value;
  const baseEl = document.getElementById('rescal_base');
  const baseVal = baseEl ? baseEl.value : '';
  if(!baseVal){ toast("Neftbazani tanlang (majburiy)", 'danger'); return; }
  if(isUser() && baseVal !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli rezervuar saqlashingiz mumkin", 'danger'); return; }
  if(isUser() && RESCAL_EDIT){
    const existingRec = (DB.refs.reservoirCalib[RESCAL_EDIT.table]||[]).find(r=>r.id===RESCAL_EDIT.id);
    if(existingRec && existingRec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli rezervuarni tahrirlay olasiz", 'danger'); return; }
  }
  const obj = { id: RESCAL_EDIT ? RESCAL_EDIT.id : uid(), base: baseVal };
  let numberVal = '';
  RESCAL_FIELDS.forEach(([fk]) => {
    const el = document.getElementById(`rescal_${fk}`);
    const v = el ? el.value.trim() : '';
    const isNum = ['levelCm','volumeLiter','waterLiter','waterCm','density','netWeightKg'].includes(fk);
    obj[fk] = v === '' ? '' : (isNum ? num(v) : v);
    if(fk==='number') numberVal = v;
  });
  if(!numberVal){ toast("Rezervuar raqamini kiriting", 'danger'); return; }
  if(RESCAL_EDIT){
    if(RESCAL_EDIT.table === table){
      const idx = DB.refs.reservoirCalib[table].findIndex(r=>r.id===RESCAL_EDIT.id);
      if(idx>-1) DB.refs.reservoirCalib[table][idx] = obj; else DB.refs.reservoirCalib[table].push(obj);
    } else {
      const oldArr = DB.refs.reservoirCalib[RESCAL_EDIT.table];
      const idx = oldArr.findIndex(r=>r.id===RESCAL_EDIT.id);
      if(idx>-1) oldArr.splice(idx,1);
      DB.refs.reservoirCalib[table].push(obj);
    }
  } else {
    DB.refs.reservoirCalib[table].push(obj);
  }
  deriveSimpleReservoirs();
  if(table==='main') RESCAL_FILTER_BASE = obj.base || RESCAL_FILTER_BASE;
  await persist('refs');
  toast(RESCAL_EDIT ? 'Yozuv yangilandi' : "Qo'shildi");
  RESCAL_EDIT = null;
  RESCAL_FORM_OPEN = false;
  renderRoute();
}
function confirmDeleteReservoirCalib(table, id){
  const rec = (DB.refs.reservoirCalib[table]||[]).find(r=>r.id===id);
  if(isUser() && rec && rec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli rezervuarni o'chira olasiz", 'danger'); return; }
  askConfirm("Bu yozuvni o'chirmoqchimisiz?", function(){ deleteReservoirCalib(table, id); });
}
async function deleteReservoirCalib(table, id){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const rec = (DB.refs.reservoirCalib[table]||[]).find(r=>r.id===id);
  if(isUser() && rec && rec.base !== currentUserBase()){ toast("Faqat o'z Neftbazangizga tegishli rezervuarni o'chira olasiz", 'danger'); return; }
  DB.refs.reservoirCalib[table] = DB.refs.reservoirCalib[table].filter(r=>r.id!==id);
  deriveSimpleReservoirs();
  await persist('refs');
  toast("O'chirildi", 'danger');
  renderRoute();
}

