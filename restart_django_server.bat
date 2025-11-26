@echo off
echo Stopping existing Django server...
taskkill /F /IM python.exe 2>nul
timeout /t 2 /nobreak >nul

echo Starting Django server with virtual environment...
cd backend\proj_backend
..\proj_venv\Scripts\python.exe manage.py runserver 127.0.0.1:8000

pause
