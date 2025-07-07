# signals.py
from django.db.models.signals import post_save
from django.core.mail import send_mail
from django.dispatch import receiver
from .models import RequestManagement, LiquidationManagement, Notification
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from datetime import timedelta
from .tasks import send_liquidation_reminder, send_liquidation_demand_letter
from django.contrib.auth.signals import user_logged_in
from django.urls import reverse
from django.utils import timezone
import logging
import geoip2.database
import user_agents

logger = logging.getLogger(__name__)
User = get_user_model()

# Existing request management signals


@receiver(post_save, sender=RequestManagement)
def handle_request_notifications(sender, instance, created, **kwargs):
    try:
        if created:
            create_new_request_notification(instance)
        else:
            handle_status_change_notification(instance)
    except Exception as e:
        logger.error(
            f"Failed to create notification for request {getattr(instance, 'request_id', 'unknown')}: {str(e)}")


def create_new_request_notification(instance):
    superintendent = User.objects.filter(role='superintendent').first()
    if superintendent:
        Notification.objects.create(
            notification_title=f"New Request from {instance.user.get_full_name()}",
            details=f"New request {instance.request_id} has been submitted for {instance.request_monthyear}",
            receiver=superintendent,
            sender=instance.user
        )


def send_notification_email(subject, message, recipient, template_name=None, context=None):
    if recipient and getattr(recipient, 'email', None):
        html_message = None
        if template_name and context:
            # Render the email body from template
            html_message = render_to_string(template_name, context)
            # Optionally, also render a plain text version for fallback
            if template_name.endswith('.html'):
                # Try to find a .txt fallback with the same name
                txt_template = template_name.replace('.html', '.txt')
                try:
                    message = render_to_string(txt_template, context)
                except Exception:
                    pass  # If no .txt template, keep the original message
        send_mail(
            subject=subject,
            message=message,
            from_email=None,  # Uses DEFAULT_FROM_EMAIL
            recipient_list=[recipient.email],
            fail_silently=True,
            html_message=html_message,  # This enables HTML email
        )


def handle_status_change_notification(instance):
    if not hasattr(instance, '_old_status'):
        return

    if instance._old_status != instance.status:
        notification_map = {
            'rejected': {
                'title': "Your request was rejected",
                'details': f"Request {instance.request_id} was rejected. Comment: {instance.rejection_comment}"
            },
            'approved': {
                'title': "Your request was approved",
                'details': f"Request {instance.request_id} has been approved"
            },
            'downloaded': {
                'title': "Request ready for liquidation",
                'details': f"Request {instance.request_id} has been processed and is ready for liquidation"
            }
        }

        if instance.status in notification_map:
            # Notify the request owner
            Notification.objects.create(
                notification_title=notification_map[instance.status]['title'],
                details=notification_map[instance.status]['details'],
                receiver=instance.user,
                sender=getattr(instance, '_status_changed_by', None)
            )
            # Prepare context for the email template
            context = {
                "user": instance.user,
                "object": instance,
                "object_type": "request",
                "status": instance.status,
            }
            # Send email to the request owner using the template
            send_notification_email(
                subject=notification_map[instance.status]['title'],
                # fallback if template fails
                message=notification_map[instance.status]['details'],
                recipient=instance.user,
                template_name="emails/request_status_change.html",
                context=context
            )

            # If approved, also notify the division accountant
            if instance.status == 'approved':
                accountant = User.objects.filter(role='accountant').first()
                if accountant:
                    Notification.objects.create(
                        notification_title=f"Request {instance.request_id} approved",
                        details=f"Request {instance.request_id} has been approved and is ready for accounting.",
                        receiver=accountant,
                        sender=getattr(instance, '_status_changed_by', None)
                    )
                    # Send email to the accountant (simple message, no template)
                    send_notification_email(
                        subject=f"Request {instance.request_id} approved",
                        message=f"Request {instance.request_id} has been approved and is ready for accounting.",
                        recipient=accountant
                    )

# New liquidation management signals


@receiver(post_save, sender=LiquidationManagement)
def handle_liquidation_notifications(sender, instance, created, **kwargs):
    try:
        if created:
            create_new_liquidation_notification(instance)
        else:
            if instance.status == 'downloaded' and instance.downloaded_at:
                # Schedule reminders
                send_liquidation_reminder.apply_async(
                    args=[instance.pk, 15],
                    eta=instance.downloaded_at + timedelta(days=15)
                )
                send_liquidation_reminder.apply_async(
                    args=[instance.pk, 5],
                    eta=instance.downloaded_at + timedelta(days=25)
                )
                # Schedule demand letter on 30th day
                send_liquidation_demand_letter.apply_async(
                    args=[instance.pk],
                    eta=instance.downloaded_at + timedelta(days=30)
                )
            handle_liquidation_status_change(instance)
    except Exception as e:
        logger.error(
            f"Failed to create notification for liquidation {getattr(instance, 'LiquidationID', 'unknown')}: {str(e)}")


def create_new_liquidation_notification(instance):
    # Get the requestor's school district
    school = instance.request.user.school
    if not school or not school.district:
        return  # No school or district info, skip notification

    # Notify only the district admin for the requestor's district
    district_admins = User.objects.filter(
        role='district_admin',
        school_district=school.district
    )
    for admin in district_admins:
        Notification.objects.create(
            notification_title="New Liquidation Submitted",
            details=f"New liquidation {instance.LiquidationID} has been submitted for request {instance.request.request_id}",
            receiver=admin,
            sender=instance.request.user
        )


def handle_liquidation_status_change(instance):
    if not hasattr(instance, '_old_status') or instance._old_status == instance.status:
        return

    # Get the user who changed the status
    changed_by = getattr(instance, '_status_changed_by', None)

    # Notification mapping based on status changes
    status_notifications = {
        'under_review_district': {
            'title': "Liquidation Under District Review",
            'details': f"Your liquidation {instance.LiquidationID} is now under review by the district administrative assistant",
            'receivers': [instance.request.user],
            'additional_receivers': []
        },
        'under_review_division': {
            'title': "Liquidation Under Division Review",
            'details': f"Your liquidation {instance.LiquidationID} is now under review by the liquidator",
            'receivers': [instance.request.user],
            'additional_receivers': []
        },
        'resubmit': {
            'title': "Liquidation Needs Revision",
            'details': f"Your liquidation {instance.LiquidationID} needs revision. Comments: {instance.rejection_comment or 'No comments provided'}",
            'receivers': [instance.request.user],
            'additional_receivers': []
        },
        'approved_district': {
            'title': "Liquidation Approved by District",
            'details': f"Your liquidation {instance.LiquidationID} has been approved by the district",
            'receivers': [instance.request.user],
            'additional_receivers': User.objects.filter(role='liquidator')
        },
        'liquidated': {
            'title': "Liquidation Completed",
            'details': f"Your liquidation {instance.LiquidationID} has been fully processed and liquidated",
            'receivers': [instance.request.user],
            'additional_receivers': []
        },
        'submitted': {
            'title': "Liquidation Submitted",
            'details': f"Your liquidation {instance.LiquidationID} has been submitted.",
            'receivers': [instance.request.user],
            'additional_receivers': []
        }
    }

    if instance.status in status_notifications:
        notification_info = status_notifications[instance.status]

        # Notify primary receivers
        for receiver in notification_info['receivers']:
            Notification.objects.create(
                notification_title=notification_info['title'],
                details=notification_info['details'],
                receiver=receiver,
                sender=changed_by
            )
            # Prepare context for the email template
            context = {
                "user": receiver,
                "object": instance,
                "object_type": "liquidation",
                "status": instance.status,
            }
            # Send email to the receiver using the liquidation template
            send_notification_email(
                subject=notification_info['title'],
                message=notification_info['details'],
                recipient=receiver,
                template_name="emails/liquidation_status_change.html",
                context=context
            )

        # Notify additional receivers if any
        for receiver in notification_info['additional_receivers']:
            subject = f"Liquidation {instance.status.replace('_', ' ').title()}"
            message = f"Liquidation {instance.LiquidationID} for request {instance.request.request_id} is now {instance.status.replace('_', ' ')}"
            Notification.objects.create(
                notification_title=subject,
                details=message,
                receiver=receiver,
                sender=changed_by
            )
            # Prepare context for the email template
            context = {
                "user": receiver,
                "object": instance,
                "object_type": "liquidation",
                "status": instance.status,
            }
            # Send email to the additional receiver using the liquidation template
            send_notification_email(
                subject=subject,
                message=message,
                recipient=receiver,
                template_name="emails/liquidation_status_change.txt",
                context=context
            )


@receiver(user_logged_in)
def send_login_email(sender, user, request, **kwargs):
    # Get IP address
    ip_address = request.META.get('REMOTE_ADDR')
    
    # Get approximate location (requires GeoIP2 database)
    location = None
    try:
        with geoip2.database.Reader('path/to/GeoLite2-City.mmdb') as reader:
            response = reader.city(ip_address)
            location_parts = []
            if response.city.name:
                location_parts.append(response.city.name)
            if response.subdivisions.most_specific.name:
                location_parts.append(response.subdivisions.most_specific.name)
            if response.country.name:
                location_parts.append(response.country.name)
            location = ', '.join(location_parts)
    except Exception:
        pass
    
    # Parse user agent
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    agent = user_agents.parse(user_agent)
    device_info = f"{agent.get_device()} ({agent.get_browser()} {agent.browser.version_string})"
    
    # Prepare context
    context = {
        'user': user,
        'ip': ip_address,
        'login_time': timezone.now(),
        'location': location,
        'device_info': device_info,
        'account_settings_url': request.build_absolute_uri('/account/settings/'),
        'now': timezone.now(),
    }
    
    # Render both text and HTML versions
    text_message = render_to_string('emails/login_notification.txt', context)
    html_message = render_to_string('emails/login_notification.html', context)
    
    subject = "Login Notification"
    
    send_mail(
        subject,
        text_message,
        None,  # Uses DEFAULT_FROM_EMAIL
        [user.email],
        html_message=html_message,  # Add HTML version
        fail_silently=True,
    )

@receiver(post_save, sender=User)
def send_new_user_welcome_email(sender, instance, created, **kwargs):
    if created:
        # Assume temp_password is set as an attribute on the user instance during creation
        temp_password = getattr(instance, 'temp_password', None)
        # If not, you may need to pass it another way or generate it here
        login_url = "https://your-domain.com/login/"  # <-- Change to your actual login URL
        context = {
            'user': instance,
            'temp_password': temp_password or '[Set by admin]',
            'login_url': login_url,
            'now': timezone.now(),
        }
        html_message = render_to_string('emails/new_user_welcome.html', context)
        send_mail(
            subject="Welcome to Liquidation Management System",
            message="You have been registered. Please see the HTML version of this email.",
            from_email=None,
            recipient_list=[instance.email],
            fail_silently=True,
            html_message=html_message,
        )
