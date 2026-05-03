-- Bazar do Sementinha - Catálogo demo interno e impressão de etiquetas em lote
-- Rode antes de criar o seed demo.

alter table public.items
  add column if not exists is_demo boolean not null default false,
  add column if not exists demo_group text,
  add column if not exists demo_sort integer,
  add column if not exists visibility text not null default 'public';

create index if not exists idx_items_is_demo on public.items(is_demo);
create index if not exists idx_items_visibility on public.items(visibility);
create index if not exists idx_items_demo_group on public.items(demo_group);
create index if not exists idx_items_demo_sort on public.items(demo_sort);

update public.items
set is_demo = false,
    visibility = coalesce(nullif(visibility, ''), 'public')
where is_demo is null or visibility is null or visibility = '';

update public.items
set status = 'review',
    review_status = 'demo',
    visibility = 'admin_demo'
where is_demo = true;
