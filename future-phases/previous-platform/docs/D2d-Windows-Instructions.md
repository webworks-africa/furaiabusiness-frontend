# Apply D2d to the v0.5.0 source baseline

Stop every dashboard dev server with Ctrl+C BEFORE applying the update or npm ci. Do not update with Vite still running: Windows may lock LightningCSS. The installer checks all changed file hashes before applying and makes a sibling backup; it stops on unexpected local edits.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2d_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D2d_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D2d_Update\Apply-D2d.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
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

Expected v0.6.0:61 executable operations,85 API/component tests,32 browser tests,3 production builds and mock-exclusion. Dependency versions unchanged; reuse installed Chromium. If installation fails, stop there. Missing vite/tsc commands after an interrupted npm ci mean installation must be repaired, not global tools installed. build:check is valid only after a successful current build.

Open http://127.0.0.1:5173/ops using operator@staff.sandbox and challenge246810. Customers shows masked records, history, consent and account links. Onboarding reviews shows scan status, requirements/policy/history; only CLEAN evidence with permission has an open link. Quarantine is blocked by the endpoint too. Filters and scope change should preserve boundaries. Mock sessions reset on reload; sign in again. Privileged action forms remain D5; real integration and staging pending.
