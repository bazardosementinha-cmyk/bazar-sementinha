$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "ajustes-mobile-checkout.zip"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$paths = @(
  # Cabeçalho / home pública
  "src/components/Shell.tsx",
  "src/app/page.tsx",
  "src/lib/public-copy.ts",
  "src/components/PublicImpactBanner.tsx",
  "src/components/PublicHowItWorks.tsx",

  # Páginas de item, se existirem
  "src/app/item/[itemId]/page.tsx",
  "src/app/item/[slug]/page.tsx",
  "src/app/items/[itemId]/page.tsx",

  # Checkout / Pix / QR Code
  "src/app/checkout/page.tsx",
  "src/app/checkout/CheckoutClient.tsx",
  "src/app/api/checkout/create/route.ts",
  "src/components/PixPaymentBox.tsx",
  "src/components/PixQrCode.tsx",
  "src/lib/pix.ts",
  "src/lib/pix-brcode.ts",
  "src/lib/pix-code.ts",
  "src/lib/qrcode.ts",

  # Pedido público / comprovante
  "src/app/pedido/page.tsx",
  "src/app/pedido/PedidoTrackingClient.tsx",
  "src/app/api/public/orders/track/route.ts",
  "src/app/api/public/orders/upload-payment-proof/route.ts",
  "src/components/PaymentProofUpload.tsx",
  "src/lib/payment-proof.ts",

  # Estilos/configuração
  "src/app/globals.css",
  "tailwind.config.ts",
  "package.json",
  "package-lock.json",
  ".env.example",

  # Manual / ajuda
  "src/lib/admin-help.ts",
  "src/app/admin/manual/page.tsx",
  "docs/checkout-pix-comprovante.md",
  "docs/catalogo-demo-bazar.md"
)

$existingFiles = @()
$missingFiles = @()

foreach ($path in $paths) {
  if (Test-Path -LiteralPath $path) {
    $existingFiles += (Resolve-Path -LiteralPath $path).Path
  } else {
    $missingFiles += $path
  }
}

if ($existingFiles.Count -eq 0) {
  Write-Host ""
  Write-Host "Nenhum arquivo encontrado. Confira se voce esta na raiz do projeto." -ForegroundColor Red
  exit 1
}

Compress-Archive -Path $existingFiles -DestinationPath $zipPath -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso:" -ForegroundColor Green
Write-Host $zipPath -ForegroundColor Cyan

Write-Host ""
Write-Host "Arquivos incluidos:" -ForegroundColor Green
$existingFiles | ForEach-Object { Write-Host " - $($_)" }

Write-Host ""
Write-Host "Arquivos nao encontrados ou opcionais:" -ForegroundColor Yellow
if ($missingFiles.Count -eq 0) {
  Write-Host " - Nenhum"
} else {
  $missingFiles | ForEach-Object { Write-Host " - $($_)" }
}