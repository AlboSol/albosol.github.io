/* Ruokasi app.js HOTFIX build 20260204222801
   Fixes SyntaxError by replacing the entire app bootstrap with a clean implementation.
*/
(() => {
  'use strict';

  const APP_VERSION = '3.3.2-hotfix';
  const LS_KEYS = {
    primary: 'ruokasi.v2',
    fallback: 'ruokasi.saved',
  };

  const MEALS = [
    { id:'aamiainen', label:'Aamiainen' },
    { id:'lounas', label:'Lounas' },
    { id:'valipala', label:'Välipala' },
    { id:'paivallinen', label:'Päivällinen' },
    { id:'iltapala', label:'Iltapala' },
  ];

  const CATEGORIES = [
    'Aamiainen','Lounas','Päivällinen','Välipala','Iltapala','Juomat','Jälkiruoat'
  ];

  const clamp = (v,min,max)=>Math.max(min,Math.min(max,v));
  const todayISO = () => new Date().toISOString().slice(0,10);
  const fmtDateFI = (iso) => {
    const [y,m,d]=iso.split('-');
    return `${d}.${m}.${y}`;
  };

  // ---------- Storage ----------
  function loadState() {
    let raw = localStorage.getItem(LS_KEYS.primary);
    if (!raw) raw = localStorage.getItem(LS_KEYS.fallback);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return migrate(parsed);
      } catch(e) {
        console.warn('State parse failed', e);
      }
    }
    return migrate(null);
  }

  function saveState(state) {
    localStorage.setItem(LS_KEYS.primary, JSON.stringify(state));
  }

  function migrate(prev) {
    const base = {
      version: APP_VERSION,
      products: [],
      days: {},
    };
    const s = prev && typeof prev === 'object' ? prev : base;
    if (!s.version) s.version = APP_VERSION;
    if (!Array.isArray(s.products)) s.products = [];
    if (!s.days || typeof s.days !== 'object') s.days = {};
    return s;
  }

  // ---------- Calculations ----------
  function getDay(state, iso) {
    if (!state.days[iso]) {
      state.days[iso] = {
        target: {
          baseKcal: 2000,
          workoutKcal: 0,
          stepsGoal: 0,
          sleepHours: 0,
        },
        entries: []
      };
    }
    return state.days[iso];
  }

  function calcDailyTargetKcal(day) {
    const t = day.target || {};
    const base = Number(t.baseKcal)||0;
    const wk = Number(t.workoutKcal)||0;
    const steps = Number(t.stepsGoal)||0;
    const stepsKcal = steps * 0.04;
    return Math.round(base + wk + stepsKcal);
  }

  function entryTotals(entries) {
    return entries.reduce((acc,e)=>{
      acc.kcal += e.kcal||0;
      acc.p += e.p||0;
      acc.c += e.c||0;
      acc.f += e.f||0;
      return acc;
    }, {kcal:0,p:0,c:0,f:0});
  }

  function aggregateByProduct(entries) {
    const map = new Map();
    for (const e of entries) {
      const key = e.productId;
      const cur = map.get(key) || {productId:key, kcal:0,p:0,c:0,f:0, grams:0};
      cur.kcal += e.kcal||0;
      cur.p += e.p||0; cur.c += e.c||0; cur.f += e.f||0;
      cur.grams += e.grams||0;
      map.set(key, cur);
    }
    return Array.from(map.values());
  }

  function setProductTotalForDay(day, productId, mealId, gramsNew, computed) {
    day.entries = day.entries.filter(e => e.productId !== productId);
    if (gramsNew <= 0) return;
    day.entries.push({
      productId,
      mealId,
      amount: computed.amount,
      unit: computed.unit,
      grams: gramsNew,
      kcal: computed.kcal,
      p: computed.p, c: computed.c, f: computed.f,
      ts: Date.now(),
    });
  }

  function computeFromProduct(product, grams) {
    const kcal = Math.round((product.kcal100||0) * grams / 100);
    const p = Math.round((product.p||0) * grams / 100);
    const c = Math.round((product.c||0) * grams / 100);
    const f = Math.round((product.f||0) * grams / 100);
    return { kcal, p, c, f, amount: grams, unit: 'g' };
  }

  // ---------- UI helpers ----------
  function el(tag, attrs={}, ...children) {
    const node = document.createElement(tag);
    for (const [k,v] of Object.entries(attrs||{})) {
      if (k === 'class') node.className = v;
      else if (k === 'style') node.setAttribute('style', v);
      else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
      else if (v !== null && v !== undefined) node.setAttribute(k, String(v));
    }
    for (const ch of children.flat()) {
      if (ch === null || ch === undefined) continue;
      node.appendChild(typeof ch === 'string' ? document.createTextNode(ch) : ch);
    }
    return node;
  }

  function btn(label, opts={}) {
    const { onClick, kind='ghost', title } = opts;
    const styles = {
      ghost: 'background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.12);color:#fff;',
      primary:'background:#2563EB;border:1px solid rgba(255,255,255,.12);color:#fff;',
      ok: 'background:#16A34A;border:1px solid rgba(255,255,255,.12);color:#fff;',
      danger:'background:#DC2626;border:1px solid rgba(255,255,255,.12);color:#fff;',
    };
    return el('button', {
      type:'button',
      style:`padding:10px 12px;border-radius:12px;font-weight:700;${styles[kind]||styles.ghost}`,
      title: title||'',
      onclick: onClick||(()=>{})
    }, label);
  }

  function modal(title, bodyNode, actionsNode) {
    const overlay = el('div', {style:'position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:9999;display:flex;align-items:center;justify-content:center;padding:14px;'});
    const card = el('div', {style:'width:min(520px,100%);background:#12121a;border:1px solid rgba(255,255,255,.14);border-radius:18px;box-shadow:0 10px 30px rgba(0,0,0,.4);'});
    const head = el('div', {style:'padding:14px 16px;border-bottom:1px solid rgba(255,255,255,.10);font-size:16px;font-weight:900;'}, title);
    const body = el('div', {style:'padding:14px 16px;'}, bodyNode);
    const foot = el('div', {style:'padding:12px 16px;border-top:1px solid rgba(255,255,255,.10);display:flex;gap:10px;justify-content:flex-end;'}, actionsNode);
    card.append(head, body, foot);
    overlay.append(card);
    overlay.addEventListener('click', (e)=>{ if (e.target === overlay) overlay.remove(); });
    document.body.append(overlay);
    return overlay;
  }

  function vxButtons({onYes, onNo, yesText='V', noText='X'}) {
    return el('div', {style:'display:flex;gap:10px;'},
      btn(yesText, {kind:'ok', onClick:onYes}),
      btn(noText, {kind:'danger', onClick:onNo}),
    );
  }

  // ---------- App state ----------
  const state = loadState();
  let selectedDay = todayISO();
  let selectedMeal = 'aamiainen';
  let selectedCategory = 'Aamiainen';

  // ---------- Components ----------
  function macroRow(label, value, goal) {
    const pct = goal>0 ? clamp(value/goal, 0, 1) : 0;
    return el('div', {},
      el('div', {style:'display:flex;justify-content:space-between;opacity:.9;font-weight:800;'},
        el('div', {}, label),
        el('div', {style:'opacity:.75;'}, `${value} / ${goal} g`)
      ),
      el('div', {style:'height:10px;border-radius:999px;background:rgba(255,255,255,.08);overflow:hidden;margin-top:6px;'},
        el('div', {style:`height:100%;width:${Math.round(pct*100)}%;background:#2563EB;`}, '')
      )
    );
  }

  function kpi(label, value, onClick) {
    return el('div', {
      style:'padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);cursor:pointer;',
      onclick:onClick
    },
      el('div', {style:'opacity:.65;font-weight:800;font-size:12px;'}, label),
      el('div', {style:'font-size:22px;font-weight:900;margin-top:4px;'}, value),
    );
  }

  // ---------- Screens ----------
  function render() {
    document.body.style.margin='0';
    document.body.style.background='#0b0b0f';
    document.body.style.color='#fff';
    document.body.style.fontFamily='system-ui,-apple-system,Segoe UI,Roboto';

    const day = getDay(state, selectedDay);
    const targetKcal = calcDailyTargetKcal(day);
    const totals = entryTotals(day.entries);
    const remaining = targetKcal - totals.kcal;
    const pct = targetKcal>0 ? clamp(totals.kcal/targetKcal,0,1) : 0;

    document.body.innerHTML = '';

    const header = el('div', {style:'padding:14px;background:rgba(11,11,15,.92);backdrop-filter: blur(10px);border-bottom:1px solid rgba(255,255,255,.08);position:sticky;top:0;z-index:10;'},
      el('div', {style:'display:flex;align-items:center;gap:10px;'},
        el('div', {style:'width:34px;height:34px;border-radius:10px;background:linear-gradient(135deg,#38bdf8,#7c3aed);'}),
        el('div', {style:'font-size:22px;font-weight:900;'}, 'Ruokasi'),
        el('div', {style:'opacity:.7;font-weight:800;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.10);'}, APP_VERSION),
        el('div', {style:'margin-left:auto;display:flex;gap:10px;'},
          btn('📅', {kind: (selectedDay===todayISO()?'ghost':'primary'), onClick: openCalendar}),
          btn('OK', {kind:'primary', onClick: ()=>modal('Tallennus', el('div', {}, 'Kaikki tallentuu automaattisesti.'), vxButtons({onYes: ()=>document.querySelector('div[style*="z-index:9999"]').remove?.(), onNo: ()=>document.querySelector('div[style*="z-index:9999"]').remove?.(), yesText:'OK', noText:'Sulje'}))})
        )
      ),
      el('div', {style:'opacity:.75;margin-top:6px;font-size:13px;'}, (selectedDay===todayISO()?'Tänään':'Päivä') + ' • ' + fmtDateFI(selectedDay))
    );

    const ring = el('div', {style:'width:120px;height:120px;border-radius:999px;border:10px solid rgba(255,255,255,.10);display:flex;align-items:center;justify-content:center;background:conic-gradient(#2563EB '+Math.round(pct*360)+'deg, rgba(255,255,255,.06) 0deg);'},
      el('div', {style:'text-align:center;'},
        el('div', {style:'font-size:34px;font-weight:900;line-height:1;'}, String(totals.kcal)),
        el('div', {style:'opacity:.8;font-size:13px;margin-top:2px;'}, 'kcal')
      )
    );

    const topCard = el('div', {style:'margin:14px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);padding:14px;'},
      el('div', {style:'font-size:26px;font-weight:900;margin-bottom:10px;'}, selectedDay===todayISO()?'Tänään':'Päivä'),
      el('div', {style:'display:flex;gap:16px;align-items:center;'},
        ring,
        el('div', {style:'display:flex;flex-direction:column;gap:6px;'},
          el('div', {style:'opacity:.75;font-weight:900;'}, 'Jäljellä'),
          el('div', {style:'font-size:28px;font-weight:900;'}, `${Math.max(0, remaining)} kcal`),
          el('a', {href:'#', style:'color:#fff;opacity:.9;font-weight:800;', onclick:(e)=>{e.preventDefault(); openDayEatings();}}, 'Päivän syömiset')
        )
      ),
      el('div', {style:'display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px;'},
        kpi('Päivän tavoite', targetKcal+' kcal', openTargetModal),
        kpi('Syöty', totals.kcal+' kcal', openDayEatings)
      ),
      el('div', {style:'margin-top:12px;display:flex;flex-direction:column;gap:12px;'},
        macroRow('Proteiini', totals.p, 140),
        macroRow('Hiilarit', totals.c, 170),
        macroRow('Rasva', totals.f, 70),
      )
    );

    const tabs = el('div', {style:'display:flex;flex-wrap:wrap;gap:8px;margin-top:8px;'},
      ...MEALS.map(m=>btn(m.label, {kind:(selectedMeal===m.id?'primary':'ghost'), onClick: ()=>{selectedMeal=m.id; selectedCategory=m.label; render();}})),
      btn('Juomat', {kind:(selectedCategory==='Juomat'?'primary':'ghost'), onClick: ()=>{selectedCategory='Juomat'; render();}}),
      btn('Jälkiruoat', {kind:(selectedCategory==='Jälkiruoat'?'primary':'ghost'), onClick: ()=>{selectedCategory='Jälkiruoat'; render();}}),
    );

    const list = el('div', {style:'margin-top:10px;display:flex;flex-direction:column;gap:10px;'});
    const products = state.products.filter(p=>p && !p.deleted && (p.category||'')===selectedCategory)
      .sort((a,b)=> (b.fav===true)-(a.fav===true) || (b.usedOnce===true)-(a.usedOnce===true) || (b.createdAt||0)-(a.createdAt||0));

    if (!products.length) list.append(el('div', {style:'opacity:.75;'}, 'Valitse tuote listalta.'));
    else products.forEach(p=>list.append(productRow(p, day)));

    const addFoodCard = el('div', {style:'margin:14px;border-radius:18px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);padding:14px;'},
      el('div', {style:'font-size:22px;font-weight:900;'}, 'Lisää ruokaa'),
      tabs,
      list,
      el('div', {style:'margin-top:10px;'}, btn('+ Lisää tuote', {kind:'ghost', onClick: openAddProductModal}))
    );

    document.body.append(header, topCard, addFoodCard);
  }

  function productRow(p, day) {
    const heart = btn(p.fav ? '❤️' : '🤍', {kind:'ghost', onClick: (e)=>{ e.stopPropagation?.(); p.fav=!p.fav; saveState(state); render(); }});
    heart.style.padding='8px 10px';
    const row = el('div', {style:'display:grid;grid-template-columns:auto 1fr auto;gap:10px;align-items:center;padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);cursor:pointer;', onclick: ()=>openProductCard(p, day)},
      heart,
      el('div', {},
        el('div', {style:'font-weight:900;'}, (p.usedOnce?'' :'⭐ ')+ (p.name||'Tuote')),
        el('div', {style:'opacity:.65;font-size:12px;margin-top:2px;'}, p.category||'')
      ),
      el('div', {style:'opacity:.8;font-weight:800;'}, `${p.kcal100||0} /100g`)
    );
    return row;
  }

  function openProductCard(p, day) {
    const agg = aggregateByProduct(day.entries).find(x=>x.productId===p.id);
    let grams = agg ? Math.round(agg.grams||0) : (p.gramsPerUnit?Math.round(p.gramsPerUnit):100);

    const gramsLabel = el('div', {style:'font-weight:900;font-size:20px;'}, `${grams} g`);
    const refresh = ()=>{ gramsLabel.textContent = `${grams} g`; };

    const body = el('div', {style:'display:flex;flex-direction:column;gap:12px;'},
      el('div', {style:'display:flex;justify-content:space-between;align-items:center;gap:10px;'},
        el('div', {style:'font-weight:900;font-size:18px;'}, p.name),
        btn('🗑', {kind:'danger', onClick: ()=>{
          const c = modal('Poista tuote?', el('div', {}, `Haluatko varmasti poistaa tuotteen "${p.name}"?`),
            vxButtons({onYes: ()=>{p.deleted=true; saveState(state); c.remove(); m.remove(); render();}, onNo: ()=>c.remove()})
          );
        }})
      ),
      el('div', {style:'opacity:.8;'}, `Kategoria: ${p.category||''}`),
      el('div', {style:'display:flex;gap:10px;align-items:center;'},
        btn('−', {kind:'ghost', onClick: ()=>{ grams=Math.max(0, grams-10); refresh(); }}),
        gramsLabel,
        btn('+', {kind:'ghost', onClick: ()=>{ grams=grams+10; refresh(); }}),
        btn('🗑', {kind:'danger', title:'Poista syödyistä', onClick: ()=>{
          const c = modal('Poista syödyistä?', el('div', {}, `Poistetaanko "${p.name}" tältä päivältä?`),
            vxButtons({onYes: ()=>{ setProductTotalForDay(getDay(state, selectedDay), p.id, selectedMeal, 0, {kcal:0,p:0,c:0,f:0,amount:0,unit:'g'}); saveState(state); c.remove(); m.remove(); render(); }, onNo: ()=>c.remove()})
          );
        }})
      ),
      el('div', {style:'opacity:.75;font-size:12px;'}, 'V = lisää/päivitä päivän kokonaismäärä • X = sulje')
    );

    const m = modal('Tuote', body, vxButtons({
      onYes: ()=>{ const computed = computeFromProduct(p, grams); setProductTotalForDay(getDay(state, selectedDay), p.id, selectedMeal, grams, computed); p.usedOnce=true; saveState(state); m.remove(); render(); },
      onNo: ()=>m.remove()
    }));
  }

  function openAddProductModal() {
    let name = '';
    let category = selectedCategory || 'Aamiainen';

    const nameInput = el('input', {placeholder:'Nimi', style:'width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:16px;', oninput:(e)=>{name=e.target.value;}});
    const catSel = el('select', {style:'width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:16px;', onchange:(e)=>{category=e.target.value;}},
      ...CATEGORIES.map(x=>el('option', {value:x, selected:x===category}, x))
    );

    const kcal = numField('Kalorit / 100g', 0);
    const p = numField('Proteiini / 100g', 0);
    const c = numField('Hiilarit / 100g', 0);
    const f = numField('Rasva / 100g', 0);

    const body = el('div', {style:'display:flex;flex-direction:column;gap:10px;'},
      el('div', {style:'opacity:.75;font-size:12px;'}, 'Lisää oma tuote. (OFF-haku liitetään takaisin kun perusrunko toimii.)'),
      nameInput, catSel,
      kcal.node, p.node, c.node, f.node
    );

    const m = modal('Lisää tuote', body, vxButtons({
      onYes: ()=>{ 
        const id = 'p_' + Math.random().toString(36).slice(2,10);
        state.products.push({
          id,
          name: (nameInput.value||'').trim() || 'Uusi tuote',
          category,
          unit:'g',
          gramsPerUnit:100,
          kcal100: Number(kcal.get())||0,
          p: Number(p.get())||0,
          c: Number(c.get())||0,
          f: Number(f.get())||0,
          ean:'',
          fav:false,
          deleted:false,
          createdAt:Date.now(),
          usedOnce:false
        });
        saveState(state);
        m.remove();
        render();
      },
      onNo: ()=>m.remove()
    }));
  }

  function numField(label, initial) {
    let val = Number(initial)||0;
    const inp = el('input', {type:'number', inputmode:'decimal', step:'0.1', value:String(val), style:'width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:16px;', oninput:(e)=>{val=Number(e.target.value)||0;}});
    const wrap = el('div', {},
      el('div', {style:'opacity:.7;font-size:12px;font-weight:800;margin-bottom:6px;'}, label),
      inp
    );
    return { node: wrap, get: ()=>val, set:(v)=>{val=Number(v)||0; inp.value=String(val);} };
  }

  function openTargetModal() {
    const day = getDay(state, selectedDay);
    const t = day.target;

    const base = numField('Perustavoite (kcal)', t.baseKcal||0);
    const wk = numField('Treenitavoite (kcal)', t.workoutKcal||0);
    const steps = numField('Askeltavoite (askelta)', t.stepsGoal||0);
    const sleep = numField('Uni (h)', t.sleepHours||0);

    const computed = el('div', {style:'margin-top:8px;opacity:.9;font-weight:900;'}, '');

    const refresh = ()=>{ 
      t.baseKcal = base.get(); t.workoutKcal = wk.get(); t.stepsGoal = steps.get(); t.sleepHours = sleep.get();
      computed.textContent = `Päivän tavoite yhteensä: ${calcDailyTargetKcal(day)} kcal`;
    };
    [base, wk, steps, sleep].forEach(f=>f.node.querySelector('input').addEventListener('input', refresh));
    refresh();

    const body = el('div', {style:'display:flex;flex-direction:column;gap:10px;'}, base.node, wk.node, steps.node, sleep.node, computed);
    const m = modal('Päivän tavoite', body, vxButtons({
      onYes: ()=>{ refresh(); saveState(state); m.remove(); render(); },
      onNo: ()=>m.remove()
    }));
  }

  function openCalendar() {
    const input = el('input', {type:'date', value:selectedDay, style:'width:100%;padding:12px;border-radius:12px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#fff;font-size:16px;'});
    const body = el('div', {style:'display:flex;flex-direction:column;gap:10px;'},
      input,
      btn('Tänään', {kind:'ghost', onClick: ()=>{ selectedDay = todayISO(); saveState(state); m.remove(); render(); }})
    );
    const m = modal('Valitse päivä', body, vxButtons({
      onYes: ()=>{ selectedDay = input.value || todayISO(); saveState(state); m.remove(); render(); },
      onNo: ()=>m.remove()
    }));
  }

  function openDayEatings() {
    const day = getDay(state, selectedDay);
    const aggs = aggregateByProduct(day.entries);
    const list = el('div', {style:'display:flex;flex-direction:column;gap:10px;max-height:60vh;overflow:auto;'});
    if (!aggs.length) list.append(el('div', {style:'opacity:.75;'}, 'Ei kirjauksia tälle päivälle.'));
    else for (const a of aggs) {
      const p = state.products.find(x=>x.id===a.productId) || {name:'(poistettu tuote)'};
      list.append(el('div', {style:'padding:12px;border-radius:14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.10);cursor:pointer;', onclick: ()=>{ m.remove(); openProductCard(p, day); }},
        el('div', {style:'font-weight:900;'}, p.name),
        el('div', {style:'opacity:.75;margin-top:4px;'}, `Yhteensä ${Math.round(a.grams)} g • ${Math.round(a.kcal)} kcal • P ${Math.round(a.p)} / H ${Math.round(a.c)} / R ${Math.round(a.f)}`)
      ));
    }
    const m = modal('Päivän syömiset', list, vxButtons({onYes: ()=>m.remove(), onNo: ()=>m.remove(), yesText:'OK', noText:'X'}));
  }

  // ---------- Boot ----------
  try {
    selectedDay = todayISO(); // default to today on launch
    if (!state.products.some(p=>p && p.id)) {
      state.products.push(
        {id:'p_kahvi', name:'Kahvi', category:'Juomat', unit:'g', gramsPerUnit:200, kcal100:1, p:0, c:0, f:0, ean:'', fav:false, deleted:false, createdAt:Date.now()-3, usedOnce:false},
        {id:'p_kanfile', name:'Kanafile', category:'Päivällinen', unit:'g', gramsPerUnit:150, kcal100:110, p:23, c:0, f:2, ean:'', fav:false, deleted:false, createdAt:Date.now()-2, usedOnce:false},
        {id:'p_rahka', name:'Rahka', category:'Välipala', unit:'g', gramsPerUnit:250, kcal100:65, p:11, c:3, f:0, ean:'', fav:false, deleted:false, createdAt:Date.now()-1, usedOnce:false},
      );
      saveState(state);
    }
    render();
  } catch (e) {
    console.error('Boot failed', e);
    document.body.innerHTML = '<div style="padding:16px;color:#fff;font-family:system-ui">Ruokasi ei käynnistynyt: '+String(e && e.message || e)+'</div>';
  }
})();
