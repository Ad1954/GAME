@echo off
chcp 65001 >nul
echo ========================================
echo 2048 RPG GitHub 上傳發布版 本機測試
echo Port: 8081
echo ========================================
start http://localhost:8081
python -m http.server 8081
pause
