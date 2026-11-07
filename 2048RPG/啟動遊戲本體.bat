@echo off
cd /d "%~dp0"
title 2048 RPG - 遊戲本體伺服器 (Port 8081)
color 0b
echo ================================================================
echo   [2048 RPG] 遊戲本體專屬伺服器
echo   通訊埠: 8081
echo   網址: http://localhost:8081/
echo ================================================================
echo 正在喚醒瀏覽器開啟遊戲...
start "" "http://localhost:8081/"
echo.
echo 伺服器已在背景運行中，若需停止服務，請直接關閉本視窗即可。
echo.
python server.py 8081
pause
