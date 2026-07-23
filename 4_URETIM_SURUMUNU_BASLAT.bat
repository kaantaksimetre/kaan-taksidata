@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0backend"
title Kaan Taksimetre Sunucusu
if not exist taksimetre_sunucu.exe (
  echo Uretim EXE dosyasi bulunamadi.
  echo Once 3_URETIM_SURUMU_HAZIRLA.bat dosyasini calistirin.
  pause
  exit /b 1
)
start "" "http://127.0.0.1:3000"
taksimetre_sunucu.exe
if errorlevel 1 pause
