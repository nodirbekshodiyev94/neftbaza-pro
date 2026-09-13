/* ---------------- field DSL ---------------- */
function F(key,label,type,opts={}){ return Object.assign({key,label,type}, opts); }

/* Rezervuar dropdowni — tanlangan neftbaza bo'yicha filtrlangan ro'yxat.
   Neftbaza tanlanmagan bo'lsa — bo'sh (disabled) va "Avval Neftbazani tanlang". */
let FORM_BASE_CTX = '';
let FORM_RESERVOIR_CTX = '';
function reservoirOptionsHtml(base, selected){
  if(!base) return `<option value="">Avval Neftbazani tanlang</option>`;
  const items = refList('reservoirs').filter(o => o.base === base);
  let opts = '<option value="">— tanlang —</option>';
  items.forEach(o => { opts += `<option value="${esc(o.name)}" ${o.name===selected?'selected':''}>${esc(o.name)}${o.kind?` (${esc(o.kind)})`:''}</option>`; });
  return opts;
}
/* Nomenklatura — Neftbaza VA Rezervuar ikkalasi tanlangandan keyingina faollashadi */
function nomenclatureOptionsHtml(base, reservoir, selected){
  if(!base || !reservoir) return `<option value="">Avval Neftbaza va Rezervuarni tanlang</option>`;
  return refOptionsHtml('nomenclature', selected||'');
}
/* Neftbaza o'zgarganda: Rezervuar tozalanadi/qayta filtrlanadi, Nomenklatura ham tozalanib disabled bo'ladi */
function onDocBaseChange(docType){
  const baseSel = document.getElementById(`f_${docType}_base`);
  const resSel = document.getElementById(`f_${docType}_reservoir`);
  const base = baseSel ? baseSel.value : '';
  if(resSel){
    resSel.innerHTML = reservoirOptionsHtml(base, '');
    resSel.value = '';
    resSel.disabled = !base;
  }
  onDocReservoirChange(docType);
}
/* Rezervuar o'zgarganda: Nomenklatura tozalanadi va Neftbaza+Rezervuar tanlanmaguncha disabled bo'ladi */
function onDocReservoirChange(docType){
  const baseSel = document.getElementById(`f_${docType}_base`);
  const resSel = document.getElementById(`f_${docType}_reservoir`);
  const nomEl = document.getElementById(`f_${docType}_nomenclature`);
  if(!nomEl) return;
  const base = baseSel ? baseSel.value : '';
  const res = resSel ? resSel.value : '';
  const gated = !(base && res);
  nomEl.value = '';
  nomEl.disabled = gated;
  if(nomEl.tagName === 'SELECT'){
    nomEl.innerHTML = nomenclatureOptionsHtml(base, res, '');
  } else {
    nomEl.placeholder = gated ? 'Avval Neftbaza va Rezervuarni tanlang' : 'Qidirish uchun yozing…';
  }
}

const COMMON_HEAD = () => [
  F('opDate','Amaliyot sanasi','date',{required:true, def:today()}),
  F('smena','Smena raqami','text',{}),
];

const DOC_TYPES = {
  prihodAvto: {
    title:'Kirim — Avtotransport', short:'Avto kirim', group:'kirim', category:'avto', icon: ICON_AVTO,
    sheetRef:'Приход авто 1',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('ttn','TTN raqami','text'),
        F('ttnDate',"TTN sanasi",'date'),
        F('cargoStatus',"Yuk holati",'select',{options:["Yo'lda","Yetib kelgan"], def:"Yo'lda"}),
        F('supplier',"Yetkazib beruvchi",'autocomplete',{ref:'contractors'}),
        F('fromPlace',"Jo'natish joyi",'autocomplete',{ref:'destinations'}),
        F('autoNum','Avtomobil raqami','autocomplete',{ref:'autos'}),
        F('pricepNum','Pritsep raqami','autocomplete',{ref:'pricepy'}),
        F('driver','Haydovchi','autocomplete',{ref:'drivers'}),
      ]},
      {title:'Joylashuv va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','autocomplete',{ref:'organizations'}),
      ]},
      {title:'Hujjat (nakladnoy) bo\'yicha', variant:'doc', fields:[
        F('docKg','Miqdor, kg','number'),
        F('docDensity','Zichlik, kg/l','number',{step:'0.001'}),
        F('docLiter','Miqdor, litr','number',{step:'0.01'}),
      ]},
      {title:'Fakt bo\'yicha (o\'lchov natijasi)', variant:'fact', fields:[
        F('factKg','Miqdor, kg','number'),
        F('factDensity','Zichlik, kg/l','number',{step:'0.001'}),
        F('factLiter','Miqdor, litr','number',{step:'0.01'}),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','ttn','base','nomenclature','autoNum','docKg','factKg','diff','normPercent','shortageSurplus','accepted','driver'],
    onSave:(o)=>{
      o.docLiter = o.docLiter ? round2(num(o.docLiter)) : safeDiv(o.docKg, o.docDensity);
      // Yuk hali yo'lda — fakt bo'yicha o'lchov o'tkazilmagan.
      // Fakt maydonlarini tozalaymiz va yo'ldagi qoldiq sifatida hujjat (nakladnoy) miqdorini yozamiz.
      if(o.cargoStatus === "Yo'lda"){
        o.factKg = ''; o.factDensity = ''; o.factLiter = '';
        o.diff = 0;
        o.normPercent = getNormPercent(o.nomenclature);
        o.toleranceKg = 0;
        o.shortageSurplus = 0;
        o.accepted = round2(num(o.docKg));
        return;
      }
      o.factLiter = o.factLiter ? round2(num(o.factLiter)) : safeDiv(o.factKg, o.factDensity);
      o.diff = round2(num(o.factKg) - num(o.docKg));
      o.normPercent = getNormPercent(o.nomenclature);
      o.toleranceKg = round2(num(o.docKg) * o.normPercent / 100);
      o.shortageSurplus = Math.abs(o.diff) <= o.toleranceKg ? 0 : round2(o.diff - Math.sign(o.diff) * o.toleranceKg);
      o.accepted = o.shortageSurplus === 0 ? round2(num(o.docKg)) : round2(num(o.factKg));
    },
    qtyField:'accepted', effect:'in'
  },
  rashodAvto: {
    title:'Chiqim — Avtotransport', short:'Avto chiqim', group:'chiqim', category:'avto', icon: ICON_AVTO,
    sheetRef:'Расход авто 2',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('ttn','TTN raqami','text'),
        F('ttnDate','TTN sanasi','date'),
        F('autoNum','Avtomobil raqami','select',{ref:'autos'}),
        F('pricepNum','Pritsep raqami','select',{ref:'pricepy'}),
        F('driver','Haydovchi','select',{ref:'drivers'}),
      ]},
      {title:'Yo\'nalish va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
        F('contractor','Kontragent','select',{ref:'contractors'}),
        F('destination',"Yo'nalish (manzil)",'select',{ref:'destinations'}),
        F('region','Viloyat','select',{ref:'regions'}),
      ]},
      {title:'Hujjat (nakladnoy) bo\'yicha', variant:'doc', fields:[
        F('docKg','Miqdor, kg','number'),
        F('docDensity','Zichlik, kg/l','number',{step:'0.001'}),
        F('docLiter','Miqdor, litr','number',{step:'0.01'}),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','ttn','base','nomenclature','destination','autoNum','docKg','driver'],
    onSave:(o)=>{
      o.docLiter = o.docLiter ? round2(num(o.docLiter)) : safeDiv(o.docKg, o.docDensity);
    },
    qtyField:'docKg', effect:'out'
  },
  prihodVagon: {
    title:'Kirim — Vagon', short:'Vagon kirim', group:'kirim', category:'vagon', icon: ICON_VAGON,
    sheetRef:'Приход вагон №1',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('vagonNum','Vagon raqami','text'),
        F('status','Holati','select',{options:["Yo'lda","Yetib kelgan"], def:"Yo'lda"}),
        F('invNum','Nakladnoy raqami','text'),
        F('invDate','Nakladnoy sanasi','date'),
        F('dateRoad',"Yo'lga chiqqan sana",'date'),
        F('dateArrive','Yetib kelgan sana','date'),
        F('supplier','Yetkazib beruvchi','select',{ref:'contractors'}),
      ]},
      {title:'Joylashuv va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
      ]},
      {title:'Vagon parametrlari', fields:[
        F('vagonType','Vagon Tipi','text'),
        F('tara','Tara, kg','number'),
        F('tonna','Tonnaj','number'),
        F('invNetKg','Nakladnoy bo\'yicha netto, kg','number'),
      ]},
      {title:"Fakt bo'yicha (o'lchov)", variant:'fact', fields:[
        F('height','Balandlik, mm','number'),
        F('temp','Harorat, °C','number'),
        F('density','Zichlik, kg/l','number'),
        F('liter','Miqdor, litr','number'),
        F('netKg','Netto vazn (fakt), kg','number'),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','vagonNum','base','nomenclature','invNetKg','netKg','diff','normPercent','normPoteri','shortageSurplus','oprihodovano'],
    onSave:(o)=>{
      // Yuk hali yo'lda — fakt bo'yicha o'lchov o'tkazilmagan.
      // Fakt maydonlarini tozalaymiz va yo'ldagi qoldiq sifatida nakladnoy netto miqdorini yozamiz.
      if(o.status === "Yo'lda"){
        o.height=''; o.temp=''; o.density=''; o.liter=''; o.netKg='';
        o.diff = 0;
        o.normPercent = 0.65;
        o.toleranceKg = 0;
        o.normPoteri = 0;
        o.shortageSurplus = 0;
        o.oprihodovano = round2(num(o.invNetKg));
        return;
      }
      o.diff = round2(num(o.netKg) - num(o.invNetKg));
      o.normPercent = 0.65;
      o.toleranceKg = round2(num(o.netKg) * o.normPercent / 100);
      o.normPoteri = o.toleranceKg;
      o.shortageSurplus = Math.abs(o.diff) <= o.toleranceKg ? 0 : round2(o.diff - Math.sign(o.diff) * o.toleranceKg);
      o.oprihodovano = o.shortageSurplus === 0 ? round2(num(o.invNetKg)) : round2(num(o.netKg));
    },
    qtyField:'oprihodovano', effect:'in'
  },
  rashodVagon: {
    title:'Chiqim — Vagon', short:'Vagon chiqim', group:'chiqim', category:'vagon', icon: ICON_VAGON,
    sheetRef:'Расход вагон №2',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('vagonNum','Vagon raqami','text'),
        F('status','Holati','select',{options:['Topshirilgan'], def:'Topshirilgan'}),
        F('invNum','Nakladnoy raqami','text'),
        F('invDate','Nakladnoy sanasi','date'),
        F('dateUnload','Jo\'natilgan sana','date'),
      ]},
      {title:'Yo\'nalish va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
        F('contractor',"Qabul qiluvchi (kontragent)",'select',{ref:'contractors'}),
        F('destination',"Yo'nalish",'select',{ref:'destinations'}),
      ]},
      {title:'Vagon parametrlari', fields:[
        F('vagonType','Turi','text'),
        F('tara','Tara, kg','number'),
        F('tonna','Tonnaj','number'),
      ]},
      {title:"Fakt bo'yicha", fields:[
        F('height','Balandlik, mm','number'),
        F('temp','Harorat, °C','number'),
        F('density','Zichlik, kg/l','number'),
        F('liter','Miqdor, litr','number'),
        F('netKg','Netto vazn, kg','number'),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','vagonNum','base','nomenclature','netKg','contractor'],
    onSave:(o)=>{},
    qtyField:'netKg', effect:'out'
  },
  sUstanovki: {
    title:'Kirim — Qurilmadan', short:'Qurilmadan', group:'kirim', category:'installation', icon: ICON_GEAR,
    sheetRef:'С установка',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('docNum','Order raqami','text'),
        F('installationName','Qurilma nomi','text'),
      ]},
      {title:'Joylashuv va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
      ]},
      {title:"Fakt bo'yicha", variant:'fact', fields:[
        F('temp','Harorat, °C','number'),
        F('kg','Miqdor, kg','number',{step:'0.01'}),
        F('density','Zichlik, kg/l','number'),
        F('liter','Miqdor, litr','number'),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','docNum','base','nomenclature','installationName','kg'],
    onSave:(o)=>{ o.kg = o.kg ? round2(num(o.kg)) : round2(num(o.liter)*num(o.density)); },
    qtyField:'kg', effect:'in'
  },
  vUstanovku: {
    title:'Chiqim — Qurilmaga', short:'Qurilmaga', group:'chiqim', category:'installation', icon: ICON_GEAR,
    sheetRef:'В Установку',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('docNum','Order raqami','text'),
        F('installationName','Qurilma nomi','text'),
      ]},
      {title:'Joylashuv va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
      ]},
      {title:"Fakt bo'yicha", variant:'fact', fields:[
        F('temp','Harorat, °C','number'),
        F('kg','Miqdor, kg','number',{step:'0.01'}),
        F('density','Zichlik, kg/l','number'),
        F('liter','Miqdor, litr','number'),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','docNum','base','nomenclature','installationName','kg'],
    onSave:(o)=>{ o.kg = o.kg ? round2(num(o.kg)) : round2(num(o.liter)*num(o.density)); },
    qtyField:'kg', effect:'out'
  },
  izlishka: {
    title:'Kirim — Ortiqcha', short:'Ortiqcha', group:'kirim', category:'adjustment', icon: ICON_PLUS,
    sheetRef:'Излишка',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('docNum','Hujjat raqami','text'),
        F('causeType','Sabab turi','select',{options:['Inventarizatsiya','Boshqa'], def:'Inventarizatsiya'}),
      ]},
      {title:'Joylashuv va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
      ]},
      {title:"Fakt bo'yicha", variant:'fact', fields:[
        F('temp','Harorat, °C','number'),
        F('kg','Miqdor, kg','number',{step:'0.01'}),
        F('density','Zichlik, kg/l','number'),
        F('liter','Miqdor, litr','number'),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','docNum','base','nomenclature','kg','causeType'],
    onSave:(o)=>{ o.kg = o.kg ? round2(num(o.kg)) : round2(num(o.liter)*num(o.density)); },
    qtyField:'kg', effect:'in'
  },
  spisaniya: {
    title:'Chiqim — Kamomad (Spisaniya)', short:'Kamomad', group:'chiqim', category:'adjustment', icon: ICON_MINUS,
    sheetRef:'Списания',
    sections:[
      {title:"Hujjat ma'lumotlari", fields:[
        ...COMMON_HEAD(),
        F('docNum','Hujjat raqami','text'),
        F('causeType','Sabab turi','select',{options:['Inventarizatsiya','Texnologik yo\'qotish','Buzilish / sifatsizlik'], def:'Inventarizatsiya'}),
      ]},
      {title:'Joylashuv va nomenklatura', fields:[
        F('base','Neftbaza','select',{ref:'bases'}),
        F('reservoir','Rezervuar','select',{ref:'reservoirs'}),
        F('nomenclature','Nomenklatura','select',{ref:'nomenclature'}),
        F('organization','Tashkilot','select',{ref:'organizations'}),
      ]},
      {title:"Fakt bo'yicha", variant:'fact', fields:[
        F('temp','Harorat, °C','number'),
        F('kg','Miqdor, kg','number',{step:'0.01'}),
        F('density','Zichlik, kg/l','number'),
        F('liter','Miqdor, litr','number'),
      ]},
      {title:'Izoh', fields:[ F('note','Izoh','textarea') ]}
    ],
    columns:['opDate','docNum','base','nomenclature','kg','causeType'],
    onSave:(o)=>{ o.kg = o.kg ? round2(num(o.kg)) : round2(num(o.liter)*num(o.density)); },
    qtyField:'kg', effect:'out'
  }
};
const TYPE_LABELS = Object.fromEntries(Object.entries(DOC_TYPES).map(([k,v])=>[k,v.short]));
TYPE_LABELS.proizvodstvo = "Ishlab chiqarish";
