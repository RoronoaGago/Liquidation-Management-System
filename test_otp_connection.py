#!/usr/bin/env python3
"""
Test script to verify OTP connection between frontend and backend
"""
import requests
import json

# Backend URL
BASE_URL = "http://127.0.0.1:8000/api"

def test_otp_endpoints():
    """Test all OTP endpoints"""
    
    print("🔍 Testing OTP Connection...")
    print("=" * 50)
    
    # Test data
    test_email = "test@example.com"
    test_password = "testpassword"
    test_otp = "123456"
    
    # Test 1: Request OTP (Secure)
    print("1. Testing Request OTP (Secure)...")
    try:
        response = requests.post(
            f"{BASE_URL}/request-otp-secure/",
            json={"email": test_email, "password": test_password},
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print()
    
    # Test 2: Verify OTP (Secure)
    print("2. Testing Verify OTP (Secure)...")
    try:
        response = requests.post(
            f"{BASE_URL}/verify-otp-secure/",
            json={"email": test_email, "otp": test_otp},
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print()
    
    # Test 3: Resend OTP (Secure)
    print("3. Testing Resend OTP (Secure)...")
    try:
        response = requests.post(
            f"{BASE_URL}/resend-otp-secure/",
            json={"email": test_email},
            headers={"Content-Type": "application/json"}
        )
        print(f"   Status: {response.status_code}")
        print(f"   Response: {response.json()}")
    except Exception as e:
        print(f"   Error: {e}")
    
    print()
    
    # Test 4: Compare with old endpoints
    print("4. Testing Old OTP Endpoints (for comparison)...")
    try:
        response = requests.post(
            f"{BASE_URL}/request-otp/",
            json={"email": test_email, "password": test_password},
            headers={"Content-Type": "application/json"}
        )
        print(f"   Old Request OTP Status: {response.status_code}")
    except Exception as e:
        print(f"   Old endpoint error: {e}")
    
    print()
    print("✅ OTP Connection Test Complete!")
    print("=" * 50)

if __name__ == "__main__":
    test_otp_endpoints()
