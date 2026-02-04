
/* Ruokasi v3.3.0.0 */
const VERSION = "v3.3.3.0";
let isDirty = false;
const STORAGE_KEY = "ruokasi.v2";
const LEGACY_KEY_1 = "ruokasi.saved";
const MEAL_ORDER = ["aamiainen","lounas","välipala","päivällinen","iltapala","juomat","jälkiruoka"];
const MEAL_LABEL = {
  aamiainen:"Aamiainen", lounas:"Lounas", "välipala":"Välipala", "päivällinen":"Päivällinen", iltapala:"Iltapala", juomat:"Juomat", jälkiruoka:"Jälkiruoat"
};
const MEAL_COLORS = {"aamiainen": "#2563EB", "lounas": "#16A34A", "päivällinen": "#F97316", "välipala": "#7C3AED", "iltapala": "#0D9488", "juomat":"#06B6D4", "jälkiruoka":"#EC4899", "muut": "#64748B"};

function $(id){ return document.getElementById(id); }
function todayKey(d){ d=d||new Date(); const x=new Date(d.getFullYear(),d.getMonth(),d.getDate()); return x.toISOString().slice(0,10); }
function fmtFiDate(iso){ const a=iso.split("-"); return a[2]+"."+a[1]+"."+a[0]; }
function clamp(n,a,b){ return Math.max(a, Math.min(b,n)); }
function round1(x){ return Math.round(x*10)/10; }
function esc(s){ return String(s||"").replace(/[&<>"']/g, c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c])); }

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


/* ---- State ---- */
function defaultState(){
  return {
    selectedDay: todayKey(),
    goals: { p:140, c:170, f:70 },
    target: { baseKcal:2000, workoutKcal:0, stepGoal:0, sleepH:0 },
    products: { custom: [], meta: {} },
    days: {}, // iso -> { entries: [] }
    suggest: { alt:0, mealPlan: null }
  };
}
function ensureDay(s, iso){ if(!s.days) s.days={}; if(!s.days[iso]) s.days[iso]={entries:[]}; }

function saveState(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }catch(e){} }

function loadState(){
  let raw = localStorage.getItem(STORAGE_KEY);
  if(!raw){
    // migrate from legacy key if exists
    const legacy = localStorage.getItem(LEGACY_KEY_1);
    if(legacy){
      try{
        const s = JSON.parse(legacy);
        // keep legacy structure but save under primary key
        localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
        raw = localStorage.getItem(STORAGE_KEY);
      }catch(e){}
    }
  }
  if(!raw){ const s=defaultState(); ensureDay(s,s.selectedDay); return s; }
  try {
    const s=JSON.parse(raw);
    // Always open today by default
    s.selectedDay=todayKey();
    if(!s.days) s.days={};
    ensureDay(s,s.selectedDay);
    if(!s.products) s.products={custom:[],meta:{}}; if(!s.products.meta) s.products.meta={};
    if(!s.target) s.target={ baseKcal:2000, workoutKcal:0, stepGoal:0, sleepH:0 };
    if(!s.goals) s.goals={ p:140, c:170, f:70 };
    if(!s.suggest) s.suggest={ alt:0, mealPlan:null };
    return s;
  } catch(e) {
    const s=defaultState(); ensureDay(s,s.selectedDay); return s;
  }
}

let state = loadState();
let pendingDay = null;
let currentMeal = "aamiainen";
let lastSuggestion = null;

function dayEntries(){ ensureDay(state,state.selectedDay); return state.days[state.selectedDay].entries; }

function computeTargetKcal(){ return Math.round((+state.target.baseKcal||0) + (+state.target.workoutKcal||0) + (+state.target.stepGoal||0)*0.04); }

function markDirty(){
  isDirty = true;
  // autosave immediately
  try{ saveState(); }catch(e){}
  updateSaveBtn();
}
function findProduct(pid){
  if(pid.startsWith("preset:")){
    const parts=pid.split(":");
    const meal=parts[1]; const idx=+parts[2];
    const p=(presets[meal]||[])[idx]; if(!p) return null;
    const base={ id:pid, name:p.name, per100:p.per100, unit:p.unit, gramsPerUnit:p.gramsPerUnit, category:meal, isPreset:true };
    return applyOverride(base,pid);
  }
  const p=(state.products.custom||[]).find(x=>x.id===pid) || null;
  if(!p) return null;
  const m=metaFor(pid);
  if(m.hidden) return null;
  return Object.assign({}, p, { isPreset:false, isFavorite: !!m.favorite || !!p.isFavorite, usage: m.usage||0 });
}

function getEntry(meal, pid){ return dayEntries().find(e=>e.meal===meal && e.productId===pid) || null; }
function setEntry(meal, pid, units){
  const prod=findProduct(pid); if(!prod) return;
  const entries=dayEntries();
  const idx=entries.findIndex(e=>e.meal===meal && e.productId===pid);
  if(units<=0){ if(idx>=0) entries.splice(idx,1); markDirty(); return; }
  const grams = units*(+prod.gramsPerUnit||0);
  const per100=prod.per100||{kcal:0,p:0,c:0,f:0};
  const totals={ kcal: grams/100*(+per100.kcal||0), p: grams/100*(+per100.p||0), c: grams/100*(+per100.c||0), f: grams/100*(+per100.f||0) };
  const entry={ id:(idx>=0?entries[idx].id:crypto.randomUUID()), productId:pid, meal:meal, name:prod.name, per100:per100, unit:prod.unit, gramsPerUnit:prod.gramsPerUnit, units:units, grams:grams, totals:totals };
  if(idx>=0) entries[idx]=entry; else entries.push(entry);
  if(!prod.isPreset){ const c=state.products.custom.find(x=>x.id===pid); if(c && c.isNew) c.isNew=false; }
  const m=metaFor(pid); if(m && units>0){ m.usage = (m.usage||0) + 1; }
  markDirty();
}

function totalsByMeal(){
  const by={}; MEAL_ORDER.forEach(m=>by[m]={kcal:0,p:0,c:0,f:0});
  dayEntries().forEach(e=>{ const m=e.meal; if(!by[m]) by[m]={kcal:0,p:0,c:0,f:0}; by[m].kcal+=e.totals.kcal; by[m].p+=e.totals.p; by[m].c+=e.totals.c; by[m].f+=e.totals.f; });
  return by;
}
function dayTotals(){
  const by=totalsByMeal();
  const sum={kcal:0,p:0,c:0,f:0};
  Object.keys(by).forEach(k=>{ const v=by[k]; sum.kcal+=v.kcal; sum.p+=v.p; sum.c+=v.c; sum.f+=v.f; });
  return {by:by, sum:sum};
}

/* ---- UI ---- */
function updateHeader(){
  $("versionBadge").textContent = VERSION;
  const isToday = (state.selectedDay===todayKey());
  $("btnDate").style.color = isToday ? "" : "#DC2626";
  $("dayTitle").textContent = isToday ? "Tänään" : "Päivä";
  $("todayLabel").textContent = fmtFiDate(state.selectedDay);
}
function updateSaveBtn(){ const b=$("btnSaveOk"); if(!b) return; b.textContent="OK"; b.classList.add("is-clean"); b.classList.remove("is-dirty"); }

function renderRing(by, target){
  const g=$("ringSegs");
  g.innerHTML="";
  const r=46;
  const C=2*Math.PI*r;
  let offset=0;
  MEAL_ORDER.forEach(meal=>{
    const kcal=(by[meal]?by[meal].kcal:0);
    const len=(kcal/target)*C;
    if(len<=0.5) return;
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("class","ringSeg");
    c.setAttribute("cx","60"); c.setAttribute("cy","60"); c.setAttribute("r",String(r));
    c.setAttribute("stroke", MEAL_COLORS[meal] || "#64748B");
    c.setAttribute("stroke-dasharray", String(len)+" "+String(C-len));
    c.setAttribute("stroke-dashoffset", String(-offset));
    g.appendChild(c);
    offset += len;
  });
}

function renderMacroBars(by){
  function fill(containerId, key, goal){
    const el=$(containerId); el.innerHTML="";
    MEAL_ORDER.forEach(meal=>{
      const v=(by[meal]?by[meal][key]:0);
      const pct = clamp((v/goal)*100,0,100);
      if(pct<0.2) return;
      const d=document.createElement("div");
      d.style.width=pct+"%";
      d.style.background = MEAL_COLORS[meal] || "#64748B";
      el.appendChild(d);
    });
  }
  fill("pSegs","p", +state.goals.p||1);
  fill("cSegs","c", +state.goals.c||1);
  fill("fSegs","f", +state.goals.f||1);
}

function renderProductList(){
  const list=$("productList");
  list.innerHTML="";
  const prods = allProducts().filter(p=>(p.category||"aamiainen")===meal);
  prods.sort((a,b)=>{
    const af=!!a.isFavorite, bf=!!b.isFavorite;
    if(af!==bf) return bf-af;
    const au=a.usage||0, bu=b.usage||0;
    if(au!==bu) return bu-au;
    return a.name.localeCompare(b.name,"fi");
  });
  prods.forEach(p=>{
    const row=document.createElement("div");
    row.className="listRow";
    row.dataset.pid=p.id;

    const star=document.createElement("div");
    star.className="star";
    star.style.width="16px";
    star.textContent = (p.isNew) ? "⭐" : "";

    const heart=document.createElement("button");
    heart.type="button";
    heart.className="heartBtn";
    heart.textContent = p.isFavorite ? "❤️" : "🤍";
    heart.addEventListener("click", function(ev){
      ev.stopPropagation();
      const m=metaFor(p.id);
      m.favorite = !m.favorite;
      markDirty();
      renderProductList();
      renderMealPlan();
  computeSuggestion(true);
    });

    const main=document.createElement("div");
    main.className="rowMain";
    const kcal1=Math.round((+p.gramsPerUnit||0)/100*(+p.per100.kcal||0));
    main.innerHTML = '<div class="rowTitle"><div class="name">'+esc(p.name)+'</div></div><div class="rowMeta">1 '+esc(p.unit||"yks")+' • '+kcal1+' kcal</div>';

    row.appendChild(star); row.appendChild(heart); row.appendChild(main);
    row.addEventListener("click", function(){ openProductModal(p.id); });
    list.appendChild(row);
  });
}


/* Product modal */
let pm={pid:null, units:1, entryMeal:null};
function openProductModal(pid){
  pm.pid=pid;
  pm.entryMeal=currentMeal;
  const e=getEntry(currentMeal,pid);
  pm.units = e ? e.units : 1;
  const prod=findProduct(pid);
  $("pmTitle").textContent = prod ? prod.name : "Tuote";
  renderProductModalBody();
  show("productModal");
}
function renderProductModalBody(){
  const prod=findProduct(pm.pid); if(!prod) return;
  const per100=prod.per100||{kcal:0,p:0,c:0,f:0};
  const grams=pm.units*(+prod.gramsPerUnit||0);
  const kcal=Math.round(grams/100*(+per100.kcal||0));
  const p=round1(grams/100*(+per100.p||0));
  const c=round1(grams/100*(+per100.c||0));
  const f=round1(grams/100*(+per100.f||0));
  $("pmBody").innerHTML =
    '<div class="row row--tight">'+
      '<button class="ghost" type="button" id="pmMinus">−</button>'+
      '<div style="margin:0 8px;font-weight:750">'+pm.units+' '+esc(prod.unit||"yks")+'</div>'+
      '<button class="ghost" type="button" id="pmPlus">+</button>'+
      '<div class="muted" style="margin-left:auto">'+Math.round(grams)+' g</div>'+
    '</div>'+
    '<div class="kpi-grid kpi-grid--2" style="margin-top:10px">'+
      '<div class="kpi"><div class="kpi__label">Kalorit</div><div class="kpi__value">'+kcal+'<span class="unit">kcal</span></div></div>'+
      '<div class="kpi"><div class="kpi__label">Makrot</div><div class="kpi__value" style="font-size:16px">'+p+'P • '+c+'H • '+f+'R</div></div>'+
    '</div>'+
    (prod.isPreset ? '' : '<div class="row row--tight" style="margin-top:10px"><button class="ghost" type="button" id="pmEdit">Muokkaa</button></div>')+
    '<div id="pmEditArea" style="display:none;margin-top:10px"></div>';
  $("pmMinus").onclick=function(){ pm.units=Math.max(0, pm.units-(prod.stepUnits||1)); renderProductModalBody(); };
  $("pmPlus").onclick=function(){ pm.units=pm.units+(prod.stepUnits||1); renderProductModalBody(); };
  if(!prod.isPreset) $("pmEdit").onclick=function(){ openAddProduct(prod.id); };
}

function flashRow(pid){ const row=document.querySelector('.listRow[data-pid="'+pid+'"]'); if(!row) return; row.classList.add("is-flash"); setTimeout(()=>row.classList.remove("is-flash"), 500); }


function confirmYesNo(text, title, onYes){
  $("cmTitle").textContent = title || "Vahvista";
  $("cmText").textContent = text || "–";
  show("confirmModal");
  const cleanup=()=>{
    $("btnCmYes").onclick=null; $("btnCmNo").onclick=null; $("btnCmClose").onclick=null;
    hide("confirmModal");
  };
  $("btnCmYes").onclick=function(){ cleanup(); onYes && onYes(); };
  $("btnCmNo").onclick=cleanup;
  $("btnCmClose").onclick=cleanup;
}

function deleteProduct(pid){
  if(pid.startsWith("preset:")){
    const m=metaFor(pid);
    m.hidden=true;
    m.favorite=false;
    m.override=null;
    markDirty();
    return;
  }
  const idx=(state.products.custom||[]).findIndex(x=>x.id===pid);
  if(idx>=0) state.products.custom.splice(idx,1);
  const m=metaFor(pid);
  m.hidden=true; m.favorite=false;
  markDirty();
}

 /* Modals */
function show(id){ $(id).classList.remove("is-hidden"); }
function hide(id){ $(id).classList.add("is-hidden"); }

/* Goal modal */
function openGoal(){
  $("gBase").value=state.target.baseKcal;
  $("gWorkout").value=state.target.workoutKcal;
  $("gSteps").value=state.target.stepGoal;
  $("gSleep").value=state.target.sleepH;
  updateGoalPreview();
  ["gBase","gWorkout","gSteps","gSleep"].forEach(id=>{ $(id).oninput=updateGoalPreview; });
  show("goalModal");
}
function updateGoalPreview(){
  const base=+($("gBase").value||0), w=+($("gWorkout").value||0), steps=+($("gSteps").value||0);
  $("gTotal").textContent = Math.round(base+w+steps*0.04);
}
function saveGoal(){
  state.target.baseKcal=+($("gBase").value||0);
  state.target.workoutKcal=+($("gWorkout").value||0);
  state.target.stepGoal=+($("gSteps").value||0);
  state.target.sleepH=+($("gSleep").value||0);
  markDirty();
  hide("goalModal");
  renderTop();
  renderMealPlan();
  computeSuggestion(true);
}

/* Date handling */
function openDate(){
  $("datePick").value = state.selectedDay;
  $("datePick").onchange = function(){ requestDaySwitch($("datePick").value); };
  show("dateModal");
}
function requestDaySwitch(nextDay){ if(!nextDay || nextDay===state.selectedDay){ hide("dateModal"); return; } switchDay(nextDay); }
function switchDay(nextDay){
  hide("dateModal");
  state.selectedDay=nextDay;
  ensureDay(state,nextDay);
  updateHeader();
  renderAll();
  renderMealPlan();
  computeSuggestion(true);
}

/* Day meals modal */
function openDayMeals(){
  const body=$("dayMealsBody");
  const entries=dayEntries();
  if(!entries.length){ body.innerHTML='<p class="muted">Ei kirjauksia tälle päivälle.</p>'; show("dayMealsModal"); return; }
  const byMeal={}; MEAL_ORDER.forEach(m=>byMeal[m]=[]);
  entries.forEach(e=>byMeal[e.meal].push(e));
  body.innerHTML="";
  MEAL_ORDER.forEach(meal=>{
    const arr=byMeal[meal]; if(!arr.length) return;
    let sk=0, sp=0, sc=0, sf=0;
    arr.forEach(e=>{ sk+=e.totals.kcal; sp+=e.totals.p; sc+=e.totals.c; sf+=e.totals.f; });
    const det=document.createElement("details");
    det.className="details";
    det.innerHTML='<summary><strong>'+MEAL_LABEL[meal]+'</strong> <span class="muted">— '+Math.round(sk)+' kcal • '+Math.round(sp)+'P '+Math.round(sc)+'H '+Math.round(sf)+'R</span></summary><div class="list" style="margin-top:10px"></div>';
    const list=det.querySelector(".list");
    arr.sort((a,b)=>a.name.localeCompare(b.name,"fi"));
    arr.forEach(e=>{
      const item=document.createElement("div");
      item.className="listRow";
      item.innerHTML='<div class="rowMain"><div class="rowTitle"><div class="name">'+esc(e.name)+'</div></div><div class="rowMeta">'+round1(e.units)+' '+esc(e.unit)+' • '+Math.round(e.totals.kcal)+' kcal</div></div>';
      item.addEventListener("click", function(){ 
        hide("dayMealsModal");
        currentMeal=meal;
        document.querySelectorAll("#mealSeg .seg__btn").forEach(btn=>btn.classList.toggle("is-on", btn.dataset.meal===currentMeal));
        $("secAdd").open=true;
        renderProductList();
        openProductModal(e.productId);
      });
      list.appendChild(item);
    });
    body.appendChild(det);
  });
  show("dayMealsModal");
}

/* Add product modal + OFF */
function openAddProduct(editId){
  editId = editId || "";
  $("customModal").dataset.editId = editId;
  $("customTitle").textContent = editId ? "Muokkaa tuotetta" : "Lisää tuote";
  $("offResults").innerHTML=""; $("offStatus").textContent="–";
  $("offQuery").value="";
  if(editId){
    const p=findProduct(editId);
    if(p){
      $("cfName").value=p.name||"";
      $("cfCat").value=p.category||currentMeal;
      $("cfEan").value=p.ean||"";
      $("cfKcal").value=+p.per100.kcal||0;
      $("cfP").value=+p.per100.p||0;
      $("cfC").value=+p.per100.c||0;
      $("cfF").value=+p.per100.f||0;
      $("cfUnit").value=p.unit||"yks";
      $("cfGPU").value=+p.gramsPerUnit||100;
    }
  } else {
    $("cfName").value=""; $("cfCat").value=currentMeal; $("cfEan").value="";
    $("cfKcal").value=""; $("cfP").value=""; $("cfC").value=""; $("cfF").value="";
    $("cfUnit").value=""; $("cfGPU").value="";
  }
  show("customModal");
}
async function offSearch(){
  const q=$("offQuery").value.trim(); if(!q) return;
  $("offStatus").textContent="Haetaan…"; $("offResults").innerHTML="";
  const btn=$("btnOffSearch"); if(btn){ btn.disabled=true; btn.textContent="Haetaan…"; }
  try {
    const url = /^\d{8,14}$/.test(q)
      ? "https://world.openfoodfacts.org/api/v2/product/"+encodeURIComponent(q)+".json"
      : "https://world.openfoodfacts.org/cgi/search.pl?search_terms="+encodeURIComponent(q)+"&search_simple=1&action=process&json=1&page_size=8";
    const res=await fetch(url); const data=await res.json();
    const prods = data.product ? [data.product] : (data.products||[]);
    if(!prods.length){ $("offStatus").textContent="Ei tuloksia"; $("offResults").innerHTML='<div class="muted">Ei tuloksia. Kokeile eri hakusanaa tai viivakoodia.</div>'; if(btn){btn.disabled=false;btn.textContent="Hae";} return; }
    $("offStatus").textContent=prods.length+" tulosta";
    prods.forEach(p=>{
      const name = p.product_name || p.generic_name || "(nimetön)";
      const n=p.nutriments||{};
      const per100={ kcal:+(n["energy-kcal_100g"]||n["energy-kcal"]||0), p:+(n["proteins_100g"]||0), c:+(n["carbohydrates_100g"]||0), f:+(n["fat_100g"]||0) };
      const row=document.createElement("div");
      row.className="listRow";
      row.innerHTML='<div class="rowMain"><div class="rowTitle"><div class="name">'+esc(name)+'</div></div><div class="rowMeta">'+Math.round(per100.kcal)+' kcal / 100g</div></div><button class="ghost" type="button">Käytä</button>';
      row.querySelector("button").onclick=function(ev){ 
        ev.stopPropagation();
        $("cfName").value=name;
        $("cfEan").value=p.code||"";
        $("cfKcal").value=per100.kcal||0;
        $("cfP").value=per100.p||0;
        $("cfC").value=per100.c||0;
        $("cfF").value=per100.f||0;
        $("offResults").innerHTML=""; // close only results list
        $("offStatus").textContent="Valittu";
      };
      $("offResults").appendChild(row);
    });
  } catch(e) {
    $("offStatus").textContent="Virhe haussa";
  } finally { if(btn){ btn.disabled=false; btn.textContent="Hae"; } }

}
function saveCustom(){
  const name=$("cfName").value.trim(); if(!name) return;
  const editId=$("customModal").dataset.editId;
  const category=($("cfCat").value||currentMeal);
  const obj={ id: editId||crypto.randomUUID(), name:name, category:category, ean:$("cfEan").value.trim(),
    per100:{ kcal:+($("cfKcal").value||0), p:+($("cfP").value||0), c:+($("cfC").value||0), f:+($("cfF").value||0) },
    unit:($("cfUnit").value.trim()||"yks"),
    gramsPerUnit:+($("cfGPU").value||100),
    isFavorite:false,
    isNew: editId? false:true
  };
  if(editId){
    if(editId.startsWith("preset:")){
      const m=metaFor(editId);
      m.override = { name: obj.name, category: obj.category, ean: obj.ean, per100: obj.per100, unit: obj.unit, gramsPerUnit: obj.gramsPerUnit };
      m.hidden = false;
    } else {
      const i=state.products.custom.findIndex(x=>x.id===editId);
      if(i>=0) state.products.custom[i]=Object.assign(state.products.custom[i], obj);
    }
  } else {
    state.products.custom.unshift(obj);
    const m=metaFor(obj.id); m.hidden=false;
  }
  markDirty();
  hide("customModal");
  renderProductList();
  renderMealPlan();
  computeSuggestion(true);
}


/* Suggestions */
function initMealPlan(){
  if(!state.suggest.mealPlan){
    state.suggest.mealPlan={};
    MEAL_ORDER.forEach(m=>state.suggest.mealPlan[m]= (["juomat","jälkiruoka"].includes(m) ? false : true));
  }
}
function renderMealPlan(){
  initMealPlan();
  const box=$("mealPlan"); if(!box) return;
  box.innerHTML="";
  MEAL_ORDER.forEach(meal=>{
    if(["juomat","jälkiruoka"].includes(meal)) return; // keep UI focused on meals
    const lab=document.createElement("label");
    lab.className="mealchip";
    lab.innerHTML = '<input type="checkbox" '+(state.suggest.mealPlan[meal]?'checked':'')+' /> <span>'+MEAL_LABEL[meal]+'</span>';
    lab.querySelector("input").addEventListener("change",(ev)=>{
      state.suggest.mealPlan[meal]=ev.target.checked;
      markDirty();
      renderMealPlan();
  computeSuggestion(true);
    });
    box.appendChild(lab);
  });
}
function pickSuggestMeal(){
  initMealPlan();
  const start=MEAL_ORDER.indexOf(currentMeal);
  for(let k=0;k<MEAL_ORDER.length;k++){
    const m=MEAL_ORDER[(start+k)%MEAL_ORDER.length];
    if(state.suggest.mealPlan[m]) return m;
  }
  return currentMeal;
}

/* Suggestions */
function computeSuggestion(resetAlt){
  initMealPlan();
  if(resetAlt) state.suggest.alt=0;
  const meal = pickSuggestMeal();
  const t=dayTotals().sum;
  const targetK=computeTargetKcal();
  const needK=targetK - t.kcal;
  const needP=(+state.goals.p||0) - t.p;
  const needC=(+state.goals.c||0) - t.c;
  const needF=(+state.goals.f||0) - t.f;

  const prods = allProducts().filter(p=>(p.category||"aamiainen")===meal);
  let scored = prods.map(p=>{
    const grams=+p.gramsPerUnit||0;
    const per100=p.per100||{kcal:0,p:0,c:0,f:0};
    const kcal=grams/100*(+per100.kcal||0);
    const P=grams/100*(+per100.p||0);
    const C=grams/100*(+per100.c||0);
    const F=grams/100*(+per100.f||0);
    let score=0;
    if(needP>5) score += Math.min(P,needP)*3;
    if(needC>5) score += Math.min(C,needC)*2;
    if(needK>50) score += Math.min(kcal,needK)*0.01;
    if(needF<0 && F>2) score -= F*2;
    if(p.isFavorite) score += 30;
    return {p:p,kcal:kcal,P:P,C:C,F:F,score:score};
  });
  scored.sort((a,b)=>b.score-a.score);
  const alt=state.suggest.alt||0;
  const picked = scored.slice(alt, alt+3).filter(x=>x.score>0.1);
  if(!picked.length){ $("suggestBox").innerHTML='<div class="muted">Hyvä! Päivä on tasapainossa.</div>'; lastSuggestion=null; return; }
  lastSuggestion={ meal:meal, items:picked.map(x=>({productId:x.p.id, units:1})), totals:{kcal:picked.reduce((s,x)=>s+x.kcal,0), p:picked.reduce((s,x)=>s+x.P,0), c:picked.reduce((s,x)=>s+x.C,0), f:picked.reduce((s,x)=>s+x.F,0)}, why:[] };
  const why=[];
  if(needP>10) why.push("Painottaa proteiinia (puuttuu "+Math.round(needP)+" g)");
  if(needC>10) why.push("Tasaa hiilareita (puuttuu "+Math.round(needC)+" g)");
  if(needF<0) why.push("Rasva on jo täynnä → vältetään lisärasvaa");
  lastSuggestion.why = why.slice(0,2);

  renderSuggestion(needK,needP,needC,needF);
}
function renderSuggestion(needK,needP,needC,needF){
  if(!lastSuggestion) return;
  const mealLabel=MEAL_LABEL[lastSuggestion.meal] || lastSuggestion.meal;
  let html='<div style="font-weight:750">Seuraavaksi: '+mealLabel+'</div>';
  html+='<div class="muted" style="margin-top:6px">Jäljellä: '+Math.round(needK)+' kcal • P '+Math.round(Math.max(0,needP))+' • H '+Math.round(Math.max(0,needC))+' • R '+Math.round(Math.max(0,needF))+'</div>';
  html+='<div style="margin-top:8px">';
  lastSuggestion.items.forEach(it=>{ const p=findProduct(it.productId); if(p) html+='<div>• '+esc(p.name)+' — 1 '+esc(p.unit||"yks")+'</div>'; });
  html+='</div>';
  html+='<div class="muted" style="margin-top:6px">Yhteensä: '+Math.round(lastSuggestion.totals.kcal)+' kcal • P '+Math.round(lastSuggestion.totals.p)+' • H '+Math.round(lastSuggestion.totals.c)+' • R '+Math.round(lastSuggestion.totals.f)+'</div>';
  if(lastSuggestion.why.length){
    html+='<div style="margin-top:8px">';
    lastSuggestion.why.forEach(w=>{ html+='<div class="muted">• '+esc(w)+'</div>'; });
    html+='</div>';
  }
  $("suggestBox").innerHTML=html;
}
function applySuggestion(){
  if(!lastSuggestion) return;
  lastSuggestion.items.forEach(it=>{
    const ex=getEntry(lastSuggestion.meal, it.productId);
    const newUnits = (ex?ex.units:0) + it.units;
    setEntry(lastSuggestion.meal, it.productId, newUnits);
  });
  renderTop();
  renderProductList();
  renderMealPlan();
  computeSuggestion(true);

}

/* Wire up */
function renderAll(){
  updateHeader();
  updateSaveBtn();
  renderTop();
  renderProductList();
  renderMealPlan();
  computeSuggestion(true);
}

document.addEventListener("DOMContentLoaded", function(){
  $("versionBadge").textContent=VERSION;
  updateHeader(); updateSaveBtn();

  // meal buttons
  document.querySelectorAll("#mealSeg .seg__btn").forEach(btn=>{
    btn.addEventListener("click", function(){ 
      currentMeal=btn.dataset.meal;
      document.querySelectorAll("#mealSeg .seg__btn").forEach(b=>b.classList.toggle("is-on", b.dataset.meal===currentMeal));
      renderProductList();
      renderMealPlan();
  computeSuggestion(true);
    });
  });

  $("btnSaveOk").onclick=function(){ /* autosave */ };
  $("btnGoal").onclick=openGoal;
  $("btnGoalClose").onclick=function(){ hide("goalModal"); };
  $("btnGoalCancel").onclick=function(){ hide("goalModal"); };
  $("btnGoalSave").onclick=saveGoal;

  $("btnDate").onclick=openDate;
  $("btnDateClose").onclick=function(){ hide("dateModal"); };
  $("btnToday").onclick=function(){ requestDaySwitch(todayKey()); };

  $("btnDayMeals").onclick=openDayMeals;
  $("btnDmClose").onclick=function(){ hide("dayMealsModal"); };
  $("ringClick").onclick=openDayMeals;

  $("btnPmClose").onclick=function(){ hide("productModal"); };
  $("btnPmCancel").onclick=function(){ hide("productModal"); };
  $("btnPmApply").onclick=function(){ setEntry(pm.entryMeal, pm.pid, pm.units); hide("productModal"); flashRow(pm.pid); renderTop(); computeSuggestion(true); };
  $("btnPmTrash").onclick=function(){ const has=!!getEntry(pm.entryMeal, pm.pid); if(!has) return; confirmYesNo("Poistetaanko tämä syödyistä?","Poista", ()=>{ setEntry(pm.entryMeal, pm.pid, 0); hide("productModal"); renderTop(); computeSuggestion(true); renderProductList(); }); };

  $("btnAddProduct").onclick=function(){ openAddProduct(""); };
  $("btnCloseCustom").onclick=function(){ hide("customModal"); };
  $("btnCancelCustom").onclick=function(){ hide("customModal"); };
  $("btnOffSearch").onclick=offSearch;
  $("btnSaveCustom").onclick=saveCustom;

  $("btnSuggestRefresh").onclick=function(){ computeSuggestion(true); };
  $("btnSuggestAlt").onclick=function(){ state.suggest.alt=(state.suggest.alt||0)+1; computeSuggestion(false); };
  $("btnApplySuggestion").onclick=applySuggestion;

  renderAll();
});
