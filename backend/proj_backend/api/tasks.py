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
from datetime import date
from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from .models import LiquidationManagement, RequestManagement, Notification, User
import logging
logger = logging.getLogger(__name__)

@shared_task
def check_liquidation_reminders():
    today = timezone.now().date()

    liquidations = LiquidationManagement.objects.filter(
        status__in=['draft', 'submitted', 'resubmit'],
        request__downloaded_at__isnull=False
    ).exclude(status='liquidated')

    for liquidation in liquidations:
        deadline = liquidation.liquidation_deadline
        if deadline:
            days_left = (deadline - today).days
            # Now decide what to do (reminders, updates, etc.)
            liquidation.check_and_send_reminders()
@shared_task
def send_liquidation_reminder(liquidation_id, days_left):
    try:
        liquidation = LiquidationManagement.objects.get(pk=liquidation_id)
        if liquidation.status != 'liquidated':
            user = liquidation.request.user
            deadline = liquidation.liquidation_deadline 
            days_left = (deadline - timezone.now().date()).days
            if days_left in [15,5,1]:
                context = {
                    'recipient_name': user.get_full_name(),
                    'request_id': liquidation.request.request_id,
                    'days_left': days_left,
                    'deadline': deadline,
                    'now': timezone.now(),
                    'contact_email': settings.DEFAULT_FROM_EMAIL,
                }
            html_message = render_to_string(
                'emails/liquidation_reminder.html',
                context
            )
            send_mail(
                subject=f"Reminder: {days_left} days left to liquidate (Liquidation {liquidation.LiquidationID})",
                message="This is a reminder to liquidate your request.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
                html_message=html_message,
            )
    except LiquidationManagement.DoesNotExist:
        pass


@shared_task
def send_liquidation_demand_letter(liquidation_id):
    try:
        liquidation = LiquidationManagement.objects.get(pk=liquidation_id)
        if liquidation.status != 'liquidated':
            user = liquidation.request.user
            # Prepare table data for advances (customize as needed)
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
                'deadline': (liquidation.request.downloaded_at + timezone.timedelta(days=35)).date() if liquidation.request.downloaded_at else '',
                'items': items,
                'total_amount': total_amount,
            }
            html_message = render_to_string(
                'emails/liquidation_demand_letter.html',
                context
            )
            send_mail(
                subject=f"DEMAND LETTER: Unliquidated Liquidation {liquidation.LiquidationID}",
                message="This is a formal demand letter for overdue liquidation.",
                from_email=settings.DEFAULT_FROM_EMAIL,
                recipient_list=[user.email],
                fail_silently=True,
                html_message=html_message,
            )
    except LiquidationManagement.DoesNotExist:
        pass


@shared_task
def send_urgent_liquidation_reminders():
    """
    Send reminder emails for all liquidations with 15 days or less before deadline,
    and not yet liquidated.
    """
    from django.utils import timezone
    from datetime import timedelta
    
    today = timezone.now().date()
    
    # Calculate the cutoff date for downloaded_at (45 days ago means 15 days left)
    cutoff_date = today - timedelta(days=15)  # 15 days have passed since download
    
    urgent_liquidations = LiquidationManagement.objects.filter(
        status__in=['downloaded', 'draft', 'resubmit', 'submitted'],
        request__downloaded_at__isnull=False,
        request__downloaded_at__lte=timezone.now() - timedelta(days=15)  # At least 15 days have passed
    ).exclude(status='liquidated')
    
    for liquidation in urgent_liquidations:
        if liquidation.liquidation_deadline:  # Check property exists
            days_left = (liquidation.liquidation_deadline - today).days
            if 0 < days_left <= 15:  # Only send if 1-15 days remaining
                user = liquidation.request.user
                context = {
                    'recipient_name': user.get_full_name(),
                    'request_id': liquidation.request.request_id,
                    'days_left': days_left,
                    'deadline': liquidation.liquidation_deadline,
                    'now': timezone.now(),
                    'contact_email': settings.DEFAULT_FROM_EMAIL,
                }
                html_message = render_to_string(
                    'emails/liquidation_reminder.html',
                    context
                )
                send_mail(
                    subject=f"Reminder: {days_left} days left to liquidate (Liquidation {liquidation.LiquidationID})",
                    message="This is a reminder to liquidate your request.",
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    recipient_list=[user.email],
                    fail_silently=True,
                    html_message=html_message,
                )


@shared_task
def update_liquidation_remaining_days():
    LiquidationManagement.update_all_remaining_days()
    
@shared_task
def process_advanced_requests():
    """
    Daily task to convert 'advanced' requests to 'pending' when their target month arrives.
    This makes them visible to superintendents for approval.
    """
    today = date.today()
    current_month_year = f"{today.year:04d}-{today.month:02d}"
    
    # Find all advanced requests whose target month has arrived
    advanced_requests = RequestManagement.objects.filter(
        status='advanced',
        request_monthyear=current_month_year
    )
    
    updated_count = 0
    notifications_sent = 0
    
    try:
        with transaction.atomic():
            for request in advanced_requests:
                # Update status to pending
                old_status = request.status
                request._old_status = old_status
                request.status = 'pending'
                request._status_changed_by = None  # System change, not user change
                request.save(update_fields=['status'])
                
                updated_count += 1
                logger.info(f"Request {request.request_id} changed from {old_status} to {request.status}")
                
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
                superintendents = User.objects.filter(role='superintendent')
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
        
        logger.info(f"Successfully processed {updated_count} advanced requests, sent {notifications_sent} notifications")
        return f"Processed {updated_count} requests, sent {notifications_sent} notifications"
        
    except Exception as e:
        logger.error(f"Failed to process advanced requests: {str(e)}")
        raise

@shared_task
def monthly_request_status_audit():
    """
    Monthly audit task to ensure request statuses are correct based on current date.
    This is a safety net to catch any missed transitions.
    """
    today = date.today()
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
                req_year, req_month = map(int, request.request_monthyear.split('-'))
                current_year, current_month = today.year, today.month
                
                if (req_year, req_month) <= (current_year, current_month):
                    request._old_status = request.status
                    request.status = 'pending'
                    request.save(update_fields=['status'])
                    corrections_made += 1
                    
                    issue = f"Corrected request {request.request_id}: {request.request_monthyear} from advanced to pending"
                    issues_found.append(issue)
                    logger.warning(issue)
                    
            except (ValueError, AttributeError) as e:
                error_msg = f"Invalid request_monthyear format for request {request.request_id}: {request.request_monthyear}"
                issues_found.append(error_msg)
                logger.error(error_msg)
        
        # Check for requests that should be advanced but are marked as pending for future months
        incorrect_pending = RequestManagement.objects.filter(
            status='pending',
            request_monthyear__gt=current_month_year  # Future months marked as pending
        )
        
        for request in incorrect_pending:
            try:
                req_year, req_month = map(int, request.request_monthyear.split('-'))
                current_year, current_month = today.year, today.month
                
                if (req_year, req_month) > (current_year, current_month):
                    request._old_status = request.status
                    request.status = 'advanced'
                    request.save(update_fields=['status'])
                    corrections_made += 1
                    
                    issue = f"Corrected request {request.request_id}: {request.request_monthyear} from pending to advanced"
                    issues_found.append(issue)
                    logger.warning(issue)
                    
            except (ValueError, AttributeError) as e:
                error_msg = f"Invalid request_monthyear format for request {request.request_id}: {request.request_monthyear}"
                issues_found.append(error_msg)
                logger.error(error_msg)
        
        result_msg = f"Monthly audit completed. Corrections made: {corrections_made}, Issues found: {len(issues_found)}"
        logger.info(result_msg)
        
        # If significant issues found, you might want to send an admin alert
        if corrections_made > 0:
            admin_users = User.objects.filter(role='admin')
            for admin in admin_users:
                Notification.objects.create(
                    notification_title="Monthly Request Status Audit Report",
                    details=f"Audit corrected {corrections_made} request statuses. Check logs for details.",
                    receiver=admin,
                    sender=None
                )
        
        return {
            'corrections_made': corrections_made,
            'issues_found': issues_found,
            'summary': result_msg
        }
        
    except Exception as e:
        logger.error(f"Failed to complete monthly audit: {str(e)}")
        raise
