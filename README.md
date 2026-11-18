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

## Search engines (SEO)

Google and other search tools read the page's HTML, but the menu is normally drawn by JavaScript.
`tools/update-seo.mjs` fixes that: it reads the live menu and `config.js`, then writes a pre-rendered copy of the menu and
branches into `index.html`, the structured data (restaurant, branches, menu, FAQ), `sitemap.xml`, `robots.txt` and `llms.txt`.

**Run it after changing the menu, prices, branches or FAQ, then commit:**

```
node tools/update-seo.mjs
```

Moving to your own domain (e.g. arbabkebab.com)? Change `SITE_URL` at the top of that file, run it, and commit.

## Photo uploads

Every photo is optimized in the browser before it's uploaded and saved in the database
(`js/image-optimize.js` — the same file is in both sites, keep the copies identical):

- **Menu photos (admin):** turned upright, GPS/camera data removed, shrunk to max 900 px, saved as WebP
  (usually 50–300 KB). Photos smaller than 400 px are refused because they would look blurry.
  The `menu-images` storage bucket only accepts files up to 1 MB (set in `supabase/setup.sql`).
- **GCash screenshots (payment page):** same clean-up, max 2000 px so reference numbers stay readable.
  If a phone can't optimize, a valid original under 5 MB is still sent, so payments are never blocked.

## Adding a branch

1. Open `arbab-kebab-site/config.js` and find `branches`.
2. Copy the Malolos line, paste it underneath, and change the `name`, map location (`lat`, `lng`), `city` / `region`, and optional `address` / `hours`.
   To get `lat`, `lng`: in Google Maps, right-click the shop and click the two numbers to copy them.
3. Run `node tools/update-seo.mjs`, then commit. The order form, branch list, delivery map, order messages and payment page all use the new branch,
   and the admin site picks it up automatically (it reads the website's `config.js`).

Don't rename a branch after it has orders — the name is saved with each order.

## Choosing a branch, and items a branch can't supply

**Website:** choosing a branch comes first. Until a customer picks one, the menu is blurred and locked behind a
*Choose your branch to start ordering* card with a branch dropdown, so nothing can be added. After they choose,
the menu shows only what that branch can supply, with "Showing the menu for our … branch · Change" under the title
(Change reopens the card). The checkout Branch field follows the same choice, and it is remembered for next time.
Pinning a delivery location still switches to the nearest branch. The lock is added by the page script only,
so search engines still read the full menu.

**Switching an item off at a branch** (e.g. no supply there):
1. Admin site → **Menu** → edit the item → **Not available at** → tick the branch(es). Untick when it's back.
2. That branch's menu hides the item. A cart that already holds it is flagged and the order can't be placed
   (the database rejects it too).
3. The Menu tab filter shows what one branch has, or every item that's off somewhere.

In admin **Add / Edit order**, the product list leaves out items the order's branch can't supply. Staff can still
keep one after confirming, for special arrangements. Needs the latest `supabase/setup.sql` (safe to rerun).

## GCash account per branch

Each branch can receive GCash payments in its own account. Owners set them in the admin site → **GCash** tab:
account name, GCash number, and the QR (from GCash: Profile → My QR → Download). The payment page shows the
account of the branch the order was placed at; staff see it under **Payment** in the order details.

- A branch without its own account uses the default account in `config.js` (`gcash`).
- A branch with its own number but no QR shows the number only — never the default QR, so nobody pays the wrong account.
- **Use default account** removes a branch's own account.
- Needs the latest `supabase/setup.sql` (table `branch_gcash`; safe to rerun). QR images are stored in the `menu-images` bucket under `gcash-qr/`.
