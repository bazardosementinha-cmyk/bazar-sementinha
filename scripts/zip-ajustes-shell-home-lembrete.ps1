$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "ajustes-shell-home-lembrete.zip"

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
  "src/components/PublicImpactBanner.tsx",
  "src/components/PublicHowItWorks.tsx",
  "src/lib/public-copy.ts",

  # Admin pedido / teste lembrete
  "src/app/admin/pedidos/[orderId]/page.tsx",
  "src/app/api/admin/orders/[orderId]/route.ts",
  "src/app/api/admin/orders/[orderId]/test-reminder/route.ts",

  # Libs de e-mail e notificações
  "src/lib/order-notifications.ts",
  "src/lib/order-reminders.ts",
  "src/lib/order-notification-jobs.ts",
  "src/lib/mail.ts",
  "src/lib/email-config.ts",

  # Rotas opcionais de lembretes/cron
  "src/app/api/cron/process-order-notifications/route.ts",
  "src/app/api/cron/send-reminders/route.ts",
  "src/app/api/admin/reminders/route.ts",
  "src/app/api/admin/orders/[orderId]/reminders/route.ts",

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