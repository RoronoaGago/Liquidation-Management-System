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


def get_changed_fields(instance, fields_to_track=None):
    """
    Get changed fields for an instance
    """
    if not instance.pk:
        return None, None  # New instance, no old values

    old_values = {}
    new_values = {}

    # Get the current instance from database
    try:
        old_instance = instance.__class__.objects.get(pk=instance.pk)
    except instance.__class__.DoesNotExist:
        return None, None

    # Track all fields or specific fields
    fields = fields_to_track or [field.name for field in instance._meta.fields
                                 if not field.primary_key and field.name not in ['created_at', 'updated_at']]

    for field in fields:
        old_val = getattr(old_instance, field)
        new_val = getattr(instance, field)

        if old_val != new_val:
            # Handle special field types
            if hasattr(old_val, 'pk'):
                old_val = str(old_val.pk)
            if hasattr(new_val, 'pk'):
                new_val = str(new_val.pk)

            # Handle file fields
            if hasattr(old_val, 'url'):
                old_val = old_val.url
            if hasattr(new_val, 'url'):
                new_val = new_val.url

            # Handle dates
            if hasattr(old_val, 'isoformat'):
                old_val = old_val.isoformat()
            if hasattr(new_val, 'isoformat'):
                new_val = new_val.isoformat()

            old_values[field] = old_val
            new_values[field] = new_val

    return old_values, new_values
