@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo [FRONTEND] React/Vite sunucusu baslatiliyor...
if not exist node_modules (
  echo Node paketleri kuruluyor...
  call npm ci
  if errorlevel 1 (
    echo Node paketleri kurulamadı.
    pause
    exit /b 1
  )
)
call npm run dev
if errorlevel 1 pause
