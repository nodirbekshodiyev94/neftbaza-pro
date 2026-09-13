/* =========================================================================
   HARAKAT TARIXI OYNASI (mahsulotga ikki marta bosilganda)
   ========================================================================= */
let MVH_STATE = null;
function movementsForProduct(name){ return (DB.movements||[]).filter(m=>m.productName===name); }
function openMovementHistory(productName){
  MVH_STATE = { product:productName, from:'', to:'', op:'', org:'', module:'', search:'', sortDir:'desc' };
  let root = document.getElementById('mvhRoot');
  if(!root){ root = document.createElement('div'); root.id = 'mvhRoot'; document.body.appendChild(root); }
  const all = movementsForProduct(productName);
  const orgs = [...new Set(all.map(m=>m.organization).filter(Boolean))].sort();
  const mods = [...new Set(all.map(m=>m.sourceModule).filter(Boolean))].sort();
  root.innerHTML = `
    <div class="mvh-overlay" onclick="if(event.target===this)closeMovementHistory()">
      <div class="mvh-modal" role="dialog" aria-modal="true">
        <div class="mvh-head">
          <div class="mvh-title">${ICON_CLOCK} Harakatlar tarixi — <b>${esc(productName)}</b></div>
          <button class="mvh-x" onclick="closeMovementHistory()" title="Yopish">${ICON_CLOSE}</button>
        </div>
        <div class="mvh-filters">
          <div class="mvh-f"><label>Sana (dan)</label><input type="date" onchange="mvhSet('from',this.value)"></div>
          <div class="mvh-f"><label>Sana (gacha)</label><input type="date" onchange="mvhSet('to',this.value)"></div>
          <div class="mvh-f"><label>Operatsiya</label><select onchange="mvhSet('op',this.value)">
            <option value="">Barchasi</option><option value="IN">Kirim (IN)</option><option value="OUT">Chiqim (OUT)</option></select></div>
          <div class="mvh-f"><label>Tashkilot</label><select onchange="mvhSet('org',this.value)">
            <option value="">Barchasi</option>${orgs.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>
          <div class="mvh-f"><label>Manba modul</label><select onchange="mvhSet('module',this.value)">
            <option value="">Barchasi</option>${mods.map(o=>`<option value="${esc(o)}">${esc(o)}</option>`).join('')}</select></div>
          <div class="mvh-f mvh-search"><label>Qidiruv</label><input type="text" placeholder="Hujjat №, izoh, tank, tashkilot..." oninput="mvhSet('search',this.value)"></div>
          <button class="btn ghost sm" onclick="mvhToggleSort()" id="mvhSortBtn" title="Saralash yo'nalishi">Sana ↓</button>
        </div>
        <div class="mvh-tablewrap">
          <table class="datatable mvh-table">
            <thead><tr>
              <th>Sana</th><th>Vaqt</th><th>Hujjat №</th><th>Operatsiya</th><th>Manba modul</th>
              <th>Tashkilot</th><th>Tank</th><th>Miqdor, kg</th><th>Zichlik</th><th>Harorat</th>
              <th>Netto, kg</th><th>Foydalanuvchi</th><th>Izoh</th>
            </tr></thead>
            <tbody id="mvhBody"></tbody>
          </table>
        </div>
        <div class="mvh-foot"><span id="mvhCount"></span><span class="mvh-hint">Ikki marta bosilgan mahsulot: <b>${esc(productName)}</b></span></div>
      </div>
    </div>`;
  mvhRender();
}
function closeMovementHistory(){ const r = document.getElementById('mvhRoot'); if(r) r.innerHTML=''; MVH_STATE=null; }
function mvhSet(key,val){ if(!MVH_STATE) return; MVH_STATE[key]=val; mvhRender(); }
function mvhToggleSort(){ if(!MVH_STATE) return; MVH_STATE.sortDir = MVH_STATE.sortDir==='desc'?'asc':'desc'; const b=document.getElementById('mvhSortBtn'); if(b) b.textContent = 'Sana '+(MVH_STATE.sortDir==='desc'?'↓':'↑'); mvhRender(); }
function mvhRender(){
  const s = MVH_STATE; if(!s) return;
  let list = movementsForProduct(s.product).filter(m=>{
    if(s.from && !(m.date>=s.from)) return false;
    if(s.to && !(m.date<=s.to)) return false;
    if(s.op && m.operation!==s.op) return false;
    if(s.org && m.organization!==s.org) return false;
    if(s.module && m.sourceModule!==s.module) return false;
    if(s.search){
      const q = s.search.toLowerCase();
      const hay = [m.docNumber,m.notes,m.tank,m.organization,m.vehicle,m.user,m.sourceModule].map(x=>String(x||'').toLowerCase()).join(' ');
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  list.sort((a,b)=>{
    const av = (a.date||'')+' '+(a.time||''), bv = (b.date||'')+' '+(b.time||'');
    const c = av<bv?-1:(av>bv?1:(a.createdAt-b.createdAt));
    return s.sortDir==='desc' ? -c : c;
  });
  const body = document.getElementById('mvhBody');
  if(!body) return;
  body.innerHTML = list.length ? list.map(m=>`
    <tr class="${m.operation==='IN'?'mvh-in':'mvh-out'}">
      <td>${fmtDate(m.date)}</td><td>${esc(m.time)}</td><td>${esc(m.docNumber||'—')}</td>
      <td><span class="mvh-op ${m.operation==='IN'?'in':'out'}">${m.operation}${m.transit?' · yo\'lda':''}</span></td>
      <td>${esc(m.sourceModule)}</td><td>${esc(m.organization||'—')}</td><td>${esc(m.tank||'—')}</td>
      <td class="num ${m.operation==='IN'?'mvh-pos':'mvh-neg'}">${fmt(m.quantity,1)}</td>
      <td class="num">${m.density?fmt(m.density,3):'—'}</td><td class="num">${m.temp===''?'—':fmt(m.temp,1)}</td>
      <td class="num">${fmt(m.netWeight,1)}</td><td>${esc(m.user||'—')}</td><td>${esc(m.notes||'—')}</td>
    </tr>`).join('') : `<tr class="emptyrow"><td colspan="13">Ushbu mahsulot bo'yicha harakat topilmadi</td></tr>`;
  const cnt = document.getElementById('mvhCount');
  if(cnt){
    const tin = list.filter(m=>m.operation==='IN').reduce((a,m)=>a+num(m.quantity),0);
    const tout = list.filter(m=>m.operation==='OUT').reduce((a,m)=>a+num(m.quantity),0);
    cnt.innerHTML = `Jami <b>${list.length}</b> ta harakat &nbsp;·&nbsp; <span style="color:var(--success)">Kirim: ${fmt(tin,1)} kg</span> &nbsp;·&nbsp; <span style="color:var(--danger)">Chiqim: ${fmt(tout,1)} kg</span>`;
  }
}
function moUpdateField(key, val){ MO_STATE[key] = val; }
function moGenerate(){ MO_STATE.generated = true; renderRoute(); }
function moClearFilters(){ MO_STATE = { base:MO_STATE.base, smena:'', from:'', to:'', generated:false }; renderRoute(); }
/* Moddiy hisobotni to'liq oynada ko'rsatish (CSS asosidagi rejim — iframe'da ham ishonchli) */
let MO_FS_KEY = null;
function moToggleFullscreen(){
  const card = document.getElementById('moReportCard');
  if(!card) return;
  const on = !card.classList.contains('mo-fs');
  card.classList.toggle('mo-fs', on);
  document.body.style.overflow = on ? 'hidden' : '';
  if(on){
    // yopishqoq ikki qavatli sarlavha uchun ost-qator ofsetini o'lchaymiz
    requestAnimationFrame(()=>{
      const g = card.querySelector('#mo_table thead tr:first-child');
      if(g) card.style.setProperty('--mo-subtop', Math.round(g.getBoundingClientRect().height)+'px');
    });
    if(!MO_FS_KEY){
      MO_FS_KEY = (e)=>{ if(e.key==='Escape'){ const c=document.getElementById('moReportCard'); if(c&&c.classList.contains('mo-fs')) moToggleFullscreen(); } };
      document.addEventListener('keydown', MO_FS_KEY);
    }
  }
}
function renderMatOtchet(){
  const bases = refList('bases');
  if(!MO_STATE.base) MO_STATE.base = bases[0] || '';
  const shiftNumbers = [...new Set((DB.shifts||[]).map(s=>String(s.number)))].sort((a,b)=>b-a);

  const filterCard = `
    <div class="card mo-card">
      <div class="mo-filter">
        <div class="field"><label>Baza</label><select id="mo_base" onchange="moUpdateField('base',this.value)">${bases.map(b=>`<option ${b===MO_STATE.base?'selected':''}>${esc(b)}</option>`).join('')}</select></div>
        <div class="field"><label>Smena</label><select id="mo_smena" onchange="moUpdateField('smena',this.value)">
          <option value="" ${!MO_STATE.smena?'selected':''}>Barchasi</option>
          ${shiftNumbers.map(n=>`<option value="${esc(n)}" ${MO_STATE.smena===n?'selected':''}>${esc(n)}-smena</option>`).join('')}
        </select></div>
        <div class="field"><label>Boshlanish sanasi</label><input type="date" id="mo_from" value="${MO_STATE.from}" onchange="moUpdateField('from',this.value)"></div>
        <div class="field"><label>Tugash sanasi</label><input type="date" id="mo_to" value="${MO_STATE.to}" onchange="moUpdateField('to',this.value)"></div>
        <button class="btn ghost sm mo-clear" onclick="moClearFilters()">Filtrni tozalash</button>
        <div class="mo-actions">
          <button class="btn success" onclick="moGenerate()">${ICON_SEARCH} Hisobotni ko'rsatish</button>
          ${MO_STATE.generated ? `
            <button class="btn" onclick="moExportExcel()"><svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2.5" fill="#217346"/><path d="M8.4 8l3.1 4-3.1 4h2.15l2-2.85L14.55 16h2.15l-3.1-4 3.1-4h-2.15l-2 2.85L10.55 8z" fill="#fff"/></svg>Excelga eksport</button>
            <button class="btn" onclick="moExportPdf()"><svg class="btn-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6 2h8l4 4v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2z" fill="#E2453A"/><path d="M14 2l4 4h-4z" fill="#B7291F"/><text x="11.5" y="17.2" font-size="6.2" font-weight="700" fill="#fff" text-anchor="middle" font-family="Arial,Helvetica,sans-serif">PDF</text></svg>PDF</button>
            <button class="btn" onclick="moPrint()">${ICON_PRINTER} Chop etish</button>
            <button class="btn" onclick="moToggleFullscreen()"><svg class="btn-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/></svg>To'liq oynada</button>` : ''}
        </div>
      </div>
    </div>`;

  if(!MO_STATE.generated){
    return `
      ${filterCard}
      <div class="card mo-card">
        <div class="empty-illustration"><div class="big">${ICON_DASHBOARD}</div>Filtrlarni tanlab, "Hisobotni ko'rsatish" tugmasini bosing</div>
      </div>`;
  }

  const data = MO_STATE.base ? matOtchetData(MO_STATE.base, MO_STATE.smena, MO_STATE.from, MO_STATE.to) : [];
  const activeData = data.filter(r=>r.begin || r.beginTransit || r.totalIn || r.totalOut || r.end || r.endTransit);
  const shown = activeData.length ? activeData : data;
  const totals = shown.reduce((t,r)=>{
    t.begin+=r.begin; t.beginTransit+=r.beginTransit; t.totalIn+=r.totalIn; t.totalOut+=r.totalOut; t.end+=r.end; t.endTransit+=r.endTransit;
    ['avto','vagon','proizvodstvo','qurilma','ortiqcha'].forEach(k=>t.inB[k]=(t.inB[k]||0)+r.inB[k]);
    ['avto','vagon','proizvodstvo','qurilma','kamomad'].forEach(k=>t.outB[k]=(t.outB[k]||0)+r.outB[k]);
    return t;
  }, {begin:0,beginTransit:0,totalIn:0,totalOut:0,end:0,endTransit:0,inB:{},outB:{}});

  MO_LAST_REPORT = { base:MO_STATE.base, smena:MO_STATE.smena, from:MO_STATE.from, to:MO_STATE.to, shown, totals };

  const rows = shown.length ? shown.map((r,i)=>`
    <tr class="mo-row" ondblclick="openMovementHistory('${esc(r.nom).replace(/'/g,"\\'")}')" title="Harakatlar tarixini ko'rish uchun ikki marta bosing">
      <td>${i+1}</td><td>${esc(r.nom)}</td>
      <td class="num">${fmt(r.beginTransit,1)}</td>
      <td class="num">${fmt(r.begin,1)}</td>
      <td class="num mo-in" style="font-weight:700;">${fmt(r.totalIn,1)}</td>
      <td class="num mo-in">${fmt(r.inB.avto,1)}</td><td class="num mo-in">${fmt(r.inB.vagon,1)}</td><td class="num mo-in">${fmt(r.inB.proizvodstvo,1)}</td><td class="num mo-in">${fmt(r.inB.qurilma,1)}</td><td class="num mo-in">${fmt(r.inB.ortiqcha,1)}</td>
      <td class="num mo-out" style="font-weight:700;">${fmt(r.totalOut,1)}</td>
      <td class="num mo-out">${fmt(r.outB.avto,1)}</td><td class="num mo-out">${fmt(r.outB.vagon,1)}</td><td class="num mo-out">${fmt(r.outB.proizvodstvo,1)}</td><td class="num mo-out">${fmt(r.outB.qurilma,1)}</td><td class="num mo-out">${fmt(r.outB.kamomad,1)}</td>
      <td class="num" style="font-weight:700;">${fmt(r.end,1)}</td>
      <td class="num" style="font-weight:600;">${fmt(r.endTransit,1)}</td>
    </tr>
  `).join('') : `<tr class="emptyrow"><td colspan="17">Ma'lumotnomada nomenklatura yo'q</td></tr>`;

  return `
    ${filterCard}
    <div class="card mo-card" id="moReportCard">
      <div class="mo-report-bar">
        <span class="mo-report-bar-title">${ICON_LIST} Moddiy hisobot${MO_STATE.base?` — ${esc(MO_STATE.base)}`:''}</span>
        <button class="btn ghost sm" onclick="moToggleFullscreen()">${ICON_CLOSE} Oynadan chiqish (Esc)</button>
      </div>
      <div class="tablewrap"><table class="datatable mo-table" id="mo_table">
        <thead>
          <tr>
            <th rowspan="2">№</th><th rowspan="2">Mahsulot (Nomenklatura)</th>
            <th rowspan="2">Boshlang'ich yo'ldagi qoldiq</th><th rowspan="2">Boshlang'ich qoldiq</th>
            <th colspan="6" class="mo-grp-in">KIRIM (JAMI)</th>
            <th colspan="6" class="mo-grp-out">CHIQIM (JAMI)</th>
            <th rowspan="2">Yakuniy qoldiq</th><th rowspan="2">Yakuniy yo'ldagi qoldiq</th>
          </tr>
          <tr>
            <th class="mo-sub-in">Jami kirim</th><th class="mo-sub-in">Avto</th><th class="mo-sub-in">Vagon</th><th class="mo-sub-in">Ishlab chiqarish</th><th class="mo-sub-in">Qurilmadan qabul</th><th class="mo-sub-in">Ortiqcha</th>
            <th class="mo-sub-out">Jami chiqim</th><th class="mo-sub-out">Avto</th><th class="mo-sub-out">Vagon</th><th class="mo-sub-out">Ishlab chiqarish</th><th class="mo-sub-out">Qurilmaga berildi</th><th class="mo-sub-out">Hisobdan chiqarish</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td colspan="2">JAMI</td>
          <td class="num">${fmt(totals.beginTransit,1)}</td><td class="num">${fmt(totals.begin,1)}</td>
          <td class="num mo-in" style="font-weight:700;">${fmt(totals.totalIn,1)}</td>
          <td class="num mo-in">${fmt(totals.inB.avto||0,1)}</td><td class="num mo-in">${fmt(totals.inB.vagon||0,1)}</td><td class="num mo-in">${fmt(totals.inB.proizvodstvo||0,1)}</td><td class="num mo-in">${fmt(totals.inB.qurilma||0,1)}</td><td class="num mo-in">${fmt(totals.inB.ortiqcha||0,1)}</td>
          <td class="num mo-out" style="font-weight:700;">${fmt(totals.totalOut,1)}</td>
          <td class="num mo-out">${fmt(totals.outB.avto||0,1)}</td><td class="num mo-out">${fmt(totals.outB.vagon||0,1)}</td><td class="num mo-out">${fmt(totals.outB.proizvodstvo||0,1)}</td><td class="num mo-out">${fmt(totals.outB.qurilma||0,1)}</td><td class="num mo-out">${fmt(totals.outB.kamomad||0,1)}</td>
          <td class="num" style="font-weight:800;">${fmt(totals.end,1)}</td><td class="num">${fmt(totals.endTransit,1)}</td>
        </tr></tfoot>
      </table></div>
    </div>
  `;
}
async function setOpening(key, val){
  if(isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); renderRoute(); return; }
  DB.opening[key] = num(val);
  await persist('opening');
  toast('Boshlang\'ich qoldiq yangilandi');
}

/* ---------------- Moddiy hisobot: eksport funksiyalari ---------------- */
let MO_LAST_REPORT = null;
const MO_COL_LABELS = ["№","Mahsulot","Boshlang'ich yo'ldagi qoldiq","Boshlang'ich qoldiq","Jami kirim","Avto (kirim)","Vagon (kirim)","Ishlab chiqarish (kirim)","Qurilmadan qabul","Ortiqcha","Jami chiqim","Avto (chiqim)","Vagon (chiqim)","Ishlab chiqarish (chiqim)","Qurilmaga berildi","Hisobdan chiqarish","Yakuniy qoldiq","Yakuniy yo'ldagi qoldiq"];
function moRowsAsArrays(){
  if(!MO_LAST_REPORT) return [];
  return MO_LAST_REPORT.shown.map((r,i)=>[
    i+1, r.nom, r.beginTransit, r.begin, r.totalIn, r.inB.avto, r.inB.vagon, r.inB.proizvodstvo, r.inB.qurilma, r.inB.ortiqcha,
    r.totalOut, r.outB.avto, r.outB.vagon, r.outB.proizvodstvo, r.outB.qurilma, r.outB.kamomad, r.end, r.endTransit
  ]);
}
function downloadBlob(content, filename, mime){
  const blob = new Blob([content], {type:mime});
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(()=>URL.revokeObjectURL(url), 1000);
}
function moExportExcel(){
  if(!MO_LAST_REPORT){ toast("Avval hisobotni ko'rsating", 'danger'); return; }
  const rows = [MO_COL_LABELS, ...moRowsAsArrays()];
  const csv = rows.map(r => r.map(v => {
    const s = String(v ?? '');
    return /[",;\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s;
  }).join(';')).join('\r\n');
  downloadBlob('\uFEFF'+csv, `Moddiy_hisobot_${MO_LAST_REPORT.base}_${today()}.csv`, 'text/csv;charset=utf-8;');
  toast('Excel fayli yuklandi');
}
function moBuildPrintHtml(){
  if(!MO_LAST_REPORT) return '';
  const r = MO_LAST_REPORT;
  const head = MO_COL_LABELS.map(l=>`<th style="border:1px solid #999;padding:4px 6px;background:#eee;">${esc(l)}</th>`).join('');
  const body = moRowsAsArrays().map(row=>`<tr>${row.map(v=>`<td style="border:1px solid #999;padding:4px 6px;text-align:right;">${typeof v==='number'?fmt(v,1):esc(v)}</td>`).join('')}</tr>`).join('');
  return `
    <div style="font-family:Arial,sans-serif;padding:16px;color:#111;">
      <h1 style="font-size:19px;">NEFTBAZA — Moddiy hisobot</h1>
      <p>Baza: <b>${esc(r.base)}</b> ${r.smena?` · Smena: <b>${esc(r.smena)}</b>`:''} ${r.from?` · Davr: ${fmtDate(r.from)} — ${fmtDate(r.to||today())}`:''}</p>
      <table style="width:100%;border-collapse:collapse;font-size:10.5px;margin-top:10px;">
        <thead><tr>${head}</tr></thead><tbody>${body}</tbody>
      </table>
    </div>`;
}
async function moExportPdf(){
  if(!MO_LAST_REPORT){ toast("Avval hisobotni ko'rsating", 'danger'); return; }
  const area = $('#printReportArea');
  if(!area) return;
  area.innerHTML = moBuildPrintHtml();
  document.body.classList.add('printing-report');
  await new Promise(r=>setTimeout(r,100));
  window.print();
  setTimeout(()=>{ document.body.classList.remove('printing-report'); }, 500);
}
async function moPrint(){ await moExportPdf(); }
