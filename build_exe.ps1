# 打包为单个 exe（PyInstaller onefile + windowed）
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $root '.venv\Scripts\python.exe'
Set-Location $root

Write-Host "==> 开始打包..."
& $py -m PyInstaller --noconfirm --clean --onefile --windowed --name ProbStat `
  --paths "backend" `
  --add-data "frontend\dist;frontend\dist" `
  --add-data "backend\app\data;app\data" `
  --collect-all jieba `
  --collect-all webview `
  --collect-all uvicorn `
  --hidden-import sqlalchemy.dialects.sqlite `
  --hidden-import clr `
  --hidden-import pythonnet `
  --hidden-import webview.platforms.edgechromium `
  --hidden-import httptools `
  --hidden-import watchfiles `
  --hidden-import websockets `
  desktop.py
if ($LASTEXITCODE -ne 0) { Write-Host "打包失败"; exit 1 }

$exe = Join-Path $root 'dist\ProbStat.exe'
if (Test-Path $exe) {
  $sizeMB = [math]::Round((Get-Item $exe).Length / 1MB, 1)
  Write-Host "打包完成：dist\ProbStat.exe ($sizeMB MB)"
} else {
  Write-Host "未找到 exe"; exit 1
}