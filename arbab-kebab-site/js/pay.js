const C = window.SITE_CONFIG || {};
const G = C.gcash || {};
const MESSENGER = C.messenger || "https://m.me/ArbabKebabOfficial";
const IG = (C.instagram || "").replace(/^@/, "").trim();
const FIRST_BRANCH = ((C.branches || []).map(b => typeof b === "string" ? b : b && b.name).filter(Boolean))[0] || "our";
const chatLinks = () => `<a class="btn sm" href="${MESSENGER}${ref ? `?text=${encodeURIComponent(`Hi Arbab Kebab! 👋 About my order ${ref}:`)}` : ""}" target="_blank" rel="noopener">💬 Messenger</a>`
  + (IG ? `<a class="btn sm" href="https://ig.me/m/${encodeURIComponent(IG)}" target="_blank" rel="noopener">📸 Instagram</a>` : "");
const $ = s => document.querySelector(s);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const peso = n => "₱" + Number(n||0).toLocaleString("en-PH", {maximumFractionDigits:2});
const ref = (new URLSearchParams(location.search).get("ref") || "").trim().toUpperCase();

async function rpc(fn, body){
  const headers = {"Content-Type":"application/json", apikey: C.supabaseKey};
  if(C.supabaseKey && !C.supabaseKey.startsWith("sb_")) headers.Authorization = "Bearer " + C.supabaseKey;
  const r = await fetch(C.supabaseUrl.replace(/\/$/,"") + "/rest/v1/rpc/" + fn, {method:"POST", headers, body: JSON.stringify(body)});
  const j = await r.json().catch(() => null);
  if(!r.ok) throw new Error((j && j.message) || "Something went wrong. Please try again.");
  return j;
}
async function copy(t, label){
  try{ await navigator.clipboard.writeText(t); toast(label + " copied"); }
  catch(e){ prompt("Copy this:", t); }
}
let tt; function toast(t){ const el=$("#toast"); el.textContent=t; el.classList.add("show"); clearTimeout(tt); tt=setTimeout(()=>el.classList.remove("show"),1800); }

function state(icon, cls, title, text, extra="", buttons=""){
  $("#main").innerHTML = `<div class="card state"><div class="icon ${cls}" aria-hidden="true">${icon}</div><h2>${title}</h2><p>${text}</p>${extra}
    <div class="links">${buttons}${chatLinks()}<a class="btn sm" href="./">Back to menu</a></div></div>`;
}
const detailsBtn = r => `<a class="btn sm" href="pay.html?ref=${encodeURIComponent(r)}">🧾 Order details</a>`;
const newOrderBtn = `<a class="btn" href="./">🛒 Start new order</a>`;

/* Order message for Messenger — same as the Order Summary for cash orders. Name, phone and address
   were saved on this phone when the order was placed; the database never sends them to this page. */
const savedOrder = (() => { try{ return JSON.parse(localStorage.getItem("ak_order_" + ref)); }catch(e){ return null; } })();
function orderMessage(o){
  const d = savedOrder || {};
  const delivery = (o.mode || d.mode) === "Delivery";
  const date = o.order_date || d.date;
  const when = date ? new Date(date + "T00:00").toLocaleDateString("en-PH", {weekday:"short", month:"short", day:"numeric"}) : "";
  const items = (o.items && o.items.length ? o.items : d.items) || [];
  return [
    `Hi Arbab Kebab! 👋 I just placed an order and paid with GCash.`,
    ``,
    `🧾 Order ${o.ref} (#${o.order_no})`,
    `${delivery ? "🛵 Delivery" : `🏪 Pick-Up at ${o.branch || d.branch || FIRST_BRANCH} branch`}${when ? ` · ${when}` : ""}${d.time ? ` · ${d.time}` : ""}`,
    ...(d.name ? [``, `👤 ${d.name}${d.phone ? ` · ${d.phone}` : ""}`] : []),
    ...(delivery && d.address ? [`🏠 ${d.address}`] : []),
    ...(delivery && d.pin ? [`📍 Pinned location: https://www.google.com/maps/search/?api=1&query=${d.pin.lat},${d.pin.lng}`] : []),
    ``,
    `📦 Items:`,
    ...items.map(i => `• ${i.qty}x ${i.name}${i.opts && i.opts.length ? ` (${i.opts.join(", ")})` : ""} — ${peso(i.qty * i.unit)}`),
    ``,
    `🍽️ Food total: ${peso(o.subtotal)}`,
    ...(delivery ? [`🛵 Delivery fee: to be confirmed`] : []),
    `💵 Payment: GCash — payment proof submitted`,
    ...(d.notes ? [``, `📝 Note: ${d.notes}`] : [])
  ].join("\n");
}
const chatBoxHtml = () => `<div class="chat-box">
    <p class="chat-title">For Full Order Confirmation</p>
    <p class="chat-sub">Click button below to open arbab kebab messenger. Paste the message or copy paste manually.</p>
    <pre class="chat-msg" id="chatMsg"></pre>
    <button type="button" class="chat-copy" id="chatCopy">📋 Copy order summary</button>
    <div class="chat-btns">
      <a class="chat-btn messenger" id="chatMessenger" href="${MESSENGER}" target="_blank" rel="noopener" aria-label="Send to Arbab Kebab on Messenger">Send to <img class="chat-logo" src="images/brand/logo-128.png" alt="Arbab Kebab" width="30" height="30"></a>
      ${IG ? `<a class="chat-btn instagram" id="chatInstagram" href="https://ig.me/m/${encodeURIComponent(IG)}" target="_blank" rel="noopener">📸 Instagram</a>` : ""}
    </div>
  </div>`;
function wireChat(o){
  const text = orderMessage(o);
  $("#chatMsg").textContent = text;
  const quiet = async () => { try{ await navigator.clipboard.writeText(text); }catch(e){} };
  const btn = $("#chatCopy");
  btn.onclick = async () => {
    try{ await navigator.clipboard.writeText(text); }
    catch(e){   // older browsers: select the text so the customer can copy it
      const r = document.createRange(); r.selectNodeContents($("#chatMsg"));
      const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r);
      try{ document.execCommand("copy"); }catch(err){}
    }
    btn.textContent = "✓ Copied! Now tap Send and paste"; btn.classList.add("done");
  };
  $("#chatMessenger").onclick = quiet;
  if($("#chatInstagram")) $("#chatInstagram").onclick = quiet;
}

/* Shown right after the GCash proof is sent — mirrors the Order Summary for cash orders. */
function submittedScreen(o){
  $("#main").innerHTML = `<div class="card state">
    <div class="icon ok" aria-hidden="true">✓</div>
    <h2>Payment submitted!</h2>
    <p class="done-ref">Order no. <b>#${esc(o.order_no)}</b></p>
    <p>Salamat! Your screenshot has been sent. We'll verify your payment shortly.${o.mode === "Delivery" ? " The delivery fee is settled separately." : ""}</p>
    ${chatBoxHtml()}
    <div class="links">${detailsBtn(o.ref)}${newOrderBtn}</div>
  </div>`;
  wireChat(o);
}
function summary(o){
  return `<div class="card">
    <p class="sub"><span class="order-number">Order #${esc(o.order_no)}</span> · ${o.mode === "Delivery" ? "Delivery" : "Pick-Up"} · ${esc(o.branch)}</p>
    ${o.order_date ? `<p class="sub">Scheduled: ${esc(new Intl.DateTimeFormat("en-PH",{dateStyle:"medium",timeZone:"UTC"}).format(new Date(o.order_date + "T00:00:00Z")))} · ${esc(o.preferred_time || "—")}</p>` : ""}
    <div class="amount"><span class="l">${o.payment_status === "paid" ? "Food subtotal paid" : o.payment_status === "submitted" ? "Food subtotal submitted" : "Food subtotal to pay"}</span><span class="v">${peso(o.subtotal)}</span></div>
    <details><summary>See order details</summary>
      <table>${o.items.map(i => `<tr><td>${i.qty}× ${esc(i.name)}${i.opts && i.opts.length ? `<div class="o">${esc(i.opts.join(" · "))}</div>` : ""}</td><td class="p">${peso(i.qty*i.unit)}</td></tr>`).join("")}
        <tr><td>Food subtotal</td><td class="p">${peso(o.subtotal)}</td></tr>
        <tr><td>Delivery fee</td><td class="p">${o.mode === "Delivery" ? "Paid separately" : peso(0)}</td></tr></table>
    </details>
  </div>`;
}

function renderPay(o){
  setTimeout(() => { if(o.payment_status === "submitted") loadPaidScreenshot(o.payment_screenshot_path); }, 0);
  const resubmit = o.payment_status === "submitted";
  $("#main").innerHTML = `
    <h1>${resubmit ? "Payment submitted ✓" : "Pay with GCash"}</h1>
    <p class="sub" style="margin-bottom:14px">${resubmit ? "We're checking your GCash payment. No need to pay again." : "Pay the food subtotal by GCash. For delivery orders, the delivery fee is settled separately."}</p>
    ${summary(o)}
    ${resubmit ? `<div class="card" style="background:var(--saffron-soft)"><b>${o.payment_ref_last4 ? `We already received reference no. ending ${esc(o.payment_ref_last4)}.` : "We already received your payment screenshot."}</b> We're checking it now — only submit again if you need to update your payment proof.
      <div id="paidProof" class="hint" style="margin-top:8px">Loading your uploaded payment screenshot…</div></div>
      <div class="card">${chatBoxHtml()}</div>` : ""}
    ${resubmit ? `<details class="resend"><summary>Need to update your payment proof? Tap here</summary>` : ""}
    <div class="card">
      <div class="step"><b>1</b><h2>Send ${peso(o.subtotal)} via GCash</h2></div>
      ${G.qrImage ? `<div class="center" id="qrWrap">
          <img class="qr" id="qr" src="${esc(G.qrImage)}" alt="Arbab Kebab GCash QR code">
          <a class="btn sm" href="${esc(G.qrImage)}" download="ArbabKebab-GCash-QR.png">⬇ Save QR to phone</a>
          <p class="hint">On this phone? Save the QR, then in GCash tap <b>Scan QR → Upload QR</b> and pick the saved image.</p>
        </div>` : ""}
      ${G.number ? `<div class="row"><div><div class="k">Or Send Money to</div><div class="val">${esc(G.number)}</div>${G.accountName ? `<div class="k">${esc(G.accountName)}</div>` : ""}</div><button class="btn sm" data-copy="${esc(G.number.replace(/\s/g,""))}" data-label="Number">Copy</button></div>` : ""}
    </div>
    <div class="card">
      <div class="step"><b>2</b><h2>Upload your GCash receipt</h2></div>
      <form id="f" novalidate>
        <label for="proof">GCash payment screenshot<span style="font-weight:400;color:var(--muted)"> *required </span></label>
        <input id="proof" type="file" accept="image/jpeg,image/png,image/webp" required>
        <p class="hint">Upload a screenshot of your successful payment (JPG, PNG, or WebP; up to 5 MB).</p>
        <div class="err" id="err" role="alert"></div>
        <button class="btn dark" id="sub" type="submit">Send Order to Store</button>
      </form>
    </div>
    ${resubmit ? `</details><div class="links" style="margin-top:16px">${newOrderBtn}</div>` : ""}`;
  if(resubmit) wireChat(o);
  const img = $("#qr"); if(img) img.onerror = () => $("#qrWrap").remove();   // no QR uploaded yet → hide that part
  document.querySelectorAll("[data-copy]").forEach(b => b.onclick = () => copy(b.dataset.copy, b.dataset.label));
  $("#f").onsubmit = async e => {
    e.preventDefault();
    const file = $("#proof").files[0];
    const extensions = {"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
    if(!file){ $("#err").textContent = "Please upload your GCash payment screenshot."; return; }
    if(!extensions[file.type] || file.size > 5 * 1024 * 1024){
      $("#err").textContent = "Choose a JPG, PNG, or WebP screenshot no larger than 5 MB.";
      return;
    }
    $("#sub").disabled = true; $("#sub").textContent = "Sending…"; $("#err").textContent = "";
    try{
      const path = `${o.ref}/${crypto.randomUUID()}.${extensions[file.type]}`;
      const headers = {"apikey":C.supabaseKey};
      if(C.supabaseKey && !C.supabaseKey.startsWith("sb_")) headers.Authorization = "Bearer " + C.supabaseKey;
      const upload = await fetch(`${C.supabaseUrl.replace(/\/$/,"")}/storage/v1/object/gcash-confirmations/${path}`, {
        method:"POST", headers:{...headers,"Content-Type":file.type,"x-upsert":"false"}, body:file
      });
      if(!upload.ok){
        const details = await upload.json().catch(() => null);
        throw new Error((details && (details.message || details.error)) || "Couldn't upload your screenshot. Please try again.");
      }
      await rpc("submit_payment", {p_ref: o.ref, p_gcash_ref: "", p_name: "", p_screenshot_path:path});
      submittedScreen(o);
    }catch(err){
      $("#err").textContent = err.message; $("#sub").disabled = false; $("#sub").textContent = "Send Order to Store";
    }
  };
}

async function start(){
  if(!C.supabaseUrl || !C.supabaseKey) return state("!", "bad", "Payment page not set up yet", "Please message us to pay for your order.");
  if(!/^AK-[A-Z0-9]{6}$/.test(ref)) return state("?", "bad", "Payment link incomplete", "Please open the full link we sent you, or message us.");
  let o;
  try{ o = await rpc("get_payment", {p_ref: ref}); }
  catch(e){ return state("!", "bad", "Couldn't load your order", "Please check your internet connection and refresh this page."); }
  if(!o) return state("?", "bad", "Order not found", `We couldn't find order <span class="ref">${esc(ref)}</span>. Payment links work for 14 days — message us if you need help.`);
  if(o.status === "cancelled") return state("✕", "bad", "Order cancelled", `Order <span class="ref">${esc(o.ref)}</span> was cancelled, so no payment is needed.`);
  if(o.payment_status === "paid"){
    state("✓", "ok", "Already paid", `Payment received for order <span class="order-number">#${esc(o.order_no)}</span> · ${peso(o.subtotal)}`,
      `<div id="paidProof" class="hint">Loading your uploaded payment confirmation…</div><div style="text-align:left;margin-top:14px">${summary(o)}</div>`,
      `<a class="btn" href="./">Start new order</a>`);
    loadPaidScreenshot(o.payment_screenshot_path);
    return;
  }
  if(o.payment_status === "refunded")
    return state("✓", "ok", "Payment refunded", `Order <span class="ref">${esc(o.ref)}</span> · ${peso(o.subtotal)}`);
  renderPay(o);
}

async function loadPaidScreenshot(path){
  const proof = $("#paidProof");
  if(!proof) return;
  if(!path){
    proof.textContent = "No payment screenshot was uploaded for this order.";
    return;
  }
  try{
    const headers = {"apikey":C.supabaseKey};
    if(C.supabaseKey && !C.supabaseKey.startsWith("sb_")) headers.Authorization = "Bearer " + C.supabaseKey;
    const response = await fetch(`${C.supabaseUrl.replace(/\/$/,"")}/storage/v1/object/gcash-confirmations/${path}`, {headers});
    if(!response.ok){
      const details = await response.json().catch(() => null);
      throw new Error((details && (details.message || details.error)) || `HTTP ${response.status}`);
    }
    const imageUrl = URL.createObjectURL(await response.blob());
    const image = document.createElement("img");
    image.className = "proof-image";
    image.src = imageUrl;
    image.alt = "Your GCash payment screenshot";
    proof.textContent = "";
    proof.append(image);
  }catch(error){
    proof.textContent = "We couldn't load your uploaded screenshot. Please refresh the page or message us.";
  }
}
start();
