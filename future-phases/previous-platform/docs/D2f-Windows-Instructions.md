# Apply D2f to the v0.7.0 source baseline

Stop every dashboard dev server with Ctrl+C BEFORE applying the update or npm ci. Do not update with Vite still running: Windows may lock LightningCSS. The installer checks all changed file hashes before applying and makes a sibling backup; it stops on unexpected local edits.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2f_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D2f_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D2f_Update\Apply-D2f.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
if ($LASTEXITCODE -ne 0) { throw "Update failed. Stop here." }
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

Expected v0.8.0:81 executable operations,118 API/component tests,42 browser tests,3 production builds and mock-exclusion. Dependency versions unchanged; reuse installed Chromium. If installation fails, stop there. Missing vite/tsc commands after an interrupted npm ci mean installation must be repaired, not global tools installed. build:check is valid only after a successful current build.

Open http://127.0.0.1:5173/ops using operator@staff.sandbox and challenge246810. Review Audit trail (range8–32 VERIFIED;1–32 FAILED at7; full filtered CSV), Staff and access (scoped roles/MFA/history), Integrations (FAKE/SIMULATED vs EXTERNAL/NOT_CERTIFIED), Alerts and delivery (note-based acknowledgement, retained transport history), and Settings and governance (versioned own preferences, mandatory notices, stale money gate and policy procedures). Approval/incident/configuration workflows remain D5. Real integration/staging are unverified.
