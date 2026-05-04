$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "ajustes-prazo-email-cron.zip"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$paths = @(
  # E-mails, datas e lembretes
  "src/lib/order-notifications.ts",
  "src/lib/order-reminders.ts",
  "src/lib/order-notification-jobs.ts",
  "src/lib/mail.ts",
  "src/lib/email-config.ts",
  "src/lib/order-date.ts",
  "src/lib/order-dates.ts",
  "src/lib/date.ts",
  "src/lib/dates.ts",
  "src/lib/format-date.ts",
  "src/lib/timezone.ts",

  # Admin pedido
  "src/app/admin/pedidos/[orderId]/page.tsx",
  "src/app/api/admin/orders/[orderId]/route.ts",

  # Cron / reminders
  "src/app/api/cron/process-order-notifications/route.ts",
  "src/app/api/cron/send-reminders/route.ts",
  "src/app/api/admin/reminders/route.ts",
  "src/app/api/admin/orders/[orderId]/reminders/route.ts",

  # Supabase / banco
  "src/lib/db.ts",
  "src/lib/supabase/service.ts",
  "supabase/setup.sql",

  # Configuração
  "vercel.json",
  "package.json",
  "package-lock.json",
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