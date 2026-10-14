# Arbab Kebab — websites

| Folder | What it is | Netlify project base directory |
|---|---|---|
| `arbab-kebab-site/` | Customer catalog & order site | `arbab-kebab-site` |
| `arbab-kebab-admin/` | Staff order management (login required) | `arbab-kebab-admin` |
| `supabase-setup.sql` | Database setup and payment-flow migration — run in Supabase SQL Editor | — |

Editing a file in one folder only redeploys that site.

Run `supabase-setup.sql` in the Supabase SQL Editor to create or update the database schema, payment RPCs, private GCash confirmation screenshot bucket, and soft-delete audit fields/RPC. The script is designed to be rerun after deployment changes. Staff can delete an order from the admin interface by entering a reason and confirming their staff-account password; the order remains available under the Deleted tab.
