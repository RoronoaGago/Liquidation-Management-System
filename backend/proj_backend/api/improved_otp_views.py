"""
Improved OTP Views with Enhanced Security
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from django.core.cache import cache
from .models import User
from .utils import send_otp_email
from .otp_security import (
    OTPSecurityManager, 
    get_client_ip, 
    get_user_agent
)
from .otp_config import get_otp_lifetime_minutes
from .otp_security_validator import OTPSecurityValidator
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp_secure(request):
    """
    Enhanced OTP request with security measures
    """
    email = request.data.get('email')
    password = request.data.get('password')
    
    if not email or not password:
        return Response({
            'error': 'Email and password are required'
        }, status=400)
    
    # Get client information for security tracking
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    try:
        # Check if user exists
        try:
            user_obj = User.objects.get(email=email)
        except User.DoesNotExist:
            # Log failed attempt for non-existent user
            OTPSecurityManager.log_otp_activity(
                user_id=None,
                activity_type='otp_request_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'user_not_found', 'email': email}
            )
            return Response({
                'error': 'Invalid email or password'
            }, status=400)
        
        # Check if account is locked - DISABLED FOR DEVELOPMENT
        # if OTPSecurityManager.is_account_locked(user_obj.id):
        #     OTPSecurityManager.log_otp_activity(
        #         user_id=user_obj.id,
        #         activity_type='otp_request_blocked',
        #         ip_address=client_ip,
        #         success=False,
        #         details={'reason': 'account_locked'}
        #     )
        #     return Response({
        #         'error': 'Account temporarily locked due to suspicious activity. Please try again later.'
        #     }, status=423)
        
        # Check if user is active
        if not user_obj.is_active:
            OTPSecurityManager.log_otp_activity(
                user_id=user_obj.id,
                activity_type='otp_request_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'account_inactive'}
            )
            return Response({
                'error': 'Your account has been archived by the administrator. To reactivate your account, please contact our support team.'
            }, status=403)
        
        # Rate limiting checks - DISABLED FOR DEVELOPMENT
        # Check IP-based rate limiting
        # ip_allowed, ip_error = OTPSecurityManager.check_rate_limit(
        #     client_ip, 
        #     OTPSecurityManager.MAX_ATTEMPTS_PER_IP
        # )
        # if not ip_allowed:
        #     OTPSecurityManager.log_otp_activity(
        #         user_id=user_obj.id,
        #         activity_type='otp_request_rate_limited',
        #         ip_address=client_ip,
        #         success=False,
        #         details={'reason': 'ip_rate_limit_exceeded'}
        #     )
        #     return Response({'error': ip_error}, status=429)
        
        # Check user-based rate limiting
        # user_allowed, user_error = OTPSecurityManager.check_rate_limit(
        #     str(user_obj.id), 
        #     OTPSecurityManager.MAX_ATTEMPTS_PER_USER
        # )
        # if not user_allowed:
        #     OTPSecurityManager.log_otp_activity(
        #         user_id=user_obj.id,
        #         activity_type='otp_request_rate_limited',
        #         ip_address=client_ip,
        #         success=False,
        #         details={'reason': 'user_rate_limit_exceeded'}
        #     )
        #     return Response({'error': user_error}, status=429)
        
        # Authenticate user
        user = authenticate(email=email, password=password)
        if not user:
        # Increment rate limit counters for failed authentication - DISABLED FOR DEVELOPMENT
        # OTPSecurityManager.increment_rate_limit(client_ip)
        # OTPSecurityManager.increment_rate_limit(str(user_obj.id))
            
            OTPSecurityManager.log_otp_activity(
                user_id=user_obj.id,
                activity_type='otp_request_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'invalid_credentials'}
            )
            return Response({
                'error': 'Invalid email or password'
            }, status=400)
        
        # Generate secure OTP
        otp = OTPSecurityManager.generate_secure_otp()
        
        # Store OTP with timestamp
        user.otp_code = otp
        user.otp_generated_at = timezone.now()
        user.save(update_fields=['otp_code', 'otp_generated_at'])
        
        # Increment rate limit counters - DISABLED FOR DEVELOPMENT
        # OTPSecurityManager.increment_rate_limit(client_ip)
        # OTPSecurityManager.increment_rate_limit(str(user.id))
        
        # Send OTP email
        try:
            send_otp_email(user, otp)
            
            # Log successful OTP request
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_request_success',
                ip_address=client_ip,
                success=True,
                details={'user_agent': user_agent}
            )
            
            return Response({
                'message': 'OTP sent to your email',
                'expires_in_minutes': get_otp_lifetime_minutes(),
                'expires_in_seconds': get_otp_lifetime_minutes() * 60
            })
            
        except Exception as e:
            logger.error(f"Failed to send OTP email to {email}: {str(e)}")
            return Response({
                'error': 'Failed to send OTP. Please try again.'
            }, status=500)
            
    except Exception as e:
        logger.error(f"Unexpected error in request_otp_secure: {str(e)}")
        return Response({
            'error': 'An unexpected error occurred. Please try again.'
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_secure(request):
    """
    Enhanced OTP verification with security measures
    """
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({
            'error': 'Email and OTP are required'
        }, status=400)
    
    # Get client information
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Validate OTP format
    otp_valid, otp_error = OTPSecurityManager.validate_otp_format(otp)
    if not otp_valid:
        return Response({'error': otp_error}, status=400)
    
    try:
        user = User.objects.get(email=email)
        
        # Check if account is locked - DISABLED FOR DEVELOPMENT
        # if OTPSecurityManager.is_account_locked(user.id):
        #     OTPSecurityManager.log_otp_activity(
        #         user_id=user.id,
        #         activity_type='otp_verification_blocked',
        #         ip_address=client_ip,
        #         success=False,
        #         details={'reason': 'account_locked'}
        #     )
        #     return Response({
        #         'error': 'Account temporarily locked due to suspicious activity.'
        #     }, status=423)
        
        # Check if user is active
        if not user.is_active:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_verification_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'account_inactive'}
            )
            return Response({
                'error': 'Your account is inactive. Please contact the administrator.'
            }, status=403)
        
        # Check if OTP exists
        if not user.otp_code or not user.otp_generated_at:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'no_otp_found'}
            )
            return Response({
                'error': 'No OTP found. Please request a new OTP.'
            }, status=400)
        
        # Check if OTP has expired
        if OTPSecurityManager.is_otp_expired(user.otp_generated_at):
            # Clear expired OTP
            user.otp_code = None
            user.otp_generated_at = None
            user.save(update_fields=['otp_code', 'otp_generated_at'])
            
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'otp_expired'}
            )
            return Response({
                'error': 'OTP has expired. Please request a new OTP.'
            }, status=400)
        
        # Check failed attempts for this OTP - DISABLED FOR DEVELOPMENT
        # attempts_allowed, attempts_error = OTPSecurityManager.check_failed_attempts(
        #     user.id, user.otp_code
        # )
        # if not attempts_allowed:
        #     # Lock account after too many failed attempts
        #     OTPSecurityManager.lock_account(user.id)
        #     
        #     OTPSecurityManager.log_otp_activity(
        #         user_id=user.id,
        #         activity_type='account_locked',
        #         ip_address=client_ip,
        #         success=False,
        #         details={'reason': 'too_many_failed_attempts'}
        #     )
        #     return Response({
        #         'error': 'Too many failed attempts. Account temporarily locked.'
        #     }, status=423)
        
        # Verify OTP
        if user.otp_code == otp:
            # Clear OTP and failed attempts after successful verification
            user.otp_code = None
            user.otp_generated_at = None
            user.save(update_fields=['otp_code', 'otp_generated_at'])
            
            OTPSecurityManager.clear_failed_attempts(user.id, otp)
            OTPSecurityManager.unlock_account(user.id)  # Unlock if previously locked
            
            # Log successful verification
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_verification_success',
                ip_address=client_ip,
                success=True,
                details={'user_agent': user_agent}
            )
            
            # Generate JWT tokens for the user
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            access_token = refresh.access_token
            
            # Log token generation for debugging
            logger.info(f"Token generated for user {user.email}: {str(access_token)[:50]}...")
            
            return Response({
                'message': 'OTP verified successfully',
                'access': str(access_token),
                'refresh': str(refresh)
            })
        else:
            # Increment failed attempts - DISABLED FOR DEVELOPMENT
            # OTPSecurityManager.increment_failed_attempts(user.id, user.otp_code)
            
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'invalid_otp'}
            )
            return Response({
                'error': 'Invalid OTP. Please try again.'
            }, status=400)
            
    except User.DoesNotExist:
        OTPSecurityManager.log_otp_activity(
            user_id=None,
            activity_type='otp_verification_failed',
            ip_address=client_ip,
            success=False,
            details={'reason': 'user_not_found', 'email': email}
        )
        return Response({
            'error': 'User not found'
        }, status=404)
        
    except Exception as e:
        logger.error(f"Unexpected error in verify_otp_secure: {str(e)}")
        return Response({
            'error': 'An error occurred during verification'
        }, status=500)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp_secure(request):
    """
    Enhanced OTP resend with security measures
    """
    email = request.data.get('email')
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=400)
    
    # Get client information
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    try:
        user = User.objects.get(email=email)
        
        # Check if account is locked - DISABLED FOR DEVELOPMENT
        # if OTPSecurityManager.is_account_locked(user.id):
        #     OTPSecurityManager.log_otp_activity(
        #         user_id=user.id,
        #         activity_type='otp_resend_blocked',
        #         ip_address=client_ip,
        #         success=False,
        #         details={'reason': 'account_locked'}
        #     )
        #     return Response({
        #         'error': 'Account temporarily locked due to suspicious activity.'
        #     }, status=423)
        
        # Check if user is active
        if not user.is_active:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_resend_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'account_inactive'}
            )
            return Response({
                'error': 'Your account is inactive. Please contact the administrator.'
            }, status=403)
        
        # Rate limiting checks (same as request_otp) - DISABLED FOR DEVELOPMENT
        # ip_allowed, ip_error = OTPSecurityManager.check_rate_limit(
        #     client_ip, 
        #     OTPSecurityManager.MAX_ATTEMPTS_PER_IP
        # )
        # if not ip_allowed:
        #     return Response({'error': ip_error}, status=429)
        
        # user_allowed, user_error = OTPSecurityManager.check_rate_limit(
        #     str(user.id), 
        #     OTPSecurityManager.MAX_ATTEMPTS_PER_USER
        # )
        # if not user_allowed:
        #     return Response({'error': user_error}, status=429)
        
        # Generate new OTP
        otp = OTPSecurityManager.generate_secure_otp()
        user.otp_code = otp
        user.otp_generated_at = timezone.now()
        user.save(update_fields=['otp_code', 'otp_generated_at'])
        
        # Increment rate limit counters - DISABLED FOR DEVELOPMENT
        # OTPSecurityManager.increment_rate_limit(client_ip)
        # OTPSecurityManager.increment_rate_limit(str(user.id))
        
        # Send OTP email
        try:
            send_otp_email(user, otp)
            
            # Log successful resend
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='otp_resend_success',
                ip_address=client_ip,
                success=True,
                details={'user_agent': user_agent}
            )
            
            return Response({
                'message': 'OTP resent successfully',
                'expires_in_minutes': get_otp_lifetime_minutes(),
                'expires_in_seconds': get_otp_lifetime_minutes() * 60
            })
            
        except Exception as e:
            logger.error(f"Failed to resend OTP email to {email}: {str(e)}")
            return Response({
                'error': 'Failed to resend OTP. Please try again.'
            }, status=500)
            
    except User.DoesNotExist:
        OTPSecurityManager.log_otp_activity(
            user_id=None,
            activity_type='otp_resend_failed',
            ip_address=client_ip,
            success=False,
            details={'reason': 'user_not_found', 'email': email}
        )
        return Response({
            'error': 'User not found'
        }, status=404)
        
    except Exception as e:
        logger.error(f"Unexpected error in resend_otp_secure: {str(e)}")
        return Response({
            'error': 'Failed to resend OTP. Please try again.'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_otp_config(request):
    """
    Get OTP configuration for frontend synchronization
    """
    try:
        # Validate OTP lifetime at runtime
        if not OTPSecurityManager.validate_otp_lifetime():
            logger.error("OTP lifetime validation failed in get_otp_config")
            return Response({
                'error': 'OTP configuration validation failed'
            }, status=500)
        
        return Response({
            'otp_lifetime_minutes': get_otp_lifetime_minutes(),
            'otp_lifetime_seconds': get_otp_lifetime_minutes() * 60,
            'otp_length': OTPSecurityManager.OTP_LENGTH,
            'max_attempts_per_otp': OTPSecurityManager.MAX_FAILED_VERIFICATIONS,
            'account_lockout_minutes': OTPSecurityManager.ACCOUNT_LOCKOUT_MINUTES,
            'security_policy': 'strict_5_minute_otp_lifetime'
        })
        
    except Exception as e:
        logger.error(f"Error in get_otp_config: {str(e)}")
        return Response({
            'error': 'Failed to retrieve OTP configuration'
        }, status=500)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_otp_security_report(request):
    """
    Get comprehensive OTP security report (for monitoring/debugging)
    """
    try:
        # Only allow in development or for admin users
        from django.conf import settings
        from django.contrib.auth.models import User
        
        is_development = getattr(settings, 'DEBUG', False)
        is_admin = request.user.is_authenticated and request.user.is_staff
        
        if not (is_development or is_admin):
            return Response({
                'error': 'Access denied - security report only available in development or for admin users'
            }, status=403)
        
        security_report = OTPSecurityValidator.get_security_report()
        
        return Response(security_report)
        
    except Exception as e:
        logger.error(f"Error in get_otp_security_report: {str(e)}")
        return Response({
            'error': 'Failed to generate security report'
        }, status=500)
