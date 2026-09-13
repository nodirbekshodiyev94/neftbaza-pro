/* ---------------- Hisobot: Realizatsiya ---------------- */
function renderRealizatsiya(){
  const rows = [
    ...DB.docs.rashodAvto.filter(d=>d.destination==='Realizatsiya').map(d=>({...d, from:'Avto'})),
    ...DB.docs.rashodVagon.filter(d=>d.destination==='Realizatsiya').map(d=>({...d, from:'Vagon'})),
  ].sort((a,b)=>(b.opDate||'').localeCompare(a.opDate||''));
  const perNom = {};
  rows.forEach(r=>{ const k=r.nomenclature||'—'; perNom[k]=(perNom[k]||0)+num(r.docKg||r.factKg||r.netKg); });
  const totalKg = Object.values(perNom).reduce((a,b)=>a+b,0);
  const sumCards = Object.entries(perNom).map(([n,v])=>`
    <div class="stat"><div class="lbl">${esc(n)}</div><div class="val">${fmt(v,0)}<small>kg</small></div></div>
  `).join('') || '';
  const body = rows.length ? rows.map(r=>`
    <tr><td>${fmtDate(r.opDate)}</td><td><span class="tag mid">${r.from}</span></td><td>${esc(r.base)}</td>
    <td>${esc(r.nomenclature)}</td><td>${esc(r.contractor||'—')}</td><td class="num">${fmt(r.docKg||r.factKg||r.netKg,1)}</td></tr>
  `).join('') : `<tr class="emptyrow"><td colspan="6">Realizatsiyaga chiqim hali yo'q</td></tr>`;
  return `
    <div class="card"><div class="cardhead"><h2>${ICON_MONEY} Realizatsiya — umumiy</h2></div>
      <div class="statgrid">
        <div class="stat"><div class="lbl">Jami realizatsiya</div><div class="val">${fmt(totalKg,0)}<small>kg</small></div></div>
        ${sumCards}
      </div>
    </div>
    <div class="card">
      <div class="cardhead"><h2>${ICON_LIST} Operatsiyalar</h2></div>
      <div class="tablewrap"><table class="datatable"><thead><tr>
        <th>Sana</th><th>Turi</th><th>Neftbaza</th><th>Nomenklatura</th><th>Kontragent</th><th>Miqdor, kg</th>
      </tr></thead><tbody>${body}</tbody></table></div>
    </div>
  `;
}
