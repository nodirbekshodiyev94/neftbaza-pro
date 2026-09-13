/* ---------------- Smena (shift) tizimi ---------------- */
function monthKeyOf(ts){ const d = new Date(ts); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`; }
function getOpenShift(){ return (DB.shifts||[]).find(s => s.closedAt === null) || null; }
function computeNextShiftNumber(){
  const mk = monthKeyOf(Date.now());
  const sameMonth = (DB.shifts||[]).filter(s => s.monthKey === mk);
  return sameMonth.length ? Math.max(...sameMonth.map(s=>s.number)) + 1 : 1;
}
async function openShift(fullName, shiftPassword){
  if(getOpenShift()){ toast('Hozir allaqachon ochiq smena mavjud', 'danger'); return false; }
  if(!CURRENT_USER || shiftPassword !== CURRENT_USER.shiftPassword){ toast("Shaxsiy parol noto'g'ri", 'danger'); return false; }
  if(!fullName.trim()){ toast("F.I.Sh kiriting", 'danger'); return false; }
  const now = Date.now();
  const shift = {
    id: uid(), number: computeNextShiftNumber(), monthKey: monthKeyOf(now),
    personName: fullName.trim(), userId: CURRENT_USER.id,
    openedAt: now, closedAt: null, unlocked: false
  };
  DB.shifts.push(shift);
  await persist('shifts');
  toast(`${shift.number}-Smena ochildi`);
  return true;
}
async function closeCurrentShift(){
  const shift = getOpenShift();
  if(!shift) return;
  shift.closedAt = Date.now();
  await persist('shifts');
  toast(`${shift.number}-Smena yopildi`);
}
async function toggleShiftLock(id){
  const shift = (DB.shifts||[]).find(s=>s.id===id);
  if(!shift) return;
  shift.unlocked = false;
  shift.unlockedUntil = 0;
  await persist('shifts');
  toast('Smena qulflandi');
  renderRoute();
}
/* Smenani ma'lum vaqtga (daqiqa) qayta ochish — Admin ruxsati bilan */
async function unlockShiftFor(id, minutes){
  const shift = (DB.shifts||[]).find(s=>s.id===id);
  if(!shift) return;
  const mins = Math.max(1, num(minutes) || 60);
  shift.unlocked = true;
  shift.unlockedUntil = Date.now() + mins*60000;
  await persist('shifts');
  toast(`${shift.number}-Smena ${mins} daqiqaga tahrirlashga ochildi`);
  renderRoute();
}
/* Smena hozir tahrirlash uchun ochiqmi (vaqt chegarasi bilan) — muddati o'tsa avtomatik qulflanadi */
function isShiftUnlocked(shift){
  return !!(shift && shift.unlockedUntil && shift.unlockedUntil > Date.now());
}
/* Qolgan vaqtni o'qilishi oson formatga o'girish: "1 soat 20 daqiqa" / "35 daqiqa" */
function formatRemaining(ms){
  const totalMin = Math.max(0, Math.ceil(ms/60000));
  const h = Math.floor(totalMin/60), m = totalMin%60;
  if(h>0) return `${h} soat${m>0?' '+m+' daqiqa':''}`;
  return `${m} daqiqa`;
}
function canEditDoc(doc){
  if(isAdmin()) return true;
  if(isGuest()) return false;
  // user role
  if(!doc.shiftId) return true; // legacy docs created before shift system existed
  const openShift = getOpenShift();
  if(openShift && doc.shiftId === openShift.id) return true;
  const shift = (DB.shifts||[]).find(s=>s.id===doc.shiftId);
  return shift ? isShiftUnlocked(shift) : true;
}
/* Admin tomonidan vaqtinchalik qayta ochilgan (yopiq) smenaga User "kirgan" bo'lsa, shu ID saqlanadi */
let REOPENED_SHIFT_ID = null;
/* Hozir ishlash mumkin bo'lgan smena: avval haqiqiy ochiq smena, bo'lmasa — User "kirgan" va hali muddati
   o'tmagan qayta ochilgan yopiq smena. Ikkalasi ham bo'lmasa — null (hujjat kiritib bo'lmaydi). */
function effectiveShiftId(){
  const os = getOpenShift();
  if(os) return os.id;
  if(REOPENED_SHIFT_ID){
    const s = (DB.shifts||[]).find(x=>x.id===REOPENED_SHIFT_ID);
    if(s && isShiftUnlocked(s)) return s.id;
  }
  return null;
}
function hasWorkableShift(){ return !!effectiveShiftId(); }
function effectiveShiftObj(){
  const id = effectiveShiftId();
  return id ? (DB.shifts||[]).find(s=>s.id===id) : null;
}
/* Admin ochib bergan yopiq smenaga "kirish" — shundan keyin yangi hujjatlar shu smenaga yoziladi */
function enterReopenedShift(id){
  const s = (DB.shifts||[]).find(x=>x.id===id);
  if(!s || !isShiftUnlocked(s)){ toast('Bu smenaga kirish muddati tugagan', 'danger'); renderRoute(); return; }
  REOPENED_SHIFT_ID = id;
  toast(`${s.number}-Smenaga kirdingiz — ma'lumot kiritishni davom ettirishingiz mumkin`);
  renderRoute();
}
function exitReopenedShift(){ REOPENED_SHIFT_ID = null; renderRoute(); }
