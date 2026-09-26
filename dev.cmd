@echo off
setlocal
cd /d "%~dp0"
if exist "%LOCALAPPDATA%\Programs\node-v24.14.1-win-x64\node.exe" set "PATH=%LOCALAPPDATA%\Programs\node-v24.14.1-win-x64;%PATH%"
call npm.cmd run dev -- --host localhost --port 5173 --strictPort
if errorlevel 1 pause
