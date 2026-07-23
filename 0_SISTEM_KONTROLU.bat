@echo off
setlocal EnableExtensions
chcp 65001 >nul
cd /d "%~dp0"
title Kaan Taksimetre - Sistem Kontrolu
set "LOG=%~dp0SISTEM_KONTROL_SONUCU.txt"

>"%LOG%" echo KAAN TAKSIMETRE SISTEM KONTROLU
>>"%LOG%" echo Tarih: %date% %time%
>>"%LOG%" echo Proje klasoru: %~dp0
>>"%LOG%" echo.

echo ==========================================================
echo   KAAN TAKSIMETRE - SISTEM KONTROLU
echo ==========================================================
echo.

if not exist "%~dp0backend\main.go" (
  echo [HATA] Proje dosyalari bulunamadi.
  echo ZIP dosyasini acip icinden calistirmayin.
  echo ZIP'e sag tiklayip "Tumunu Ayikla" secin ve sonra tekrar deneyin.
  >>"%LOG%" echo HATA: backend\main.go bulunamadi.
  goto :end_error
)

echo [OK] Proje klasoru dogru gorunuyor.
>>"%LOG%" echo OK: Proje klasoru dogru.

echo(%~dp0| findstr /i "\\Temp\\ AppData\\Local\\Temp\\" >nul
if not errorlevel 1 (
  echo [UYARI] Proje gecici klasorden calisiyor olabilir.
  echo ZIP'i normal bir klasore tamamen cikartin.
  >>"%LOG%" echo UYARI: Gecici klasor algilandi.
)

echo.
where go >nul 2>nul
if errorlevel 1 (
  echo [HATA] Go bulunamadi.
  echo Go kurulduktan sonra bu pencereyi kapatip yeniden acin.
  >>"%LOG%" echo HATA: Go PATH icinde bulunamadi.
) else (
  echo [OK] Go bulundu:
  go version
  >>"%LOG%" go version
)

echo.
where node >nul 2>nul
if errorlevel 1 (
  echo [BILGI] Node.js bulunamadi.
  echo Normal site testinde Node.js gerekli degil; sadece frontend kodu gelistirirken gerekir.
  >>"%LOG%" echo BILGI: Node.js bulunamadi.
) else (
  echo [OK] Node.js bulundu:
  node --version
  >>"%LOG%" node --version
)

echo.
where npm >nul 2>nul
if errorlevel 1 (
  echo [BILGI] npm bulunamadi.
  >>"%LOG%" echo BILGI: npm bulunamadi.
) else (
  echo [OK] npm bulundu:
  call npm --version
  >>"%LOG%" call npm --version
)

echo.
netstat -ano | findstr ":3000" >nul 2>nul
if not errorlevel 1 (
  echo [UYARI] 3000 portu baska bir program tarafindan kullaniliyor olabilir.
  echo Acik eski taksimetre sunucusu pencerelerini kapatin.
  >>"%LOG%" echo UYARI: Port 3000 kullanimda gorunuyor.
) else (
  echo [OK] 3000 portunda gorunen bir kullanim yok.
  >>"%LOG%" echo OK: Port 3000 bos gorunuyor.
)

echo.
echo Kontrol sonucu su dosyaya yazildi:
echo %LOG%
echo.
echo Simdi 1_BASLAT.bat dosyasini calistirabilirsiniz.
goto :end

:end_error
echo.
echo Once ZIP'i tamamen cikartin.

:end
echo.
echo Bu pencere otomatik kapanmayacak.
pause
