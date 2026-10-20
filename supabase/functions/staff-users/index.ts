// Arbab Kebab — staff logins for the admin site (Users page).
//
// POST with the caller's login token (the admin site sends it automatically) and
// {"action": ...}:
//   list                                   any active staff
//   create   {email, name, password, is_admin}   admins only
//   reset_password {email, password}       admins only
//   remove   {email}                       admins only: blocks the login, keeps all data
//   restore  {email}                       admins only
//   set_admin {email, is_admin}            admins only
//
// Uses the service role key that Supabase provides to every edge function;
// it never leaves the server. Deploy with JWT verification off (the function
// checks the caller itself).

import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BAN = "876000h"; // ~100 years

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const reply = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });
const fail = (error: string, status = 400) => reply({ error }, status);

const admin = createClient(SUPABASE_URL, SERVICE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });

async function allUsers() {
  const users = [];
  for (let page = 1; page < 20; page++) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    users.push(...data.users);
    if (data.users.length < 1000) break;
  }
  return users;
}
const like = (e: string) => e.replace(/[\\%_]/g, (c) => "\\" + c);
const findUser = async (email: string) =>
  (await allUsers()).find((u) => (u.email || "").toLowerCase() === email);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return fail("POST only", 405);
  try {
    // who is calling?
    const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
    const { data: who, error: whoErr } = await admin.auth.getUser(token);
    if (whoErr || !who.user?.email) return fail("Please log in again.", 401);
    const me = who.user.email.toLowerCase();
    const { data: meRow } = await admin.from("staff").select("email,is_admin,disabled").ilike("email", like(me)).maybeSingle();
    if (!meRow || meRow.disabled) return fail("This account isn't on the staff list.", 403);

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || "");
    const email = String(body.email || "").trim().toLowerCase();
    const password = String(body.password || "");

    if (action === "list") {
      const [{ data: staff, error }, users] = await Promise.all([
        admin.from("staff").select("email,name,is_admin,disabled,created_at").order("created_at"),
        allUsers(),
      ]);
      if (error) throw error;
      const byEmail = new Map(users.map((u) => [(u.email || "").toLowerCase(), u]));
      return reply({
        me,
        is_admin: meRow.is_admin,
        users: (staff || []).map((s) => {
          const u = byEmail.get(s.email.toLowerCase());
          return {
            email: s.email, name: s.name, is_admin: s.is_admin, disabled: s.disabled, added_at: s.created_at,
            has_login: !!u, last_sign_in_at: u?.last_sign_in_at || null,
          };
        }),
      });
    }

    if (!meRow.is_admin) return fail("Only owners can manage users.", 403);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("Enter a valid email.");
    if (["remove", "set_admin"].includes(action) && email === me) return fail("You can't change your own access.");
    if (["create", "reset_password"].includes(action) && password.length < 6) return fail("Password needs at least 6 characters.");

    if (action === "create") {
      const { data: row } = await admin.from("staff").select("email,disabled").ilike("email", like(email)).maybeSingle();
      if (row) return fail(row.disabled ? "That user was removed. Use Restore instead." : "That user already exists.");
      const existing = await findUser(email);
      if (existing) {
        const { error } = await admin.auth.admin.updateUserById(existing.id, { password, ban_duration: "none", email_confirm: true });
        if (error) throw error;
      } else {
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
      }
      const { error } = await admin.from("staff").insert({
        email, name: String(body.name || "").trim().slice(0, 80) || null, is_admin: !!body.is_admin,
      });
      if (error) throw error;
      return reply({ ok: true });
    }

    const { data: row } = await admin.from("staff").select("email").ilike("email", like(email)).maybeSingle();
    if (!row) return fail("No staff user with that email.");
    const user = await findUser(email);

    if (action === "reset_password") {
      if (!user) {
        const { error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
        if (error) throw error;
      } else {
        const { error } = await admin.auth.admin.updateUserById(user.id, { password });
        if (error) throw error;
      }
      return reply({ ok: true });
    }
    if (action === "remove" || action === "restore") {
      const off = action === "remove";
      if (user) {
        const { error } = await admin.auth.admin.updateUserById(user.id, { ban_duration: off ? BAN : "none" });
        if (error) throw error;
      }
      const { error } = await admin.from("staff").update({ disabled: off }).eq("email", row.email);
      if (error) throw error;
      return reply({ ok: true });
    }
    if (action === "set_admin") {
      const { error } = await admin.from("staff").update({ is_admin: !!body.is_admin }).eq("email", row.email);
      if (error) throw error;
      return reply({ ok: true });
    }
    return fail("Unknown action.");
  } catch (e) {
    console.error(e);
    return fail((e as Error).message || "Something went wrong.", 500);
  }
});
