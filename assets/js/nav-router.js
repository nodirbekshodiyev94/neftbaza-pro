/* ---------------- navigation + router ---------------- */
const NAV = [
  { type:'single', items:[ ['/', ICON_DASHBOARD, 'Boshqaruv paneli'] ] },
  { type:'group', key:'kirim', label:'Kirim', icon: ICON_INBOX_IN, items:[
      ['/prihodAvto', ICON_AVTO, 'Avtotransport'],
      ['/prihodVagon', ICON_VAGON, 'Vagon'],
      ['/proizvodstvo', ICON_FLASK, "Ishlab chiqarish"],
      ['/sUstanovki', ICON_GEAR, 'Zavoddan (qurilmadan)'],
      ['/izlishka', ICON_PLUS, 'Ortiqcha'],
  ]},
  { type:'group', key:'chiqim', label:'Chiqim', icon: ICON_INBOX_OUT, items:[
      ['/rashodAvto', ICON_AVTO, 'Avtotransport'],
      ['/rashodVagon', ICON_VAGON, 'Vagon'],
      ['/proizvodstvo', ICON_FLASK, "Ishlab chiqarish"],
      ['/vUstanovku', ICON_GEAR, 'Zavodga (qurilmaga)'],
      ['/spisaniya', ICON_MINUS, 'Kamomad'],
  ]},
  { type:'single', items:[ ['/inventarizatsiya', ICON_RULER, 'Inventarizatsiya'] ] },
  { type:'group', key:'hisobotlar', label:'Hisobotlar', icon: ICON_TREND_UP, items:[
      ['/matOtchet', ICON_LIST, 'Moddiy hisobot'],
      ['/smenaHarakat', ICON_CLOCK, 'Smena harakati'],
      ['/realizatsiya', ICON_MONEY, 'Realizatsiya'],
  ]},
  { type:'single', items:[ ['/malumotnomalar', ICON_BOOK, "Ma'lumotnomalar"] ] },
  { type:'single', adminOnly:true, items:[ ['/sozlamalar', ICON_KEY, "Login sozlamalari"] ] },
];
const NAV_EXPANDED = { kirim:false, chiqim:false, hisobotlar:false };
function toggleNavGroup(key){
  NAV_EXPANDED[key] = !NAV_EXPANDED[key];
  renderNav(currentRoute());
}
const PAGE_META = {
  '/': ['Boshqaruv paneli','BOSH SAHIFA'],
  '/prihodAvto': ['Kirim — Avtotransport','KIRIM / AVTOTRANSPORT'],
  '/prihodVagon': ['Kirim — Vagon','KIRIM / VAGON'],
  '/rashodAvto': ['Chiqim — Avtotransport','CHIQIM / AVTOTRANSPORT'],
  '/rashodVagon': ['Chiqim — Vagon','CHIQIM / VAGON'],
  '/proizvodstvo': ["Ishlab chiqarish operatsiyasi",'KIRIM-CHIQIM / ISHLAB CHIQARISH'],
  '/sUstanovki': ['Kirim — Zavoddan (qurilmadan)','KIRIM / ZAVODDAN'],
  '/vUstanovku': ['Chiqim — Zavodga (qurilmaga)','CHIQIM / ZAVODGA'],
  '/izlishka': ['Kirim — Ortiqcha','KIRIM / ORTIQCHA'],
  '/spisaniya': ['Chiqim — Kamomad','CHIQIM / KAMOMAD (SPISANIYA)'],
  '/inventarizatsiya': ['Inventarizatsiya','OMBOR TAFOVUTI'],
  '/matOtchet': ['Moddiy hisobot','HISOBOTLAR / MODDIY HISOBOT'],
  '/smenaHarakat': ['Smena bo\'yicha harakat','HISOBOTLAR / SMENA'],
  '/realizatsiya': ['Realizatsiya','HISOBOTLAR / REALIZATSIYA'],
  '/malumotnomalar': ["Ma'lumotnomalar",'SPRAVOCHNIKLAR'],
  '/sozlamalar': ['Login sozlamalari','ADMINISTRATOR'],
};
function renderNav(route){
  let html = '';
  NAV.forEach(sec => {
    if(sec.adminOnly && CURRENT_ROLE !== 'admin') return;
    if(sec.type === 'single'){
      html += sec.items.map(([path,icon,label]) => `
        <a class="navitem ${route===path?'active':''}" href="javascript:void(0)" onclick="navigate('${path}')"><span class="ic">${icon}</span>${esc(label)}</a>
      `).join('');
    } else {
      const containsActive = sec.items.some(([p]) => p === route);
      if(containsActive) NAV_EXPANDED[sec.key] = true;
      const isOpen = NAV_EXPANDED[sec.key];
      html += `
        <button type="button" class="navparent ${isOpen?'open':''}" onclick="toggleNavGroup('${sec.key}')">
          <span class="ic">${sec.icon}</span><span class="navparent-label">${esc(sec.label)}</span><span class="chevron">${ICON_CHEVRON}</span>
        </button>
        <div class="navchildren ${isOpen?'open':''}"><div class="navchildren-inner">
          ${sec.items.map(([path,icon,label]) => `
            <a class="navitem sub ${route===path?'active':''}" href="javascript:void(0)" onclick="navigate('${path}')"><span class="ic">${icon}</span>${esc(label)}</a>
          `).join('')}
        </div></div>
      `;
    }
  });
  $('#navhost').innerHTML = `<nav class="navgroup">${html}</nav>`;
}

const ROUTES = {
  '/': renderDashboard,
  '/prihodAvto': () => renderDocPage('prihodAvto'),
  '/rashodAvto': () => renderDocPage('rashodAvto'),
  '/prihodVagon': () => renderDocPage('prihodVagon'),
  '/rashodVagon': () => renderDocPage('rashodVagon'),
  '/sUstanovki': () => renderDocPage('sUstanovki'),
  '/vUstanovku': () => renderDocPage('vUstanovku'),
  '/izlishka': () => renderDocPage('izlishka'),
  '/spisaniya': () => renderDocPage('spisaniya'),
  '/proizvodstvo': renderProizvodstvoPage,
  '/inventarizatsiya': renderInventarizatsiya,
  '/matOtchet': renderMatOtchet,
  '/smenaHarakat': renderSmenaHarakat,
  '/realizatsiya': renderRealizatsiya,
  '/malumotnomalar': renderRefsPage,
  '/sozlamalar': renderAuthSettingsPage,
};

function currentRoute(){
  const h = location.hash.replace('#','');
  return ROUTES[h] ? h : '/';
}
function navigate(path, mode){
  const key = path.replace('/','');
  if(mode === 'form' && isGuest()){ toast("Mehmon sifatida faqat ko'rish mumkin", 'danger'); mode = 'journal'; }
  if(mode === 'form' && isUser() && !hasWorkableShift()){ toast("Avval smenani oching", 'danger'); mode = 'journal'; }
  if(DOC_TYPES[key]){ DOC_VIEW_MODE[key] = mode || 'journal'; EDITING_ID[key] = null; }
  if(key === 'proizvodstvo'){ PROD_VIEW_MODE = mode || 'journal'; EDIT_PROD_ID = null; }
  if(location.hash === '#'+path){ renderRoute(); return; }
  location.hash = '#'+path;
}
function renderRoute(){
  if(!DB.ready) return;
  const route = currentRoute();
  const [title, crumb] = PAGE_META[route];
  $('#pagetitle').textContent = title;
  $('#pagecrumb').textContent = crumb;
  renderNav(route);
  $('#content').innerHTML = ROUTES[route]();
  $('#sidebar').classList.remove('open');
  window.scrollTo(0,0);
}
window.addEventListener('hashchange', renderRoute);
window.addEventListener('popstate', renderRoute);
