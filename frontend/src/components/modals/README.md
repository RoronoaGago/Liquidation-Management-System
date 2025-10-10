# Yearly Budget Modal Implementation

## Overview
The Yearly Budget Modal is a reminder system for Division Accountants to allocate yearly budgets for schools. It appears automatically when certain conditions are met and helps ensure all schools have their budgets allocated for the current year.

## Components

### YearlyBudgetModal.tsx
A React component that displays a modal dialog with:
- Budget allocation status overview
- Progress bar showing completion percentage
- Information cards showing schools with/without budgets
- Important information about budget allocation
- Action buttons (Do It Later / Proceed to Allocation)

### useYearlyBudgetModal.ts
A custom React hook that manages:
- Modal state and visibility logic
- API calls to fetch budget status and first Monday info
- Local storage for dismissal tracking
- Navigation to resource allocation page
- Periodic data refresh (every 5 minutes)

## Features

### Automatic Display Logic
The modal appears when ALL of these conditions are met:
1. It's after the first Monday of January
2. Not all schools have yearly budgets allocated
3. User hasn't dismissed the modal today
4. User is a Division Accountant

### Dismissal Behavior
- "Do It Later" - Dismisses modal for the current day only
- "Proceed to Allocation" - Navigates to `/resource-allocation` page
- Modal will reappear the next day if conditions are still met

### Data Sources
- `/budget-allocations/check-status/` - Gets budget allocation status
- `/budget-allocations/first-monday-info/` - Gets first Monday of January info

## Integration

### DivisionAccountantDashboard
The modal is integrated into the Division Accountant Dashboard and will automatically appear when the user visits the dashboard if the conditions are met.

### Navigation
- Proceed button navigates to `/resource-allocation` page
- Uses React Router's `useNavigate` hook

## Testing

### Manual Testing
1. Login as a Division Accountant
2. Navigate to the dashboard
3. If it's after the first Monday of January and not all schools have budgets, the modal should appear
4. Test "Do It Later" - modal should close and not reappear until next day
5. Test "Proceed to Allocation" - should navigate to resource allocation page

### API Testing
You can test the API endpoints directly:
```bash
# Check budget status
GET /api/budget-allocations/check-status/

# Get first Monday info
GET /api/budget-allocations/first-monday-info/
```

### Local Storage Testing
Check browser's local storage for:
- Key: `yearlyBudgetModalDismissed`
- Value: Current date string (e.g., "Mon Jan 15 2024")

## Configuration

### Refresh Interval
The modal refreshes data every 5 minutes (300,000ms) to stay up-to-date.

### Dismissal Duration
Modal dismissal lasts for the current day only. It will reappear the next day if conditions are still met.

## Dependencies
- React Router (for navigation)
- Axios (for API calls)
- Lucide React (for icons)
- Custom UI components (Dialog, Button, etc.)
