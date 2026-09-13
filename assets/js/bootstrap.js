/* ---------------- bootstrap ---------------- */
(async function init(){
  await loadAuth();
  renderAuthScreen();
  $('#content').innerHTML = `<div class="empty-illustration"><div class="big">${ICON_HOURGLASS}</div>Ma'lumotlar yuklanmoqda…</div>`;
  await loadTheme();
  await loadDB();
  tickClock();
  if(!location.hash) location.hash = '#/';
  if(CURRENT_ROLE) renderRoute();
})();
