/* ================= CONFIG (edit me) ================= */
const CONFIG = {
  supabaseUrl: "https://addfbbpqhxsinedvnnme.supabase.co",      // Supabase → Project Settings → API → Project URL
  supabaseKey: "sb_publishable_vNys_OaZ_iVP1bfJj64Qhw_QQvyEaQp",      // the anon / publishable key (same one as the order site)
  orderSiteUrl: "https://arbabkebab.vercel.app",    // customer site address — used for GCash payment links
  businessName: "Arbab Kebab",
  branches: ["San Mateo", "Malolos"],   // admin-only extras; the main list is the website's config.js
  timeZone: "Asia/Manila",
  currency: "₱"
};
// Branches added in the website's config.js (loaded in <head>) show up here automatically.
const SITE_BRANCHES = ((window.SITE_CONFIG && window.SITE_CONFIG.branches) || [])
  .map(b => typeof b === "string" ? b : b && b.name).filter(Boolean);
CONFIG.branches = [...new Set([...SITE_BRANCHES, ...CONFIG.branches])];
const ADMIN_PRODUCTS = [
  {id:"MS1",name:"Shawaya Set 1",price:375},{id:"MS2",name:"Shawaya Set 2",price:475},
  {id:"MS3",name:"Shawaya Set 3",price:595},{id:"MS4",name:"Shawaya Set 4",price:695},
  {id:"PL1",name:"Potluck",price:995},{id:"PL2",name:"Shawaya Potluck",price:1299},
  {id:"SLD1",name:"Fattoush",price:179},{id:"SLD2",name:"Tabbouleh",price:229},
  {id:"sloKC",name:"Kabsa Chicken",price:260},{id:"sloKB",name:"Kabsa Beef",price:350},
  {id:"sloCB",name:"Chicken Biryani",price:290},{id:"sloGHC",name:"Grilled Half Chicken",price:375},
  {id:"sloBKR",name:"Beef Kebab with Rice",price:195},{id:"sloCKR",name:"Chicken Kebab with Rice",price:170},
  {id:"ChkW",name:"Chicken Wings",price:180},{id:"Falafel",name:"Fried Falafel",price:150},
  {id:"FFries",name:"Fries Platter",price:150},{id:"BKS",name:"Beef Kebab Shawarma",price:150},
  {id:"CSma",name:"Chicken Shawarma",price:135},{id:"CKS",name:"Chicken Kebab Shawarma",price:130},
  {id:"FLW",name:"Falafel Wrap",price:130},{id:"BTR_Chk",name:"Buttered Chicken",price:195},
  {id:"CHN_Msla",name:"Chana Masala",price:150},{id:"Hms",name:"Hummus",price:150},
  {id:"Kbs_Rice",name:"Kabsa Rice",price:170},{id:"Wtr",name:"Water",price:35},
  {id:"Sfd",name:"Soda",price:50}
];

/* ================= HELPERS ================= */
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const peso = n => CONFIG.currency + Number(n||0).toLocaleString("en-PH", {minimumFractionDigits:0, maximumFractionDigits:2});
const ls = { get(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }, set(k,v){ try{ localStorage.setItem(k,v); }catch(e){} } };
const fmtTime = new Intl.DateTimeFormat("en-PH", {timeZone: CONFIG.timeZone, hour:"numeric", minute:"2-digit"});
const fmtDate = new Intl.DateTimeFormat("en-PH", {timeZone: CONFIG.timeZone, month:"short", day:"numeric"});
const fmtOrderDate = value => value
  ? new Intl.DateTimeFormat("en-PH", {timeZone:"UTC", dateStyle:"medium"}).format(new Date(value + "T00:00:00Z"))
  : "—";
const fmtFull = new Intl.DateTimeFormat("en-CA", {timeZone: CONFIG.timeZone, year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit", hour12:false});
function ymdLocal(d){ return new Intl.DateTimeFormat("en-CA",{timeZone:CONFIG.timeZone,year:"numeric",month:"2-digit",day:"2-digit"}).format(d); }
function startOfLocalDay(daysAgo=0){ const d = new Date(Date.now() - daysAgo*864e5); return new Date(ymdLocal(d) + "T00:00:00+08:00"); }
function ago(ts){
  const m = Math.round((Date.now() - new Date(ts)) / 60000);
  if(m < 1) return "just now"; if(m < 60) return m + " min ago";
  const d = new Date(ts); return (ymdLocal(d) === ymdLocal(new Date()) ? "" : fmtDate.format(d) + " · ") + fmtTime.format(d);
}

const STATUS = {
  new:              {label:"New",              color:"var(--red)"},
  confirmed:        {label:"Confirmed",        color:"var(--blue)"},
  preparing:        {label:"Preparing",        color:"var(--amber)"},
  ready:            {label:"Ready for pickup", color:"var(--teal)"},
  out_for_delivery: {label:"Out for delivery", color:"var(--purple)"},
  completed:        {label:"Completed",        color:"var(--green)"},
  cancelled:        {label:"Cancelled",        color:"var(--grey)"}
};
const OPEN = ["new","confirmed","preparing","ready","out_for_delivery"];
function nextStep(o){
  if(o.status==="new") return {to:"confirmed", label:"Confirm order"};
  if(o.status==="confirmed") return {to:"preparing", label:"Start preparing"};
  if(o.status==="preparing") return o.mode==="Delivery" ? {to:"out_for_delivery", label:"Out for delivery"} : {to:"ready", label:"Ready for pickup"};
  if(o.status==="ready" || o.status==="out_for_delivery") return {to:"completed", label:"Mark completed"};
  return null;
}
const PAY = { unpaid:"Unpaid", submitted:"Verify payment", paid:"Paid", refunded:"Refunded" };
const payBadge = o => `<span class="pay ${esc(o.payment_status||"unpaid")}">${o.payment_status==="paid" ? "✓ " : o.payment_status==="submitted" ? "⏳ " : ""}${PAY[o.payment_status||"unpaid"]}</span>`;
const isGcash = o => /gcash/i.test(o.payment || "");
const orderModeLabel = mode => mode === "Delivery" ? "Delivery" : "Pick-Up";
const payLink = o => CONFIG.orderSiteUrl.replace(/\/$/, "") + "/pay.html?ref=" + encodeURIComponent(o.ref);
const pill = s => `<span class="pill" style="background:${STATUS[s]?.color||"#777"}">${esc(STATUS[s]?.label||s)}</span>`;

/* ================= STATE ================= */
let isOwner = false, sb = null, orders = [], selId = null, tab = "open", channel = null, pollTimer = null, staffEmail = "", editingOrderId = null;
let soundOn = ls.get("ak_sound") !== "off", audioCtx = null;

/* ================= AUTH ================= */
function showLogin(msg="", ok=false){ $("#appView").hidden = true; $("#loginView").hidden = false; $("#loginMsg").textContent = msg; $("#loginMsg").className = "msg" + (ok?" ok":""); }
async function boot(){
  if(!CONFIG.supabaseUrl || !CONFIG.supabaseKey || !window.supabase){
    showLogin(!window.supabase ? "Couldn't load the database library — check your internet connection." : "Setup needed: add the Supabase URL and key in the CONFIG section of this file.");
    $("#loginBtn").disabled = true; return;
  }
  sb = window.supabase.createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
  sb.auth.onAuthStateChange((event) => {
    if(event === "PASSWORD_RECOVERY"){ showLogin("Set a new password for your account.", true); $("#loginFields").hidden = true; $("#resetFields").hidden = false; }
  });
  const { data } = await sb.auth.getSession();
  if(data.session && !location.hash.includes("type=recovery")) enterApp(data.session); else if(!data.session) showLogin();
}
$("#loginForm").addEventListener("submit", async e => {
  e.preventDefault(); unlockAudio();
  $("#loginBtn").disabled = true; $("#loginMsg").textContent = "";
  const { data, error } = await sb.auth.signInWithPassword({ email: $("#email").value.trim(), password: $("#pw").value });
  $("#loginBtn").disabled = false;
  if(error) return showLogin(error.message === "Invalid login credentials" ? "Wrong email or password." : error.message);
  enterApp(data.session);
});
$("#forgot").onclick = async () => {
  const email = $("#email").value.trim();
  if(!email) return showLogin("Type your email above first.");
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: location.origin + location.pathname });
  showLogin(error ? error.message : "If that email is on the staff list, a reset link is on its way.", !error);
};
$("#setPw").onclick = async () => {
  const pw = $("#pw1").value;
  if(pw.length < 8) return showLogin("Use at least 8 characters.");
  const { data, error } = await sb.auth.updateUser({ password: pw });
  if(error) return showLogin(error.message);
  history.replaceState(null, "", location.pathname);
  $("#loginFields").hidden = false; $("#resetFields").hidden = true;
  const s = (await sb.auth.getSession()).data.session; if(s) enterApp(s);
};
$("#logout").onclick = async () => { await sb.auth.signOut(); if(channel) sb.removeChannel(channel); clearInterval(pollTimer); orders = []; staffEmail = ""; showLogin("Logged out.", true); };

async function enterApp(session){
  const email = session.user.email;
  staffEmail = email;
  const { data: me, error } = await sb.from("staff").select("email,name,is_admin").ilike("email", email).maybeSingle();
  if(error || !me){ await sb.auth.signOut(); return showLogin("This account isn't on the staff list. Ask the owner to add your email."); }
  $("#who").textContent = me.name ? `${me.name} · ${email}` : email;
  $("#loginView").hidden = true; $("#appView").hidden = false;
  $("#branchF").innerHTML = `<option value="">All branches</option>` + CONFIG.branches.map(b=>`<option>${esc(b)}</option>`).join("");
  const sb_ = ls.get("ak_branch"); if(sb_ !== null) $("#branchF").value = sb_;
  setSoundBtn();
  // only owners edit the menu (the database enforces this too)
  isOwner = !!me.is_admin; $("#menuTab").hidden = !isOwner;
  const v = ls.get("ak_view");
  showView(v === "users" || (v === "menu" && isOwner) ? v : "orders");
  loadMenu();
  await load();
  subscribe();
  clearInterval(pollTimer); pollTimer = setInterval(load, 60000);   // safety net if live updates drop
}

/* ================= DATA ================= */
function rangeBounds(){
  const fromValue = $("#rangeFrom").value, toValue = $("#rangeTo").value;
  if(!fromValue || !toValue || fromValue > toValue) return null;
  const from = new Date(fromValue + "T00:00:00+08:00");
  const to = new Date(toValue + "T00:00:00+08:00");
  to.setUTCDate(to.getUTCDate() + 1);
  return [from, to];
}
async function load(){
  const bounds = rangeBounds();
  if(!bounds){ orders = []; render(); toast("Choose a valid start and end date."); return false; }
  const [from, to] = bounds;
  let q = sb.from("orders").select("*").gte("created_at", from.toISOString()).order("created_at", {ascending:false}).limit(1000);
  q = q.lt("created_at", to.toISOString());
  const { data, error } = await q;
  if(error){ toast("Couldn't load orders: " + error.message); return false; }
  orders = data; render(); return true;
}
function inRange(o){
  const bounds = rangeBounds();
  if(!bounds) return false;
  const [from,to] = bounds, t = new Date(o.created_at);
  return t >= from && t < to;
}
function subscribe(){
  if(channel) sb.removeChannel(channel);
  channel = sb.channel("orders-live")
    .on("postgres_changes", {event:"*", schema:"public", table:"orders"}, ({eventType, new: row}) => {
      if(!row || !row.id) return;
      const i = orders.findIndex(o => o.id === row.id);
      if(eventType === "INSERT" && i < 0){
        if(inRange(row)) orders.unshift(row);
        if(!row.deleted_at && !isPendingGcash(row) && (!$("#branchF").value || $("#branchF").value === row.branch)){
          beep(); toast(`New order ${row.ref} · ${row.customer_name} · ${peso(row.total)}`, true);
          flashId = row.id;
        }
      } else if(i >= 0){
        const before = orders[i];
        if(row.payment_status === "submitted" && before.payment_status !== "submitted" &&
           (!$("#branchF").value || $("#branchF").value === row.branch)){
          beep(); toast(`💸 GCash payment to verify · #${row.order_no} · ${peso(row.total)}`, true); flashId = row.id;
        }
        orders[i] = row;
      }
      else if(inRange(row)) orders.unshift(row);
      render();
    })
    .subscribe(status => {
      const on = status === "SUBSCRIBED";
      $("#live").classList.toggle("on", on); $("#liveTxt").textContent = on ? "live" : "reconnecting";
      if(on) load();
    });
}
document.addEventListener("visibilitychange", () => { if(!document.hidden && sb && !$("#appView").hidden) load(); });

async function updateOrder(id, patch, msg){
  const { data, error } = await sb.from("orders").update(patch).eq("id", id).select().single();
  if(error){ toast("Couldn't save: " + error.message); return false; }
  const i = orders.findIndex(o => o.id === id); if(i >= 0) orders[i] = data;
  render(); if(msg) toast(msg); return true;
}

/* ================= RENDER ================= */
let flashId = null;
function filtered(){
  const b = $("#branchF").value, q = $("#q").value.trim().toLowerCase();
  return orders.filter(o => inRange(o) && !o.deleted_at && !isPendingGcash(o) && matchesOrderFilters(o, b, q));
}
function matchesOrderFilters(o, b, q){
  return (!b || o.branch === b) &&
    (!q || [o.ref, o.order_no, o.customer_name, o.customer_phone, o.customer_email, o.address].join(" ").toLowerCase().includes(q));
}
function isPendingGcash(o){ return isGcash(o) && (o.payment_status || "unpaid") === "unpaid" && o.status !== "cancelled"; }
function render(){
  const base = filtered();
  // KPIs (cancelled orders excluded from sales)
  const valid = base.filter(o => o.status !== "cancelled");
  const sales = valid.reduce((s,o)=>s + Number(o.total), 0);
  const collected = valid.filter(o => o.payment_status === "paid").reduce((s,o)=>s + Number(isGcash(o) ? o.subtotal : o.total), 0);
  const open = base.filter(o => OPEN.includes(o.status)).length;
  const verify = base.filter(o => o.payment_status === "submitted" && o.status !== "cancelled").length;
  const newCount = base.filter(o => o.status === "new").length;
  $("#kpis").innerHTML = [
    ["Orders", valid.length], ["Sales", peso(sales)], ["Collected", peso(collected)], ["Open now", open]
  ].map(([l,v]) => `<div class="kpi"><div class="l">${l}</div><div class="v">${v}</div></div>`).join("");
  // Browser tab shows the same number as the "New" tab.
  document.title = (newCount ? `(${newCount}) ` : "") + "Arbab Kebab · Orders";
  // tabs
  const counts = {open, verify, all: base.length}; Object.keys(STATUS).forEach(s => counts[s] = base.filter(o=>o.status===s).length);
  const tabDefs = [["open","Open"],["new","New"],["verify","Verify payment"],["confirmed","Confirmed"],["preparing","Preparing"],["ready","Ready"],["out_for_delivery","Out for delivery"],["completed","Completed"],["cancelled","Cancelled"],["all","All"]];
  $("#tabs").innerHTML = tabDefs.map(([k,l]) => `<button class="tab${tab===k?" on":""}" data-tab="${k}">${l}<b>${counts[k]}</b></button>`).join("");
  // list
  const shown = base.filter(o => tab==="all" ? true : tab==="open" ? OPEN.includes(o.status)
    : tab==="verify" ? (o.payment_status==="submitted" && o.status!=="cancelled") : o.status===tab);
  if(tab === "open") shown.sort((a,b) => new Date(a.created_at) - new Date(b.created_at));   // oldest open order first
  $("#list").innerHTML = shown.length ? shown.map(o => {
    const items = o.items.map(i => `${i.qty}× ${i.name}`).join(", ");
    return `<button class="order${o.id===selId?" sel":""}${o.id===flashId?" flash":""}" data-id="${o.id}" style="border-left-color:${STATUS[o.status]?.color}">
      <span class="no">#${o.order_no}</span>
      <span class="nm">${esc(o.customer_name)} <span style="font-weight:500;color:var(--muted)">· ${orderModeLabel(o.mode)} · ${esc(o.branch)}</span></span>
      <span class="tot">${peso(o.total)}</span>
      <span class="ago">${esc(ago(o.created_at))}</span>
      <span class="meta">${pill(o.status)} ${payBadge(o)} &nbsp;${esc(o.payment||"")} · ${esc(items)}</span>
    </button>`;
  }).join("") : `<div class="empty">No orders here${$("#q").value ? " matching your search" : ""}.</div>`;
  flashId = null;
  renderDetail();
}

function renderDetail(){
  const o = orders.find(x => x.id === selId), el = $("#detail");
  if(!o){ el.innerHTML = `<div class="placeholder">Select an order to see details.</div>`; el.classList.remove("open"); return; }
  if(o.deleted_at){
    el.innerHTML = `
      <div class="d-h">
        <div><h2>Deleted order #${o.order_no}</h2><div class="sub">${esc(o.ref)} · ${esc(fmtDate.format(new Date(o.created_at)))}</div></div>
        <button class="btn sm x" id="dClose" aria-label="Close">✕</button>
      </div>
      <div class="sec"><h3>Deletion record</h3><dl class="kv">
        <dt>Deleted on</dt><dd>${esc(fmtFull.format(new Date(o.deleted_at)))}</dd>
        <dt>Deleted by</dt><dd>${esc(o.deleted_by || "—")}</dd>
        <dt>Reason</dt><dd>${esc(o.delete_reason || "—")}</dd>
      </dl></div>
      <div class="sec"><h3>Order</h3><dl class="kv">
        <dt>Customer</dt><dd>${esc(o.customer_name)}</dd>
        <dt>Mobile</dt><dd>${esc(o.customer_phone)}</dd>
        ${o.customer_email ? `<dt>Email</dt><dd><a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a>${o.email_placed_sent_at || o.email_completed_sent_at ? ` <span style="font-weight:500;color:var(--muted);font-size:12px">· ${o.email_completed_sent_at ? "delivered email sent" : "order email sent"}</span>` : ""}</dd>` : ""}
        <dt>Status</dt><dd>${esc(STATUS[o.status]?.label || o.status)}</dd>
        <dt>Total</dt><dd>${peso(o.total)}</dd>
      </dl></div>
      <div class="sec"><h3>Items</h3><table class="items">${o.items.map(i => `<tr><td class="q">${i.qty}×</td><td>${esc(i.name)}</td><td class="p">${peso(i.qty * i.unit)}</td></tr>`).join("")}</table></div>`;
    if(window.innerWidth <= 1000) el.classList.add("open");
    const closeDeleted = $("#dClose"); if(closeDeleted) closeDeleted.onclick = () => { selId = null; el.classList.remove("open"); render(); };
    return;
  }
  const step = nextStep(o);
  const phone = (o.customer_phone||"").replace(/[^\d+]/g,"");
  const hasPin = o.delivery_lat != null && o.delivery_lng != null;
  const pinQuery = hasPin ? `${Number(o.delivery_lat)},${Number(o.delivery_lng)}` : "";
  const maps = hasPin ? `https://www.google.com/maps/search/?api=1&query=${pinQuery}`
    : o.address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(o.address)}` : "";
  const hasPaymentEvidence = o.payment_ref || o.payment_screenshot_path;
  el.innerHTML = `
    <div class="d-h">
      <div>
        <h2>#${o.order_no} <span style="font-weight:600;color:var(--muted);font-size:15px">${esc(o.ref)}</span></h2>
        <div class="sub">${esc(fmtDate.format(new Date(o.created_at)))} · ${esc(fmtTime.format(new Date(o.created_at)))} · via ${esc(o.channel||"website")}</div>
        <div class="d-status-row">${pill(o.status)}<button class="icon-btn" id="deleteOrder" type="button" aria-label="Delete order" title="Delete order"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18M8 6V4h8v2m3 0-.9 14H5.9L5 6m4 4v6m6-6v6"/></svg></button></div>
      </div>
      <button class="btn sm x" id="dClose" aria-label="Close">✕</button>
    </div>
    <div class="sec">
      <h3>Customer</h3>
      <dl class="kv">
        <dt>Name</dt><dd>${esc(o.customer_name)}</dd>
        <dt>Mobile</dt><dd>${esc(o.customer_phone)}</dd>
        ${o.customer_email ? `<dt>Email</dt><dd><a href="mailto:${esc(o.customer_email)}">${esc(o.customer_email)}</a>${o.email_placed_sent_at || o.email_completed_sent_at ? ` <span style="font-weight:500;color:var(--muted);font-size:12px">· ${o.email_completed_sent_at ? "delivered email sent" : "order email sent"}</span>` : ""}</dd>` : ""}
        <dt>Order type</dt><dd>${orderModeLabel(o.mode)} · ${esc(o.branch)} branch</dd>
        ${o.address ? `<dt>Address</dt><dd>${esc(o.address)}</dd>` : ""}
        ${hasPin ? `<dt>Pinned</dt><dd><a href="${maps}" target="_blank" rel="noopener">📍 ${esc(pinQuery)}</a></dd>` : (o.mode === "Delivery" ? `<dt>Pinned</dt><dd style="color:var(--muted)">No map pin</dd>` : "")}
        <dt>Date</dt><dd>${esc(fmtOrderDate(o.order_date))}</dd>
        <dt>Time</dt><dd>${esc(o.preferred_time||"—")}</dd>
        <dt>Payment</dt><dd>${esc(o.payment||"—")}</dd>
      </dl>
      <div class="row-btns one-line no-print">
        <a class="btn sm" href="tel:${esc(phone)}">📞 Call</a>
        ${maps ? `<a class="btn sm" href="${maps}" target="_blank" rel="noopener">📍 ${hasPin ? "Open pin" : "Map"}</a>` : ""}
        ${hasPin ? `<a class="btn sm" href="https://www.google.com/maps/dir/?api=1&destination=${pinQuery}" target="_blank" rel="noopener">🧭 Directions</a>` : ""}
      </div>
      ${o.notes ? `<div class="note-box" style="margin-top:10px"><b>Customer note:</b> ${esc(o.notes)}</div>` : ""}
    </div>
    <div class="sec">
      <h3>Items</h3>
      <table class="items">${o.items.map(i => `<tr><td class="q">${i.qty}×</td><td>${esc(i.name)}${i.opts && i.opts.length ? `<div class="o">${esc(i.opts.join(" · "))}</div>` : ""}</td><td class="p">${peso(i.qty * i.unit)}</td></tr>`).join("")}</table>
      <div class="sum">
        <div class="grand"><span>Food total</span><span>${peso(o.subtotal)}</span></div>
      </div>
    </div>
    <div class="sec">
      <h3>Payment · ${esc(o.payment || "—")}</h3>
      <div>${payBadge(o)}${o.paid_at ? ` <span style="font-size:13px;color:var(--muted)">on ${esc(fmtDate.format(new Date(o.paid_at)))} · ${esc(fmtTime.format(new Date(o.paid_at)))}</span>` : ""}</div>
      ${hasPaymentEvidence ? `<div class="paybox ${o.payment_status==="submitted"?"submitted":""}">
          <div style="font-size:12px;color:var(--muted);font-weight:600">GCash reference no.</div>
          <div class="big">${o.payment_ref ? esc(o.payment_ref) : "Not provided — see screenshot"}</div>
          <div style="font-size:13px">${o.payer_name ? `From: <b>${esc(o.payer_name)}</b> · ` : ""}${o.payment_submitted_at ? `submitted ${esc(fmtTime.format(new Date(o.payment_submitted_at)))}` : ""}</div>
          ${o.payment_status==="submitted" ? `<div style="font-size:13px;margin-top:6px">Open GCash → <b>Transactions</b>, find this Ref No. and check the amount is <b>${peso(isGcash(o) ? o.subtotal : o.total)}</b>.</div>` : ""}
          ${o.payment_screenshot_path ? `<div class="pay-proof" id="paymentScreenshot">Loading payment screenshot…</div>` : ""}
        </div>` : ""}
      <div class="row-btns no-print">
        ${o.payment_status==="submitted" ? `<button class="btn sm" id="payOk" style="border-color:var(--green);color:var(--green)">✓ Verified — mark paid</button><button class="btn sm danger" id="payBad">✗ Not found</button>`
          : o.payment_status==="paid" ? `<button class="btn sm" id="payUndo">Undo paid</button>`
          : `<button class="btn sm" id="payOk">Mark paid${isGcash(o) ? "" : " (cash)"}</button>`}
        ${isGcash(o) && o.payment_status!=="paid" && o.status!=="cancelled" ? `<button class="btn sm" id="copyPayLink">🔗 Copy payment link</button>` : ""}
        ${isGcash(o) ? `<a class="btn sm" href="${esc(payLink(o))}" target="_blank" rel="noopener">🧾 Order details</a>` : ""}
      </div>
    </div>
    ${o.mode === "Delivery" ? `<div class="sec no-print">
      <h3>Message for driver</h3>
      <div class="driver-fee">
        <label for="fee">🛵 Delivery fee</label>
        <input id="fee" type="number" min="0" step="1" inputmode="decimal" value="${Number(o.delivery_fee) || ""}" placeholder="0" aria-label="Delivery fee">
      </div>
      <pre class="driver-msg" id="driverMsg">${esc(driverMessage(o))}</pre>
      <button class="btn driver-copy" id="copyDriver" type="button">📋 Copy message</button>
      <p class="driver-hint">Paste it in WhatsApp, Viber or Messenger.</p>
    </div>` : ""}
    <div class="sec no-print">
      <h3>Staff notes <span class="saved" id="noteSaved"></span></h3>
      <textarea id="staffNotes" rows="2" placeholder="Rider name, payment received, changes…">${esc(o.staff_notes||"")}</textarea>
    </div>
    <div class="actions no-print">
      ${step ? `<button class="btn ember" id="next" data-to="${step.to}">${step.label} →</button>` : ""}
      <div class="two">
        <button class="btn" id="copyConfirm">Copy reply to customer</button>
        <button class="btn" id="print">🖨 Print ticket</button>
      </div>
      <div class="two">
        <select id="setStatus" aria-label="Set status">${Object.entries(STATUS).map(([k,v]) => `<option value="${k}"${k===o.status?" selected":""}>${v.label}</option>`).join("")}</select>
        ${o.status !== "cancelled" ? `<button class="btn danger" id="cancel">Cancel order</button>` : `<span></span>`}
      </div>
      ${!isGcash(o) ? `<button class="btn" id="editOrder" type="button">Edit order</button>` : ""}
    </div>`;
  if(window.innerWidth <= 1000) el.classList.add("open");
  if(o.payment_screenshot_path) loadPaymentScreenshot(o.id, o.payment_screenshot_path);

  const fee = $("#fee");
  if(fee){   // delivery orders only: lives in the Message for driver panel
    fee.oninput = () => { const v = Math.max(0, Number(fee.value || 0));
      $("#driverMsg").textContent = driverMessage({...o, delivery_fee: v, total: Number(o.subtotal) + v}); };
    fee.onchange = () => { const v = Math.max(0, Number(fee.value || 0)); if(v !== Number(o.delivery_fee)) updateOrder(o.id, {delivery_fee: v}, "Delivery fee saved"); };
  }
  $("#staffNotes").onchange = async e => { if(await updateOrder(o.id, {staff_notes: e.target.value})) { const s = $("#noteSaved"); if(s) s.textContent = "saved"; } };
  if($("#next")) $("#next").onclick = e => updateOrder(o.id, {status: e.currentTarget.dataset.to}, `#${o.order_no} → ${STATUS[e.currentTarget.dataset.to].label}`);
  $("#setStatus").onchange = e => updateOrder(o.id, {status: e.target.value}, `#${o.order_no} → ${STATUS[e.target.value].label}`);
  if($("#cancel")) $("#cancel").onclick = () => { if(confirm(`Cancel order #${o.order_no} for ${o.customer_name}?`)) updateOrder(o.id, {status:"cancelled"}, `#${o.order_no} cancelled`); };
  if($("#editOrder")) $("#editOrder").onclick = () => openOrderEditor(o);
  $("#deleteOrder").onclick = () => openDeleteDialog(o);
  $("#print").onclick = () => window.print();
  if($("#payOk")) $("#payOk").onclick = () => updateOrder(o.id, {payment_status:"paid"}, `#${o.order_no} marked paid`);
  if($("#payUndo")) $("#payUndo").onclick = () => { if(confirm(`Mark #${o.order_no} as NOT paid?`)) updateOrder(o.id, {payment_status: o.payment_ref ? "submitted" : "unpaid"}, "Payment status changed"); };
  if($("#payBad")) $("#payBad").onclick = async () => {
    if(!confirm(`Payment ref ${o.payment_ref} not found in GCash? The customer will be able to submit a new reference.`)) return;
    if(await updateOrder(o.id, {payment_status:"unpaid"}, "Marked unpaid")){
      const msg = `Hi ${(o.customer_name||"").split(" ")[0]}! This is ${CONFIG.businessName}. We couldn't find GCash Ref No. ${o.payment_ref} for order ${o.ref}. Could you double-check your receipt and submit it again here: ${payLink(o)} — or send us a screenshot. Salamat po!`;
      try{ await navigator.clipboard.writeText(msg); toast("Message to customer copied"); }catch(e){ prompt("Send this to the customer:", msg); }
    }

  };
  if($("#copyPayLink")) $("#copyPayLink").onclick = async () => {
    try{ await navigator.clipboard.writeText(payLink(o)); toast("Payment link copied"); }catch(e){ prompt("Payment link:", payLink(o)); }
  };
  if($("#copyDriver")) $("#copyDriver").onclick = async () => {
    const f = $("#fee"), v = f ? Math.max(0, Number(f.value || 0)) : Number(o.delivery_fee) || 0;
    const text = driverMessage({...o, delivery_fee: v, total: Number(o.subtotal) + v});
    try{ await navigator.clipboard.writeText(text); toast("Driver message copied — paste it in WhatsApp, Viber or Messenger"); }
    catch(e){ prompt("Copy this for the driver:", text); }
  };
  $("#copyConfirm").onclick = async () => {
    const first = (o.customer_name || "").trim().split(" ")[0];
    const fee = Number(o.delivery_fee) || 0;
    const delivery = o.mode === "Delivery";
    const hasPin = o.delivery_lat != null && o.delivery_lng != null;
    const when = o.order_date ? new Date(o.order_date + "T00:00:00").toLocaleDateString("en-PH", {weekday:"short", month:"short", day:"numeric"}) : "";
    const lines = [
      `Hi ${first}! This is ${CONFIG.businessName} 🧆`,
      `Thanks for placing your order, see details below:`,
      ``,
      `🧾 Order ${o.ref} (#${o.order_no})`,
      `${delivery ? "🛵 Delivery" : `🏪 Pick-Up at ${o.branch} branch`}${when ? ` · ${when}` : ""}${o.preferred_time ? ` · ${o.preferred_time}` : ""}`,
      ``,
      `👤 ${o.customer_name} · ${o.customer_phone}`,
      ...(delivery && o.address ? [`🏠 ${o.address}`] : []),
      ...(delivery && hasPin ? [`📍 Pinned location: https://www.google.com/maps/search/?api=1&query=${Number(o.delivery_lat)},${Number(o.delivery_lng)}`] : []),
      ``,
      `📦 Items:`,
      ...o.items.map(i => `• ${i.qty}x ${i.name}${i.opts && i.opts.length ? ` (${i.opts.join(", ")})` : ""} — ${peso(i.qty * i.unit)}`),
      ``,
      `🍽️ Food total: ${peso(o.subtotal)}`,
      ...(delivery ? [`🛵 Delivery fee: ${fee ? peso(fee) : "to be confirmed"}`] : []),
      `💵 Payment: ${o.payment || "—"}`,
      ...(o.notes ? [``, `📝 Note: ${o.notes}`] : []),
      ...(isGcash(o) && o.payment_status !== "paid" ? [``, `Pay via GCash here 👉 ${payLink(o)}`] : []),
      ``,
      o.mode === "Delivery" ? `We'll message you when it's on the way.` : `We'll message you when it's ready for pickup at our ${o.branch} branch.`,
      `Salamat po! 🙏`
    ];
    try{ await navigator.clipboard.writeText(lines.join("\n")); toast("Reply copied — paste it in Messenger"); }
    catch(e){ prompt("Copy this reply:", lines.join("\n")); }
  };
  const close = $("#dClose"); if(close) close.onclick = () => { selId = null; el.classList.remove("open"); render(); };
}

/* Message for the delivery driver: only where, who, when, what's in the bag and what to collect. */
function driverMessage(o){
  const hasPin = o.delivery_lat != null && o.delivery_lng != null;
  const maps = hasPin ? `https://www.google.com/maps/search/?api=1&query=${Number(o.delivery_lat)},${Number(o.delivery_lng)}` : "";
  const fee = Number(o.delivery_fee) || 0;
  // GCash covers the food only; the delivery fee is always collected in cash by the driver.
  const feeText = fee ? `${peso(fee)} - 💵 Collect cash` : `⏳ Pending`;
  const collect = isGcash(o)
    ? [`🍽️ Food - ${peso(o.subtotal)} - ✅ Paid thru GCash`, `🛵 Delivery Fee - ${feeText}`]
    : [`🍽️ Food - ${peso(o.subtotal)} - 💵 Collect cash`, `🛵 Delivery Fee - ${feeText}`,
       ...(fee ? [`💰 Total to collect - ${peso(o.total)}`] : [])];
  const itemCount = o.items.reduce((n, i) => n + Number(i.qty || 0), 0);
  const lines = [
    `🛵 DELIVERY — Order #${o.order_no} (${o.ref})`,
    `📅 ${fmtOrderDate(o.order_date)} · ${o.preferred_time || "ASAP"}`,
    ``,
    `👤 ${o.customer_name}`,
    `📞 ${o.customer_phone}`,
    `🏠 ${o.address || "—"}`,
    hasPin ? `📍 ${maps}` : `📍 No map pin — use the address above`,
    ``,
    `📦 Items (${itemCount}):`,
    ...o.items.map(i => `• ${i.qty}x ${i.name}${i.opts && i.opts.length ? ` (${i.opts.join(", ")})` : ""}`),
    ``,
    ...collect,
    ...(o.notes ? [``, `📝 Customer note: ${o.notes}`] : []),
    ``,
    `🙏 Salamat po! Ingat sa byahe 🛵💨`
  ];
  return lines.join("\n");
}

function orderField(label, id, value, type="text", wide=false, extra=""){
  return `<label class="edit-field${wide?" wide":""}" for="${id}">${label}<input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
}
function productOptions(item){
  const match = item && ADMIN_PRODUCTS.find(product => product.name === item.name);
  const products = ADMIN_PRODUCTS.map(product =>
    `<option value="${esc(product.id)}"${match && match.id === product.id ? " selected" : ""}>${esc(product.name)} · ${peso(product.price)}</option>`
  ).join("");
  const existing = item && !match
    ? `<option value="__current__" selected>Existing: ${esc(item.name)}</option>`
    : "";
  return `<option value="">Choose product…</option>${existing}${products}`;
}
function orderItemRow(item){
  const match = item && ADMIN_PRODUCTS.find(product => product.name === item.name);
  const options = Array.isArray(item?.opts) ? item.opts.join(", ") : "";
  return `<div class="edit-item" data-existing-name="${esc(item && !match ? item.name : "")}">
    <select class="edit-product" aria-label="Product" required>${productOptions(item)}</select>
    <input class="edit-qty" type="number" min="1" max="99" step="1" value="${item ? Number(item.qty) : 1}" aria-label="Quantity" required>
    <input class="edit-unit" type="number" min="0" max="100000" step="0.01" value="${item ? Number(item.unit) : ""}" aria-label="Unit price" required>
    <input class="edit-options" type="text" value="${esc(options)}" placeholder="Options, comma-separated" aria-label="Options">
    <button class="remove" type="button" aria-label="Remove item" title="Remove item">×</button>
  </div>`;
}
function updateOrderEditorTotal(){
  const subtotal = Array.from(document.querySelectorAll("#orderEditItems .edit-item")).reduce((sum, row) => {
    return sum + Number(row.querySelector(".edit-qty").value || 0) * Number(row.querySelector(".edit-unit").value || 0);
  }, 0);
  const fee = Number($("#editDeliveryFee")?.value || 0);
  $("#orderEditTotal").textContent = `Subtotal ${peso(subtotal)} · Total ${peso(subtotal + fee)}`;
}
function refreshEditorPayment(selected=""){
  const mode = $("#editMode").value;
  const allowed = mode === "Delivery"
    ? [["Cash on Delivery","Cash on Delivery"],["GCash","GCash"]]
    : [["Cash","Cash"],["GCash","GCash"]];
  $("#editPayment").innerHTML = allowed.map(([value,label]) =>
    `<option value="${value}"${value === selected ? " selected" : ""}>${label}</option>`
  ).join("");
  if(!allowed.some(([value]) => value === selected)) $("#editPayment").value = allowed[0][0];
}
function openOrderEditor(order=null){
  if(order && isGcash(order)){ toast("GCash orders can't be edited from the admin."); return; }
  editingOrderId = order?.id || null;
  const isNew = !order;
  $("#orderEditTitle").textContent = isNew ? "Add order" : `Edit order #${order.order_no}`;
  $("#orderEditSave").textContent = isNew ? "Create order" : "Save changes";
  $("#orderEditMsg").textContent = "";
  const branches = [...new Set([...CONFIG.branches, ...(order?.branch ? [order.branch] : [])])];
  const statuses = Object.entries(STATUS).map(([value,status]) =>
    `<option value="${value}"${value === (order?.status || "new") ? " selected" : ""}>${status.label}</option>`
  ).join("");
  const branchOptions = branches.map(branch =>
    `<option value="${esc(branch)}"${branch === (order?.branch || branches[0]) ? " selected" : ""}>${esc(branch)}</option>`
  ).join("");
  const mode = order?.mode || "Delivery";
  const values = {
    name: order?.customer_name || "", phone: order?.customer_phone || "", email: order?.customer_email || "",
    address: order?.address || "", date: order?.order_date || ymdLocal(new Date()),
    time: order?.preferred_time || "", fee: order ? Number(order.delivery_fee) : 0,
    notes: order?.notes || "", staffNotes: order?.staff_notes || ""
  };
  $("#orderEditFields").innerHTML = `
    ${orderField("Customer name","editName",values.name,"text",false,"maxlength=\"80\" required autocomplete=\"name\"")}
    ${orderField("Mobile number","editPhone",values.phone,"tel",false,"maxlength=\"20\" required autocomplete=\"tel\"")}
    ${orderField("Email (optional)","editEmail",values.email,"email",false,"maxlength=\"120\" autocomplete=\"email\"")}
    <label class="edit-field" for="editMode">Order type<select id="editMode"><option value="Delivery"${mode==="Delivery"?" selected":""}>Delivery</option><option value="Pick-Up"${mode==="Pick-Up"?" selected":""}>Pick-Up</option></select></label>
    <label class="edit-field" for="editBranch">Branch<select id="editBranch" required>${branchOptions}</select></label>
    <label class="edit-field wide" for="editAddress">Delivery address<textarea id="editAddress" rows="2" maxlength="300">${esc(values.address)}</textarea></label>
    <label class="edit-field" for="editDate">Delivery / Pick-Up date<input id="editDate" type="date" value="${esc(values.date)}" required></label>
    ${orderField("Preferred time","editTime",values.time,"text",false,"maxlength=\"60\" placeholder=\"e.g. 6:00 PM\"")}
    <label class="edit-field" for="editPayment">Payment<select id="editPayment"></select></label>
    <label class="edit-field" for="editStatus">Status<select id="editStatus">${statuses}</select></label>
    ${orderField("Delivery fee","editDeliveryFee",values.fee,"number",false,"min=\"0\" max=\"100000\" step=\"0.01\" required")}
    <label class="edit-field wide" for="editNotes">Customer notes<textarea id="editNotes" rows="2" maxlength="500">${esc(values.notes)}</textarea></label>
    <label class="edit-field wide" for="editStaffNotes">Staff notes<textarea id="editStaffNotes" rows="2" maxlength="1000">${esc(values.staffNotes)}</textarea></label>`;
  const items = order?.items?.length ? order.items : [];
  $("#orderEditItems").innerHTML = items.map(orderItemRow).join("");
  $("#orderEditDialog").showModal();
  refreshEditorPayment(order?.payment || "");
  updateOrderEditorTotal();
}
function newOrderReference(){
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(6));
  return "AK-" + Array.from(bytes, byte => chars[byte % chars.length]).join("");
}
$("#addOrder").onclick = () => openOrderEditor();
$("#orderEditClose").onclick = () => $("#orderEditDialog").close();
$("#orderEditCancel").onclick = () => $("#orderEditDialog").close();
$("#orderEditDialog").addEventListener("close", () => { $("#orderEditForm").reset(); editingOrderId = null; });
$("#orderEditFields").addEventListener("change", event => {
  if(event.target.id === "editMode") refreshEditorPayment($("#editPayment").value);
});
$("#addOrderItem").onclick = () => {
  $("#orderEditItems").insertAdjacentHTML("beforeend", orderItemRow(null));
  updateOrderEditorTotal();
};
$("#orderEditItems").addEventListener("click", event => {
  const remove = event.target.closest(".remove");
  if(remove){ remove.closest(".edit-item").remove(); updateOrderEditorTotal(); }
});
$("#orderEditItems").addEventListener("change", event => {
  const select = event.target.closest(".edit-product");
  if(select){
    const product = ADMIN_PRODUCTS.find(item => item.id === select.value);
    if(product) select.closest(".edit-item").querySelector(".edit-unit").value = product.price;
  }
  updateOrderEditorTotal();
});
$("#orderEditForm").addEventListener("input", event => {
  if(event.target.id === "editDeliveryFee" || event.target.matches(".edit-qty,.edit-unit"))
    updateOrderEditorTotal();
});
$("#orderEditForm").addEventListener("submit", async event => {
  event.preventDefault();
  const message = $("#orderEditMsg");
  const button = $("#orderEditSave");
  const rows = Array.from(document.querySelectorAll("#orderEditItems .edit-item"));
  const items = [];
  for(const row of rows){
    const select = row.querySelector(".edit-product");
    const product = ADMIN_PRODUCTS.find(item => item.id === select.value);
    const name = product?.name || (select.value === "__current__" ? row.dataset.existingName : "");
    const qty = Number(row.querySelector(".edit-qty").value);
    const unit = Number(row.querySelector(".edit-unit").value);
    if(!name || !Number.isInteger(qty) || qty < 1 || qty > 99 || !Number.isFinite(unit) || unit < 0 || unit > 100000){
      message.textContent = "Choose a product and enter a valid quantity and unit price for every line.";
      return;
    }
    items.push({name, opts:row.querySelector(".edit-options").value.split(",").map(value=>value.trim()).filter(Boolean), qty, unit});
  }
  if(items.length < 1 || items.length > 50){ message.textContent = "An order needs between 1 and 50 line items."; return; }
  if($("#editMode").value === "Delivery" && !$("#editAddress").value.trim()){
    message.textContent = "Enter a delivery address.";
    return;
  }
  const payload = {
    ref:editingOrderId ? orders.find(item=>item.id===editingOrderId)?.ref : newOrderReference(),
    mode:$("#editMode").value, branch:$("#editBranch").value,
    name:$("#editName").value.trim(), phone:$("#editPhone").value.trim(), email:$("#editEmail").value.trim(),
    address:$("#editAddress").value.trim(), order_date:$("#editDate").value,
    time:$("#editTime").value.trim(), payment:$("#editPayment").value,
    status:$("#editStatus").value, delivery_fee:$("#editDeliveryFee").value,
    notes:$("#editNotes").value.trim(), staff_notes:$("#editStaffNotes").value.trim(), items
  };
  const isUpdate = Boolean(editingOrderId);
  button.disabled = true;
  message.textContent = "Saving order…";
  try{
    const {data, error} = await sb.rpc("save_staff_order", {p_order_id:editingOrderId, p_order:payload});
    if(error) throw new Error("Couldn't save order: " + error.message);
    if(!data || !data.id) throw new Error("The database did not return the saved order.");
    const index = orders.findIndex(item => item.id === data.id);
    if(index >= 0) orders[index] = data;
    else orders.unshift(data);
    if(!isUpdate) setDateRangeToToday();
    selId = data.id;
    tab = "all";
    $("#orderEditDialog").close();
    render();
    toast(isUpdate ? `Order #${data.order_no} updated` : `Order #${data.order_no} created`);
  }catch(error){
    message.textContent = error.message || "Couldn't save order.";
  }finally{
    button.disabled = false;
  }
});

function openDeleteDialog(order){
  $("#deleteTitle").textContent = `Delete order #${order.order_no}?`;
  $("#deleteContext").textContent = "The order will be removed from active views. Its database record will be retained in Deleted with your reason.";
  $("#deleteMsg").textContent = "";
  $("#deleteReason").value = "";
  $("#deletePassword").value = "";
  $("#deleteConfirm").disabled = false;
  $("#deleteDialog").showModal();
  $("#deleteReason").focus();
}

$("#deleteCancel").onclick = () => $("#deleteDialog").close();
$("#deleteDialog").addEventListener("close", () => { $("#deleteForm").reset(); $("#deleteMsg").textContent = ""; });
$("#deleteForm").addEventListener("submit", async event => {
  event.preventDefault();
  const order = orders.find(item => item.id === selId);
  const reason = $("#deleteReason").value.trim();
  const password = $("#deletePassword").value;
  $("#deletePassword").value = "";
  if(!order || order.deleted_at){ $("#deleteMsg").textContent = "This order is no longer available to delete."; return; }
  if(!reason){ $("#deleteMsg").textContent = "Enter a reason before deleting."; return; }
  const button = $("#deleteConfirm");
  button.disabled = true;
  $("#deleteMsg").textContent = "Verifying password…";
  try{
    const {data: sessionData, error: sessionError} = await sb.auth.getSession();
    if(sessionError || !sessionData.session) throw new Error("Your staff session has expired. Log in again.");
    const {data: authData, error: authError} = await sb.auth.signInWithPassword({email:staffEmail, password});
    if(authError || !authData.user || authData.user.id !== sessionData.session.user.id)
      throw new Error("Password verification failed. Check your staff account password and try again.");
    const {data, error} = await sb.rpc("archive_order", {p_order_id:order.id, p_reason:reason});
    if(error) throw new Error("Couldn't delete the order: " + error.message);
    if(!data || data.id !== order.id) throw new Error("This order was already deleted or is no longer available.");
    const index = orders.findIndex(item => item.id === data.id);
    if(index >= 0) orders[index] = data;
    tab = "all";
    $("#deleteDialog").close();
    render();
    toast(`#${order.order_no} removed from active orders; record retained`);
  }catch(error){
    $("#deleteMsg").textContent = error.message || "Couldn't delete the order.";
  }finally{
    button.disabled = false;
    $("#deletePassword").value = "";
  }
});

async function loadPaymentScreenshot(orderId, path){
  if(!$("#paymentScreenshot")) return;
  try{
    const {data, error} = await sb.storage.from("gcash-confirmations").createSignedUrl(path, 300);
    if(selId !== orderId || !$("#paymentScreenshot")) return;
    if(error || !data || !data.signedUrl){
      $("#paymentScreenshot").textContent = "Couldn't load the payment screenshot: " + (error ? error.message : "signed link unavailable");
      return;
    }
    const current = $("#paymentScreenshot");
    current.textContent = "";
    const link = document.createElement("a");
    link.href = data.signedUrl;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = "Open full-size screenshot";
    const image = document.createElement("img");
    image.src = data.signedUrl;
    image.alt = "Customer GCash payment confirmation";
    image.onerror = () => { current.textContent = "Couldn't display the payment screenshot."; };
    current.append(link, image);
  }catch(error){
    if(selId === orderId && $("#paymentScreenshot"))
      $("#paymentScreenshot").textContent = "Couldn't load the payment screenshot: " + error.message;
  }
}

/* ================= EVENTS ================= */
$("#tabs").addEventListener("click", e => { const t = e.target.closest(".tab"); if(t){ tab = t.dataset.tab; render(); } });
$("#list").addEventListener("click", e => { const b = e.target.closest(".order"); if(b){ selId = b.dataset.id; render(); } });
$("#q").addEventListener("input", render);
$("#branchF").addEventListener("change", e => { ls.set("ak_branch", e.target.value); render(); });
function setDateRangeToToday(){
  const today = ymdLocal(new Date());
  $("#rangeFrom").value = today;
  $("#rangeTo").value = today;
  const date = new Date(today + "T00:00:00Z");
  calendarYear = date.getUTCFullYear();
  calendarMonth = date.getUTCMonth();
  updateDateRangeButton();
  renderCalendar();
}
let calendarYear, calendarMonth, pendingRangeStart = null;
function formatCalendarDate(value){
  return new Intl.DateTimeFormat("en-PH", {timeZone:"UTC", month:"short", day:"numeric", year:"numeric"})
    .format(new Date(value + "T00:00:00Z"));
}
function updateDateRangeButton(){
  $("#dateRangeBtn").textContent = `${formatCalendarDate($("#rangeFrom").value)} – ${formatCalendarDate($("#rangeTo").value)} ▾`;
}
function renderCalendar(){
  if(!Number.isInteger(calendarYear) || !Number.isInteger(calendarMonth)) return;
  const monthDate = new Date(Date.UTC(calendarYear, calendarMonth, 1));
  $("#calendarMonth").textContent = new Intl.DateTimeFormat("en-PH", {timeZone:"UTC", month:"long", year:"numeric"}).format(monthDate);
  const firstWeekday = monthDate.getUTCDay();
  const daysInMonth = new Date(Date.UTC(calendarYear, calendarMonth + 1, 0)).getUTCDate();
  const start = pendingRangeStart || $("#rangeFrom").value;
  const end = pendingRangeStart ? pendingRangeStart : $("#rangeTo").value;
  const days = [];
  for(let i = 0; i < 42; i++){
    const day = i - firstWeekday + 1;
    if(day < 1 || day > daysInMonth){ days.push('<span class="calendar-empty" aria-hidden="true"></span>'); continue; }
    const value = `${calendarYear}-${String(calendarMonth + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const selected = value === start || value === end;
    const inRange = value > start && value < end;
    const classes = ["calendar-day", selected ? "selected" : "", inRange ? "in-range" : "",
      value === start && value !== end ? "range-start" : "", value === end && value !== start ? "range-end" : ""].filter(Boolean).join(" ");
    days.push(`<button class="${classes}" type="button" role="gridcell" data-date="${value}" aria-label="${formatCalendarDate(value)}"${selected ? ' aria-pressed="true"' : ""}>${day}</button>`);
  }
  $("#calendarDays").innerHTML = days.join("");
  $("#calendarInstruction").textContent = pendingRangeStart ? `Start: ${formatCalendarDate(pendingRangeStart)}. Choose an end date.` : "Choose a start date, then an end date.";
}
function chooseCalendarDate(value){
  if(!pendingRangeStart){
    pendingRangeStart = value;
    renderCalendar();
    return;
  }
  const from = value < pendingRangeStart ? value : pendingRangeStart;
  const to = value < pendingRangeStart ? pendingRangeStart : value;
  $("#rangeFrom").value = from;
  $("#rangeTo").value = to;
  pendingRangeStart = null;
  updateDateRangeButton();
  renderCalendar();
  $("#dateRangeCalendar").hidden = true;
  $("#dateRangeBtn").setAttribute("aria-expanded", "false");
  load();
}
$("#dateRangeBtn").addEventListener("click", () => {
  const calendar = $("#dateRangeCalendar");
  calendar.hidden = !calendar.hidden;
  $("#dateRangeBtn").setAttribute("aria-expanded", String(!calendar.hidden));
});
$("#calendarPrev").addEventListener("click", () => {
  const date = new Date(Date.UTC(calendarYear, calendarMonth - 1, 1));
  calendarYear = date.getUTCFullYear(); calendarMonth = date.getUTCMonth(); renderCalendar();
});
$("#calendarNext").addEventListener("click", () => {
  const date = new Date(Date.UTC(calendarYear, calendarMonth + 1, 1));
  calendarYear = date.getUTCFullYear(); calendarMonth = date.getUTCMonth(); renderCalendar();
});
$("#calendarDays").addEventListener("click", event => {
  const day = event.target.closest(".calendar-day");
  if(day) chooseCalendarDate(day.dataset.date);
});
document.addEventListener("click", event => {
  if(!event.target.closest(".date-range")){
    $("#dateRangeCalendar").hidden = true;
    $("#dateRangeBtn").setAttribute("aria-expanded", "false");
  }
});
$("#dateRangeBtn").addEventListener("keydown", event => {
  if(event.key === "Escape"){
    $("#dateRangeCalendar").hidden = true;
    $("#dateRangeBtn").setAttribute("aria-expanded", "false");
  }
});
setDateRangeToToday();
$("#refresh").onclick = async () => { if(await load()) toast("Up to date"); };
document.addEventListener("keydown", e => { if(e.key === "Escape" && $("#detail").classList.contains("open")){ selId = null; render(); } });
setInterval(() => { if(!$("#appView").hidden && !document.activeElement?.closest?.(".detail")) render(); }, 30000); // refresh "x min ago"

/* CSV export of active orders matching the current range, branch, and search */
$("#csv").onclick = () => {
  const rows = filtered();
  if(!rows.length) return toast("Nothing to export");
  const head = ["order_no","ref","date_time","status","mode","branch","order_date","preferred_time","customer_name","customer_phone","customer_email","address","pin_lat","pin_lng","items","subtotal","delivery_fee","total","payment","payment_status","gcash_ref","paid_at","channel","customer_notes","staff_notes"];
  const q = v => { let s = String(v ?? ""); if(/^[=@\t\r]/.test(s)) s = "'" + s;   // stop Excel treating text as a formula
    return /[",\n]/.test(s) ? `"${s.replace(/"/g,'""')}"` : s; };
  const lines = rows.map(o => [o.order_no, o.ref, fmtFull.format(new Date(o.created_at)).replace(",", ""), STATUS[o.status]?.label || o.status, orderModeLabel(o.mode), o.branch, o.order_date, o.preferred_time, o.customer_name, o.customer_phone, o.customer_email, o.address, o.delivery_lat, o.delivery_lng,
    o.items.map(i => `${i.qty}x ${i.name}${i.opts && i.opts.length ? ` (${i.opts.join(", ")})` : ""}`).join("; "),
    o.subtotal, o.delivery_fee, o.total, o.payment, PAY[o.payment_status] || o.payment_status, o.payment_ref,
    o.paid_at ? fmtFull.format(new Date(o.paid_at)).replace(",", "") : "", o.channel, o.notes, o.staff_notes].map(q).join(","));
  const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\r\n")], {type:"text/csv;charset=utf-8"});
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `arbab-kebab-orders-${$("#rangeFrom").value}-to-${$("#rangeTo").value}.csv`; a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
};

/* sound for new orders */
function unlockAudio(){ try{ audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)(); if(audioCtx.state === "suspended") audioCtx.resume(); }catch(e){} }
document.addEventListener("pointerdown", unlockAudio, {once:true});
function beep(){
  if(!soundOn || !audioCtx) return;
  try{
    [0, .22, .44].forEach((t,i) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = "sine"; o.frequency.value = [880, 1175, 1568][i];
      g.gain.setValueAtTime(.0001, audioCtx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(.35, audioCtx.currentTime + t + .02);
      g.gain.exponentialRampToValueAtTime(.0001, audioCtx.currentTime + t + .2);
      o.connect(g).connect(audioCtx.destination); o.start(audioCtx.currentTime + t); o.stop(audioCtx.currentTime + t + .22);
    });
  }catch(e){}
}
function setSoundBtn(){ $("#soundBtn").textContent = soundOn ? "🔔 Sound on" : "🔕 Sound off"; $("#soundBtn").setAttribute("aria-pressed", soundOn); }
$("#soundBtn").onclick = () => { soundOn = !soundOn; ls.set("ak_sound", soundOn ? "on" : "off"); setSoundBtn(); unlockAudio(); if(soundOn) beep(); };

let tt; function toast(t, isNew){ const el = $("#toast"); el.textContent = t; el.className = "toast show" + (isNew ? " new" : ""); clearTimeout(tt); tt = setTimeout(() => el.className = "toast", isNew ? 6000 : 2200); }

/* ================= MENU EDITOR =================
   Items live in the Supabase table menu_items; the website reads the visible ones.
   "Delete" archives an item (it can be restored with "Show deleted"). */
const MENU_CATS = (window.SITE_CONFIG && window.SITE_CONFIG.menuCategories) || [
  {id:"MealSets",name:"Meal Sets"},{id:"Potluck",name:"Potlucks"},{id:"Salads",name:"Salads"},
  {id:"Solo",name:"Solo Orders"},{id:"Fried",name:"Fried"},{id:"AddOns",name:"Add-Ons"},
  {id:"Wraps",name:"Wraps"},{id:"Drinks",name:"Drinks"},{id:"Sauces",name:"Sauces"}
];
let menuItems = [], editingMenuId = null, menuImgFile = null;
const menuImgUrl = img => !img ? "" : /^(https?:|data:|blob:)/.test(img) ? img : CONFIG.orderSiteUrl.replace(/\/$/,"") + "/" + img.replace(/^\//,"");
const catName = id => (MENU_CATS.find(c => c.id === id) || {}).name || id;

function showView(view){
  ls.set("ak_view", view);
  document.querySelectorAll(".views button").forEach(b => { const on = b.dataset.view === view; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); });
  $("#ordersView").hidden = view !== "orders";
  $("#menuView").hidden = view !== "menu";
  $("#usersView").hidden = view !== "users";
  if(view === "users") loadUsers();
}
document.querySelectorAll(".views button").forEach(b => b.onclick = () => showView(b.dataset.view));

async function loadMenu(){
  const { data, error } = await sb.from("menu_items").select("*").order("sort").order("name");
  if(error){ $("#menuList").innerHTML = `<div class="empty">Couldn't load the menu: ${esc(error.message)}</div>`; return; }
  menuItems = data || [];
  // the "Add order" product list follows the live menu
  const live = menuItems.filter(m => !m.archived);
  if(live.length) ADMIN_PRODUCTS.splice(0, ADMIN_PRODUCTS.length, ...live.map(m => ({id:m.id, name:m.name, price:Number(m.price)})));
  renderMenuList();
}
function renderMenuList(){
  const q = $("#menuQ").value.trim().toLowerCase(), cf = $("#menuCatF").value, showDel = $("#menuShowDeleted").checked;
  const items = menuItems.filter(m => (showDel || !m.archived) && (!cf || m.cat === cf)
    && (!q || `${m.name} ${m.description} ${m.tag||""}`.toLowerCase().includes(q)));
  const cats = [...MENU_CATS, ...[...new Set(items.map(m => m.cat))].filter(id => !MENU_CATS.some(c => c.id === id)).map(id => ({id, name:id + " (not on website)"}))];
  const html = cats.map(c => {
    const list = items.filter(m => m.cat === c.id);
    if(!list.length) return "";
    return `<section class="menu-cat"><h2>${esc(c.name)} · ${list.length}</h2><div class="items">${list.map(m => {
      const initials = m.name.split(" ").slice(0,2).map(w => w[0]).join("");
      return `<div class="mi${m.hidden || m.archived ? " off" : ""}" data-id="${esc(m.id)}">
        ${m.img ? `<img class="mi-thumb" src="${esc(menuImgUrl(m.img))}" alt="" loading="lazy">` : `<span class="mi-thumb">${esc(initials)}</span>`}
        <div style="min-width:0"><div class="mi-name">${esc(m.name)}${m.tag ? `<span class="mtag">${esc(m.tag)}</span>` : ""}${m.archived ? `<span class="mflag del">Deleted</span>` : m.hidden ? `<span class="mflag">Hidden</span>` : ""}</div>
          <div class="mi-desc">${esc(m.description || "")}</div></div>
        <div class="mi-price">${peso(m.price)}</div>
        <div class="mi-btns">${m.archived
          ? `<button class="btn sm" data-mrestore>Restore</button>`
          : `<button class="btn sm" data-mtoggle>${m.hidden ? "Show" : "Hide"}</button><button class="btn sm dark" data-medit>Edit</button>`}</div>
      </div>`;
    }).join("")}</div></section>`;
  }).join("");
  $("#menuList").innerHTML = html || `<div class="empty">${menuItems.length ? "No menu items match." : "No menu items yet. Click ＋ Add menu item."}</div>`;
}
$("#menuCatF").innerHTML = `<option value="">All categories</option>` + MENU_CATS.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
$("#mCat").innerHTML = MENU_CATS.map(c => `<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
$("#menuQ").addEventListener("input", renderMenuList);
$("#menuCatF").addEventListener("change", renderMenuList);
$("#menuShowDeleted").addEventListener("change", renderMenuList);
$("#menuRefresh").onclick = loadMenu;
$("#addMenuItem").onclick = () => openMenuEditor(null);

async function patchMenuItem(id, patch, msg){
  const { error } = await sb.from("menu_items").update(patch).eq("id", id);
  if(error) return toast("Couldn't save: " + error.message), false;
  Object.assign(menuItems.find(m => m.id === id) || {}, patch);
  renderMenuList(); toast(msg); return true;
}
$("#menuList").addEventListener("click", e => {
  const row = e.target.closest(".mi"); if(!row) return;
  const m = menuItems.find(x => x.id === row.dataset.id); if(!m) return;
  if(e.target.closest("[data-medit]")) openMenuEditor(m);
  else if(e.target.closest("[data-mtoggle]")) patchMenuItem(m.id, {hidden: !m.hidden}, m.hidden ? `${m.name} is back on the website` : `${m.name} is hidden from the website`);
  else if(e.target.closest("[data-mrestore]")) patchMenuItem(m.id, {archived: false}, `${m.name} restored`);
});

/* options text <-> [{label, choices:[{name, add}]}] */
function optionsToText(options){
  return (options || []).map(o => `${o.label}: ${(o.choices || []).map(c => c.name + (Number(c.add) ? ` +${Number(c.add)}` : "")).join(", ")}`).join("\n");
}
function textToOptions(text){
  const groups = [];
  for(const line of text.split("\n").map(l => l.trim()).filter(Boolean)){
    const i = line.indexOf(":");
    if(i < 1) throw new Error(`"${line}" needs a name and a colon, like "Spice level: Mild, Spicy"`);
    const choices = line.slice(i + 1).split(",").map(c => c.trim()).filter(Boolean).map(c => {
      const m = c.match(/^(.*?)\s*\+\s*₱?\s*(\d+(?:\.\d+)?)$/);
      return m ? {name:m[1], add:Number(m[2])} : {name:c, add:0};
    });
    if(!choices.length) throw new Error(`"${line.slice(0, i)}" has no choices after the colon`);
    groups.push({label:line.slice(0, i).trim(), choices});
  }
  return groups;
}

function setImgPreview(src){
  $("#mImgPreview").innerHTML = src ? `<img src="${esc(src)}" alt="Photo preview">` : `<span class="ph">No photo</span>`;
  $("#mImgClear").hidden = !src;
}
function syncTagPicks(){
  const t = $("#mTag").value.trim();
  document.querySelectorAll("#mTagPicks button").forEach(b => b.classList.toggle("on", b.dataset.tag === t));
}
$("#mTagPicks").addEventListener("click", e => { const b = e.target.closest("[data-tag]"); if(b){ $("#mTag").value = b.dataset.tag; syncTagPicks(); } });
$("#mTag").addEventListener("input", syncTagPicks);
$("#mImg").addEventListener("input", () => { menuImgJob = null; menuImgFile = null; $("#mImgFile").value = ""; setImgPreview(menuImgUrl($("#mImg").value.trim())); });
/* every menu photo is optimized as soon as it's picked (js/image-optimize.js): upright, no hidden GPS data,
   at least MENU_PHOTO.minSide px so it looks sharp, at most MENU_PHOTO.maxSide px, WebP. Only the optimized copy is uploaded. */
const MENU_PHOTO = {maxSide: 900, minSide: 400, quality: 0.86, minQuality: 0.62, maxBytes: 300 * 1024, hardLimit: 1024 * 1024, what: "photo"};
let menuImgJob = null;
$("#mImgFile").addEventListener("change", () => {
  const f = $("#mImgFile").files[0]; if(!f) return;
  const msg = $("#menuMsg");
  menuImgFile = null;
  msg.textContent = "Optimizing photo…";
  const job = menuImgJob = optimizeImage(f, MENU_PHOTO).then(r => {
    if(job !== menuImgJob) return null;   // a newer photo was picked meanwhile
    menuImgFile = r; $("#mImg").value = "";
    setImgPreview(URL.createObjectURL(r.blob));
    msg.textContent = `Photo optimized: ${r.width}×${r.height} px, ${r.before} → ${r.after}.`;
    return r;
  }).catch(err => {
    if(job !== menuImgJob) return null;
    // keep the item's current photo; the refused one is never uploaded
    menuImgJob = null; menuImgFile = null; $("#mImgFile").value = "";
    msg.textContent = err.message;
    return null;
  });
});
$("#mImgClear").onclick = () => { menuImgJob = null; menuImgFile = null; $("#mImgFile").value = ""; $("#mImg").value = ""; setImgPreview(""); $("#menuMsg").textContent = ""; };

function openMenuEditor(m){
  editingMenuId = m ? m.id : null; menuImgFile = null; menuImgJob = null;
  $("#menuDialogTitle").textContent = m ? `Edit ${m.name}` : "Add menu item";
  $("#mName").value = m ? m.name : "";
  $("#mCat").value = m ? m.cat : ($("#menuCatF").value || MENU_CATS[0].id);
  $("#mPrice").value = m ? Number(m.price) : "";
  $("#mDesc").value = m ? m.description || "" : "";
  $("#mTag").value = m ? m.tag || "" : ""; syncTagPicks();
  $("#mImg").value = m ? m.img || "" : ""; $("#mImgFile").value = "";
  setImgPreview(m ? menuImgUrl(m.img) : "");
  $("#mOpts").value = m ? optionsToText(m.options) : "";
  $("#mShown").checked = m ? !m.hidden : true;
  $("#menuDelete").hidden = !m || m.archived;
  $("#menuMsg").textContent = "";
  $("#menuSave").disabled = false;
  $("#menuDialog").showModal();
  $("#mName").focus();
}
const closeMenuEditor = () => $("#menuDialog").close();
$("#menuClose").onclick = closeMenuEditor; $("#menuCancel").onclick = closeMenuEditor;

$("#menuForm").addEventListener("submit", async e => {
  e.preventDefault();
  const msg = $("#menuMsg"); msg.textContent = "";
  const name = $("#mName").value.trim(), price = Number($("#mPrice").value);
  if(!name) return msg.textContent = "Add a name.";
  if(!(price >= 0) || $("#mPrice").value === "") return msg.textContent = "Add a price.";
  let options;
  try{ options = textToOptions($("#mOpts").value); }catch(err){ return msg.textContent = err.message; }
  $("#menuSave").disabled = true;
  const id = editingMenuId || (name.replace(/[^a-z0-9]+/gi, "").slice(0, 16) || "item") + "_" + Date.now().toString(36);
  let img = $("#mImg").value.trim();
  if(menuImgJob && !menuImgFile){   // still optimizing the photo that was just picked
    msg.textContent = "Optimizing photo…";
    await menuImgJob;
    if(!menuImgFile){ $("#menuSave").disabled = false; return msg.textContent = "That photo couldn't be used — pick another one, or save without changing the photo."; }
  }
  if(menuImgFile){
    msg.textContent = "Uploading photo…";
    const {blob, ext} = menuImgFile;   // only the optimized copy is ever uploaded
    const path = `${id}/${Date.now()}.${ext}`;
    const up = await sb.storage.from("menu-images").upload(path, blob, {contentType: blob.type, upsert: false, cacheControl: "31536000"});
    if(up.error){ $("#menuSave").disabled = false; return msg.textContent = "Photo upload failed: " + up.error.message; }
    img = sb.storage.from("menu-images").getPublicUrl(path).data.publicUrl;
    msg.textContent = "";
  }
  const row = {name, cat:$("#mCat").value, price, description:$("#mDesc").value.trim(), tag:$("#mTag").value.trim() || null,
    img: img || null, options, hidden: !$("#mShown").checked};
  let res;
  if(editingMenuId) res = await sb.from("menu_items").update(row).eq("id", id).select().single();
  else {
    row.id = id;
    row.sort = menuItems.reduce((mx, m) => Math.max(mx, m.sort || 0), 0) + 10;
    res = await sb.from("menu_items").insert(row).select().single();
  }
  $("#menuSave").disabled = false;
  if(res.error) return msg.textContent = "Couldn't save: " + res.error.message;
  closeMenuEditor();
  await loadMenu();
  toast(editingMenuId ? `Saved ${name}` : `Added ${name} to the menu`);
});
$("#menuDelete").onclick = async () => {
  const m = menuItems.find(x => x.id === editingMenuId); if(!m) return;
  if(!confirm(`Delete "${m.name}" from the menu?\n\nIt disappears from the website. You can bring it back with "Show deleted" → Restore.`)) return;
  if(await patchMenuItem(m.id, {archived: true}, `${m.name} deleted from the menu`)) closeMenuEditor();
};

/* ================= USERS =================
   Staff logins are managed by the edge function staff-users (it holds the service key).
   "Remove" blocks the login; the person's orders and history stay. */
let siteUsers = [], usersIsAdmin = false, usersMe = "", userDialogMode = "add", userDialogEmail = "";
async function usersCall(body){
  const { data, error } = await sb.functions.invoke("staff-users", { body });
  if(error){
    let m = error.message;
    try{ const j = await error.context.json(); if(j && j.error) m = j.error; }catch(e){}
    throw new Error(m);
  }
  if(data && data.error) throw new Error(data.error);
  return data;
}
async function loadUsers(){
  try{
    const d = await usersCall({ action: "list" });
    siteUsers = d.users || []; usersIsAdmin = !!d.is_admin; usersMe = d.me || "";
  }catch(e){ $("#usersList").innerHTML = `<div class="empty">Couldn't load users: ${esc(e.message)}</div>`; return; }
  renderUsers();
}
function renderUsers(){
  $("#addUser").hidden = !usersIsAdmin;
  $("#usersHint").textContent = usersIsAdmin
    ? "Everyone here can log in to this admin site and see orders. Owners can also edit the menu. As an owner you can add users, reset passwords and remove access."
    : "Everyone here can log in to this admin site. Only owners can edit the menu or add and remove users.";
  const rows = [...siteUsers].sort((a,b) => (a.disabled - b.disabled) || (b.is_admin - a.is_admin) || a.email.localeCompare(b.email));
  $("#usersList").innerHTML = rows.length ? rows.map(u => {
    const me = u.email.toLowerCase() === usersMe;
    const last = u.last_sign_in_at ? "last login " + ago(u.last_sign_in_at) : (u.has_login ? "never logged in" : "no login yet (set a password)");
    const flags = (u.is_admin ? `<span class="mflag admin">Owner</span>` : `<span class="mflag">Admin</span>`)
      + (u.disabled ? `<span class="mflag del">Removed</span>` : "") + (me ? `<span class="mtag">You</span>` : "");
    const btns = !usersIsAdmin ? "" : u.disabled
      ? `<button class="btn sm" data-urestore>Restore</button>`
      : `<button class="btn sm dark" data-uedit>Edit</button><button class="btn sm" data-ureset>🔑 Reset password</button>`
        + (me ? "" : `<button class="btn sm" data-uadmin>${u.is_admin ? "Change to admin" : "Make owner"}</button><button class="btn sm danger" data-uremove>Remove</button>`);
    return `<div class="ui${u.disabled ? " off" : ""}" data-email="${esc(u.email)}">
      <div style="min-width:0"><div class="ui-name">${esc(u.name || u.email.split("@")[0])}${flags}</div>
        <div class="ui-sub">${esc(u.email)} · ${esc(last)}</div></div>
      <div class="ui-btns">${btns}</div></div>`;
  }).join("") : `<div class="empty">No users yet.</div>`;
}
function openUserDialog(mode, u){
  userDialogMode = mode; userDialogEmail = u ? u.email : "";
  const who = u ? (u.name ? u.name + " (" + u.email + ")" : u.email) : "";
  $("#userDialogTitle").textContent = {add:"Add user", edit:"Edit user", reset:"Reset password"}[mode];
  $("#userDialogContext").textContent = {add:"They can log in to this admin site right away.",
    edit:"Changing the email changes the email they log in with.", reset:`Set a new password for ${who}.`}[mode];
  $("#userNewFields").hidden = mode === "reset"; $("#uAdminWrap").hidden = mode !== "add";
  $("#uPwWrap").hidden = mode === "edit";
  $("#uName").value = mode === "edit" ? (u.name || "") : ""; $("#uEmail").value = mode === "edit" ? u.email : "";
  $("#uPw").value = ""; $("#uAdmin").checked = false;
  $("#userMsg").textContent = ""; $("#userSave").disabled = false;
  $("#userSave").textContent = {add:"Add user", edit:"Save", reset:"Save password"}[mode];
  $("#userDialog").showModal();
  (mode === "reset" ? $("#uPw") : $("#uName")).focus();
}
$("#usersLink").onclick = () => showView("users");
$("#usersBack").onclick = () => showView("orders");
$("#usersRefresh").onclick = loadUsers;
$("#addUser").onclick = () => openUserDialog("add");
$("#userCancel").onclick = () => $("#userDialog").close();
$("#userForm").addEventListener("submit", async e => {
  e.preventDefault();
  const pw = $("#uPw").value, msg = $("#userMsg");
  const mode = userDialogMode, email = mode === "reset" ? userDialogEmail : $("#uEmail").value.trim().toLowerCase();
  if(mode !== "reset" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return msg.textContent = "Enter a valid email.";
  if(mode !== "edit" && pw.length < 6) return msg.textContent = "Password needs at least 6 characters.";
  $("#userSave").disabled = true; msg.textContent = "";
  try{
    if(mode === "add") await usersCall({ action: "create", email, name: $("#uName").value.trim(), password: pw, is_admin: $("#uAdmin").checked });
    else if(mode === "edit") await usersCall({ action: "update", email: userDialogEmail, new_email: email, name: $("#uName").value.trim() });
    else await usersCall({ action: "reset_password", email, password: pw });
  }catch(err){ $("#userSave").disabled = false; return msg.textContent = err.message; }
  $("#userDialog").close();
  // your own login email changed: the current login no longer matches the staff list
  if(mode === "edit" && userDialogEmail.toLowerCase() === usersMe && email !== usersMe){
    await sb.auth.signOut(); if(channel) sb.removeChannel(channel); clearInterval(pollTimer); orders = []; staffEmail = "";
    return showLogin(`Email changed. Log in again with ${email}.`, true);
  }
  toast({add:`Added ${email}`, edit:`Saved ${email}`, reset:`Password changed for ${email}`}[mode]);
  loadUsers();
});
$("#usersList").addEventListener("click", async e => {
  const b = e.target.closest("button"); if(!b) return;
  const u = siteUsers.find(x => x.email === b.closest(".ui").dataset.email); if(!u) return;
  if(b.hasAttribute("data-ureset")) return openUserDialog("reset", u);
  if(b.hasAttribute("data-uedit")) return openUserDialog("edit", u);
  let body, done;
  if(b.hasAttribute("data-uremove")){
    if(!confirm(`Remove ${u.email}?\n\nThey won't be able to log in any more. Their orders and history stay. You can restore them later.`)) return;
    body = { action: "remove", email: u.email }; done = `Removed ${u.email}`;
  }else if(b.hasAttribute("data-urestore")){
    body = { action: "restore", email: u.email }; done = `Restored ${u.email}`;
  }else if(b.hasAttribute("data-uadmin")){
    body = { action: "set_admin", email: u.email, is_admin: !u.is_admin }; done = u.is_admin ? `${u.email} is now an admin` : `${u.email} is now an owner`;
  }else return;
  b.disabled = true;
  try{ await usersCall(body); toast(done); }catch(err){ toast("Couldn't save: " + err.message); }
  loadUsers();
});

boot();
