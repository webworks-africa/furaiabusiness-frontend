# Apply D1b on Windows

Close any running Vite development servers. Download Furaia_D1b_Update.zip to Downloads. These commands target the existing project, whose files are directly in C:\Users\user\furaia_frontend.

```powershell
Expand-Archive "$env:USERPROFILE\Downloads\Furaia_D1b_Update.zip" -DestinationPath "$env:USERPROFILE\Downloads\Furaia_D1b_Update" -Force
powershell -NoProfile -ExecutionPolicy Bypass -File "$env:USERPROFILE\Downloads\Furaia_D1b_Update\Apply-D1b.ps1" -ProjectPath "C:\Users\user\furaia_frontend"
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

Chromium is already installed from your passing D1a run; if its install is missing run `npx playwright install chromium`. No Node/npm update is needed. The installer checks every changed file before copying, accepts the original or already-updated content, and backs up replaced files. It stops on unexpected edits so local work is preserved. Report that file path if it stops. Existing node_modules, environment overrides and unrelated files are not copied or deleted.

Expected D1b: 42 API/component tests, 15 browser tests, 42 executable contract operations, three builds and passing production mock-exclusion. Run npm run dev:ops, npm run dev:customer and npm run dev:partner in separate terminals; navigate to Session and access. Simulator sign-in and step-up code: 246810. Frontend foundation is complete against mocks only; all 63 primary page workflows remain scheduled in the roadmap.
