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
            Notification.objects.create(
                notification_title=notification_map[instance.status]['title'],
                details=notification_map[instance.status]['details'],
                receiver=instance.user,
                sender=getattr(instance, '_status_changed_by', None)
            )
            logger.info(
                f"Created {instance.status} notification for {instance.request_id}")

# from django.db.models.signals import post_save
# from django.dispatch import receiver
# from django.utils import timezone
# from datetime import timedelta
# from .models import RequestManagement
# from .tasks import check_liquidation_status, send_reminder


# @receiver(post_save, sender=RequestManagement)
# def start_unliquidated_timer(sender, instance, **kwargs):
#     """
#     Schedule reminders when request status changes to 'downloaded'
#     """
#     # Only proceed if status changed to 'downloaded' and not yet liquidated
#     if instance.status != 'downloaded':
#         return

#     # Prevent duplicate scheduling
#     if kwargs.get('created', False) or not hasattr(instance, '_previous_status'):
#         instance._previous_status = None

#     if instance._previous_status == 'downloaded':
#         return  # Already processed

#     # If already liquidated, do not schedule reminders
#     if hasattr(instance, 'liquidation'):
#         return

#     now = timezone.now()
#     request_id = instance.request_id

#     # Define reminder schedule
#     REMINDER_SCHEDULE = [
#         (15, 15),  # 15-day reminder
#         (30, 0),   # Demand letter (check_liquidation_status)
#     ]

#     try:
#         for days_after, days_remaining in REMINDER_SCHEDULE:
#             if days_remaining >= 0:
#                 send_reminder.apply_async(
#                     args=[request_id, days_remaining],
#                     eta=now + timedelta(days=days_after)
#                 )
#             else:
#                 check_liquidation_status.apply_async(
#                     args=[request_id],
#                     eta=now + timedelta(days=days_after)
#                 )

#         # Store current status to prevent duplicate processing
#         instance._previous_status = instance.status

#     except Exception as e:
#         import logging
#         logger = logging.getLogger(__name__)
#         logger.error(
#             f"Failed to schedule reminders for request {request_id}: {str(e)}",
#             exc_info=True
#         )
