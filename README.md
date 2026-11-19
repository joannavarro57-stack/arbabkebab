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

## Adding, editing and removing branches

Owners manage branches in the admin site → **Branches** tab (needs the latest `supabase/setup.sql`, table `branches`):

- **＋ Add branch** — name, city, province / region, optional street address, and the map location
  (in Google Maps, right-click the shop and click the two numbers to copy them, then paste). The location places the
  branch's pin and lets the order form pick the nearest branch for a delivery pin. New branches use the default opening
  hours and GCash account until you set their own.
- **Branch details** (open a branch's row) — edit any of the above. **Renaming** also renames the branch on its GCash
  account, opening hours, menu "Not available at" ticks and past orders, so nothing gets disconnected.
- **Remove branch** — customers no longer see it or can order from it; its orders and settings are kept, and it can be
  restored from the **Removed branches** list.

The website and admin read the list from the database; `branches` in `config.js` is only the fallback (used before the
table exists). After changing branches, run `node tools/update-seo.mjs` and commit so search engines get the new list.

When a customer pins a delivery location, the order moves to the nearest branch. If that changes the branch, a notice
under the checkout Branch field says so, lists any items that branch can't supply, and warns if the delivery times
differ or the chosen time isn't available there; the customer can keep their original branch instead.

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

Each branch can receive GCash payments in its own account. Owners set them in the admin site → **Branches** tab:
account name, GCash number, and the QR (from GCash: Profile → My QR → Download). The payment page shows the
account of the branch the order was placed at; staff see it under **Payment** in the order details.

- A branch without its own account uses the default account in `config.js` (`gcash`).
- A branch with its own number but no QR shows the number only — never the default QR, so nobody pays the wrong account.
- **Use default account** removes a branch's own account.
- Needs the latest `supabase/setup.sql` (table `branch_gcash`; safe to rerun). QR images are stored in the `menu-images` bucket under `gcash-qr/`.

## Opening hours and preparation time per branch

In the admin site → **Branches** tab, each branch has **Opens**, **Closes** and **Preparation (min)**. Customers choose a
delivery / pick-up time every 30 minutes from opening to closing time of the branch they picked; for today, times sooner
than the preparation time from now are greyed out. The branch's hours also show in the branch bar above the menu.
A branch without its own hours uses `orderHours` in `config.js` (11:00 AM – 8:00 PM, 45 min). **Use default hours**
removes a branch's own hours. Needs the latest `supabase/setup.sql` (table `branch_hours`; safe to rerun).

## Owner dashboard (admin site → Users tab)

Owners see **Today at a glance** above the user list: today's orders (completed / in progress / cancelled, sales,
orders by branch), website visitors (today, this month, last 14 days) and **Google map searches this month** against
the 10,000 monthly limit (amber at 80%, red at 95%), plus map searches by branch — the branch selected when the customer
searched, and the branch the order moved to after they picked a result.

The website records one visit per visitor per day (a random ID on the device; nothing personal), each delivery-map search
and each search result picked, in the `site_events` table through `log_event` (with a per-visitor limit). Only owners can
read the numbers (`site_stats`). Counting starts once the latest `supabase/setup.sql` has been run.
