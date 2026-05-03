-- Corrige lembretes de pedidos para usar a regra oficial:
-- 8h  = created_at + 8 horas
-- 16h = created_at + 16 horas
--
-- Esta migration é idempotente e segura para rodar mesmo que ainda não existam pedidos.

do $$
begin
  if to_regclass('public.orders') is not null
     and to_regclass('public.order_reminders') is not null then

    update public.order_reminders r
       set due_at = o.created_at + interval '8 hours'
      from public.orders o
     where r.order_id = o.id
       and r.kind = 'remind_8h'
       and o.created_at is not null;

    update public.order_reminders r
       set due_at = o.created_at + interval '16 hours'
      from public.orders o
     where r.order_id = o.id
       and r.kind = 'remind_16h'
       and o.created_at is not null;
  end if;
end $$;
