$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
if (!(Test-Path "package-lock.json")) { throw "The complete project must be extracted first." }
if (!(Get-Command npm.cmd -ErrorAction SilentlyContinue)) { throw "Install Node.js 22.12+ and reopen PowerShell." }
npm.cmd ci --include=dev
if ($LASTEXITCODE -ne 0) { throw "Dependency installation failed." }
if (!(Test-Path ".env.local")) { Copy-Item .env.example .env.local }
Write-Host "Open http://localhost:5180/login. Development identities are in README.md."
npm.cmd run dev -- --port 5180
if ($LASTEXITCODE -ne 0) { throw "Furaia could not start. Check the error above." }
