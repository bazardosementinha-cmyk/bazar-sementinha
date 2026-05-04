$ErrorActionPreference = "Stop"

$projectRoot = Get-Location
$outDir = Join-Path $projectRoot "tmp"
$zipPath = Join-Path $outDir "fix-test-order-reminder-files.zip"

if (!(Test-Path $outDir)) {
  New-Item -ItemType Directory -Path $outDir | Out-Null
}

if (Test-Path $zipPath) {
  Remove-Item $zipPath -Force
}

$paths = @(
  # Endpoint novo de teste
  "src/app/api/admin/test-order-reminder/route.ts",

  # Endpoint antigo/dinâmico, se ainda existir
  "src/app/api/admin/orders/[orderId]/test-reminder/route.ts",

  # Rota principal de pedido admin, para comparar como busca por id/code
  "src/app/api/admin/orders/[orderId]/route.ts",

  # Tela admin do pedido, caso exista botão/ação de teste ou mensagens relacionadas
  "src/app/admin/pedidos/[orderId]/page.tsx",

  # Libs de e-mail/notificações usadas pelo lembrete
  "src/lib/order-notifications.ts",
  "src/lib/order-reminders.ts",
  "src/lib/mail.ts",
  "src/lib/email-config.ts",

  # Supabase helpers, se existirem
  "src/lib/supabase.ts",
  "src/lib/supabase/server.ts",
  "src/lib/supabase/service.ts",
  "src/lib/supabaseServer.ts",
  "src/lib/db.ts",

  # Auth/admin guard, se existirem
  "src/lib/auth.ts",
  "src/lib/authGuard.ts",
  "src/lib/admin-auth.ts",

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