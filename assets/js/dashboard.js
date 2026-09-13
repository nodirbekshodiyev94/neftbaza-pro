/* ---------------- Dashboard ---------------- */
function checkReservoirCapacity(docType, base, reservoirName, newQty, excludeId){
  const res = (DB.refs.reservoirs||[]).find(r => r.name===reservoirName && r.base===base);
  if(!res || !res.volume) return { ok:true };
  let balance = reservoirBalance(res);
  if(excludeId){
    const oldDoc = (DB.docs[docType]||[]).find(d=>d.id===excludeId);
    if(oldDoc && oldDoc.reservoir===reservoirName && oldDoc.base===base){
      balance -= num(oldDoc.accepted!=null?oldDoc.accepted:oldDoc.factKg);
    }
  }
  const available = round2(num(res.volume) - balance);
  if(num(newQty) > available + 0.001){
    return { ok:false, available, volume:res.volume, balance:round2(balance) };
  }
  return { ok:true };
}
function reservoirBalance(res){
  let bal = num(DB.opening['RES|'+res.name+'|'+res.base]);
  const add = (arr, qk, sign) => arr.forEach(d => { if(d.reservoir===res.name && d.base===res.base) bal += sign*num(qk==='oprihodovano' ? (d.oprihodovano!=null?d.oprihodovano:d.netKg) : (qk==='accepted' ? (d.accepted!=null?d.accepted:d.factKg) : (qk==='rashodAvtoKg' ? (d.docKg!=null?d.docKg:d.factKg) : d[qk]))); });
  add(DB.docs.prihodAvto,'accepted',1); add(DB.docs.rashodAvto,'rashodAvtoKg',-1);
  add(DB.docs.prihodVagon,'oprihodovano',1); add(DB.docs.rashodVagon,'netKg',-1);
  add(DB.docs.sUstanovki,'kg',1); add(DB.docs.vUstanovku,'kg',-1);
  add(DB.docs.izlishka,'kg',1); add(DB.docs.spisaniya,'kg',-1);
  DB.docs.proizvodstvo.forEach(d=>{
    if(d.reservoir===res.name && d.base===res.base){
      bal += (d.received||[]).reduce((s,i)=>s+num(i.kg),0);
      bal -= (d.spent||[]).reduce((s,i)=>s+num(i.kg),0);
    }
  });
  return Math.max(0, round2(bal));
}
function tankColorVars(pct){
  if(pct < 15) return `--fc1:#7A2A24;--fc2:#E2574C;`;
  if(pct > 90) return `--fc1:#173230;--fc2:#43B3A6;`;
  return `--fc1:#8A5F1E;--fc2:#E8A33D;`;
}
/* Admin/Guest uchun "Rezervuarlar holati" kartasidagi Neftbaza filtri ('' = barchasi) */
let DASH_FILTER_BASE = '';
function currentUserBase(){ return isUser() ? ((CURRENT_USER && CURRENT_USER.assignedBase) || '') : ''; }

/* Dashboard "Rezervuarlar holati" — Ma'lumotnomalar → Rezervuarlar (reservoirCalib) bilan bir xil manba.
   Alohida nusxa saqlanmaydi: har chaqiriqda joriy DB.refs.reservoirCalib dan o'qiladi. */
function reservoirCalibLookup(){
  const map = {};
  (DB.refs.reservoirCalib?.main || []).forEach(rec => {
    const dashName = String(rec.number).replace(/^([A-Za-z]+)(\d+)$/, '$1-$2');
    map[(rec.base||'')+'|'+dashName] = rec;
  });
  return map;
}

function renderDashboard(){
  const userBase = currentUserBase();               // User rolida — biriktirilgan neftbaza
  const scopeAll = !isUser();                        // Admin/Guest — umumiy Dashboard saqlanadi

  // "Rezervuarlar holati" kartasi uchun baza: User — o'z bazasi (majburiy), Admin/Guest — tanlangan filtr ('' = barchasi)
  const reservoirBase = isUser() ? userBase : DASH_FILTER_BASE;
  const reservoirs = reservoirBase ? refList('reservoirs').filter(r => r.base === reservoirBase) : refList('reservoirs');
  const calibMap = reservoirCalibLookup();
  const tanks = reservoirs.map(r=>{
    const rec = calibMap[(r.base||'')+'|'+r.name];
    // Mahsulot miqdori — Ma'lumotnomalar → Rezervuarlar dagi haqiqiy (sof og'irlik) qiymatidan;
    // kalibrovka yozuvi topilmasa — harakat jurnali balansiga qaytamiz (fallback).
    const bal = (rec && rec.netWeightKg!=='' && rec.netWeightKg!=null) ? num(rec.netWeightKg) : reservoirBalance(r);
    const pct = r.volume ? Math.min(100, round2(bal/num(r.volume)*100)) : 0;
    const productName = rec && rec.productName ? rec.productName : '—';
    return `
      <div class="tank">
        <div class="cyl" style="${tankColorVars(pct)}">
          <div class="fill" style="height:${pct}%"></div>
          <div class="ticks"><i></i><i></i><i></i><i></i><i></i></div>
        </div>
        <div class="name">${esc(r.name)} <span style="color:var(--text-faint)">· ${esc(r.kind)}</span></div>
        <div class="pct">${pct}%</div>
        <div class="qty">${esc(productName)}</div>
        <div class="qty">${fmt(bal,0)} / ${fmt(r.volume,0)} kg</div>
      </div>`;
  }).join('') || emptyBlock();

  // Statistik kartalar va so'nggi harakatlar: User — faqat o'z neftbazasi, Admin/Guest — umumiy (avvalgidek)
  const statBase = isUser() ? userBase : '';
  const matchBase = d => !statBase || d.base === statBase;

  const isToday = d => d.opDate === today();
  let todayIn = 0, todayOut = 0, todayOps = 0;
  Object.entries(DOC_TYPES).forEach(([dt,cfg])=>{
    DB.docs[dt].filter(isToday).filter(matchBase).forEach(d=>{
      todayOps++;
      const q = num(d[cfg.qtyField]);
      if(cfg.effect==='in') todayIn += q; else todayOut += q;
    });
  });
  DB.docs.proizvodstvo.filter(isToday).filter(matchBase).forEach(d=>{ todayOps++; });

  const statReservoirs = statBase ? refList('reservoirs').filter(r => r.base === statBase) : refList('reservoirs');
  const totalReservoirVol = statReservoirs.reduce((s,r)=>s+num(r.volume),0);
  const totalReservoirBal = statReservoirs.reduce((s,r)=>s+reservoirBalance(r),0);
  const fillPct = totalReservoirVol ? round2(totalReservoirBal/totalReservoirVol*100) : 0;

  const recentAll = [];
  Object.keys(DOC_TYPES).forEach(dt=>{
    DB.docs[dt].filter(matchBase).forEach(d=>recentAll.push({dt, opDate:d.opDate, base:d.base, nom:d.nomenclature, qty:num(d[DOC_TYPES[dt].qtyField]), group:DOC_TYPES[dt].group, createdAt:d.createdAt}));
  });
  DB.docs.proizvodstvo.filter(matchBase).forEach(d=>recentAll.push({dt:'proizvodstvo', opDate:d.opDate, base:d.base, nom:'Ishlab chiqarish', qty:(d.received||[]).reduce((s,i)=>s+num(i.kg),0), group:'ishlab', createdAt:d.createdAt}));
  recentAll.sort((a,b)=>b.createdAt-a.createdAt);
  const recent = recentAll.slice(0,8);
  const recentHtml = recent.length ? recent.map(r=>`
    <tr><td>${fmtDate(r.opDate)}</td>
    <td><span class="tag ${r.group==='kirim'?'in':(r.group==='chiqim'?'out':'mid')}">${esc(TYPE_LABELS[r.dt])}</span></td>
    <td>${esc(r.base||'—')}</td><td>${esc(r.nom||'—')}</td>
    <td class="num ${r.group==='kirim'?'pos':(r.group==='chiqim'?'neg':'')}">${fmt(r.qty,0)}</td></tr>
  `).join('') : `<tr class="emptyrow"><td colspan="5">Hali harakat yo'q — chap menyudan hujjat kiriting</td></tr>`;

  // Faqat Admin va Guest uchun: "Rezervuarlar holati" kartasidagi Neftbaza tanlash dropdowni
  const baseSelectHtml = scopeAll ? `
    <div class="field" style="max-width:230px;margin:0;">
      <select onchange="DASH_FILTER_BASE=this.value;renderRoute();">
        <option value="">— Barcha Neftbazalar —</option>
        ${(DB.refs.bases||[]).map(b=>`<option value="${esc(b)}" ${b===DASH_FILTER_BASE?'selected':''}>${esc(b)}</option>`).join('')}
      </select>
    </div>` : '';
  const reservoirsSub = isUser()
    ? (userBase ? `${esc(userBase)} neftbazasi bo'yicha real vaqt hisob-kitobi (kirim − chiqim)` : "Barcha bazalar bo'yicha real vaqt hisob-kitobi (kirim − chiqim)")
    : (DASH_FILTER_BASE ? `${esc(DASH_FILTER_BASE)} neftbazasi bo'yicha real vaqt hisob-kitobi` : "Barcha bazalar bo'yicha real vaqt hisob-kitobi (kirim − chiqim)");

  return `
    ${renderShiftWidget()}
    <div class="statgrid">
      <div class="stat in"><div class="lbl">Bugungi kirim</div><div class="val">${fmt(todayIn,0)}<small>kg</small></div><div class="bar"><i style="width:${Math.min(100, todayIn/Math.max(1,todayIn+todayOut)*100)}%"></i></div></div>
      <div class="stat out"><div class="lbl">Bugungi chiqim</div><div class="val">${fmt(todayOut,0)}<small>kg</small></div><div class="bar"><i style="width:${Math.min(100, todayOut/Math.max(1,todayIn+todayOut)*100)}%"></i></div></div>
      <div class="stat"><div class="lbl">Bugungi operatsiyalar</div><div class="val">${todayOps}<small>ta hujjat</small></div></div>
      <div class="stat"><div class="lbl">Rezervuarlar to'lganligi</div><div class="val">${fillPct}<small>%</small></div><div class="bar"><i style="width:${fillPct}%;background:var(--accent2);"></i></div></div>
    </div>
    <div class="dashgrid">
      <div class="card">
        <div class="cardhead"><div><h2>${ICON_TANK} Rezervuarlar holati</h2><div class="sub">${reservoirsSub}</div></div>${baseSelectHtml}</div>
        <div class="tankrow">${tanks}</div>
      </div>
      <div class="card">
        <div class="cardhead"><h2>${ICON_CLOCK} So'nggi harakatlar</h2></div>
        <div class="tablewrap"><table class="datatable"><thead><tr><th>Sana</th><th>Turi</th><th>Baza</th><th>Nomenklatura</th><th>Kg</th></tr></thead>
        <tbody>${recentHtml}</tbody></table></div>
      </div>
    </div>
  `;
}
function renderShiftWidget(){
  if(isGuest()) return '';
  const openShift = getOpenShift();
  if(isUser()){
    // Admin tomonidan vaqtinchalik ochib berilgan (unlocked) yopiq smenalar — User shularga "kirib" ishlashi mumkin
    const reopened = (DB.shifts||[]).filter(s => s.closedAt && isShiftUnlocked(s));
    const enteredShift = REOPENED_SHIFT_ID ? reopened.find(s=>s.id===REOPENED_SHIFT_ID) : null;
    const reopenedHtml = reopened.length ? `
      <div class="card" style="border-color:var(--accent2);margin-top:14px;">
        <div class="cardhead">
          <div><h2>${ICON_UNLOCK} Qayta ochilgan smena</h2><div class="sub">Admin tomonidan vaqtinchalik ruxsat berilgan yopiq smena(lar) — tanlang va kiring, ma'lumot kiritishni davom ettirasiz</div></div>
        </div>
        <div class="field" style="max-width:360px;">
          <label>Smena</label>
          <select id="reopened_shift_select">
            ${reopened.map(s=>`<option value="${s.id}" ${REOPENED_SHIFT_ID===s.id?'selected':''}>${s.number}-Smena — ${fmtDateTime(s.closedAt)} yopilgan · ${formatRemaining(s.unlockedUntil-Date.now())} qoldi</option>`).join('')}
          </select>
        </div>
        <div class="formfoot">
          ${enteredShift
            ? `<span class="tag in">${ICON_UNLOCK} Siz hozir ${enteredShift.number}-Smenada ishlayapsiz</span>
               <button type="button" class="btn ghost sm" onclick="exitReopenedShift()">Chiqish</button>`
            : `<button type="button" class="btn primary sm" onclick="enterReopenedShift(document.getElementById('reopened_shift_select').value)">${ICON_PLAY} Kirish / Davom ettirish</button>`}
        </div>
      </div>` : '';
    if(openShift){
      return `
        <div class="card" style="border-color:var(--accent2);">
          <div class="cardhead">
            <div><h2>${ICON_CLOCK} Faol smena — ${openShift.number}-Smena</h2><div class="sub">Mas'ul: ${esc(openShift.personName)} · Ochilgan: ${fmtDateTime(openShift.openedAt)}</div></div>
            <button type="button" class="btn danger sm" onclick="confirmCloseShift()">${ICON_LOCK} Smenani yopish</button>
          </div>
        </div>${reopenedHtml}`;
    }
    return `
      <div class="card" style="border-color:var(--accent);">
        <div class="cardhead">
          <div><h2>${ICON_CLOCK} Smena yopiq</h2><div class="sub">${enteredShift ? `${enteredShift.number}-Smena orqali ma'lumot kiritishingiz mumkin (quyida)` : "Hujjat kiritishni boshlash uchun avval smenani oching"}</div></div>
          <button type="button" class="btn primary sm" onclick="openShiftForm()">${ICON_PLAY} Smena ochish</button>
        </div>
        <div id="shift_open_form" style="display:none;margin-top:14px;">
          <div class="fieldgrid">
            <div class="field"><label>F.I.Sh</label><input type="text" id="shift_fullname" value="${esc(CURRENT_USER?.fullName||'')}"></div>
            <div class="field"><label>Shaxsiy parol</label><input type="password" id="shift_password"></div>
          </div>
          <div class="formfoot"><button type="button" class="btn primary" onclick="submitOpenShift()">Tasdiqlash va ochish</button></div>
        </div>
      </div>${reopenedHtml}`;
  }
  // admin monitoring view
  if(openShift){
    return `<div class="card"><div class="cardhead"><div><h2>${ICON_CLOCK} Faol smena — ${openShift.number}-Smena</h2><div class="sub">Mas'ul: ${esc(openShift.personName)} · Ochilgan: ${fmtDateTime(openShift.openedAt)}</div></div></div></div>`;
  }
  return '';
}
function openShiftForm(){
  const f = $('#shift_open_form');
  if(f) f.style.display = 'block';
}
async function submitOpenShift(){
  const fullName = $('#shift_fullname').value;
  const pass = $('#shift_password').value;
  const ok = await openShift(fullName, pass);
  if(ok) renderRoute();
}
async function generateShiftReport(){
  const shift = getOpenShift();
  if(!shift) return;
  const area = $('#printReportArea');
  if(!area) return;
  let totalIn = 0, totalOut = 0, rowsHtml = '';
  const rows = [];
  Object.keys(DOC_TYPES).forEach(dt=>{
    DB.docs[dt].filter(d=>d.shiftId===shift.id).forEach(d=>{
      const q = num(d[DOC_TYPES[dt].qtyField]);
      const isIn = DOC_TYPES[dt].effect==='in';
      if(isIn) totalIn += q; else totalOut += q;
      rows.push({ type: TYPE_LABELS[dt], date:d.opDate, base:d.base, nom:d.nomenclature, qty:q, dir:isIn?'Kirim':'Chiqim' });
    });
  });
  DB.docs.proizvodstvo.filter(d=>d.shiftId===shift.id).forEach(d=>{
    const rT = (d.received||[]).reduce((s,i)=>s+num(i.kg),0);
    const sT = (d.spent||[]).reduce((s,i)=>s+num(i.kg),0);
    totalIn += rT; totalOut += sT;
    rows.push({ type:"Ishlab chiqarish", date:d.opDate, base:d.base, nom:'—', qty:rT-sT, dir:'Kirim-chiqim' });
  });
  rowsHtml = rows.length ? rows.map(r=>`<tr><td>${fmtDate(r.date)}</td><td>${esc(r.type)}</td><td>${esc(r.dir)}</td><td>${esc(r.base||'—')}</td><td>${esc(r.nom||'—')}</td><td style="text-align:right;">${fmt(r.qty,1)}</td></tr>`).join('')
    : `<tr><td colspan="6" style="text-align:center;">Bu smenada hujjat kiritilmagan</td></tr>`;
  area.innerHTML = `
    <div style="font-family:Arial,sans-serif;padding:20px;color:#111;">
      <h1 style="font-size:20px;">NEFTBAZA — Smena hisoboti</h1>
      <p><b>${shift.number}-Smena</b> · Mas'ul: ${esc(shift.personName)}</p>
      <p>Ochilgan: ${fmtDateTime(shift.openedAt)} &nbsp;|&nbsp; Yopilgan: ${fmtDateTime(Date.now())}</p>
      <p>Jami kirim: <b>${fmt(totalIn,1)} kg</b> &nbsp;|&nbsp; Jami chiqim: <b>${fmt(totalOut,1)} kg</b></p>
      <table style="width:100%;border-collapse:collapse;margin-top:12px;font-size:12px;">
        <thead><tr style="background:#eee;">
          <th style="border:1px solid #999;padding:5px;">Sana</th><th style="border:1px solid #999;padding:5px;">Turi</th>
          <th style="border:1px solid #999;padding:5px;">Yo'nalish</th><th style="border:1px solid #999;padding:5px;">Baza</th>
          <th style="border:1px solid #999;padding:5px;">Nomenklatura</th><th style="border:1px solid #999;padding:5px;">Miqdor, kg</th>
        </tr></thead>
        <tbody>${rowsHtml.replace(/<td>/g,'<td style="border:1px solid #999;padding:5px;">').replace(/<td style="text-align:right;">/g,'<td style="border:1px solid #999;padding:5px;text-align:right;">')}</tbody>
      </table>
    </div>`;
  document.body.classList.add('printing-report');
  await new Promise(r=>setTimeout(r,100));
  window.print();
  setTimeout(()=>{ document.body.classList.remove('printing-report'); }, 500);
}
function confirmCloseShift(){
  askConfirm("Smenani yopmoqchimisiz? Yopilgandan so'ng ma'lumotlar admin ruxsatisiz o'zgartirilmaydi.", async function(){
    await closeCurrentShift();
    renderRoute();
  });
}

