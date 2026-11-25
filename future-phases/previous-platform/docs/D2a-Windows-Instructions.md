# Apply D2a to your verified v0.2.0 project

Close Vite development servers. Download Furaia_D2a_Update.zip into Downloads. Keep your current Node/npm versions.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D2a_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D2a_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D2a_Update\Apply-D2a.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
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

The installer verifies changed source hashes before any copies, accepts unchanged v0.2.0 or already-updated files, backs up replaced files in a sibling folder and refuses unexpected edits. No dependency version changes. Expected v0.3.0: 46 executable contract operations, 52 API/component tests, 19 browser tests, three production builds and mock-exclusion passed. Your installed Playwright Chromium can be reused.

Run each in its own PowerShell terminal:

```powershell
npm run dev:ops
```
```powershell
npm run dev:customer
```
```powershell
npm run dev:partner
```

Operations http://localhost:5173/ops: sign in with operator@staff.sandbox and 246810. Use Accounts and Transactions in the sidebar. Verify Next/Previous; currency/search/state filters; exact balance detail; linked transactions; UNKNOWN retained hold; entity switch removes the previous entity's details. The account and transaction read slice is frontend complete against mocks; O04/O05 primary pages remain partial until governed actions and related evidence are implemented. D2 continues with holds and journals. Actual Laravel integration and staging remain unverified.
