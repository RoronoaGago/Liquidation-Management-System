# from celery import shared_task
# from django.utils import timezone
# from django.core.mail import send_mail
# from django.template.loader import render_to_string
# from django.conf import settings
# from .models import RequestManagement, LiquidationManagement
# from datetime import timedelta
# tasks.py
from celery import shared_task
from django.utils import timezone
from django.db import transaction
from datetime import date, timedelta
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from django.core.cache import cache
from .models import LiquidationManagement, RequestManagement, Notification, User
import logging
import time
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

def get_current_date() -> date:
    """
    Standardized method to get current date with timezone awareness.
    """
    return timezone.now().date()

def get_config_value(key: str, default_value):
    """
    Helper function to get configuration values with defaults.
    """
    return getattr(settings, key, default_value)

def get_liquidation_deadline(liquidation: LiquidationManagement, deadline_days: int = 30) -> Optional[date]:
    """
    Standardized method to calculate liquidation deadline.
    """
    try:
        if liquidation and liquidation.request and liquidation.request.downloaded_at:
            return (liquidation.request.downloaded_at + timedelta(days=deadline_days)).date()
    except (AttributeError, TypeError) as e:
        logger.error(f"Error calculating deadline for liquidation {getattr(liquidation, 'LiquidationID', 'unknown')}: {e}")
    return None

def is_user_rate_limited(user_id: int) -> bool:
    """
    Check if user has exceeded email rate limit for today.
    """
    rate_limit = get_config_value('EMAIL_RATE_LIMIT_PER_USER_PER_DAY', 5)
    cache_key = f"email_rate_limit_{user_id}_{timezone.now().date()}"
    
    current_count = cache.get(cache_key, 0)
    return current_count >= rate_limit

def increment_user_email_count(user_id: int) -> None:
    """
    Increment user's email count for rate limiting.
    """
    cache_key = f"email_rate_limit_{user_id}_{timezone.now().date()}"
    cache.set(cache_key, cache.get(cache_key, 0) + 1, timeout=86400)  # 24 hours

def send_reminder_with_race_condition_protection(liquidation: LiquidationManagement, days_left: int, today: date) -> bool:
    """
    Send reminder with race condition protection using atomic transaction.
    """
    try:
        with transaction.atomic():
            # Lock the request row to prevent race conditions
            request = RequestManagement.objects.select_for_update().get(
                pk=liquidation.request.pk
            )
            
            # Check if reminder already sent today
            if request.last_reminder_sent == today:
                return False
            
            # Send the reminder
            send_liquidation_reminder.delay(liquidation.pk, days_left)
            
            # Update the request
            request.last_reminder_sent = today
            request.save(update_fields=['last_reminder_sent'])
            
            # Increment rate limit counter
            increment_user_email_count(liquidation.request.user.id)
            
            return True
    except Exception as e:
        logger.error(f"Error in race condition protection for reminder: {e}")
        return False

def send_demand_letter_with_race_condition_protection(liquidation: LiquidationManagement, today: date) -> bool:
    """
    Send demand letter with race condition protection using atomic transaction.
    """
    try:
        with transaction.atomic():
            # Lock the request row to prevent race conditions
            request = RequestManagement.objects.select_for_update().get(
                pk=liquidation.request.pk
            )
            
            # Check if demand letter already sent
            if request.demand_letter_sent:
                return False
            
            # Send the demand letter
            send_liquidation_demand_letter.delay(liquidation.pk)
            
            # Update the request
            request.demand_letter_sent = True
            request.demand_letter_date = today
            request.save(update_fields=['demand_letter_sent', 'demand_letter_date'])
            
            # Increment rate limit counter
            increment_user_email_count(liquidation.request.user.id)
            
            return True
    except Exception as e:
        logger.error(f"Error in race condition protection for demand letter: {e}")
        return False

@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def check_liquidation_reminders(self):
    """
    Comprehensive liquidation reminder system with improved error handling,
    rate limiting, and efficient database queries.
    """
    today = get_current_date()
    logger.info(f"Starting comprehensive liquidation reminder check for {today}")

    # Get configuration from settings
    reminder_days = get_config_value('LIQUIDATION_REMINDER_DAYS', [15, 5, 0])
    deadline_days = get_config_value('LIQUIDATION_DEADLINE_DAYS', 30)
    
    reminder_stats = {
        'total_processed': 0,
        'reminders_sent': 0,
        'demand_letters_sent': 0,
        'errors': 0,
        'rate_limited': 0,
        'start_time': time.time()
    }

    # Process liquidations in batches to avoid memory issues
    batch_size = 100
    offset = 0
    
    while True:
        # Get liquidations with pagination
        liquidations = LiquidationManagement.objects.filter(
            status__in=['draft', 'submitted', 'resubmit'],
            request__downloaded_at__isnull=False
        ).exclude(status='liquidated').select_related(
            'request__user', 'request__user__school'
        )[offset:offset + batch_size]
        
        if not liquidations:
            break
            
        for liquidation in liquidations:
            try:
                reminder_stats['total_processed'] += 1
                
                # Skip if already liquidated (redundant check but kept for safety)
                if liquidation.status == 'liquidated':
                    continue

                # Calculate deadline using standardized method
                deadline = get_liquidation_deadline(liquidation, deadline_days)
                if not deadline:
                    logger.warning(f"No deadline for liquidation {liquidation.LiquidationID}")
                    continue

                days_left = (deadline - today).days
                
                # Check rate limiting
                if is_user_rate_limited(liquidation.request.user.id):
                    reminder_stats['rate_limited'] += 1
                    logger.info(f"Rate limited user {liquidation.request.user.id} for liquidation {liquidation.LiquidationID}")
                    continue

                # Send reminder if it's a reminder day and not already sent today
                if days_left in reminder_days:
                    if send_reminder_with_race_condition_protection(liquidation, days_left, today):
                        reminder_stats['reminders_sent'] += 1
                        logger.info(f"Reminder sent for liquidation {liquidation.LiquidationID}, {days_left} days left")

                # Send demand letter if overdue and not already sent
                elif days_left <= 0 and not liquidation.request.demand_letter_sent:
                    if send_demand_letter_with_race_condition_protection(liquidation, today):
                        reminder_stats['demand_letters_sent'] += 1
                        logger.info(f"Demand letter sent for overdue liquidation {liquidation.LiquidationID}")

            except Exception as e:
                logger.error(f"Error processing liquidation {liquidation.LiquidationID}: {e}", exc_info=True)
                reminder_stats['errors'] += 1
        
        offset += batch_size

    # Calculate processing time
    processing_time = time.time() - reminder_stats['start_time']
    reminder_stats['processing_time_seconds'] = round(processing_time, 2)
    
    logger.info(f"Liquidation reminder processing completed: {reminder_stats}")
    return reminder_stats
@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_liquidation_reminder(self, liquidation_id, days_left):
    """
    Send liquidation reminder email with retry logic and comprehensive logging.
    """
    try:
        liquidation = LiquidationManagement.objects.get(pk=liquidation_id)
        if liquidation.status == 'liquidated':
            logger.info(f"Liquidation {liquidation.LiquidationID} already liquidated, skipping reminder")
            return
        
        user = liquidation.request.user
        deadline = get_liquidation_deadline(liquidation)
        
        if not deadline:
            logger.error(f"No deadline found for liquidation {liquidation.LiquidationID}")
            return
        
        context = {
            'recipient_name': user.get_full_name(),
            'request_id': liquidation.request.request_id,
            'days_left': days_left,
            'deadline': deadline,
            'now': timezone.now(),
            'contact_email': settings.DEFAULT_FROM_EMAIL,
        }
        
        html_message = render_to_string('emails/liquidation_reminder.html', context)
        
        # Send email with detailed logging
        result = send_mail(
            subject=f"Reminder: {days_left} days left to liquidate (Liquidation {liquidation.LiquidationID})",
            message="This is a reminder to liquidate your request.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,  # Don't fail silently to catch errors
            html_message=html_message,
        )
        
        logger.info(f"Reminder email sent successfully to {user.email} for liquidation {liquidation.LiquidationID}")
        
        # Create database notification
        Notification.objects.create(
            notification_title=f"Liquidation Reminder - {days_left} days remaining",
            details=f"Reminder sent for liquidation {liquidation.LiquidationID}. {days_left} days remaining until deadline.",
            receiver=user,
            sender=None
        )
        
    except LiquidationManagement.DoesNotExist:
        logger.error(f"Liquidation {liquidation_id} not found")
    except Exception as e:
        logger.error(f"Failed to send reminder for liquidation {liquidation_id}: {e}", exc_info=True)
        raise  # Re-raise to trigger retry


@shared_task(bind=True, autoretry_for=(Exception,), retry_kwargs={'max_retries': 3, 'countdown': 60})
def send_liquidation_demand_letter(self, liquidation_id):
    """
    Send liquidation demand letter with retry logic and comprehensive logging.
    """
    try:
        liquidation = LiquidationManagement.objects.get(pk=liquidation_id)
        if liquidation.status == 'liquidated':
            logger.info(f"Liquidation {liquidation.LiquidationID} already liquidated, skipping demand letter")
            return
        
        user = liquidation.request.user
        deadline = get_liquidation_deadline(liquidation)
        
        if not deadline:
            logger.error(f"No deadline found for liquidation {liquidation.LiquidationID}")
            return
        
        # Prepare table data for advances
        items = [{
            'number': 'N/A',
            'date': liquidation.request.downloaded_at.date() if liquidation.request.downloaded_at else '',
            'description': f"Liquidation for Request {liquidation.request.request_id}",
            'amount': sum(lp.amount for lp in liquidation.liquidation_priorities.all())
        }]
        total_amount = sum(item['amount'] for item in items)
        
        context = {
            'recipient_name': user.get_full_name(),
            'recipient_title': 'Mr./Ms.',
            'recipient_last_name': user.last_name,
            'sender_name': 'Finance Compliance Officer',
            'sender_position': 'Finance Compliance Officer',
            'office_name': 'La Union Schools Division Office',
            'contact_information': settings.DEFAULT_FROM_EMAIL,
            'legal_officer': 'Legal Office',
            'audit_leader': 'Audit Team Leader',
            'organization_name': 'Department of Education',
            'request_id': liquidation.request.request_id,
            'now': timezone.now(),
            'deadline': deadline,
            'items': items,
            'total_amount': total_amount,
        }
        
        html_message = render_to_string('emails/liquidation_demand_letter.html', context)
        
        # Send email with detailed logging
        result = send_mail(
            subject=f"DEMAND LETTER: Unliquidated Liquidation {liquidation.LiquidationID}",
            message="This is a formal demand letter for overdue liquidation.",
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=False,  # Don't fail silently to catch errors
            html_message=html_message,
        )
        
        logger.warning(f"Demand letter sent to {user.email} for overdue liquidation {liquidation.LiquidationID}")
        
        # Create database notification
        Notification.objects.create(
            notification_title="DEMAND LETTER: Overdue Liquidation",
            details=f"Formal demand letter sent for overdue liquidation {liquidation.LiquidationID}. Immediate action required.",
            receiver=user,
            sender=None
        )
        
    except LiquidationManagement.DoesNotExist:
        logger.error(f"Liquidation {liquidation_id} not found")
    except Exception as e:
        logger.error(f"Failed to send demand letter for liquidation {liquidation_id}: {e}", exc_info=True)
        raise  # Re-raise to trigger retry


# Removed send_urgent_liquidation_reminders - functionality consolidated into check_liquidation_reminders


@shared_task
def update_liquidation_remaining_days():
    LiquidationManagement.update_all_remaining_days()


@shared_task
def process_advanced_requests():
    """
    Daily task to convert 'advanced' requests to 'pending' when their target month arrives.
    This makes them visible to superintendents for approval.
    """
    today = get_current_date()
    current_month_year = f"{today.year:04d}-{today.month:02d}"
    
    # Find all advanced requests whose target month has arrived
    advanced_requests = RequestManagement.objects.filter(
        status='advanced',
        request_monthyear=current_month_year
    ).select_related('user')
    
    updated_count = 0
    notifications_sent = 0
    
    # Get superintendents once to avoid N+1 queries
    superintendents = list(User.objects.filter(role='superintendent'))
    
    try:
        for request in advanced_requests:
            try:
                with transaction.atomic():
                    # Lock the request row to prevent race conditions
                    locked_request = RequestManagement.objects.select_for_update().get(
                        pk=request.pk
                    )
                    
                    # Double-check status hasn't changed (race condition protection)
                    if locked_request.status != 'advanced':
                        logger.info(f"Request {request.request_id} status changed during processing, skipping")
                        continue
                    
                    # Update status to pending
                    old_status = locked_request.status
                    locked_request._old_status = old_status
                    locked_request.status = 'pending'
                    locked_request._status_changed_by = None  # System change, not user change
                    locked_request.save(update_fields=['status'])
                    
                    updated_count += 1
                    logger.info(f"Request {request.request_id} changed from {old_status} to {locked_request.status}")
                    
                    # Notify the user that their advance request is now pending
                    try:
                        Notification.objects.create(
                            notification_title="Your advance request is now pending approval",
                            details=f"Your advance request {request.request_id} for {request.request_monthyear} is now pending approval by the superintendent.",
                            receiver=request.user,
                            sender=None  # System notification
                        )
                    except Exception as e:
                        logger.error(f"Failed to create notification for request {request.request_id}: {str(e)}")
                    
                    # Notify superintendent(s) about new pending request
                    for superintendent in superintendents:
                        try:
                            Notification.objects.create(
                                notification_title=f"New pending request from {request.user.get_full_name()}",
                                details=f"Advanced request {request.request_id} for {request.request_monthyear} is now ready for your review.",
                                receiver=superintendent,
                                sender=request.user
                            )
                            notifications_sent += 1
                        except Exception as e:
                            logger.error(f"Failed to notify superintendent {superintendent.id} about request {request.request_id}: {str(e)}")
                            
            except RequestManagement.DoesNotExist:
                logger.warning(f"Request {request.request_id} no longer exists, skipping")
                continue
            except Exception as e:
                logger.error(f"Failed to process request {request.request_id}: {str(e)}", exc_info=True)
                # Continue processing other requests even if one fails
                continue
        
        logger.info(f"Successfully processed {updated_count} advanced requests, sent {notifications_sent} notifications")
        return f"Processed {updated_count} requests, sent {notifications_sent} notifications"
        
    except Exception as e:
        logger.error(f"Failed to process advanced requests: {str(e)}", exc_info=True)
        raise


@shared_task
def monthly_request_status_audit():
    """
    Monthly audit task to ensure request statuses are correct based on current date.
    This is a safety net to catch any missed transitions.
    """
    today = get_current_date()
    current_month_year = f"{today.year:04d}-{today.month:02d}"
    
    issues_found = []
    corrections_made = 0
    
    try:
        # Check for requests that should be pending but are still advanced
        incorrect_advanced = RequestManagement.objects.filter(
            status='advanced',
            request_monthyear__lt=current_month_year  # Past months still marked as advanced
        ).exclude(status__in=['rejected', 'liquidated'])
        
        for request in incorrect_advanced:
            try:
                with transaction.atomic():
                    # Lock the request to prevent race conditions
                    locked_request = RequestManagement.objects.select_for_update().get(pk=request.pk)
                    
                    req_year, req_month = map(int, locked_request.request_monthyear.split('-'))
                    current_year, current_month = today.year, today.month
                    
                    if (req_year, req_month) <= (current_year, current_month):
                        locked_request._old_status = locked_request.status
                        locked_request.status = 'pending'
                        locked_request.save(update_fields=['status'])
                        corrections_made += 1
                        
                        issue = f"Corrected request {locked_request.request_id}: {locked_request.request_monthyear} from advanced to pending"
                        issues_found.append(issue)
                        logger.warning(issue)
                    
            except (ValueError, AttributeError) as e:
                error_msg = f"Invalid request_monthyear format for request {request.request_id}: {request.request_monthyear}"
                issues_found.append(error_msg)
                logger.error(error_msg)
            except RequestManagement.DoesNotExist:
                logger.warning(f"Request {request.request_id} no longer exists during audit")
                continue
            except Exception as e:
                logger.error(f"Error processing request {request.request_id} in audit: {str(e)}")
                continue
        
        # Check for requests that should be advanced but are marked as pending for future months
        incorrect_pending = RequestManagement.objects.filter(
            status='pending',
            request_monthyear__gt=current_month_year  # Future months marked as pending
        )
        
        for request in incorrect_pending:
            try:
                with transaction.atomic():
                    # Lock the request to prevent race conditions
                    locked_request = RequestManagement.objects.select_for_update().get(pk=request.pk)
                    
                    req_year, req_month = map(int, locked_request.request_monthyear.split('-'))
                    current_year, current_month = today.year, today.month
                    
                    if (req_year, req_month) > (current_year, current_month):
                        locked_request._old_status = locked_request.status
                        locked_request.status = 'advanced'
                        locked_request.save(update_fields=['status'])
                        corrections_made += 1
                        
                        issue = f"Corrected request {locked_request.request_id}: {locked_request.request_monthyear} from pending to advanced"
                        issues_found.append(issue)
                        logger.warning(issue)
                    
            except (ValueError, AttributeError) as e:
                error_msg = f"Invalid request_monthyear format for request {request.request_id}: {request.request_monthyear}"
                issues_found.append(error_msg)
                logger.error(error_msg)
            except RequestManagement.DoesNotExist:
                logger.warning(f"Request {request.request_id} no longer exists during audit")
                continue
            except Exception as e:
                logger.error(f"Error processing request {request.request_id} in audit: {str(e)}")
                continue
        
        result_msg = f"Monthly audit completed. Corrections made: {corrections_made}, Issues found: {len(issues_found)}"
        logger.info(result_msg)
        
        # If significant issues found, you might want to send an admin alert
        if corrections_made > 0:
            admin_users = list(User.objects.filter(role='admin'))
            for admin in admin_users:
                try:
                    Notification.objects.create(
                        notification_title="Monthly Request Status Audit Report",
                        details=f"Audit corrected {corrections_made} request statuses. Check logs for details.",
                        receiver=admin,
                        sender=None
                    )
                except Exception as e:
                    logger.error(f"Failed to notify admin {admin.id} about audit results: {str(e)}")
        
        return {
            'corrections_made': corrections_made,
            'issues_found': issues_found,
            'summary': result_msg
        }
        
    except Exception as e:
        logger.error(f"Failed to complete monthly audit: {str(e)}")
        raise
