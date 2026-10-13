-- =====================================================================
--  ARBAB KEBAB — order database (Supabase / Postgres)
--  Run once: Supabase dashboard → SQL Editor → New query → paste → Run.
--
--  Security model
--   • Customers (public "anon" key) can ONLY call place_order().
--     They cannot read, list, edit or delete any order.
--   • Staff log in to the admin site. Only emails listed in the
--     public.staff table can read orders and update status / fee / notes.
-- =====================================================================

-- ---------- staff allow-list ----------
create table if not exists public.staff (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);

-- ---------- orders ----------
create sequence if not exists public.order_no_seq start 1001;

create table if not exists public.orders (
  id             uuid primary key default gen_random_uuid(),
  order_no       integer not null unique default nextval('public.order_no_seq'),
  ref            text not null unique,                      -- e.g. AK-7KQ2PX, shown to the customer
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  status         text not null default 'new'
                 check (status in ('new','confirmed','preparing','ready','out_for_delivery','completed','cancelled')),
  mode           text not null check (mode in ('Delivery','Takeout')),
  branch         text not null,
  customer_name  text not null,
  customer_phone text not null,
  address        text,
  preferred_time text,
  payment        text,
  notes          text,
  items          jsonb not null,                            -- [{name, opts[], qty, unit}]
  subtotal       numeric(10,2) not null check (subtotal >= 0),
  delivery_fee   numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total          numeric(10,2) generated always as (subtotal + delivery_fee) stored,
  staff_notes    text,
  channel        text                                       -- messenger / sms / copy
);

create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx     on public.orders (status);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

drop trigger if exists orders_touch on public.orders;
create trigger orders_touch before update on public.orders
for each row execute function public.touch_updated_at();

-- ---------- who is staff? ----------
create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- row level security ----------
alter table public.orders enable row level security;
alter table public.staff  enable row level security;

drop policy if exists "staff can read orders"   on public.orders;
drop policy if exists "staff can update orders" on public.orders;
drop policy if exists "staff can read staff"    on public.staff;

create policy "staff can read orders"   on public.orders for select to authenticated using (public.is_staff());
create policy "staff can update orders" on public.orders for update to authenticated using (public.is_staff()) with check (public.is_staff());
create policy "staff can read staff"    on public.staff  for select to authenticated using (public.is_staff());

-- table privileges: customers get nothing directly; staff may only change these columns
revoke all on public.orders from anon, authenticated;
revoke all on public.staff  from anon, authenticated;
grant select on public.orders to authenticated;
grant update (status, delivery_fee, staff_notes) on public.orders to authenticated;
grant select on public.staff to authenticated;

-- ---------- the only way customers can create an order ----------
create or replace function public.place_order(p jsonb) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ref     text := upper(trim(p ->> 'ref'));
  v_mode    text := p ->> 'mode';
  v_branch  text := trim(coalesce(p ->> 'branch', ''));
  v_name    text := trim(coalesce(p ->> 'name', ''));
  v_phone   text := trim(coalesce(p ->> 'phone', ''));
  v_addr    text := nullif(trim(coalesce(p ->> 'address', '')), '');
  v_time    text := nullif(left(trim(coalesce(p ->> 'time', '')), 60), '');
  v_pay     text := nullif(left(trim(coalesce(p ->> 'payment', '')), 60), '');
  v_notes   text := nullif(left(trim(coalesce(p ->> 'notes', '')), 500), '');
  v_channel text := left(coalesce(p ->> 'channel', ''), 20);
  v_items   jsonb;
  v_sub     numeric(10,2);
  v_no      integer;
begin
  -- basic validation
  if v_ref is null or v_ref !~ '^AK-[A-Z0-9]{6}$' then raise exception 'invalid ref'; end if;
  if v_mode not in ('Delivery','Takeout') then raise exception 'invalid mode'; end if;
  if length(v_branch) not between 1 and 60 then raise exception 'invalid branch'; end if;
  if length(v_name)   not between 1 and 80 then raise exception 'invalid name'; end if;
  if v_phone !~ '^[0-9+() -]{7,20}$' then raise exception 'invalid phone'; end if;
  if v_mode = 'Delivery' and (v_addr is null or length(v_addr) > 300) then raise exception 'invalid address'; end if;
  if jsonb_typeof(p -> 'items') <> 'array'
     or jsonb_array_length(p -> 'items') not between 1 and 50 then raise exception 'invalid items'; end if;

  -- clean the items list (only known fields, sane numbers)
  select jsonb_agg(jsonb_build_object(
           'name', left(i ->> 'name', 100),
           'opts', coalesce((select jsonb_agg(left(o, 60)) from jsonb_array_elements_text(
                      case when jsonb_typeof(i -> 'opts') = 'array' then i -> 'opts' else '[]'::jsonb end) o), '[]'::jsonb),
           'qty',  (i ->> 'qty')::int,
           'unit', (i ->> 'unit')::numeric)),
         sum((i ->> 'qty')::int * (i ->> 'unit')::numeric)
    into v_items, v_sub
  from jsonb_array_elements(p -> 'items') i;

  if exists (select 1 from jsonb_array_elements(v_items) i
             where coalesce(i ->> 'name', '') = ''
                or (i ->> 'qty')::int  not between 1 and 99
                or (i ->> 'unit')::numeric not between 0 and 100000) then
    raise exception 'invalid item';
  end if;

  -- simple flood protection: max 5 new orders per phone number per 10 minutes
  if (select count(*) from public.orders
      where customer_phone = v_phone and created_at > now() - interval '10 minutes'
        and ref <> v_ref) >= 5 then
    raise exception 'too many orders, please wait a few minutes';
  end if;

  insert into public.orders as o (ref, mode, branch, customer_name, customer_phone, address,
                                  preferred_time, payment, notes, items, subtotal, channel)
  values (v_ref, v_mode, v_branch, v_name, v_phone, case when v_mode = 'Delivery' then v_addr end,
          v_time, v_pay, v_notes, v_items, v_sub, v_channel)
  on conflict (ref) do update               -- same cart sent again (e.g. Messenger then SMS)
     set mode = excluded.mode, branch = excluded.branch, customer_name = excluded.customer_name,
         customer_phone = excluded.customer_phone, address = excluded.address,
         preferred_time = excluded.preferred_time, payment = excluded.payment, notes = excluded.notes,
         items = excluded.items, subtotal = excluded.subtotal, channel = excluded.channel
     where o.status = 'new'                  -- staff-handled orders can't be overwritten
  returning o.order_no into v_no;

  if v_no is null then
    select order_no into v_no from public.orders where ref = v_ref;
  end if;

  return jsonb_build_object('ok', true, 'ref', v_ref, 'order_no', v_no);
end $$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;
revoke all on function public.is_staff() from public;
grant execute on function public.is_staff() to authenticated;

-- ---------- live updates for the admin site ----------
do $$
begin
  if not exists (select 1 from pg_publication_tables
                 where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'orders') then
    alter publication supabase_realtime add table public.orders;
  end if;
end $$;

-- ---------- add your staff (edit the emails, then run) ----------
-- Each person also needs a login: Authentication → Users → Add user (same email).
insert into public.staff (email, name) values
  ('owner@example.com', 'Owner')
on conflict (email) do nothing;
