# Fotos do catálogo demo por categoria

Este fluxo permite atualizar as imagens do catálogo demo categoria por categoria, mantendo rastreabilidade entre item, posição da foto, arquivo local e caminho no Supabase Storage.

## Estrutura recomendada

```text
public/demo-catalog-categories/
  roupas/
    DRP01/
      01.png
      02.png
      03.png
  calcados/
    DCA01/
      01.png
      02.png
      03.png
```

## Categorias

| Categoria | Prefixo | Itens | Fotos |
|---|---:|---:|---:|
| Roupas | DRP | 7 | 21 |
| Calçados | DCA | 5 | 15 |
| Acessórios | DAC | 7 | 21 |
| Casa | DCS | 6 | 18 |
| Brinquedos | DBR | 5 | 15 |
| Artesanatos | DAR | 5 | 15 |
| Outros | DOT | 4 | 12 |
| **Total** |  | **39** | **117** |

## Variáveis necessárias

```powershell
$env:NEXT_PUBLIC_SUPABASE_URL="https://SEU-PROJETO.supabase.co"
$env:SUPABASE_SERVICE_ROLE_KEY="SUA_SERVICE_ROLE_KEY"
$env:DEMO_PHOTOS_BUCKET="items"
```

Use `SUPABASE_SERVICE_ROLE_KEY` ou `SUPABASE_SECRET_KEY`. Não use anon/publishable key para upload e gravação em `item_photos`.

## Comandos

Gerar manifesto completo:

```powershell
node .\scripts\generate-demo-photo-manifest.mjs --category=all
```

Gerar manifesto de uma categoria:

```powershell
node .\scripts\generate-demo-photo-manifest.mjs --category=roupas
```

Validar arquivos locais:

```powershell
node .\scripts\validate-demo-catalog-photos.mjs --category=roupas
```

Validar também no Supabase:

```powershell
node .\scripts\validate-demo-catalog-photos.mjs --category=roupas --remote
```

Simular upload:

```powershell
node .\scripts\upload-demo-catalog-photos-by-category.mjs --category=roupas --dry-run
```

Subir uma categoria:

```powershell
node .\scripts\upload-demo-catalog-photos-by-category.mjs --category=roupas
```

Subir todas as categorias:

```powershell
node .\scripts\upload-demo-catalog-photos-by-category.mjs --all
```

## Estratégia recomendada

1. Atualize as imagens da pasta da categoria, por exemplo `public/demo-catalog-categories/roupas`.
2. Rode a validação local.
3. Rode o upload com `--dry-run`.
4. Rode o upload real.
5. Valide o catálogo demo no admin.
6. Repita para a próxima categoria.
