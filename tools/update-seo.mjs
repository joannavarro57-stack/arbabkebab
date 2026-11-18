#!/usr/bin/env node
/* =====================================================================
   ARBAB KEBAB — SEO / AI-search updater
   ---------------------------------------------------------------------
   Run after changing the menu (admin → Menu tab), branches (config.js)
   or the FAQ (index.html), then commit:

       node tools/update-seo.mjs

   It reads the live menu from Supabase plus config.js, and rewrites:
     • index.html   site address in canonical/og/twitter tags, structured data
                    (JSON-LD), and a pre-rendered copy of the menu + branch list
                    so search engines and AI assistants can read them without
                    running JavaScript (the page's script replaces them on load)
     • robots.txt, sitemap.xml, llms.txt
   Moving to your own domain? Change SITE_URL below and run it again.
   ===================================================================== */
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const SITE_URL = "https://arbabkebab.vercel.app";   // no trailing slash

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "arbab-kebab-site");
const file = f => path.join(ROOT, f);
const read = f => fs.readFileSync(file(f), "utf8");
const write = (f, s) => { fs.writeFileSync(file(f), s); console.log("updated", f); };

/* ---------- inputs ---------- */
const sandbox = { window: {} };
vm.runInNewContext(read("config.js"), sandbox);
const C = sandbox.window.SITE_CONFIG;
const BRANCHES = (C.branches || []).map(b => typeof b === "string" ? { name: b } : b).filter(b => b && b.name);
const CATS = C.menuCategories;

const STORE = {   // keep in step with STORE in js/main.js
  name: "Arbab Kebab",
  phone: "+639700910888",
  email: "arabiya.official@gmail.com",
  facebook: "https://www.facebook.com/ArbabKebabOfficial",
  slogan: "Sarap na Legit, Lasang Middle East",
};

const headers = { apikey: C.supabaseKey };
if (!C.supabaseKey.startsWith("sb_")) headers.Authorization = "Bearer " + C.supabaseKey;
const res = await fetch(C.supabaseUrl.replace(/\/$/, "") +
  "/rest/v1/menu_items?select=id,cat,name,description,price,tag,img,options&order=sort.asc,name.asc", { headers });
if (!res.ok) { console.error("Couldn't load the menu from Supabase:", res.status, await res.text()); process.exit(1); }
const MENU = (await res.json()).map(r => ({ id: r.id, cat: r.cat, name: r.name, desc: r.description || "",
  price: Number(r.price) || 0, tag: r.tag || "", img: r.img || "" }));
if (!MENU.length) { console.error("The menu came back empty — nothing changed."); process.exit(1); }

/* ---------- helpers (same output as js/main.js) ---------- */
const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const peso = n => "₱" + n.toLocaleString("en-PH");
const oneLine = s => String(s || "").replace(/\s+/g, " ").trim();
const abs = u => /^https?:/i.test(u) ? u : `${SITE_URL}/${u.replace(/^\.?\//, "")}`;
const webpOf = u => /^images\/[^/?#]+\.png$/i.test(u) ? u.replace(/\.png$/i, ".webp") : u;
const place = b => [b.city && b.city !== b.name ? b.city : "", b.region].filter(Boolean).join(", ");
const now = new Date(), today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

function card(m) {   // keep in step with card() in js/main.js
  const initials = m.name.split(" ").slice(0, 2).map(w => w[0]).join("");
  return `<article class="card">
    <div class="thumb">${m.img ? `<img src="${esc(webpOf(m.img))}" data-orig="${esc(m.img)}" data-initials="${esc(initials)}" alt="${esc(m.name)}" width="300" height="300" loading="lazy" decoding="async" onerror="if(window.thumbFail)thumbFail(this);else{this.onerror=null;this.src=this.dataset.orig}">` : `<div class="ph" aria-hidden="true"><span>${esc(initials)}</span></div>`}</div>
    <div class="body">${m.tag ? `<span class="tag">${esc(m.tag)}</span>` : ""}<div class="name">${esc(m.name)}</div><div class="desc">${esc(m.desc || "")}</div>
      <div class="row"><span class="price">${peso(m.price)}</span>
      <button class="add" data-add="${m.id}" aria-label="Add ${esc(m.name)}">Add</button></div></div>
  </article>`;
}
const branchItem = b =>   // keep in step with the branch list in js/main.js
  `<li>${esc(b.name)} branch` +
  (place(b) ? ` <span class="note" style="color:#c9bba6">· ${esc(place(b))}</span>` : "") +
  (b.address ? `<br><span class="note" style="color:#c9bba6">${esc(b.address)}</span>` : "") +
  (b.hours ? `<br><span class="note" style="color:#c9bba6">${esc(b.hours)}</span>` : "") + `</li>`;

const sections = CATS.map(c => ({ ...c, items: MENU.filter(m => m.cat === c.id) })).filter(c => c.items.length);

/* ---------- index.html ---------- */
let html = read("index.html");
const between = (s, start, end, inner) => {
  const a = s.indexOf(start), b = s.indexOf(end);
  if (a < 0 || b < a) throw new Error(`markers ${start} … ${end} not found in index.html`);
  return s.slice(0, a + start.length) + inner + s.slice(b);
};

// 1. pre-rendered menu and branches
html = between(html, "<!-- MENU:START -->", "<!-- MENU:END -->",
  sections.map(c => `<section class="cat" id="cat-${c.id}"><div class="cat-inner"><h3>${esc(c.name)}</h3><div class="grid">${c.items.map(card).join("")}</div></div></section>`).join(""));
html = between(html, "<!-- BRANCHES:START -->", "<!-- BRANCHES:END -->",
  BRANCHES.map(branchItem).join("") + (BRANCHES.some(b => b.hours) ? "" : `<li class="note" style="color:#c9bba6">Message us for today's hours.</li>`));

// 2. site address in head tags
const setAttr = (re, value) => { if (!re.test(html)) throw new Error("tag not found: " + re); html = html.replace(re, `$1${value}$2`); };
setAttr(/(<link rel="canonical" href=")[^"]*(")/, `${SITE_URL}/`);
setAttr(/(<meta property="og:url" content=")[^"]*(")/, `${SITE_URL}/`);
setAttr(/(<meta property="og:image" content=")[^"]*(")/, `${SITE_URL}/images/brand/og-image.jpg`);
setAttr(/(<meta name="twitter:image" content=")[^"]*(")/, `${SITE_URL}/images/brand/og-image.jpg`);

// 3. structured data
const faqs = [...html.matchAll(/<details><summary>([\s\S]*?)<\/summary><p>([\s\S]*?)<\/p><\/details>/g)]
  .map(m => ({ q: m[1].replace(/<[^>]+>/g, ""), a: m[2].replace(/<[^>]+>/g, "") }))
  .map(f => ({ q: f.q.replace(/&amp;/g, "&"), a: f.a.replace(/&amp;/g, "&") }));
const prices = MENU.map(m => m.price).filter(Boolean);
const brandId = `${SITE_URL}/#brand`, menuId = `${SITE_URL}/#menu`;
const ld = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite", "@id": `${SITE_URL}/#website`, url: `${SITE_URL}/`, name: STORE.name,
      inLanguage: "en-PH", publisher: { "@id": brandId },
    },
    {
      "@type": "Restaurant", "@id": brandId, name: STORE.name, alternateName: "أرباب كباب",
      url: `${SITE_URL}/`, logo: `${SITE_URL}/images/brand/hero-logo.png`, image: `${SITE_URL}/images/brand/og-image.jpg`,
      slogan: STORE.slogan,
      description: "Middle Eastern restaurant serving charcoal-grilled shawaya chicken, kabsa, biryani, kebab, shawarma wraps, falafel and salads, with online ordering for delivery and pick-up in Metro Manila, Rizal and Bulacan.",
      servesCuisine: ["Middle Eastern", "Arabic", "Shawarma", "Kebab", "Kabsa", "Biryani"],
      priceRange: `${peso(Math.min(...prices))}–${peso(Math.max(...prices))}`,
      currenciesAccepted: "PHP", paymentAccepted: "Cash, GCash",
      telephone: STORE.phone, email: STORE.email, sameAs: [STORE.facebook],
      acceptsReservations: false, hasMenu: { "@id": menuId },
      areaServed: [...new Set(BRANCHES.map(b => b.city).filter(Boolean))].map(name => ({ "@type": "City", name })),
      potentialAction: {
        "@type": "OrderAction", target: `${SITE_URL}/#menu`,
        deliveryMethod: ["http://purl.org/goodrelations/v1#DeliveryModeOwnFleet", "http://purl.org/goodrelations/v1#DeliveryModePickUp"],
      },
      subOrganization: BRANCHES.map(b => ({ "@id": `${SITE_URL}/#branch-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}` })),
    },
    ...BRANCHES.map(b => ({
      "@type": "Restaurant", "@id": `${SITE_URL}/#branch-${b.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
      name: `${STORE.name} — ${b.name}`, parentOrganization: { "@id": brandId },
      url: `${SITE_URL}/`, image: `${SITE_URL}/images/brand/og-image.jpg`,
      telephone: STORE.phone, servesCuisine: "Middle Eastern", hasMenu: { "@id": menuId },
      address: Object.fromEntries(Object.entries({
        "@type": "PostalAddress", streetAddress: b.address || undefined,
        addressLocality: b.city || b.name, addressRegion: b.region, addressCountry: "PH",
      }).filter(([, v]) => v)),
      ...(isFinite(b.lat) && isFinite(b.lng) ? { geo: { "@type": "GeoCoordinates", latitude: +(+b.lat).toFixed(6), longitude: +(+b.lng).toFixed(6) },
        hasMap: `https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}` } : {}),
    })),
    {
      "@type": "Menu", "@id": menuId, name: `${STORE.name} Menu`, inLanguage: "en-PH",
      hasMenuSection: sections.map(c => ({
        "@type": "MenuSection", name: c.name,
        hasMenuItem: c.items.map(m => ({
          "@type": "MenuItem", name: m.name,
          ...(oneLine(m.desc) ? { description: oneLine(m.desc) } : {}),
          ...(m.img ? { image: abs(m.img) } : {}),
          offers: { "@type": "Offer", price: String(m.price), priceCurrency: "PHP" },
        })),
      })),
    },
    ...(faqs.length ? [{
      "@type": "FAQPage", "@id": `${SITE_URL}/#faq`,
      mainEntity: faqs.map(f => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
    }] : []),
  ],
};
html = html.replace(/(<script type="application\/ld\+json">)[\s\S]*?(<\/script>)/,
  (_, a, b) => `${a}\n${JSON.stringify(ld, null, 1).replace(/</g, "\\u003c")}\n${b}`);
write("index.html", html);

/* ---------- robots.txt, sitemap.xml ---------- */
write("robots.txt", `# Search engines and AI assistants are welcome to read the public menu.
User-agent: *
Allow: /
Disallow: /pay.html

Sitemap: ${SITE_URL}/sitemap.xml
`);
write("sitemap.xml", `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>${SITE_URL}/</loc><lastmod>${today}</lastmod></url>
</urlset>
`);

/* ---------- llms.txt (plain summary for AI assistants, see llmstxt.org) ---------- */
const md = [
  `# ${STORE.name}`, "",
  `> ${STORE.name} (أرباب كباب) is a Middle Eastern restaurant in the Philippines — "${STORE.slogan}". It serves charcoal-grilled shawaya chicken, kabsa, biryani, kebab, shawarma wraps, falafel and salads, with online ordering for delivery and pick-up at ${SITE_URL}/.`, "",
  "## Ordering",
  `- Order online: ${SITE_URL}/#menu — add dishes, choose Delivery or Pick-Up, pick a branch, date and time.`,
  "- Time slots: hourly, 11:00 AM to 8:00 PM, today or a later date.",
  "- Payment: Cash on delivery / cash on pick-up, or GCash. The delivery fee is confirmed separately.",
  `- Phone: ${STORE.phone} · Email: ${STORE.email} · Facebook: ${STORE.facebook}`, "",
  "## Branches",
  ...BRANCHES.map(b => `- ${b.name}${place(b) ? ` — ${place(b)}` : ""}${b.address ? ` — ${b.address}` : ""}${b.hours ? ` — ${b.hours}` : ""}${isFinite(b.lat) ? ` — map: https://www.google.com/maps/search/?api=1&query=${b.lat},${b.lng}` : ""}`), "",
  `## Menu (prices in Philippine pesos, updated ${today})`,
  ...sections.flatMap(c => ["", `### ${c.name}`, ...c.items.map(m => `- ${m.name} — ${peso(m.price)}${oneLine(m.desc) ? `: ${oneLine(m.desc)}` : ""}${m.tag ? ` (${m.tag})` : ""}`)]), "",
  "## FAQ",
  ...faqs.flatMap(f => ["", `**${f.q}**`, f.a]), "",
].join("\n");
write("llms.txt", md);

console.log(`done — ${MENU.length} menu items, ${BRANCHES.length} branches, ${faqs.length} FAQs, site ${SITE_URL}`);
