#!/usr/bin/env python3
"""
Simple test script to verify OTP functionality
Run this from the backend directory: python test_otp.py
"""

import os
import sys
import django
import requests
import json

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proj_backend.settings')
django.setup()

from django.contrib.auth import get_user_model
from api.utils import generate_otp, send_otp_email
from django.utils import timezone

User = get_user_model()

def test_otp_generation():
    """Test OTP generation"""
    print("Testing OTP generation...")
    
    # Test multiple OTPs to ensure they're different
    otps = [generate_otp() for _ in range(5)]
    print(f"Generated OTPs: {otps}")
    
    # Check if all OTPs are 6 digits
    for otp in otps:
        assert len(otp) == 6, f"OTP should be 6 digits, got {len(otp)}"
        assert otp.isdigit(), f"OTP should contain only digits, got {otp}"
    
    # Check if OTPs are different (very unlikely to be the same)
    assert len(set(otps)) > 1, "Generated OTPs should be different"
    
    print("✅ OTP generation test passed!")

def test_otp_endpoints():
    """Test OTP API endpoints"""
    print("\nTesting OTP API endpoints...")
    
    base_url = "http://127.0.0.1:8000/api"
    
    # Test data
    test_email = "test@example.com"
    test_password = "testpassword123"
    
    try:
        # Test request OTP endpoint
        print("Testing request OTP endpoint...")
        response = requests.post(f"{base_url}/request-otp/", {
            "email": test_email,
            "password": test_password
        })
        print(f"Request OTP response: {response.status_code}")
        
        if response.status_code == 200:
            print("✅ Request OTP endpoint working!")
        else:
            print(f"❌ Request OTP failed: {response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Make sure Django server is running on port 8000")
    except Exception as e:
        print(f"❌ Error testing endpoints: {e}")

def test_user_otp_fields():
    """Test User model OTP fields"""
    print("\nTesting User model OTP fields...")
    
    try:
        # Create a test user
        user, created = User.objects.get_or_create(
            email="otptest@example.com",
            defaults={
                "first_name": "OTP",
                "last_name": "Test",
                "password_change_required": False
            }
        )
        
        if created:
            user.set_password("testpassword123")
            user.save()
            print("Created test user")
        else:
            print("Using existing test user")
        
        # Test OTP fields
        user.otp_code = generate_otp()
        user.otp_generated_at = timezone.now()
        user.save()
        
        # Verify fields are saved
        user.refresh_from_db()
        assert user.otp_code is not None, "OTP code should be set"
        assert user.otp_generated_at is not None, "OTP generated time should be set"
        
        print("✅ User OTP fields test passed!")
        
        # Clean up
        user.delete()
        print("Cleaned up test user")
        
    except Exception as e:
        print(f"❌ User OTP fields test failed: {e}")

def main():
    """Run all tests"""
    print("🧪 Starting OTP functionality tests...\n")
    
    test_otp_generation()
    test_user_otp_fields()
    test_otp_endpoints()
    
    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    main()
