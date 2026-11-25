# Apply D3b1 to the v0.10.0 D3a source baseline

Stop all Furaia dev servers with Ctrl+C before applying this update or running npm ci. A running Vite process can lock LightningCSS on Windows. This installer checks every source hash before copying, accepts the D3a baseline or matching D3b1 target, and creates a sibling backup. Unexpected local edits stop the update before copying; preserve them instead of forcing the patch.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D3b1_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D3b1_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D3b1_Update\Apply-D3b1.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
if ($LASTEXITCODE -ne 0) { throw "Update failed. Stop here and share the output." }
Set-Location C:\Users\user\furaia_frontend
npm ci --include=dev
if ($LASTEXITCODE -ne 0) { throw "Installation failed. Stop here and share the output." }
$checks = @("contracts:generate", "contracts:check", "typecheck", "lint", "test", "test:e2e", "build", "build:check")
foreach ($check in $checks) {
    npm run $check
    if ($LASTEXITCODE -ne 0) { throw "Failed: $check. Stop and share the output." }
}
npm run dev:customer
```

Expected version0.11.0:109 executable API operations,99 paths,171 page/endpoint dependencies,167 API/component tests and61 browser journeys. Dependency versions are unchanged; reuse installed Playwright Chromium. If missing, run npx playwright install chromium before test:e2e. Stop after failed installation/checks. build:check must follow successful current builds; old dist output is not current evidence.

Open http://127.0.0.1:5174/app and leave the terminal running. Existing mock login customer@customer.sandbox/challenge246810. To open an account, complete the D3a identity workflow with synthetic fields/files: first review requests updated address, second revised submission is synthetically VERIFIED. Account detail now includes closure eligibility, reason/acknowledgement, reviewed immutable request, account-bound step-up with246810 and server-only PENDING_REVIEW→APPROVED/CLOSED or BLOCKED. Exact zero posted/held funds and no obligations are required; no balance/journal is changed. Existing requests and decision history remain inspectable. Ambiguous failures retain the same request; a definitive version/policy rejection allows explicit fresh eligibility review.

Recovery: sign out and choose Recover account access, or open /app/recovery. Enter the synthetic sign-in identifier and contact challenge246810. Contact proof does not itself restore access. Server review approves only a previously VERIFIED primary-context fixture; otherwise REVIEW_REQUIRED explains the assisted-review dependency. Review and complete approved recovery to revoke previous customer sessions and establish one new session. A lost response can retry the original completion; revoked/expired/replaced recovered sessions cannot be revived by replay. Recovery preserves current capabilities. /app/profile and the homepage show masked profile/contact and mandatory notices; optional consent/contact-change writes remain D3c.

Mock state resets on full reload; navigate within the app to retain it. Only synthetic files/details should be used. No real recovery assurance, legal closure policy, issuer approval, backend integration or staging verification is implied. C02/C05/C06/C13 remain partial where assisted recovery, activity, statements or profile writes depend on subsequent batches. All63 pages remain the objective. Next D3b2: statements/documents and scoped receipt downloads. Cards and homepage transaction summaries are accepted requirements under C05/C06/C07 for D4; see docs/cards-and-homepage.md. No issued cards are fabricated in this update.

This patch requires the v0.10.0 D3a source hashes. If still on v0.9.0, apply the previous D3a update first, or extract this full source into a fresh directory. Preserve your existing project and private configuration:

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D3b1_Source.zip" -DestinationPath "$env:USERPROFILE\furaia_d3b1_clean" -Force
Set-Location "$env:USERPROFILE\furaia_d3b1_clean\furaia-frontend"
npm ci --include=dev
if ($LASTEXITCODE -ne 0) { throw "Installation failed. Stop here." }
npm run dev:customer
```

The complete source includes an all-history Git bundle. Independent dev commands: npm run dev:ops, npm run dev:customer, npm run dev:partner (5173/5174/5175), each in a separate terminal after installation. Stop running Vite before npm ci to prevent the known Windows LightningCSS EPERM lock. Check version with node -p "require('./package.json').version". Local Linux checks are recorded in verification.md; actual Windows execution, real Laravel integration and staging remain pending.
