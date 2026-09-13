/* ---------------- admin: login/parol sozlamalari ---------------- */
function renderAuthSettingsPage(){
  if(CURRENT_ROLE !== 'admin'){
    return `<div class="card"><div class="empty-illustration"><div class="big">${ICON_LOCK}</div>Bu bo'limga faqat administrator kira oladi</div></div>`;
  }
  const roleCard = (role, label, icon) => `
    <div class="card">
      <div class="cardhead"><h2>${icon} ${esc(label)} — login va parol</h2></div>
      <div class="fieldgrid">
        <div class="field"><label>Login</label><input type="text" id="auth_set_${role}_username" value="${esc(AUTH[role].username)}"></div>
        <div class="field"><label>Yangi parol</label><input type="text" id="auth_set_${role}_password" value="${esc(AUTH[role].password)}"></div>
      </div>
      <div class="formfoot"><button type="button" class="btn primary" onclick="saveAuthSettings('${role}')">${ICON_SAVE} Saqlash</button></div>
    </div>`;

  const editUser = USER_EDIT ? (AUTH.users||[]).find(u=>u.id===USER_EDIT) : null;
  const userForm = (USER_FORM_OPEN || editUser) ? `
    <div class="card">
      <div class="cardhead">
        <div><h2>${ICON_USER} ${editUser ? 'Foydalanuvchini tahrirlash' : "Yangi foydalanuvchi qo'shish"}</h2></div>
        <button type="button" class="btn ghost sm" onclick="closeUserForm()">${ICON_BACK} Yopish</button>
      </div>
      <div class="fieldgrid">
        <div class="field"><label>F.I.Sh</label><input type="text" id="user_new_fullName" value="${editUser?esc(editUser.fullName):''}" placeholder="Familiya Ism"></div>
        <div class="field"><label>Login</label><input type="text" id="user_new_username" value="${editUser?esc(editUser.username):''}"></div>
        <div class="field"><label>Parol (interfeysga kirish uchun)</label><input type="text" id="user_new_password" value="${editUser?esc(editUser.password):''}"></div>
        <div class="field"><label>Shaxsiy parol (smena tasdig'i uchun)</label><input type="text" id="user_new_shiftPassword" value="${editUser?esc(editUser.shiftPassword):''}"></div>
        <div class="field"><label>Biriktirilgan Neftbaza</label><select id="user_new_assignedBase">
          ${(DB.refs.bases||[]).map(b=>`<option value="${esc(b)}" ${editUser&&editUser.assignedBase===b?'selected':''}>${esc(b)}</option>`).join('')}
        </select></div>
      </div>
      <div class="formfoot">
        <button type="button" class="btn primary" onclick="saveUserAccount()">${ICON_SAVE} ${editUser?'Yangilash':"Qo'shish"}</button>
        <button type="button" class="btn ghost" onclick="closeUserForm()">Bekor qilish</button>
      </div>
    </div>` : '';

  const usersList = (AUTH.users||[]).length ? `<div class="tablewrap"><table class="datatable"><thead><tr>
      <th>F.I.Sh</th><th>Login</th><th>Parol</th><th>Shaxsiy parol</th><th>Neftbaza</th><th></th>
    </tr></thead><tbody>
      ${(AUTH.users||[]).map(u=>`<tr>
        <td>${esc(u.fullName)}</td><td>${esc(u.username)}</td><td>${esc(u.password)}</td><td>${esc(u.shiftPassword)}</td><td>${esc(u.assignedBase||'—')}</td>
        <td style="white-space:nowrap;">
          <button class="btn sm icon" onclick="editUserOpen('${u.id}')" title="Tahrirlash">${ICON_EDIT}</button>
          <button class="btn sm danger icon" onclick="confirmDeleteUser('${u.id}')" title="O'chirish">${ICON_CLOSE}</button>
        </td>
      </tr>`).join('')}
    </tbody></table></div>` : emptyBlock();

  const shifts = [...DB.shifts].sort((a,b)=>b.openedAt-a.openedAt);
  const shiftRows = shifts.length ? shifts.map(s=>{
    const unlockedNow = isShiftUnlocked(s);
    const statusCell = s.closedAt
      ? (unlockedNow
          ? `<span class="tag in">${ICON_UNLOCK} Ochiq · ${formatRemaining(s.unlockedUntil-Date.now())} qoldi</span>`
          : `<span class="tag out">${ICON_LOCK} Yopiq</span>`)
      : `<span class="tag mid">${ICON_DOT} Faol</span>`;
    const actionCell = !s.closedAt ? '—' : (unlockedNow
      ? `<button class="btn sm" onclick="toggleShiftLock('${s.id}')">Qulflash</button>`
      : `<select id="unlockdur_${s.id}" style="width:auto;display:inline-block;margin-right:6px;">
           <option value="30">30 daqiqa</option>
           <option value="60" selected>1 soat</option>
           <option value="120">2 soat</option>
           <option value="240">4 soat</option>
         </select>
         <button class="btn sm primary" onclick="unlockShiftFor('${s.id}', document.getElementById('unlockdur_${s.id}').value)">Ruxsat berish</button>`);
    return `
    <tr>
      <td>${s.number}-Smena</td><td>${esc(s.monthKey)}</td><td>${esc(s.personName)}</td>
      <td>${fmtDateTime(s.openedAt)}</td><td>${s.closedAt?fmtDateTime(s.closedAt):'—'}</td>
      <td>${statusCell}</td>
      <td style="white-space:nowrap;">${actionCell}</td>
    </tr>`;
  }).join('') : `<tr class="emptyrow"><td colspan="7">Hali smena yo'q</td></tr>`;

  return `
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_KEY} Login / parol sozlamalari</h2><div class="sub">Tizimga kirish uchun login va parollarni shu yerdan boshqarasiz</div></div></div>
    </div>
    ${roleCard('admin', 'Administrator', ICON_SHIELD)}
    ${userForm}
    <div class="card">
      <div class="cardhead">
        <h2>${ICON_USERS} Foydalanuvchilar <span class="badge-num">${(AUTH.users||[]).length}</span></h2>
        <button type="button" class="btn primary sm" onclick="openUserForm()">+ Yangi foydalanuvchi</button>
      </div>
      ${usersList}
    </div>
    <div class="card">
      <div class="cardhead"><div><h2>${ICON_CLOCK} Smena boshqaruvi</h2><div class="sub">Yopilgan smenalarni foydalanuvchi uchun qayta tahrirlashga ruxsat berish</div></div></div>
      <div class="tablewrap"><table class="datatable"><thead><tr>
        <th>Smena</th><th>Oy</th><th>Mas'ul shaxs</th><th>Ochilgan</th><th>Yopilgan</th><th>Holati</th><th></th>
      </tr></thead><tbody>${shiftRows}</tbody></table></div>
    </div>
  `;
}
async function saveAuthSettings(role){
  const u = $(`#auth_set_${role}_username`).value.trim();
  const p = $(`#auth_set_${role}_password`).value.trim();
  if(!u || !p){ toast("Login va parolni to'ldiring", 'danger'); return; }
  AUTH[role] = { username:u, password:p };
  await persistAuth();
  toast('Saqlandi');
}
