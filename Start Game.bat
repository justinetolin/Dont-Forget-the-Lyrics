@echo off
setlocal
cd /d "%~dp0"

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js was not found. Install Node.js, then run this file again.
  pause
  exit /b 1
)

if not exist "%~dp0cloudflared.exe" (
  echo cloudflared.exe was not found beside this launcher.
  pause
  exit /b 1
)

set "BUZZER_URL=https://justinetolin.github.io/DFTL-Buzzer/"

start "Lyrics Game Stage" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "$env:BUZZER_URL='%BUZZER_URL%'; Set-Location -LiteralPath '%~dp0'; npm start"
timeout /t 2 /nobreak >nul
start "Lyrics Buzzer Tunnel" powershell.exe -NoExit -ExecutionPolicy Bypass -Command "Set-Location -LiteralPath '%~dp0'; & '.\cloudflared.exe' tunnel --url http://localhost:3001"

echo Started the stage and buzzer tunnel in two terminal windows.
echo Open http://localhost:3000, then copy the trycloudflare.com address
echo from the tunnel window into Public server address and click Set server.
echo Finally, click Copy invite to share the buzzer link with players.
pause
