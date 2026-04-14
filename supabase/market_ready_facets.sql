-- Rode no Supabase SQL Editor (uma vez) caso ainda não existam as colunas:
alter table public.items add column if not exists location_box text;
alter table public.items add column if not exists notes_internal text;
alter table public.items add column if not exists gender text;
alter table public.items add column if not exists age_group text;
alter table public.items add column if not exists season text;
alter table public.items add column if not exists size_type text;
alter table public.items add column if not exists size_value text;
