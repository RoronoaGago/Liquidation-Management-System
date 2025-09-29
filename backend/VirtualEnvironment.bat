@echo off
echo Activating virtual environment...
proj_venv\Scripts\activate
if %errorlevel% neq 0 (
    echo Failed to activate virtual environment.
    exit /b %errorlevel%
) else (
    echo Virtual environment activated successfully.
)
cd proj_backend

echo.
echo Creating migrations...
py manage.py makemigrations
if %errorlevel% neq 0 (
    echo Failed to create migrations.
    exit /b %errorlevel%
) else (
    echo Migrations created successfully.
)

echo.
choice /c YN /m "Do you want to apply the migrations"
if %errorlevel% equ 1 (
    echo Applying migrations...
    py manage.py migrate
    if %errorlevel% neq 0 (
        echo Failed to apply migrations.
        exit /b %errorlevel%
    ) else (
        echo Migrations applied successfully.
    )
) else (
    echo Migration cancelled. Exiting.
    pause
    exit /b 0
)

echo.
choice /c YN /m "Do you want to run the server"
if %errorlevel% equ 1 (
    echo Starting Django development server...
    py manage.py runserver
) else (
    echo Server startup cancelled.
    pause
)