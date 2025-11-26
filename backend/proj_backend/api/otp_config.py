"""
OTP Configuration Settings - Strict 5-Minute Security Policy
"""
from django.conf import settings
import os

# Strict OTP Security Configuration - NO OVERRIDES ALLOWED
OTP_CONFIG = {
    # OTP Generation - STRICT 5-MINUTE POLICY
    'OTP_LENGTH': 6,
    'OTP_LIFETIME_MINUTES': 5,  # FIXED - Cannot be overridden
    
    # Rate Limiting
    'MAX_ATTEMPTS_PER_IP_PER_HOUR': 5,
    'MAX_ATTEMPTS_PER_USER_PER_HOUR': 3,
    'MAX_FAILED_VERIFICATIONS_PER_OTP': 5,
    
    # Account Security
    'ACCOUNT_LOCKOUT_MINUTES': 15,
    'MAX_CONSECUTIVE_FAILURES': 5,
    
    # Cache Settings
    'CACHE_PREFIX': 'otp_security',
    'CACHE_TIMEOUT': 3600,  # 1 hour
    
    # Logging
    'LOG_ALL_ATTEMPTS': True,
    'LOG_FAILED_ATTEMPTS': True,
    'LOG_SUCCESSFUL_ATTEMPTS': True,
    
    # Email Settings
    'OTP_EMAIL_TEMPLATE': 'emails/otp_notification.html',
    'OTP_EMAIL_SUBJECT': 'Your Login OTP Code',
    
    # Security Headers
    'REQUIRE_HTTPS': getattr(settings, 'REQUIRE_HTTPS_FOR_OTP', False),
    'ALLOWED_ORIGINS': getattr(settings, 'OTP_ALLOWED_ORIGINS', []),
}

# SECURITY: Environment overrides REMOVED for OTP_LIFETIME_MINUTES
# Only allow non-security related overrides
if hasattr(settings, 'OTP_CONFIG'):
    # Filter out security-critical settings that cannot be overridden
    allowed_overrides = {
        'REQUIRE_HTTPS', 'ALLOWED_ORIGINS', 'OTP_EMAIL_TEMPLATE', 
        'OTP_EMAIL_SUBJECT', 'LOG_ALL_ATTEMPTS', 'LOG_FAILED_ATTEMPTS', 
        'LOG_SUCCESSFUL_ATTEMPTS'
    }
    
    for key, value in settings.OTP_CONFIG.items():
        if key in allowed_overrides:
            OTP_CONFIG[key] = value
        else:
            # Log security violation attempt
            import logging
            logger = logging.getLogger(__name__)
            logger.warning(f"SECURITY: Attempted to override OTP security setting '{key}' - BLOCKED")

# Validation
def validate_otp_config():
    """Validate OTP configuration with strict security checks"""
    import logging
    logger = logging.getLogger(__name__)
    
    required_keys = [
        'OTP_LENGTH', 'OTP_LIFETIME_MINUTES', 
        'MAX_ATTEMPTS_PER_IP_PER_HOUR', 'MAX_ATTEMPTS_PER_USER_PER_HOUR'
    ]
    
    for key in required_keys:
        if key not in OTP_CONFIG:
            raise ValueError(f"Missing required OTP configuration: {key}")
    
    # Validate numeric values
    if OTP_CONFIG['OTP_LENGTH'] < 4 or OTP_CONFIG['OTP_LENGTH'] > 8:
        raise ValueError("OTP_LENGTH must be between 4 and 8")
    
    # STRICT SECURITY: OTP lifetime MUST be exactly 5 minutes
    if OTP_CONFIG['OTP_LIFETIME_MINUTES'] != 5:
        error_msg = f"SECURITY VIOLATION: OTP_LIFETIME_MINUTES must be exactly 5 minutes, got {OTP_CONFIG['OTP_LIFETIME_MINUTES']}"
        logger.error(error_msg)
        raise ValueError(error_msg)
    
    if OTP_CONFIG['MAX_ATTEMPTS_PER_IP_PER_HOUR'] < 1:
        raise ValueError("MAX_ATTEMPTS_PER_IP_PER_HOUR must be at least 1")
    
    if OTP_CONFIG['MAX_ATTEMPTS_PER_USER_PER_HOUR'] < 1:
        raise ValueError("MAX_ATTEMPTS_PER_USER_PER_HOUR must be at least 1")
    
    # Log successful validation
    logger.info("OTP Configuration validated successfully - 5-minute security policy enforced")

def get_otp_lifetime_minutes():
    """Get OTP lifetime with runtime validation"""
    lifetime = OTP_CONFIG['OTP_LIFETIME_MINUTES']
    if lifetime != 5:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"SECURITY ALERT: OTP lifetime is {lifetime} minutes, expected 5 minutes")
        # Force return 5 minutes for security
        return 5
    return lifetime

# Validate configuration on import
validate_otp_config()
