@echo off
chcp 65001 >nul
title 2048 RPG - 全要素展廳 (Port 8082)
color 0a
echo ================================================================
echo   🎨 [2048 RPG] 全要素階梯展廳伺服器
echo   通訊埠: 8082 (與遊戲 8081 獨立不衝突)
echo   網址: http://localhost:8082/review_tiles_matrix.html
echo ================================================================
echo 正在瀏覽器開啟全要素展廳...
cd /d "%~dp0"
start "" "http://localhost:8082/review_tiles_matrix.html"
python server.py 8082
pause
