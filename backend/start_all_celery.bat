@echo off
echo Starting all Celery services...
echo.
echo This will start:
echo - Celery Worker (background task processor)
echo - Celery Beat (task scheduler)
echo - Celery Flower (monitoring dashboard)
echo.
echo Press Ctrl+C to stop all services
echo.

cd /d "%~dp0proj_backend"
call ..\proj_venv\Scripts\activate

start "Celery Worker" cmd /k "celery -A api worker --loglevel=info --pool=threads --concurrency=4"
timeout /t 3 /nobreak >nul
start "Celery Beat" cmd /k "celery -A api beat --loglevel=info --scheduler django_celery_beat.schedulers:DatabaseScheduler"
timeout /t 3 /nobreak >nul
start "Celery Flower" cmd /k "celery -A api flower --port=5555"

echo.
echo All Celery services started!
echo - Worker: Processing background tasks
echo - Beat: Scheduling tasks
echo - Flower: http://localhost:5555 (monitoring)
echo.
echo Press any key to close this window...
pause >nul
