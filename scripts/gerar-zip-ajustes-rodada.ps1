$ErrorActionPreference = "Stop"

# Nome do zip de saída
$zipName = "ajustes-rodada-admin-checkout.zip"

# Remover zip antigo, se existir
if (Test-Path $zipName) {
    Remove-Item $zipName -Force
}

# Lista de caminhos recomendados
$paths = @(
    "src/app/admin",
    "src/app/checkout",
    "src/app/pedido",
    "src/components",
    "src/lib/admin-help.ts",
    "docs/catalogo-demo-bazar.md"
)

# Filtrar apenas os caminhos que existirem
$existingPaths = @()
foreach ($path in $paths) {
    if (Test-Path $path) {
        $existingPaths += $path
    } else {
        Write-Host "Nao encontrado (ok se opcional): $path" -ForegroundColor Yellow
    }
}

if ($existingPaths.Count -eq 0) {
    throw "Nenhum arquivo/pasta encontrado para compactar."
}

Write-Host ""
Write-Host "Arquivos/pastas que entrarao no zip:" -ForegroundColor Cyan
$existingPaths | ForEach-Object { Write-Host " - $_" }

Write-Host ""
Write-Host "Gerando ZIP..." -ForegroundColor Cyan

Compress-Archive -Path $existingPaths -DestinationPath $zipName -Force

Write-Host ""
Write-Host "ZIP gerado com sucesso: $zipName" -ForegroundColor Green