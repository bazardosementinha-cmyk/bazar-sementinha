-- Bazar do Sementinha - automação de lembretes e cancelamento de pedidos.
-- Idempotente: pode rodar mais de uma vez.

create table if not exists public.order_reminders (
  order_id uuid not null references public.orders(id) on delete cascade,
  kind text not null,
  due_at timestamptz not null,
  sent_at timestamptz,
  send_result jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (order_id, kind)
);

alter table public.order_reminders add column if not exists sent_at timestamptz;
alter table public.order_reminders add column if not exists send_result jsonb;
alter table public.order_reminders add column if not exists created_at timestamptz not null default now();
alter table public.order_reminders add column if not exists updated_at timestamptz not null default now();

create index if not exists idx_order_reminders_due_pending
  on public.order_reminders (due_at)
  where sent_at is null;

create index if not exists idx_order_reminders_kind_due
  on public.order_reminders (kind, due_at);

create index if not exists idx_order_reminders_order
  on public.order_reminders (order_id);

alter table public.order_reminders enable row level security;

drop policy if exists "order_reminders_admin_all" on public.order_reminders;
create policy "order_reminders_admin_all"
on public.order_reminders for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

-- Gera lembretes faltantes para pedidos existentes ainda reservados.
insert into public.order_reminders (order_id, kind, due_at)
select o.id, 'remind_8h', o.created_at + interval '8 hours'
from public.orders o
where o.status = 'reserved'
  and coalesce(o.payment_status, 'awaiting_proof') not in ('submitted', 'confirmed', 'paid', 'payment_confirmed')
  and o.payment_proof_uploaded_at is null
on conflict (order_id, kind) do nothing;

insert into public.order_reminders (order_id, kind, due_at)
select o.id, 'remind_16h', o.created_at + interval '16 hours'
from public.orders o
where o.status = 'reserved'
  and coalesce(o.payment_status, 'awaiting_proof') not in ('submitted', 'confirmed', 'paid', 'payment_confirmed')
  and o.payment_proof_uploaded_at is null
on conflict (order_id, kind) do nothing;

insert into public.order_reminders (order_id, kind, due_at)
select o.id, 'cancel_24h', coalesce(o.pickup_deadline_at, o.expires_at)
from public.orders o
where o.status = 'reserved'
  and coalesce(o.payment_status, 'awaiting_proof') not in ('submitted', 'confirmed', 'paid', 'payment_confirmed')
  and o.payment_proof_uploaded_at is null
  and coalesce(o.pickup_deadline_at, o.expires_at) is not null
on conflict (order_id, kind) do nothing;
