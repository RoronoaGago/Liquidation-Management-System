@echo off
echo ========================================
echo    OTP STATUS CHECK - LIQUIDATION SYSTEM
echo ========================================
echo.

REM Check if the SignInForm.tsx file exists
if not exist "frontend\src\components\auth\SignInForm.tsx" (
    echo ERROR: SignInForm.tsx file not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo Checking OTP status in SignInForm.tsx...
echo.

REM Check for OTP imports
findstr /C:"// import { requestOTP }" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo ✗ OTP imports: DISABLED
) else (
    echo ✓ OTP imports: ENABLED
)

REM Check for OTP state
findstr /C:"// const [showOTP, setShowOTP]" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo ✗ OTP state management: DISABLED
) else (
    echo ✓ OTP state management: ENABLED
)

REM Check for OTP handlers
findstr /C:"// const handleOTPSuccess" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo ✗ OTP handler functions: DISABLED
) else (
    echo ✓ OTP handler functions: ENABLED
)

REM Check for OTP component rendering
findstr /C:"// if (showOTP)" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo ✗ OTP component rendering: DISABLED
) else (
    echo ✓ OTP component rendering: ENABLED
)

REM Check for direct login flow
findstr /C:"await login(credentials.email, credentials.password)" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo ✓ Direct login flow: ENABLED
) else (
    echo ✗ Direct login flow: DISABLED
)

REM Check for OTP request flow
findstr /C:"await requestOTP(credentials.email)" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo ✓ OTP request flow: ENABLED
) else (
    echo ✗ OTP request flow: DISABLED
)

echo.
echo ========================================
echo                SUMMARY
echo ========================================

REM Determine overall status
findstr /C:"// import { requestOTP }" "frontend\src\components\auth\SignInForm.tsx" >nul
if %errorlevel% equ 0 (
    echo.
    echo 🔴 OTP STATUS: DISABLED
    echo    Users will login directly without OTP verification
    echo.
    echo To enable OTP, run: enable-otp.bat
) else (
    echo.
    echo 🟢 OTP STATUS: ENABLED
    echo    Users will need to verify OTP after entering credentials
    echo.
    echo To disable OTP, run: disable-otp.bat
)

echo.
echo Available commands:
echo - enable-otp.bat    : Enable OTP verification
echo - disable-otp.bat   : Disable OTP verification
echo - check-otp-status.bat : Check current OTP status
echo.
pause
