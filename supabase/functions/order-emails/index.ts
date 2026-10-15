// Arbab Kebab — customer order emails.
//
// Called by the database (see "automatic customer emails" in supabase-setup.sql)
// with {"order_id": "..."} when an order with an email is placed, and again when
// it is marked completed. The function reads the order itself, decides which
// email is due, records email_*_sent_at so each email goes out at most once,
// and sends it through whichever provider is configured (first match wins):
//
//   RESEND_API_KEY      Resend (needs your own domain)   https://resend.com
//   BREVO_API_KEY       Brevo                            https://www.brevo.com
//   GMAIL_APP_PASSWORD  Gmail SMTP from GMAIL_USER (default arbabkebab.admin@gmail.com),
//                       using a Google "app password" (needs 2-Step Verification on)
//
// POST {"test": true} sends a sample email to the shop's own inbox only (GMAIL_USER /
// EMAIL_REPLY_TO), to check the setup without placing an order.
//
// Optional secrets:
//   EMAIL_FROM       e.g. "Arbab Kebab <orders@arbabkebab.com>"
//                    (default: Arbab Kebab <arbabkebab.admin@gmail.com>)
//   EMAIL_REPLY_TO   default arbabkebab.admin@gmail.com
//   SITE_URL         default https://arbabkebab.vercel.app

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_KEY = Deno.env.get("RESEND_API_KEY") || "";
const BREVO_KEY = Deno.env.get("BREVO_API_KEY") || "";
const GMAIL_USER = Deno.env.get("GMAIL_USER") || "arbabkebab.admin@gmail.com";
const GMAIL_PASS = (Deno.env.get("GMAIL_APP_PASSWORD") || "").replace(/\s+/g, "");
const FROM = Deno.env.get("EMAIL_FROM") || "Arbab Kebab <arbabkebab.admin@gmail.com>";
const REPLY_TO = Deno.env.get("EMAIL_REPLY_TO") || "arbabkebab.admin@gmail.com";
const SITE_URL = (Deno.env.get("SITE_URL") || "https://arbabkebab.vercel.app").replace(/\/$/, "");
const MESSENGER = "https://m.me/ArbabKebabOfficial";

type Item = { name: string; opts?: string[]; qty: number; unit: number };
type Order = {
  id: string; ref: string; order_no: number; status: string; mode: string; branch: string;
  customer_name: string; customer_phone: string; customer_email: string | null;
  address: string | null; delivery_lat: number | null; delivery_lng: number | null;
  order_date: string | null; preferred_time: string | null; payment: string | null;
  notes: string | null; items: Item[]; subtotal: number; delivery_fee: number; total: number;
  payment_status: string; deleted_at: string | null;
  email_placed_sent_at: string | null; email_completed_sent_at: string | null;
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

function dbHeaders(extra: Record<string, string> = {}) {
  const h: Record<string, string> = { apikey: SERVICE_KEY, "Content-Type": "application/json", ...extra };
  if (!SERVICE_KEY.startsWith("sb_")) h.Authorization = `Bearer ${SERVICE_KEY}`;
  return h;
}
async function getOrder(id: string): Promise<Order | null> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&select=*`, { headers: dbHeaders() });
  if (!r.ok) throw new Error(`load order: ${r.status} ${await r.text()}`);
  const rows = await r.json();
  return rows[0] ?? null;
}
// Atomically mark an email as sent; returns false if another call already did.
async function claim(id: string, column: string): Promise<boolean> {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}&${column}=is.null`, {
    method: "PATCH", headers: dbHeaders({ Prefer: "return=representation" }),
    body: JSON.stringify({ [column]: new Date().toISOString() }),
  });
  if (!r.ok) throw new Error(`claim: ${r.status} ${await r.text()}`);
  return (await r.json()).length > 0;
}
async function release(id: string, column: string) {
  await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${id}`, {
    method: "PATCH", headers: dbHeaders(), body: JSON.stringify({ [column]: null }),
  }).catch(() => {});
}

const esc = (s: unknown) => String(s ?? "").replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
const peso = (n: unknown) => "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 2 });
const fmtDate = (d: string | null) => d
  ? new Intl.DateTimeFormat("en-PH", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
      .format(new Date(d + "T00:00:00Z"))
  : "";
const isGcash = (o: Order) => /gcash/i.test(o.payment || "");

function buildEmail(o: Order, kind: "placed" | "completed") {
  const first = (o.customer_name || "").trim().split(" ")[0] || "there";
  const delivery = o.mode === "Delivery";
  const fee = Number(o.delivery_fee) || 0;
  const pin = delivery && o.delivery_lat != null && o.delivery_lng != null
    ? `https://www.google.com/maps/search/?api=1&query=${Number(o.delivery_lat)},${Number(o.delivery_lng)}` : "";
  const payLink = `${SITE_URL}/pay.html?ref=${encodeURIComponent(o.ref)}`;
  const gcashUnpaid = isGcash(o) && o.payment_status !== "paid" && kind === "placed";
  const when = [fmtDate(o.order_date), o.preferred_time].filter(Boolean).join(" · ");
  const how = delivery ? "🛵 Delivery" : `🏪 Pick-Up at our ${o.branch} branch`;

  const subject = kind === "placed"
    ? `We got your order ${o.ref} 🧆`
    : delivery ? `Your order ${o.ref} has been delivered 🎉` : `Your order ${o.ref} is complete 🎉`;
  const intro = kind === "placed"
    ? `Thanks for ordering from Arbab Kebab! Here are your order details.`
    : delivery
      ? `Your order has been delivered. We hope you enjoy your meal!`
      : `Your order has been picked up. We hope you enjoy your meal!`;
  const outro = kind === "placed"
    ? (gcashUnpaid
        ? `Please pay with GCash to confirm your order.`
        : delivery ? `We'll let you know when it's on the way.` : `We'll let you know when it's ready for pickup.`)
    : `Thank you for ordering — see you again soon!`;

  const itemLines = (o.items || []).map((i) =>
    `${i.qty}x ${i.name}${i.opts && i.opts.length ? ` (${i.opts.join(", ")})` : ""}`);
  const feeText = delivery ? (fee ? peso(fee) : "To be confirmed") : "";
  const totalText = delivery && fee ? peso(Number(o.subtotal) + fee) : "";

  // ---- plain text
  const text = [
    `Hi ${first}!`, intro, ``,
    `Order ${o.ref} (#${o.order_no})`,
    `${how}${when ? ` · ${when}` : ""}`,
    ``,
    `${o.customer_name} · ${o.customer_phone}`,
    ...(delivery && o.address ? [o.address] : []),
    ...(pin ? [`Pinned location: ${pin}`] : []),
    ``, `Items:`,
    ...(o.items || []).map((i, n) => `• ${itemLines[n]} — ${peso(i.qty * i.unit)}`),
    ``,
    `Food total: ${peso(o.subtotal)}`,
    ...(delivery ? [`Delivery fee: ${feeText}`] : []),
    ...(totalText ? [`Total: ${totalText}`] : []),
    `Payment: ${o.payment || "—"}${isGcash(o) && o.payment_status === "paid" ? " (paid)" : ""}`,
    ...(o.notes ? [``, `Note: ${o.notes}`] : []),
    ...(gcashUnpaid ? [``, `Pay via GCash: ${payLink}`] : []),
    ``, outro, ``,
    `Questions? Message us on Messenger: ${MESSENGER}`,
    `Salamat po! — Arbab Kebab`,
  ].join("\n");

  // ---- HTML
  const row = (l: string, r: string, strong = false) =>
    `<tr><td style="padding:6px 0;color:#3A322B;${strong ? "font-weight:700;" : ""}">${l}</td>` +
    `<td style="padding:6px 0;text-align:right;color:#1E1A16;${strong ? "font-weight:800;" : ""}">${r}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#F6F1E7;font-family:Arial,Helvetica,sans-serif;color:#1E1A16">
<div style="max-width:560px;margin:0 auto;padding:24px 16px">
  <div style="background:#1E1A16;color:#fff;border-radius:16px 16px 0 0;padding:18px 22px">
    <div style="font-size:20px;font-weight:800">Arbab Kebab</div>
    <div style="font-size:13px;color:#E29231">Sarap na Legit, Lasang Middle East</div>
  </div>
  <div style="background:#FFFDF8;border:1px solid #E7DCC7;border-top:0;border-radius:0 0 16px 16px;padding:22px">
    <p style="margin:0 0 6px;font-size:18px;font-weight:700">Hi ${esc(first)}! ${kind === "placed" ? "🧆" : "🎉"}</p>
    <p style="margin:0 0 18px;color:#3A322B">${esc(intro)}</p>
    <div style="background:#FFF9E6;border:1px solid #E29231;border-radius:12px;padding:12px 14px;margin-bottom:16px">
      <div style="font-weight:800">Order ${esc(o.ref)} <span style="color:#7A6D5F;font-weight:600">(#${o.order_no})</span></div>
      <div style="font-size:14px;color:#3A322B;margin-top:2px">${esc(how)}${when ? ` · ${esc(when)}` : ""}</div>
    </div>
    <div style="font-size:14px;color:#3A322B;margin-bottom:16px;line-height:1.5">
      ${esc(o.customer_name)} · ${esc(o.customer_phone)}
      ${delivery && o.address ? `<br>${esc(o.address)}` : ""}
      ${pin ? `<br><a href="${pin}" style="color:#B9530C">📍 Pinned location</a>` : ""}
    </div>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      ${(o.items || []).map((i, n) => row(esc(itemLines[n]), peso(i.qty * i.unit))).join("")}
      <tr><td colspan="2" style="border-top:1px solid #E7DCC7;padding:0"></td></tr>
      ${row("Food total", peso(o.subtotal), !totalText)}
      ${delivery ? row("Delivery fee", esc(feeText)) : ""}
      ${totalText ? row("Total", totalText, true) : ""}
      ${row("Payment", esc(o.payment || "—") + (isGcash(o) && o.payment_status === "paid" ? " ✓ paid" : ""))}
    </table>
    ${o.notes ? `<p style="font-size:14px;background:#FFF9E6;border-radius:10px;padding:8px 10px;margin:14px 0 0"><b>Note:</b> ${esc(o.notes)}</p>` : ""}
    ${gcashUnpaid ? `<p style="text-align:center;margin:20px 0 4px"><a href="${payLink}" style="display:inline-block;background:#1E1A16;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:12px">Pay with GCash</a></p>` : ""}
    <p style="margin:18px 0 0;color:#3A322B">${esc(outro)}</p>
    <p style="margin:14px 0 0;font-size:13px;color:#7A6D5F">Questions? <a href="${MESSENGER}" style="color:#B9530C">Message us on Messenger</a> or reply to this email.<br>Salamat po!</p>
  </div>
</div></body></html>`;
  return { subject, text, html };
}

function parseFrom(from: string) {
  const m = from.match(/^\s*(.*?)\s*<([^>]+)>\s*$/);
  return m ? { name: m[1] || "Arbab Kebab", email: m[2] } : { name: "Arbab Kebab", email: from.trim() };
}

let gmailTransport: any = null;
let lastTestAt = 0;
async function sendGmail(to: string, toName: string, msg: { subject: string; text: string; html: string }) {
  if (!gmailTransport) {
    const nodemailer = (await import("npm:nodemailer@6.9.16")).default;
    // Port 465 (implicit TLS): Supabase Edge Functions block outbound 25 and 587.
    gmailTransport = nodemailer.createTransport({
      host: "smtp.gmail.com", port: 465, secure: true,
      auth: { user: GMAIL_USER, pass: GMAIL_PASS },
    });
  }
  const sender = parseFrom(FROM);
  await gmailTransport.sendMail({
    from: { name: sender.name, address: GMAIL_USER },   // Gmail only sends as the signed-in account
    to: { name: toName, address: to }, replyTo: REPLY_TO,
    subject: msg.subject, text: msg.text, html: msg.html,
  });
  return "gmail";
}

async function send(to: string, toName: string, msg: { subject: string; text: string; html: string }) {
  if (!RESEND_KEY && !BREVO_KEY && GMAIL_PASS) return await sendGmail(to, toName, msg);
  if (RESEND_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${RESEND_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: FROM, to: [to], reply_to: REPLY_TO, subject: msg.subject, html: msg.html, text: msg.text }),
    });
    if (!r.ok) throw new Error(`Resend ${r.status}: ${await r.text()}`);
    return "resend";
  }
  const sender = parseFrom(FROM);
  const r = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": BREVO_KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      sender, to: [{ email: to, name: toName }], replyTo: { email: REPLY_TO },
      subject: msg.subject, htmlContent: msg.html, textContent: msg.text,
    }),
  });
  if (!r.ok) throw new Error(`Brevo ${r.status}: ${await r.text()}`);
  return "brevo";
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const body = await req.json().catch(() => ({}));
  const configured = Boolean(RESEND_KEY || BREVO_KEY || GMAIL_PASS);

  // Setup check: sample email to the shop's own inbox only (never to a customer).
  if (body && body.test === true) {
    if (!configured) return json({ error: "no email provider configured" }, 400);
    if (Date.now() - lastTestAt < 60_000) return json({ error: "test already sent, try again in a minute" }, 429);
    lastTestAt = Date.now();
    const inbox = GMAIL_PASS && !RESEND_KEY && !BREVO_KEY ? GMAIL_USER : REPLY_TO;
    const sample = {
      id: "test", ref: "AK-TEST01", order_no: 0, status: "new", mode: "Delivery", branch: "Malolos",
      customer_name: "Arbab Kebab Test", customer_phone: "09170000000", customer_email: inbox,
      address: "Sample address, Malolos", delivery_lat: 14.8433, delivery_lng: 120.8114,
      order_date: new Date().toISOString().slice(0, 10), preferred_time: "6:00 PM", payment: "Cash on Delivery",
      notes: "This is a test email from the order system.", items: [{ name: "Chicken Shawarma Wrap", opts: ["Spicy"], qty: 2, unit: 129 }],
      subtotal: 258, delivery_fee: 0, total: 258, payment_status: "unpaid", deleted_at: null,
      email_placed_sent_at: null, email_completed_sent_at: null,
    } as Order;
    try {
      const provider = await send(inbox, "Arbab Kebab", buildEmail(sample, "placed"));
      return json({ ok: true, test: true, provider, sent_to: inbox });
    } catch (e) {
      console.error(e);
      return json({ error: String(e) }, 502);
    }
  }

  const { order_id } = body || {};
  if (typeof order_id !== "string" || !/^[0-9a-f-]{36}$/i.test(order_id)) return json({ error: "invalid order_id" }, 400);
  if (!configured) return json({ skipped: "no email provider configured" });

  try {
    const o = await getOrder(order_id);
    if (!o || o.deleted_at || !o.customer_email) return json({ skipped: "no order or no email" });

    let kind: "placed" | "completed" | null = null;
    if (o.status === "completed" && !o.email_completed_sent_at) kind = "completed";
    else if (o.status !== "cancelled" && o.status !== "completed" && !o.email_placed_sent_at) kind = "placed";
    if (!kind) return json({ skipped: "nothing due" });

    const column = kind === "placed" ? "email_placed_sent_at" : "email_completed_sent_at";
    if (!(await claim(o.id, column))) return json({ skipped: "already sent" });
    try {
      const provider = await send(o.customer_email, o.customer_name, buildEmail(o, kind));
      return json({ ok: true, kind, provider });
    } catch (e) {
      await release(o.id, column);   // let a later attempt retry
      console.error(e);
      return json({ error: String(e) }, 502);
    }
  } catch (e) {
    console.error(e);
    return json({ error: String(e) }, 500);
  }
});
