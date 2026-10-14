-- =====================================================================
--  ARBAB KEBAB — order database (Supabase / Postgres)
--  Run: Supabase dashboard → SQL Editor → New query → paste → Run.
--  Safe to rerun after edits; payment columns and RPCs are maintained below.
--
--  Security model
--   • Customers (public "anon" key) can place orders and submit GCash payment
--     proof through restricted RPCs. They cannot read, list, edit or delete orders.
--   • Staff log in to the admin site. Only emails listed in the
--     public.staff table can read orders and update status / fee / notes.
--   • Unpaid GCash orders are hidden in the admin UI until a payment reference
--     is submitted; staff then verifies the reference and marks it paid.
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
  order_date     date,
  preferred_time text,
  payment        text,
  notes          text,
  items          jsonb not null,                            -- [{name, opts[], qty, unit}]
  subtotal       numeric(10,2) not null check (subtotal >= 0),
  delivery_fee   numeric(10,2) not null default 0 check (delivery_fee >= 0),
  total          numeric(10,2) generated always as (subtotal + delivery_fee) stored,
  staff_notes    text,
  channel        text,                                      -- website
  payment_status text not null default 'unpaid',
  payment_ref    text,
  payment_ref_last4 text,
  payer_name     text,
  payment_submitted_at timestamptz,
  payment_screenshot_path text,
  paid_at        timestamptz
);

-- Add payment tracking to databases created from earlier versions of this file.
alter table public.orders add column if not exists payment_status text not null default 'unpaid';
alter table public.orders add column if not exists payment_ref text;
alter table public.orders add column if not exists payment_ref_last4 text;
alter table public.orders add column if not exists payer_name text;
alter table public.orders add column if not exists payment_submitted_at timestamptz;
alter table public.orders add column if not exists payment_screenshot_path text;
alter table public.orders add column if not exists order_date date;
alter table public.orders add column if not exists paid_at timestamptz;
update public.orders
   set payment_status = case
     when paid_at is not null then 'paid'
     when payment_ref is not null then 'submitted'
     else 'unpaid'
   end
 where payment_status is null;
alter table public.orders alter column payment_status set default 'unpaid';
alter table public.orders alter column payment_status set not null;

do $$
begin
  if not exists (select 1 from pg_constraint
                 where conname = 'orders_payment_status_check'
                   and conrelid = 'public.orders'::regclass) then
    alter table public.orders add constraint orders_payment_status_check
      check (payment_status in ('unpaid','submitted','paid','refunded'));
  end if;
end $$;

create unique index if not exists orders_payment_ref_unique_idx
  on public.orders (payment_ref) where payment_ref is not null;
create index if not exists orders_created_at_idx on public.orders (created_at desc);
create index if not exists orders_status_idx     on public.orders (status);

-- keep updated_at fresh
create or replace function public.touch_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.payment_status = 'paid' and old.payment_status is distinct from 'paid' then
    new.paid_at := coalesce(new.paid_at, now());
  elsif new.payment_status <> 'paid' then
    new.paid_at := null;
  end if;
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
grant update (status, delivery_fee, staff_notes, payment_status, payment_ref,
              payment_ref_last4, payer_name, payment_submitted_at, payment_screenshot_path, paid_at)
  on public.orders to authenticated;
grant select on public.staff to authenticated;

-- Private GCash proof uploads: customers can upload only for an unpaid GCash order.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('gcash-confirmations', 'gcash-confirmations', false, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create or replace function public.can_upload_gcash_confirmation(p_ref text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.ref = p_ref
      and o.payment ilike '%gcash%'
      and o.payment_status in ('unpaid','submitted')
      and o.status <> 'cancelled'
      and o.created_at > now() - interval '14 days'
  );
$$;
revoke all on function public.can_upload_gcash_confirmation(text) from public;
grant execute on function public.can_upload_gcash_confirmation(text) to anon, authenticated;

drop policy if exists "customers upload GCash confirmations" on storage.objects;
drop policy if exists "staff read GCash confirmations" on storage.objects;
create policy "customers upload GCash confirmations" on storage.objects
  for insert to anon, authenticated
  with check (
    bucket_id = 'gcash-confirmations'
    and name ~ '^AK-[A-Z0-9]{6}/[0-9a-f-]{36}\.(jpg|png|webp)$'
    and public.can_upload_gcash_confirmation((storage.foldername(name))[1])
  );
create policy "staff read GCash confirmations" on storage.objects
  for select to authenticated
  using (bucket_id = 'gcash-confirmations' and public.is_staff());

create or replace function public.can_view_paid_gcash_confirmation(p_ref text, p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.orders o
    where o.ref = p_ref
      and o.payment ilike '%gcash%'
      and o.payment_status = 'paid'
      and o.payment_screenshot_path = p_path
      and o.created_at > now() - interval '14 days'
  );
$$;
revoke all on function public.can_view_paid_gcash_confirmation(text, text) from public;
grant execute on function public.can_view_paid_gcash_confirmation(text, text) to anon, authenticated;

drop policy if exists "customer reads own paid GCash confirmation" on storage.objects;
create policy "customer reads own paid GCash confirmation" on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'gcash-confirmations'
    and public.can_view_paid_gcash_confirmation((storage.foldername(name))[1], name)
  );

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
  v_order_date date;
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
  if v_pay is null or v_pay not in ('Cash on Delivery','Cash','GCash') then raise exception 'invalid payment method'; end if;
  if coalesce(p ->> 'order_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid order date'; end if;
  v_order_date := (p ->> 'order_date')::date;
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

  insert into public.orders as o (ref, mode, branch, customer_name, customer_phone, address, order_date,
                                  preferred_time, payment, notes, items, subtotal, channel)
  values (v_ref, v_mode, v_branch, v_name, v_phone, case when v_mode = 'Delivery' then v_addr end,
          v_order_date, v_time, v_pay, v_notes, v_items, v_sub, v_channel)
  on conflict (ref) do update               -- allow retrying an unsubmitted checkout
     set mode = excluded.mode, branch = excluded.branch, customer_name = excluded.customer_name,
         customer_phone = excluded.customer_phone, address = excluded.address,
         order_date = excluded.order_date, preferred_time = excluded.preferred_time,
         payment = excluded.payment, notes = excluded.notes,
         items = excluded.items, subtotal = excluded.subtotal, channel = excluded.channel
     where o.status = 'new' and o.payment_status = 'unpaid' and o.payment_ref is null
  returning o.order_no into v_no;

  if v_no is null then
    select order_no into v_no from public.orders where ref = v_ref;
  end if;

  return jsonb_build_object('ok', true, 'ref', v_ref, 'order_no', v_no);
end $$;

revoke all on function public.place_order(jsonb) from public;
grant execute on function public.place_order(jsonb) to anon, authenticated;

-- Payment pages can look up a limited set of order fields by reference only.
create or replace function public.get_payment(p_ref text) returns jsonb
language sql security definer set search_path = public as $$
  select jsonb_build_object(
    'ref', o.ref,
    'order_no', o.order_no,
    'mode', o.mode,
    'branch', o.branch,
    'order_date', o.order_date,
    'subtotal', o.subtotal,
    'delivery_fee', o.delivery_fee,
    'total', o.total,
    'items', o.items,
    'status', o.status,
    'payment_status', o.payment_status,
    'payment_ref_last4', o.payment_ref_last4,
    'payment_screenshot_path', case when o.payment_status = 'paid' then o.payment_screenshot_path end
  )
  from public.orders o
  where o.ref = upper(trim(p_ref))
    and o.payment ilike '%gcash%'
    and o.created_at > now() - interval '14 days';
$$;

drop function if exists public.submit_payment(text, text, text);
create or replace function public.submit_payment(p_ref text, p_gcash_ref text, p_screenshot_path text, p_name text default '')
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_ref text := upper(trim(p_ref));
  v_gcash_ref text := regexp_replace(coalesce(p_gcash_ref, ''), '\D', '', 'g');
  v_screenshot_path text := trim(coalesce(p_screenshot_path, ''));
  v_order public.orders%rowtype;
begin
  if v_ref !~ '^AK-[A-Z0-9]{6}$' then raise exception 'invalid order reference'; end if;
  if v_gcash_ref <> '' and v_gcash_ref !~ '^[0-9]{10,20}$' then raise exception 'invalid GCash reference number'; end if;
  if v_screenshot_path !~ ('^' || v_ref || '/[0-9a-f-]{36}\.(jpg|png|webp)$')
     or not exists (select 1 from storage.objects
                    where bucket_id = 'gcash-confirmations' and name = v_screenshot_path) then
    raise exception 'valid payment screenshot required';
  end if;

  update public.orders
     set payment_status = 'submitted',
         payment_ref = nullif(v_gcash_ref, ''),
         payment_ref_last4 = nullif(right(v_gcash_ref, 4), ''),
         payer_name = nullif(left(trim(coalesce(p_name, '')), 80), ''),
         payment_submitted_at = now(),
         payment_screenshot_path = v_screenshot_path
   where ref = v_ref
     and payment ilike '%gcash%'
     and status <> 'cancelled'
     and payment_status in ('unpaid','submitted')
     and created_at > now() - interval '14 days'
  returning * into v_order;

  if not found then raise exception 'order cannot accept a payment submission'; end if;

  return jsonb_build_object('ok', true, 'ref', v_order.ref,
                            'payment_status', v_order.payment_status);
end $$;

revoke all on function public.get_payment(text) from public;
grant execute on function public.get_payment(text) to anon, authenticated;
revoke all on function public.submit_payment(text, text, text, text) from public;
grant execute on function public.submit_payment(text, text, text, text) to anon, authenticated;

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
