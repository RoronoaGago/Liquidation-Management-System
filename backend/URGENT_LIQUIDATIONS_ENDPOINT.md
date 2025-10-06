# Urgent Liquidations Endpoint

## Overview
A new dedicated API endpoint has been created to efficiently fetch urgent liquidations (≤15 days remaining) for school heads. This replaces the previous approach of fetching all liquidations and filtering on the frontend.

## Endpoint Details

### URL
```
GET /api/urgent-liquidations/
```

### Authentication
- Requires authentication (Bearer token)
- Only accessible by users with role `school_head`

### Response Format
```json
{
  "liquidations": [
    {
      "LiquidationID": 1,
      "status": "draft",
      "remaining_days": 5,
      "request": {
        "request_id": "REQ-2024-001",
        "request_monthyear": "2024-01",
        "user": {
          "id": 1,
          "email": "user@example.com",
          "first_name": "John",
          "last_name": "Doe"
        }
      },
      "liquidation_priorities": [...],
      "documents": [...],
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ],
  "summary": {
    "total_urgent": 1,
    "overdue": 0,
    "critical": 1,
    "warning": 0
  },
  "last_checked": "2024-01-15T10:30:00Z"
}
```

### Query Parameters
- Automatically filters for liquidations with `remaining_days <= 15`
- Only includes liquidations with status `draft` or `resubmit`
- Orders by `remaining_days` (ascending) then by `created_at` (descending)

## Frontend Changes

### New TypeScript Interfaces
- `LiquidationManagement`: Complete liquidation data structure
- `UrgentLiquidationsResponse`: API response structure
- `UrgencyLevel`: Type for urgency classification
- `LiquidationRequest`: Request data structure

### New Service
- `liquidationService.getUrgentLiquidations()`: Fetches urgent liquidations
- Proper error handling and type safety
- Centralized API calls for liquidation operations

### Updated Components
- `LiquidationReminder`: Now uses the new endpoint and types
- `LiquidationAlertBanner`: Updated to use new service
- Improved error handling and loading states
- Better type safety throughout

## Benefits

1. **Performance**: Only fetches relevant data instead of all liquidations
2. **Type Safety**: Proper TypeScript interfaces prevent runtime errors
3. **Maintainability**: Centralized API calls in service layer
4. **User Experience**: Faster loading and better error handling
5. **Scalability**: Backend filtering reduces network overhead

## Testing

Run the test script to verify the endpoint structure:
```bash
cd backend
python test_urgent_liquidations_endpoint.py
```

## Migration Notes

- The old approach of fetching all liquidations and filtering on frontend is deprecated
- WebSocket integration remains disabled until Redis compatibility is resolved
- All existing functionality is preserved with improved performance
