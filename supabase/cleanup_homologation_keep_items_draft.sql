<<<<<<< HEAD
-- Bazar do Sementinha - limpeza de homologação
-- Objetivo:
-- 1) apagar pedidos, itens de pedido, lembretes, reservas e clientes de teste;
-- 2) manter todos os itens cadastrados;
-- 3) voltar todos os itens para Rascunho/review.
--
-- Rode no Supabase SQL Editor apenas em ambiente de testes/homologação.

begin;

-- Apaga dados transacionais, respeitando dependências.
do $$
begin
  if to_regclass('public.order_reminders') is not null then
    delete from public.order_reminders;
  end if;

  if to_regclass('public.order_items') is not null then
    delete from public.order_items;
  end if;

  if to_regclass('public.orders') is not null then
    delete from public.orders;
  end if;

  if to_regclass('public.reservations') is not null then
    delete from public.reservations;
  end if;

  if to_regclass('public.customers') is not null then
    delete from public.customers;
  end if;
end $$;

-- Volta todos os itens para rascunho/review, sem apagar fotos nem cadastro dos itens.
update public.items
set
  status = 'review',
  review_status = case
    when exists (
      select 1
      from information_schema.columns
      where table_schema = 'public'
        and table_name = 'items'
        and column_name = 'review_status'
    ) then 'draft'
    else review_status
  end,
  qr_printed_at = null,
  tagged_at = null,
  reviewed_at = null,
  published_at = null,
  updated_at = now();

-- Limpa valores de venda, se essas colunas existirem.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'items' and column_name = 'sold_price'
  ) then
    execute 'update public.items set sold_price = null';
  end if;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'items' and column_name = 'sold_price_final'
  ) then
    execute 'update public.items set sold_price_final = null';
=======
-- Bazar do Sementinha
-- Limpeza de base de homologação/testes.
-- Objetivo:
--   1. Apagar pedidos, itens de pedido, lembretes, reservas e clientes de teste.
--   2. Manter os itens cadastrados.
--   3. Voltar todos os itens para Rascunho.
--
-- IMPORTANTE:
--   - Rode apenas em ambiente de homologação/testes.
--   - No banco, o status técnico de Rascunho é 'review'.
--   - Quando existir review_status, ele será ajustado para 'draft'.

begin;

do $$
begin
  if to_regclass('public.order_reminders') is not null then
    execute 'delete from public.order_reminders';
  end if;

  if to_regclass('public.order_items') is not null then
    execute 'delete from public.order_items';
  end if;

  if to_regclass('public.orders') is not null then
    execute 'delete from public.orders';
  end if;

  if to_regclass('public.reservations') is not null then
    execute 'delete from public.reservations';
  end if;

  if to_regclass('public.customers') is not null then
    execute 'delete from public.customers';
  end if;

  if to_regclass('public.items') is not null then
    execute 'update public.items set status = ''review'', updated_at = now()';

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'items' and column_name = 'review_status'
    ) then
      execute 'update public.items set review_status = ''draft'', updated_at = now()';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'items' and column_name = 'published_at'
    ) then
      execute 'update public.items set published_at = null, updated_at = now()';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'items' and column_name = 'sold_price'
    ) then
      execute 'update public.items set sold_price = null, updated_at = now()';
    end if;

    if exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'items' and column_name = 'sold_price_final'
    ) then
      execute 'update public.items set sold_price_final = null, updated_at = now()';
    end if;
>>>>>>> 0be516aabf45149be082ab932003a13a42f335d4
  end if;
end $$;

commit;
