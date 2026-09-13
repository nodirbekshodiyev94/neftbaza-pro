/* ---------------- admin: foydalanuvchilarni boshqarish ---------------- */
let USER_EDIT = null;
let USER_FORM_OPEN = false;
function openUserForm(){ USER_FORM_OPEN = true; USER_EDIT = null; renderRoute(); }
function closeUserForm(){ USER_FORM_OPEN = false; USER_EDIT = null; renderRoute(); }
function editUserOpen(id){ USER_EDIT = id; USER_FORM_OPEN = true; renderRoute(); }
async function saveUserAccount(){
  const fullName = $('#user_new_fullName').value.trim();
  const username = $('#user_new_username').value.trim();
  const password = $('#user_new_password').value.trim();
  const shiftPassword = $('#user_new_shiftPassword').value.trim();
  const assignedBaseEl = $('#user_new_assignedBase');
  const assignedBase = assignedBaseEl ? assignedBaseEl.value : '';
  if(!fullName || !username || !password || !shiftPassword){ toast("Barcha maydonlarni to'ldiring", 'danger'); return; }
  const dupUsername = (AUTH.users||[]).some(u => u.username === username && u.id !== USER_EDIT);
  if(dupUsername){ toast('Bunday login band', 'danger'); return; }
  if(USER_EDIT){
    const idx = AUTH.users.findIndex(u=>u.id===USER_EDIT);
    if(idx>-1) AUTH.users[idx] = { id:USER_EDIT, fullName, username, password, shiftPassword, assignedBase };
  } else {
    AUTH.users.push({ id:uid(), fullName, username, password, shiftPassword, assignedBase });
  }
  await persistAuth();
  toast(USER_EDIT ? 'Yangilandi' : "Qo'shildi");
  USER_EDIT = null; USER_FORM_OPEN = false;
  renderRoute();
}
function confirmDeleteUser(id){
  askConfirm("Bu foydalanuvchini o'chirmoqchimisiz?", function(){ deleteUserAccount(id); });
}
async function deleteUserAccount(id){
  AUTH.users = (AUTH.users||[]).filter(u=>u.id!==id);
  await persistAuth();
  toast("O'chirildi", 'danger');
  renderRoute();
}
