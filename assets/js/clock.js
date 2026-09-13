/* ---------------- clock + mobile menu ---------------- */
function tickClock(){
  const d = new Date();
  const dateStr = d.toLocaleDateString('uz-UZ', {day:'2-digit', month:'2-digit', year:'numeric'});
  const timeStr = d.toLocaleTimeString('en-GB');
  const dEl = $('#clockdate'), tEl = $('#clocktime');
  if(dEl) dEl.textContent = dateStr;
  if(tEl) tEl.textContent = timeStr;
}
setInterval(tickClock, 1000);

$('#menubtn').addEventListener('click', () => $('#sidebar').classList.toggle('open'));

