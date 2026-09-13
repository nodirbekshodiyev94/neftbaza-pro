/* ---------------- utils ---------------- */
const $ = (sel, root=document) => root.querySelector(sel);
const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
const today = () => new Date().toISOString().slice(0,10);
const nowShift = () => { const h = new Date().getHours(); return (h>=8 && h<20) ? '1' : '2'; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const num = (v) => { const n = parseFloat(v); return isNaN(n) ? 0 : n; };
const round2 = (n) => Math.round((num(n))*100)/100;
const safeDiv = (a,b) => { const bb = num(b); return bb ? round2(num(a)/bb) : 0; };
const fmt = (n, d=0) => {
  const v = num(n);
  return v.toLocaleString('en-US', {minimumFractionDigits:d, maximumFractionDigits:d}).replace(/,/g, ' ');
};
const fmtDate = (s) => { if(!s) return '—'; const p = s.split('-'); return p.length===3 ? `${p[2]}.${p[1]}.${p[0]}` : s; };
const fmtDateTime = (ts) => { if(!ts) return '—'; const d = new Date(ts); return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`; };
const toast = (msg, kind='ok') => {
  const box = document.createElement('div');
  box.className = 'toastmsg' + (kind==='danger' ? ' danger' : '');
  box.textContent = msg;
  $('#toast').appendChild(box);
  setTimeout(()=>{ box.style.opacity='0'; box.style.transition='opacity .3s'; setTimeout(()=>box.remove(), 300); }, 2600);
};
