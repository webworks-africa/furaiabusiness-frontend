# Apply D2g to the v0.8.0 D2f source baseline

Stop all Furaia dev servers with Ctrl+C BEFORE applying an update or running npm ci. Windows can lock the LightningCSS native module while Vite runs. This guarded update requires the preceding D2f source or already-updated target hashes; it stops before copying any file if it finds unexpected local edits. It creates a sibling backup. It does not delete your source, lockfile or configuration.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2g_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D2g_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D2g_Update\Apply-D2g.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
if ($LASTEXITCODE -ne 0) { throw "Update failed. Stop here and share the output." }
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

Expected v0.9.0:84 executable API operations,151 page/endpoint dependencies,130 API/component tests,48 browser journeys,3 production builds and production mock-exclusion. Dependency versions unchanged; reuse your installed Playwright Chromium. If Chromium is missing, run npx playwright install chromium before test:e2e. Missing vite/tsc after a failed npm ci means installation needs repair; do not install global substitutes. build:check must follow a successful current build; old dist output is not a current pass.

Open http://127.0.0.1:5173/ops. Mock identifier: operator@staff.sandbox. Challenge:246810. Leave the terminal running. Review separate KES/USD account positions, active holds, operation state queues, latest reconciliation versions, gate age, scoped outbox lag/events and alert transport/acknowledgement evidence. Filters are URL-driven. Entity is the Active scope selector. Date/provider constrain operations/outbox and reconciliation; balances/holds remain point-in-time and controls remain entity-wide, as labeled. Source timestamps are deliberately historical; Refresh workspace never invents new accounting data. Full browser reload resets in-memory simulator identity; sign in again. Real backend will use secure server-managed sessions.

The outbox diagnostic list/detail belongs to O01, not an invented64th primary page. Incident case details and privileged retry/configuration workflows remain D5. Customer/partner homepages are still their existing foundation. All63 pages remain the delivery objective. This batch is frontend-complete for its read slice against mocks; real Laravel integration, staging and Windows verification of this delivery remain pending.

If your project is older than D2f, use the full-source ZIP in a new directory rather than forcing this patch over an unknown version. It contains a complete furaia-frontend folder plus an all-history Git bundle. Preserve your existing directory and any private local configuration. Example:

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2g_Source.zip" -DestinationPath "$env:USERPROFILE\furaia_d2g_clean" -Force
Set-Location "$env:USERPROFILE\furaia_d2g_clean\furaia-frontend"
npm ci --include=dev
if ($LASTEXITCODE -ne 0) { throw "Installation failed. Stop here." }
npm run dev:ops
```

Development entry commands: npm run dev:ops, npm run dev:customer, npm run dev:partner. Use separate PowerShell terminals and the Local URLs Vite prints. Account Holder identifier customer@customer.sandbox, Partner identifier developer@partner.sandbox, each challenge246810. Local ports5173/5174/5175 are specified in the workspace scripts.
