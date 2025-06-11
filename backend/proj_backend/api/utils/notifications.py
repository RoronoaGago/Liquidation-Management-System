# from django.conf import settings
# from twilio.rest import Client
# from twilio.base.exceptions import TwilioRestException
# from ..models import Transaction
# import logging

# logger = logging.getLogger(__name__)

# def send_sms_notification(phone_number, message):
#     """
#     Send SMS notification using Twilio with proper error handling
#     """
#     if not phone_number:
#         logger.error("No phone number provided for SMS notification")
#         return False

#     try:
#         client = Client(settings.TWILIO_ACCOUNT_SID, settings.TWILIO_AUTH_TOKEN)
#         message = client.messages.create(
#             body=message,
#             from_=settings.TWILIO_PHONE_NUMBER,
#             to=phone_number
#         )
#         logger.info(f"SMS sent to {phone_number} - SID: {message.sid}")
#         return True
#     except TwilioRestException as e:
#         logger.error(f"Twilio error sending SMS to {phone_number}: {e}")
#         return False
#     except Exception as e:
#         logger.error(f"Unexpected error sending SMS to {phone_number}: {e}")
#         return False
# STATUS_MESSAGES = {
#     "pending": "Your order has been received and is being processed.",
#     "in_progress": "We're now working on your laundry order.",
#     "ready_for_pickup": "Your laundry is ready for pickup!",
#     "completed": "Your laundry order is complete. Thank you!",
#     "cancelled": "Your order has been cancelled. Contact us for details.",
# }

# def get_status_message(transaction, new_status):
#     """
#     Get appropriate message based on status
#     """
#     customer = transaction.customer
#     base_message = (
#         f"Hi {customer.first_name}, your laundry order #{transaction.id} "
#         f"status has been updated to: {dict(Transaction.STATUS_CHOICES)[new_status]}. "
#     )
    
#     status_specific = STATUS_MESSAGES.get(new_status, "")
#     return base_message + status_specific