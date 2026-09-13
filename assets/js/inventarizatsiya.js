/* ---------------- Inventarizatsiya (jurnal: izlishka + spisaniya) ---------------- */
function renderInventarizatsiya(){
  const bases = refList('bases');
  const combined = [
    ...DB.docs.izlishka.map(d=>({...d, _type:'izlishka', _sign:1})),
    ...DB.docs.spisaniya.map(d=>({...d, _type:'spisaniya', _sign:-1})),
  ].sort((a,b)=> (b.opDate||'').localeCompare(a.opDate||'') || b.createdAt-a.createdAt);

  const perNom = {};
  combined.forEach(d=>{ perNom[d.nomenclature] = (perNom[d.nomenclature]||0) + d._sign*num(d.kg); });
  const summaryRows = Object.entries(perNom).filter(([n])=>n).map(([n,v])=>`
    <tr><td>${esc(n)}</td><td class="num ${v>=0?'pos':'neg'}">${v>0?'+':''}${fmt(v,1)}</td></tr>
  `).join('') || `<tr class="emptyrow"><td colspan="2">Ma'lumot yo'q</td></tr>`;

  const body = combined.length ? combined.map(d=>`
    <tr>
      <td>${fmtDate(d.opDate)}</td>
      <td><span class="tag ${d._type==='izlishka'?'in':'out'}">${d._type==='izlishka'?`${ICON_PLUS} Ortiqcha`:`${ICON_MINUS} Kamomad`}</span></td>
      <td>${esc(d.base)}</td><td>${esc(d.nomenclature)}</td><td>${esc(d.causeType||'—')}</td>
      <td class="num ${d._type==='izlishka'?'pos':'neg'}">${d._type==='izlishka'?'+':'-'}${fmt(d.kg,1)}</td>
    </tr>
  `).join('') : `<tr class="emptyrow"><td colspan="6">Hali yozuv yo'q</td></tr>`;

  return `
    <div class="card">
      <div class="cardhead">
        <div><h2>${ICON_RULER} Inventarizatsiya jurnali</h2><div class="sub">Ortiqcha va kamomad yozuvlari birlashtirilgan ko'rinishda</div></div>
        <div class="toolbar-btns">
          ${isGuest() ? '' : `<button type="button" class="btn sm" onclick="navigate('/izlishka','form')">${ICON_PLUS} Ortiqcha kiritish</button>
          <button type="button" class="btn sm" onclick="navigate('/spisaniya','form')">${ICON_MINUS} Kamomad kiritish</button>`}
        </div>
      </div>
      <div class="tablewrap"><table class="datatable"><thead><tr>
        <th>Sana</th><th>Turi</th><th>Neftbaza</th><th>Nomenklatura</th><th>Sabab</th><th>Miqdor, kg</th>
      </tr></thead><tbody>${body}</tbody></table></div>
    </div>
    <div class="card">
      <div class="cardhead"><h2>Σ Nomenklatura bo'yicha sof farq</h2></div>
      <div class="tablewrap"><table class="datatable"><thead><tr><th>Nomenklatura</th><th>Sof farq, kg</th></tr></thead>
      <tbody>${summaryRows}</tbody></table></div>
    </div>
  `;
}
