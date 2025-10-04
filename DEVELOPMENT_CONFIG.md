# Development Configuration

## OTP Bypass for Development

The OTP (One-Time Password) functionality has been temporarily disabled for faster development. This allows you to login directly without going through the OTP verification step.

### What was changed:

#### Frontend (`frontend/src/components/auth/SignInForm.tsx`)
- Commented out OTP request and verification flow
- Modified to call `login()` directly after credential validation
- Updated button text from "Sending OTP..." to "Logging in..."

#### Backend (`backend/proj_backend/api/views.py`)
- `request_otp()`: Bypassed OTP generation and email sending
- `verify_otp()`: Always returns success for any OTP
- `resend_otp()`: Bypassed OTP resending

### To Re-enable OTP for Production:

1. **Frontend**: In `SignInForm.tsx`, uncomment these lines:
   ```typescript
   // await requestOTP(credentials.email, credentials.password);
   // setShowOTP(true);
   ```
   And comment out:
   ```typescript
   await login(credentials.email, credentials.password);
   navigate("/");
   ```

2. **Backend**: In `views.py`, uncomment the OTP-related code in:
   - `request_otp()` function (lines with `generate_otp()`, `send_otp_email()`)
   - `verify_otp()` function (OTP validation logic)
   - `resend_otp()` function (OTP generation and sending)

### Current Login Flow (Development Mode):
1. User enters email/password
2. Credentials are validated
3. User is logged in directly (no OTP step)

### Production Login Flow (when OTP is re-enabled):
1. User enters email/password
2. Credentials are validated
3. OTP is generated and sent via email
4. User enters OTP code
5. OTP is verified
6. User is logged in

### Security Note:
**Remember to re-enable OTP before deploying to production!** The current configuration bypasses the two-factor authentication security feature.
