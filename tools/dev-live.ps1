$ErrorActionPreference = "Stop"

Write-Host "Starting always-live stack..." -ForegroundColor Cyan
Write-Host "API   : http://localhost:5000" -ForegroundColor Green
Write-Host "UI    : http://localhost:5173/#/project" -ForegroundColor Green
Write-Host "Press Ctrl+C in each terminal to stop." -ForegroundColor Yellow

Start-Process pwsh -ArgumentList "-NoExit", "-Command", "dotnet watch run --project api/JoinListApi/JoinListApi.csproj"
Start-Process pwsh -ArgumentList "-NoExit", "-Command", "Set-Location ui; npm run dev"

Write-Host "Launched API watch + UI dev in separate terminals." -ForegroundColor Cyan
