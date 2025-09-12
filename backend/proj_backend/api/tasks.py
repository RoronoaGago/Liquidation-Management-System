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
from django.core.mail import send_mail, EmailMessage
from django.template.loader import render_to_string
from django.conf import settings
from .models import LiquidationManagement


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
