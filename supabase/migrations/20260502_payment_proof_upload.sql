-- Bazar do Sementinha - Upload de comprovante Pix no pedido
-- Fluxo seguro: Upload do comprovante -> payment_status=submitted -> admin confere -> status=paid/payment_status=confirmed.

alter table if exists public.orders add column if not exists payment_status text not null default 'awaiting_proof';
alter table if exists public.orders add column if not exists payment_proof_path text;
alter table if exists public.orders add column if not exists payment_proof_uploaded_at timestamptz;
alter table if exists public.orders add column if not exists payment_proof_mime_type text;
alter table if exists public.orders add column if not exists payment_proof_size_bytes integer;

create index if not exists idx_orders_payment_status on public.orders(payment_status);
create index if not exists idx_orders_payment_proof_uploaded_at on public.orders(payment_proof_uploaded_at desc);

-- Bucket privado para comprovantes. A aplicação usa service role para upload e URLs assinadas para visualização.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'payment-proofs',
  'payment-proofs',
  false,
  8388608,
  array['image/jpeg','image/png','image/webp','application/pdf']::text[]
)
on conflict (id) do update
set public = false,
    file_size_limit = 8388608,
    allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']::text[];
