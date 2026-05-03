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


## Fotos demo

O pacote inclui 117 imagens em `public/demo-catalog`: 3 imagens para cada item demo.

Para automatizar o upload no Supabase, use:

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
node .\scripts\upload-demo-catalog-photos.mjs
```

O script usa o bucket `items` e grava os caminhos em `item_photos` como `demo-catalog/CODIGO-01.png`, `demo-catalog/CODIGO-02.png` e `demo-catalog/CODIGO-03.png`.


## Separação na listagem de itens

- Itens demo não devem aparecer em Rascunho/Em revisão, Disponível, Reservado ou Vendido.
- A aba Demo e a página `/admin/catalogo-demo` concentram os exemplos.
- Isso evita que voluntários confundam itens de treinamento com doações reais.

## Lembretes de pedidos pagos

- Quando um pedido passa para Pago, Entregue, Cancelado ou Expirado, lembretes pendentes ficam inativos.
- Eles podem continuar visíveis como histórico/agendamento, mas não são enviados automaticamente.

## Atualização de fotos por categoria

Para manter o catálogo demo com visual consistente, as fotos podem ser atualizadas categoria por categoria usando a pasta:

```text
public/demo-catalog-categories/<categoria>/<short_id>/<posição>.png
```

Exemplo:

```text
public/demo-catalog-categories/roupas/DRP01/01.png
public/demo-catalog-categories/roupas/DRP01/02.png
public/demo-catalog-categories/roupas/DRP01/03.png
```

Arquivos de apoio:

- `scripts/generate-demo-photo-manifest.mjs`: gera o manifesto CSV/JSON.
- `scripts/validate-demo-catalog-photos.mjs`: valida arquivos locais e, opcionalmente, registros no Supabase.
- `scripts/upload-demo-catalog-photos-by-category.mjs`: sobe as fotos por categoria e atualiza `item_photos`.
- `docs/demo-catalog-photos.md`: passo a passo operacional.
- `docs/demo-catalog-photo-prompts.md`: padrão visual e prompts por categoria.
