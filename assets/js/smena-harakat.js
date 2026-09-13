/* ---------------- Hisobot: Smena harakati ---------------- */
let SH_STATE = { smena:'', date: today() };
function renderSmenaHarakat(){
  const rows = [];
  Object.keys(DOC_TYPES).forEach(dt=>{
    DB.docs[dt].forEach(d=>{
      if((!SH_STATE.smena || d.smena===SH_STATE.smena) && (!SH_STATE.date || d.opDate===SH_STATE.date)){
        rows.push({ type:dt, group:DOC_TYPES[dt].group, opDate:d.opDate, smena:d.smena, base:d.base,
          nom:d.nomenclature, qty:num(d[DOC_TYPES[dt].qtyField]), createdAt:d.createdAt, id:d.id });
      }
    });
  });
  DB.docs.proizvodstvo.forEach(d=>{
    if((!SH_STATE.smena || d.smena===SH_STATE.smena) && (!SH_STATE.date || d.opDate===SH_STATE.date)){
      const sT = d.spent.reduce((s,i)=>s+num(i.kg),0), rT = d.received.reduce((s,i)=>s+num(i.kg),0);
      rows.push({ type:'proizvodstvo', group:'ishlab', opDate:d.opDate, smena:d.smena, base:d.base, nom:`sarf ${fmt(sT,0)} / olindi ${fmt(rT,0)}`, qty:rT-sT, createdAt:d.createdAt, id:d.id });
    }
  });
  rows.sort((a,b)=> a.createdAt-b.createdAt);
  const body = rows.length ? rows.map(r=>`
    <tr>
      <td>${fmtDate(r.opDate)}</td><td><span class="badge-num">Smena ${esc(r.smena||'—')}</span></td>
      <td><span class="tag ${r.group==='kirim'?'in':(r.group==='chiqim'?'out':'mid')}">${esc(TYPE_LABELS[r.type]||r.type)}</span></td>
      <td>${esc(r.base||'—')}</td><td>${esc(r.nom||'—')}</td>
      <td class="num ${r.group==='kirim'?'pos':(r.group==='chiqim'?'neg':'')}">${r.group==='kirim'?'+':(r.group==='chiqim'?'-':'')}${fmt(Math.abs(r.qty),1)}</td>
    </tr>
  `).join('') : `<tr class="emptyrow"><td colspan="6">Tanlangan filtrlar bo'yicha yozuv topilmadi</td></tr>`;
  return `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_CLOCK} Smena bo'yicha harakat</h2><div class="sub">Barcha hujjat turlaridan tanlangan smena/sana bo'yicha yig'ma jurnal</div></div></div>
      <div class="filterbar">
        <div class="field"><label>Sana</label><input type="date" value="${SH_STATE.date}" onchange="SH_STATE.date=this.value;renderRoute();"></div>
        <div class="field"><label>Smena</label><select onchange="SH_STATE.smena=this.value;renderRoute();">
          <option value="" ${!SH_STATE.smena?'selected':''}>Barchasi</option>
          ${[...new Set((DB.shifts||[]).map(s=>String(s.number)))].sort((a,b)=>b-a).map(n=>`<option value="${esc(n)}" ${SH_STATE.smena===n?'selected':''}>${esc(n)}-Smena</option>`).join('')}
        </select></div>
        <button class="btn sm ghost" onclick="SH_STATE={smena:'',date:''};renderRoute();">Filtrni tozalash</button>
      </div>
      <div class="tablewrap"><table class="datatable"><thead><tr>
        <th>Sana</th><th>Smena</th><th>Hujjat turi</th><th>Neftbaza</th><th>Tafsilot</th><th>Miqdor, kg</th>
      </tr></thead><tbody>${body}</tbody></table></div>
    </div>
  `;
}
