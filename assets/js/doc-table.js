const COLUMN_LABELS = {
  opDate:'Sana', ttn:'TTN №', base:'Neftbaza', nomenclature:'Nomenklatura', autoNum:'Avto №',
  docKg:'Hujjat, kg', factKg:'Fakt, kg', diff:'Farq, kg', driver:'Haydovchi', destination:"Yo'nalish",
  vagonNum:'Vagon №', invNetKg:'Nakladnoy netto, kg', netKg:'Fakt netto, kg', contractor:'Kontragent',
  docNum:'Hujjat №', installationName:'Qurilma', kg:'Miqdor, kg', causeType:'Sabab',
  normPercent:"Chegara, %", shortageSurplus:'Kamomad(-)/Ortiqcha(+), kg', oprihodovano:'Kirim qilindi, kg', normPoteri:"Me'yoriy yo'qotish, kg", accepted:'Qabul qilingan, kg',
  smena:'Smena', createdAt:"To'ldirilgan sana/vaqt", cargoStatus:'Yuk holati'
};
function cellValue(docType, row, col){
  if(col==='diff' || col==='shortageSurplus'){
    const v = row[col];
    const cls = v>0?'pos':(v<0?'neg':'');
    return `<span class="num ${cls}">${v>0?'+':''}${fmt(v,1)}</span>`;
  }
  if(col==='normPercent') return `<span class="num">${fmt(row.normPercent,2)}%</span>`;
  if(col==='opDate') return fmtDate(row.opDate);
  if(col==='createdAt') return `<span class="num" style="white-space:nowrap;">${fmtDateTime(row.createdAt)}</span>`;
  if(col==='smena') return row.smena ? `<span class="badge-num">${esc(row.smena)}-Smena</span>` : '—';
  if(['docKg','factKg','kg','invNetKg','netKg','oprihodovano','normPoteri','accepted'].includes(col)) return `<span class="num">${fmt(row[col],1)}</span>`;
  return esc(row[col] ?? '—') || '—';
}

/* Jurnal jadvallari uchun "Izoh" katakchasi: uzun matn qisqartiriladi,
   sichqoncha ustiga borganda (title) to'liq ko'rinadi. */
function noteCell(r){
  const note = (r && r.note != null) ? String(r.note).trim() : '';
  if(!note) return `<td class="notecell" style="color:var(--muted);">—</td>`;
  return `<td class="notecell" title="${esc(note)}" style="max-width:240px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:var(--muted);">${esc(note)}</td>`;
}
/* Ma'lumotni jurnalga kim qo'shganini aniqlash:
   avval hujjatga yozilgan muallif (createdBy), bo'lmasa smenadagi mas'ul shaxs. */
function docAuthor(doc){
  if(doc && doc.createdBy) return doc.createdBy;
  if(doc && doc.shiftId){
    const s = (DB.shifts||[]).find(x=>x.id===doc.shiftId);
    if(s && s.personName) return s.personName;
  }
  return '—';
}
/* Hozirgi foydalanuvchi nomi — yangi hujjat saqlanganda muallif sifatida yoziladi. */
function currentAuthorName(){
  if(isUser()){
    const os = getOpenShift();
    return (os && os.personName) ? os.personName : (CURRENT_USER?.fullName || 'Foydalanuvchi');
  }
  if(isAdmin()) return 'Administrator';
  return '—';
}
/* Barcha jurnallar uchun umumiy meta-ustunlar: Smena | Vaqt | Izoh | Muallif */
function metaHeadCells(){ return `<th>Smena</th><th>Vaqt</th><th>Izoh</th><th>Muallif</th>`; }
function metaCells(r){
  const smena = r.smena ? `<span class="badge-num">${esc(String(r.smena))}-Smena</span>` : '—';
  const vaqt = r.createdAt ? `<span class="num" style="white-space:nowrap;">${fmtDateTime(r.createdAt)}</span>` : '—';
  return `<td>${smena}</td><td>${vaqt}</td>${noteCell(r)}<td>${esc(docAuthor(r))}</td>`;
}
function renderDocTable(docType){
  const cfg = DOC_TYPES[docType];
  const rows = [...DB.docs[docType]].sort((a,b)=> (b.opDate||'').localeCompare(a.opDate||'') || b.createdAt-a.createdAt);
  const head = cfg.columns.map(c => `<th>${esc(COLUMN_LABELS[c]||c)}</th>`).join('') + metaHeadCells() + (isGuest() ? '' : '<th></th>');
  const body = rows.length ? rows.map(r => `
    <tr>
      ${cfg.columns.map(c => `<td class="${['docKg','factKg','kg','invNetKg','netKg','diff','normPercent','shortageSurplus','oprihodovano','normPoteri','accepted'].includes(c)?'num':''}">${cellValue(docType,r,c)}</td>`).join('')}
      ${metaCells(r)}
      ${isGuest() ? '' : `<td style="white-space:nowrap;">
        ${canEditDoc(r) ? `<button class="btn sm icon" onclick="editDoc('${docType}','${r.id}')" title="Tahrirlash">${ICON_EDIT}</button>
        <button class="btn sm danger icon" onclick="confirmDeleteDoc('${docType}','${r.id}')" title="O'chirish">${ICON_CLOSE}</button>` : `<span class="hint" title="Smena yopilgan">${ICON_LOCK}</span>`}
      </td>`}
    </tr>
  `).join('') : `<tr class="emptyrow"><td colspan="${cfg.columns.length+5}">Hali hujjat kiritilmagan</td></tr>`;
  return `
    <div class="card">
      <div class="cardhead">
        <h2>${cfg.icon} ${esc(cfg.title)} <span class="badge-num">${rows.length}</span></h2>
        ${isGuest() ? '' : `<button type="button" class="btn primary sm" onclick="openDocForm('${docType}')">+ Yangi hujjat</button>`}
      </div>
      <div class="tablewrap"><table class="datatable"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>
    </div>
  `;
}

const KG_LITER_SYNC_MAP = {
  prihodAvto: { prefixes:['doc','fact'], divisor:1 },
  rashodAvto: { prefixes:['doc'], divisor:1 },
  izlishka: { prefixes:[''], divisor:1 },
  spisaniya: { prefixes:[''], divisor:1 },
  sUstanovki: { prefixes:[''], divisor:1 },
  vUstanovku: { prefixes:[''], divisor:1 },
  rashodVagon: { prefixes:[''], divisor:1, kgKey:'netKg' },
  prihodVagon: { prefixes:[''], divisor:1, kgKey:'netKg' }
};
function wireKgLiterSync(docType, cfg){
  const form = document.getElementById(`form_${docType}`);
  if(!form) return;
  const { prefixes, divisor, kgKey } = cfg;
  form.addEventListener('input', (e) => {
    const id = e.target.id;
    prefixes.forEach(p => {
      const kgId = p ? `f_${docType}_${p}${kgKey?(kgKey[0].toUpperCase()+kgKey.slice(1)):'Kg'}` : `f_${docType}_${kgKey||'kg'}`;
      const densId = p ? `f_${docType}_${p}Density` : `f_${docType}_density`;
      const litId = p ? `f_${docType}_${p}Liter` : `f_${docType}_liter`;
      const kgEl = document.getElementById(kgId), densEl = document.getElementById(densId), litEl = document.getElementById(litId);
      if(!kgEl || !densEl || !litEl) return;
      if(id !== kgId && id !== densId && id !== litId) return;

      // the field the user just typed into is always "real" (user-provided), never auto
      e.target.dataset.auto = '';

      const setAuto = (el, val) => { el.value = val; el.dataset.auto = '1'; };
      const kg = num(kgEl.value), dens = num(densEl.value), lit = num(litEl.value);
      const kgReal = kg > 0 && kgEl.dataset.auto !== '1';
      const litReal = lit > 0 && litEl.dataset.auto !== '1';
      const densReal = dens > 0 && densEl.dataset.auto !== '1';

      if(id === kgId){
        if(litReal) setAuto(densEl, round2(kg * divisor / lit));
        else if(densReal) setAuto(litEl, round2(kg * divisor / dens));
      } else if(id === litId){
        if(densReal) setAuto(kgEl, round2(lit * dens / divisor));
        else if(kgReal) setAuto(densEl, round2(kg * divisor / lit));
      } else if(id === densId){
        if(litReal) setAuto(kgEl, round2(lit * dens / divisor));
        else if(kgReal) setAuto(litEl, round2(kg * divisor / dens));
      }
    });
  });
}
function renderDocPage(docType){
  const mode = DOC_VIEW_MODE[docType] || 'journal';
  if(mode !== 'form') return renderDocTable(docType);
  const html = renderDocForm(docType);
  if(KG_LITER_SYNC_MAP[docType]){
    setTimeout(() => wireKgLiterSync(docType, KG_LITER_SYNC_MAP[docType]), 0);
  }
  if(docType === 'prihodVagon'){
    setTimeout(() => {
      const form = document.getElementById('form_prihodVagon');
      if(form){ form.addEventListener('input', recalcVagonPreview); form.addEventListener('change', recalcVagonPreview); }
      recalcVagonPreview();
      // Holat o'zgarganda "Fakt bo'yicha (o'lchov)" bo'limini berkitish/ko'rsatish
      const statusEl = document.getElementById('f_prihodVagon_status');
      if(statusEl){ statusEl.addEventListener('change', toggleVagonFactVisibility); }
      toggleVagonFactVisibility();
    }, 0);
  }
  if(docType === 'prihodAvto'){
    setTimeout(() => {
      const form = document.getElementById('form_prihodAvto');
      const fn = () => recalcAvtoPreview('prihodAvto');
      if(form){ form.addEventListener('input', fn); form.addEventListener('change', fn); }
      fn();
      // Yuk holati o'zgarganda "Fakt" bo'limini berkitish/ko'rsatish
      const statusEl = document.getElementById('f_prihodAvto_cargoStatus');
      if(statusEl){ statusEl.addEventListener('change', toggleAvtoFactVisibility); }
      toggleAvtoFactVisibility();
    }, 0);
  }
  return html;
}
