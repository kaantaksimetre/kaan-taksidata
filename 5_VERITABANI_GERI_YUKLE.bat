@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0backend"
title Kaan Taksimetre - Yedekten Geri Yukle

echo ==========================================================
echo   VERITABANI YEDEKTEN GERI YUKLEME
echo ==========================================================
echo Sunucu aciksa once Backend/uretim sunucusu penceresini kapatin.
echo Aktif veritabaninin geri yukleme oncesi yedegi otomatik alinacaktir.
echo.
set /p "BACKUP=Geri yuklenecek .db dosyasinin tam yolunu girin: "
if "%BACKUP%"=="" (
  echo Dosya yolu bos olamaz.
  pause
  exit /b 1
)
if not exist "%BACKUP%" (
  echo Dosya bulunamadi: %BACKUP%
  pause
  exit /b 1
)

echo.
echo DIKKAT: Bu islem aktif veritabanini secilen yedekle degistirir.
set /p "CONFIRM=Devam etmek icin EVET yazin: "
if /i not "%CONFIRM%"=="EVET" (
  echo Islem iptal edildi.
  pause
  exit /b 0
)

if exist taksimetre_sunucu.exe (
  taksimetre_sunucu.exe --restore-db "%BACKUP%"
) else (
  go run . --restore-db "%BACKUP%"
)
if errorlevel 1 (
  echo Geri yukleme basarisiz oldu.
) else (
  echo Geri yukleme tamamlandi.
)
pause
