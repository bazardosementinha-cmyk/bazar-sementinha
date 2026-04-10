-- Bazar do Sementinha - Setup (MVP Opção B)
-- Rode tudo no Supabase SQL Editor.

-- 0) Extensões
create extension if not exists pgcrypto;

-- 1) Tipos
do $$ begin
  create type public.item_status as enum ('review','available','reserved','sold','donated','archived');
exception when duplicate_object then null;
end $$;

-- 2) Tabelas
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','viewer')),
  created_at timestamptz not null default now()
);

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  short_id text not null unique,
  title text not null,
  description text,
  category text not null,
  condition text not null,
  size text,
  price numeric(10,2) not null default 0,
  price_from numeric(10,2),
  status public.item_status not null default 'review',
  source text,
  source_url text,
  location_box text,
  notes_internal text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_items_status on public.items(status);
create index if not exists idx_items_created_at on public.items(created_at desc);

create table if not exists public.item_photos (
  id bigserial primary key,
  item_id uuid not null references public.items(id) on delete cascade,
  storage_path text not null,
  position int not null,
  created_at timestamptz not null default now(),
  unique(item_id, position)
);

create index if not exists idx_item_photos_item on public.item_photos(item_id);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.items(id) on delete cascade,
  customer_name text,
  contact text,
  status text not null default 'active' check (status in ('active','expired','converted')),
  expires_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

-- 3) Trigger updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

drop trigger if exists trg_items_updated_at on public.items;
create trigger trg_items_updated_at
before update on public.items
for each row execute function public.set_updated_at();

-- 4) Função is_admin
create or replace function public.is_admin()
returns boolean language sql stable as $$
  select exists (
    select 1 from public.profiles p
    where p.user_id = auth.uid() and p.role = 'admin'
  );
$$;

-- 5) RLS
alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.item_photos enable row level security;
alter table public.reservations enable row level security;

-- profiles: usuário vê o próprio perfil; admin vê tudo
drop policy if exists "profiles_select_self" on public.profiles;
create policy "profiles_select_self"
on public.profiles for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

drop policy if exists "profiles_admin_write" on public.profiles;
create policy "profiles_admin_write"
on public.profiles for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- items: público vê apenas itens publicados; admin vê tudo
drop policy if exists "items_public_select" on public.items;
create policy "items_public_select"
on public.items for select
to anon
using (status in ('available','reserved','sold'));

drop policy if exists "items_admin_select" on public.items;
create policy "items_admin_select"
on public.items for select
to authenticated
using (public.is_admin());

drop policy if exists "items_admin_write" on public.items;
create policy "items_admin_write"
on public.items for insert
to authenticated
with check (public.is_admin());

drop policy if exists "items_admin_update" on public.items;
create policy "items_admin_update"
on public.items for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "items_admin_delete" on public.items;
create policy "items_admin_delete"
on public.items for delete
to authenticated
using (public.is_admin());

-- item_photos: público só vê fotos de itens publicados; admin vê tudo e escreve
drop policy if exists "photos_public_select" on public.item_photos;
create policy "photos_public_select"
on public.item_photos for select
to anon
using (
  exists (
    select 1 from public.items i
    where i.id = item_photos.item_id
      and i.status in ('available','reserved','sold')
  )
);

drop policy if exists "photos_admin_select" on public.item_photos;
create policy "photos_admin_select"
on public.item_photos for select
to authenticated
using (public.is_admin());

drop policy if exists "photos_admin_write" on public.item_photos;
create policy "photos_admin_write"
on public.item_photos for insert
to authenticated
with check (public.is_admin());

drop policy if exists "photos_admin_update" on public.item_photos;
create policy "photos_admin_update"
on public.item_photos for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "photos_admin_delete" on public.item_photos;
create policy "photos_admin_delete"
on public.item_photos for delete
to authenticated
using (public.is_admin());

-- reservations: somente admin
drop policy if exists "reservations_admin_all" on public.reservations;
create policy "reservations_admin_all"
on public.reservations for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- 6) Storage policies (bucket items)
-- 6.1) Crie o bucket `items` no painel (Storage) como PRIVADO.
-- 6.2) Depois rode as policies abaixo.

-- IMPORTANTE: policies em storage.objects usam o schema "storage"
-- Permitir que admin (authenticated + is_admin()) faça upload/alteração/remoção
drop policy if exists "items_bucket_admin_select" on storage.objects;
create policy "items_bucket_admin_select"
on storage.objects for select
to authenticated
using (bucket_id = 'items' and public.is_admin());

drop policy if exists "items_bucket_admin_insert" on storage.objects;
create policy "items_bucket_admin_insert"
on storage.objects for insert
to authenticated
with check (bucket_id = 'items' and public.is_admin());

drop policy if exists "items_bucket_admin_update" on storage.objects;
create policy "items_bucket_admin_update"
on storage.objects for update
to authenticated
using (bucket_id = 'items' and public.is_admin())
with check (bucket_id = 'items' and public.is_admin());

drop policy if exists "items_bucket_admin_delete" on storage.objects;
create policy "items_bucket_admin_delete"
on storage.objects for delete
to authenticated
using (bucket_id = 'items' and public.is_admin());

-- Observação:
-- O catálogo público usa URLs assinadas geradas no backend (service role),
-- então não precisamos liberar leitura pública do bucket.
