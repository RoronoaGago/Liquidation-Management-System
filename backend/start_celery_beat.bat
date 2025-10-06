@echo off
echo Starting Celery Beat Scheduler...
cd /d "%~dp0proj_backend"
call ..\proj_venv\Scripts\activate
python -m celery -A api beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler
pause
