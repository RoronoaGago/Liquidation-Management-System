from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from datetime import timedelta
from .models import RequestManagement
from .tasks import check_liquidation_status, send_reminder

@receiver(post_save, sender=RequestManagement)
def start_unliquidated_timer(sender, instance, **kwargs):
    if instance.status == 'downloaded':
        now = timezone.now()
        request_id = instance.request_id
        
        # Schedule all reminders
        reminders = [
            (20, 10)  #10-day remiders
            (25, 5),  # 5-day reminder (25 days after status change)
            (28, 2),  # 2-day reminder
            (29, 1),  # 1-day reminder
            (30, 0),  # Final day reminder
            (31, -1)  # Demand letter (check_liquidation_status)
        ]
        
        for days_after, days_remaining in reminders:
            if days_remaining >= 0:
                send_reminder.apply_async(
                    args=[request_id, days_remaining],
                    eta=now + timedelta(days=days_after)
                )
            else:
                check_liquidation_status.apply_async(
                    args=[request_id],
                    eta=now + timedelta(days=days_after))