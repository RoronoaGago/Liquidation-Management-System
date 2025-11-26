# Session Time Utilities

This directory contains utilities to track and display remaining session time in your Liquidation Management System.

## Overview

Your application has two types of session timeouts:

1. **JWT Access Token**: 900 minutes (15 hours) - configured in `frontend/src/config/api.ts` (JWT_CONFIG)
2. **Inactivity Timeout**: 60 minutes (1 hour) - configured in `frontend/src/config/api.ts` (JWT_CONFIG)

## Files Created

### Core Utilities
- `sessionTime.ts` - Core functions to calculate remaining session time
- `useSessionTime.ts` - React hook for real-time session time tracking
- `checkSessionTime.ts` - Console utility for debugging

### Components
- `SessionTimer.tsx` - Simple component to display session time
- `SessionStatusExample.tsx` - Example showing how to use the utilities

## How to Use

### 1. Check Session Time in Browser Console

Open your browser's developer console and type:
```javascript
checkSessionTime()
```

This will display:
- Remaining time in MM:SS format
- JWT token status
- Session expiration details

### 2. Use the React Hook

```tsx
import { useSessionTime } from '../hooks/useSessionTime';

function MyComponent() {
  const sessionStatus = useSessionTime();
  
  return (
    <div>
      <p>Time remaining: {sessionStatus.formattedTime}</p>
      <p>Minutes left: {sessionStatus.remainingMinutes}</p>
      <p>Status: {sessionStatus.isExpired ? 'Expired' : 'Active'}</p>
    </div>
  );
}
```

### 3. Use the Session Timer Component

```tsx
import SessionTimer from '../components/SessionTimer';

function MyComponent() {
  return (
    <div>
      <SessionTimer />
      <SessionTimer showDetails={true} />
    </div>
  );
}
```

### 4. Direct Utility Functions

```tsx
import { getRemainingSessionTime, getSessionStatus } from '../utils/sessionTime';

// Get remaining minutes
const minutesLeft = getRemainingSessionTime();

// Get full status object
const status = getSessionStatus();
console.log(status.remainingMinutes); // minutes
console.log(status.remainingSeconds); // seconds
console.log(status.formattedTime);    // "MM:SS"
console.log(status.isExpired);        // boolean
```

## Session Time Details

### JWT Token Lifetime
- **Duration**: 900 minutes (15 hours)
- **Frontend Configuration**: `frontend/src/config/api.ts` - `JWT_CONFIG.ACCESS_TOKEN_LIFETIME_MINUTES`
- **Backend Configuration**: `backend/proj_backend/backend/settings.py` - `SIMPLE_JWT.ACCESS_TOKEN_LIFETIME = timedelta(minutes=900)`

### Inactivity Timeout
- **Duration**: 60 minutes (1 hour)
- **Configuration**: `frontend/src/config/api.ts` - `JWT_CONFIG.INACTIVITY_TIMEOUT_MINUTES`
- **Behavior**: Shows logout modal after 60 minutes of inactivity
- **Events Tracked**: mousedown, mousemove, keypress, scroll, touchstart, click, keydown

### Token Refresh
- **Automatic**: Tokens are automatically refreshed when making API calls
- **Buffer**: 5-minute buffer added to account for clock skew
- **Storage**: Tokens stored in sessionStorage (more secure) with localStorage fallback

## Integration Examples

### Add to Navigation Bar
```tsx
// In your navigation component
import SessionTimer from '../components/SessionTimer';

function Navigation() {
  return (
    <nav className="flex justify-between items-center">
      <div>Your App</div>
      <SessionTimer className="text-sm" />
    </nav>
  );
}
```

### Add to Dashboard
```tsx
// In your dashboard
import { useSessionTime } from '../hooks/useSessionTime';

function Dashboard() {
  const sessionStatus = useSessionTime();
  
  return (
    <div>
      <h1>Dashboard</h1>
      {sessionStatus.remainingMinutes < 30 && (
        <div className="bg-yellow-100 p-2 rounded">
          ⚠️ Your session will expire in {sessionStatus.remainingMinutes} minutes
        </div>
      )}
    </div>
  );
}
```

## Current Session Time

To check your current session time right now:

1. Open browser console (F12)
2. Type: `checkSessionTime()`
3. Press Enter

The output will show you exactly how many minutes until your session expires.
