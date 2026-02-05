
// Ruokasi baseline v3.4.0.0 (build 20260204235421)
const STORAGE_KEY="ruokasi.v2";
const VERSION = "v3.5.0.4-nosw";
const KCAL_PER_STEP=0.04;
const $=id=>document.getElementById(id);

const MEAL_COLORS={
  "aamiainen":"#2F7BFF",
  "lounas":"#22C55E",
  "välipala":"#F59E0B",
  "päivällinen":"#8B5CF6",
  "iltapala":"#06B6D4",
  "juomat":"#60A5FA",
  "jälkiruoat":"#F472B6"
};

const MEALS=[
 {key:"aamiainen",label:"Aamiainen"},
 {key:"lounas",label:"Lounas"},
 {key:"välipala",label:"Välipala"},
 {key:"päivällinen",label:"Päivällinen"},
 {key:"iltapala",label:"Iltapala"},
 {key:"juomat",label:"Juomat"},
 {key:"jälkiruoat",label:"Jälkiruoat"},
];
const PRODUCT_CATS=["Aamiainen","Lounas","Välipala","Päivällinen","Iltapala","Juomat","Jälkiruoat"];
const UNITS=[{k:"g",t:"g"},{k:"kg",t:"kg"},{k:"annos",t:"annos"},{k:"kpl",t:"kpl"},{k:"dl",t:"dl"}];

const todayKey=()=>new Date().toISOString().slice(0,10);
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const r0=x=>Math.round(x);
const r1=x=>Math.round(x*10)/10;


function seedProducts(){
  const mk=(id,name,cat,unit,gPer,kcal100,p100,c100,f100)=>({id,name,category:cat,unit,gPerUnit:gPer,kcal100,p100,c100,f100,ean:""});
  return [
    mk("kanafile","Kanafile","Päivällinen","g",1,110,23,0,1),
    mk("jauheliha10","Jauheliha 10%","Päivällinen","g",1,176,20,0,10),
    mk("lohifilee","Lohifilee","Päivällinen","g",1,200,20,0,13),
    mk("kananmuna","Kananmuna","Aamiainen","kpl",60,155,13,1,11),
    mk("kaurahiutale","Kaurahiutaleet","Aamiainen","g",1,370,13,60,7),
    mk("maito","Maito (rasvaton)","Aamiainen","dl",100,35,3.4,4.9,0.2),
    mk("voi","Voi","Aamiainen","rkl",14,717,0.5,0.5,81),
    mk("ruisleipa","Ruisleipä","Aamiainen","viipale",35,220,7.5,40,2.5),
    mk("juusto15","Juusto 15%","Aamiainen","siivu",10,265,31,0,15),
    mk("rahka","Maitorahka","Aamiainen","annos",250,60,10,4,0),
    mk("jogurtti","Jogurtti","Aamiainen","dl",100,60,4,6,2),
    mk("banaani","Banaani","Välipala","kpl",120,89,1.1,23,0.3),
    mk("omena","Omena","Välipala","kpl",150,52,0.3,14,0.2),
    mk("peruna","Peruna","Päivällinen","g",1,77,2,17,0.1),
    mk("riisi","Riisi keitetty","Päivällinen","g",1,130,2.7,28,0.3),
    mk("pasta","Pasta keitetty","Päivällinen","g",1,150,5.5,30,1.2),
    mk("salaatti","Salaatti","Lounas","g",1,15,1,2,0.2),
    mk("oliivioljy","Oliiviöljy","Lounas","rkl",14,884,0,0,100),
    mk("kahvi","Kahvi","Juomat","kpl",200,1,0,0,0),
    mk("tee","Tee","Juomat","kpl",250,1,0,0,0),
    mk("cola_zero","Cola Zero","Juomat","dl",100,0,0,0,0),
    mk("olut0","Alkoholiton olut","Juomat","pullo",330,25,0.2,5,0),
    mk("jaatelo","Jäätelö","Jälkiruoat","annos",100,200,3,24,11),
    mk("suklaa","Suklaa","Jälkiruoat","pala",10,530,6,58,30),
  ];
}
function defaultState(){
  return {
    selectedDay: todayKey(),
    goals:{baseKcal:2000,p:140,c:170,f:70},
    activity:{workoutKcal:0,stepGoal:0,sleepH:0},
    mealPlan:{aamiainen:true,lounas:true,"välipala":true,"päivällinen":true,iltapala:true},
    products: seedProducts(),
    favorites:{},
    logs:{}, // date -> [{productId,qty,unit,meal,ts}]
  };
}

function autoCategoryForProduct(prod){
  const p100 = +prod.p100||0;
  return (p100>=10) ? "Päivällinen" : "Aamiainen";
}
function migrateState(s){
  if(!s || typeof s!=="object") return null;

  // Old v3.2.x shape: {day, goals:{minKcal,maxKcal,p,c,f}, activity:{...}, log:[], customFoods:[]}
  if(s.day && !s.selectedDay){
    const ns = defaultState();
    ns.selectedDay = s.day || todayKey();
    // goals
    if(s.goals){
      const maxK = +s.goals.maxKcal || +s.goals.baseKcal || ns.goals.baseKcal;
      ns.goals.baseKcal = maxK;
      ns.goals.p = +s.goals.p || ns.goals.p;
      ns.goals.c = +s.goals.c || ns.goals.c;
      ns.goals.f = +s.goals.f || ns.goals.f;
    }
    // activity
    if(s.activity){
      ns.activity.workoutKcal = +s.activity.workoutKcal || 0;
      ns.activity.stepGoal = +s.activity.stepGoal || 0;
      ns.activity.sleepH = +s.activity.sleepH || 0;
    }
    // products: merge seed + old custom foods
    const base = seedProducts();
    const byId = Object.fromEntries(base.map(p=>[p.id,p]));
    if(Array.isArray(s.customFoods)){
      s.customFoods.forEach(cf=>{
        const id = (cf.ean && String(cf.ean).trim()) ? ("ean_"+String(cf.ean).trim()) : ("c_"+Math.random().toString(36).slice(2,9));
        const cat = cf.category || autoCategoryForProduct(cf);
        byId[id] = {id, name: cf.name||"Tuote", category: cat, unit: cf.unit||"g", gPerUnit:+cf.gPerUnit||+cf.g_per_unit||1,
                   kcal100:+cf.kcal100||+cf.kcal||0, p100:+cf.p100||+cf.protein||0, c100:+cf.c100||+cf.carbs||0, f100:+cf.f100||+cf.fat||0,
                   ean: cf.ean?String(cf.ean):""};
      });
    }
    ns.products = Object.values(byId);
    // favorites
    ns.favorites = s.favorites || {};
    // day logs: map s.log into dayLogs
    ns.dayLogs = {};
    const day = ns.selectedDay;
    ns.dayLogs[day] = Array.isArray(s.log) ? s.log.map(e=>({
      productId: e.productId||e.id||e.pid,
      qty: +e.qty||+e.grams||1,
      unit: e.unit||"g",
      meal: e.meal||"aamiainen",
      ts: e.ts||Date.now()
    })) : [];
    return ns;
  }
  return s;
}

function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    let s=JSON.parse(raw);
    s = migrateState(s) || s;
    const b=defaultState();
    return {
      ...b,...s,
      goals:{...b.goals,...(s.goals||{})},
      activity:{...b.activity,...(s.activity||{})},
      mealPlan:{...b.mealPlan,...(s.mealPlan||{})},
      products:Array.isArray(s.products)&&s.products.length?s.products:b.products,
      favorites:s.favorites||{},
      logs:s.logs||{},
    };
  }catch(e){ return defaultState(); }
}
let state=loadState();
let selectedMeal="aamiainen";
let mealsView={level:"meals",meal:null};
let editingProductId=null;
let qtyContext=null;

const saveState=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
const ensureDayLog=(d)=>state.logs[d]||(state.logs[d]=[]);
const getProduct=(id)=>state.products.find(p=>p.id===id);
const computedTarget=()=>r0((+state.goals.baseKcal||0)+(+state.activity.workoutKcal||0)+(+state.activity.stepGoal||0)*KCAL_PER_STEP);

// Backwards-compat alias (older code referenced this)
const currentTargetKcal = () => computedTarget();

function unitToGrams(prod,qty,unit){
  const q=+qty||0;
  if(unit==="g") return q;
  if(unit==="kg") return q*1000;
  return q*(+prod.gPerUnit||0);
}
function macrosFor(prod,g){
  const grams=+g||0;
  return {
    kcal:(+prod.kcal100||0)*grams/100,
    p:(+prod.p100||0)*grams/100,
    c:(+prod.c100||0)*grams/100,
    f:(+prod.f100||0)*grams/100,
  };
}

function dayTotalsByMeal(day){
  const log=ensureDayLog(day);
  const out={};
  MEALS.forEach(m=>out[m.key]={kcal:0,p:0,c:0,f:0});
  log.forEach(e=>{
    const prod=getProduct(e.productId); if(!prod) return;
    const g=unitToGrams(prod,e.qty,e.unit);
    const mm=macrosFor(prod,g);
    const mkey=e.meal||"aamiainen";
    if(!out[mkey]) out[mkey]={kcal:0,p:0,c:0,f:0};
    out[mkey].kcal+=mm.kcal; out[mkey].p+=mm.p; out[mkey].c+=mm.c; out[mkey].f+=mm.f;
  });
  return out;
}

function dayTotals(d){
  const log=ensureDayLog(d);
  let kcal=0,p=0,c=0,f=0;
  for(const e of log){
    const prod=getProduct(e.productId); if(!prod) continue;
    const g=unitToGrams(prod,e.qty,e.unit);
    const m=macrosFor(prod,g);
    kcal+=m.kcal;p+=m.p;c+=m.c;f+=m.f;
  }
  return {kcal:r0(kcal),p:r0(p),c:r0(c),f:r0(f)};
}
function mealAgg(d){
  const log=ensureDayLog(d);
  const out={};
  for(const m of MEALS) out[m.key]={kcal:0,items:new Map()};
  for(const e of log){
    const prod=getProduct(e.productId); if(!prod) continue;
    const g=unitToGrams(prod,e.qty,e.unit);
    const m=macrosFor(prod,g);
    const b=out[e.meal]||(out[e.meal]={kcal:0,items:new Map()});
    b.kcal+=m.kcal;
    const prev=b.items.get(e.productId)||{qty:0,kcal:0,p:0,c:0,f:0};
    prev.qty+=(+e.qty||0); prev.kcal+=m.kcal; prev.p+=m.p; prev.c+=m.c; prev.f+=m.f;
    b.items.set(e.productId,prev);
  }
  return out;
}

function openModal(id){$(id).classList.add("open");}
function closeModal(id){$(id).classList.remove("open");}
function toast(msg){
  const t=$("toast"); t.textContent=msg; t.style.display="block";
  setTimeout(()=>t.style.display="none",900);
}
function setActivePill(containerId,key){
  const c=$(containerId);
  [...c.querySelectorAll(".pill")].forEach(p=>p.classList.toggle("active",p.dataset.key===key));
}

function init(){
  $("versionBadge").textContent=VERSION;

  // meal pills
  const mp=$("mealPills"); mp.innerHTML="";
  for(const m of MEALS){
    const b=document.createElement("button");
    b.className="pill"; b.textContent=m.label; b.dataset.key=m.key;
    b.onclick=()=>{selectedMeal=m.key; render();};
    mp.appendChild(b);
  }
  // plan pills
  const pp=$("planPills"); pp.innerHTML="";
  for(const k of ["aamiainen","lounas","välipala","päivällinen","iltapala"]){
    const m=MEALS.find(x=>x.key===k);
    const b=document.createElement("button");
    b.className="pill"; b.textContent=m.label; b.dataset.key=k;
    b.onclick=()=>{state.mealPlan[k]=!state.mealPlan[k]; saveState(); render();};
    pp.appendChild(b);
  }

  $("resetBtn").onclick=()=>{
    if(!confirm("Haluatko varmasti nollata päivän syömiset?")) return;
    state.logs[state.selectedDay]=[]; saveState(); render();
  };
  $("statusBtn").onclick=()=>alert("Kaikki tallentuu automaattisesti.");

  $("calendarBtn").onclick=()=>{ $("calDate").value=state.selectedDay; openModal("calendarModal"); };
  $("calClose").onclick=()=>closeModal("calendarModal");
  $("calGo").onclick=()=>{
    const v=$("calDate").value;
    if(v){ state.selectedDay=v; saveState(); closeModal("calendarModal"); render(); }
  };

  $("goalKpi").onclick=()=>{
    $("baseKcal").value=state.goals.baseKcal||0;
    $("workoutKcal").value=state.activity.workoutKcal||0;
    $("stepGoal").value=state.activity.stepGoal||0;
    $("sleepH").value=state.activity.sleepH||0;
    $("goalP").value=state.goals.p||0;
    $("goalC").value=state.goals.c||0;
    $("goalF").value=state.goals.f||0;
    updateComputedField();
    openModal("goalModal");
  };
  $("goalCancel").onclick=()=>closeModal("goalModal");
  $("goalSave").onclick=()=>{
    state.goals.baseKcal=+($("baseKcal").value)||0;
    state.activity.workoutKcal=+($("workoutKcal").value)||0;
    state.activity.stepGoal=+($("stepGoal").value)||0;
    state.activity.sleepH=+($("sleepH").value)||0;
    state.goals.p=+($("goalP").value)||0;
    state.goals.c=+($("goalC").value)||0;
    state.goals.f=+($("goalF").value)||0;
    saveState(); closeModal("goalModal"); render();
  };
  ["baseKcal","workoutKcal","stepGoal"].forEach(id=>$(id).addEventListener("input",updateComputedField));

  $("dayMealsLink").onclick=()=>openMealsModal();

  $("addProductBtn").onclick=()=>{
    editingProductId=null;
    fillProductForm(null);
    openModal("productModal");
  };
  if($("recipeBtn")) $("recipeBtn").onclick=openRecipeModal;
  if($("recipeClose")) $("recipeClose").onclick=()=>closeModal("recipeModal");
  if($("recipeCancel")) $("recipeCancel").onclick=()=>closeModal("recipeModal");
  if($("recipeAddItem")) $("recipeAddItem").onclick=addRecipeItem;
  if($("recipeSave")) $("recipeSave").onclick=saveRecipe;
  if($("recKpi")) $("recKpi").onclick=()=>{ const sec=document.querySelector(".section.card h3"); const s=document.querySelector(".section.card"); if(s) s.scrollIntoView({behavior:"smooth",block:"start"}); };
  $("prodCancel").onclick=()=>closeModal("productModal");
  $("prodSave").onclick=()=>saveProductFromForm();
  $("prodDelete").onclick=()=>deleteProduct();
  $("offSearchBtn").onclick=()=>offSearch();

  $("qtyCancel").onclick=()=>closeModal("qtyModal");
  $("qtyConfirm").onclick=()=>confirmQty();
  $("qtyMinus").onclick=()=>stepQty(-1);
  $("qtyPlus").onclick=()=>stepQty(1);
  $("qtyDelete").onclick=()=>deleteQty();

  setupSwipeToClose("mealsModal","mealsClose");
  $("refreshRecBtn").onclick=()=>renderRecommendation();
  updateRecKpi();

  $("prodCat").innerHTML=PRODUCT_CATS.map(c=>`<option value="${c}">${c}</option>`).join("");
  $("prodUnit").innerHTML=UNITS.map(u=>`<option value="${u.k}">${u.t}</option>`).join("");

  render();
}

function updateComputedField(){
  const base=+($("baseKcal").value)||0;
  const w=+($("workoutKcal").value)||0;
  const steps=+($("stepGoal").value)||0;
  $("computedTarget").value = `${r0(base+w+steps*KCAL_PER_STEP)} kcal`;
}


function nextPlannedMeal(){
  // pick next enabled meal from plan order
  const order = MEALS.map(m=>m.key);
  for(const k of order){
    if(state.mealPlan && state.mealPlan[k]) return k;
  }
  return "aamiainen";
}
function updateRecKpi(){
  const k = nextPlannedMeal();
  const label = (MEALS.find(m=>m.key===k)?.label)||"—";
  $("recKpiMeal").textContent = label;
  // simple kcal hint: remaining / remainingMealsCount
  const rem = Math.max(0, currentTargetKcal() - dayTotals(state.selectedDay).kcal);
  const remainingMeals = MEALS.filter(m=>state.mealPlan?.[m.key]).length || 1;
  const hint = Math.round(rem / remainingMeals);
  $("recKpiKcal").textContent = String(hint);
}

function render(){
  const d=state.selectedDay||todayKey();
  $("dateLabel").textContent=d;
  $("dayKpi").textContent=d.split("-").reverse().join(".");
  const isToday=d===todayKey();
  $("todayLabel").textContent=isToday?"Tänään":"Päivä";
  $("pastHint").style.display=isToday?"none":"block";
  setActivePill("mealPills",selectedMeal);

  [...$("planPills").querySelectorAll(".pill")].forEach(p=>{
    const on=!!state.mealPlan[p.dataset.key];
    p.classList.toggle("active",on);
    p.style.opacity=on?"1":"0.45";
  });

  const tot=dayTotals(d);
  const target=computedTarget();
  $("eatenKcal").textContent=tot.kcal;
  const _eatenEl = $("eatenKpi"); if(_eatenEl) _eatenEl.textContent = tot.kcal;
  $("targetKcal").textContent=target;
  $("remainingKcal").textContent=Math.max(0,target-tot.kcal);

  $("pGoal").textContent=state.goals.p||0;
  $("cGoal").textContent=state.goals.c||0;
  $("fGoal").textContent=state.goals.f||0;
  $("pNow").textContent=tot.p;
  $("cNow").textContent=tot.c;
  $("fNow").textContent=tot.f;

  $("pFill").style.width=`${(state.goals.p?clamp(tot.p/state.goals.p,0,1):0)*100}%`;
  $("cFill").style.width=`${(state.goals.c?clamp(tot.c/state.goals.c,0,1):0)*100}%`;
  $("fFill").style.width=`${(state.goals.f?clamp(tot.f/state.goals.f,0,1):0)*100}%`;

  const byMeal=dayTotalsByMeal(d);
  const circ=2*Math.PI*46;
  const pct=target?clamp(tot.kcal/target,0,1):0;
  $("ringArc").setAttribute("stroke-dasharray",`${pct*circ} ${circ}`);
  renderRingSegments(target, byMeal);
  // macro fills: width by goal, color segments by meals
  const pFill=$("pFill"), cFill=$("cFill"), fFill=$("fFill");
  if(pFill) pFill.style.background=gradientForMeals(target, byMeal, "p");
  if(cFill) cFill.style.background=gradientForMeals(target, byMeal, "c");
  if(fFill) fFill.style.background=gradientForMeals(target, byMeal, "f");

  renderProductList();
  renderRecommendation();
  updateRecKpi();
}


function renderRingSegments(target, byMeal){
  const svg=document.querySelector(".ringWrap svg");
  const g=document.getElementById("ringSegs");
  if(!svg||!g) return;
  g.innerHTML="";
  const r=46, circ=2*Math.PI*r;
  // build segments in meal order, proportions of target
  let offset=0;
  const entries=MEALS.map(m=>({key:m.key, val:(byMeal[m.key]?.kcal)||0, color:MEAL_COLORS[m.key]||"var(--accent)"}))
                    .filter(x=>x.val>0);
  if(!target||target<=0||entries.length===0){
    return;
  }
  entries.forEach(seg=>{
    const frac=clamp(seg.val/target,0,1);
    const len=frac*circ;
    const c=document.createElementNS("http://www.w3.org/2000/svg","circle");
    c.setAttribute("cx","60"); c.setAttribute("cy","60"); c.setAttribute("r",String(r));
    c.setAttribute("stroke", seg.color);
    c.setAttribute("stroke-width","12");
    c.setAttribute("fill","none");
    c.setAttribute("stroke-linecap","round");
    c.setAttribute("stroke-dasharray", `${len} ${circ}`);
    // rotate -90deg and apply cumulative offset
    c.setAttribute("transform", "rotate(-90 60 60)");
    // dashoffset shifts start: use negative offset
    c.setAttribute("stroke-dashoffset", String(-offset));
    g.appendChild(c);
    offset += len;
  });
}
function gradientForMeals(totalTarget, byMeal, field){
  // field: 'kcal','p','c','f'
  const parts=MEALS.map(m=>({key:m.key, val:(byMeal[m.key]?.[field])||0, color:MEAL_COLORS[m.key]||"var(--accent)"}))
                  .filter(x=>x.val>0);
  const sum=parts.reduce((a,b)=>a+b.val,0);
  if(sum<=0) return "var(--accent)";
  let cur=0;
  const stops=[];
  parts.forEach(p=>{
    const pct=p.val/sum*100;
    const start=cur;
    const end=cur+pct;
    stops.push(`${p.color} ${start.toFixed(2)}% ${end.toFixed(2)}%`);
    cur=end;
  });
  return `linear-gradient(90deg, ${stops.join(",")})`;
}

function renderProductList(){
  const list=$("productList");
  const catLabel=(MEALS.find(m=>m.key===selectedMeal)?.label)||"Aamiainen";
  const items=state.products.filter(p=>p.category===catLabel).sort((a,b)=>{
    const fa=state.favorites[a.id]?1:0, fb=state.favorites[b.id]?1:0;
    if(fa!==fb) return fb-fa;
    return a.name.localeCompare(b.name,"fi");
  });
  list.innerHTML="";
  $("productHint").style.display=items.length?"none":"block";
  for(const p of items){
    const row=document.createElement("div"); row.className="item";
    const left=document.createElement("div"); left.className="left";
    const h=document.createElement("div"); h.className="heart"+(state.favorites[p.id]?" on":""); h.textContent="♥";
    h.onclick=(ev)=>{ev.stopPropagation(); if(state.favorites[p.id]) delete state.favorites[p.id]; else state.favorites[p.id]=true; saveState(); renderProductList();};
    const t=document.createElement("div"); t.style.minWidth="0";
    t.innerHTML=`<div class="name">${esc(p.name)}</div><div class="meta">${esc(p.category)} • ${esc(p.unit)} • ${p.kcal100}/100g</div>`;
    left.appendChild(h); left.appendChild(t);
    const right=document.createElement("div"); right.className="right"; right.textContent=`${p.kcal100} /100g`;
    row.appendChild(left); row.appendChild(right);
    row.onclick=()=>openQty(p.id,"add");
    row.ondblclick=()=>openEdit(p.id);
    list.appendChild(row);
  }
}

function openEdit(id){
  const prod=getProduct(id); if(!prod) return;
  editingProductId=id;
  fillProductForm(prod);
  openModal("productModal");
}

function fillProductForm(prod){
  $("prodTitle").textContent=prod?"Muokkaa tuotetta":"Lisää tuote";
  $("prodDeleteWrap").style.display=prod?"block":"none";
  $("prodName").value=prod?prod.name:"";
  $("prodCat").value=prod?prod.category:"Aamiainen";
  $("prodUnit").value=prod?prod.unit:"g";
  $("prodGPer").value=prod?(prod.gPerUnit??1):1;
  $("prodKcal100").value=prod?(prod.kcal100??0):0;
  $("prodP100").value=prod?(prod.p100??0):0;
  $("prodC100").value=prod?(prod.c100??0):0;
  $("prodF100").value=prod?(prod.f100??0):0;
  $("prodEan").value=prod?(prod.ean||""):"";
  $("offStatus").textContent="—";
  $("offResults").innerHTML="";
}

function slugId(name){
  return name.toLowerCase().replace(/å/g,"a").replace(/ä/g,"a").replace(/ö/g,"o").replace(/[^a-z0-9]+/g,"-").replace(/(^-|-$)/g,"") || ("p"+Date.now());
}
function saveProductFromForm(){
  const name=$("prodName").value.trim();
  if(!name) return alert("Anna nimi");
  const prod={
    id: editingProductId || slugId(name),
    name,
    category:$("prodCat").value,
    unit:$("prodUnit").value,
    gPerUnit:+($("prodGPer").value)||1,
    kcal100:+($("prodKcal100").value)||0,
    p100:+($("prodP100").value)||0,
    c100:+($("prodC100").value)||0,
    f100:+($("prodF100").value)||0,
    ean:$("prodEan").value.trim(),
  };
  const idx=state.products.findIndex(p=>p.id===prod.id);
  if(idx>=0) state.products[idx]=prod; else state.products.push(prod);
  saveState(); closeModal("productModal"); toast("Tallennettu"); render();
}
function deleteProduct(){
  if(!editingProductId) return;
  if(!confirm("Haluatko varmasti poistaa tuotteen?")) return;
  state.products=state.products.filter(p=>p.id!==editingProductId);
  delete state.favorites[editingProductId];
  saveState(); closeModal("productModal"); toast("Poistettu"); render();
}


function openQtyEdit(entryIndex){
  const d=state.selectedDay;
  const log=ensureDayLog(d);
  const e=log[entryIndex]; if(!e) return;
  const prod=getProduct(e.productId); if(!prod) return;
  qtyContext={mode:"edit", entryIndex, productId:e.productId, meal:e.meal, date:d};
  $("qtyTitle").textContent=prod.name;
  $("qtyMeta").textContent=`${MEALS.find(m=>m.key===e.meal)?.label||""} • yksikkö: ${e.unit} • g/yks: ${prod.gPerUnit||""}`;
  $("qtyValue").value=String(e.qty);
  $("qtyDelete").style.display="block";
  openModal("qtyModal");
}

function openQty(productId,mode){
  const prod=getProduct(productId); if(!prod) return;
  qtyContext={mode:"add", productId, meal:selectedMeal, date:state.selectedDay};
  $("qtyTitle").textContent=prod.name;
  $("qtyMeta").textContent=`${MEALS.find(m=>m.key===selectedMeal)?.label||""} • yksikkö: ${prod.unit} • g/yks: ${prod.gPerUnit||""}`;
  $("qtyValue").value="1";
  $("qtyDelete").style.display="none";
  openModal("qtyModal");
}
function stepQty(d){ $("qtyValue").value=String(r1(Math.max(0,(+($("qtyValue").value)||0)+d))); }
function confirmQty(){
  if(!qtyContext) return;
  const prod=getProduct(qtyContext.productId); if(!prod) return;
  const qty=+($("qtyValue").value)||0;
  const log=ensureDayLog(qtyContext.date);
  if(qtyContext.mode==="edit"){
    const e=log[qtyContext.entryIndex];
    if(e){ e.qty=qty; e.unit=prod.unit; e.meal=qtyContext.meal; }
    saveState(); closeModal("qtyModal"); toast("Päivitetty"); render();
  } else {
    log.push({productId:qtyContext.productId,qty,unit:prod.unit,meal:qtyContext.meal,ts:Date.now()});
    saveState(); closeModal("qtyModal"); toast("Lisätty"); render();
  }
}
function deleteQty(){
  if(!qtyContext||qtyContext.mode!=="edit") return;
  if(!confirm("Poistetaanko tämä kirjattu ruoka?")) return;
  const log=ensureDayLog(qtyContext.date);
  log.splice(qtyContext.entryIndex,1);
  saveState(); closeModal("qtyModal"); toast("Poistettu"); render();
}


function openMealsModal(){
  mealsView={level:"meals", meal:null};
  renderMealsModal();
  openModal("mealsModal");
}
function renderMealsModal(){
  const d=state.selectedDay;
  const log=ensureDayLog(d);
  const cont=$("mealsContent"); cont.innerHTML="";
  if(mealsView.level==="meals"){
    // group by meal
    const groups={};
    log.forEach((e,idx)=>{ (groups[e.meal]=groups[e.meal]||[]).push({e,idx}); });
    MEALS.forEach(m=>{
      const arr=groups[m.key]||[];
      if(!arr.length) return;
      let kcal=0,p=0,c=0,f=0;
      arr.forEach(({e})=>{
        const prod=getProduct(e.productId); if(!prod) return;
        const g=unitToGrams(prod,e.qty,e.unit);
        const mm=macrosFor(prod,g);
        kcal+=mm.kcal; p+=mm.p; c+=mm.c; f+=mm.f;
      });
      const row=document.createElement("button");
      row.className="rowbtn";
      row.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div><b>${m.label}</b><div class="muted">${Math.round(p)}P • ${Math.round(c)}C • ${Math.round(f)}F</div></div>
        <div style="text-align:right"><b>${Math.round(kcal)}</b> kcal</div>
      </div>`;
      row.addEventListener("click",()=>{ mealsView={level:"foods", meal:m.key}; renderMealsModal(); });
      cont.appendChild(row);
    });
  }else{
    const mealKey=mealsView.meal;
    const back=document.createElement("button");
    back.className="rowbtn";
    back.innerHTML="← Takaisin aterioihin";
    back.addEventListener("click",()=>{ mealsView={level:"meals", meal:null}; renderMealsModal(); });
    cont.appendChild(back);

    log.forEach((e,idx)=>{
      if(e.meal!==mealKey) return;
      const prod=getProduct(e.productId); if(!prod) return;
      const g=unitToGrams(prod,e.qty,e.unit);
      const mm=macrosFor(prod,g);
      const row=document.createElement("button");
      row.className="rowbtn";
      row.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center;gap:10px">
        <div><b>${prod.name}</b><div class="muted">${r1(e.qty)} ${e.unit} • ${Math.round(mm.p)}P ${Math.round(mm.c)}C ${Math.round(mm.f)}F</div></div>
        <div style="text-align:right"><b>${Math.round(mm.kcal)}</b> kcal</div>
      </div>`;
      row.addEventListener("click",()=>openQtyEdit(idx));
      cont.appendChild(row);
    });
  }
}


async function offSearch(){
  const q=$("offQuery").value.trim();
  if(!q){$("offStatus").textContent="Kirjoita hakusana."; return;}
  $("offStatus").textContent="Haetaan…";
  $("offResults").innerHTML="";
  try{
    const url=`https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(q)}&search_simple=1&action=process&json=1&page_size=20`;
    const res=await fetch(url);
    const data=await res.json();
    const items=(data.products||[]).filter(p=>p.product_name);
    if(!items.length){$("offStatus").textContent="Ei tuloksia."; return;}
    $("offStatus").textContent=`Löytyi ${items.length}`;
    for(const p of items.slice(0,10)){
      const kcal = nutr(p,"energy-kcal_100g") ?? guessKcal(p);
      const prot = nutr(p,"proteins_100g");
      const carb = nutr(p,"carbohydrates_100g");
      const fat  = nutr(p,"fat_100g");
      const row=document.createElement("div"); row.className="item";
      row.innerHTML=`<div class="left" style="gap:12px"><div style="min-width:0"><div class="name">${esc(p.product_name)}</div><div class="meta">${esc(p.brands||"")} ${p.code?("• "+p.code):""}</div></div></div><div class="right">${kcal??"—"} kcal/100g</div>`;
      row.onclick=()=>{
        $("prodName").value=p.product_name;
        $("prodEan").value=p.code||"";
        if(kcal!=null) $("prodKcal100").value=String(kcal);
        if(prot!=null) $("prodP100").value=String(prot);
        if(carb!=null) $("prodC100").value=String(carb);
        if(fat!=null) $("prodF100").value=String(fat);
        $("prodUnit").value="g"; $("prodGPer").value="1";
        $("offStatus").textContent="Tiedot siirretty kenttiin. Tallenna ✓";
        $("offResults").innerHTML="";
      };
      $("offResults").appendChild(row);
    }
  }catch(e){
    $("offStatus").textContent="Virhe haussa.";
  }
}
function nutr(p,key){
  const n=p.nutriments||{};
  const v=n[key];
  if(v==null||v==="") return null;
  const num=+v;
  return Number.isFinite(num)?r1(num):null;
}
function guessKcal(p){
  const n=p.nutriments||{};
  const kj=n["energy-kj_100g"];
  const num=+kj;
  return Number.isFinite(num)?r0(num/4.184):null;
}

function renderRecommendation(){
  const d=state.selectedDay;
  const tot=dayTotals(d);
  const target=computedTarget();
  $("recStatus").textContent=`Jäljellä ~${Math.max(0,target-tot.kcal)} kcal, proteiinia ~${Math.max(0,(state.goals.p||0)-tot.p)} g`;
  const card=$("recCard"); card.innerHTML="";
  const cand=state.products.slice().sort((a,b)=>(+b.p100||0)-(+a.p100||0)).slice(0,3);
  if(!cand.length){ card.textContent="Lisää ensin tuotteita."; return; }
  for(const p of cand){
    const row=document.createElement("div"); row.className="item";
    row.innerHTML=`<div class="left"><div class="heart ${state.favorites[p.id]?"on":""}" style="opacity:.6">♥</div><div style="min-width:0"><div class="name">${esc(p.name)}</div><div class="meta">Ehdotus</div></div></div><div class="right">${p.kcal100}/100g</div>`;
    row.onclick=()=>{ openQty(p.id,"add"); };
    card.appendChild(row);
  }
}

function esc(s){return String(s).replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#039;"}[c]));}

document.addEventListener("DOMContentLoaded", init);
function setupSwipeToClose(modalId, closeBtnId){
  const modal=$(modalId);
  if(!modal) return;
  const sheet=modal.querySelector(".sheet");
  if(!sheet) return;
  let y0=null, t0=0;
  sheet.addEventListener("touchstart",(ev)=>{
    if(!ev.touches||!ev.touches.length) return;
    y0=ev.touches[0].clientY; t0=Date.now();
  },{passive:true});
  sheet.addEventListener("touchmove",(ev)=>{
    if(y0==null) return;
    const y=ev.touches[0].clientY;
    const dy=y-y0;
    if(dy>80 && Date.now()-t0<800){
      y0=null;
      closeModal(modalId);
    }
  },{passive:true});
  // also allow background tap
  modal.addEventListener("click",(ev)=>{ if(ev.target===modal) closeModal(modalId); });
  const btn=$(closeBtnId);
  if(btn) btn.addEventListener("click",()=>closeModal(modalId));
}


let recipeCtx=null;

function openRecipeModal(){
  recipeCtx={items:[]};
  // fill category options
  const sel=$("recipeCat");
  sel.innerHTML = PRODUCT_CATS.map(c=>`<option value="${c}">${c}</option>`).join("");
  $("recipeName").value="";
  addRecipeItem();
  recalcRecipe();
  openModal("recipeModal");
}

function productOptionsHtml(){
  return state.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join("");
}
function addRecipeItem(){
  const id = state.products[0]?.id || "";
  recipeCtx.items.push({productId:id, qty:1, unit:"g"});
  renderRecipeItems();
}
function removeRecipeItem(i){
  recipeCtx.items.splice(i,1);
  if(recipeCtx.items.length===0) addRecipeItem();
  renderRecipeItems();
}
function renderRecipeItems(){
  const cont=$("recipeItems");
  cont.innerHTML="";
  recipeCtx.items.forEach((it,i)=>{
    const row=document.createElement("div");
    row.className="recipeRow";
    row.innerHTML = `
      <select class="input" data-role="prod">${productOptionsHtml()}</select>
      <input class="input mini" data-role="qty" inputmode="decimal" value="${it.qty}">
      <select class="input mini" data-role="unit">
        <option value="g">g</option>
        <option value="kg">kg</option>
        <option value="annos">annos</option>
        <option value="kpl">kpl</option>
        <option value="dl">dl</option>
        <option value="rkl">rkl</option>
        <option value="tl">tl</option>
        <option value="viipale">viipale</option>
        <option value="siivu">siivu</option>
        <option value="pullo">pullo</option>
        <option value="purkki">purkki</option>
      </select>
      <button class="btn danger rm" title="Poista">🗑</button>
    `;
    const prodSel=row.querySelector('[data-role="prod"]');
    const qtyIn=row.querySelector('[data-role="qty"]');
    const unitSel=row.querySelector('[data-role="unit"]');
    const rm=row.querySelector(".rm");
    prodSel.value=it.productId;
    unitSel.value=it.unit;
    prodSel.addEventListener("change",()=>{ it.productId=prodSel.value; recalcRecipe(); });
    qtyIn.addEventListener("input",()=>{ it.qty=+qtyIn.value||0; recalcRecipe(); });
    unitSel.addEventListener("change",()=>{ it.unit=unitSel.value; recalcRecipe(); });
    rm.addEventListener("click",()=>removeRecipeItem(i));
    cont.appendChild(row);
  });
  recalcRecipe();
}
function recalcRecipe(){
  if(!recipeCtx) return;
  let kcal=0,p=0,c=0,f=0,totalG=0;
  recipeCtx.items.forEach(it=>{
    const prod=getProduct(it.productId); if(!prod) return;
    const g=unitToGrams(prod,it.qty,it.unit);
    totalG += g;
    const mm=macrosFor(prod,g);
    kcal+=mm.kcal; p+=mm.p; c+=mm.c; f+=mm.f;
  });
  $("recipeTotKcal").textContent=String(Math.round(kcal));
  $("recipeTotP").textContent=String(Math.round(p));
  $("recipeTotC").textContent=String(Math.round(c));
  $("recipeTotF").textContent=String(Math.round(f));
  recipeCtx.total={kcal,p,c,f,totalG};
}
function saveRecipe(){
  const name=($("recipeName").value||"").trim();
  if(!name){ alert("Anna reseptille nimi"); return; }
  const cat=$("recipeCat").value||"Päivällinen";
  const tot=recipeCtx?.total; if(!tot||tot.totalG<=0){ alert("Lisää ainekset"); return; }
  const id="r_"+Math.random().toString(36).slice(2,9);
  const kcal100 = tot.kcal / tot.totalG * 100;
  const p100 = tot.p / tot.totalG * 100;
  const c100 = tot.c / tot.totalG * 100;
  const f100 = tot.f / tot.totalG * 100;
  const prod={id,name,category:cat,unit:"annos",gPerUnit:Math.round(tot.totalG),kcal100:r1(kcal100),p100:r1(p100),c100:r1(c100),f100:r1(f100),ean:""};
  state.products.unshift(prod);
  saveState();
  closeModal("recipeModal");
  toast("Resepti tallennettu");
  render();
}


