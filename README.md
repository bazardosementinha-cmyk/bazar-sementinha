# Bazar do Sementinha (MVP - Opção B)

Este projeto é um MVP para:
- Catálogo público com página de item (`/` e `/i/[shortId]`)
- Admin com login (Supabase Auth) e telas:
  - Importar (assistido) `/admin/importar`
  - Itens / status `/admin/itens`
  - Relatório `/admin/relatorio`
  - QR `/admin/qr/[shortId]`

## Rodar localmente
1. `npm install`
2. Crie `.env.local` com:
   - NEXT_PUBLIC_SUPABASE_URL
   - NEXT_PUBLIC_SUPABASE_ANON_KEY
   - SUPABASE_SERVICE_ROLE_KEY
   - (opcional) NEXT_PUBLIC_SITE_URL=http://localhost:3000
3. `npm run dev`

## Supabase (setup)
Use o arquivo `supabase/setup.sql` no SQL Editor do Supabase.
Depois:
- Storage: crie bucket `items` (privado).
- Auth: crie usuário admin (email/senha) e insira em `profiles` com role='admin'.

