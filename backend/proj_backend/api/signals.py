from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import RequestManagement
from .tasks import check_liquidation_status, send_reminder


@receiver(post_save, sender=RequestManagement)
def start_unliquidated_timer(sender, instance, **kwargs):
    """
    Schedule reminders when request status changes to 'unliquidated'
    """
    # Only proceed if status changed to 'unliquidated'
    if instance.status != 'downloaded':
        return

    # Check if this is a new status change (not just saving the same status)
    if kwargs.get('created', False) or not hasattr(instance, '_previous_status'):
        instance._previous_status = None

    if instance._previous_status == 'downloaded':
        return  # Already processed

    now = timezone.now()
    request_id = instance.request_id

    # Define reminder schedule
    REMINDER_SCHEDULE = [
        (20, 10),  # 10-day reminder (20 days after status change)
        #(25, 5),   # 5-day reminder
        #(28, 2),   # 2-day reminder
        #(29, 1),   # 1-day reminder
        (30, 0),   # Final day reminder
        (31, -1),  # Demand letter (check_liquidation_status)
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
        # Log any errors that occur during scheduling
        import logging
        logger = logging.getLogger(__name__)
        logger.error(
            f"Failed to schedule reminders for request {request_id}: {str(e)}",
            exc_info=True
        )
