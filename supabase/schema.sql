-- QR Menu — database schema
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> paste -> Run

-- ============ TABLES ============

create table public.restaurants (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  slug text not null unique,
  phone text,
  address text,
  currency text not null default 'Rs.',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.menu_items (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  category_id uuid not null references public.categories (id) on delete cascade,
  name text not null,
  description text,
  price numeric(10,2) not null default 0,
  image_url text,
  is_available boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  table_id uuid references public.tables (id) on delete set null,
  table_name text,
  customer_name text,
  note text,
  status text not null default 'pending'
    check (status in ('pending', 'preparing', 'ready', 'served', 'cancelled')),
  total numeric(10,2) not null default 0,
  handled_by text,
  created_at timestamptz not null default now()
);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  menu_item_id uuid references public.menu_items (id) on delete set null,
  item_name text not null,
  item_price numeric(10,2) not null,
  quantity int not null default 1
);

create index orders_restaurant_created_idx on public.orders (restaurant_id, created_at desc);
create index menu_items_restaurant_idx on public.menu_items (restaurant_id);
create index categories_restaurant_idx on public.categories (restaurant_id);
create index tables_restaurant_idx on public.tables (restaurant_id);
create index order_items_order_idx on public.order_items (order_id);

-- ============ ROW LEVEL SECURITY ============

alter table public.restaurants enable row level security;
alter table public.tables enable row level security;
alter table public.categories enable row level security;
alter table public.menu_items enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

create or replace function public.is_owner(rid uuid)
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.restaurants where id = rid and owner_id = auth.uid());
$$;

create policy "public read active restaurants" on public.restaurants
  for select using (is_active or owner_id = auth.uid());
create policy "owner insert restaurant" on public.restaurants
  for insert with check (owner_id = auth.uid());
create policy "owner update restaurant" on public.restaurants
  for update using (owner_id = auth.uid());
create policy "owner delete restaurant" on public.restaurants
  for delete using (owner_id = auth.uid());

create policy "public read tables" on public.tables for select using (true);
create policy "owner write tables" on public.tables
  for all using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

create policy "public read categories" on public.categories for select using (true);
create policy "owner write categories" on public.categories
  for all using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

create policy "public read menu_items" on public.menu_items for select using (true);
create policy "owner write menu_items" on public.menu_items
  for all using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

create policy "public insert orders" on public.orders for insert with check (status = 'pending');
create policy "public read orders" on public.orders for select using (true);
create policy "owner update orders" on public.orders for update using (public.is_owner(restaurant_id));

create policy "public insert order_items" on public.order_items for insert with check (true);
create policy "public read order_items" on public.order_items for select using (true);

-- ============ STAFF (waiter/kitchen accounts, PIN-based) ============
create table public.staff (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants (id) on delete cascade,
  name text not null,
  pin text not null,
  role text not null default 'waiter' check (role in ('waiter', 'kitchen', 'manager')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
create index staff_restaurant_idx on public.staff (restaurant_id);
alter table public.staff enable row level security;
create policy "owner all staff" on public.staff
  for all using (public.is_owner(restaurant_id)) with check (public.is_owner(restaurant_id));

alter table public.restaurants add column if not exists manager_pin text;

-- ============ PLATFORM OPERATOR (admin panel + billing) ============
create table public.platform_admins (
  user_id uuid primary key references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.platform_admins enable row level security;
create policy "self read admin" on public.platform_admins
  for select using (user_id = auth.uid());

create or replace function public.is_platform_admin()
returns boolean language sql security definer stable as $$
  select exists (select 1 from public.platform_admins where user_id = auth.uid());
$$;

create table public.billing (
  restaurant_id uuid primary key references public.restaurants (id) on delete cascade,
  monthly_fee numeric(10,2) not null default 1500,
  trial_ends_at date,
  last_paid_at date,
  note text,
  updated_at timestamptz not null default now()
);
alter table public.billing enable row level security;
create policy "admin all billing" on public.billing
  for all using (public.is_platform_admin()) with check (public.is_platform_admin());

create policy "admin read restaurants" on public.restaurants
  for select using (public.is_platform_admin());
create policy "admin update restaurants" on public.restaurants
  for update using (public.is_platform_admin());

-- Auto-grant platform admin to the operator's email on signup.
-- CHANGE THIS EMAIL when deploying your own instance.
create or replace function public.grant_operator_admin()
returns trigger language plpgsql security definer as $$
begin
  if new.email = 'baralsamir941@gmail.com' then
    insert into public.platform_admins (user_id) values (new.id)
    on conflict do nothing;
  end if;
  return new;
end;
$$;
create trigger grant_operator_admin_trigger
  after insert on auth.users
  for each row execute function public.grant_operator_admin();

-- ============ REALTIME ============
alter publication supabase_realtime add table public.orders;

-- ============ STORAGE (menu item photos) ============
insert into storage.buckets (id, name, public)
values ('menu-images', 'menu-images', true)
on conflict (id) do nothing;

create policy "public read menu images" on storage.objects
  for select using (bucket_id = 'menu-images');
create policy "auth upload menu images" on storage.objects
  for insert to authenticated with check (bucket_id = 'menu-images');
create policy "auth update menu images" on storage.objects
  for update to authenticated using (bucket_id = 'menu-images');
create policy "auth delete menu images" on storage.objects
  for delete to authenticated using (bucket_id = 'menu-images');
