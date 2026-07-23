@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0backend"
title Kaan Taksimetre - Test Verilerini Sil

echo Sunucu aciksa once kapatin.
echo Bu islem yerel test veritabanini, oturum kullanicisini ve yerel yedekleri siler.
echo.
set /p "CONFIRM=Tum TEST verilerini silmek icin SIL yazin: "
if /i not "%CONFIRM%"=="SIL" (
  echo Islem iptal edildi.
  pause
  exit /b 0
)
del /q taksimetre.db taksimetre.db-wal taksimetre.db-shm auth_config.json 2>nul
if exist backups rmdir /s /q backups
echo Test verileri silindi. Sonraki acilista bos veritabani ve gecici kullanici yeniden olusur.
pause
