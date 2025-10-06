@echo off
echo Starting Celery Flower (Monitoring)...
cd /d "%~dp0proj_backend"
call ..\proj_venv\Scripts\activate
celery -A proj_backend flower --port=5555
pause
