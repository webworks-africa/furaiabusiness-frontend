# Apply D2e to the v0.6.0 source baseline

Stop every dashboard dev server with Ctrl+C BEFORE applying the update or npm ci. Do not update with Vite still running: Windows may lock LightningCSS. The installer checks all changed file hashes before applying and makes a sibling backup; it stops on unexpected local edits.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2e_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D2e_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D2e_Update\Apply-D2e.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
Set-Location C:\Users\user\furaia_frontend
npm ci --include=dev
if ($LASTEXITCODE -ne 0) { throw "Installation failed. Stop here." }
$checks = @("contracts:generate", "contracts:check", "typecheck", "lint", "test", "test:e2e", "build", "build:check")
foreach ($check in $checks) {
    npm run $check
    if ($LASTEXITCODE -ne 0) { throw "Failed: $check. Stop and share the output." }
}
npm run dev:ops
```

Expected v0.7.0:65 executable operations,102 API/component tests,36 browser tests,3 production builds and mock-exclusion. Dependency versions unchanged; reuse installed Chromium. If installation fails, stop there. Missing vite/tsc commands after an interrupted npm ci mean installation must be repaired, not global tools installed. build:check is valid only after a successful current build.

Open http://127.0.0.1:5173/ops using operator@staff.sandbox and challenge246810. Reconciliation runs shows immutable statement revisions, prior run and collection/payout observations. Reports and daily close shows per-currency totals, holds, UNKNOWN ageing and explicit blockers; Request close assessment cannot close a blocked day. Generate CSV requires a reason/code246810 and downloads exact minor-unit strings. Ledger and journals exports all matching filtered lines. Filters and scope change should preserve boundaries. Mock sessions reset on reload; sign in again. Privileged action forms remain D5; real integration and staging pending.
