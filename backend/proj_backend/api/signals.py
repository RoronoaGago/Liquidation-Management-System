# signals.py
from django.db.models.signals import post_save
from django.core.mail import send_mail
from django.dispatch import receiver
from django.utils import timezone
from .models import RequestManagement, LiquidationManagement, Notification
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
from datetime import timedelta
from .email_utils import get_deped_logo_base64
from .tasks import send_liquidation_reminder, send_liquidation_demand_letter
from django.contrib.auth.signals import user_logged_in
from django.urls import reverse
from django.utils import timezone
from django.conf import settings
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
import logging
import random

import geoip2.database
import user_agents


logger = logging.getLogger(__name__)
User = get_user_model()

def send_websocket_notification(notification):
    """Send notification via WebSocket to the receiver"""
    try:
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{notification.receiver.id}',
                {
                    'type': 'notification_message',
                    'notification': {
                        'id': str(notification.id),
                        'notification_title': notification.notification_title,
                        'details': notification.details,
                        'sender': {
                            'id': str(notification.sender.id) if notification.sender else None,
                            'first_name': notification.sender.first_name if notification.sender else None,
                            'last_name': notification.sender.last_name if notification.sender else None,
                            'profile_picture': notification.sender.profile_picture.url if notification.sender and notification.sender.profile_picture else None,
                        } if notification.sender else None,
                        'notification_date': notification.notification_date.isoformat(),
                        'is_read': notification.is_read,
                    }
                }
            )
    except Exception as e:
        logger.error(f"Failed to send WebSocket notification: {str(e)}")

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
    superintendent = User.objects.filter(
        role='superintendent', is_active=True).first()
    if superintendent:
        Notification.objects.create(
            notification_title=f"New Request from {instance.user.get_full_name()}",
            details=f"New request {instance.request_id} has been submitted for {instance.request_monthyear}",
            receiver=superintendent,
            sender=instance.user
        )
        
        # Send email notification to superintendent using the new template
        context = {
            "user": superintendent,
            "object": instance,
            "now": timezone.now(),
            "login_url": f"{settings.FRONTEND_URL}/login" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000/login"
        }
        send_notification_email(
            subject=f"New Request from {instance.user.get_full_name()}",
            message=f"New request {instance.request_id} has been submitted for {instance.request_monthyear}",
            recipient=superintendent,
            template_name="emails/sds_request_review.html",
            context=context
        )


def send_notification_email(subject, message, recipient, template_name=None, context=None):
    # Check if recipient is active and has an email
    if recipient and recipient.is_active and getattr(recipient, 'email', None):
        html_message = None
        if template_name and context:
            # Add base64 logo to context if not already present
            if context is None:
                context = {}
            if 'deped_logo_base64' not in context:
                context['deped_logo_base64'] = get_deped_logo_base64()
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
            from django.utils import timezone
            context = {
                "user": instance.user,
                "object": instance,
                "object_type": "request",
                "status": instance.status,
                "now": timezone.now(),
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
                accountant = User.objects.filter(
                    role='accountant', is_active=True).first()
                if accountant:
                    Notification.objects.create(
                        notification_title=f"Request {instance.request_id} approved",
                        details=f"Request {instance.request_id} has been approved and is ready for accounting.",
                        receiver=accountant,
                        sender=getattr(instance, '_status_changed_by', None)
                    )
                    # Send email to the accountant using the new template
                    context = {
                        "user": accountant,
                        "object": instance,
                        "now": timezone.now(),
                        "login_url": f"{settings.FRONTEND_URL}/login" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000/login"
                    }
                    send_notification_email(
                        subject=f"Request {instance.request_id} approved",
                        message=f"Request {instance.request_id} has been approved and is ready for accounting.",
                        recipient=accountant,
                        template_name="emails/accountant_download.html",
                        context=context
                    )

# New liquidation management signals


@receiver(post_save, sender=LiquidationManagement)
def handle_liquidation_notifications(sender, instance, created, **kwargs):
    try:
        if created:
            create_new_liquidation_notification(instance)
        else:
            # FIXED: Only send reminders when remaining_days actually changes
            # and only for specific day thresholds
            if hasattr(instance, '_old_remaining_days'):
                old_days = instance._old_remaining_days
                new_days = instance.remaining_days

                # Send reminder only when crossing specific thresholds
                # and not already sent today
                from django.conf import settings
                today = timezone.now().date()
                reminder_days = getattr(settings, 'LIQUIDATION_REMINDER_DAYS', [15, 5, 0])
                
                if (old_days != new_days and new_days in reminder_days and
                        instance.status not in ['liquidated', 'draft'] and
                        instance.request.last_reminder_sent != today):
                    send_liquidation_reminder.delay(instance.pk, new_days)
                elif (old_days != new_days and new_days <= 0 and
                      instance.status not in ['liquidated', 'draft'] and
                      not instance.request.demand_letter_sent):
                    send_liquidation_demand_letter.delay(instance.pk)

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
        school_district=school.district,
        is_active=True
    )
    for admin in district_admins:
        Notification.objects.create(
            notification_title="New Liquidation Submitted",
            details=f"New liquidation {instance.LiquidationID} has been submitted for request {instance.request.request_id}",
            receiver=admin,
            sender=instance.request.user
        )
        
        # Send email notification to district admin using the new template
        context = {
            "user": admin,
            "object": instance,
            "now": timezone.now(),
            "login_url": f"{settings.FRONTEND_URL}/login" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000/login"
        }
        send_notification_email(
            subject="New Liquidation Submitted",
            message=f"New liquidation {instance.LiquidationID} has been submitted for request {instance.request.request_id}",
            recipient=admin,
            template_name="emails/liquidation_review.html",
            context=context
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
        'under_review_liquidator': {
            'title': "Liquidation Under Liquidator Review",
            'details': f"Your liquidation {instance.LiquidationID} is now under review by the liquidator",
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
            'additional_receivers': User.objects.filter(role='liquidator', is_active=True)
        },
        'approved_liquidator': {
            'title': "Liquidation Approved by Liquidator",
            'details': f"Your liquidation {instance.LiquidationID} has been approved by the liquidator",
            'receivers': [instance.request.user],
            'additional_receivers': User.objects.filter(role='accountant', is_active=True)
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
            if receiver.is_active:
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
                    "changed_by": changed_by,
                    "now": timezone.now(),
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
        for receiver in notification_info.get('additional_receivers', []):
            if receiver.is_active:
                Notification.objects.create(
                    notification_title=notification_info['title'],
                    details=notification_info['details'],
                    receiver=receiver,
                    sender=changed_by
                )
                # Send email to additional receivers using the liquidation_review template
                context = {
                    "user": receiver,
                    "object": instance,
                    "now": timezone.now(),
                    "login_url": f"{settings.FRONTEND_URL}/login" if hasattr(settings, 'FRONTEND_URL') else "http://localhost:3000/login"
                }
                send_notification_email(
                    subject=notification_info['title'],
                    message=notification_info['details'],
                    recipient=receiver,
                    template_name="emails/liquidation_review.html",
                    context=context
                )


@receiver(post_save, sender=Notification)
def send_notification_websocket(sender, instance, created, **kwargs):
    """Send WebSocket notification when a new notification is created"""
    if created:
        send_websocket_notification(instance)


# @receiver(user_logged_in)
# def send_login_email(sender, user, request, **kwargs):
#     # Get IP address
#     ip_address = request.META.get('REMOTE_ADDR')

#     # Get approximate location (requires GeoIP2 database)
#     location = None
#     try:
#         with geoip2.database.Reader('path/to/GeoLite2-City.mmdb') as reader:
#             response = reader.city(ip_address)
#             location_parts = []
#             if response.city.name:
#                 location_parts.append(response.city.name)
#             if response.subdivisions.most_specific.name:
#                 location_parts.append(response.subdivisions.most_specific.name)
#             if response.country.name:
#                 location_parts.append(response.country.name)
#             location = ', '.join(location_parts)
#     except Exception:
#         pass

#     # Parse user agent
#     user_agent = request.META.get('HTTP_USER_AGENT', '')
#     agent = user_agents.parse(user_agent)
#     device_info = f"{agent.get_device()} ({agent.get_browser()} {agent.browser.version_string})"

#     # Prepare context
#     context = {
#         'user': user,
#         'ip': ip_address,
#         'login_time': timezone.now(),
#         'location': location,
#         'device_info': device_info,
#         'account_settings_url': request.build_absolute_uri('/account/settings/'),
#         'now': timezone.now(),
#     }

    # Render both text and HTML versions
    # Note: This section is commented out and context is not defined
    # html_message = render_to_string('emails/login_notification.html', context)
    # text_message = render_to_string('emails/login_notification.txt', context)

#     subject = "Login Notification"

#     send_mail(
#         subject,
#         text_message,
#         None,  # Uses DEFAULT_FROM_EMAIL
#         [user.email],
#         html_message=html_message,  # Add HTML version
#         fail_silently=True,
#     )
