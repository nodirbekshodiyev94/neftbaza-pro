/* ---------------- Ma'lumotnomalar (справочники) ---------------- */
let REF_TAB = 'bases';
function renderRefsPage(){
  const tabs = Object.entries(REF_DEFS).map(([k,d])=>`
    <button class="tabbtn ${k===REF_TAB?'active':''}" onclick="REF_TAB='${k}';renderRoute();">${d.icon} ${esc(d.label)}</button>
  `).join('');

  if(REF_TAB === 'reservoirs'){
    return `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_BOOK} Ma'lumotnomalar (справочники)</h2><div class="sub">Tizim bo'ylab tanlov ro'yxatlari uchun asosiy manba</div></div></div>
      <div class="tabs">${tabs}</div>
    </div>
    ${renderReservoirCalibPage()}`;
  }
  if(REF_TAB === 'nomenclature'){
    return `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_BOOK} Ma'lumotnomalar (справочники)</h2><div class="sub">Tizim bo'ylab tanlov ro'yxatlari uchun asosiy manba</div></div></div>
      <div class="tabs">${tabs}</div>
    </div>
    ${renderNomenclaturePage()}`;
  }

  const def = REF_DEFS[REF_TAB];
  const items = refList(REF_TAB);

  let addFormHtml, listHtml;
  if(def.type==='flat'){
    addFormHtml = `
      <div class="fieldgrid" style="grid-template-columns:1fr auto;">
        <div class="field"><label>Yangi element</label><input type="text" id="ref_new_flat" placeholder="${esc(def.placeholder)}"></div>
        <div class="field"><label>&nbsp;</label><button class="btn primary" onclick="addRefFlat()">+ Qo'shish</button></div>
      </div>`;
    listHtml = items.length ? `<div class="tablewrap"><table class="datatable"><tbody>
      ${items.map((v,i)=>`<tr><td>${esc(v)}</td>${(isGuest()||(REF_TAB==='bases'&&isUser()))?'':`<td style="width:1%"><button class="btn sm danger icon" onclick="confirmRemoveRef(${i})">${ICON_CLOSE}</button></td>`}</tr>`).join('')}
    </tbody></table></div>` : emptyBlock();
  } else {
    addFormHtml = `
      <div class="fieldgrid">
        ${def.fields.map(([fk,fl,opts,refSrc,strictSel])=>{
          const resGate = (REF_TAB==='reservoirs' && fk!=='base') ? ' disabled' : '';
          return opts
          ? `<div class="field"><label>${esc(fl)}</label><select id="ref_new_${fk}"${resGate}><option value="">— tanlang —</option>${opts.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>`
          : (refSrc && strictSel
            ? (fk==='base'
              ? `<div class="field"><label>${esc(fl)} <span class="req">*</span></label><select id="ref_new_${fk}"${isUser()?' disabled':''}${REF_TAB==='reservoirs'?' onchange="onRefResBaseChange()"':''}>
                   ${isUser()
                     ? `<option value="${esc(currentUserBase())}" selected>${esc(currentUserBase()||'— biriktirilmagan —')}</option>`
                     : `<option value="">— tanlang —</option>${refList(refSrc).map(o=>{const v=(typeof o==='string')?o:(o[REF_DEFS[refSrc].display]);return `<option value="${esc(v)}">${esc(v)}</option>`;}).join('')}`}
                 </select></div>`
              : `<div class="field"><label>${esc(fl)} <span class="req">*</span></label><select id="ref_new_${fk}"${REF_TAB==='reservoirs'?' onchange="onRefResBaseChange()"':''}><option value="">— tanlang —</option>${refList(refSrc).map(o=>{const v=(typeof o==='string')?o:(o[REF_DEFS[refSrc].display]);return `<option value="${esc(v)}">${esc(v)}</option>`;}).join('')}</select></div>`)
          : (fk==='inn'
            ? `<div class="field"><label>${esc(fl)}</label><input type="text" id="ref_new_${fk}" placeholder="${esc(fl)}" oninput="checkInnDuplicate(this)"><span class="hint" id="inn_check_msg"></span></div>`
            : (refSrc
              ? `<div class="field"><label>${esc(fl)}</label><input type="text" id="ref_new_${fk}" list="dl_ref_new_${fk}" placeholder="${esc(fl)} — yozing yoki tanlang" autocomplete="off"><datalist id="dl_ref_new_${fk}">${refDatalistHtml(refSrc)}</datalist></div>`
              : `<div class="field"><label>${esc(fl)}</label><input type="text" id="ref_new_${fk}" placeholder="${esc(fl)}"${resGate}></div>`)));
        }).join('')}
        <div class="field"><label>&nbsp;</label><button class="btn primary" id="ref_add_btn"${REF_TAB==='reservoirs'?' disabled':''} onclick="addRefObject()">+ Qo'shish</button></div>
      </div>`;
    if(REF_TAB==='reservoirs'){
      listHtml = reservoirFilteredListHtml();
    } else {
      listHtml = items.length ? `<div class="tablewrap"><table class="datatable"><thead><tr>
        ${def.fields.map(([fk,fl])=>`<th>${esc(fl)}</th>`).join('')}${isGuest()?'':'<th></th>'}
      </tr></thead><tbody>
        ${items.map((o,i)=>`<tr>${def.fields.map(([fk])=>`<td>${esc(o[fk]??'—')}</td>`).join('')}${isGuest()?'':`<td style="width:1%"><button class="btn sm danger icon" onclick="confirmRemoveRef(${i})">${ICON_CLOSE}</button></td>`}</tr>`).join('')}
      </tbody></table></div>` : emptyBlock();
    }
  }

  return `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_BOOK} Ma'lumotnomalar (справочники)</h2><div class="sub">Tizim bo'ylab tanlov ro'yxatlari uchun asosiy manba</div></div></div>
      <div class="tabs">${tabs}</div>
      ${(isGuest()||(REF_TAB==='bases'&&isUser())) ? '' : `<div class="formsection"><div class="fstitle">Yangi yozuv qo'shish — ${esc(def.label)}</div>${addFormHtml}</div>`}
      <div class="formsection"><div class="fstitle">Ro'yxat <span class="badge-num">${items.length}</span></div>${listHtml}</div>
    </div>
  `;
}
function emptyBlock(){ return `<div class="empty-illustration"><div class="big">${ICON_INBOX}</div>Hali element qo'shilmagan</div>`; }

/* Rezervuarlar ro'yxati — ustida Neftbaza filtr dropdowni; faqat tanlangan neftbaza rezervuarlari */
let RES_FILTER_BASE = '';
function reservoirFilteredListHtml(){
  const bases = DB.refs.bases || [];
  const sel = RES_FILTER_BASE || '';
  const dropdown = `
    <div class="field" style="max-width:340px;margin-bottom:14px;">
      <label>Neftbaza <span class="req">*</span></label>
      <select onchange="RES_FILTER_BASE=this.value;renderRoute();">
        <option value="">— Neftbazani tanlang —</option>
        ${bases.map(b=>`<option value="${esc(b)}" ${b===sel?'selected':''}>${esc(b)}</option>`).join('')}
      </select>
    </div>`;
  if(!sel){
    return dropdown + `<div class="empty-illustration"><div class="big">${ICON_FACTORY}</div>Avval Neftbazani tanlang</div>`;
  }
  const rows = refList('reservoirs').map((o,i)=>({o,i})).filter(x=>x.o.base===sel);
  const table = rows.length ? `<div class="tablewrap"><table class="datatable">
    <thead><tr><th>Nomi</th><th>Turi</th><th>Sig'imi, kg</th>${isGuest()?'':'<th></th>'}</tr></thead>
    <tbody>
      ${rows.map(({o,i})=>`<tr>
        <td>${esc(o.name??'—')}</td>
        <td>${esc(o.kind??'—')}</td>
        <td class="num">${o.volume!=null&&o.volume!==''?fmt(o.volume,0):'—'}</td>
        ${isGuest()?'':`<td style="width:1%"><button class="btn sm danger icon" onclick="confirmRemoveRef(${i})">${ICON_CLOSE}</button></td>`}
      </tr>`).join('')}
    </tbody>
  </table></div>` : `<div class="empty-illustration"><div class="big">${ICON_INBOX}</div>Bu neftbazada rezervuar yo'q</div>`;
  return dropdown
    + `<div class="fstitle" style="margin-top:2px;">${ICON_FACTORY} ${esc(sel)} neftbazasi rezervuarlari <span class="badge-num">${rows.length}</span></div>`
    + table;
}
function onRefResBaseChange(){
  const base = (document.getElementById('ref_new_base')||{}).value || '';
  const on = !!base;
  ['ref_new_name','ref_new_kind','ref_new_volume','ref_add_btn'].forEach(id=>{
    const el = document.getElementById(id); if(el) el.disabled = !on;
  });
}

async function addRefFlat(){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  if(REF_TAB==='bases' && isUser()){ toast("Bu bo'limni faqat administrator boshqaradi", 'danger'); return; }
  const el = $('#ref_new_flat');
  const v = el.value.trim();
  if(!v){ toast("Qiymat kiriting", 'danger'); return; }
  DB.refs[REF_TAB].push(v);
  await persist('refs'); toast("Qo'shildi"); renderRoute();
}
async function addRefObject(){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const def = REF_DEFS[REF_TAB];
  const obj = {};
  let ok = true;
  def.fields.forEach(([fk])=>{
    const el = document.getElementById(`ref_new_${fk}`);
    obj[fk] = el ? el.value.trim() : '';
    if(fk===def.display && !obj[fk]) ok = false;
  });
  if(!ok){ toast("Asosiy maydonni to'ldiring", 'danger'); return; }
  const hasBaseField = def.fields.some(f=>f[0]==='base');
  if(hasBaseField){
    if(isUser()) obj.base = currentUserBase(); // User uchun — o'zgartirib bo'lmaydigan, biriktirilgan neftbaza
    if(!obj.base){ toast("Neftbazani tanlang (majburiy)", 'danger'); return; }
  }
  if(fk_num_field(REF_TAB)) obj.volume = num(obj.volume);
  if(REF_TAB==='normPotr') obj.percent = num(obj.percent);
  if((REF_TAB==='organizations' || REF_TAB==='contractors') && obj.inn){
    if(innExists(obj.inn)){ toast('Bunday tashkilot INNsi mavjud — qayta kiritish taqiqlangan', 'danger'); return; }
  }
  obj.id = uid();
  DB.refs[REF_TAB].push(obj);
  if(REF_TAB==='reservoirs') RES_FILTER_BASE = obj.base || RES_FILTER_BASE;
  await persist('refs'); toast("Qo'shildi"); renderRoute();
}
function fk_num_field(tab){ return tab==='reservoirs'; }
function innExists(v){
  if(!v) return false;
  const inOrgs = (DB.refs.organizations||[]).some(o => o.inn && o.inn === v);
  const inContractors = (DB.refs.contractors||[]).some(o => o.inn && o.inn === v);
  return inOrgs || inContractors;
}
function checkInnDuplicate(el){
  const msgEl = document.getElementById('inn_check_msg');
  const btn = document.getElementById('ref_add_btn');
  if(!msgEl) return;
  const v = el.value.trim();
  if(!v){ msgEl.textContent = ''; if(btn) btn.disabled = false; return; }
  const dup = innExists(v);
  if(dup){
    msgEl.textContent = 'Bunday tashkilot INNsi mavjud — qayta kiritish taqiqlangan';
    msgEl.style.color = 'var(--danger)';
    if(btn) btn.disabled = true;
  } else {
    msgEl.textContent = 'Band emas';
    msgEl.style.color = 'var(--success)';
    if(btn) btn.disabled = false;
  }
}
async function removeRef(idx){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  if(REF_TAB==='bases' && isUser()){ toast("Bu bo'limni faqat administrator boshqaradi", 'danger'); return; }
  DB.refs[REF_TAB].splice(idx,1);
  await persist('refs'); toast("O'chirildi", 'danger'); renderRoute();
}

