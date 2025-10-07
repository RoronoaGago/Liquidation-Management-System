#!/usr/bin/env python3
"""
Simple test to check Django server configuration
"""
import requests
import json

def test_django_endpoints():
    base_url = "http://127.0.0.1:8000"
    
    # Test endpoints in order of complexity
    endpoints_to_test = [
        "/api/test/",  # Simple test endpoint
        "/api/school-districts/",  # Your problematic endpoint
        "/api/school-districts?show_all=true",  # With parameters
    ]
    
    for endpoint in endpoints_to_test:
        url = f"{base_url}{endpoint}"
        print(f"\n🔍 Testing: {url}")
        
        try:
            response = requests.get(url, timeout=5)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                try:
                    data = response.json()
                    print(f"   ✅ Success: {json.dumps(data, indent=2)[:200]}...")
                except:
                    print(f"   ✅ Success (non-JSON): {response.text[:200]}...")
            else:
                print(f"   ❌ Error: {response.text[:200]}...")
                
        except requests.exceptions.ConnectionError:
            print(f"   ❌ Connection Error: Server not responding")
        except requests.exceptions.Timeout:
            print(f"   ❌ Timeout: Request took too long")
        except Exception as e:
            print(f"   ❌ Unexpected Error: {e}")

if __name__ == "__main__":
    test_django_endpoints()
