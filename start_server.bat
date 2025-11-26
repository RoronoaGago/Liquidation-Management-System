@echo off
echo Starting Django Server...
echo.

cd backend
echo Changed to backend directory

echo Activating virtual environment...
call proj_venv\Scripts\activate.bat

cd proj_backend
echo Changed to proj_backend directory

echo Starting Django development server...
python manage.py runserver

pause
