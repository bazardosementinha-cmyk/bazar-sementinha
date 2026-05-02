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
  end if;
end $$;

commit;
