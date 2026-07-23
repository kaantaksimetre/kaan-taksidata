@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title Kaan Taksimetre - Yerel Test Sunucusu

echo ==========================================================
echo   KAAN TAKSIMETRE - YEREL TEST SUNUCUSU
echo ==========================================================
echo.

if not exist "%~dp0backend\main.go" (
  echo [HATA] backend\main.go bulunamadi.
  echo ZIP dosyasini acip icinden calistirmayin.
  echo ZIP'e sag tiklayip "Tumunu Ayikla" secin.
  goto :failed
)

where go >nul 2>nul
if errorlevel 1 (
  echo [HATA] Go bulunamadi veya PATH'e eklenmemis.
  echo Once 0_SISTEM_KONTROLU.bat dosyasini calistirin.
  goto :failed
)

echo [OK] Kurulu Go surumu:
go version

echo.
echo [BILGI] Ilk calistirmada Go kutuphaneleri internetten indirilebilir.
echo [BILGI] Tarayici 8 saniye sonra acilacak.
echo [BILGI] Site adresi: http://127.0.0.1:3000
echo [BILGI] E-posta: admin@kaan.local
echo [BILGI] Gecici sifre: KaanTaksi123!
echo.
echo Sunucuyu kapatmak icin bu pencerede Ctrl+C tuslarina basin.
echo.

start "" powershell -NoProfile -WindowStyle Hidden -Command "Start-Sleep -Seconds 8; Start-Process 'http://127.0.0.1:3000'"

cd /d "%~dp0backend"
set "TAKSIMETRE_HOST=127.0.0.1"
set "TAKSIMETRE_PORT=3000"
set "TAKSIMETRE_PUBLIC_DIR=./public"

rem PowerShell yonlendirmesi kullanmadan dogrudan calistir.
rem Bu komut sizin elle calistirdiginiz ve basarili olan komuttur.
go run .
set "GO_RESULT=%ERRORLEVEL%"

if not "%GO_RESULT%"=="0" (
  echo.
  echo [HATA] Go sunucusu %GO_RESULT% hata koduyla durdu.
  echo Yukaridaki hata satirlarinin ekran goruntusunu gonderebilirsiniz.
  goto :failed
)

echo.
echo Sunucu normal sekilde kapatildi.
goto :end

:failed
echo.
echo Baslatma tamamlanamadi.

:end
echo.
echo Bu pencere otomatik kapanmayacak.
pause
