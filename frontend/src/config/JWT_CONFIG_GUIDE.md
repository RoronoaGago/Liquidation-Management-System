# JWT Configuration Guide

This guide explains how to manage JWT token settings in your Liquidation Management System.

## Configuration Location

All JWT-related settings are centralized in `frontend/src/config/api.ts`:

```typescript
export const JWT_CONFIG = {
  // Access token lifetime in minutes (should match backend SIMPLE_JWT.ACCESS_TOKEN_LIFETIME)
  ACCESS_TOKEN_LIFETIME_MINUTES: 900, // 15 hours
  
  // Refresh token lifetime in days (should match backend SIMPLE_JWT.REFRESH_TOKEN_LIFETIME)
  REFRESH_TOKEN_LIFETIME_DAYS: 7,
  
  // Buffer time in minutes to account for clock skew and network delays
  CLOCK_SKEW_BUFFER_MINUTES: 5,
  
  // Inactivity timeout in minutes (frontend-only setting)
  INACTIVITY_TIMEOUT_MINUTES: 60, // 1 hour
} as const;
```

## How to Change Settings

### 1. Change JWT Token Lifetime

To change how long JWT tokens last:

1. **Update Frontend**: Change `ACCESS_TOKEN_LIFETIME_MINUTES` in `frontend/src/config/api.ts`
2. **Update Backend**: Change `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME` in `backend/proj_backend/backend/settings.py`

**Example**: To change from 15 hours to 8 hours:
```typescript
// Frontend
ACCESS_TOKEN_LIFETIME_MINUTES: 480, // 8 hours
```

```python
# Backend
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=480),  # 8 hours
    # ... other settings
}
```

### 2. Change Inactivity Timeout

To change how long users can be inactive before logout:

1. **Update Frontend**: Change `INACTIVITY_TIMEOUT_MINUTES` in `frontend/src/config/api.ts`

**Example**: To change from 1 hour to 30 minutes:
```typescript
INACTIVITY_TIMEOUT_MINUTES: 30, // 30 minutes
```

### 3. Change Clock Skew Buffer

To change the buffer time for clock synchronization:

```typescript
CLOCK_SKEW_BUFFER_MINUTES: 10, // 10 minutes buffer
```

## Important Notes

### ⚠️ Backend-Frontend Synchronization

- **JWT Token Lifetime**: Must match between frontend and backend
- **Refresh Token Lifetime**: Must match between frontend and backend
- **Clock Skew Buffer**: Frontend-only setting
- **Inactivity Timeout**: Frontend-only setting

### 🔄 Automatic Updates

When you change these settings, the changes will automatically apply to:

- Login process
- Token refresh process
- OTP verification
- Session time calculations
- Inactivity detection

### 🧪 Testing Changes

After making changes:

1. **Clear browser storage**:
   ```javascript
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Log in again** and test:
   ```javascript
   checkSessionTime()  // Check session time
   debugSession()      // Detailed debugging
   ```

## Current Settings

- **JWT Token Lifetime**: 900 minutes (15 hours)
- **Refresh Token Lifetime**: 7 days
- **Clock Skew Buffer**: 5 minutes
- **Inactivity Timeout**: 60 minutes (1 hour)

## Files That Use This Configuration

- `frontend/src/api/auth.ts` - Login function
- `frontend/src/api/axios.ts` - Token refresh & OTP verification
- `frontend/src/context/AuthContext.tsx` - Auth context & inactivity detection
- `frontend/src/utils/sessionTime.ts` - Session time calculations
- `frontend/src/utils/debugSession.ts` - Debug utilities

## Environment-Specific Configuration

For different environments (dev, staging, prod), you can modify the configuration:

```typescript
const getJwtConfig = () => {
  const isDevelopment = import.meta.env.DEV;
  const isProduction = import.meta.env.PROD;

  if (isDevelopment) {
    return {
      ACCESS_TOKEN_LIFETIME_MINUTES: 60, // 1 hour for dev
      INACTIVITY_TIMEOUT_MINUTES: 15,   // 15 minutes for dev
      // ... other settings
    };
  }

  if (isProduction) {
    return {
      ACCESS_TOKEN_LIFETIME_MINUTES: 900, // 15 hours for prod
      INACTIVITY_TIMEOUT_MINUTES: 60,    // 1 hour for prod
      // ... other settings
    };
  }

  // Default fallback
  return {
    ACCESS_TOKEN_LIFETIME_MINUTES: 900,
    INACTIVITY_TIMEOUT_MINUTES: 60,
    // ... other settings
  };
};

export const JWT_CONFIG = getJwtConfig();
```
