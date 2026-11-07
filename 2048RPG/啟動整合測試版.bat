@echo off
cd /d "%~dp0"
title 2048 RPG - 正式整合測試版 (Port 8081)
color 0a
echo ================================================================
echo   [2048 RPG] 正式整合測試版伺服器 (index_v2.html)
echo   通訊埠: 8081
echo   網址: http://localhost:8081/index_v2.html
echo ================================================================
echo 正在喚醒瀏覽器開啟整合測試版...
start "" "http://localhost:8081/index_v2.html"
echo.
echo 伺服器已在背景運行中，若需停止服務，請直接關閉本視窗即可。
echo.
python server.py 8081
pause
