/* ---------------- generic field renderer ---------------- */
function fieldHtml(docType, f, currentVal){
  const id = `f_${docType}_${f.key}`;
  const val = (currentVal !== undefined && currentVal !== null && currentVal !== '') ? currentVal : f.def;
  const wideClass = (f.type==='textarea') ? ' wide' : '';
  let inner = '';
  if(f.key === 'smena'){
    const effShift = effectiveShiftObj();
    const shiftVal = currentVal || (effShift ? effShift.number : (val||''));
    if(isUser()){
      inner = `<input type="text" id="${id}" value="${esc(shiftVal)}" readonly style="opacity:.75;cursor:not-allowed;">`;
    } else {
      inner = `<input type="text" id="${id}" value="${esc(shiftVal)}">`;
    }
  } else if(f.key==='nomenclature' && f.ref==='nomenclature'){
    const base = FORM_BASE_CTX || '';
    const res = FORM_RESERVOIR_CTX || '';
    const gated = !(base && res);
    if(f.type==='autocomplete'){
      inner = `<input type="text" id="${id}" list="dl_${id}" placeholder="${gated ? 'Avval Neftbaza va Rezervuarni tanlang' : 'Qidirish uchun yozing…'}" value="${val?esc(val):''}" autocomplete="off" ${gated?'disabled':''}>
        <datalist id="dl_${id}">${refDatalistHtml(f.ref)}</datalist>`;
    } else {
      inner = `<select id="${id}" ${gated?'disabled':''}>${nomenclatureOptionsHtml(base, res, val||'')}</select>`;
    }
  } else if(f.type==='autocomplete' && f.ref){
    inner = `<input type="text" id="${id}" list="dl_${id}" placeholder="Qidirish uchun yozing…" value="${val?esc(val):''}" autocomplete="off">
      <datalist id="dl_${id}">${refDatalistHtml(f.ref)}</datalist>`;
  } else if(f.key==='reservoir' && f.ref==='reservoirs'){
    const base = FORM_BASE_CTX || '';
    inner = `<select id="${id}" ${base?'':'disabled'} onchange="onDocReservoirChange('${docType}')">${reservoirOptionsHtml(base, val||'')}</select>`;
  } else if(f.key==='base' && f.ref==='bases'){
    inner = `<select id="${id}" onchange="onDocBaseChange('${docType}')">${refOptionsHtml('bases', val||'')}</select>`;
  } else if(f.type==='select' && f.ref){
    inner = `<select id="${id}">${refOptionsHtml(f.ref, val||'')}</select>`;
  } else if(f.type==='select' && f.options){
    inner = `<select id="${id}">` + f.options.map(o=>`<option value="${esc(o)}" ${o===val?'selected':''}>${esc(o)}</option>`).join('') + `</select>`;
  } else if(f.type==='textarea'){
    inner = `<textarea id="${id}" placeholder="${esc(f.placeholder||'')}">${esc(val||'')}</textarea>`;
  } else if(f.type==='number'){
    inner = `<input type="number" id="${id}" step="${f.step||'any'}" placeholder="0" value="${val!=null?esc(val):''}">`;
  } else if(f.type==='date'){
    inner = `<input type="date" id="${id}" value="${val?esc(val):''}">`;
  } else {
    inner = `<input type="text" id="${id}" placeholder="${esc(f.placeholder||'')}" value="${val?esc(val):''}" ${f.readonly?'readonly style="opacity:.75;cursor:not-allowed;"':''}>`;
  }
  return `<div class="field${wideClass}"><label>${esc(f.label)}${f.required?' <span class="req">*</span>':''}</label>${inner}</div>`;
}
function refDatalistHtml(key){
  const def = REF_DEFS[key];
  const items = refList(key);
  if(def.type === 'flat'){
    return items.map(v => `<option value="${esc(v)}">`).join('');
  }
  return items.map(o => `<option value="${esc(o[def.display])}">`).join('');
}

const DOC_VIEW_MODE = {};
const EDITING_ID = {};
function openDocForm(docType){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  if(isUser() && !hasWorkableShift()){ toast("Avval smenani oching", 'danger'); return; }
  EDITING_ID[docType] = null; DOC_VIEW_MODE[docType] = 'form'; renderRoute();
}
function editDoc(docType, id){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const rec = DB.docs[docType].find(d=>d.id===id);
  if(rec && !canEditDoc(rec)){ toast("Bu hujjat qulflangan smenaga tegishli — faqat admin ruxsat bersa tahrirlash mumkin", 'danger'); return; }
  EDITING_ID[docType] = id; DOC_VIEW_MODE[docType] = 'form'; renderRoute();
}
function closeDocForm(docType){ EDITING_ID[docType] = null; DOC_VIEW_MODE[docType] = 'journal'; renderRoute(); }

function avtoPreviewHtml(){
  return `
    <div class="formsection" id="avto_preview_section">
      <div class="fstitle fstitle-fact">Yakuniy hisob-kitob (avtomatik)</div>
      <div class="statgrid">
        <div class="stat out"><div class="lbl">Kamomad, kg</div><div class="val"><span id="av_short">0</span><small>kg</small></div></div>
        <div class="stat in"><div class="lbl">Ortiqcha, kg</div><div class="val"><span id="av_surplus">0</span><small>kg</small></div></div>
        <div class="stat in"><div class="lbl">Qabul qilingan, kg</div><div class="val"><span id="av_acc">0</span><small>kg</small></div></div>
      </div>
      <div id="av_capacity_warning" style="display:none;margin-top:10px;padding:10px 14px;border-radius:8px;background:var(--danger-dim);color:var(--danger);font-size:13px;font-weight:600;"></div>
    </div>`;
}
function recalcAvtoPreview(docType){
  const get = k => num(document.getElementById(`f_${docType}_${k}`)?.value);
  const nomEl = document.getElementById(`f_${docType}_nomenclature`);
  const docKg = get('docKg'), factKg = get('factKg');
  const diff = round2(factKg - docKg);
  const pct = getNormPercent(nomEl ? nomEl.value : '');
  const toleranceKg = round2(docKg * pct / 100);
  const ns = Math.abs(diff) <= toleranceKg ? 0 : round2(diff - Math.sign(diff)*toleranceKg);
  const shortage = ns < 0 ? Math.abs(ns) : 0;
  const surplus = ns > 0 ? ns : 0;
  const acc = ns === 0 ? round2(docKg) : round2(factKg);
  const set = (id,v) => { const el = document.getElementById(id); if(el) el.textContent = fmt(v,1); };
  const setSigned = (id,v) => { const el = document.getElementById(id); if(el) el.textContent = (v>0?'+':'') + fmt(v,1); };
  set('av_short', shortage); set('av_surplus', surplus); set('av_acc', acc);
  const warnEl = document.getElementById('av_capacity_warning');
  if(warnEl){
    const baseEl = document.getElementById(`f_${docType}_base`);
    const resEl = document.getElementById(`f_${docType}_reservoir`);
    const editId = EDITING_ID ? EDITING_ID[docType] : null;
    const check = (baseEl && resEl && baseEl.value && resEl.value) ? checkReservoirCapacity(docType, baseEl.value, resEl.value, acc, editId) : {ok:true};
    if(!check.ok){
      warnEl.style.display = 'block';
      warnEl.textContent = `Rezervuar sig'imi yetarli emas! Bo'sh joy: ${fmt(check.available,1)} kg (sig'im: ${fmt(check.volume,0)} kg)`;
    } else {
      warnEl.style.display = 'none';
    }
  }
}
/* Yuk holatiga qarab "Fakt bo'yicha (o'lchov natijasi)" va avtomatik hisob-kitob
   bo'limlarini berkitish/ko'rsatish. Yuk "Yo'lda" bo'lsa — hali o'lchov yo'q, berkitamiz. */
function toggleAvtoFactVisibility(){
  const form = document.getElementById('form_prihodAvto');
  if(!form) return;
  const statusEl = document.getElementById('f_prihodAvto_cargoStatus');
  const onRoad = statusEl && statusEl.value === "Yo'lda";
  const factSec = form.querySelector('.formsection[data-variant="fact"]');
  const previewSec = document.getElementById('avto_preview_section');
  if(factSec) factSec.style.display = onRoad ? 'none' : '';
  if(previewSec) previewSec.style.display = onRoad ? 'none' : '';
}
/* Vagon: holat "Yo'lda" bo'lsa fakt o'lchovi va yakuniy hisob-kitob berkitiladi,
   "Yetib kelgan" bo'lsa ko'rsatiladi. */
function toggleVagonFactVisibility(){
  const form = document.getElementById('form_prihodVagon');
  if(!form) return;
  const statusEl = document.getElementById('f_prihodVagon_status');
  const onRoad = statusEl && statusEl.value === "Yo'lda";
  const factSec = form.querySelector('.formsection[data-variant="fact"]');
  const previewSec = document.getElementById('vagon_preview_section');
  if(factSec) factSec.style.display = onRoad ? 'none' : '';
  if(previewSec) previewSec.style.display = onRoad ? 'none' : '';
  // "Yetib kelgan sana" — yuk yo'lda bo'lsa yashiriladi (hali yetib kelmagan)
  const arriveEl = document.getElementById('f_prihodVagon_dateArrive');
  const arriveField = arriveEl ? arriveEl.closest('.field') : null;
  if(arriveField) arriveField.style.display = onRoad ? 'none' : '';
  if(onRoad && arriveEl) arriveEl.value = '';
}
function vagonPreviewHtml(){
  return `
    <div class="formsection" id="vagon_preview_section">
      <div class="fstitle fstitle-fact">Yakuniy hisob-kitob (avtomatik)</div>
      <div class="statgrid">
        <div class="stat"><div class="lbl">Farq (fakt − nakladnoy), kg</div><div class="val"><span id="vg_diff">0</span><small>kg</small></div></div>
        <div class="stat"><div class="lbl">Ruxsat etilgan chegara (0.65%), kg</div><div class="val"><span id="vg_norm">0</span><small>kg</small></div></div>
        <div class="stat"><div class="lbl">Kamomad(-) / Ortiqcha(+), kg</div><div class="val"><span id="vg_ns">0</span><small>kg</small></div></div>
        <div class="stat in"><div class="lbl">Kirim qilindi, kg</div><div class="val"><span id="vg_opr">0</span><small>kg</small></div></div>
      </div>
    </div>`;
}
function recalcVagonPreview(){
  const get = k => num(document.getElementById(`f_prihodVagon_${k}`)?.value);
  const invNetKg = get('invNetKg'), netKg = get('netKg');
  const diff = round2(netKg - invNetKg);
  const pct = 0.65;
  const toleranceKg = round2(netKg * pct / 100);
  const ns = Math.abs(diff) <= toleranceKg ? 0 : round2(diff - Math.sign(diff)*toleranceKg);
  const opr = ns === 0 ? round2(invNetKg) : round2(netKg);
  const set = (id,v,signed) => { const el = document.getElementById(id); if(el) el.textContent = (signed && v>0 ? '+' : '') + fmt(v, 1); };
  set('vg_diff', diff, true); set('vg_norm', toleranceKg, false); set('vg_ns', ns, true); set('vg_opr', opr, false);
}
function renderDocForm(docType){
  const cfg = DOC_TYPES[docType];
  const editId = EDITING_ID[docType];
  const record = editId ? DB.docs[docType].find(d => d.id === editId) : null;
  FORM_BASE_CTX = record ? (record.base || '') : '';
  FORM_RESERVOIR_CTX = record ? (record.reservoir || '') : '';
  const izohAfterPreview = docType === 'prihodVagon' || docType === 'prihodAvto';
  const mainSections = izohAfterPreview ? cfg.sections.filter(sec => sec.title !== 'Izoh') : cfg.sections;
  const izohSection = izohAfterPreview ? cfg.sections.find(sec => sec.title === 'Izoh') : null;
  const sectionHtml = sec => `
    <div class="formsection"${sec.variant?` data-variant="${sec.variant}"`:''}>
      <div class="fstitle${sec.variant?' fstitle-'+sec.variant:''}">${esc(sec.title)}</div>
      <div class="fieldgrid">${sec.fields.map(f=>fieldHtml(docType,f, record ? record[f.key] : undefined)).join('')}</div>
    </div>
  `;
  const sectionsHtml = mainSections.map(sectionHtml).join('')
    + (docType==='prihodVagon' ? vagonPreviewHtml() : (docType==='prihodAvto' ? avtoPreviewHtml() : ''))
    + (izohSection ? sectionHtml(izohSection) : '');
  const heading = record ? `${ICON_EDIT} Hujjatni tahrirlash — ${esc(cfg.title)}` : `${cfg.icon} Yangi hujjat — ${esc(cfg.title)}`;
  return `
    <div class="card">
      <div class="cardhead">
        <div><h2>${heading}</h2><div class="sub">Manba varaq: ${esc(cfg.sheetRef)}</div></div>
        <button type="button" class="btn ghost sm" onclick="closeDocForm('${docType}')">${ICON_BACK} Jurnalga qaytish</button>
      </div>
      <form id="form_${docType}" onsubmit="return false;">
        ${sectionsHtml}
        <div class="formfoot">
          <button type="button" class="btn primary" onclick="saveDoc('${docType}')">${ICON_SAVE} ${record ? 'Yangilash' : 'Saqlash'}</button>
          <button type="button" class="btn ghost" onclick="closeDocForm('${docType}')">Bekor qilish</button>
        </div>
      </form>
    </div>
  `;
}

function getFieldValue(docType, f){
  const el = document.getElementById(`f_${docType}_${f.key}`);
  if(!el) return '';
  return el.value;
}

async function saveDoc(docType){
  const cfg = DOC_TYPES[docType];
  const editId = EDITING_ID[docType];
  const existing = editId ? DB.docs[docType].find(d => d.id === editId) : null;
  if(existing && !canEditDoc(existing)){ toast("Bu hujjatni tahrirlashga ruxsatingiz yo'q (smena yopilgan)", 'danger'); return; }
  if(!existing && isUser() && !hasWorkableShift()){ toast("Avval smenani oching", 'danger'); return; }
  const obj = { id: editId || uid(), createdAt: existing ? existing.createdAt : Date.now() };
  let missing = [];
  cfg.sections.forEach(sec => sec.fields.forEach(f => {
    const v = getFieldValue(docType, f);
    obj[f.key] = v;
    if(f.required && !v) missing.push(f.label);
  }));
  if(missing.length){ toast(`To'ldiring: ${missing.join(', ')}`, 'danger'); return; }
  if(cfg.onSave) cfg.onSave(obj);
  if(docType === 'prihodAvto' && obj.reservoir && obj.base && obj.cargoStatus !== "Yo'lda"){
    const check = checkReservoirCapacity(docType, obj.base, obj.reservoir, num(obj.accepted), editId);
    if(!check.ok){
      toast(`Rezervuar sig'imi yetarli emas! Bo'sh joy: ${fmt(check.available,1)} kg (sig'im: ${fmt(check.volume,0)} kg, hozirgi qoldiq: ${fmt(check.balance,1)} kg)`, 'danger');
      return;
    }
  }
  if(existing){
    obj.shiftId = existing.shiftId;
    obj.createdBy = existing.createdBy || docAuthor(existing);
  } else {
    if(isUser()){
      obj.shiftId = effectiveShiftId();
    }
    obj.createdBy = currentAuthorName();
  }
  if(existing){
    const idx = DB.docs[docType].findIndex(d => d.id === editId);
    DB.docs[docType][idx] = obj;
  } else {
    DB.docs[docType].push(obj);
  }
  await persist('docs');
  await syncLedger();
  toast(existing ? 'Hujjat yangilandi' : 'Hujjat saqlandi');
  EDITING_ID[docType] = null;
  DOC_VIEW_MODE[docType] = 'journal';
  renderRoute();
}

async function deleteDoc(docType, id){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); return; }
  const rec = DB.docs[docType].find(d=>d.id===id);
  if(rec && !canEditDoc(rec)){ toast("Bu hujjat qulflangan smenaga tegishli — faqat admin ruxsat bersa o'chirish mumkin", 'danger'); return; }
  DB.docs[docType] = DB.docs[docType].filter(d => d.id !== id);
  await persist('docs');
  await syncLedger();
  toast("O'chirildi", 'danger');
  renderRoute();
}

