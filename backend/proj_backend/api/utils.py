import random
from django.utils import timezone
from django.core.mail import send_mail
from django.template.loader import render_to_string
from .email_utils import get_deped_logo_base64

def generate_otp():
    return ''.join(str(random.randint(0, 9)) for _ in range(6))

def send_otp_email(user, otp):
    context = {
        'user': user,
        'otp': otp,
        'now': timezone.now(),
        'ip': '',  # Optionally pass IP if available
        'location': '',  # Optionally pass location if available
        'device_info': '',  # Optionally pass device info if available
        'account_settings_url': '',  # Optionally pass URL if available
        'deped_logo_base64': get_deped_logo_base64(),  # Add base64 logo
    }
    html_message = render_to_string('emails/otp_notification.html', context)
    send_mail(
        subject="Your Login OTP Code",
        message=f"Your OTP code is: {otp}",
        from_email=None,
        recipient_list=[user.email],
        fail_silently=True,
        html_message=html_message,
    )