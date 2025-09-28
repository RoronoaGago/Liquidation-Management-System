"""
Budget allocation utilities for yearly budget management.
"""
from datetime import datetime, date
from django.utils import timezone
from django.db import transaction
from .models import School, YearlyBudgetAllocation, BudgetAllocationNotification, Notification, User
import logging

logger = logging.getLogger(__name__)


def is_first_monday_of_january(check_date=None):
    """
    Check if the given date is the first Monday of January.
    If no date is provided, uses today's date.
    """
    if check_date is None:
        check_date = timezone.now().date()
    
    # Check if it's January
    if check_date.month != 1:
        return False
    
    # Check if it's Monday (weekday() returns 0 for Monday)
    if check_date.weekday() != 0:
        return False
    
    # Check if it's within the first 7 days of January (first Monday)
    return 1 <= check_date.day <= 7


def should_send_budget_allocation_notification(year=None):
    """
    Check if a budget allocation notification should be sent for the given year.
    Returns True if:
    1. It's the first Monday of January for the given year
    2. No notification has been sent yet for that year
    """
    if year is None:
        year = timezone.now().year
    
    # Check if notification already exists for this year
    if BudgetAllocationNotification.objects.filter(year=year).exists():
        return False
    
    # Check if it's the first Monday of January
    return is_first_monday_of_january()


def create_budget_allocation_notification(year=None):
    """
    Create a budget allocation notification for the given year.
    Returns the notification if created, None if already exists.
    """
    if year is None:
        year = timezone.now().year
    
    # Check if notification already exists
    if BudgetAllocationNotification.objects.filter(year=year).exists():
        return None
    
    try:
        notification = BudgetAllocationNotification.objects.create(year=year)
        
        # Create notification for the division accountant
        accountant = User.objects.filter(role='accountant', is_active=True).first()
        if accountant:
            Notification.objects.create(
                notification_title=f"Budget Allocation Required for {year}",
                details=f"It's time to allocate yearly budgets for all schools for the year {year}. Please visit the Resource Allocation page to set the budgets.",
                receiver=accountant,
                sender=None  # System notification
            )
        
        logger.info(f"Created budget allocation notification for year {year}")
        return notification
        
    except Exception as e:
        logger.error(f"Error creating budget allocation notification for year {year}: {e}")
        return None


def get_schools_without_yearly_allocation(year=None):
    """
    Get all active schools that don't have a yearly budget allocation for the given year.
    """
    if year is None:
        year = timezone.now().year
    
    schools_without_allocation = School.objects.filter(
        is_active=True
    ).exclude(
        yearly_budget_allocations__year=year,
        yearly_budget_allocations__is_active=True
    )
    
    return schools_without_allocation


def handle_unliquidated_requests_from_previous_year():
    """
    Handle unliquidated requests from the previous year.
    This function should be called when transitioning to a new year.
    Returns information about unliquidated requests.
    """
    current_year = timezone.now().year
    previous_year = current_year - 1
    
    from .models import RequestManagement
    
    # Get all unliquidated requests from the previous year
    unliquidated_requests = RequestManagement.objects.filter(
        request_monthyear__startswith=str(previous_year),
        status__in=['pending', 'approved', 'downloaded', 'unliquidated']
    )
    
    unliquidated_schools = {}
    
    for request in unliquidated_requests:
        school = request.user.school
        if school:
            school_id = school.schoolId
            if school_id not in unliquidated_schools:
                unliquidated_schools[school_id] = {
                    'school': school,
                    'requests': []
                }
            unliquidated_schools[school_id]['requests'].append(request)
    
    return unliquidated_schools


def create_yearly_budget_allocations(school_budgets, year, allocated_by):
    """
    Create yearly budget allocations for multiple schools.
    
    Args:
        school_budgets: List of dicts with 'school_id' and 'yearly_budget'
        year: Year for the budget allocation
        allocated_by: User who is allocating the budgets
    
    Returns:
        List of created allocations and any errors
    """
    created_allocations = []
    errors = []
    
    with transaction.atomic():
        for budget_data in school_budgets:
            try:
                school_id = budget_data.get('school_id')
                yearly_budget = budget_data.get('yearly_budget', 0)
                notes = budget_data.get('notes', '')
                
                if not school_id:
                    errors.append({
                        'school_id': school_id,
                        'error': 'School ID is required'
                    })
                    continue
                
                # Get the school
                try:
                    school = School.objects.get(schoolId=school_id)
                except School.DoesNotExist:
                    errors.append({
                        'school_id': school_id,
                        'error': 'School not found'
                    })
                    continue
                
                # Deactivate any existing allocation for this year
                YearlyBudgetAllocation.objects.filter(
                    school=school,
                    year=year
                ).update(is_active=False)
                
                # Create new allocation
                allocation = YearlyBudgetAllocation.objects.create(
                    school=school,
                    year=year,
                    yearly_budget=yearly_budget,
                    allocated_by=allocated_by,
                    notes=notes
                )
                
                created_allocations.append(allocation)
                
            except Exception as e:
                errors.append({
                    'school_id': budget_data.get('school_id'),
                    'error': str(e)
                })
    
    return created_allocations, errors


def get_budget_allocation_status(year=None):
    """
    Get the current status of budget allocations for the given year.
    Returns information about allocated vs unallocated schools.
    """
    if year is None:
        year = timezone.now().year
    
    total_schools = School.objects.filter(is_active=True).count()
    allocated_schools = School.objects.filter(
        is_active=True,
        yearly_budget_allocations__year=year,
        yearly_budget_allocations__is_active=True
    ).count()
    
    unallocated_schools = total_schools - allocated_schools
    
    return {
        'year': year,
        'total_schools': total_schools,
        'allocated_schools': allocated_schools,
        'unallocated_schools': unallocated_schools,
        'allocation_percentage': (allocated_schools / total_schools * 100) if total_schools > 0 else 0
    }


def check_and_send_budget_notifications():
    """
    Check if budget allocation notifications should be sent and send them.
    This function should be called daily via a scheduled task.
    """
    current_date = timezone.now().date()
    current_year = current_date.year
    
    if is_first_monday_of_january(current_date):
        notification = create_budget_allocation_notification(current_year)
        if notification:
            logger.info(f"Sent budget allocation notification for year {current_year}")
            return True
    
    return False
