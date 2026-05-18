$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "ajuste-checkout-pix-comprovante.zip"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$paths = @(
  # Checkout / criação do pedido
  "src/app/checkout/page.tsx",
  "src/app/checkout/CheckoutClient.tsx",
  "src/app/api/checkout/create/route.ts",
  "src/app/api/checkout/route.ts",
  "src/app/api/public/orders/route.ts",

  # Pedido público / comprovante
  "src/app/pedido/page.tsx",
  "src/app/pedido/PedidoTrackingClient.tsx",
  "src/app/api/public/orders/track/route.ts",
  "src/app/api/public/orders/upload-payment-proof/route.ts",
  "src/components/PaymentProofUpload.tsx",
  "src/lib/payment-proof.ts",

  # Admin pedido
  "src/app/admin/pedidos/page.tsx",
  "src/app/admin/pedidos/[orderId]/page.tsx",
  "src/app/api/admin/orders/[orderId]/route.ts",
  "src/app/api/admin/orders/[orderId]/confirm-payment/route.ts",
  "src/app/api/admin/orders/[orderId]/payment/route.ts",

  # E-mails
  "src/lib/order-notifications.ts",
  "src/lib/mail.ts",
  "src/lib/email-config.ts",

  # Pix / QR Code, se existirem
  "src/lib/pix.ts",
  "src/lib/pix-code.ts",
  "src/lib/pix-brcode.ts",
  "src/lib/qrcode.ts",
  "src/components/PixPaymentBox.tsx",
  "src/components/PixQrCode.tsx",

  # Lembretes / cron
  "src/lib/order-reminders.ts",
  "src/lib/order-notification-jobs.ts",
  "src/app/api/cron/process-order-notifications/route.ts",
  "src/app/api/cron/send-reminders/route.ts",
  "src/app/api/admin/reminders/route.ts",
  "src/app/api/admin/orders/[orderId]/reminders/route.ts",

  # Banco / Supabase
  "src/lib/db.ts",
  "src/lib/supabase/service.ts",
  "supabase/setup.sql",

  # Manual / ajuda
  "src/lib/admin-help.ts",
  "src/app/admin/manual/page.tsx",
  "docs/catalogo-demo-bazar.md",
  "docs/automacao-lembretes-pedidos.md",

  # Configuração
  "vercel.json",
  "package.json",
  "package-lock.json",
  "tsconfig.json",
  "next.config.js",
  "next.config.ts",
  ".env.example"
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

if (Test-Path -LiteralPath "supabase/migrations") {
  $existingFiles += (Resolve-Path -LiteralPath "supabase/migrations").Path
} else {
  $missingFiles += "supabase/migrations"
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