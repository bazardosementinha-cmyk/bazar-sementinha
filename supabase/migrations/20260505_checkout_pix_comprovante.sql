-- Bazar do Sementinha - checkout com comprovante no fechamento.
-- Idempotente e seguro para rodar mais de uma vez.

alter table if exists public.orders add column if not exists payment_status text not null default 'awaiting_proof';
alter table if exists public.orders add column if not exists payment_proof_path text;
alter table if exists public.orders add column if not exists payment_proof_uploaded_at timestamptz;
alter table if exists public.orders add column if not exists payment_proof_mime_type text;
alter table if exists public.orders add column if not exists payment_proof_size_bytes bigint;
alter table if exists public.orders add column if not exists payment_plan text not null default 'pix_now';
alter table if exists public.orders add column if not exists deposit_required boolean not null default false;
alter table if exists public.orders add column if not exists deposit_amount numeric(10,2);
alter table if exists public.orders add column if not exists deposit_paid boolean not null default false;
alter table if exists public.orders add column if not exists pickup_deadline_at timestamptz;

do $$
begin
  if to_regclass('public.order_reminders') is not null then
    alter table public.order_reminders drop constraint if exists order_reminders_kind_check;
    alter table public.order_reminders
      add constraint order_reminders_kind_check
      check (kind in ('8h', '16h', 'remind_8h', 'remind_16h', 'cancel_24h'));

    create unique index if not exists ux_order_reminders_order_kind
      on public.order_reminders (order_id, kind);
  end if;
end $$;
