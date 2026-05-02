# Catálogo demo do Bazar Online do Sementinha

O catálogo demo é um conjunto de itens internos para apresentação aos coordenadores e treinamento dos voluntários.

## Regras principais

- Não aparece na home pública nem nas APIs públicas.
- Deve usar `is_demo = true` e `visibility = 'admin_demo'`.
- Deve permanecer em `status = 'review'` e `review_status = 'demo'`.
- Serve para demonstrar categorias, fotos ilustrativas, localização física e impressão de etiquetas em lote.

## Categorias contempladas

- Roupas — Etiqueta TAG
- Calçados — Etiqueta G
- Acessórios — Etiqueta SAQUINHO
- Casa — Etiqueta FRAGIL
- Brinquedos — Etiqueta M
- Artesanatos — Etiqueta M
- Outros — Etiqueta M

## Como usar

1. Aplicar a migration `20260502_demo_catalog_and_batch_labels.sql`.
2. Rodar `supabase/seed_demo_catalog.sql` ou usar o botão em `/admin/catalogo-demo`.
3. Abrir `/admin/catalogo-demo` para visualizar os exemplos.
4. Abrir `/admin/etiquetas/lote?demo=1` para demonstrar impressão em lote.
