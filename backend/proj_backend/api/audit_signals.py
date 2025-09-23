# Create a new file signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils import timezone
from .models import User, School, Requirement, ListOfPriority, RequestManagement, LiquidationManagement, SchoolDistrict, AuditLog
from .audit_utils import log_audit_event, get_changed_fields

# Track model changes


@receiver(pre_save)
def track_model_changes(sender, instance, **kwargs):
    if sender == AuditLog or sender._meta.app_label not in ['api']:
        return

    # Allow explicit suppression from business logic
    if getattr(instance, '_skip_signal_audit', False):
        return

    # Try multiple ways to get the request
    request = None

    # Method 1: From thread_local (current approach)
    from .middleware import thread_local
    request = getattr(thread_local, 'request', None)

    # Method 2: Fallback - get request from active requests
    if not request:
        try:
            from django.core.handlers.wsgi import WSGIHandler
            # This is tricky but sometimes necessary
            pass
        except:
            pass

    if not request:
        return  # Skip if no request context

    # Get changed fields ONLY if we have a request
    old_values, new_values = get_changed_fields(instance)

    if old_values and new_values:
        instance._audit_old_values = old_values
        instance._audit_new_values = new_values
        # Also store the request ID for verification
        instance._audit_request_id = id(request)


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    if sender == AuditLog or sender._meta.app_label not in ['api']:
        return

    # Allow explicit suppression from business logic
    if getattr(instance, '_skip_signal_audit', False):
        return

    # Get request using the same method as pre_save
    from .middleware import thread_local
    request = getattr(thread_local, 'request', None)

    if not request:
        # Try to get from instance if stored in pre_save
        request_id = getattr(instance, '_audit_request_id', None)
        if not request_id:
            return  # No request context, skip audit logging

    module_map = {
        User: 'user',
        School: 'school',
        Requirement: 'requirement',
        ListOfPriority: 'priority',
        RequestManagement: 'request',
        LiquidationManagement: 'liquidation',
        SchoolDistrict: 'district',
    }

    module = module_map.get(sender, 'system')
    action = 'create' if created else 'update'

    # Special handling for archiving/restoring
    if not created and hasattr(instance, 'is_active'):
        old_values = getattr(instance, '_audit_old_values', {})
        new_values = getattr(instance, '_audit_new_values', {})

        if 'is_active' in old_values and 'is_active' in new_values:
            if old_values['is_active'] and not new_values['is_active']:
                action = 'archive'
            elif not old_values['is_active'] and new_values['is_active']:
                action = 'restore'

    description = f"{action.capitalize()} {sender._meta.verbose_name}"
    if hasattr(instance, 'get_audit_description'):
        description = instance.get_audit_description(created, action)

    # Get changed fields if available
    old_values = getattr(instance, '_audit_old_values', None)
    new_values = getattr(instance, '_audit_new_values', None)

    # Clean up temporary attributes
    if hasattr(instance, '_audit_old_values'):
        delattr(instance, '_audit_old_values')
    if hasattr(instance, '_audit_new_values'):
        delattr(instance, '_audit_new_values')

    log_audit_event(
        request=request,
        action=action,
        module=module,
        description=description,
        object_id=instance.pk,
        object_type=sender.__name__,
        object_name=str(instance),
        old_values=old_values,
        new_values=new_values
    )

# Track user logins and logouts


@receiver(user_logged_in)
def log_user_login(sender, request, user, **kwargs):
    from .audit_utils import log_audit_event
    log_audit_event(
        request=request,
        action='login',
        module='auth',
        description=f"User {user.get_full_name()} logged in",
        object_id=user.pk,
        object_type='User',
        object_name=user.get_full_name()
    )


@receiver(user_logged_out)
def log_user_logout(sender, request, user, **kwargs):
    from .audit_utils import log_audit_event
    log_audit_event(
        request=request,
        action='logout',
        module='auth',
        description=f"User {user.get_full_name()} logged out",
        object_id=user.pk,
        object_type='User',
        object_name=user.get_full_name()
    )
