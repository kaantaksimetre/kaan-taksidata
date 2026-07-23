@echo off
setlocal
chcp 65001 >nul
cd /d "%~dp0"
title Kaan Taksimetre - Uretim Derlemesi

echo ==========================================================
echo   TEK SUNUCULU URETIM SURUMU HAZIRLANIYOR
echo ==========================================================
echo.
where node >nul 2>nul || goto :node_error
where npm >nul 2>nul || goto :node_error
where go >nul 2>nul || goto :go_error

cd /d "%~dp0frontend"
call npm ci || goto :failed
call npm run lint || goto :failed
call npm run build || goto :failed

cd /d "%~dp0"
if exist backend\public rmdir /s /q backend\public
mkdir backend\public
xcopy /e /i /y frontend\dist\* backend\public\ >nul || goto :failed

cd /d "%~dp0backend"
go build -trimpath -ldflags="-s -w" -o taksimetre_sunucu.exe . || goto :failed

echo.
echo [BASARILI] Uretim surumu hazirlandi.
echo Bundan sonra 4_URETIM_SURUMUNU_BASLAT.bat dosyasini kullanabilirsiniz.
pause
exit /b 0

:node_error
echo [HATA] Node.js/npm bulunamadi.
pause
exit /b 1
:go_error
echo [HATA] Go bulunamadi. Go 1.26.3 veya daha yeni surumu kurun.
pause
exit /b 1
:failed
echo.
echo [HATA] Derleme tamamlanamadi. Yukaridaki ilk hata satirini kontrol edin.
pause
exit /b 1
