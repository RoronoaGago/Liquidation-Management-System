from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import RequestManagement, Notification
from django.contrib.auth import get_user_model
import logging

logger = logging.getLogger(__name__)
User = get_user_model()


@receiver(post_save, sender=RequestManagement)
def handle_request_notifications(sender, instance, created, **kwargs):
    """
    Handles notifications when a RequestManagement instance is created or updated.
    """
    logger.debug(
        f"Signal triggered for {instance.request_id} (Status: {instance.status}, Created: {created})")
    try:
        if created:
            # New request notification - use direct function call
            create_new_request_notification(instance)
        else:
            # Status change notification - use direct function call
            handle_status_change_notification(instance)

    except RequestManagement.DoesNotExist:
        logger.warning(
            f"Couldn't find request {instance.request_id} after creation")
    except Exception as e:
        logger.error(
            f"Failed to create notification for request {getattr(instance, 'request_id', 'unknown')}: {str(e)}")

# Standalone function - no self parameter


def create_new_request_notification(instance):
    """Handles notifications for newly created requests"""
    superintendent = User.objects.filter(role='superintendent').first()
    if superintendent:
        Notification.objects.create(
            notification_title=f"New Request from {instance.user.get_full_name()}",
            details=f"New request {instance.request_id} has been submitted for {instance.request_monthyear}",
            receiver=superintendent,
            sender=instance.user
        )
        logger.info(
            f"Created new request notification for {instance.request_id}")

# Standalone function - no self parameter


def handle_status_change_notification(instance):
    """Handles notifications for status changes"""
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
            logger.info(
                f"Created {instance.status} notification for {instance.request_id}")

            # If approved, also notify the division accountant
            if instance.status == 'approved':
                User = get_user_model()
                accountant = User.objects.filter(role='accountant').first()
                if accountant:
                    Notification.objects.create(
                        notification_title=f"Request {instance.request_id} approved",
                        details=f"Request {instance.request_id} has been approved and is ready for accounting.",
                        receiver=accountant,
                        sender=getattr(instance, '_status_changed_by', None)
                    )
                    logger.info(
                        f"Notified division accountant for approved request {instance.request_id}")
