@echo off
echo Starting Celery Flower (Monitoring)...
cd /d "%~dp0proj_backend"
call ..\proj_venv\Scripts\activate
python -m celery -A api flower --port=5555
pause
