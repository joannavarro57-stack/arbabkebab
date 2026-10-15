# Arbab Kebab — websites

| Folder | What it is | Netlify project base directory |
|---|---|---|
| `arbab-kebab-site/` | Customer catalog & order site | `arbab-kebab-site` |
| `arbab-kebab-admin/` | Staff order management (login required) | `arbab-kebab-admin` |
| `supabase-setup.sql` | Database setup and payment-flow migration — run in Supabase SQL Editor | — |

Editing a file in one folder only redeploys that site.

Run `supabase-setup.sql` in the Supabase SQL Editor to create or update the database schema, payment RPCs, private GCash confirmation screenshot bucket, staff order editing/creation RPC, soft-delete audit fields/RPC, and order-mode migration from `Takeout` to `Pick-Up`. The script is designed to be rerun after deployment changes. Staff can create and edit orders in the admin interface; deletion archives the record in the database.

## Adding a branch

1. Open `arbab-kebab-site/config.js` and find `branches`.
2. Copy the Malolos line, paste it underneath, and change the `name`, map location (`lat`, `lng`), and optional `address` / `hours`.
   To get `lat`, `lng`: in Google Maps, right-click the shop and click the two numbers to copy them.
3. Commit. The order form, branch list, delivery map, order messages and payment page all use the new branch,
   and the admin site picks it up automatically (it reads the website's `config.js`).

Don't rename a branch after it has orders — the name is saved with each order.
