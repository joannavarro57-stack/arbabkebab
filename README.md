# Arbab Kebab — websites

| Folder | What it is | Netlify project base directory |
|---|---|---|
| `arbab-kebab-site/` | Customer catalog & order site | `arbab-kebab-site` |
| `arbab-kebab-admin/` | Staff order management (login required) | `arbab-kebab-admin` |
| `supabase-setup.sql` | Database setup and payment-flow migration — run in Supabase SQL Editor | — |

Editing a file in one folder only redeploys that site.

Run `supabase-setup.sql` in the Supabase SQL Editor to create or update the database schema, payment RPCs, and private GCash confirmation screenshot bucket. The script is designed to be rerun after deployment changes.
