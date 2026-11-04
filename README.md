# Arbab Kebab — websites

| Folder | What it is | Live site (Vercel, Root Directory = folder name) |
|---|---|---|
| `arbab-kebab-site/` | Customer catalog & order site | https://arbabkebab.vercel.app |
| `arbab-kebab-admin/` | Staff order management (login required) | https://admin-arbabkebab.vercel.app |
| `supabase/` | Database setup (`setup.sql`) and edge functions | — |

Both sites are hosted on Vercel. Editing a file in one folder only redeploys that site (`ignoreCommand` in each `vercel.json`).

## Folder layout

```
arbab-kebab-site/
  index.html, pay.html     the pages
  config.js                site settings (branches, categories, GCash) — the admin site loads this file too, keep it here
  favicon.svg, robots.txt, sitemap.xml, llms.txt, vercel.json
  images/                  menu photos — menu items in the database point at images/<Name>.png, so keep them here
  images/brand/            logos, app icon and the social-share image (og-image.jpg)
  images/payments/         GCash QR code
arbab-kebab-admin/
  index.html, robots.txt, vercel.json
  images/                  admin images
tools/
  update-seo.mjs           refreshes SEO files from the live menu (see below) — not deployed
supabase/
  setup.sql                database schema + migrations
  functions/               edge functions (order-emails, staff-users)
```

Run `supabase/setup.sql` in the Supabase SQL Editor to create or update the database schema, payment RPCs, private GCash confirmation screenshot bucket, staff order editing/creation RPC, soft-delete audit fields/RPC, and order-mode migration from `Takeout` to `Pick-Up`. The script is designed to be rerun after deployment changes. Staff can create and edit orders in the admin interface; deletion archives the record in the database.

## Search engines & AI search (SEO / GEO)

Google, ChatGPT, Perplexity and other AI assistants read the page's HTML, but the menu is normally drawn by JavaScript.
`tools/update-seo.mjs` fixes that: it reads the live menu and `config.js`, then writes a pre-rendered copy of the menu and
branches into `index.html`, the structured data (restaurant, branches, menu, FAQ), `sitemap.xml`, `robots.txt` and `llms.txt`.

**Run it after changing the menu, prices, branches or FAQ, then commit:**

```
node tools/update-seo.mjs
```

Moving to your own domain (e.g. arbabkebab.com)? Change `SITE_URL` at the top of that file, run it, and commit.

## Adding a branch

1. Open `arbab-kebab-site/config.js` and find `branches`.
2. Copy the Malolos line, paste it underneath, and change the `name`, map location (`lat`, `lng`), `city` / `region`, and optional `address` / `hours`.
   To get `lat`, `lng`: in Google Maps, right-click the shop and click the two numbers to copy them.
3. Run `node tools/update-seo.mjs`, then commit. The order form, branch list, delivery map, order messages and payment page all use the new branch,
   and the admin site picks it up automatically (it reads the website's `config.js`).

Don't rename a branch after it has orders — the name is saved with each order.
