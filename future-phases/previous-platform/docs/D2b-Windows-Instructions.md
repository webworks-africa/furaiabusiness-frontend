# Apply D2b to verified v0.3.0

Download Furaia_D2b_Update.zip into Downloads and close running Vite terminals. Keep the same Node/npm versions.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2b_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D2b_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D2b_Update\Apply-D2b.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
Set-Location C:\Users\user\furaia_frontend
npm ci
npm run contracts:generate
npm run contracts:check
npm run typecheck
npm run lint
npm run test
npm run test:e2e
npm run build
npm run build:check
```

The installer validates all update hashes before replacing files and creates a sibling backup folder. It stops on unexpected local edits. Expected v0.4.0:50 executable contract operations,63 API/component tests,23 browser tests,3 production builds and passing mock-exclusion. No dependency versions changed; Chromium can be reused.

Start Operations:

```powershell
npm run dev:ops
```

Open http://localhost:5173/ops, sign in with operator@staff.sandbox / 246810. Choose Holds or Ledger and journals. Verify UNKNOWN retained hold; captured hold opens matching journal; debit/credit totals; PT-15 maker/checker references; filters/pagination; scope change rejects previous detail. For other surfaces and URLs see Browser-Quick-Start.md. These are mock read slices; full page export/governed workflows, backend integration and staging remain pending.
