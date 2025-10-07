#!/usr/bin/env python3
"""
Test script for the admin dashboard endpoint
"""
import requests
import json

def test_admin_dashboard():
    base_url = "http://127.0.0.1:8000/api"
    
    # First, let's try to get a token (you'll need to replace with actual credentials)
    login_data = {
        "username": "admin",  # Replace with actual admin username
        "password": "admin123"  # Replace with actual admin password
    }
    
    try:
        # Try to login first
        login_response = requests.post(f"{base_url}/token/", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json()["access"]
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test the admin dashboard endpoint
            dashboard_response = requests.get(
                f"{base_url}/admin-dashboard/?time_range=last_month",
                headers=headers
            )
            
            print(f"Dashboard Response Status: {dashboard_response.status_code}")
            if dashboard_response.status_code == 200:
                data = dashboard_response.json()
                print("✅ Admin dashboard endpoint is working!")
                print(f"Response keys: {list(data.keys())}")
            else:
                print(f"❌ Error: {dashboard_response.status_code}")
                print(f"Response: {dashboard_response.text}")
        else:
            print(f"❌ Login failed: {login_response.status_code}")
            print(f"Response: {login_response.text}")
            
    except requests.exceptions.ConnectionError:
        print("❌ Could not connect to the server. Make sure the Django server is running on 127.0.0.1:8000")
    except Exception as e:
        print(f"❌ Error: {str(e)}")

if __name__ == "__main__":
    test_admin_dashboard()
