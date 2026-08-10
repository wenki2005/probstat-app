@echo off
cd /d "%~dp0"
if exist ".venv\Scripts\pythonw.exe" if exist "frontend\dist\index.html" goto launch
echo [INFO] First-time setup needed, installing dependencies...
set "PY=C:\Users\haiju\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%PY%" goto runinstall
set "PY=python"
:runinstall
"%PY%" "install.py"
if errorlevel 1 goto fail
:launch
start "" ".venv\Scripts\pythonw.exe" "desktop.py"
exit /b 0
:fail
echo [ERROR] Install failed. Please check the output above.
pause
exit /b 1