/* ---------------- reference helpers ---------------- */
const REF_DEFS = {
  bases:        {label:'Neftbazalar',        icon: ICON_FACTORY, type:'flat',   placeholder:"Neftbaza nomi (masalan, Zirabod)"},
  nomenclature: {label:'Nomenklatura',       icon: ICON_FLASK, type:'object', fields:[['name','Nomenklatura nomi']], display:'name'},
  organizations:{label:'Tashkilotlar',       icon: ICON_BUILDING, type:'object', fields:[['name','Tashkilot nomi'],['inn','Tashkilot STIR (INN)']], display:'name'},
  contractors:  {label:'Kontragentlar',      icon: ICON_HANDSHAKE, type:'object', fields:[['name','Kontragent nomi'],['inn','Tashkilot STIR (INN)']], display:'name'},
  destinations: {label:"Yo'nalishlar",       icon: ICON_PIN, type:'flat',   placeholder:"Yo'nalish / manzil nomi"},
  regions:      {label:'Viloyatlar',         icon: ICON_MAP, type:'flat',   placeholder:'Viloyat nomi'},
  autos:        {label:'Avtomobillar',       icon: ICON_AVTO, type:'object', fields:[['number','Avto raqami'],['org','Tashkilot',null,'organizations']], display:'number'},
  pricepy:      {label:'Pritseplar',         icon: ICON_TRAILER, type:'object', fields:[['number','Pritsep raqami'],['org','Tashkilot',null,'organizations']], display:'number'},
  drivers:      {label:'Haydovchilar',       icon: ICON_USER, type:'flat',   placeholder:'Haydovchi F.I.Sh.'},
  reservoirs:   {label:'Rezervuarlar',       icon: ICON_TANK, type:'object', fields:[['base','Neftbaza',null,'bases',true],['name','Nomi (RVS-1)'],['kind','Turi (RVS/RGS)'],['volume','Sig\'imi, kg']], display:'name'},
  normPotr:     {label:"Me'yoriy yo'qotish", icon: ICON_TREND_DOWN, type:'object', fields:[['base','Neftbaza',null,'bases',true],['nomenclature','Nomenklatura'],['percent',"Me'yor, %"]], display:'nomenclature'}
};
function refList(key){ return DB.refs[key] || []; }
function getNormPercent(nomenclature){
  const item = (DB.refs.normPotr || []).find(n => n.nomenclature === nomenclature);
  return item ? num(item.percent) : 0;
}
function refOptionsHtml(key, selected){
  const def = REF_DEFS[key];
  const items = refList(key);
  let opts = '<option value="">— tanlang —</option>';
  if(def.type === 'flat'){
    items.forEach(v => { opts += `<option value="${esc(v)}" ${v===selected?'selected':''}>${esc(v)}</option>`; });
  } else {
    items.forEach(o => {
      const val = o[def.display];
      const extra = key==='reservoirs' ? ` · ${esc(o.base)} (${esc(o.kind)})` : (key==='nomenclature' ? '' : (o.org ? ` · ${esc(o.org)}` : ''));
      opts += `<option value="${esc(val)}" ${val===selected?'selected':''}>${esc(val)}${extra}</option>`;
    });
  }
  return opts;
}
