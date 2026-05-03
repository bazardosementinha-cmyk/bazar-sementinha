$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "ajustes-home-lembretes-teste.zip"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$paths = @(
  # Home / público
  "src/app/page.tsx",
  "src/app/login/page.tsx",
  "src/components/PublicImpactBanner.tsx",
  "src/components/PublicHowItWorks.tsx",
  "src/components/PublicHeader.tsx",
  "src/components/Header.tsx",
  "src/components/SiteHeader.tsx",
  "src/components/AppHeader.tsx",
  "src/components/Nav.tsx",
  "src/lib/public-copy.ts",

  # Admin pedido / lembretes
  "src/app/admin/pedidos/[orderId]/page.tsx",
  "src/app/api/admin/orders/[orderId]/route.ts",
  "src/app/api/admin/orders/[orderId]/reminders/route.ts",
  "src/app/api/admin/reminders/route.ts",
  "src/app/api/cron/process-order-notifications/route.ts",
  "src/app/api/cron/send-reminders/route.ts",

  # Libs lembretes/e-mail
  "src/lib/order-notifications.ts",
  "src/lib/order-reminders.ts",
  "src/lib/order-notification-jobs.ts",
  "src/lib/mail.ts",
  "src/lib/email-config.ts",
  "src/lib/email.ts",
  "src/lib/mailer.ts",
  "src/lib/order-email.ts",
  "src/lib/notifications.ts",

  # Manual / ajuda, se existirem
  "src/lib/admin-help.ts",
  "src/app/admin/manual/page.tsx",

  # Configuração
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

if ($existingFiles.Count -eq 0) {
  Write-Host ""
  Write-Host "Nenhum dos arquivos listados foi encontrado." -ForegroundColor Red
  Write-Host "Confira se voce esta na raiz do projeto." -ForegroundColor Yellow
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