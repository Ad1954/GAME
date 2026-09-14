@echo off
cd /d "%~dp0"

echo ========================================================
echo            new_Xreader Local Test Server
echo ========================================================
echo.
echo [1] Opening browser at http://localhost:8000 ...
start http://localhost:8000
echo.
echo [2] Starting Python Zero-Cache Server on port 8000...
echo.
echo Tip: Keep this window open during testing.
echo      To stop the server, simply close this window.
echo ========================================================
echo.

python server.py

echo.
echo Server stopped or failed to start.
pause
