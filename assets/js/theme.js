/* ---------------- theme (kun/tun) ---------------- */
function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  const btn = $('#themebtn');
  if(btn) btn.innerHTML = mode === 'light' ? ICON_SUN : ICON_MOON;
}
async function toggleTheme(){
  const cur = document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  const next = cur === 'light' ? 'dark' : 'light';
  applyTheme(next);
  try{ await window.storage.set('theme', next); }catch(e){}
}
async function loadTheme(){
  let mode = 'dark';
  try{
    const r = await window.storage.get('theme');
    if(r && r.value) mode = r.value;
  }catch(e){}
  applyTheme(mode);
}

