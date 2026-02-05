// Ruokasi v3.1 (FIX) – units + grams, keeps existing data
const STORAGE_KEY = "ruokasi.v2";
const VERSION = "v3.2.4.6";
const todayKey = () => new Date().toISOString().slice(0,10);
const round1 = (x) => Math.round(x*10)/10;
const clamp = (x,a,b) => Math.max(a, Math.min(b, x));
const $ = (id) => document.getElementById(id);

const defaultState = () => ({
  day: todayKey(),
  goals: { minKcal: 1900, maxKcal: 2000, p: 140, c: 170, f: 70 },
  activity: { steps: 0, workoutKcal: 0, sleepH: 0 },
  log: [],
  customFoods: [],
  mealPlan: { aamiainen:true, lounas:true, "välipala":true, "päivällinen":true, iltapala:true }
});

function loadState(){
  try{
    const raw = localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s = JSON.parse(raw);
    if(!s.day || s.day !== todayKey()){
      const ns = defaultState();
      if(s.goals) ns.goals = {...ns.goals, ...s.goals};
      if(s.customFoods) ns.customFoods = s.customFoods;
      return ns;
    }
    return { ...defaultState(), ...s };
  }catch(e){ return defaultState(); }
}
function saveState(){ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }

let state = loadState();
let currentMeal = "aamiainen";
let selected = new Map();

function foodU(name, kcal, p, c, f, unit, gramsPerUnit, maxUnits=6, stepUnits=0.5){
  return { name, per100:{kcal,p,c,f}, unit, gramsPerUnit, maxUnits, stepUnits };
}
const presets = {
  aamiainen: [
    foodU("Puuro (kaurahiutaleet)", 380, 13, 60, 7, "dl hiutaleita", 40, 6, 0.25),
    foodU("Maustamaton rahka", 67, 12, 3.5, 0.2, "purkki", 200, 2, 0.25),
    foodU("Marjat", 50, 1, 12, 0.2, "dl", 60, 6, 0.5),
    foodU("Kananmuna", 155, 13, 1.1, 11, "kpl", 55, 6, 0.5),
    foodU("Ruisleipä", 220, 6, 40, 3, "viipale", 35, 6, 0.5),
    foodU("Paahtoleipä", 265, 8, 49, 3.5, "viipale", 30, 6, 0.5),
    foodU("Juusto 15%", 280, 27, 0, 15, "viipale", 10, 8, 0.5),
    foodU("Kinkku / leikkele", 110, 20, 2, 2, "siivu", 8, 8, 0.5),
    foodU("Maapähkinävoi", 600, 25, 20, 50, "rkl", 15, 6, 0.5),
    foodU("Voi", 717, 1, 0, 81, "rkl", 14, 4, 0.5),
    foodU("Mehu", 45, 0.5, 10, 0, "dl", 100, 6, 0.5),
    foodU("Kahvimaito", 50, 3, 4, 2, "rkl", 15, 6, 0.5)
  ],
  lounas: [
    foodU("Kanafile", 110, 23, 0, 2, "file", 120, 4, 0.25),
    foodU("Riisi (keitetty)", 130, 2.4, 28, 0.3, "dl", 70, 6, 0.5),
    foodU("Peruna", 77, 2, 17, 0.1, "kpl", 80, 6, 0.5),
    foodU("Kasvikset", 30, 2, 5, 0.2, "annos", 250, 3, 0.25),
    foodU("Öljy", 884, 0, 0, 100, "tl", 5, 10, 0.5),
    foodU("Ruisleipä", 220, 6, 40, 3, "viipale", 35, 6, 0.5)
  ],
  "välipala": [
    foodU("Rahka", 67, 12, 3.5, 0.2, "purkki", 200, 2, 0.25),
    foodU("Marjat", 50, 1, 12, 0.2, "dl", 60, 6, 0.5),
    foodU("Banaani", 89, 1.1, 23, 0.3, "kpl", 120, 3, 0.5),
    foodU("Pähkinät", 620, 18, 14, 55, "kourallinen", 30, 6, 0.5),
    foodU("Proteiinijuoma", 60, 10, 4, 1, "pullo", 250, 2, 0.25)
  ],
  "päivällinen": [
    foodU("Kanafile", 110, 23, 0, 2, "file", 120, 4, 0.25),
    foodU("Lohi", 200, 20, 0, 13, "file", 150, 3, 0.25),
    foodU("Jauheliha 10%", 176, 20, 0, 10, "annos", 150, 4, 0.25),
    foodU("Kasvikset", 30, 2, 5, 0.2, "annos", 250, 3, 0.25),
    foodU("Riisi (keitetty)", 130, 2.4, 28, 0.3, "dl", 70, 6, 0.5),
    foodU("Peruna", 77, 2, 17, 0.1, "kpl", 80, 6, 0.5),
    foodU("Öljy", 884, 0, 0, 100, "tl", 5, 10, 0.5),
    foodU("Ruisleipä", 220, 6, 40, 3, "viipale", 35, 6, 0.5),
    foodU("Kukkakaali", 25, 2, 3, 0.2, "kukkosiivu", 25, 10, 1)
  ],
  iltapala: [
    foodU("Ruisleipä", 220, 6, 40, 3, "viipale", 35, 6, 0.5),
    foodU("Paahtoleipä", 265, 8, 49, 3.5, "viipale", 30, 6, 0.5),
    foodU("Juusto 15%", 280, 27, 0, 15, "viipale", 10, 8, 0.5),
    foodU("Rahka", 67, 12, 3.5, 0.2, "purkki", 200, 2, 0.25),
    foodU("Marjat", 50, 1, 12, 0.2, "dl", 60, 6, 0.5),
    foodU("Kananmuna", 155, 13, 1.1, 11, "kpl", 55, 6, 0.5)
  ]
};

function calcTotals(per100, grams){
  const factor = grams/100;
  return { kcal: round1(per100.kcal*factor), p: round1(per100.p*factor), c: round1(per100.c*factor), f: round1(per100.f*factor) };
}

async function offFetchJSON(url){
  const res = await fetch(url, { headers: { "Accept":"application/json" } });
  if(!res.ok) throw new Error("HTTP "+res.status);
  return await res.json();
}

function offToPer100(nutr){
  // Return {kcal,p,c,f} or null if insufficient
  const p = Number(nutr.proteins_100g ?? nutr.proteins) || 0;
  const c = Number(nutr.carbohydrates_100g ?? nutr.carbohydrates) || 0;
  const f = Number(nutr.fat_100g ?? nutr.fat) || 0;

  // Prefer kcal if present
  let kcal = Number(nutr["energy-kcal_100g"] ?? nutr["energy-kcal"]) || 0;
  if(!kcal){
    const kj = Number(nutr.energy_100g ?? nutr.energy) || 0; // often kJ
    if(kj) kcal = Math.round(kj / 4.184);
  }
  if(!kcal && (p||c||f)){
    // estimate if only macros
    kcal = Math.round(p*4 + c*4 + f*9);
  }
  if(!kcal && !(p||c||f)) return null;
  return {kcal, p, c, f};
}

async function offSearch(query){
  const q = (query||"").trim();
  if(!q) return [];
  const isBarcode = /^[0-9]{8,14}$/.test(q);
  if(isBarcode){
    const url = `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(q)}.json`;
    const js = await offFetchJSON(url);
    if(js && js.status === 1 && js.product){
      const prod = js.product;
      const per100 = prod.nutriments ? offToPer100(prod.nutriments) : null;
      return [{
        name: prod.product_name || prod.generic_name || q,
        brands: prod.brands || "",
        code: prod.code || q,
        per100,
        image: prod.image_small_url || ""
      }];
    }
    return [];
  }else{
    const url = "https://world.openfoodfacts.org/cgi/search.pl?search_simple=1&action=process&json=1&page_size=10&search_terms=" + encodeURIComponent(q);
    const js = await offFetchJSON(url);
    const prods = (js && js.products) ? js.products : [];
    return prods.slice(0,10).map(p=>({
      name: p.product_name || p.generic_name || "(nimetön tuote)",
      brands: p.brands || "",
      code: p.code || "",
      per100: p.nutriments ? offToPer100(p.nutriments) : null,
      image: p.image_small_url || ""
    }));
  }
}

function renderOffResults(items){
  const box = document.getElementById("offResults");
  const status = document.getElementById("offStatus");
  if(!box) return;
  box.innerHTML = "";
  if(!items || items.length===0){
    if(status) status.textContent = "Ei tuloksia";
    box.innerHTML = `<div class="muted">Ei tuloksia. Kokeile eri hakusanaa tai viivakoodia.</div>`;
    return;
  }
  if(status) status.textContent = `${items.length} tulosta`;
  items.forEach(it=>{
    const row = document.createElement("div");
    row.className = "item offItem";
    const per = it.per100;
    const meta = per ? `${Math.round(per.kcal)} kcal / 100g • P ${Math.round(per.p)} • H ${Math.round(per.c)} • R ${Math.round(per.f)}` : "Ravintotiedot puuttuvat osin";
    row.innerHTML = `
      <div class="offItem__main">
        <div class="offItem__title">${it.name}</div>
        <div class="offItem__meta">${(it.brands||"").trim()}${it.code? " • "+it.code:""}<br>${meta}</div>
      </div>
      <button class="ghost" type="button">Käytä</button>
    `;
    row.querySelector("button").addEventListener("click", ()=>{
      // Fill custom food fields
      document.getElementById("cfName").value = it.name;
      if(it.per100){
        document.getElementById("cfKcal").value = Math.round(it.per100.kcal);
        document.getElementById("cfP").value = Math.round(it.per100.p*10)/10;
        document.getElementById("cfC").value = Math.round(it.per100.c*10)/10;
        document.getElementById("cfF").value = Math.round(it.per100.f*10)/10;
      }
      const st = document.getElementById("offStatus");
      if(st) st.textContent = "Valittu";
    });
    box.appendChild(row);
  });
}

async function runOffSearchGlobal(){
  const q = (document.getElementById("offQuery")?.value||"").trim();
  const st = document.getElementById("offStatus");
  if(st) st.textContent = "Haetaan…";
  try{
    const items = await offSearch(q);
    renderOffResults(items);
  }catch(e){
    if(st) st.textContent = "Virhe";
    const box = document.getElementById("offResults");
    if(box) box.innerHTML = `<div class="muted">Haku epäonnistui. Kokeile hetken päästä.</div>`;
  }
}
window.RUOKASI_OFF_SEARCH = runOffSearchGlobal;


function totalsFromLog(){
  return state.log.reduce((acc,it)=>({kcal:acc.kcal+it.totals.kcal,p:acc.p+it.totals.p,c:acc.c+it.totals.c,f:acc.f+it.totals.f}),{kcal:0,p:0,c:0,f:0});
}
function burnEstimate(){ return Math.round((state.activity.steps||0)*0.04 + (state.activity.workoutKcal||0)); }
function remainingKcal(){ return Math.max(0, Math.round(state.goals.maxKcal - totalsFromLog().kcal)); }
const fmtTime = (iso)=> new Date(iso).toLocaleTimeString("fi-FI",{hour:"2-digit",minute:"2-digit"});

function setMeal(meal){
  currentMeal = meal;
  document.querySelectorAll(".seg__btn").forEach(b=>b.classList.toggle("is-on", b.dataset.meal===meal));
  selected.clear();
  renderPresets();
}
function renderPresets(){
  const list = $("presetList");
  list.innerHTML = "";
  const custom = state.customFoods.map(cf => ({
    name: cf.name, per100: cf.per100,
    unit: cf.unit||"yks", gramsPerUnit: cf.gramsPerUnit||100,
    maxUnits: cf.maxUnits||6, stepUnits: cf.stepUnits||0.5,
    isCustom:true, id: cf.id
  }));
  const all = [...(presets[currentMeal]||[]), ...custom];

  all.forEach((f, idx)=>{
    const key = f.isCustom ? `c:${f.id}` : `p:${currentMeal}:${idx}`;
    const row = document.createElement("div");
    row.className="item";

    const top = document.createElement("div");
    top.className="item__top";
    top.innerHTML = `<div>
        <div class="item__name">${f.name}</div>
        <div class="small">per 100g: ${f.per100.kcal} kcal • P ${f.per100.p} • H ${f.per100.c} • R ${f.per100.f}</div>
      </div>
      <div class="badges"><span class="badge">yksiköt</span><span class="badge">grammat</span></div>`;

    const controls = document.createElement("div");
    controls.className="controls";

    const unit = f.unit || "g";
    const gpu = Number(f.gramsPerUnit || 1);
    const maxU = Number(f.maxUnits || 6);
    const stepU = Number(f.stepUnits || 0.5);

    let units = 0;

    controls.innerHTML = `
      <div class="stepper">
        <button class="stepper__btn" type="button" data-act="dec" aria-label="miinus">−</button>
        <div class="minirow stepper__mid">
          <div class="qty"><span class="u">0</span> ${unit}</div>
          <div class="totalsline"><span class="g">0</span> g</div>
        </div>
        <button class="stepper__btn" type="button" data-act="inc" aria-label="plus">+</button>
      </div>
      <div class="totalsline"><span class="k">0</span> kcal • P <span class="p">0</span> • H <span class="c">0</span> • R <span class="f">0</span></div>
    `;

    const uEl = controls.querySelector(".u");
    const gEl = controls.querySelector(".g");
    const kEl = controls.querySelector(".k");
    const pEl = controls.querySelector(".p");
    const cEl = controls.querySelector(".c");
    const fEl = controls.querySelector(".f");

    function setUnits(newUnits){
      units = Math.max(0, Math.min(maxU, Math.round(newUnits/stepU)*stepU));
      const grams = Math.round(units * gpu);
      uEl.textContent = units;
      gEl.textContent = grams;
      const t = calcTotals(f.per100, grams);
      kEl.textContent = t.kcal; pEl.textContent=t.p; cEl.textContent=t.c; fEl.textContent=t.f;
      if(grams>0) selected.set(key,{food:f, grams, totals:t});
      else selected.delete(key);
    }
    controls.querySelector('[data-act="dec"]').addEventListener("click", ()=> setUnits(units - stepU));
    controls.querySelector('[data-act="inc"]').addEventListener("click", ()=> setUnits(units + stepU));

    row.appendChild(top);
    row.appendChild(controls);
    list.appendChild(row);
  });

  $("mealHint").textContent = `Ateria: ${currentMeal}. Säädä annos: yksiköt + grammat, lisää valitut.`;
}

function renderCustomList(){
  const list = $("customList");
  list.innerHTML = "";
  if(state.customFoods.length===0){ list.innerHTML = `<div class="muted">Ei omia ruokia vielä.</div>`; return; }
  state.customFoods.forEach(cf=>{
    const el=document.createElement("div");
    el.className="logrow";
    el.innerHTML = `<div class="logrow__left">
        <div class="logrow__meal">${cf.name}</div>
        <div class="logrow__meta">per 100g: ${cf.per100.kcal} kcal • P ${cf.per100.p} • H ${cf.per100.c} • R ${cf.per100.f}</div>
        <div class="logrow__meta">yksikkö: ${cf.unit||"yks"} • ${cf.gramsPerUnit||100} g / yks</div>
      </div>
      <div class="logrow__right"><button class="link danger" data-del="${cf.id}">Poista</button></div>`;
    el.querySelector("[data-del]").addEventListener("click", ()=>{
      state.customFoods = state.customFoods.filter(x=>x.id!==cf.id);
      saveState(); renderAll();
    });
    list.appendChild(el);
  });
}

function renderLog(){
  const list=$("logList");
  list.innerHTML="";
  if(state.log.length===0){ list.innerHTML=`<div class="muted">Ei kirjauksia vielä.</div>`; return; }
  [...state.log].reverse().forEach(it=>{
    const el=document.createElement("div");
    el.className="logrow";
    el.innerHTML = `<div class="logrow__left">
        <div class="logrow__meal">${it.meal.toUpperCase()} • ${it.name}</div>
        <div class="logrow__meta">${it.grams} g • ${fmtTime(it.ts)}</div>
        <div class="logrow__meta">P ${it.totals.p} • H ${it.totals.c} • R ${it.totals.f}</div>
      </div>
      <div class="logrow__right">
        <div><strong>${it.totals.kcal}</strong> kcal</div>
        <button class="link danger" data-del="${it.id}">Poista</button>
      </div>`;
    el.querySelector("[data-del]").addEventListener("click", ()=>{
      state.log = state.log.filter(x=>x.id!==it.id);
      saveState(); renderAll();
    });
    list.appendChild(el);
  });
}

function updateTop(){
  const t=totalsFromLog();
  $("todayLabel").textContent = state.day;
  $("kcalEaten").textContent = Math.round(t.kcal);
  $("kcalLeft").textContent = remainingKcal();
  $("kcalBurn").textContent = burnEstimate();

  $("pNow").textContent = Math.round(t.p);
  $("cNow").textContent = Math.round(t.c);
  $("fNow").textContent = Math.round(t.f);
  $("pGoal").textContent = state.goals.p;
  $("cGoal").textContent = state.goals.c;
  $("fGoal").textContent = state.goals.f;

  $("pBar").style.width = `${clamp((t.p/state.goals.p)*100,0,100)}%`;
  $("cBar").style.width = `${clamp((t.c/state.goals.c)*100,0,100)}%`;
  $("fBar").style.width = `${clamp((t.f/state.goals.f)*100,0,100)}%`;
}
function quickSuggestion(){
  ensureMealPlan();
  const eaten = totalsFromLog();
  const leftKcal = remainingKcal();

  let gaps = {
    kcal: leftKcal,
    p: state.goals.p - eaten.p,
    c: state.goals.c - eaten.c,
    f: state.goals.f - eaten.f
  };

  const enabled = MEAL_ORDER.filter(m => state.mealPlan[m]);
  if(enabled.length === 0) return "Kaikki ateriat on poistettu tältä päivältä (täpät).";

  let out = [];
  out.push(`Syöty: ${Math.round(eaten.kcal)} kcal • P ${Math.round(eaten.p)} • H ${Math.round(eaten.c)} • R ${Math.round(eaten.f)}`);
  out.push(`Tavoite: ${state.goals.minKcal}–${state.goals.maxKcal} kcal • P ${state.goals.p} • H ${state.goals.c} • R ${state.goals.f}`);
  out.push(`Jäljellä (max): ${leftKcal} kcal`);
  out.push("");

  const toShow = enabled.slice(0,3);

  toShow.forEach(meal=>{
    const best = computeBestForMeal(meal, gaps);
    if(!best){
      out.push(`${meal.toUpperCase()}: ei ehdotusta (puuttuu ruokia).`);
      out.push("");
      return;
    }
    out.push(`${meal.toUpperCase()}: ${best.title}`);
    out.push(buildOptionLines(best.items));
    out.push(`Yhteensä: ${Math.round(best.totals.kcal)} kcal • P ${Math.round(best.totals.p)} • H ${Math.round(best.totals.c)} • R ${Math.round(best.totals.f)}`);
    out.push("");
    gaps = applyOptionToGaps(gaps, best.totals);
  });

  if(enabled.length > 3){
    out.push("Seuraavat ateriat mukana: " + enabled.slice(3).join(", "));
    out.push("Poista ateria täpällä, jos haluat lyhyemmän päivän.");
  }

  if(gaps.f < -5){
    out.push("");
    out.push("Huom: rasvaa on jo reilusti – suositukset painottuvat vähärasvaisempiin vaihtoehtoihin.");
  }
  if(gaps.p > 15){
    out.push("");
    out.push("Huom: proteiinia puuttuu – priorisoi kana/rahka/proteiinijuoma.");
  }

  return out.join("\n");
}
function addSelected(){
  if(selected.size===0) return;
  const now = new Date().toISOString();
  selected.forEach(v=>{
    const id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
    state.log.push({id, meal: currentMeal, name: v.food.name, grams: v.grams, totals: v.totals, ts: now});
  });
  selected.clear();
  saveState();

  const offBtn = document.getElementById("btnOffSearch");
  async function runOffSearch(){
    const q = (document.getElementById("offQuery")?.value||"").trim();
    const st = document.getElementById("offStatus");
    if(st) st.textContent = "Haetaan…";
    try{
      const items = await offSearch(q);
      renderOffResults(items);
    }catch(e){
      if(st) st.textContent = "Virhe";
      const box = document.getElementById("offResults");
      if(box) box.innerHTML = `<div class="muted">Haku epäonnistui. Kokeile hetken päästä.</div>`;
    }
  }
  if(offBtn){
    // iOS/PWA sometimes misses click inside <dialog>, so bind multiple events
    offBtn.addEventListener("click", (e)=>{ e.preventDefault(); runOffSearch(); });
    offBtn.addEventListener("touchend", (e)=>{ e.preventDefault(); runOffSearch(); }, {passive:false});
    offBtn.addEventListener("pointerup", (e)=>{ e.preventDefault(); runOffSearch(); });
  }
renderAll();

}
function clearSelected(){ selected.clear(); renderPresets(); }

function wireSettings(){
  $("goalMax").value = state.goals.maxKcal;
  $("goalMin").value = state.goals.minKcal;
  $("goalP").value = state.goals.p;
  $("goalC").value = state.goals.c;
  $("goalF").value = state.goals.f;
  $("steps").value = state.activity.steps||0;
  $("workoutKcal").value = state.activity.workoutKcal||0;
  $("sleepH").value = state.activity.sleepH||0;

  const onChange = ()=>{
    state.goals.maxKcal = Number($("goalMax").value||2000);
    state.goals.minKcal = Number($("goalMin").value||1900);
    state.goals.p = Number($("goalP").value||140);
    state.goals.c = Number($("goalC").value||170);
    state.goals.f = Number($("goalF").value||70);
    state.activity.steps = Number($("steps").value||0);
    state.activity.workoutKcal = Number($("workoutKcal").value||0);
    state.activity.sleepH = Number($("sleepH").value||0);
    saveState(); renderAll();
  };
  ["goalMax","goalMin","goalP","goalC","goalF","steps","workoutKcal","sleepH"].forEach(id=>$(id).addEventListener("input", onChange));
}

function openCustomDialog(){
  const ov = $("customModal");
  if(!ov) return;
  // reset OFF UI (keep typed fields)
  const st = document.getElementById("offStatus"); if(st) st.textContent = "–";
  const box = document.getElementById("offResults"); if(box) box.innerHTML = "";
  ov.classList.remove("is-hidden");
}

window.RUOKASI_OPEN_CUSTOM = openCustomDialog;
function closeCustomDialog(){
  const ov = $("customModal");
  if(!ov) return;
  ov.classList.add("is-hidden");
}
function exportData(){
  const payload = {exportedAt:new Date().toISOString(), day: state.day, goals: state.goals, activity: state.activity, totals: totalsFromLog(), log: state.log, customFoods: state.customFoods};
  const blob = new Blob([JSON.stringify(payload,null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a=document.createElement("a"); a.href=url; a.download=`ruokasi-${state.day}.json`; a.click();
  URL.revokeObjectURL(url);
}
function resetDay(){
  if(!confirm("Nollataanko päivän kirjaukset? (Omat ruoat ja tavoitteet säilyvät)")) return;
  const keepGoals=state.goals, keepCustom=state.customFoods;
  state = defaultState(); state.goals=keepGoals; state.customFoods=keepCustom;
  saveState(); renderAll();
}

const MEAL_ORDER = ["aamiainen","lounas","välipala","päivällinen","iltapala"];

function ensureMealPlan(){
  if(!state.mealPlan) state.mealPlan = { aamiainen:true, lounas:true, "välipala":true, "päivällinen":true, iltapala:true };
}
function renderMealPlan(){
  ensureMealPlan();
  const box = document.getElementById("mealPlan");
  if(!box) return;
  box.innerHTML = "";
  MEAL_ORDER.forEach(m=>{
    const chip = document.createElement("label");
    chip.className = "chip";
    chip.innerHTML = `<input type="checkbox" ${state.mealPlan[m] ? "checked":""} /> <span>${m.charAt(0).toUpperCase()+m.slice(1)}</span>`;
    chip.querySelector("input").addEventListener("change", (e)=>{
      state.mealPlan[m] = e.target.checked;
      saveState();
      document.getElementById("suggestBox").textContent = quickSuggestion();
    });
    box.appendChild(chip);
  });
}

function foodByName(name){
  for(const meal of Object.keys(presets)){
    const f = (presets[meal]||[]).find(x=>x.name===name);
    if(f) return f;
  }
  const cf = (state.customFoods||[]).find(x=>x.name===name);
  if(cf) return { name: cf.name, per100: cf.per100, unit: cf.unit||"yks", gramsPerUnit: cf.gramsPerUnit||100, maxUnits: cf.maxUnits||8, stepUnits: cf.stepUnits||0.5 };
  return null;
}
function scoreMealOption(gaps, totals){
  const takeP = Math.min(Math.max(0,gaps.p), totals.p);
  const takeC = Math.min(Math.max(0,gaps.c), totals.c);
  const fatPenalty = (gaps.f < 0) ? totals.f * 2 : Math.max(0, totals.f - Math.max(0,gaps.f)) * 1.5;
  const kcalPenalty = Math.max(0, totals.kcal - Math.max(0,gaps.kcal)) * 0.5;
  return (takeP*2 + takeC) - fatPenalty - kcalPenalty;
}
function buildOptionLines(items){
  return items.map(it=>`- ${it.name} ${it.units} ${it.unit} (${it.grams} g)`).join("\n");
}
function computeBestForMeal(meal, gaps){
  const options = {
    lounas: [
      {name:"Kana + kasvikset", items:[{n:"Kanafile", u:1.5},{n:"Kasvikset", u:1.0}]},
      {name:"Kana + riisi + kasvikset", items:[{n:"Kanafile", u:1.2},{n:"Riisi (keitetty)", u:2.0},{n:"Kasvikset", u:1.0}]},
      {name:"Ruisleipä + juusto + kinkku", items:[{n:"Ruisleipä", u:2.0},{n:"Juusto 15%", u:2.0},{n:"Kinkku / leikkele", u:3.0}]}
    ],
    "välipala": [
      {name:"Rahka + marjat", items:[{n:"Rahka", u:1.0},{n:"Marjat", u:2.0}]},
      {name:"Rahka + banaani", items:[{n:"Rahka", u:1.0},{n:"Banaani", u:1.0}]},
      {name:"Proteiinijuoma", items:[{n:"Proteiinijuoma", u:1.0}]}
    ],
    "päivällinen": [
      {name:"Kana + kasvikset", items:[{n:"Kanafile", u:1.5},{n:"Kasvikset", u:1.2}]},
      {name:"Lohi + peruna + kasvikset", items:[{n:"Lohi", u:1.0},{n:"Peruna", u:3.0},{n:"Kasvikset", u:1.0}]},
      {name:"Jauheliha + kasvikset", items:[{n:"Jauheliha 10%", u:1.0},{n:"Kasvikset", u:1.2}]}
    ],
    iltapala: [
      {name:"Ruisleipä + juusto", items:[{n:"Ruisleipä", u:2.0},{n:"Juusto 15%", u:2.0}]},
      {name:"Rahka + marjat", items:[{n:"Rahka", u:1.0},{n:"Marjat", u:1.5}]},
      {name:"Kananmuna + ruisleipä", items:[{n:"Kananmuna", u:2.0},{n:"Ruisleipä", u:1.5}]}
    ],
    aamiainen: [
      {name:"Puuro + maapähkinävoi", items:[{n:"Puuro (kaurahiutaleet)", u:1.5},{n:"Maapähkinävoi", u:1.0}]},
      {name:"Kananmunat + ruisleipä", items:[{n:"Kananmuna", u:2.0},{n:"Ruisleipä", u:2.0}]},
      {name:"Rahka + marjat", items:[{n:"Maustamaton rahka", u:1.0},{n:"Marjat", u:2.0}]}
    ]
  };
  const cand = options[meal] || [];
  let best = null;
  cand.forEach(o=>{
    let totals = {kcal:0,p:0,c:0,f:0};
    let items = [];
    for(const it of o.items){
      const f = foodByName(it.n);
      if(!f) return;
      const grams = Math.round((f.gramsPerUnit||100) * it.u);
      const t = calcTotals(f.per100, grams);
      totals = {kcal:totals.kcal+t.kcal,p:totals.p+t.p,c:totals.c+t.c,f:totals.f+t.f};
      items.push({name: it.n, units: it.u, unit: f.unit||"yks", grams});
    }
    const score = scoreMealOption(gaps, totals);
    if(!best || score > best.score) best = { meal, title:o.name, totals, items, score };
  });
  // Scale the best option to match remaining kcal per enabled meal (within bounds)
  if(best){
    const enabledMeals = MEAL_ORDER.filter(mm => state.mealPlan && state.mealPlan[mm]);
    const mealsLeft = Math.max(1, enabledMeals.length);
    const target = Math.max(150, Math.min(700, gaps.kcal / mealsLeft)); // kcal target for this meal
    if(best.totals.kcal > 0){
      let factor = target / best.totals.kcal;
      factor = Math.max(0.6, Math.min(1.8, factor)); // keep it reasonable
      let scaledItems = [];
      let totals = {kcal:0,p:0,c:0,f:0};
      for(const it of best.items){
        const f = foodByName(it.name);
        if(!f){ scaledItems.push(it); continue; }
        const step = f.stepUnits || 0.5;
        const maxU = f.maxUnits || 10;
        let newU = roundToStep(it.units * factor, step);
        newU = Math.max(0, Math.min(maxU, newU));
        const grams = Math.round((f.gramsPerUnit||100) * newU);
        const t = calcTotals(f.per100, grams);
        totals = {kcal:totals.kcal+t.kcal,p:totals.p+t.p,c:totals.c+t.c,f:totals.f+t.f};
        scaledItems.push({name: it.name, units: newU, unit: f.unit||"yks", grams});
      }
      best.items = scaledItems;
      best.totals = totals;
    }
  }
  return best;
}
function roundToStep(val, step){
  const s = Number(step||0.5);
  return Math.round(val/s)*s;
}
function applyOptionToGaps(gaps, totals){
  return { kcal:gaps.kcal - totals.kcal, p:gaps.p - totals.p, c:gaps.c - totals.c, f:gaps.f - totals.f };
}

function renderAll(){
  updateTop(); renderPresets(); renderCustomList(); renderLog();
  renderMealPlan();
  $("suggestBox").textContent = quickSuggestion();
  const u=document.getElementById("suggestUpdated"); if(u){ u.textContent = "Päivitetty " + new Date().toLocaleTimeString("fi-FI",{hour:"2-digit",minute:"2-digit"}); }
}

if("serviceWorker" in navigator){
  window.addEventListener("load", ()=> navigator.serviceWorker.register("./sw.js").catch(()=>{}));
}
window.addEventListener("load", ()=>{
  const vb=document.getElementById("versionBadge"); if(vb){ vb.textContent = VERSION; }
  const bOff=document.getElementById("btnOffSearch"); if(bOff){ bOff.addEventListener("click",(e)=>{e.preventDefault(); runOffSearchGlobal();}); }

  document.querySelectorAll(".seg__btn").forEach(btn=>btn.addEventListener("click", ()=>setMeal(btn.dataset.meal)));
  $("btnAddSelected").addEventListener("click", addSelected);
  $("btnClearSelected").addEventListener("click", clearSelected);
  $("btnSuggest").addEventListener("click", ()=> { $("suggestBox").textContent = quickSuggestion(); const u=document.getElementById("suggestUpdated"); if(u){ u.textContent = "Päivitetty " + new Date().toLocaleTimeString("fi-FI",{hour:"2-digit",minute:"2-digit"}); } });
  renderMealPlan();
  $("btnOpenCustom").addEventListener("click", openCustomDialog);
  const cClose = document.getElementById("btnCloseCustom");
  const cCancel = document.getElementById("btnCancelCustom");
  const cSave = document.getElementById("btnSaveCustom");
  if(cClose) cClose.addEventListener("click", closeCustomDialog);
  if(cCancel) cCancel.addEventListener("click", closeCustomDialog);
  const cOverlay = document.getElementById("customModal");
  if(cOverlay){ cOverlay.addEventListener("click", (e)=>{ if(e.target===cOverlay) closeCustomDialog(); }); }
  if(cSave){
    cSave.addEventListener("click", ()=>{
      const name = (document.getElementById("cfName")?.value||"").trim();
      const kcal = Number(document.getElementById("cfKcal")?.value||0);
      const p = Number(document.getElementById("cfP")?.value||0);
      const c = Number(document.getElementById("cfC")?.value||0);
      const f = Number(document.getElementById("cfF")?.value||0);
      const unit = (document.getElementById("cfUnit")?.value||"yks").trim() || "yks";
      const gpu = Number(document.getElementById("cfGPU")?.value||100) || 100;
      if(!name || !kcal){ alert("Täytä vähintään nimi ja kalorit / 100g."); return; }
      const id = crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2);
      state.customFoods.push({ id, name, per100:{kcal,p,c,f}, unit, gramsPerUnit:gpu, defaultUnits:1.0, maxUnits:8, stepUnits:0.5 });
      saveState(); closeCustomDialog(); renderAll();
    });
  }

  $("btnExport").addEventListener("click", exportData);
  $("btnReset").addEventListener("click", resetDay);
  wireSettings(); setMeal(currentMeal); renderAll();
});
