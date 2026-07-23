@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo.
echo [BACKEND] Go sunucusu baslatiliyor...
echo Ilk calistirmada Go kutuphanelerinin indirilmesi birkaç dakika surebilir.
echo.
go run .
if errorlevel 1 (
  echo.
  echo Backend baslatilamadi. Go 1.26.3 veya daha yeni surumun kurulu oldugunu kontrol edin.
  pause
)
