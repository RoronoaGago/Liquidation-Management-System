"""
Enhanced OTP Security Implementation
"""
import secrets
import hashlib
import time
from datetime import timedelta
from django.core.cache import cache
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class OTPSecurityManager:
    """Enhanced OTP security manager with rate limiting and attempt tracking"""
    
    # Configuration constants
    OTP_LENGTH = 6
    OTP_LIFETIME_MINUTES = 5
    MAX_ATTEMPTS_PER_IP = 5  # Per hour
    MAX_ATTEMPTS_PER_USER = 3  # Per hour
    MAX_FAILED_VERIFICATIONS = 5  # Per OTP
    ACCOUNT_LOCKOUT_MINUTES = 15
    
    @staticmethod
    def generate_secure_otp():
        """Generate cryptographically secure OTP"""
        return ''.join([str(secrets.randbelow(10)) for _ in range(OTPSecurityManager.OTP_LENGTH)])
    
    @staticmethod
    def get_rate_limit_key(identifier, prefix="otp_request"):
        """Generate cache key for rate limiting"""
        return f"{prefix}:{hashlib.md5(identifier.encode()).hexdigest()}"
    
    @staticmethod
    def check_rate_limit(identifier, max_attempts, window_minutes=60):
        """Check if identifier has exceeded rate limit"""
        key = OTPSecurityManager.get_rate_limit_key(identifier)
        attempts = cache.get(key, 0)
        
        if attempts >= max_attempts:
            return False, f"Rate limit exceeded. Try again in {window_minutes} minutes."
        
        return True, None
    
    @staticmethod
    def increment_rate_limit(identifier, window_minutes=60):
        """Increment rate limit counter"""
        key = OTPSecurityManager.get_rate_limit_key(identifier)
        attempts = cache.get(key, 0)
        cache.set(key, attempts + 1, window_minutes * 60)
    
    @staticmethod
    def get_failed_attempts_key(user_id, otp_code):
        """Generate key for tracking failed verification attempts"""
        return f"otp_failed_attempts:{user_id}:{hashlib.md5(otp_code.encode()).hexdigest()}"
    
    @staticmethod
    def check_failed_attempts(user_id, otp_code):
        """Check if OTP has too many failed attempts"""
        key = OTPSecurityManager.get_failed_attempts_key(user_id, otp_code)
        attempts = cache.get(key, 0)
        
        if attempts >= OTPSecurityManager.MAX_FAILED_VERIFICATIONS:
            return False, "Too many failed attempts. Please request a new OTP."
        
        return True, None
    
    @staticmethod
    def increment_failed_attempts(user_id, otp_code):
        """Increment failed attempts counter"""
        key = OTPSecurityManager.get_failed_attempts_key(user_id, otp_code)
        attempts = cache.get(key, 0)
        cache.set(key, attempts + 1, OTPSecurityManager.OTP_LIFETIME_MINUTES * 60)
    
    @staticmethod
    def clear_failed_attempts(user_id, otp_code):
        """Clear failed attempts after successful verification"""
        key = OTPSecurityManager.get_failed_attempts_key(user_id, otp_code)
        cache.delete(key)
    
    @staticmethod
    def get_account_lockout_key(user_id):
        """Generate key for account lockout"""
        return f"account_lockout:{user_id}"
    
    @staticmethod
    def is_account_locked(user_id):
        """Check if account is locked due to too many failed attempts"""
        key = OTPSecurityManager.get_account_lockout_key(user_id)
        return cache.get(key, False)
    
    @staticmethod
    def lock_account(user_id, minutes=None):
        """Lock account for specified minutes"""
        if minutes is None:
            minutes = OTPSecurityManager.ACCOUNT_LOCKOUT_MINUTES
        
        key = OTPSecurityManager.get_account_lockout_key(user_id)
        cache.set(key, True, minutes * 60)
        
        logger.warning(f"Account {user_id} locked for {minutes} minutes due to suspicious activity")
    
    @staticmethod
    def unlock_account(user_id):
        """Unlock account"""
        key = OTPSecurityManager.get_account_lockout_key(user_id)
        cache.delete(key)
    
    @staticmethod
    def log_otp_activity(user_id, activity_type, ip_address=None, success=True, details=None):
        """Log OTP-related activities for audit purposes"""
        log_data = {
            'user_id': user_id,
            'activity': activity_type,
            'ip_address': ip_address,
            'success': success,
            'timestamp': timezone.now().isoformat(),
            'details': details or {}
        }
        
        if success:
            logger.info(f"OTP Activity: {log_data}")
        else:
            logger.warning(f"OTP Security Event: {log_data}")
    
    @staticmethod
    def validate_otp_format(otp):
        """Validate OTP format"""
        if not otp or len(otp) != OTPSecurityManager.OTP_LENGTH:
            return False, f"OTP must be {OTPSecurityManager.OTP_LENGTH} digits"
        
        if not otp.isdigit():
            return False, "OTP must contain only digits"
        
        return True, None
    
    @staticmethod
    def is_otp_expired(generated_at):
        """Check if OTP has expired"""
        if not generated_at:
            return True
        
        expiry_time = generated_at + timedelta(minutes=OTPSecurityManager.OTP_LIFETIME_MINUTES)
        return timezone.now() > expiry_time


def get_client_ip(request):
    """Extract client IP address from request"""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        ip = x_forwarded_for.split(',')[0]
    else:
        ip = request.META.get('REMOTE_ADDR')
    return ip


def get_user_agent(request):
    """Extract user agent from request"""
    return request.META.get('HTTP_USER_AGENT', 'Unknown')
