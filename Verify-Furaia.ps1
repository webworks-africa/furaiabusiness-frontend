$ErrorActionPreference = "Stop"
Set-Location -LiteralPath $PSScriptRoot
function Run-Npm {
    param([string[]]$Arguments)
    & npm.cmd @Arguments
    if ($LASTEXITCODE -ne 0) { throw ("npm failed: " + ($Arguments -join " ")) }
}
Run-Npm -Arguments @("ci")
Run-Npm -Arguments @("run", "check:identity-contract")
Run-Npm -Arguments @("run", "typecheck")
Run-Npm -Arguments @("run", "lint")
Run-Npm -Arguments @("test", "--", "--maxWorkers=1", "--no-file-parallelism")
npx.cmd playwright install chromium
if ($LASTEXITCODE -ne 0) { throw "Browser installation failed." }
Run-Npm -Arguments @("run", "test:e2e")
$previousMode = $env:VITE_API_MODE
try {
    $env:VITE_API_MODE = "real"
    Run-Npm -Arguments @("run", "build")
    Run-Npm -Arguments @("run", "check:release")
} finally {
    $env:VITE_API_MODE = $previousMode
}
