-- Bazar do Sementinha - Campos de classificação operacional, etiquetas e processo
-- Rode com Supabase CLI (supabase db push) ou cole no SQL Editor do Supabase.

alter table public.items add column if not exists gender text;
alter table public.items add column if not exists age_group text;
alter table public.items add column if not exists season text;
alter table public.items add column if not exists size_type text;
alter table public.items add column if not exists size_value text;

alter table public.items add column if not exists subcategory text;
alter table public.items add column if not exists item_type text;
alter table public.items add column if not exists brand text;
alter table public.items add column if not exists color text;
alter table public.items add column if not exists material text;
alter table public.items add column if not exists measurements text;
alter table public.items add column if not exists condition_notes text;

alter table public.items add column if not exists is_fragile boolean not null default false;
alter table public.items add column if not exists requires_measurement boolean not null default false;
alter table public.items add column if not exists label_template text not null default 'M';
alter table public.items add column if not exists review_status text not null default 'draft';
alter table public.items add column if not exists attributes_json jsonb not null default '{}'::jsonb;

alter table public.items add column if not exists qr_printed_at timestamptz;
alter table public.items add column if not exists tagged_at timestamptz;
alter table public.items add column if not exists reviewed_at timestamptz;
alter table public.items add column if not exists published_at timestamptz;

create index if not exists idx_items_category on public.items(category);
create index if not exists idx_items_item_type on public.items(item_type);
create index if not exists idx_items_label_template on public.items(label_template);
create index if not exists idx_items_review_status on public.items(review_status);
create index if not exists idx_items_is_fragile on public.items(is_fragile);
