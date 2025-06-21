from celery import shared_task
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.conf import settings
from .models import RequestManagement, LiquidationManagement
from datetime import timedelta

@shared_task
def check_liquidation_status(request_id):
    """Final check on day 31 with demand letter"""
    request = RequestManagement.objects.get(request_id=request_id)
    
    if not hasattr(request, 'liquidation'):
        request.status = 'expired'
        request.save()
        send_demand_letter(request)

def send_reminder(request_id, days_remaining):
    """Generic reminder email sender"""
    request = RequestManagement.objects.get(request_id=request_id)
    
    if not hasattr(request, 'liquidation'):
        subject = f"URGENT: {days_remaining} day(s) remaining for liquidation (Request {request.request_id})"
        template = f'emails/reminder_{days_remaining}_day.txt'
        message = render_to_string(template, {
            'request': request,
            'days_remaining': days_remaining
        })
        send_mail(
            subject,
            message,
            settings.DEFAULT_FROM_EMAIL,
            [request.user.email, 'finance@yourdomain.com'],  # CC finance department
            fail_silently=False,
        )

def send_demand_letter(request):
    """Final demand letter on day 31"""
    subject = f"DEMAND LETTER: Unliquidated Request {request.request_id}"
    message = render_to_string('emails/demand_letter.txt', {
        'request': request,
        'user': request.user,
        'today': timezone.now().date()
    })
    send_mail(
        subject,
        message,
        'legal@yourdomain.com',  # From legal department
        [request.user.email, 'finance@yourdomain.com', 'management@yourdomain.com'],
        fail_silently=False,
    )