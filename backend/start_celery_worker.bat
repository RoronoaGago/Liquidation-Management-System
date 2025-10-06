@echo off
echo Starting Celery Worker...
cd /d "%~dp0proj_backend"
call ..\proj_venv\Scripts\activate
python -m celery -A api worker --loglevel=info --concurrency=4
pause
