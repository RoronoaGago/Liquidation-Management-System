@echo off
echo ========================================
echo    ENABLING OTP FOR LIQUIDATION SYSTEM
echo ========================================
echo.

REM Check if the SignInForm.tsx file exists
if not exist "frontend\src\components\auth\SignInForm.tsx" (
    echo ERROR: SignInForm.tsx file not found!
    echo Please run this script from the project root directory.
    pause
    exit /b 1
)

echo [1/6] Creating backup of SignInForm.tsx...
copy "frontend\src\components\auth\SignInForm.tsx" "frontend\src\components\auth\SignInForm.tsx.backup" >nul
if %errorlevel% neq 0 (
    echo ERROR: Failed to create backup!
    pause
    exit /b 1
)
echo ✓ Backup created successfully

echo.
echo [2/6] Enabling OTP imports...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^// import \{ requestOTP \}', 'import { requestOTP }' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^// import OTPVerification', 'import OTPVerification' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP imports enabled

echo.
echo [3/6] Enabling OTP state management...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // const \[showOTP, setShowOTP\]', '  const [showOTP, setShowOTP]' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP state management enabled

echo.
echo [4/6] Enabling OTP handler functions...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // OTP DISABLED FOR DEVELOPMENT - These functions are no longer needed', '  // OTP handler functions' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // const handleOTPSuccess', '  const handleOTPSuccess' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // const handleOTPBack', '  const handleOTPBack' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   try \{', '    try {' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     // After OTP verification, proceed with login', '      // After OTP verification, proceed with login' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     await login\(credentials\.email, credentials\.password\);', '      await login(credentials.email, credentials.password);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     navigate\(\"/\"\);', '      navigate(\"/\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   \} catch \(err: any\) \{', '    } catch (err: any) {' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     setError\(err\.message \|\| \"Login failed after OTP verification\"\);', '      setError(err.message || \"Login failed after OTP verification\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     setShowOTP\(false\);', '      setShowOTP(false);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   \}', '    }' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // \};', '  };' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   setShowOTP\(false\);', '    setShowOTP(false);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   setError\(\"\"\);', '    setError(\"\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP handler functions enabled

echo.
echo [5/6] Enabling OTP component rendering...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // OTP DISABLED FOR DEVELOPMENT - OTP verification component is no longer shown', '  // OTP verification component' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // if \(showOTP\) \{', '  if (showOTP) {' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   return \(', '    return (' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     <div className=\"flex items-center justify-center min-h-screen dark:bg-gray-900 p-4\">', '      <div className=\"flex items-center justify-center min-h-screen dark:bg-gray-900 p-4\">' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //       <OTPVerification', '        <OTPVerification' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //         email=\{credentials\.email\}', '          email={credentials.email}' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //         onBack=\{handleOTPBack\}', '          onBack={handleOTPBack}' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //         onSuccess=\{handleOTPSuccess\}', '          onSuccess={handleOTPSuccess}' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //       />', '        />' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //     </div>', '      </div>' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  //   \};', '    );' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // \}', '  }' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP component rendering enabled

echo.
echo [6/6] Updating login flow to use OTP...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '      // OTP DISABLED FOR DEVELOPMENT - Login directly', '      // Request OTP and show verification screen' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '      await login\(credentials\.email, credentials\.password\);', '      await requestOTP(credentials.email);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '      navigate\(\"/\"\);', '      setShowOTP(true);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ Login flow updated to use OTP

echo.
echo ========================================
echo           OTP ENABLED SUCCESSFULLY!
echo ========================================
echo.
echo Changes made:
echo - ✓ OTP imports uncommented
echo - ✓ OTP state management enabled
echo - ✓ OTP handler functions uncommented
echo - ✓ OTP component rendering enabled
echo - ✓ Login flow updated to request OTP
echo.
echo Backup created at: frontend\src\components\auth\SignInForm.tsx.backup
echo.
echo To disable OTP again, run: disable-otp.bat
echo.
pause
