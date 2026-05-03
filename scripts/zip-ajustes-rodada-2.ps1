$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "ajustes-rodada-login-catalogo-pagamento.zip"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

$paths = @(
  "src/app/page.tsx",
  "src/app/catalogo/page.tsx",
  "src/app/login/page.tsx",
  "src/app/(public)/page.tsx",
  "src/app/(public)/catalogo/page.tsx",

  "src/app/pedido/page.tsx",
  "src/app/pedido/PedidoTrackingClient.tsx",

  "src/app/admin/layout.tsx",
  "src/app/admin/itens/page.tsx",
  "src/app/admin/pedidos/page.tsx",
  "src/app/admin/pedidos/[orderId]/page.tsx",
  "src/app/admin/pedidos/[orderId]/actions.ts",
  "src/app/admin/relatorio/page.tsx",
  "src/app/admin/catalogo-demo/page.tsx",
  "src/app/admin/etiquetas/lote/page.tsx",
  "src/app/admin/manual/page.tsx",

  "src/app/api/public/orders/upload-payment-proof/route.ts",
  "src/app/api/admin/orders/[orderId]/confirm-payment/route.ts",
  "src/app/api/admin/orders/[orderId]/payment/route.ts",

  "src/components/PublicHeader.tsx",
  "src/components/Header.tsx",
  "src/components/HomeHero.tsx",
  "src/components/CatalogHero.tsx",
  "src/components/CatalogCategories.tsx",
  "src/components/CategoryTabs.tsx",
  "src/components/CatalogFilters.tsx",
  "src/components/PaymentProofUpload.tsx",
  "src/components/AdminNavPills.tsx",
  "src/components/AdminHeader.tsx",
  "src/components/AdminMenu.tsx",
  "src/components/AdminSidebar.tsx",
  "src/components/admin/OrderActions.tsx",
  "src/components/admin/OrderPaymentCard.tsx",

  "src/lib/catalog.ts",
  "src/lib/catalog-public.ts",
  "src/lib/catalog-categories.ts",
  "src/lib/demo-catalog.ts",
  "src/lib/payment-proof.ts",
  "src/lib/order-notifications.ts",
  "src/lib/order-email.ts",
  "src/lib/email.ts",
  "src/lib/mailer.ts",
  "src/lib/notifications.ts",
  "src/lib/orders.ts",
  "src/lib/admin-help.ts",

  "docs/catalogo-demo-bazar.md",
  "docs/manual-operacional.md",
  "docs/fluxo-pedidos.md"
)

$existingFiles = @()
$missingFiles = @()

foreach ($path in $paths) {
  if (Test-Path $path) {
    $existingFiles += (Resolve-Path $path).Path
  } else {
    $missingFiles += $path
  }
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

if ($existingFiles.Count -eq 0) {
  Write-Host ""
  Write-Host "Nenhum dos arquivos listados foi encontrado." -ForegroundColor Red
  Write-Host "Confira se você está na raiz do projeto." -ForegroundColor Yellow
  exit 1
}

Compress-Archive -Path $existingFiles -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Cyan

Write-Host ""
Write-Host "Arquivos incluídos:" -ForegroundColor Green
$existingFiles | ForEach-Object { Write-Host " - $($_)" }

Write-Host ""
Write-Host "Arquivos não encontrados ou opcionais:" -ForegroundColor Yellow
if ($missingFiles.Count -eq 0) {
  Write-Host " - Nenhum"
} else {
  $missingFiles | ForEach-Object { Write-Host " - $($_)" }
}