@echo off
echo ========================================
echo   DISABLING OTP FOR LIQUIDATION SYSTEM
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
echo [2/6] Disabling OTP imports...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^import \{ requestOTP \}', '// import { requestOTP } // OTP DISABLED FOR DEVELOPMENT' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^import OTPVerification', '// import OTPVerification // OTP DISABLED FOR DEVELOPMENT' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP imports disabled

echo.
echo [3/6] Disabling OTP state management...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  const \[showOTP, setShowOTP\]', '  // const [showOTP, setShowOTP] // OTP DISABLED FOR DEVELOPMENT' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP state management disabled

echo.
echo [4/6] Disabling OTP handler functions...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // OTP handler functions', '  // OTP DISABLED FOR DEVELOPMENT - These functions are no longer needed' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  const handleOTPSuccess', '  // const handleOTPSuccess' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  const handleOTPBack', '  // const handleOTPBack' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    try \{', '  //   try {' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      // After OTP verification, proceed with login', '  //     // After OTP verification, proceed with login' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      await login\(credentials\.email, credentials\.password\);', '  //     await login(credentials.email, credentials.password);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      navigate\(\"/\"\);', '  //     navigate(\"/\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    \} catch \(err: any\) \{', '  //   } catch (err: any) {' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      setError\(err\.message \|\| \"Login failed after OTP verification\"\);', '  //     setError(err.message || \"Login failed after OTP verification\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      setShowOTP\(false\);', '  //     setShowOTP(false);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    \}', '  //   }' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  \};', '  // };' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    setShowOTP\(false\);', '  //   setShowOTP(false);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    setError\(\"\"\);', '  //   setError(\"\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP handler functions disabled

echo.
echo [5/6] Disabling OTP component rendering...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  // OTP verification component', '  // OTP DISABLED FOR DEVELOPMENT - OTP verification component is no longer shown' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  if \(showOTP\) \{', '  // if (showOTP) {' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    return \(', '  //   return (' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      <div className=\"flex items-center justify-center min-h-screen dark:bg-gray-900 p-4\">', '  //     <div className=\"flex items-center justify-center min-h-screen dark:bg-gray-900 p-4\">' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^        <OTPVerification', '  //       <OTPVerification' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^          email=\{credentials\.email\}', '  //         email={credentials.email}' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^          onBack=\{handleOTPBack\}', '  //         onBack={handleOTPBack}' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^          onSuccess=\{handleOTPSuccess\}', '  //         onSuccess={handleOTPSuccess}' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^        />', '  //       />' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^      </div>', '  //     </div>' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^    \);', '  //   );' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '^  \}', '  // }' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ OTP component rendering disabled

echo.
echo [6/6] Restoring direct login flow...
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '      // Request OTP and show verification screen', '      // OTP DISABLED FOR DEVELOPMENT - Login directly' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '      await requestOTP\(credentials\.email\);', '      await login(credentials.email, credentials.password);' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
powershell -Command "(Get-Content 'frontend\src\components\auth\SignInForm.tsx') -replace '      setShowOTP\(true\);', '      navigate(\"/\");' | Set-Content 'frontend\src\components\auth\SignInForm.tsx'"
echo ✓ Direct login flow restored

echo.
echo ========================================
echo          OTP DISABLED SUCCESSFULLY!
echo ========================================
echo.
echo Changes made:
echo - ✓ OTP imports commented out
echo - ✓ OTP state management disabled
echo - ✓ OTP handler functions commented out
echo - ✓ OTP component rendering disabled
echo - ✓ Direct login flow restored
echo.
echo Backup created at: frontend\src\components\auth\SignInForm.tsx.backup
echo.
echo To enable OTP again, run: enable-otp.bat
echo.
pause
