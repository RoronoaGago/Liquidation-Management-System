"""
OTP-Based Password Reset Views
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.core.cache import cache
from django.contrib.auth.hashers import make_password
from .models import User
from .utils import send_otp_email
from .otp_security import (
    OTPSecurityManager, 
    get_client_ip, 
    get_user_agent
)
from .audit_utils import log_audit_event
import logging

logger = logging.getLogger(__name__)


@api_view(['POST'])
@permission_classes([AllowAny])
def request_password_reset_otp(request):
    """
    Request OTP for password reset (no password required)
    """
    email = request.data.get('email')
    
    if not email:
        return Response({
            'error': 'Email is required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get client information for security tracking
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    try:
        # Check if user exists
        try:
            user = User.objects.get(email=email.lower())
        except User.DoesNotExist:
            # Don't reveal if user exists or not for security
            return Response({
                'message': 'If the email exists, an OTP has been sent'
            }, status=status.HTTP_200_OK)
        
        # Check if user is active
        if not user.is_active:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'account_inactive'}
            )
            return Response({
                'message': 'If the email exists, an OTP has been sent'
            }, status=status.HTTP_200_OK)
        
        # Check IP-based rate limiting
        ip_allowed, ip_error = OTPSecurityManager.check_rate_limit(
            client_ip, 
            OTPSecurityManager.MAX_ATTEMPTS_PER_IP
        )
        if not ip_allowed:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_rate_limited',
                ip_address=client_ip,
                success=False,
                details={'reason': 'ip_rate_limit_exceeded'}
            )
            return Response({'error': ip_error}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Check user-based rate limiting
        user_allowed, user_error = OTPSecurityManager.check_rate_limit(
            str(user.id), 
            OTPSecurityManager.MAX_ATTEMPTS_PER_USER
        )
        if not user_allowed:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_rate_limited',
                ip_address=client_ip,
                success=False,
                details={'reason': 'user_rate_limit_exceeded'}
            )
            return Response({'error': user_error}, status=status.HTTP_429_TOO_MANY_REQUESTS)
        
        # Generate secure OTP
        otp = OTPSecurityManager.generate_secure_otp()
        
        # Store OTP with timestamp and mark as password reset OTP
        user.otp_code = otp
        user.otp_generated_at = timezone.now()
        user.save(update_fields=['otp_code', 'otp_generated_at'])
        
        # Store OTP purpose in cache for verification
        cache_key = f"otp_purpose:{user.id}:{otp}"
        cache.set(cache_key, 'password_reset', OTPSecurityManager.OTP_LIFETIME_MINUTES * 60)
        
        # Increment rate limit counters
        OTPSecurityManager.increment_rate_limit(client_ip)
        OTPSecurityManager.increment_rate_limit(str(user.id))
        
        # Send password reset OTP email
        try:
            send_password_reset_otp_email(user, otp)
            
            # Log successful OTP request
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_otp_sent',
                ip_address=client_ip,
                success=True,
                details={'user_agent': user_agent}
            )
            
            return Response({
                'message': 'If the email exists, an OTP has been sent',
                'expires_in_minutes': OTPSecurityManager.OTP_LIFETIME_MINUTES
            })
            
        except Exception as e:
            logger.error(f"Failed to send password reset OTP email to {email}: {str(e)}")
            return Response({
                'error': 'Failed to send OTP. Please try again.'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        logger.error(f"Unexpected error in request_password_reset_otp: {str(e)}")
        return Response({
            'error': 'An unexpected error occurred. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_password_reset_otp(request):
    """
    Verify OTP for password reset
    """
    email = request.data.get('email')
    otp = request.data.get('otp')
    
    if not email or not otp:
        return Response({
            'error': 'Email and OTP are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get client information
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Validate OTP format
    otp_valid, otp_error = OTPSecurityManager.validate_otp_format(otp)
    if not otp_valid:
        return Response({'error': otp_error}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        user = User.objects.get(email=email.lower())
        
        # Check if account is locked
        if OTPSecurityManager.is_account_locked(user.id):
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'account_locked'}
            )
            return Response({
                'error': 'Account temporarily locked due to suspicious activity.'
            }, status=status.HTTP_423_LOCKED)
        
        # Check if user is active
        if not user.is_active:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'account_inactive'}
            )
            return Response({
                'error': 'Your account is inactive. Please contact the administrator.'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if OTP exists and is valid
        if not user.otp_code or not user.otp_generated_at:
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'no_otp_found'}
            )
            return Response({
                'error': 'No OTP found. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check OTP expiry
        if OTPSecurityManager.is_otp_expired(user.otp_generated_at):
            # Clear expired OTP
            user.otp_code = None
            user.otp_generated_at = None
            user.save(update_fields=['otp_code', 'otp_generated_at'])
            
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'otp_expired'}
            )
            return Response({
                'error': 'OTP has expired. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if this is a password reset OTP
        cache_key = f"otp_purpose:{user.id}:{otp}"
        otp_purpose = cache.get(cache_key)
        if otp_purpose != 'password_reset':
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'invalid_otp_purpose'}
            )
            return Response({
                'error': 'Invalid OTP. Please request a new one.'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check failed attempts
        attempts_allowed, attempts_error = OTPSecurityManager.check_failed_attempts(user.id, user.otp_code)
        if not attempts_allowed:
            OTPSecurityManager.lock_account(user.id)
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_blocked',
                ip_address=client_ip,
                success=False,
                details={'reason': 'too_many_failed_attempts'}
            )
            return Response({
                'error': attempts_error or 'Too many failed attempts. Account temporarily locked.'
            }, status=status.HTTP_423_LOCKED)
        
        # Verify OTP
        if user.otp_code == otp:
            # Clear OTP and failed attempts after successful verification
            user.otp_code = None
            user.otp_generated_at = None
            user.save(update_fields=['otp_code', 'otp_generated_at'])
            
            # Clear OTP purpose from cache
            cache.delete(cache_key)
            
            OTPSecurityManager.clear_failed_attempts(user.id, otp)
            OTPSecurityManager.unlock_account(user.id)  # Unlock if previously locked
            
            # Log successful verification
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_otp_verified',
                ip_address=client_ip,
                success=True,
                details={'user_agent': user_agent}
            )
            
            # Generate a temporary token for password reset (valid for 10 minutes)
            reset_token = OTPSecurityManager.generate_secure_otp()  # Use OTP as token
            cache_key = f"password_reset_token:{user.id}:{reset_token}"
            cache.set(cache_key, user.id, 600)  # 10 minutes
            
            return Response({
                'message': 'OTP verified successfully',
                'reset_token': reset_token,
                'user_id': user.id
            })
        else:
            # Increment failed attempts
            OTPSecurityManager.increment_failed_attempts(user.id, user.otp_code)
            
            OTPSecurityManager.log_otp_activity(
                user_id=user.id,
                activity_type='password_reset_verification_failed',
                ip_address=client_ip,
                success=False,
                details={'reason': 'invalid_otp'}
            )
            return Response({
                'error': 'Invalid OTP. Please try again.'
            }, status=status.HTTP_400_BAD_REQUEST)
            
    except User.DoesNotExist:
        return Response({
            'error': 'Invalid email or OTP.'
        }, status=status.HTTP_400_BAD_REQUEST)
    except Exception as e:
        logger.error(f"Unexpected error in verify_password_reset_otp: {str(e)}")
        return Response({
            'error': 'An unexpected error occurred. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([AllowAny])
def reset_password_with_token(request):
    """
    Reset password using the token from OTP verification
    """
    user_id = request.data.get('user_id')
    reset_token = request.data.get('reset_token')
    new_password = request.data.get('new_password')
    
    if not all([user_id, reset_token, new_password]):
        return Response({
            'error': 'User ID, reset token, and new password are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    # Get client information
    client_ip = get_client_ip(request)
    user_agent = get_user_agent(request)
    
    # Validate password strength
    if len(new_password) < 8:
        return Response({
            'error': 'Password must be at least 8 characters'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        # Verify reset token
        cache_key = f"password_reset_token:{user_id}:{reset_token}"
        cached_user_id = cache.get(cache_key)
        
        if not cached_user_id or str(cached_user_id) != str(user_id):
            return Response({
                'error': 'Invalid or expired reset token'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        try:
            user = User.objects.get(id=user_id)
        except User.DoesNotExist:
            return Response({
                'error': 'User not found'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if user is active
        if not user.is_active:
            return Response({
                'error': 'Account is inactive'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Check if new password is different from current password
        if user.check_password(new_password):
            return Response({
                'error': 'New password must be different from your current password'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        user.set_password(new_password)
        user.password_change_required = False  # Reset this flag
        user.save(update_fields=['password', 'password_change_required'])
        
        # Clear reset token
        cache.delete(cache_key)
        
        # Log password reset
        log_audit_event(
            request=request,
            action='password_change',
            module='auth',
            description=f"Password reset via OTP for user {user.get_full_name()}",
            object_id=user.pk,
            object_type='User',
            object_name=user.get_full_name()
        )
        
        OTPSecurityManager.log_otp_activity(
            user_id=user.id,
            activity_type='password_reset_completed',
            ip_address=client_ip,
            success=True,
            details={'user_agent': user_agent}
        )
        
        return Response({
            'message': 'Password reset successfully. Please login with your new password.'
        })
        
    except Exception as e:
        logger.error(f"Unexpected error in reset_password_with_token: {str(e)}")
        return Response({
            'error': 'An unexpected error occurred. Please try again.'
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


def send_password_reset_otp_email(user, otp):
    """
    Send password reset OTP email using the existing otp_passreset.html template
    """
    from django.core.mail import send_mail
    from django.template.loader import render_to_string
    from django.utils import timezone
    
    context = {
        'user': user,
        'otp_code': otp,  # Use 'otp_code' to match the template variable
        'now': timezone.now(),
        'expires_in_minutes': OTPSecurityManager.OTP_LIFETIME_MINUTES,
    }
    
    html_message = render_to_string('emails/otp_passreset.html', context)
    
    send_mail(
        subject="Password Reset OTP - MOOE Liquidation System",
        message=f"Your password reset OTP is: {otp}. This code expires in {OTPSecurityManager.OTP_LIFETIME_MINUTES} minutes.",
        from_email=None,
        recipient_list=[user.email],
        fail_silently=True,
        html_message=html_message,
    )
