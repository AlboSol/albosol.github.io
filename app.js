
// Ruokasi baseline v3.4.0.0 (build 20260204235421)
const STORAGE_KEY="ruokasi.v2";
const VERSION="v3.4.0.0";
const KCAL_PER_STEP=0.04;
const $=id=>document.getElementById(id);

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
    mk("maitorahka","Maitorahka","Aamiainen","annos",250,60,10,4,0),
    mk("kahvi","Kahvi","Juomat","kpl",200,1,0,0,0),
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
function loadState(){
  try{
    const raw=localStorage.getItem(STORAGE_KEY);
    if(!raw) return defaultState();
    const s=JSON.parse(raw);
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
let editingProductId=null;
let qtyContext=null;

const saveState=()=>localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
const ensureDayLog=(d)=>state.logs[d]||(state.logs[d]=[]);
const getProduct=(id)=>state.products.find(p=>p.id===id);
const computedTarget=()=>r0((+state.goals.baseKcal||0)+(+state.activity.workoutKcal||0)+(+state.activity.stepGoal||0)*KCAL_PER_STEP);

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
  $("prodCancel").onclick=()=>closeModal("productModal");
  $("prodSave").onclick=()=>saveProductFromForm();
  $("prodDelete").onclick=()=>deleteProduct();
  $("offSearchBtn").onclick=()=>offSearch();

  $("qtyCancel").onclick=()=>closeModal("qtyModal");
  $("qtyConfirm").onclick=()=>confirmQty();
  $("qtyMinus").onclick=()=>stepQty(-1);
  $("qtyPlus").onclick=()=>stepQty(1);
  $("qtyDelete").onclick=()=>deleteQty();

  $("mealsClose").onclick=()=>closeModal("mealsModal");
  $("refreshRecBtn").onclick=()=>renderRecommendation();

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
  $("eatenKpi").textContent=tot.kcal;
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

  const circ=2*Math.PI*46;
  const pct=target?clamp(tot.kcal/target,0,1):0;
  $("ringArc").setAttribute("stroke-dasharray",`${pct*circ} ${circ}`);

  renderProductList();
  renderRecommendation();
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

function openQty(productId,mode){
  const prod=getProduct(productId); if(!prod) return;
  qtyContext={mode, productId, meal:selectedMeal, date:state.selectedDay};
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
  ensureDayLog(qtyContext.date).push({productId:qtyContext.productId,qty,unit:prod.unit,meal:qtyContext.meal,ts:Date.now()});
  saveState(); closeModal("qtyModal"); toast("Lisätty"); render();
}
function deleteQty(){ /* reserved */ }

function openMealsModal(){
  const d=state.selectedDay;
  const agg=mealAgg(d);
  const cont=$("mealsContent"); cont.innerHTML="";
  for(const m of MEALS){
    const b=agg[m.key]||{kcal:0,items:new Map()};
    const sec=document.createElement("div");
    sec.className="item";
    sec.style.flexDirection="column";
    sec.style.alignItems="stretch";
    sec.innerHTML=`<div style="display:flex;justify-content:space-between;align-items:center"><div style="font-weight:900">${m.label}</div><div style="font-weight:900">${r0(b.kcal)} kcal</div></div>`;
    if(b.items.size){
      for(const [pid,v] of b.items.entries()){
        const prod=getProduct(pid); if(!prod) continue;
        const row=document.createElement("div");
        row.style.display="flex";row.style.justifyContent="space-between";row.style.alignItems="center";
        row.style.marginTop="8px";row.style.paddingTop="8px";row.style.borderTop="1px solid rgba(255,255,255,0.10)";
        row.innerHTML=`<div style="min-width:0"><div style="font-weight:850;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(prod.name)}</div><div style="color:rgba(255,255,255,0.62);font-size:13px">${r1(v.qty)} ${esc(prod.unit)} • ${r0(v.kcal)} kcal</div></div>`;
        sec.appendChild(row);
      }
    }else{
      const none=document.createElement("div"); none.style.marginTop="8px"; none.style.color="rgba(255,255,255,0.55)"; none.textContent="—";
      sec.appendChild(none);
    }
    cont.appendChild(sec);
  }
  openModal("mealsModal");
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
