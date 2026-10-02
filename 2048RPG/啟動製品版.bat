@echo off
chcp 65001 >nul
title 2048 RPG - Commercial Edition Local Server

echo ==================================================
echo   👑 2048 RPG：王國遠征 (Commercial Edition)
echo   正在啟動獨立直式手遊製品版伺服器 (Port 8081)...
echo ==================================================

cd /d "%~dp0"
start "" http://localhost:8081
python server.py 8081
pause
