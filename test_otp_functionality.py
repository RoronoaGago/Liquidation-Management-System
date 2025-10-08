#!/usr/bin/env python3
"""
Test script to verify OTP functionality is working properly
"""
import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000/api"
TEST_EMAIL = "test@example.com"  # Replace with a valid test email
TEST_PASSWORD = "testpassword"   # Replace with a valid test password

def test_otp_request():
    """Test OTP request endpoint"""
    print("🔍 Testing OTP request endpoint...")
    
    url = f"{BASE_URL}/request-otp-secure/"
    data = {
        "email": TEST_EMAIL,
        "password": TEST_PASSWORD
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ OTP request successful!")
            return True
        else:
            print("❌ OTP request failed!")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def test_otp_verify():
    """Test OTP verification endpoint"""
    print("\n🔍 Testing OTP verification endpoint...")
    
    url = f"{BASE_URL}/verify-otp-secure/"
    data = {
        "email": TEST_EMAIL,
        "otp": "123456"  # Test OTP
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ OTP verification successful!")
            return True
        else:
            print("❌ OTP verification failed (expected for test OTP)")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def test_otp_resend():
    """Test OTP resend endpoint"""
    print("\n🔍 Testing OTP resend endpoint...")
    
    url = f"{BASE_URL}/resend-otp-secure/"
    data = {
        "email": TEST_EMAIL
    }
    
    try:
        response = requests.post(url, json=data, timeout=10)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.json()}")
        
        if response.status_code == 200:
            print("✅ OTP resend successful!")
            return True
        else:
            print("❌ OTP resend failed!")
            return False
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return False

def main():
    """Run all OTP tests"""
    print("🚀 Starting OTP functionality tests...")
    print(f"Base URL: {BASE_URL}")
    print(f"Test Email: {TEST_EMAIL}")
    print("=" * 50)
    
    # Test OTP request
    request_success = test_otp_request()
    
    # Test OTP verification (will fail with test OTP, but endpoint should work)
    verify_success = test_otp_verify()
    
    # Test OTP resend
    resend_success = test_otp_resend()
    
    print("\n" + "=" * 50)
    print("📊 Test Results Summary:")
    print(f"OTP Request: {'✅ PASS' if request_success else '❌ FAIL'}")
    print(f"OTP Verify: {'✅ PASS' if verify_success else '❌ FAIL (expected)'}")
    print(f"OTP Resend: {'✅ PASS' if resend_success else '❌ FAIL'}")
    
    if request_success and resend_success:
        print("\n🎉 OTP functionality is working properly!")
        return 0
    else:
        print("\n⚠️  Some OTP endpoints may have issues. Check the server logs.")
        return 1

if __name__ == "__main__":
    sys.exit(main())
