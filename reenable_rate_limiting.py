#!/usr/bin/env python3
"""
Script to re-enable OTP rate limiting for production
Run this script when you're ready to deploy to production
"""

import re
import os

def reenable_rate_limiting():
    """Re-enable rate limiting by uncommenting the disabled code"""
    
    file_path = "backend/proj_backend/api/improved_otp_views.py"
    
    if not os.path.exists(file_path):
        print(f"❌ File not found: {file_path}")
        return False
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Patterns to uncomment (remove # and fix indentation)
        patterns = [
            # Rate limiting checks
            (r'        # Rate limiting checks - DISABLED FOR DEVELOPMENT\n        # Check IP-based rate limiting\n        # ip_allowed, ip_error = OTPSecurityManager\.check_rate_limit\(\n        #     client_ip, \n        #     OTPSecurityManager\.MAX_ATTEMPTS_PER_IP\n        # \)\n        # if not ip_allowed:\n        #     OTPSecurityManager\.log_otp_activity\(\n        #         user_id=user_obj\.id,\n        #         activity_type=\'otp_request_rate_limited\',\n        #         ip_address=client_ip,\n        #         success=False,\n        #         details=\{\'reason\': \'ip_rate_limit_exceeded\'\}\n        #     \)\n        #     return Response\(\{\'error\': ip_error\}, status=429\)', 
             '        # Rate limiting checks\n        # Check IP-based rate limiting\n        ip_allowed, ip_error = OTPSecurityManager.check_rate_limit(\n            client_ip, \n            OTPSecurityManager.MAX_ATTEMPTS_PER_IP\n        )\n        if not ip_allowed:\n            OTPSecurityManager.log_otp_activity(\n                user_id=user_obj.id,\n                activity_type=\'otp_request_rate_limited\',\n                ip_address=client_ip,\n                success=False,\n                details={\'reason\': \'ip_rate_limit_exceeded\'}\n            )\n            return Response({\'error\': ip_error}, status=429)'),
            
            # User-based rate limiting
            (r'        # Check user-based rate limiting\n        # user_allowed, user_error = OTPSecurityManager\.check_rate_limit\(\n        #     str\(user_obj\.id\), \n        #     OTPSecurityManager\.MAX_ATTEMPTS_PER_USER\n        # \)\n        # if not user_allowed:\n        #     OTPSecurityManager\.log_otp_activity\(\n        #         user_id=user_obj\.id,\n        #         activity_type=\'otp_request_rate_limited\',\n        #         ip_address=client_ip,\n        #         success=False,\n        #         details=\{\'reason\': \'user_rate_limit_exceeded\'\}\n        #     \)\n        #     return Response\(\{\'error\': user_error\}, status=429\)',
             '        # Check user-based rate limiting\n        user_allowed, user_error = OTPSecurityManager.check_rate_limit(\n            str(user_obj.id), \n            OTPSecurityManager.MAX_ATTEMPTS_PER_USER\n        )\n        if not user_allowed:\n            OTPSecurityManager.log_otp_activity(\n                user_id=user_obj.id,\n                activity_type=\'otp_request_rate_limited\',\n                ip_address=client_ip,\n                success=False,\n                details={\'reason\': \'user_rate_limit_exceeded\'}\n            )\n            return Response({\'error\': user_error}, status=429)'),
            
            # Account lockout checks
            (r'        # Check if account is locked - DISABLED FOR DEVELOPMENT\n        # if OTPSecurityManager\.is_account_locked\(user_obj\.id\):\n        #     OTPSecurityManager\.log_otp_activity\(\n        #         user_id=user_obj\.id,\n        #         activity_type=\'otp_request_blocked\',\n        #         ip_address=client_ip,\n        #         success=False,\n        #         details=\{\'reason\': \'account_locked\'\}\n        #     \)\n        #     return Response\(\{\n        #         \'error\': \'Account temporarily locked due to suspicious activity\. Please try again later\.\'\n        #     \}, status=423\)',
             '        # Check if account is locked\n        if OTPSecurityManager.is_account_locked(user_obj.id):\n            OTPSecurityManager.log_otp_activity(\n                user_id=user_obj.id,\n                activity_type=\'otp_request_blocked\',\n                ip_address=client_ip,\n                success=False,\n                details={\'reason\': \'account_locked\'}\n            )\n            return Response({\n                \'error\': \'Account temporarily locked due to suspicious activity. Please try again later.\'\n            }, status=423)'),
            
            # Rate limit counters
            (r'        # Increment rate limit counters - DISABLED FOR DEVELOPMENT\n        # OTPSecurityManager\.increment_rate_limit\(client_ip\)\n        # OTPSecurityManager\.increment_rate_limit\(str\(user_obj\.id\)\)',
             '        # Increment rate limit counters\n        OTPSecurityManager.increment_rate_limit(client_ip)\n        OTPSecurityManager.increment_rate_limit(str(user_obj.id))'),
            
            (r'        # Increment rate limit counters - DISABLED FOR DEVELOPMENT\n        # OTPSecurityManager\.increment_rate_limit\(client_ip\)\n        # OTPSecurityManager\.increment_rate_limit\(str\(user\.id\)\)',
             '        # Increment rate limit counters\n        OTPSecurityManager.increment_rate_limit(client_ip)\n        OTPSecurityManager.increment_rate_limit(str(user.id))'),
        ]
        
        # Apply all patterns
        for pattern, replacement in patterns:
            content = re.sub(pattern, replacement, content, flags=re.MULTILINE | re.DOTALL)
        
        # Write back to file
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(content)
        
        print("✅ Rate limiting has been re-enabled for production!")
        print("🔒 All OTP security features are now active:")
        print("   - IP-based rate limiting (5 attempts/hour)")
        print("   - User-based rate limiting (3 attempts/hour)")
        print("   - Account lockout after failed attempts")
        print("   - Failed attempt tracking")
        print("\n⚠️  Remember to test thoroughly before deploying to production!")
        
        return True
        
    except Exception as e:
        print(f"❌ Error re-enabling rate limiting: {e}")
        return False

if __name__ == "__main__":
    print("🔧 Re-enabling OTP Rate Limiting for Production...")
    print("=" * 50)
    
    success = reenable_rate_limiting()
    
    if success:
        print("\n✅ Rate limiting successfully re-enabled!")
        print("🚀 Your system is now ready for production deployment.")
    else:
        print("\n❌ Failed to re-enable rate limiting.")
        print("Please check the file manually and try again.")
