# gerar-zip-ajustes-reserva-lembretes-demo.ps1
# Gera ZIP com arquivos necessários para:
# 1) corrigir navegação do Catálogo Demo
# 2) melhorar itens reservados com pedido associado
# 3) bloquear ação de disponibilizar item já pago/com comprovante
# 4) sinalizar lembretes inativos em pedidos pagos/com comprovante
# 5) atualizar Manual e Ajuda do Processo
# Importante: NÃO copia .env.local.

$ErrorActionPreference = "Stop"

$OutputDir = "chatgpt-ajustes-reserva-lembretes-demo"
$ZipName = "arquivos-ajustes-reserva-lembretes-demo.zip"

Write-Host ""
Write-Host "======================================================"
Write-Host " Gerando ZIP - ajustes reserva, lembretes e demo"
Write-Host "======================================================"
Write-Host ""

if (Test-Path $OutputDir) {
    Write-Host "Removendo pasta temporaria anterior: $OutputDir"
    Remove-Item $OutputDir -Recurse -Force
}

if (Test-Path $ZipName) {
    Write-Host "Removendo ZIP anterior: $ZipName"
    Remove-Item $ZipName -Force
}

New-Item -ItemType Directory -Path $OutputDir | Out-Null

$Files = @(
    # Configuração
    "package.json",
    "package-lock.json",
    "tsconfig.json",
    "next.config.js",
    "next.config.ts",
    ".env.example",

    # Navegação/admin
    "src/app/admin/layout.tsx",
    "src/components/AdminNavPills.tsx",
    "src/components/AdminHeader.tsx",
    "src/components/AdminMenu.tsx",
    "src/components/AdminSidebar.tsx",
    "src/components/Header.tsx",
    "src/components/Nav.tsx",

    # Itens/admin
    "src/app/admin/itens/page.tsx",
    "src/app/api/admin/items/route.ts",
    "src/app/api/admin/update-item/route.ts",
    "src/app/api/admin/items/[itemId]/route.ts",
    "src/app/api/admin/items/[itemId]/status/route.ts",

    # Pedidos/admin
    "src/app/admin/pedidos/page.tsx",
    "src/app/admin/pedidos/[orderId]/page.tsx",
    "src/app/api/admin/orders/[orderId]/route.ts",
    "src/app/api/admin/orders/[orderId]/confirm-payment/route.ts",
    "src/app/api/admin/orders/[orderId]/payment/route.ts",

    # Lembretes e automação
    "src/lib/order-reminders.ts",
    "src/lib/order-notification-jobs.ts",
    "src/lib/order-notifications.ts",
    "src/app/api/admin/reminders/route.ts",
    "src/app/api/admin/orders/[orderId]/reminders/route.ts",
    "src/app/api/cron/process-order-notifications/route.ts",
    "src/app/api/cron/send-reminders/route.ts",

    # Comprovante / pedido público
    "src/app/pedido/PedidoTrackingClient.tsx",
    "src/app/api/public/orders/track/route.ts",
    "src/app/api/public/orders/upload-payment-proof/route.ts",
    "src/components/PaymentProofUpload.tsx",
    "src/lib/payment-proof.ts",

    # Libs gerais
    "src/lib/db.ts",
    "src/lib/order-links.ts",
    "src/lib/demo-catalog.ts",
    "src/lib/label-templates.ts",

    # Ajuda/manual
    "src/lib/admin-help.ts",
    "src/app/admin/manual/page.tsx",
    "src/components/ContextHelp.tsx",
    "src/components/AdminProcessFlow.tsx",
    "docs/catalogo-demo-bazar.md",

    # Banco
    "supabase/setup.sql",
    "supabase/seed_demo_catalog.sql"
)

$CopiedCount = 0
$MissingFiles = @()

foreach ($File in $Files) {
    if (Test-Path -LiteralPath $File) {
        $Destination = Join-Path $OutputDir $File
        $DestinationDir = Split-Path $Destination -Parent

        if (!(Test-Path $DestinationDir)) {
            New-Item -ItemType Directory -Path $DestinationDir -Force | Out-Null
        }

        Copy-Item -LiteralPath $File -Destination $Destination -Force
        Write-Host "OK   $File"
        $CopiedCount++
    } else {
        Write-Host "MISS $File"
        $MissingFiles += $File
    }
}

# Copia migrations, se existirem
if (Test-Path -LiteralPath "supabase/migrations") {
    $MigrationDest = Join-Path $OutputDir "supabase/migrations"
    New-Item -ItemType Directory -Path $MigrationDest -Force | Out-Null

    Get-ChildItem -LiteralPath "supabase/migrations" -Filter "*.sql" -File | ForEach-Object {
        Copy-Item -LiteralPath $_.FullName -Destination $MigrationDest -Force
        Write-Host "OK   supabase/migrations/$($_.Name)"
        $script:CopiedCount++
    }
} else {
    Write-Host "MISS supabase/migrations"
    $MissingFiles += "supabase/migrations"
}

Compress-Archive -Path "$OutputDir/*" -DestinationPath $ZipName -Force

Write-Host ""
Write-Host "======================================================"
Write-Host " ZIP gerado com sucesso"
Write-Host "======================================================"
Write-Host "Arquivo: $ZipName"
Write-Host "Arquivos copiados: $CopiedCount"
Write-Host ""

if ($MissingFiles.Count -gt 0) {
    Write-Host "Arquivos nao encontrados ou opcionais:"
    foreach ($Missing in $MissingFiles) {
        Write-Host "- $Missing"
    }
    Write-Host ""
}

Write-Host "Agora anexe aqui o arquivo:"
Write-Host $ZipName
Write-Host ""
Write-Host "Observacao: .env.local NAO foi incluido por seguranca."
Write-Host ""