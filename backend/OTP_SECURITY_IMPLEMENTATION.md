# OTP Security Implementation - Strict 5-Minute Policy

This document describes the comprehensive OTP security implementation that ensures the 5-minute OTP expiration rule is always followed.

## 🔒 Security Features Implemented

### 1. **Removed Environment Overrides**
- **File**: `backend/proj_backend/api/otp_config.py`
- **Change**: Environment variable overrides for `OTP_LIFETIME_MINUTES` are now blocked
- **Security**: Only non-security related settings can be overridden
- **Logging**: All override attempts are logged as security violations

### 2. **Strict Runtime Validation**
- **File**: `backend/proj_backend/api/otp_config.py`
- **Function**: `validate_otp_config()` and `get_otp_lifetime_minutes()`
- **Security**: OTP lifetime MUST be exactly 5 minutes, no exceptions
- **Fallback**: If invalid lifetime detected, system forces 5 minutes

### 3. **Centralized Configuration Management**
- **File**: `backend/proj_backend/api/otp_security.py`
- **Change**: All OTP constants now use centralized configuration
- **Security**: Single source of truth prevents configuration drift
- **Validation**: Runtime validation on every OTP operation

### 4. **Frontend-Backend Synchronization**
- **New API**: `GET /otp-config/` - Returns OTP configuration to frontend
- **File**: `frontend/src/api/otpConfig.ts` - New service for fetching config
- **Security**: Frontend validates configuration matches backend
- **Fallback**: Frontend defaults to 5 minutes if validation fails

### 5. **Dynamic Frontend Timers**
- **Files**: 
  - `frontend/src/components/OTPVerification.tsx`
  - `frontend/src/components/auth/PasswordResetModal.tsx`
- **Change**: Timers now fetch configuration from backend
- **Security**: Frontend cannot use incorrect timer values
- **Validation**: All timer values validated against 5-minute policy

### 6. **Production Environment Validation**
- **File**: `backend/proj_backend/api/otp_security_validator.py`
- **Features**:
  - Comprehensive security validation
  - Environment variable checking
  - Runtime configuration validation
  - Auto-validation on production startup
- **API**: `GET /otp-security-report/` - Security monitoring endpoint

## 🛡️ Security Validations

### Backend Validations
1. **Configuration Validation**: OTP lifetime must be exactly 5 minutes
2. **Runtime Validation**: Every OTP operation validates lifetime
3. **Environment Validation**: Production environment checks for overrides
4. **Import Validation**: Configuration validated on module import

### Frontend Validations
1. **API Response Validation**: Frontend validates backend configuration
2. **Timer Validation**: All timers validate against 5-minute policy
3. **Fallback Security**: Default to 5 minutes if validation fails
4. **Console Warnings**: Security violations logged to console

## 📁 Files Modified

### Backend Files
- `backend/proj_backend/api/otp_config.py` - Strict configuration management
- `backend/proj_backend/api/otp_security.py` - Centralized constants
- `backend/proj_backend/api/improved_otp_views.py` - New API endpoints
- `backend/proj_backend/api/urls.py` - New URL routes
- `backend/proj_backend/api/otp_security_validator.py` - Security validation
- `backend/proj_backend/api/management/commands/validate_otp_security.py` - Management command

### Frontend Files
- `frontend/src/api/otpConfig.ts` - New OTP configuration service
- `frontend/src/lib/otpUtils.ts` - Enhanced validation functions
- `frontend/src/components/OTPVerification.tsx` - Dynamic timer implementation
- `frontend/src/components/auth/PasswordResetModal.tsx` - Dynamic timer implementation

## 🚀 Usage

### Running Security Validation
```bash
# Basic validation
python manage.py validate_otp_security

# Detailed report
python manage.py validate_otp_security --report

# Fail on error (for CI/CD)
python manage.py validate_otp_security --fail-on-error
```

### API Endpoints
```bash
# Get OTP configuration
GET /otp-config/

# Get security report (admin only)
GET /otp-security-report/
```

### Frontend Usage
```typescript
import { fetchOTPConfig, validateOTPConfig } from '@/api/otpConfig';

// Fetch and validate configuration
const config = await fetchOTPConfig();
if (validateOTPConfig(config)) {
  // Use configuration
  const lifetimeSeconds = config.otp_lifetime_seconds;
}
```

## 🔍 Monitoring

### Log Messages
- `✅ OTP Configuration validated successfully - 5-minute security policy enforced`
- `🚨 SECURITY ALERT: OTP lifetime validation failed - expected 5 minutes, got X`
- `⚠️ SECURITY: Attempted to override OTP security setting 'X' - BLOCKED`

### Security Report
The security report includes:
- Validation results (passed/failed)
- Configuration details
- Environment information
- Error and warning details

## 🚨 Security Violations

The system will log and prevent:
1. **Configuration Overrides**: Attempts to override OTP lifetime
2. **Invalid Lifetimes**: Any lifetime other than 5 minutes
3. **Environment Variables**: Production environment variable overrides
4. **Frontend Mismatches**: Frontend-backend configuration mismatches

## ✅ Benefits

1. **Guaranteed 5-Minute Policy**: No way to bypass the 5-minute rule
2. **Comprehensive Monitoring**: Full visibility into security status
3. **Automatic Validation**: Runtime checks prevent configuration drift
4. **Production Safety**: Special validation for production environments
5. **Frontend Security**: Frontend cannot use incorrect timer values
6. **Audit Trail**: All security events are logged

## 🔧 Maintenance

### Regular Checks
1. Run security validation command regularly
2. Monitor security logs for violations
3. Check security report endpoint
4. Verify frontend-backend synchronization

### Updates
- All OTP-related changes must maintain 5-minute policy
- New components must use centralized configuration
- Security validation must pass before deployment

This implementation ensures that the 5-minute OTP expiration rule is **never** bypassed, providing comprehensive security coverage across the entire application stack.
