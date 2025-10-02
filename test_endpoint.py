import requests
import json

# Test the endpoint
url = "http://127.0.0.1:8000/api/last-liquidated-request/"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer test_token"  # This will fail but we can see the response
}

try:
    response = requests.get(url, headers=headers)
    print(f"Status Code: {response.status_code}")
    print(f"Response: {response.text}")
except Exception as e:
    print(f"Error: {e}")
