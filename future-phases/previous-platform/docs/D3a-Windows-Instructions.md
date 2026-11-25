# Apply D3a to the v0.9.0 D2g source baseline

Stop all Furaia dev servers with Ctrl+C before applying this update or running npm ci. A running Vite process can lock LightningCSS on Windows. This installer checks every source hash before copying, accepts the D2g baseline or matching D3a target, and creates a sibling backup. Unexpected local edits stop the update before copying; preserve them instead of forcing the patch.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D3a_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D3a_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D3a_Update\Apply-D3a.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
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

Expected version0.10.0:98 executable API operations,89 paths,156 page/endpoint dependencies,148 API/component tests and55 browser journeys. Dependency versions are unchanged; reuse installed Playwright Chromium. If missing, run npx playwright install chromium before test:e2e. Never continue after failed installation/checks; build:check must follow the current successful three-app build. Old dist output does not verify the update.

Open http://127.0.0.1:5174/app/register and leave the terminal running. Use a synthetic email, accept the sandbox consent versions and verify contact with246810. Choose individual or business at registration; business verification requires its server-selected registration fields. Registration opens no account. Fill the verification draft with synthetic data and upload a synthetic PDF/JPEG/PNG under10MiB. Do not use real identity documents. Wait for CLEAN scan, review and confirm submission. The server simulator progresses to REVIEW then asks for an updated address; revise/save that address and resubmit. The second server review becomes VERIFIED. Choose an eligible account, read disclosures/terms, accept and confirm opening. The owned Accounts list/detail and workspace show the resulting zero-balance account. No deposit, transfer or production access is created.

Already-existing sandbox login: customer@customer.sandbox, challenge246810. A newly registered contact can also sign in with246810 while that simulator instance persists. All mock domain data, anonymous continuation and sessions reset on a full browser reload; use in-app navigation to retain workflows. Real integration must restore secure server-managed sessions and durable state. Staff and Partner remain independent origins/authentication contexts.

Opening retries preserve the original key and payload, including when a response is lost after creation. Do not start another opening while outcome is unconfirmed. Only an explicit POLICY_CONFLICT rejection before creation offers a new eligibility review; ambiguous failures retain the original request. Browser request metadata contains no identity files, raw document number or tokens. EICAR-marked synthetic uploads are quarantined by the simulator; this is not certified malware scanning or real KYC approval.

C01/C03/C04 are frontend-complete against mocks. C05/C06 contain owned overview/account reads; activity, profile and closure dependencies remain assigned to subsequent batches. Next D3b: recovery, statements/receipts and controlled closure requests. Real Laravel mappings, integration, staging and Windows checks for this update are pending. All63 pages remain the objective.

If source hashes differ, preserve your project and extract the complete source into a new directory:

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D3a_Source.zip" -DestinationPath "$env:USERPROFILE\furaia_d3a_clean" -Force
Set-Location "$env:USERPROFILE\furaia_d3a_clean\furaia-frontend"
npm ci --include=dev
if ($LASTEXITCODE -ne 0) { throw "Installation failed. Stop here." }
npm run dev:customer
```

The full source contains a Git bundle for history recovery. The commands npm run dev:ops, npm run dev:customer and npm run dev:partner serve separate apps on5173/5174/5175. Start each in a separate terminal after installation. Mock Operations operator@staff.sandbox and Partner developer@partner.sandbox both use246810. Check the project version with node -p "require('./package.json').version".
