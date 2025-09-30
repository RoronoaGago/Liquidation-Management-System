"""
OTP Configuration Settings
"""
from django.conf import settings

# OTP Security Configuration
OTP_CONFIG = {
    # OTP Generation
    'OTP_LENGTH': 6,
    'OTP_LIFETIME_MINUTES': 5,
    
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
    'OTP_EMAIL_TEMPLATE': 'emails/login_notification.html',
    'OTP_EMAIL_SUBJECT': 'Your Login OTP Code',
    
    # Security Headers
    'REQUIRE_HTTPS': getattr(settings, 'REQUIRE_HTTPS_FOR_OTP', False),
    'ALLOWED_ORIGINS': getattr(settings, 'OTP_ALLOWED_ORIGINS', []),
}

# Environment-specific overrides
if hasattr(settings, 'OTP_CONFIG'):
    OTP_CONFIG.update(settings.OTP_CONFIG)

# Validation
def validate_otp_config():
    """Validate OTP configuration"""
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
    
    if OTP_CONFIG['OTP_LIFETIME_MINUTES'] < 1 or OTP_CONFIG['OTP_LIFETIME_MINUTES'] > 30:
        raise ValueError("OTP_LIFETIME_MINUTES must be between 1 and 30")
    
    if OTP_CONFIG['MAX_ATTEMPTS_PER_IP_PER_HOUR'] < 1:
        raise ValueError("MAX_ATTEMPTS_PER_IP_PER_HOUR must be at least 1")
    
    if OTP_CONFIG['MAX_ATTEMPTS_PER_USER_PER_HOUR'] < 1:
        raise ValueError("MAX_ATTEMPTS_PER_USER_PER_HOUR must be at least 1")

# Validate configuration on import
validate_otp_config()
