# signals.py
from django.db.models.signals import post_save
from django.core.mail import send_mail
from django.dispatch import receiver
from .models import RequestManagement, LiquidationManagement, Notification
from django.contrib.auth import get_user_model
from django.template.loader import render_to_string
import logging

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
        if template_name and context:
            # Render the email body from template
            message = render_to_string(template_name, context)
        send_mail(
            subject=subject,
            message=message,
            from_email=None,  # Uses DEFAULT_FROM_EMAIL
            recipient_list=[recipient.email],
            fail_silently=True,
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
                template_name="emails/request_status_change.txt",
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
            handle_liquidation_status_change(instance)
    except Exception as e:
        logger.error(
            f"Failed to create notification for liquidation {getattr(instance, 'LiquidationID', 'unknown')}: {str(e)}")


def create_new_liquidation_notification(instance):
    # Notify district admin when liquidation is created (submitted)
    district_admins = User.objects.filter(role='district_admin')
    for admin in district_admins:
        Notification.objects.create(
            notification_title=f"New Liquidation Submitted",
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
            'details': f"Your liquidation {instance.LiquidationID} is now under review by the division accountant",
            'receivers': [instance.request.user],
            'additional_receivers': []
        },
        'resubmit': {
            'title': "Liquidation Needs Revision",
            'details': f"Your liquidation {instance.LiquidationID} needs revision. Comments: {instance.comment_id or 'No comments provided'}",
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
            'additional_receivers': list(User.objects.filter(role='district_admin'))
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
                template_name="emails/liquidation_status_change.txt",
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
