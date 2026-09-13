/* ---------------- authentication (admin / user) ---------------- */
const DEFAULT_AUTH = {
  admin: { username:'admin', password:'admin123' },
  users: [
    { id:uid(), username:'user', password:'user123', fullName:'Foydalanuvchi', shiftPassword:'0000', assignedBase:'Zirabod' },
  ],
};
let AUTH = null;
let CURRENT_ROLE = null;
let CURRENT_USER = null; // matched user object when role==='user'
let AUTH_STAGE = 'role'; // 'role' | 'login'
let SELECTED_ROLE = null;

async function loadAuth(){
  try{
    const r = await window.storage.get('authCredentials');
    AUTH = r ? JSON.parse(r.value) : JSON.parse(JSON.stringify(DEFAULT_AUTH));
  }catch(e){ AUTH = JSON.parse(JSON.stringify(DEFAULT_AUTH)); }
  if(!AUTH.admin) AUTH.admin = {...DEFAULT_AUTH.admin};
  if(AUTH.user && !AUTH.users){
    AUTH.users = [{ id:uid(), username:AUTH.user.username, password:AUTH.user.password, fullName:'Foydalanuvchi', shiftPassword:'0000' }];
    delete AUTH.user;
    await persistAuth();
  }
  if(!AUTH.users || !AUTH.users.length) AUTH.users = JSON.parse(JSON.stringify(DEFAULT_AUTH.users));
}
async function persistAuth(){
  try{ await window.storage.set('authCredentials', JSON.stringify(AUTH)); }
  catch(e){ toast('Saqlashda xatolik', 'danger'); }
}

function authMarkHtml(){
  return `<svg viewBox="0 0 256 256" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" style="display:block;">
    <circle cx="128" cy="128" r="128" fill="#0D2B45"/>
    <path d="M129 28C150 90 201 120 201 158C201 200 168 226 128 226C88 226 55 200 55 158C55 120 108 90 129 28Z" fill="#F2A72B"/>
    <path d="M113 150H184V218C184 223 179 225 173 225C160 227 138 227 124 225C118 225 113 223 113 218Z" fill="#FFFFFF"/>
    <path d="M190 150H202V204C202 208 199 210 195 210L190 209Z" fill="#FFFFFF"/>
    <path d="M108 142C108 130 127 124 150 124C173 124 206 130 206 142Z" fill="#FFFFFF"/>
    <path d="M150 124V119Q150 114 154.5 114Q159 114 159 119V124Z" fill="#FFFFFF"/>
    <g fill="none" stroke="#0D2B45" stroke-width="6.5" stroke-linejoin="round" stroke-linecap="round">
      <path d="M108 141C108 130 127 124 150 124C173 124 206 130 206 141"/>
      <path d="M106 145H207"/>
      <path d="M110 146V216"/>
      <path d="M187 148V210"/>
      <path d="M150 124V119Q150 114 154.5 114Q159 114 159 119V124"/>
    </g>
  </svg>`;
}

function renderAuthScreen(){
  const el = $('#authOverlay');
  if(!el) return;
  if(AUTH_STAGE === 'role'){
    el.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo"><div class="mark">${authMarkHtml()}</div><div class="name">NEFTBAZA<small>BOSHQARUV TIZIMI</small></div></div>
        <div class="auth-title">Tizimga kirish</div>
        <div class="auth-sub">Rolingizni tanlang</div>
        <div class="auth-role-row">
          <button type="button" class="auth-role-btn" onclick="selectRole('admin')"><span class="ic">${ICON_SHIELD}</span>Administrator</button>
          <button type="button" class="auth-role-btn" onclick="selectRole('user')"><span class="ic">${ICON_USER}</span>Foydalanuvchi</button>
          <button type="button" class="auth-role-btn" onclick="enterAsGuest()"><span class="ic">${ICON_EYE}</span>Mehmon</button>
        </div>
      </div>`;
  } else {
    const roleLabel = SELECTED_ROLE === 'admin' ? 'Administrator' : 'Foydalanuvchi';
    el.innerHTML = `
      <div class="auth-box">
        <div class="auth-logo"><div class="mark">${authMarkHtml()}</div><div class="name">NEFTBAZA<small>BOSHQARUV TIZIMI</small></div></div>
        <div class="auth-title">${esc(roleLabel)} sifatida kirish</div>
        <div class="auth-sub">Login va parolni kiriting</div>
        <div class="auth-field"><label>Login</label><input type="text" id="auth_username" autocomplete="username" onkeydown="if(event.key==='Enter')document.getElementById('auth_password').focus()"></div>
        <div class="auth-field"><label>Parol</label><input type="password" id="auth_password" autocomplete="current-password" onkeydown="if(event.key==='Enter')attemptLogin()"></div>
        <div class="auth-error" id="auth_error"></div>
        <button type="button" class="btn primary" style="width:100%;justify-content:center;" onclick="attemptLogin()">Kirish</button>
        <button type="button" class="auth-back" onclick="backToRoleSelect()">${ICON_BACK} Orqaga</button>
      </div>`;
    setTimeout(()=>{ const u = $('#auth_username'); if(u) u.focus(); }, 30);
  }
}
function selectRole(role){ SELECTED_ROLE = role; AUTH_STAGE = 'login'; renderAuthScreen(); }
function backToRoleSelect(){ AUTH_STAGE = 'role'; SELECTED_ROLE = null; renderAuthScreen(); }
function enterApp(){
  $('#authOverlay').style.display = 'none';
  $('#shell').style.display = 'grid';
  updateRoleBadge();
  if(DB.ready) renderRoute();
}
function enterAsGuest(){
  CURRENT_ROLE = 'guest'; CURRENT_USER = null;
  enterApp();
}
function attemptLogin(){
  const u = ($('#auth_username')?.value || '').trim();
  const p = $('#auth_password')?.value || '';
  if(SELECTED_ROLE === 'admin'){
    const creds = AUTH.admin;
    if(u === creds.username && p === creds.password){
      CURRENT_ROLE = 'admin'; CURRENT_USER = null;
      enterApp();
      return;
    }
  } else {
    const match = (AUTH.users||[]).find(us => us.username === u && us.password === p);
    if(match){
      CURRENT_ROLE = 'user'; CURRENT_USER = match;
      enterApp();
      return;
    }
  }
  const err = $('#auth_error');
  if(err) err.textContent = "Login yoki parol noto'g'ri";
}
function updateRoleBadge(){
  const el = $('#roleBadge');
  if(!el) return;
  if(CURRENT_ROLE === 'admin') el.innerHTML = `<span class="role-badge admin">${ICON_SHIELD} Administrator</span>`;
  else if(CURRENT_ROLE === 'user') el.innerHTML = `<span class="role-badge user">${ICON_USER} ${esc(CURRENT_USER?.fullName||'Foydalanuvchi')}</span>`;
  else el.innerHTML = `<span class="role-badge guest">${ICON_EYE} Mehmon</span>`;
}
function confirmLogout(){
  askConfirm("Tizimdan chiqmoqchimisiz?", logout);
}
function logout(){
  CURRENT_ROLE = null; CURRENT_USER = null; AUTH_STAGE = 'role'; SELECTED_ROLE = null;
  $('#shell').style.display = 'none';
  $('#authOverlay').style.display = 'flex';
  renderAuthScreen();
}
function isGuest(){ return CURRENT_ROLE === 'guest'; }
function isAdmin(){ return CURRENT_ROLE === 'admin'; }
function isUser(){ return CURRENT_ROLE === 'user'; }
