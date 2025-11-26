"""
OTP Security Validator for Production Environment
Validates that OTP security policies are correctly enforced
"""
import os
import logging
from django.conf import settings
from .otp_config import OTP_CONFIG, get_otp_lifetime_minutes, validate_otp_config
from .otp_security import OTPSecurityManager

logger = logging.getLogger(__name__)

class OTPSecurityValidator:
    """Validates OTP security configuration in production"""
    
    @staticmethod
    def validate_production_environment():
        """Comprehensive validation for production environment"""
        errors = []
        warnings = []
        
        # Check if we're in production
        is_production = getattr(settings, 'DEBUG', True) == False
        
        if is_production:
            logger.info("🔒 Running OTP security validation for PRODUCTION environment")
        else:
            logger.info("🧪 Running OTP security validation for DEVELOPMENT environment")
        
        # 1. Validate OTP lifetime is exactly 5 minutes
        try:
            lifetime = get_otp_lifetime_minutes()
            if lifetime != 5:
                error_msg = f"CRITICAL: OTP lifetime is {lifetime} minutes, must be exactly 5 minutes"
                errors.append(error_msg)
                logger.error(error_msg)
            else:
                logger.info("✅ OTP lifetime validation passed: 5 minutes")
        except Exception as e:
            error_msg = f"CRITICAL: Failed to validate OTP lifetime: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        # 2. Validate OTP configuration
        try:
            validate_otp_config()
            logger.info("✅ OTP configuration validation passed")
        except Exception as e:
            error_msg = f"CRITICAL: OTP configuration validation failed: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        # 3. Validate OTPSecurityManager constants
        try:
            if OTPSecurityManager.OTP_LIFETIME_MINUTES != 5:
                error_msg = f"CRITICAL: OTPSecurityManager.OTP_LIFETIME_MINUTES is {OTPSecurityManager.OTP_LIFETIME_MINUTES}, must be 5"
                errors.append(error_msg)
                logger.error(error_msg)
            else:
                logger.info("✅ OTPSecurityManager OTP lifetime validation passed")
        except Exception as e:
            error_msg = f"CRITICAL: Failed to validate OTPSecurityManager: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        # 4. Check for environment variable overrides (should not exist in production)
        if is_production:
            env_vars_to_check = [
                'OTP_LIFETIME_MINUTES',
                'OTP_CONFIG',
                'DJANGO_OTP_LIFETIME'
            ]
            
            for env_var in env_vars_to_check:
                if os.getenv(env_var):
                    warning_msg = f"WARNING: Environment variable {env_var} is set in production - this could override security settings"
                    warnings.append(warning_msg)
                    logger.warning(warning_msg)
        
        # 5. Validate Django settings
        if hasattr(settings, 'OTP_CONFIG'):
            if is_production:
                error_msg = "CRITICAL: OTP_CONFIG found in Django settings in production - security risk"
                errors.append(error_msg)
                logger.error(error_msg)
            else:
                warning_msg = "WARNING: OTP_CONFIG found in Django settings - ensure it doesn't override security settings"
                warnings.append(warning_msg)
                logger.warning(warning_msg)
        
        # 6. Runtime validation
        try:
            if not OTPSecurityManager.validate_otp_lifetime():
                error_msg = "CRITICAL: Runtime OTP lifetime validation failed"
                errors.append(error_msg)
                logger.error(error_msg)
            else:
                logger.info("✅ Runtime OTP lifetime validation passed")
        except Exception as e:
            error_msg = f"CRITICAL: Runtime OTP lifetime validation error: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        # Log summary
        if errors:
            logger.error(f"🚨 OTP Security Validation FAILED with {len(errors)} critical errors")
            for error in errors:
                logger.error(f"   ❌ {error}")
        else:
            logger.info("✅ OTP Security Validation PASSED - All security checks successful")
        
        if warnings:
            logger.warning(f"⚠️  OTP Security Validation completed with {len(warnings)} warnings")
            for warning in warnings:
                logger.warning(f"   ⚠️  {warning}")
        
        return {
            'passed': len(errors) == 0,
            'errors': errors,
            'warnings': warnings,
            'is_production': is_production
        }
    
    @staticmethod
    def get_security_report():
        """Get a comprehensive security report"""
        validation_result = OTPSecurityValidator.validate_production_environment()
        
        return {
            'validation_result': validation_result,
            'otp_config': {
                'lifetime_minutes': get_otp_lifetime_minutes(),
                'lifetime_seconds': get_otp_lifetime_minutes() * 60,
                'length': OTP_CONFIG['OTP_LENGTH'],
                'max_attempts': OTP_CONFIG['MAX_FAILED_VERIFICATIONS_PER_OTP'],
                'lockout_minutes': OTP_CONFIG['ACCOUNT_LOCKOUT_MINUTES']
            },
            'security_manager': {
                'lifetime_minutes': OTPSecurityManager.OTP_LIFETIME_MINUTES,
                'length': OTPSecurityManager.OTP_LENGTH,
                'max_attempts': OTPSecurityManager.MAX_FAILED_VERIFICATIONS,
                'lockout_minutes': OTPSecurityManager.ACCOUNT_LOCKOUT_MINUTES
            },
            'environment': {
                'debug': getattr(settings, 'DEBUG', True),
                'production': not getattr(settings, 'DEBUG', True)
            }
        }

# Auto-validate on import in production
if not getattr(settings, 'DEBUG', True):
    logger.info("🔒 Production environment detected - running OTP security validation")
    validation_result = OTPSecurityValidator.validate_production_environment()
    if not validation_result['passed']:
        logger.critical("🚨 CRITICAL: OTP Security validation failed in production!")
        # In production, we might want to raise an exception to prevent startup
        # raise RuntimeError("OTP Security validation failed in production")
