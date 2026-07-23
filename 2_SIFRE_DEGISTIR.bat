@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0backend"
title Kaan Taksimetre - Sifre Degistir

echo Sunucu aciksa once Backend penceresini kapatin.
echo.
if exist taksimetre_sunucu.exe (
  taksimetre_sunucu.exe --set-credentials
) else (
  where go >nul 2>nul
  if errorlevel 1 (
    echo Go bulunamadi. Once Go kurun.
    pause
    exit /b 1
  )
  go run . --set-credentials
)
echo.
pause
