@echo off
echo Starting all Celery services...
echo.
echo This will start:
echo - Celery Worker (background task processor)
echo - Celery Beat (task scheduler)
echo - Celery Flower (monitoring dashboard)
echo.

cd /d "%~dp0"

echo Checking virtual environment...
if not exist "proj_venv\Scripts\activate.bat" (
    echo ERROR: Virtual environment not found at proj_venv\Scripts\activate.bat
    echo Please run VirtualEnvironment.bat first to set up the environment
    pause
    exit /b 1
)

echo Activating virtual environment...
call proj_venv\Scripts\activate
if %errorlevel% neq 0 (
    echo ERROR: Failed to activate virtual environment
    pause
    exit /b 1
)

echo Checking if Celery is installed...
celery --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Celery not found. Installing dependencies...
    pip install -r requirements.txt
    if %errorlevel% neq 0 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
)

cd proj_backend

echo Starting Celery services...
echo Press Ctrl+C to stop all services
echo.

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
