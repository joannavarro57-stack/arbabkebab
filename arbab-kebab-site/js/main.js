/* ================= STORE DETAILS (edit me) =================
   Database keys and GCash details live in config.js (shared with pay.html). */
const STORE = {
  name: "Arbab Kebab",
  phone: "+639700910888",
  phoneDisplay: "+63 970 091 0888",
  email: "arabiya.official@gmail.com",
  facebook: "https://www.facebook.com/ArbabKebabOfficial",
  branches: [{name: "Malolos", lat: 14.8433, lng: 120.8114}],   // real list lives in config.js
  payments: {
    Delivery: ["Cash on Delivery", "GCash"],
    "Pick-Up": ["Cash", "GCash"]
  },
  currency: "₱",
  supabaseUrl: "https://addfbbpqhxsinedvnnme.supabase.co",
  supabaseKey: "sb_publishable_vNys_OaZ_iVP1bfJj64Qhw_QQvyEaQp"
};
Object.assign(STORE, window.SITE_CONFIG || {});   // values from config.js win

/* ================= MENU =================
   The live menu is edited in the admin site (Menu tab) and loaded from Supabase.
   The list below is only the fallback if the database can't be reached.
   Each item: id, cat, name, desc, price, optional tag, optional img URL,
   optional options: [{label, choices:[{name, add}] }]  (add = extra peso cost)        */
const EXTRA_KABSA_RICE = {label:"Extra Kabsa Rice", choices:[{name:"No extra rice",add:0},{name:"Add Kabsa Rice",add:170}]};
/* categories can also be set in config.js (menuCategories) — the admin Menu tab uses the same list */
const MENU_CATS = STORE.menuCategories || [
  {id:"MealSets", name:"Meal Sets", sub:""},
  {id:"Potluck", name:"Potlucks", sub:""},
  {id:"Salads", name:"Salads", sub:""},
  {id:"Solo", name:"Solo Orders", sub:""},
  {id:"Fried", name:"Fried", sub:""},
  {id:"AddOns", name:"Add-Ons", sub:""},
  {id:"Wraps", name:"Wraps", sub:""},
  {id:"Drinks", name:"Drinks", sub:""},
  {id:"Sauces", name:"Sauces", sub:""}
];

//REMOVE SPICE LEVEL
const MENU = [
  //Meal Sets
  {id:"MS1", cat:"MealSets", name:"Shawaya Set 1", desc:"Whole chicken served with tomato chutney and garlic paste", price:375, tag:"Bestseller", options:[EXTRA_KABSA_RICE], img:"images/Shawaya_1.png"},
  {id:"MS2", cat:"MealSets", name:"Shawaya Set 2", desc:"Whole chicken with 2 cups of rice, served with tomato chutney and garlic paste", price:475, options:[EXTRA_KABSA_RICE], img:"images/Shawaya_2.png"},
  {id:"MS3", cat:"MealSets", name:"Shawaya Set 3", desc:"Whole chicken with 4 pcs Arabic bread and fries platter, served with tomato chutney and garlic paste", price:595, tag:"Must try", options:[EXTRA_KABSA_RICE], img:"images/Shawaya_3.png"},
  {id:"MS4", cat:"MealSets", name:"Shawaya Set 4", desc:"Whole chicken with 4 cups of rice and your choice of salad, served with tomato chutney and garlic paste.", price:695, options:[EXTRA_KABSA_RICE,{label:"Salad",choices:[{name:"Fattoush",add:0},{name:"Tabbouleh",add:0}]}], img:"images/Shawaya_4.png"},
  //Potluck
  {id:"PL1", cat:"Potluck", name:"Potluck", desc:"Good for 4-6 pax.", price:995, options:[EXTRA_KABSA_RICE], img:"images/Potluck.png"},
  {id:"PL2", cat:"Potluck", name:"Shawaya Potluck", desc:"	Good for 4–6 pax", price:1299, options:[{label:"Skewers",choices:[{name:"2 skewers",add:0},{name:"3 skewers",add:70}]},EXTRA_KABSA_RICE], img:"images/S_Potluck.png"},
  //Salads
  {id:"SLD1", cat:"Salads", name:"Fattoush", desc:"Fresh greens with bread crisps", price:179, img:"images/Fattoush.png"},
  {id:"SLD2", cat:"Salads", name:"Tabbouleh", desc:"Fresh parsley, tomato, onions and other greens with olive oil and lemon dressing", price:229, img:"images/Tabouleh.png"},
  //Solo Orders
  {id:"sloKC", cat:"Solo", name:"Kabsa Chicken", desc:"Charcoal-grilled quarter chicken, served with tomato chutney", price:260, img:"images/Kabsa_Chk.png"},
  {id:"sloKB", cat:"Solo", name:"Kabsa Beef", desc:"Tender beef chunks, served with tomato chutney", price:350,  img:"images/Kabsa_Bf.png"},
  {id:"sloCB", cat:"Solo", name:"Chicken Biryani", desc:"Served with yogurt salad (raita)", price:290, img:"images/Chk_Biryani.png"},
  {id:"sloGHC", cat:"Solo", name:"Grilled Half Chicken", desc:"Charcoal-grilled half chicken with Arabic bread and fries platter, served with garlic paste and BBQ sauce", price:375, tag:"Fan favorite",img:"images/GrilledChk_hf.png"},
  {id:"sloBKR", cat:"Solo", name:"Beef Kebab with Rice", desc:"Choose between 1 or 2 piece kebabs", price:195, options:[{label:"Kebab count",choices:[{name:"1 piece",add:0},{name:"2 pieces",add:95}]}], img:"images/Bf_Kebab.png"},
  {id:"sloCKR", cat:"Solo", name:"Chicken Kebab with Rice", desc:"Choose between 1 or 2 piece kebabs", price:170, options:[{label:"Kebab count",choices:[{name:"1 piece",add:0},{name:"2 pieces",add:70}]}], img:"images/Chk_Kebab.png"},
  //Fried
  {id:"ChkW", cat:"Fried", name:"Chicken Wings", desc:"Crispy chicken wings with fries, served with BBQ sauce · 6 pcs / 12 pcs", price:180, options:[{label:"Wings count",choices:[{name:"6 pcs",add:0},{name:"12 pcs",add:110}]}], img:"images/Chk_Wings.png"},
  {id:"Falafel", cat:"Fried", name:"Fried Falafel", desc:"6 pcs, served with tzatziki sauce", price:150, img:"images/Falafel.png"},
  {id:"FFries", cat:"Fried", name:"Fries Platter", desc:"Served with BBQ sauce", price:150, img:"images/Fries_Pltr.png"},
  //Wraps
  {id:"BKS", cat:"Wraps", name:"Beef Kebab Shawarma", desc:"", price:150, img:"images/Bf_Kbb_Shwrma.png"},
  {id:"CSma", cat:"Wraps", name:"Chicken Shawarma", desc:"", price:135, img:"images/Chk_Shwrma.png"},
  {id:"CKS", cat:"Wraps", name:"Chicken Kebab Shawarma", desc:"", price:130, img:"images/Chk_Kbb_Shwrma.png"},
  {id:"FLW", cat:"Wraps", name:"Falafel Wrap", desc:"", price:130, img:"images/Falafel_Shwrma.png"},
  //AddOns
  {id:"BTR_Chk", cat:"AddOns", name:"Buttered Chicken", desc:"", price:195, img:"images/BTTR_Chk.png"},
  {id:"CHN_Msla", cat:"AddOns", name:"Chana Masala", desc:"Served with 1 pc Arabic bread", price:150, img:"images/CHNA_MSLA.png"},
  {id:"Hms", cat:"AddOns", name:"Hummus", desc:"", price:150, img:"images/Hms.png"},
  {id:"Kbs_Rice", cat:"AddOns", name:"Kabsa Rice", desc:"", price:170, img:"images/Kabsa_Rice.png"},
  //Drinks
  {id:"SY", cat:"Drinks", name:"Sweetened Yogurt", desc:"", price:110, img:"images/SYogurt.png"},
  {id:"WM", cat:"Drinks", name:"Watermelon Juice", desc:"", price:90, img:"images/WM.png"},
  {id:"CL", cat:"Drinks", name:"Cucumber Lemon", desc:"", price:95, img:"images/CL.png"},
  {id:"Chai", cat:"Drinks", name:"Karak Chai", desc:"", price:75, img:"images/chai.png"},
  {id:"Ali", cat:"Drinks", name:"Ali Cafe", desc:"", price:50, img:"images/alicafe.png"},
 //Sauces
  {id:"S1", cat:"Sauces", name:"Pickles", desc:"", price:30, img:"images/pickles.png"},
  {id:"S2", cat:"Sauces", name:"BBQ Sauce", desc:"", price:30, img:"images/bbq.png"},
  {id:"S3", cat:"Sauces", name:"Raita", desc:"yogurt salad", price:30, img:"images/raita.png"},
  {id:"S4", cat:"Sauces", name:"Garlic Paste", desc:"", price:80, img:"images/gpaste.png"},
  {id:"S5", cat:"Sauces", name:"Tomato Chutney", desc:"", price:30, img:"images/chutney.png"},
 
 
];

/* ================= APP ================= */
const $ = s => document.querySelector(s);
const peso = n => STORE.currency + n.toLocaleString("en-PH");
const esc = s => String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const store = {
  get(k){ try{ return JSON.parse(localStorage.getItem(k)); }catch(e){ return null; } },
  set(k,v){ try{ localStorage.setItem(k, JSON.stringify(v)); }catch(e){} }
};
let cart = store.get("ak_cart") || [];   // [{key,id,name,opts,unit,qty}]

/* static bits */
$("#yr").textContent = new Date().getFullYear();
$("#callHero").href = "tel:" + STORE.phone;
$("#phoneLink").href = "tel:" + STORE.phone; $("#phoneLink").textContent = STORE.phoneDisplay;
$("#mailLink").href = "mailto:" + STORE.email; $("#mailLink").textContent = STORE.email;
$("#fbLink").href = STORE.facebook;
/* branches come from config.js — each is {name, lat, lng, address, hours} (a plain name also works) */
const BRANCHES = (STORE.branches || []).map(b => typeof b === "string" ? {name: b} : b).filter(b => b && b.name);
if(!BRANCHES.length) BRANCHES.push({name: "Malolos", lat: 14.8433, lng: 120.8114});
/* keep this markup in step with branchItem() in tools/update-seo.mjs (it pre-renders the same list for search engines) */
const branchPlace = b => [b.city && b.city !== b.name ? b.city : "", b.region].filter(Boolean).join(", ");
$("#branchList").innerHTML = BRANCHES.map(b => `<li>${esc(b.name)} branch`
    + (branchPlace(b) ? ` <span class="note" style="color:#c9bba6">· ${esc(branchPlace(b))}</span>` : "")
    + (b.address ? `<br><span class="note" style="color:#c9bba6">${esc(b.address)}</span>` : "")
    + (b.hours ? `<br><span class="note" style="color:#c9bba6">${esc(b.hours)}</span>` : "") + `</li>`).join("")
  + (BRANCHES.some(b => b.hours) ? "" : `<li class="note" style="color:#c9bba6">Message us for today's hours.</li>`);
$("#branch").innerHTML = BRANCHES.map(b => `<option>${esc(b.name)}</option>`).join("");
$("#branchBadge").textContent = BRANCHES.length > 1 ? `${BRANCHES.length} branches` : BRANCHES[0].name;

/* ================= SCROLL REVEALS =================
   Sections, headings and cards ease in as they scroll into view (styles under "motion" in css/main.css).
   Content is only ever hidden here, by JS, so search engines and no-JS visitors always see everything.
   Off when the visitor's device asks for reduced motion. */
const MOTION = !matchMedia("(prefers-reduced-motion: reduce)").matches && "IntersectionObserver" in window;
if(MOTION) document.documentElement.classList.add("js-motion");
const REVEAL_SEL = ".cat h3, .card, .menu-head h2, .about h2, .about > p, .faq details, .info .wrap > div";
const revealObs = MOTION ? new IntersectionObserver(entries => entries.forEach(en => {
  if(!en.isIntersecting) return;
  en.target.classList.add("in");
  revealObs.unobserve(en.target);
}), {rootMargin: "0px 0px -8% 0px", threshold: 0.12}) : null;
function revealIn(root, instant = false){
  if(!revealObs || instant) return;   // instant: e.g. search results while typing
  const vh = window.innerHeight;
  root.querySelectorAll(REVEAL_SEL).forEach(el => {
    if(el.classList.contains("reveal")) return;
    const r = el.getBoundingClientRect();
    if(r.top < vh && r.bottom > 0) return;   // already on screen — never hide what someone is looking at
    const i = Array.prototype.indexOf.call(el.parentElement.children, el);
    // cards: left column first, right column a beat later; lists/columns: a gentle cascade
    el.style.setProperty("--d", (el.matches(".card") ? (i % 2) * 90 : el.matches(".faq details, .info .wrap > div") ? Math.min(i, 5) * 70 : 0) + "ms");
    el.classList.add("reveal");
    revealObs.observe(el);
  });
}

/* render menu */
function renderMenu(q=""){
  q = q.trim().toLowerCase();
  const tabs = [], blocks = [];
  MENU_CATS.forEach(c => {
    const items = MENU.filter(m => m.cat===c.id && (!q || (m.name+" "+m.desc).toLowerCase().includes(q)));
    if(!items.length) return;
    tabs.push(`<button class="tab" data-cat="${c.id}">${esc(c.name)}</button>`);
    blocks.push(`<section class="cat" id="cat-${c.id}"><div class="cat-inner"><h3>${esc(c.name)}</h3>${c.sub?`<p class="sub">${esc(c.sub)}</p>`:""}<div class="grid">${items.map(card).join("")}</div></div></section>`);
  });
  $("#tabs").innerHTML = tabs.join("");
  $("#cats").innerHTML = blocks.length ? blocks.join("") : `<p class="empty">No dishes match “${esc(q)}”.</p>`;
  const first = $("#tabs .tab"); if(first) first.classList.add("on");
  revealIn($("#cats"), !!q);
}
/* local photos in images/ also ship as sharper, lighter .webp files — use those, falling back to the original */
const webpOf = u => /^images\/[^/?#]+\.png$/i.test(u) ? u.replace(/\.png$/i, ".webp") : u;
function thumbFail(img){
  const orig = img.dataset.orig;
  if(orig && !img.src.endsWith(orig)){ img.src = orig; return; }
  img.replaceWith(Object.assign(document.createElement("div"), {className:"ph", innerHTML:`<span>${esc(img.dataset.initials || "")}</span>`}));
}
function card(m){
  const initials = m.name.split(" ").slice(0,2).map(w=>w[0]).join("");
  return `<article class="card">
    <div class="thumb">${m.img?`<img src="${esc(webpOf(m.img))}" data-orig="${esc(m.img)}" data-initials="${esc(initials)}" alt="${esc(m.name)}" width="300" height="300" loading="lazy" decoding="async" onerror="if(window.thumbFail)thumbFail(this);else{this.onerror=null;this.src=this.dataset.orig}">`:`<div class="ph" aria-hidden="true"><span>${esc(initials)}</span></div>`}</div>
    <div class="body">${m.tag?`<span class="tag">${esc(m.tag)}</span>`:""}<div class="name">${esc(m.name)}</div><div class="desc">${esc(m.desc||"")}</div>
      <div class="row"><span class="price">${peso(m.price)}</span>
      <button class="add" data-add="${m.id}" aria-label="Add ${esc(m.name)}">Add</button></div></div>
  </article>`;
}
/* live menu from Supabase (admin → Menu tab); last good copy is cached so repeat visits show it straight away */
function useMenu(rows){
  if(!Array.isArray(rows) || !rows.length) return false;
  MENU.splice(0, MENU.length, ...rows.map(r => ({id:r.id, cat:r.cat, name:r.name, desc:r.description || "", price:Number(r.price) || 0,
    tag:r.tag || "", img:r.img || "", options:Array.isArray(r.options) ? r.options : []})));
  // keep prices in a saved cart in step with the menu
  cart.forEach(l => {
    const m = MENU.find(x => x.id === l.id); if(!m) return;
    l.unit = m.price + (m.options || []).reduce((s,o) => s + ((o.choices || []).find(c => l.opts.includes(c.name)) || {add:0}).add, 0);
  });
  return true;
}
useMenu(store.get("ak_menu"));
renderMenu();
revealIn(document);   // the rest of the page: menu title, About, FAQ, info columns
(async () => {
  if(!STORE.supabaseUrl || !STORE.supabaseKey) return;
  try{
    const headers = {apikey: STORE.supabaseKey};
    if(!STORE.supabaseKey.startsWith("sb_")) headers.Authorization = "Bearer " + STORE.supabaseKey;
    const r = await fetch(STORE.supabaseUrl.replace(/\/$/,"") + "/rest/v1/menu_items?select=id,cat,name,description,price,tag,img,options&order=sort.asc,name.asc", {headers});
    if(!r.ok) return;
    const rows = await r.json();
    if(!useMenu(rows)) return;
    store.set("ak_menu", rows);
    renderMenu($("#q").value); watch(); save();
  }catch(e){}
})();
$("#q").addEventListener("input", e => renderMenu(e.target.value));
$("#searchToggle").addEventListener("click", () => {
  const search = $("#menuSearch"), input = $("#q"), toggle = $("#searchToggle");
  const opening = !search.classList.contains("open");
  search.classList.toggle("open", opening);
  toggle.setAttribute("aria-expanded", String(opening));
  toggle.setAttribute("aria-label", opening ? "Close menu search" : "Open menu search");
  input.tabIndex = opening ? 0 : -1;
  if(opening) input.focus();
  else if(input.value){
    input.value = "";
    renderMenu();
    watch();
  }
});
$("#q").addEventListener("keydown", e => {
  if(e.key === "Escape") $("#searchToggle").click();
});
$("#tabs").addEventListener("click", e => {
  const t = e.target.closest(".tab"); if(!t) return;
  document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on", x===t));
  const el = document.getElementById("cat-"+t.dataset.cat); if(el) el.scrollIntoView({behavior:"smooth"});
});
/* highlight tab on scroll */
const obs = new IntersectionObserver(es => es.forEach(en => {
  if(en.isIntersecting){ const id = en.target.id.replace("cat-",""); document.querySelectorAll(".tab").forEach(x=>x.classList.toggle("on", x.dataset.cat===id)); }
}), {rootMargin:"-140px 0px -60% 0px"});
const watch = () => { obs.disconnect(); document.querySelectorAll(".cat").forEach(s=>obs.observe(s)); };
watch(); $("#q").addEventListener("input", watch);

/* item options modal */
let cur = null, curQty = 1, editIndex = null;
function openItemModal(m, line=null, index=null){
  cur = m;
  curQty = line ? line.qty : 1;
  editIndex = index;
  $("#mTitle").textContent = m.name;
  $("#mDesc").textContent = m.desc || "";
  $("#mAction").textContent = line ? "Save changes" : "Add";
  $("#mOpts").innerHTML = (m.options || []).map((o,i)=>{
    const selected = line ? o.choices.findIndex(c=>line.opts.includes(c.name)) : 0;
    const selectedIndex = selected >= 0 ? selected : 0;
    return `<div class="opt-group"><p>${esc(o.label)}</p><div class="chips">${o.choices.map((c,j)=>`<label class="chip"><input type="radio" name="o${i}" value="${j}" ${j===selectedIndex?"checked":""}><span>${esc(c.name)}${c.add?` +${peso(c.add)}`:""}</span></label>`).join("")}</div></div>`;
  }).join("");
  updM();
  $("#modal").classList.add("open");
}
document.addEventListener("click", e => {
  const b = e.target.closest("[data-add]"); if(!b) return;
  const m = MENU.find(x=>x.id===b.dataset.add);
  if(!m.options || !m.options.length){ addToCart(m, [], 1); return; }
  openItemModal(m);
});
function chosen(){ return (cur.options || []).map((o,i)=>o.choices[+document.querySelector(`input[name=o${i}]:checked`).value]); }
function updM(){ const add = chosen().reduce((s,c)=>s+c.add,0); $("#mQty").textContent = curQty; $("#mPrice").textContent = peso((cur.price+add)*curQty); }
$("#mOpts").addEventListener("change", updM);
$("#mMinus").onclick = ()=>{ if(curQty>1){curQty--; updM();} };
$("#mPlus").onclick = ()=>{ curQty++; updM(); };
function closeItemModal(){ $("#modal").classList.remove("open"); editIndex=null; }
$("#mCancel").onclick = closeItemModal;
$("#modal").addEventListener("click", e=>{ if(e.target.id==="modal") closeItemModal(); });
$("#mAdd").onclick = ()=>{
  const opts = chosen();
  if(editIndex===null) addToCart(cur, opts, curQty);
  else {
    const index = editIndex, names = opts.map(o=>o.name);
    const unit = cur.price + opts.reduce((s,o)=>s+o.add,0);
    const key = cur.id + "|" + names.join("|");
    const existing = cart.findIndex((line,i)=>i!==index && line.key===key);
    if(existing>=0){ cart[existing].qty += curQty; cart.splice(index,1); }
    else cart[index] = {key,id:cur.id,name:cur.name,opts:names,unit,qty:curQty};
    save(); toast(`Updated ${cur.name}`);
  }
  closeItemModal();
};

/* cart */
function addToCart(m, opts, qty){
  const names = opts.map(o=>o.name), unit = m.price + opts.reduce((s,o)=>s+o.add,0);
  const key = m.id + "|" + names.join("|");
  const ex = cart.find(l=>l.key===key);
  if(ex) ex.qty += qty; else cart.push({key, id:m.id, name:m.name, opts:names, unit, qty});
  save(); toast(`Added ${m.name}`);
  const cb = $("#openCart"); cb.classList.remove("bump"); void cb.offsetWidth; cb.classList.add("bump");
}
function save(){ store.set("ak_cart", cart); renderCart(); }
function subtotal(){ return cart.reduce((s,l)=>s+l.unit*l.qty,0); }
function renderCart(){
  const n = cart.reduce((s,l)=>s+l.qty,0);
  $("#count").textContent = n;
  $("#barCount").textContent = n + (n===1?" item":" items");
  $("#barTotal").textContent = peso(subtotal());
  $("#bar").classList.toggle("show", n>0 && !$("#drawer").classList.contains("open"));
  $("#lines").innerHTML = cart.length ? cart.map((l,i)=>`<div class="line">
      <div class="line-main"><div class="ln">${esc(l.name)}</div>${l.opts.length?`<div class="lo">${esc(l.opts.join(" · "))}</div>`:""}
        <div class="line-actions"><button class="line-action" data-edit="${i}" aria-label="Edit ${esc(l.name)}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m14 5 5 5"/><path d="M4 20h4l11-11a2.1 2.1 0 0 0-4-4L4 16v4Z"/></svg>Edit</button>
        <button class="line-delete" data-remove="${i}" aria-label="Remove ${esc(l.name)}" title="Remove item"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6"/></svg></button></div>
      </div>
      <div class="line-pricing"><div class="lp">${peso(l.unit*l.qty)}</div><div class="lo">${peso(l.unit)} each</div>
        <div class="qty"><button data-dec="${i}" aria-label="Less">−</button><span>${l.qty}</span><button data-inc="${i}" aria-label="More">+</button></div>
      </div>
    </div>`).join("") : `<p class="empty">Your order is empty.<br>Add something masarap!</p>`;
  $("#totals").innerHTML = cart.length ? `<div><span>Subtotal</span><span>${peso(subtotal())}</span></div><div class="note"><span>Delivery fee</span><span>To be confirmed</span></div><div class="grand"><span>Estimated total</span><span>${peso(subtotal())}</span></div>` : "";
}
$("#lines").addEventListener("click", e=>{
  const edit=e.target.closest("[data-edit]"), remove=e.target.closest("[data-remove]");
  const d=e.target.closest("[data-dec]"), u=e.target.closest("[data-inc]");
  if(edit){
    const i=+edit.dataset.edit, line=cart[i], item=MENU.find(m=>m.id===line.id) || MENU.find(m=>m.name===line.name);
    if(!item){ toast("This menu item is no longer available to edit."); return; }
    openItemModal(item,line,i);
    return;
  }
  if(remove){ const i=+remove.dataset.remove, name=cart[i].name; cart.splice(i,1); save(); toast(`Removed ${name}`); return; }
  if(u){ cart[+u.dataset.inc].qty++; save(); }
  if(d){ const i=+d.dataset.dec; cart[i].qty--; if(cart[i].qty<=0) cart.splice(i,1); save(); }
});
function openCart(){ setTimeout(()=>{ if(typeof initPinMap==="function") initPinMap(); }, 350); $("#drawer").classList.add("open"); $("#drawer").setAttribute("aria-hidden","false"); $("#scrim").classList.add("open"); $("#bar").classList.remove("show"); $("#err").textContent=""; }
function closeCart(){ $("#drawer").classList.remove("open"); $("#drawer").setAttribute("aria-hidden","true"); $("#scrim").classList.remove("open"); renderCart(); }
$("#openCart").onclick = openCart; $("#barBtn").onclick = openCart;
$("#closeCart").onclick = closeCart; $("#scrim").onclick = closeCart;
document.addEventListener("keydown", e=>{ if(e.key==="Escape"){ closeCart(); closeItemModal(); } });

/* form: remember details, toggle address */
const saved = store.get("ak_details") || {};
["nm","ph","ad"].forEach(id=>{ if(saved[id]) $("#"+id).value = saved[id]; });
if(saved.br && BRANCHES.some(b => b.name === saved.br)) $("#branch").value = saved.br;   // last branch used
/* ================= DELIVERY PIN MAP =================
   Google Maps when googleMapsKey is set in config.js; otherwise (or if Google fails
   to load) the free Leaflet + OpenStreetMap / Esri satellite map. Both share the
   same pin, search and address helpers through a small adapter:
     setView(lat,lng,zoom) · getCenter() · setMarker(lat,lng) · resize()
     reverse(lat,lng) -> address text · search(query, center) -> [{title, sub, lat?, lng?, resolve?}] */
// where the delivery map starts: the chosen branch (from config.js), else the first branch with a location
function mapHome(){
  const has = b => b && isFinite(b.lat) && isFinite(b.lng) && b.lat !== "" && b.lng !== "";
  const sel = $("#branch") && BRANCHES.find(b => b.name === $("#branch").value);
  const b = has(sel) ? sel : BRANCHES.find(has);
  return b ? {lat: +b.lat, lng: +b.lng, zoom: 14} : {lat: 14.8433, lng: 120.8114, zoom: 14};
}
// "?gmkey=KEY" in the address tries a key on this visit only (for testing before editing config.js)
const GMAPS_KEY = String(new URLSearchParams(location.search).get("gmkey") || STORE.googleMapsKey || "").trim();
let pinMap = null, mapProvider = GMAPS_KEY ? "google" : "osm", mapStarting = null;
let pin = saved.pin && isFinite(saved.pin.lat) && isFinite(saved.pin.lng) ? saved.pin : null;
const mapAvailable = () => !!(GMAPS_KEY || window.L);
function rememberDetails(){ store.set("ak_details",{nm:$("#nm").value, ph:$("#ph").value, ad:$("#ad").value, br:$("#branch").value, pin}); }
function setPinStatus(text, ok){ const el = $("#pinStatus"); el.textContent = text; el.className = "note" + (ok ? " ok" : ""); }
const cleanAddress = t => String(t || "").split(", ")
  .map(x => x.replace(/^\d{4}\s+/, "")).filter(x => x && !/^\d{4}$/.test(x) && x !== "Philippines").join(", ");
function getMapView(){ try{ return localStorage.getItem("ak_map_view") === "Street map" ? "Street map" : "Satellite"; }catch(e){ return "Satellite"; } }
function saveMapView(v){ try{ localStorage.setItem("ak_map_view", v); }catch(e){} }

/* nearest branch to a point (straight-line distance), using the branch locations in config.js */
function kmBetween(a, b){
  const R = 6371, rad = x => x * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
function nearestBranch(p){
  let best = null;
  BRANCHES.forEach(b => {
    if(!isFinite(b.lat) || !isFinite(b.lng) || b.lat === "" || b.lng === "") return;
    const km = kmBetween(p, {lat: +b.lat, lng: +b.lng});
    if(!best || km < best.km) best = {name: b.name, km};
  });
  return best;
}
let branchNote = "";
function pickNearestBranch(p){   // set the Branch dropdown to the closest branch (without moving the map)
  const best = nearestBranch(p);
  if(!best) return (branchNote = "");
  if($("#branch").value !== best.name) $("#branch").value = best.name;
  return (branchNote = ` Nearest branch: ${best.name} (${best.km < 10 ? best.km.toFixed(1) : Math.round(best.km)} km).`);
}

function setPin(lat, lng, fromUser){
  pin = {lat: +lat.toFixed(6), lng: +lng.toFixed(6)};
  if(pinMap) pinMap.setMarker(pin.lat, pin.lng);
  $("#pinMap").classList.remove("need");
  if(fromUser) pickNearestBranch(pin);
  setPinStatus("✓ Location pinned." + (fromUser ? branchNote : "") + " Drag the pin if it isn't exactly right.", true);
  rememberDetails();
  if(fromUser) suggestAddress(pin);
}
let geoTimer;
function suggestAddress(p){   // fill the address box only if the customer hasn't typed one
  clearTimeout(geoTimer);
  if($("#ad").value.trim() || !pinMap) return;
  geoTimer = setTimeout(async () => {
    try{
      const text = await pinMap.reverse(p.lat, p.lng);
      if(text && !$("#ad").value.trim()){ $("#ad").value = cleanAddress(text) + ", "; rememberDetails(); }
    }catch(e){ /* address suggestion is optional */ }
  }, 700);
}

/* ---- free map: Leaflet + OpenStreetMap streets / Esri satellite ---- */
function osmAdapter(){
  const m = L.map("pinMap", {scrollWheelZoom: false, tap: true})
    .setView(pin ? [pin.lat, pin.lng] : [mapHome().lat, mapHome().lng], pin ? 17 : mapHome().zoom);
  const esri = "https://server.arcgisonline.com/ArcGIS/rest/services/";
  const streets = L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {maxZoom: 19,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'});
  const satellite = L.layerGroup([   // recent aerial photos, with road and place names on top
    L.tileLayer(esri + "World_Imagery/MapServer/tile/{z}/{y}/{x}", {maxZoom: 19,
      attribution: 'Imagery &copy; <a href="https://www.esri.com/" target="_blank" rel="noopener">Esri</a>, Maxar, Earthstar Geographics'}),
    L.tileLayer(esri + "Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}", {maxZoom: 19}),
    L.tileLayer(esri + "Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}", {maxZoom: 19})
  ]);
  const layers = {"Satellite": satellite, "Street map": streets};
  layers[getMapView()].addTo(m);
  L.control.layers(layers, null, {position: "topright", collapsed: false}).addTo(m);
  m.on("baselayerchange", e => saveMapView(e.name));
  m.on("click", e => setPin(e.latlng.lat, e.latlng.lng, true));
  let marker = null;
  return {
    provider: "osm",
    setView: (lat, lng, z) => m.setView([lat, lng], z),
    getCenter: () => m.getCenter(),
    setMarker: (lat, lng) => {
      if(!marker){
        marker = L.marker([lat, lng], {draggable: true, autoPan: true, title: "Delivery location"}).addTo(m);
        marker.on("dragend", () => { const p = marker.getLatLng(); setPin(p.lat, p.lng, true); });
      } else marker.setLatLng([lat, lng]);
    },
    resize: () => m.invalidateSize(),
    reverse: async (lat, lng) => {
      const r = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&lat=${lat}&lon=${lng}`, {headers: {"Accept-Language": "en"}});
      const j = await r.json(); return j && j.display_name;
    },
    search: async (q, c) => {
      const box = [c.lng - 0.35, c.lat + 0.35, c.lng + 0.35, c.lat - 0.35].map(n => n.toFixed(4)).join(",");
      const r = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&countrycodes=ph&limit=6&addressdetails=0&viewbox=${box}&q=${encodeURIComponent(q)}`, {headers: {"Accept-Language": "en"}});
      return (await r.json()).map(x => {
        const parts = cleanAddress(x.display_name).split(", ");
        return {title: parts[0], sub: parts.slice(1).join(", "), lat: +x.lat, lng: +x.lon};
      });
    }
  };
}

/* ---- Google Maps (key in config.js) ---- */
let gmapsLoading = null;
function loadGoogleMaps(){
  if(gmapsLoading) return gmapsLoading;
  gmapsLoading = new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("Google Maps timed out")), 10000);
    window.__akGmapsReady = () => { clearTimeout(t); resolve(window.google.maps); };
    window.gm_authFailure = () => useFreeMap("Google Maps key was rejected");   // bad / restricted key
    const sc = document.createElement("script");
    sc.src = "https://maps.googleapis.com/maps/api/js?key=" + encodeURIComponent(GMAPS_KEY)
      + "&v=weekly&loading=async&region=PH&language=en&callback=__akGmapsReady";
    sc.async = true;
    sc.onerror = () => { clearTimeout(t); reject(new Error("Google Maps failed to load")); };
    document.head.appendChild(sc);
  });
  return gmapsLoading;
}
async function googleAdapter(){
  const g = await loadGoogleMaps();
  const [{Map}, {Marker}, {Geocoder}, places] = await Promise.all([
    g.importLibrary("maps"), g.importLibrary("marker"), g.importLibrary("geocoding"), g.importLibrary("places")]);
  const home = mapHome(), start = pin || home;
  const m = new Map($("#pinMap"), {
    center: {lat: start.lat, lng: start.lng}, zoom: pin ? 17 : home.zoom,
    mapTypeId: getMapView() === "Street map" ? "roadmap" : "hybrid",
    mapTypeControl: true,
    mapTypeControlOptions: {style: g.MapTypeControlStyle.HORIZONTAL_BAR, position: g.ControlPosition.TOP_RIGHT, mapTypeIds: ["hybrid", "roadmap"]},
    streetViewControl: false, fullscreenControl: false, rotateControl: false,
    gestureHandling: "cooperative", clickableIcons: false
  });
  m.addListener("maptypeid_changed", () => saveMapView(m.getMapTypeId() === "roadmap" ? "Street map" : "Satellite"));
  m.addListener("click", e => setPin(e.latLng.lat(), e.latLng.lng(), true));
  // If Google never draws the map (rejected key, usage limit reached, network), use the free map.
  // Google only draws once the map is on screen, so the 8-second countdown starts when it scrolls into view.
  let drawn = false;
  g.event.addListenerOnce(m, "tilesloaded", () => { drawn = true; });
  const watch = new IntersectionObserver(entries => {
    if(!entries.some(e => e.isIntersecting)) return;
    watch.disconnect();
    setTimeout(() => { if(!drawn && pinMap && pinMap.provider === "google") useFreeMap("Google map did not load"); }, 8000);
  });
  watch.observe($("#pinMap"));
  const geocoder = new Geocoder();
  let marker = null;
  return {
    provider: "google",
    setView: (lat, lng, z) => { m.setCenter({lat, lng}); m.setZoom(z); },
    getCenter: () => { const c = m.getCenter(); return {lat: c.lat(), lng: c.lng()}; },
    setMarker: (lat, lng) => {
      if(!marker){
        marker = new Marker({map: m, position: {lat, lng}, draggable: true, title: "Delivery location"});
        marker.addListener("dragend", e => setPin(e.latLng.lat(), e.latLng.lng(), true));
      } else marker.setPosition({lat, lng});
    },
    resize: () => {},
    reverse: async (lat, lng) => {
      const {results} = await geocoder.geocode({location: {lat, lng}});
      const best = (results || []).find(r => !(r.types || []).includes("plus_code"));
      return best && best.formatted_address;
    },
    search: async (q, c) => {   // one Autocomplete request per search; location fetched only for the chosen place
      const sessionToken = new places.AutocompleteSessionToken();
      const {suggestions} = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
        input: q, sessionToken, includedRegionCodes: ["ph"], language: "en",
        locationBias: {center: c, radius: 30000}
      });
      return (suggestions || []).filter(x => x.placePrediction).slice(0, 6).map(x => {
        const pp = x.placePrediction;
        return {
          title: (pp.mainText && pp.mainText.text) || pp.text.text,
          sub: cleanAddress((pp.secondaryText && pp.secondaryText.text) || ""),
          resolve: async () => {
            const place = pp.toPlace();
            await place.fetchFields({fields: ["location"]});
            return {lat: place.location.lat(), lng: place.location.lng()};
          }
        };
      });
    }
  };
}
function useFreeMap(reason){   // switch to the free map for this visit
  if(mapProvider === "osm") return;
  console.warn("Using the free map:", reason);
  mapProvider = "osm";
  if(pinMap && pinMap.provider === "google"){
    const el = $("#pinMap"), fresh = el.cloneNode(false); el.replaceWith(fresh);   // clear Google's map
    pinMap = null;
    initPinMap();
  }
}

async function initPinMap(){
  if(!mapAvailable() || $("#pinWrap").style.display === "none" || !$("#drawer").classList.contains("open")) return pinMap;
  if(pinMap){ pinMap.resize(); return pinMap; }
  if(mapStarting) return mapStarting;
  mapStarting = (async () => {
    if(mapProvider === "google"){
      try{ pinMap = await googleAdapter(); }
      catch(e){ useFreeMap(e.message); }
    }
    if(!pinMap && window.L) pinMap = osmAdapter();
    if(pinMap && pin) pinMap.setMarker(pin.lat, pin.lng);
    return pinMap;
  })();
  try{ return await mapStarting; } finally { mapStarting = null; }
}

/* location search (Philippines only, nearer the map's centre first) */
let searchSeq = 0;
function hideResults(){ $("#pinResults").hidden = true; }
async function searchPlace(){
  const q = $("#pinSearch").value.trim(), list = $("#pinResults"), btn = $("#pinSearchBtn");
  if(q.length < 3){ list.innerHTML = `<li class="empty">Type at least 3 characters.</li>`; list.hidden = false; return; }
  const seq = ++searchSeq;
  btn.disabled = true; btn.textContent = "Searching…";
  try{
    const m = await initPinMap();
    if(!m) throw new Error("map unavailable");
    const rows = await m.search(q, m.getCenter());
    if(seq !== searchSeq) return;
    list.innerHTML = rows.length ? rows.map((x, i) =>
      `<li><button type="button" data-i="${i}"><b>${esc(x.title)}</b>${esc(x.sub)}</button></li>`).join("")
      + (m.provider === "google" ? `<li class="powered">powered by Google</li>` : "")
      : `<li class="empty">No matches. Try a nearby landmark or barangay, or tap the map.</li>`;
    list.hidden = false;
    list.querySelectorAll("button").forEach(b => b.onclick = async () => {
      const x = rows[+b.dataset.i];
      hideResults();
      $("#pinSearch").value = x.title;
      try{
        const pos = x.resolve ? await x.resolve() : {lat: x.lat, lng: x.lng};
        m.setView(pos.lat, pos.lng, 18);
        setPin(pos.lat, pos.lng, true);
        setPinStatus("✓ Pin placed near your search." + branchNote + " Drag it to your exact gate or door.", true);
      }catch(e){ setPinStatus("We couldn't open that place — try another result or tap the map."); }
    });
  }catch(e){
    if(seq === searchSeq){ list.innerHTML = `<li class="empty">Search isn't available right now — tap the map instead.</li>`; list.hidden = false; }
  }finally{
    if(seq === searchSeq){ btn.disabled = false; btn.textContent = "Search"; }
  }
}
$("#pinSearchBtn").onclick = searchPlace;
$("#branch").addEventListener("change", () => {   // show the area around the chosen branch
  rememberDetails();
  if(pinMap){ const h = mapHome(); pinMap.setView(h.lat, h.lng, h.zoom); }
});
$("#pinSearch").addEventListener("keydown", e => { if(e.key === "Enter"){ e.preventDefault(); searchPlace(); } else if(e.key === "Escape"){ e.stopPropagation(); hideResults(); } });
$("#pinSearch").addEventListener("input", () => { if(!$("#pinSearch").value.trim()) hideResults(); });
document.addEventListener("click", e => { if(!e.target.closest(".pin-search")) hideResults(); });
$("#locateMe").onclick = () => {
  if(!navigator.geolocation){ setPinStatus("Your browser can't share location — tap the map instead."); return; }
  const btn = $("#locateMe"); btn.disabled = true; btn.textContent = "Finding you…";
  navigator.geolocation.getCurrentPosition(async pos => {
    btn.disabled = false; btn.textContent = "📍 Use my current location";
    const m = await initPinMap(); if(!m) return;
    setPin(pos.coords.latitude, pos.coords.longitude, true);
    m.setView(pin.lat, pin.lng, 18);
  }, () => {
    btn.disabled = false; btn.textContent = "📍 Use my current location";
    setPinStatus("We couldn't get your location. Allow location access, or tap the map to drop a pin.");
  }, {enableHighAccuracy: true, timeout: 15000, maximumAge: 60000});
};
function syncMode(){
  const mode = $("input[name=mode]:checked").value;
  const payment = $("#pay").value;
  $("#addrWrap").style.display = mode==="Delivery" ? "" : "none";
  $("#pinWrap").style.display = mode==="Delivery" && mapAvailable() ? "" : "none";
  if(mode==="Delivery") setTimeout(initPinMap, 0);
  $("#pay").innerHTML = STORE.payments[mode].map(p => `<option>${esc(p)}</option>`).join("");
  if(STORE.payments[mode].includes(payment)) $("#pay").value = payment;
}
/* short, payment-specific instructions under the form */
function syncOrderNote(){
  const delivery = $("input[name=mode]:checked").value === "Delivery";
  $("#orderNote").innerHTML = delivery
    ? `<span class="ic" aria-hidden="true">🛵</span><span><b class="delivery-fee-note">Delivery fee is arranged separately.</b></span>`
    : "";
  const btn = $("#placeOrder");
  const gcash = /gcash/i.test($("#pay").value);
  if(!btn.disabled) btn.textContent = gcash ? "Proceed to Payment (GCash)" : "See Order Summary";
}
document.querySelectorAll("input[name=mode]").forEach(r=>r.addEventListener("change", ()=>{ syncMode(); syncOrderNote(); }));
$("#pay").addEventListener("change", syncOrderNote);
syncMode(); syncOrderNote();
const ORDER_HOURS = Array.from({length:10}, (_, i) => i + 11);
function localDateString(date){
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
}
function formatOrderHour(hour){
  const displayHour = hour % 12 || 12;
  return `${displayHour}:00 ${hour < 12 ? "AM" : "PM"}`;
}
$("#orderDate").value = localDateString(new Date());
function syncTimeSlots(){
  const select = $("#tm");
  const previous = select.value;
  const now = new Date();
  const today = localDateString(now);
  const dateInput = $("#orderDate");
  dateInput.min = today;
  if(!dateInput.value || dateInput.value < today) dateInput.value = today;
  const isToday = dateInput.value === today;
  const currentHour = isToday ? now.getHours() : 0;
  select.innerHTML = `<option value="">Choose a time</option>` + ORDER_HOURS.map(hour => {
    const label = formatOrderHour(hour);
    const disabled = isToday && hour <= currentHour;
    return `<option value="${label}"${disabled ? " disabled" : ""}>${label}</option>`;
  }).join("");
  if(previous && !Array.from(select.options).find(option => option.value === previous)?.disabled){
    select.value = previous;
  }
  const available = !isToday || ORDER_HOURS.some(hour => hour > currentHour);
  $("#timeAvailability").textContent = available
    ? `Choose an available hourly slot between 11:00 AM and 8:00 PM${isToday ? ". Past times are disabled." : "."}`
    : "No time slots remain today. Choose a future date to see its available times.";
}
syncTimeSlots();
window.setInterval(syncTimeSlots, 60 * 1000);
$("#orderDate").addEventListener("change", syncTimeSlots);
$("#form").addEventListener("input", rememberDetails);

/* order reference — one per cart, so resending the same cart doesn't duplicate it */
function newRef(){
  const A = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789", b = new Uint8Array(6);
  (window.crypto||{}).getRandomValues ? crypto.getRandomValues(b) : b.forEach((_,i)=>b[i]=Math.random()*256|0);
  return "AK-" + Array.from(b, x=>A[x % A.length]).join("");
}
let orderRef = store.get("ak_ref") || newRef(); store.set("ak_ref", orderRef);

function validateOrder(){
  const err = $("#err"); err.textContent = "";
  if(!cart.length){ err.textContent = "Add at least one item first."; return false; }
  syncTimeSlots();
  if(!$("#orderDate").value || $("#orderDate").value < localDateString(new Date())){ err.textContent = "Please choose today or a future date."; return false; }
  if(!$("#tm").value){ err.textContent = $("#timeAvailability").textContent.startsWith("No time slots") ? $("#timeAvailability").textContent : "Please choose an available preferred time."; return false; }
  const mode = $("input[name=mode]:checked").value;
  const name = $("#nm").value.trim(), phone = $("#ph").value.trim(), addr = $("#ad").value.trim();
  if(!name || !phone){ err.textContent = "Please add your name and mobile number."; return false; }
  if(!/^[0-9+() -]{7,20}$/.test(phone)){ err.textContent = "Please check your mobile number (numbers only)."; return false; }
  if(mode==="Delivery" && !addr){ err.textContent = "Please add your delivery address."; return false; }
  if(mode==="Delivery" && mapAvailable() && !pin){
    err.textContent = "Please pin your delivery location on the map.";
    $("#pinMap").classList.add("need"); $("#pinWrap").scrollIntoView({behavior:"smooth", block:"center"}); return false;
  }
  return true;
}
/* Create an order before sending GCash customers to the payment page. */
async function saveOrder(channel){
  if(!STORE.supabaseUrl || !STORE.supabaseKey) return {error:"Online ordering is not available right now. Please try again later."};
  const mode = $("input[name=mode]:checked").value;
  const payload = { ref: orderRef, mode, branch: $("#branch").value,
    name: $("#nm").value.trim(), phone: $("#ph").value.trim(),
    address: mode==="Delivery" ? $("#ad").value.trim() : "",
    lat: mode==="Delivery" && pin ? pin.lat : null, lng: mode==="Delivery" && pin ? pin.lng : null,
    order_date: $("#orderDate").value,
    time: $("#tm").value.trim() || "ASAP", payment: $("#pay").value, notes: $("#nt").value.trim(),
    channel, items: cart.map(l=>({name: l.name, opts: l.opts, qty: l.qty, unit: l.unit})) };
  const headers = {"Content-Type":"application/json", apikey: STORE.supabaseKey};
  if(!STORE.supabaseKey.startsWith("sb_")) headers.Authorization = "Bearer " + STORE.supabaseKey; // legacy anon JWT
  try{
    const r = await fetch(STORE.supabaseUrl.replace(/\/$/,"") + "/rest/v1/rpc/place_order",
      {method:"POST", headers, body: JSON.stringify({p: payload}), keepalive: true});
    const j = await r.json().catch(()=>({}));
    return r.ok && j && j.ok ? j : {error: (j && j.message) || "We couldn't save your order. Please try again."};
  }catch(e){ return {error: "We couldn't reach the ordering system. Check your connection and try again."}; }
}

async function placeOrder(){
  if(!validateOrder()) return;
  const button = $("#placeOrder"), err = $("#err");
  const payment = $("#pay").value;
  button.disabled = true;
  button.textContent = "Placing order…";
  err.textContent = "";
  try{
    const res = await saveOrder("website");
    if(res.error) throw new Error(res.error);
    const placedRef = orderRef;
    const placedItems = cart.map(l => ({name: l.name, opts: l.opts || [], qty: l.qty, unit: l.unit})), placedSubtotal = subtotal();
    cart = []; store.set("ak_cart", cart); renderCart();
    orderRef = newRef(); store.set("ak_ref", orderRef);
    const placedMode = $("input[name=mode]:checked").value;
    const chatData = {ref: placedRef, orderNo: res.order_no, mode: placedMode, branch: $("#branch").value,
      date: $("#orderDate").value, time: $("#tm").value, name: $("#nm").value.trim(), phone: $("#ph").value.trim(),
      address: placedMode === "Delivery" ? $("#ad").value.trim() : "", notes: $("#nt").value.trim(),
      pin: placedMode === "Delivery" && pin ? {lat: pin.lat, lng: pin.lng} : null,
      items: placedItems, subtotal: placedSubtotal, payment};
    if(/gcash/i.test(payment)){
      // keep the order details on this phone so the payment page can show the same order message
      store.set("ak_order_" + placedRef, chatData);
      window.location.href = `pay.html?ref=${encodeURIComponent(placedRef)}`;
      return;
    }
    setupChat(chatData);
    $("#doneRef").textContent = res.order_no ? "#" + res.order_no : placedRef;
    $("#doneHow").textContent = `Cash will be collected on ${placedMode === "Delivery" ? "delivery" : "pickup"}.`;
    document.querySelector(".d-body").hidden = true;
    $("#dFoot").hidden = true;
    $("#done").hidden = false;
  }catch(e){
    err.textContent = e.message || "We couldn't place your order. Please try again.";
  }finally{
    button.disabled = false;
    syncOrderNote();
  }
}
/* Messenger / Instagram buttons on the "Order placed" screen */
function chatMessage(d){
  const when = d.date ? new Date(d.date + "T00:00").toLocaleDateString("en-PH", {weekday:"short", month:"short", day:"numeric"}) : "";
  const delivery = d.mode === "Delivery";
  return [
    `Hi Arbab Kebab! 👋 I just placed an order.`,
    ``,
    `🧾 Order ${d.ref}${d.orderNo ? ` (#${d.orderNo})` : ""}`,
    `${delivery ? "🛵 Delivery" : `🏪 Pick-Up at ${d.branch || BRANCHES[0].name} branch`}${when ? ` · ${when}` : ""}${d.time ? ` · ${d.time}` : ""}`,
    ``,
    `👤 ${d.name}${d.phone ? ` · ${d.phone}` : ""}`,
    ...(delivery && d.address ? [`🏠 ${d.address}`] : []),
    ...(delivery && d.pin ? [`📍 Pinned location: https://www.google.com/maps/search/?api=1&query=${d.pin.lat},${d.pin.lng}`] : []),
    ``,
    `📦 Items:`,
    ...(d.items || []).map(i => `• ${i.qty}x ${i.name}${i.opts && i.opts.length ? ` (${i.opts.join(", ")})` : ""} — ${peso(i.qty * i.unit)}`),
    ``,
    `🍽️ Food total: ${peso(d.subtotal || 0)}`,
    ...(delivery ? [`🛵 Delivery fee: to be confirmed`] : []),
    `💵 Payment: ${d.payment}`,
    ...(d.notes ? [``, `📝 Note: ${d.notes}`] : [])
  ].join("\n");
}
function setupChat(d){
  const text = chatMessage(d);
  $("#chatMsg").textContent = text;
  const btn = $("#chatCopy");
  btn.textContent = "📋 Copy order summary"; btn.classList.remove("done");
  btn.onclick = async () => {
    try{ await navigator.clipboard.writeText(text); }
    catch(e){   // older browsers: select the text so the customer can copy it
      const r = document.createRange(); r.selectNodeContents($("#chatMsg"));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try{ document.execCommand("copy"); }catch(err){}
    }
    btn.textContent = "✓ Copied! Now tap Send and paste"; btn.classList.add("done");
  };
  const copy = async () => { try{ await navigator.clipboard.writeText(text); }catch(e){} };
  const m = $("#chatMessenger"), ig = $("#chatInstagram");
  m.href = STORE.messenger || "https://m.me/ArbabKebabOfficial";
  m.onclick = copy;
  const handle = (STORE.instagram || "").replace(/^@/, "").trim();
  ig.hidden = !handle;
  if(handle){ ig.href = "https://ig.me/m/" + encodeURIComponent(handle); ig.onclick = copy; }
}
function resetDone(){
  orderRef = newRef(); store.set("ak_ref", orderRef);
  document.querySelector(".d-body").hidden = false; $("#dFoot").hidden = false; $("#done").hidden = true;
}
$("#placeOrder").onclick = placeOrder;
$("#doneNew").onclick = ()=>{ resetDone(); closeCart(); };
/* If they come back and add items after placing an order, start a fresh order. */
const _add = addToCart; addToCart = function(...a){ if(!$("#done").hidden) resetDone(); return _add.apply(this, a); };

let tt; function toast(t){ const el=$("#toast"); el.textContent=t; el.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>el.classList.remove("show"),1800); }
renderCart();
