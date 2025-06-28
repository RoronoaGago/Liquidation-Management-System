from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import RequestManagement
from .tasks import check_liquidation_status, send_reminder


@receiver(post_save, sender=RequestManagement)
def start_unliquidated_timer(sender, instance, **kwargs):
    """
    Schedule reminders when request status changes to 'downloaded'
    """
    # Only proceed if status changed to 'downloaded' and not yet liquidated
    if instance.status != 'downloaded':
        return

    # Prevent duplicate scheduling
    if kwargs.get('created', False) or not hasattr(instance, '_previous_status'):
        instance._previous_status = None

    if instance._previous_status == 'downloaded':
        return  # Already processed

    # If already liquidated, do not schedule reminders
    if hasattr(instance, 'liquidation'):
        return

    now = timezone.now()
    request_id = instance.request_id

    # Define reminder schedule
    REMINDER_SCHEDULE = [
        (15, 15),  # 15-day reminder
        (30, 0),   # Demand letter (check_liquidation_status)
    ]

    try:
        for days_after, days_remaining in REMINDER_SCHEDULE:
            if days_remaining >= 0:
                send_reminder.apply_async(
                    args=[request_id, days_remaining],
                    eta=now + timedelta(days=days_after)
                )
            else:
                check_liquidation_status.apply_async(
                    args=[request_id],
                    eta=now + timedelta(days=days_after)
                )

        # Store current status to prevent duplicate processing
        instance._previous_status = instance.status

    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to schedule reminders for request {request_id}: {str(e)}",
            exc_info=True
        )
