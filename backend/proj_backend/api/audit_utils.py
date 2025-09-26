# Create a new file audit_utils.py
import json
from django.utils import timezone
from .models import AuditLog


def log_audit_event(request, action, module, description,
                    object_id=None, object_type=None, object_name=None,
                    old_values=None, new_values=None):
    """
    Utility function to create audit log entries
    """
    user = request.user if request.user.is_authenticated else None
    ip_address = request.META.get('REMOTE_ADDR', '')
    user_agent = request.META.get('HTTP_USER_AGENT', '')[:500]

    # Convert model instances to IDs if needed
    if hasattr(object_id, 'pk'):
        object_id = str(object_id.pk)

    audit_log = AuditLog.objects.create(
        user=user,
        action=action,
        module=module,
        object_id=object_id,
        object_type=object_type,
        object_name=object_name,
        description=description,
        ip_address=ip_address,
        user_agent=user_agent,
        old_values=old_values,
        new_values=new_values
    )

    return audit_log


def get_changed_fields(instance):
    """
    Compare current instance with database version to detect changes
    """
    # Skip historical models entirely
    if 'Historical' in instance.__class__.__name__:
        return None, None

    if not instance.pk:
        return None, None  # New instance, no old values
    print(
        f"DEBUG: Checking changes for {instance.__class__.__name__} {instance.pk}")
    try:

        old_instance = instance.__class__.objects.get(pk=instance.pk)
    except instance.__class__.DoesNotExist:
        return None, None

    old_values = {}
    new_values = {}

    for field in instance._meta.fields:
        field_name = field.name

        # Skip internal fields
        if field_name in ['password', 'last_login', 'otp_code']:
            continue

        old_value = getattr(old_instance, field_name)
        new_value = getattr(instance, field_name)

        # Better comparison that handles different data types
        if old_value != new_value:
            # Convert to string for JSON serialization
            old_values[field_name] = str(
                old_value) if old_value is not None else None
            new_values[field_name] = str(
                new_value) if new_value is not None else None

    print(f"DEBUG: Found changes - old: {old_values}, new: {new_values}")
    return (old_values if old_values else None,
            new_values if new_values else None)
