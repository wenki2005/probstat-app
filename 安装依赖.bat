@echo off
cd /d "%~dp0"
set "PY=C:\Users\haiju\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe"
if exist "%PY%" goto run
set "PY=python"
:run
"%PY%" "install.py"
pause