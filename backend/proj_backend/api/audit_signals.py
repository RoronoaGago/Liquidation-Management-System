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
    # Skip if not a model we want to track or if it's the AuditLog itself
    if sender == AuditLog or sender._meta.app_label not in ['api']:
        return

    # Get request from thread local storage (we'll set this in middleware)
    from django.utils.deprecation import MiddlewareMixin
    thread_local = MiddlewareMixin.thread_local if hasattr(
        MiddlewareMixin, 'thread_local') else None
    request = getattr(thread_local, 'request', None) if thread_local else None

    if not request:
        return

    # Get changed fields
    old_values, new_values = get_changed_fields(instance)

    if old_values and new_values:  # Only if there are changes
        # Store in instance for use in post_save
        instance._audit_old_values = old_values
        instance._audit_new_values = new_values


@receiver(post_save)
def log_model_save(sender, instance, created, **kwargs):
    if sender == AuditLog or sender._meta.app_label not in ['api']:
        return

    # Get request from thread local storage
    from django.utils.deprecation import MiddlewareMixin
    thread_local = MiddlewareMixin.thread_local if hasattr(
        MiddlewareMixin, 'thread_local') else None
    request = getattr(thread_local, 'request', None) if thread_local else None

    if not request:
        return

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
