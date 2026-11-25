@echo off
setlocal
cd /d "%~dp0"
if not exist "package-lock.json" (
    echo Project files are missing. Extract the complete source archive first.
    exit /b 1
)
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo Install Node.js 22.12 or newer and reopen CMD.
    exit /b 1
)
call npm.cmd ci --include=dev
if errorlevel 1 (
    echo Dependency installation failed. Review the error above.
    exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
    echo Vite is missing after installation. Review npm configuration.
    exit /b 1
)
if not exist ".env.local" copy ".env.example" ".env.local" >nul
if not exist ".env.local" (
    echo Local configuration could not be created.
    exit /b 1
)
echo Open http://localhost:5180/login
call npm.cmd run dev -- --port 5180
exit /b %errorlevel%
