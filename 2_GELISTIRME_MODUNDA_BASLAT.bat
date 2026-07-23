@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title Kaan Taksimetre - Gelistirme Modu

echo ==========================================================
echo   GELISTIRME MODU: BACKEND + VITE
echo ==========================================================
echo.
if not exist "%~dp0backend\main.go" goto :extract_error
where go >nul 2>nul || goto :go_error
where node >nul 2>nul || goto :node_error
where npm >nul 2>nul || goto :node_error

start "Taksimetre Backend" cmd.exe /d /k ""%~dp0backend\GELISTIRME_BACKEND.bat""
timeout /t 4 /nobreak >nul
start "Taksimetre Frontend" cmd.exe /d /k ""%~dp0frontend\GELISTIRME_FRONTEND.bat""
timeout /t 7 /nobreak >nul
start "" "http://127.0.0.1:5173"

echo Iki ayri pencere acildi.
echo Site: http://127.0.0.1:5173
pause
exit /b 0

:extract_error
echo [HATA] ZIP'i tamamen cikartmadan calistirmissiniz.
goto :failed
:go_error
echo [HATA] Go bulunamadi.
goto :failed
:node_error
echo [HATA] Node.js veya npm bulunamadi.
:failed
echo.
echo Once 0_SISTEM_KONTROLU.bat dosyasini calistirin.
pause
exit /b 1
