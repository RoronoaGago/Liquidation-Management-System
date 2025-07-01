# from celery import shared_task
# from django.utils import timezone
# from django.core.mail import send_mail
# from django.template.loader import render_to_string
# from django.conf import settings
# from .models import RequestManagement, LiquidationManagement
# from datetime import timedelta

from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import LiquidationManagement

@shared_task
def check_liquidation_reminders():
    liquidations = LiquidationManagement.objects.filter(
        status='downloaded',
        liquidation_deadline__gt=timezone.now().date()
    )
    for liquidation in liquidations:
        liquidation.check_and_send_reminders()


@shared_task
def send_liquidation_reminder(liquidation_id, days_left):
    try:
        liquidation = LiquidationManagement.objects.get(pk=liquidation_id)
        if liquidation.status != 'liquidated':
            user = liquidation.request.user
            subject = f"Reminder: {days_left} days left to liquidate (Liquidation {liquidation.LiquidationID})"
            message = render_to_string(
                'emails/liquidation_reminder.txt',
                {'user': user, 'liquidation': liquidation, 'days_left': days_left}
            )
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
    except LiquidationManagement.DoesNotExist:
        pass

@shared_task
def send_liquidation_demand_letter(liquidation_id):
    try:
        liquidation = LiquidationManagement.objects.get(pk=liquidation_id)
        if liquidation.status != 'liquidated':
            user = liquidation.request.user
            subject = f"DEMAND LETTER: Unliquidated Liquidation {liquidation.LiquidationID}"
            message = render_to_string(
                'emails/liquidation_demand_letter.txt',
                {'user': user, 'liquidation': liquidation}
            )
            send_mail(
                subject,
                message,
                settings.DEFAULT_FROM_EMAIL,
                [user.email],
                fail_silently=True,
            )
    except LiquidationManagement.DoesNotExist:
        pass
