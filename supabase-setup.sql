-- =====================================================================
--  ARBAB KEBAB — order database (Supabase / Postgres)
--  Run: Supabase dashboard → SQL Editor → New query → paste → Run.
--  Safe to rerun after edits; payment columns and RPCs are maintained below.
--
--  Security model
--   • Customers (public "anon" key) can place orders and submit GCash payment
--     proof through restricted RPCs. They cannot read, list, edit or delete orders.
--   • Staff log in to the admin site. Only emails listed in the
--     public.staff table can read, create and edit orders. Deletions are soft
--     deletes with reason and staff audit fields; rows are retained.
--   • Unpaid GCash orders are hidden in the admin UI until a payment reference
--     is submitted; staff then verifies the reference and marks it paid.
-- =====================================================================

-- ---------- staff allow-list ----------
create table if not exists public.staff (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);
-- is_admin (shown as "Owner"; others show as "Admin"): can add/remove users and reset passwords (admin site → Orders → 👥 Users,
-- through the edge function staff-users). disabled: "Removed" — login blocked, row kept.
alter table public.staff add column if not exists is_admin boolean not null default false;
alter table public.staff add column if not exists disabled boolean not null default false;

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
  mode           text not null check (mode in ('Delivery','Pick-Up')),
  branch         text not null,
  customer_name  text not null,
  customer_phone text not null,
  customer_email text,                                      -- optional, for order emails
  address        text,
  delivery_lat   numeric(9,6),                              -- pinned delivery location (map)
  delivery_lng   numeric(9,6),
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
  paid_at        timestamptz,
  deleted_at     timestamptz,
  deleted_by     text,
  delete_reason  text
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
alter table public.orders add column if not exists deleted_at timestamptz;
alter table public.orders add column if not exists deleted_by text;
alter table public.orders add column if not exists delete_reason text;
alter table public.orders add column if not exists delivery_lat numeric(9,6);
alter table public.orders add column if not exists delivery_lng numeric(9,6);
alter table public.orders add column if not exists customer_email text;
alter table public.orders add column if not exists email_placed_sent_at timestamptz;
alter table public.orders add column if not exists email_completed_sent_at timestamptz;
alter table public.orders drop constraint if exists orders_mode_check;
update public.orders set mode = 'Pick-Up' where mode = 'Takeout';
alter table public.orders add constraint orders_mode_check check (mode in ('Delivery','Pick-Up'));
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
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and not disabled
  );
$$;

create or replace function public.is_staff_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')) and not disabled and is_admin
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

-- Retain deleted orders with an immutable staff identity and required reason.
create or replace function public.archive_order(p_order_id uuid, p_reason text)
returns jsonb
language plpgsql security definer set search_path = public, auth as $$
declare
  v_order public.orders%rowtype;
  v_email text := auth.jwt() ->> 'email';
begin
  if not public.is_staff() then raise exception 'staff access required'; end if;
  if p_reason is null or length(trim(p_reason)) not between 1 and 500 then
    raise exception 'deletion reason must be 1 to 500 characters';
  end if;

  update public.orders
     set deleted_at = now(), deleted_by = v_email, delete_reason = trim(p_reason)
   where id = p_order_id and deleted_at is null
   returning * into v_order;
  if not found then raise exception 'order not found or already deleted'; end if;

  return to_jsonb(v_order);
end $$;
revoke all on function public.archive_order(uuid, text) from public, anon;
grant execute on function public.archive_order(uuid, text) to authenticated;

-- Staff-only order creation and editing. Items and subtotal are recalculated
-- and validated together so the generated total remains consistent.
create or replace function public.save_staff_order(p_order_id uuid, p_order jsonb)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  v_order public.orders%rowtype;
  v_mode text := p_order ->> 'mode';
  v_branch text := trim(coalesce(p_order ->> 'branch', ''));
  v_name text := trim(coalesce(p_order ->> 'name', ''));
  v_phone text := trim(coalesce(p_order ->> 'phone', ''));
  v_email text := nullif(lower(trim(coalesce(p_order ->> 'email', ''))), '');
  v_address text := nullif(trim(coalesce(p_order ->> 'address', '')), '');
  v_date date;
  v_time text := nullif(left(trim(coalesce(p_order ->> 'time', '')), 60), '');
  v_payment text := p_order ->> 'payment';
  v_notes text := nullif(left(trim(coalesce(p_order ->> 'notes', '')), 500), '');
  v_staff_notes text := nullif(left(trim(coalesce(p_order ->> 'staff_notes', '')), 1000), '');
  v_status text := coalesce(p_order ->> 'status', 'new');
  v_delivery_fee numeric(10,2);
  v_items jsonb := '[]'::jsonb;
  v_item jsonb;
  v_opts jsonb;
  v_qty integer;
  v_unit numeric(10,2);
  v_subtotal numeric(10,2) := 0;
  v_ref text := upper(trim(coalesce(p_order ->> 'ref', '')));
  v_phone_pattern constant text := '^[0-9+() -]{7,20}$';
begin
  if not public.is_staff() then raise exception 'staff access required'; end if;
  if jsonb_typeof(p_order) <> 'object' then raise exception 'invalid order'; end if;
  if v_mode is null or v_mode not in ('Delivery','Pick-Up') then raise exception 'invalid order type'; end if;
  if length(v_branch) not between 1 and 60 then raise exception 'invalid branch'; end if;
  if length(v_name) not between 1 and 80 then raise exception 'invalid customer name'; end if;
  if v_phone !~ v_phone_pattern then raise exception 'invalid phone'; end if;
  if v_email is not null and (length(v_email) > 120 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
    raise exception 'invalid email';
  end if;
  if v_mode = 'Delivery' and (v_address is null or length(v_address) > 300) then
    raise exception 'delivery address is required';
  end if;
  if v_payment is null or v_payment not in ('Cash on Delivery','Cash','GCash')
     or (v_mode = 'Delivery' and v_payment = 'Cash')
     or (v_mode = 'Pick-Up' and v_payment = 'Cash on Delivery') then
    raise exception 'invalid payment method for order type';
  end if;
  if coalesce(p_order ->> 'order_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then
    raise exception 'invalid order date';
  end if;
  v_date := (p_order ->> 'order_date')::date;
  if coalesce(p_order ->> 'time', '') <> '' and length(p_order ->> 'time') > 60 then
    raise exception 'invalid preferred time';
  end if;
  if v_status not in ('new','confirmed','preparing','ready','out_for_delivery','completed','cancelled') then
    raise exception 'invalid order status';
  end if;
  if coalesce(p_order ->> 'delivery_fee', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
    raise exception 'invalid delivery fee';
  end if;
  v_delivery_fee := (p_order ->> 'delivery_fee')::numeric;
  if v_delivery_fee not between 0 and 100000 then raise exception 'invalid delivery fee'; end if;
  if jsonb_typeof(p_order -> 'items') <> 'array'
     or jsonb_array_length(p_order -> 'items') not between 1 and 50 then
    raise exception 'order must contain 1 to 50 items';
  end if;

  for v_item in select value from jsonb_array_elements(p_order -> 'items') loop
    if length(trim(coalesce(v_item ->> 'name', ''))) not between 1 and 100
       or coalesce(v_item ->> 'qty', '') !~ '^[0-9]+$'
       or coalesce(v_item ->> 'unit', '') !~ '^[0-9]+(\.[0-9]{1,2})?$' then
      raise exception 'invalid order item';
    end if;
    v_qty := (v_item ->> 'qty')::integer;
    v_unit := (v_item ->> 'unit')::numeric;
    if v_qty not between 1 and 99 or v_unit not between 0 and 100000 then
      raise exception 'invalid order item quantity or price';
    end if;
    if jsonb_typeof(v_item -> 'opts') = 'array' then
      select coalesce(jsonb_agg(left(value, 60)), '[]'::jsonb) into v_opts
      from jsonb_array_elements_text(v_item -> 'opts') as option_value(value);
    else
      v_opts := '[]'::jsonb;
    end if;
    v_items := v_items || jsonb_build_array(jsonb_build_object(
      'name', trim(v_item ->> 'name'), 'opts', v_opts, 'qty', v_qty, 'unit', v_unit
    ));
    v_subtotal := v_subtotal + v_qty * v_unit;
  end loop;
  if v_subtotal > 1000000 then raise exception 'order subtotal is too large'; end if;

  if p_order_id is null then
    if v_ref !~ '^AK-[A-Z0-9]{6}$' then raise exception 'invalid order reference'; end if;
    insert into public.orders
      (ref, mode, branch, customer_name, customer_phone, customer_email, address, order_date,
       preferred_time, payment, notes, items, subtotal, delivery_fee, status,
       staff_notes, channel)
    values
      (v_ref, v_mode, v_branch, v_name, v_phone, v_email,
       case when v_mode = 'Delivery' then v_address end, v_date, v_time, v_payment,
       v_notes, v_items, v_subtotal, v_delivery_fee, v_status, v_staff_notes, 'admin')
    returning * into v_order;
  else
    update public.orders
       set mode = v_mode, branch = v_branch, customer_name = v_name,
           customer_phone = v_phone, customer_email = v_email,
           address = case when v_mode = 'Delivery' then v_address end,
           delivery_lat = case when v_mode = 'Delivery' then delivery_lat end,
           delivery_lng = case when v_mode = 'Delivery' then delivery_lng end,
           order_date = v_date, preferred_time = v_time, payment = v_payment,
           notes = v_notes, items = v_items, subtotal = v_subtotal,
           delivery_fee = v_delivery_fee, status = v_status, staff_notes = v_staff_notes
     where id = p_order_id and deleted_at is null
     returning * into v_order;
    if not found then raise exception 'order not found or already deleted'; end if;
  end if;

  return to_jsonb(v_order);
end $$;
revoke all on function public.save_staff_order(uuid, jsonb) from public, anon;
grant execute on function public.save_staff_order(uuid, jsonb) to authenticated;

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
      and o.payment_status in ('submitted','paid')
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
  v_email   text := nullif(lower(trim(coalesce(p ->> 'email', ''))), '');
  v_addr    text := nullif(trim(coalesce(p ->> 'address', '')), '');
  v_order_date date;
  v_time    text := nullif(left(trim(coalesce(p ->> 'time', '')), 60), '');
  v_pay     text := nullif(left(trim(coalesce(p ->> 'payment', '')), 60), '');
  v_notes   text := nullif(left(trim(coalesce(p ->> 'notes', '')), 500), '');
  v_channel text := left(coalesce(p ->> 'channel', ''), 20);
  v_lat     numeric(9,6);
  v_lng     numeric(9,6);
  v_items   jsonb;
  v_sub     numeric(10,2);
  v_no      integer;
begin
  -- basic validation
  if v_ref is null or v_ref !~ '^AK-[A-Z0-9]{6}$' then raise exception 'invalid ref'; end if;
  if v_mode not in ('Delivery','Pick-Up') then raise exception 'invalid mode'; end if;
  if v_pay is null or v_pay not in ('Cash on Delivery','Cash','GCash') then raise exception 'invalid payment method'; end if;
  if coalesce(p ->> 'order_date', '') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$' then raise exception 'invalid order date'; end if;
  v_order_date := (p ->> 'order_date')::date;
  if length(v_branch) not between 1 and 60 then raise exception 'invalid branch'; end if;
  if length(v_name)   not between 1 and 80 then raise exception 'invalid name'; end if;
  if v_phone !~ '^[0-9+() -]{7,20}$' then raise exception 'invalid phone'; end if;
  if v_email is not null and (length(v_email) > 120 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]{2,}$') then
    raise exception 'invalid email';
  end if;
  if v_mode = 'Delivery' and (v_addr is null or length(v_addr) > 300) then raise exception 'invalid address'; end if;
  if jsonb_typeof(p -> 'items') <> 'array'
     or jsonb_array_length(p -> 'items') not between 1 and 50 then raise exception 'invalid items'; end if;

  -- optional map pin for deliveries (must be inside the Philippines)
  if v_mode = 'Delivery' and coalesce(p ->> 'lat', '') <> '' and coalesce(p ->> 'lng', '') <> '' then
    if (p ->> 'lat') !~ '^-?[0-9]{1,3}(\.[0-9]+)?$' or (p ->> 'lng') !~ '^-?[0-9]{1,3}(\.[0-9]+)?$' then
      raise exception 'invalid map location';
    end if;
    v_lat := round((p ->> 'lat')::numeric, 6);
    v_lng := round((p ->> 'lng')::numeric, 6);
    if v_lat not between 4 and 22 or v_lng not between 116 and 127 then
      raise exception 'pinned location must be in the Philippines';
    end if;
  end if;

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

  insert into public.orders as o (ref, mode, branch, customer_name, customer_phone, customer_email, address,
                                  delivery_lat, delivery_lng, order_date,
                                  preferred_time, payment, notes, items, subtotal, channel)
  values (v_ref, v_mode, v_branch, v_name, v_phone, v_email, case when v_mode = 'Delivery' then v_addr end,
          v_lat, v_lng, v_order_date, v_time, v_pay, v_notes, v_items, v_sub, v_channel)
  on conflict (ref) do update               -- allow retrying an unsubmitted checkout
     set mode = excluded.mode, branch = excluded.branch, customer_name = excluded.customer_name,
         customer_phone = excluded.customer_phone, customer_email = excluded.customer_email,
         address = excluded.address,
         delivery_lat = excluded.delivery_lat, delivery_lng = excluded.delivery_lng,
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
    'payment_screenshot_path', case when o.payment_status in ('submitted','paid') then o.payment_screenshot_path end
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
revoke all on function public.is_staff_admin() from public;
grant execute on function public.is_staff_admin() to authenticated;

-- ---------- automatic customer emails ----------
-- When an order with an email is placed, or later marked completed, ask the
-- "order-emails" Edge Function to send the email. The function checks the order
-- itself and records email_*_sent_at, so each email is sent at most once.
create extension if not exists pg_net with schema extensions;

create or replace function public.notify_order_email() returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if new.customer_email is null then return new; end if;
  if tg_op = 'INSERT' or (new.status = 'completed' and old.status is distinct from 'completed') then
    perform net.http_post(
      url := 'https://addfbbpqhxsinedvnnme.supabase.co/functions/v1/order-emails',
      body := jsonb_build_object('order_id', new.id),
      headers := '{"Content-Type":"application/json"}'::jsonb
    );
  end if;
  return new;
end $$;
revoke all on function public.notify_order_email() from public, anon, authenticated;

create or replace trigger orders_email_placed after insert on public.orders
for each row execute function public.notify_order_email();
create or replace trigger orders_email_completed after update of status on public.orders
for each row execute function public.notify_order_email();

-- ---------- menu (edited in the admin site → Menu tab) ----------
-- The website reads visible items from here; if this table is missing or empty
-- it falls back to the menu written in index.html. "Delete" in the admin only
-- archives an item (archived = true), so nothing is lost and it can be restored.
create table if not exists public.menu_items (
  id          text primary key,
  cat         text not null,
  name        text not null,
  description text not null default '',
  price       numeric(10,2) not null check (price >= 0),
  tag         text,                       -- badge on the card, e.g. 'Fan favorite'
  img         text,                       -- 'images/x.png' on the website, or a full URL
  options     jsonb not null default '[]'::jsonb,   -- [{label, choices:[{name, add}]}]
  sort        integer not null default 0,
  hidden      boolean not null default false,       -- true = not shown to customers (e.g. sold out)
  archived    boolean not null default false,       -- true = deleted in the admin
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  updated_by  text
);

create or replace function public.touch_menu_item() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  new.updated_by := coalesce(auth.jwt() ->> 'email', new.updated_by);
  return new;
end $$;
create or replace trigger menu_items_touch before insert or update on public.menu_items
for each row execute function public.touch_menu_item();

alter table public.menu_items enable row level security;
drop policy if exists "everyone reads visible menu" on public.menu_items;
drop policy if exists "staff read menu"   on public.menu_items;
drop policy if exists "staff add menu"    on public.menu_items;
drop policy if exists "staff edit menu"   on public.menu_items;
create policy "everyone reads visible menu" on public.menu_items for select to anon, authenticated using (not hidden and not archived);
create policy "staff read menu" on public.menu_items for select to authenticated using (public.is_staff());
-- only owners (staff.is_admin) add or edit the menu
create policy "staff add menu"  on public.menu_items for insert to authenticated with check (public.is_staff_admin());
create policy "staff edit menu" on public.menu_items for update to authenticated using (public.is_staff_admin()) with check (public.is_staff_admin());
grant select on public.menu_items to anon, authenticated;
grant insert, update on public.menu_items to authenticated;

-- Starting menu (copied from index.html). Existing rows are never overwritten.
insert into public.menu_items (id, cat, name, description, price, tag, img, options, sort) values
  ('MS1', 'MealSets', 'Shawaya Set 1', 'Whole chicken served with tomato chutney and garlic paste', 375, 'Bestseller', 'images/Shawaya_1.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]},{"label":"Extra Kabsa Rice","choices":[{"name":"No extra rice","add":0},{"name":"Add Kabsa Rice","add":170}]}]', 10),
  ('MS2', 'MealSets', 'Shawaya Set 2', 'Whole chicken with 2 cups of rice, served with tomato chutney and garlic paste', 475, null, 'images/Shawaya_2.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]},{"label":"Extra Kabsa Rice","choices":[{"name":"No extra rice","add":0},{"name":"Add Kabsa Rice","add":170}]}]', 20),
  ('MS3', 'MealSets', 'Shawaya Set 3', 'Whole chicken with 4 pcs Arabic bread and fries platter, served with tomato chutney and garlic paste', 595, 'Must try', 'images/Shawaya_3.png', '[{"label":"Extra Kabsa Rice","choices":[{"name":"No extra rice","add":0},{"name":"Add Kabsa Rice","add":170}]}]', 30),
  ('MS4', 'MealSets', 'Shawaya Set 4', 'Whole chicken with 4 cups of rice and your choice of salad, served with tomato chutney and garlic paste.', 695, null, 'images/Shawaya_4.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]},{"label":"Extra Kabsa Rice","choices":[{"name":"No extra rice","add":0},{"name":"Add Kabsa Rice","add":170}]},{"label":"Salad","choices":[{"name":"Fattoush","add":0},{"name":"Tabbouleh","add":0}]}]', 40),
  ('PL1', 'Potluck', 'Potluck', 'Good for 4-6 pax.', 995, null, 'images/Potluck.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]},{"label":"Extra Kabsa Rice","choices":[{"name":"No extra rice","add":0},{"name":"Add Kabsa Rice","add":170}]}]', 50),
  ('PL2', 'Potluck', 'Shawaya Potluck', 'Good for 4–6 pax', 1299, null, 'images/S_Potluck.png', '[{"label":"Skewers","choices":[{"name":"2 skewers","add":0},{"name":"3 skewers","add":70}]},{"label":"Extra Kabsa Rice","choices":[{"name":"No extra rice","add":0},{"name":"Add Kabsa Rice","add":170}]}]', 60),
  ('SLD1', 'Salads', 'Fattoush', 'Fresh greens with bread crisps', 179, null, 'images/Fattoush.png', '[]', 70),
  ('SLD2', 'Salads', 'Tabbouleh', 'Fresh parsley, tomato, onions and other greens with olive oil and lemon dressing', 229, null, 'images/Tabouleh.png', '[]', 80),
  ('sloKC', 'Solo', 'Kabsa Chicken', 'Charcoal-grilled quarter chicken, served with tomato chutney', 260, null, 'images/Kabsa_Chk.png', '[]', 90),
  ('sloKB', 'Solo', 'Kabsa Beef', 'Tender beef chunks, served with tomato chutney', 350, null, 'images/Kabsa_Bf.png', '[]', 100),
  ('sloCB', 'Solo', 'Chicken Biryani', 'Served with yogurt salad (raita)', 290, null, 'images/Chk_Biryani.png', '[]', 110),
  ('sloGHC', 'Solo', 'Grilled Half Chicken', 'Charcoal-grilled half chicken with Arabic bread and fries platter, served with garlic paste and BBQ sauce', 375, 'Fan favorite', 'images/GrilledChk_hf.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]}]', 120),
  ('sloBKR', 'Solo', 'Beef Kebab with Rice', 'Choose between 1 or 2 piece kebabs', 195, null, 'images/Bf_Kebab.png', '[{"label":"Kebab count","choices":[{"name":"1 piece","add":0},{"name":"2 pieces","add":95}]}]', 130),
  ('sloCKR', 'Solo', 'Chicken Kebab with Rice', 'Choose between 1 or 2 piece kebabs', 170, null, 'images/Chk_Kebab.png', '[{"label":"Kebab count","choices":[{"name":"1 piece","add":0},{"name":"2 pieces","add":70}]}]', 140),
  ('ChkW', 'Fried', 'Chicken Wings', 'Crispy chicken wings with fries, served with BBQ sauce · 6 pcs / 12 pcs', 180, null, 'images/Chk_Wings.png', '[{"label":"Wings count","choices":[{"name":"6 pcs","add":0},{"name":"12 pcs","add":110}]}]', 150),
  ('Falafel', 'Fried', 'Fried Falafel', '6 pcs, served with tzatziki sauce', 150, null, 'images/Falafel.png', '[]', 160),
  ('FFries', 'Fried', 'Fries Platter', 'Served with BBQ sauce', 150, null, 'images/Fries_Pltr.png', '[]', 170),
  ('BKS', 'Wraps', 'Beef Kebab Shawarma', '', 150, null, 'images/Bf_Kbb_Shwrma.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]}]', 180),
  ('CSma', 'Wraps', 'Chicken Shawarma', '', 135, null, 'images/Chk_Shwrma.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]}]', 190),
  ('CKS', 'Wraps', 'Chicken Kebab Shawarma', '', 130, null, 'images/Chk_Kbb_Shwrma.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]}]', 200),
  ('FLW', 'Wraps', 'Falafel Wrap', '', 130, null, 'images/Falafel_Shwrma.png', '[{"label":"Spice level","choices":[{"name":"Mild","add":0},{"name":"Spicy","add":0},{"name":"Extra spicy","add":0}]}]', 210),
  ('BTR_Chk', 'AddOns', 'Buttered Chicken', '', 195, null, 'images/BTTR_Chk.png', '[]', 220),
  ('CHN_Msla', 'AddOns', 'Chana Masala', 'Served with 1 pc Arabic bread', 150, null, 'images/CHNA_MSLA.png', '[]', 230),
  ('Hms', 'AddOns', 'Hummus', '', 150, null, 'images/Hms.png', '[]', 240),
  ('Kbs_Rice', 'AddOns', 'Kabsa Rice', '', 170, null, 'images/Kabsa_Rice.png', '[]', 250),
  ('Wtr', 'Drinks', 'Water', '', 35, null, null, '[]', 260),
  ('Sfd', 'Drinks', 'Soda', '', 50, null, null, '[]', 270),
  ('S1', 'Sauces', 'Pickles', '', 30, null, 'images/pickles.png', '[]', 280),
  ('S2', 'Sauces', 'BBQ Sauce', '', 30, null, 'images/bbq.png', '[]', 290),
  ('S3', 'Sauces', 'Raita', 'yogurt salad', 30, null, 'images/raita.png', '[]', 300),
  ('S4', 'Sauces', 'Garlic Paste', '', 80, null, 'images/gpaste.png', '[]', 310),
  ('S5', 'Sauces', 'Tomato Chutney', '', 30, null, 'images/chutney.png', '[]', 320)
on conflict (id) do nothing;

-- Public bucket for menu photos uploaded from the admin site (staff only can upload).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('menu-images', 'menu-images', true, 5242880,
        array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = true, file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
drop policy if exists "staff upload menu images" on storage.objects;
drop policy if exists "staff update menu images" on storage.objects;
create policy "staff upload menu images" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu-images' and public.is_staff_admin());
create policy "staff update menu images" on storage.objects for update to authenticated
  using (bucket_id = 'menu-images' and public.is_staff_admin());

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
-- After the first admin exists, add everyone else from the admin site (Orders → 👥 Users).
-- That page needs the edge function supabase/functions/staff-users deployed with JWT verification off.
insert into public.staff (email, name, is_admin) values
  ('owner@example.com', 'Owner', true)
on conflict (email) do nothing;
