# audit_signals.py
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in, user_logged_out
from django.utils import timezone
from .models import User, School, Requirement, ListOfPriority, RequestManagement, LiquidationManagement, SchoolDistrict, AuditLog, RequestPriority
from .audit_utils import log_audit_event, get_changed_fields

# List of models that should NOT be audited (including historical models)
EXCLUDED_MODELS = [
    'AuditLog',
    'HistoricalRequestManagement',
    'HistoricalRequestPriority',
    'HistoricalLiquidationManagement',
    'Notification',
    'GeneratedPDF',
    'Backup',
    # Add other historical models as needed
]


def should_audit_model(sender):
    """Check if a model should be audited"""
    # Skip if app is not 'api'
    if sender._meta.app_label not in ['api']:
        return False

    # Skip excluded models (by name)
    EXCLUDED_MODELS = [
        'AuditLog',
        'HistoricalRequestManagement',
        'HistoricalRequestPriority',
        'HistoricalLiquidationManagement',
        'Notification',  # Add here too for clarity
        'GeneratedPDF',  # You might want to exclude these too
        'Backup',        # And backups
    ]

    # Skip excluded models (by name)
    if sender.__name__ in EXCLUDED_MODELS:
        return False

    # Skip models with 'Historical' in their name (catch-all for historical models)
    if 'Historical' in sender.__name__:
        return False

    return True


@receiver(pre_save)
def track_model_changes(sender, instance, **kwargs):
    # Skip if model shouldn't be audited
    if not should_audit_model(sender):
        return

    # Allow explicit suppression from business logic
    if getattr(instance, '_skip_signal_audit', False):
        return

    # Try multiple ways to get the request
    from .middleware import thread_local
    request = getattr(thread_local, 'request', None)

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
    # Skip if model shouldn't be audited
    if not should_audit_model(sender):
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
        # Explicitly include models that should be audited
        RequestPriority: 'request',  # This should be audited as it's a business action
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

# Track user logins and logouts (unchanged)


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
