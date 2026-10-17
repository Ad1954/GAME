@echo off
chcp 65001 >nul
title 2048 RPG - Commercial Edition (Port 8081)
color 0b
echo ==================================================
echo   ⚔️ 2048 RPG：王國遠征 (Commercial Edition)
echo   正在啟動商業製品版伺服器 (Port 8081)...
echo   網址: http://localhost:8081/
echo ==================================================

cd /d "%~dp0"
start "" "http://localhost:8081/"
python server.py 8081
pause
