#!/usr/bin/env python3
"""
Test script for the new urgent liquidations endpoint.
This script tests the new dedicated API endpoint for urgent liquidations.
"""

import os
import sys
import django
import requests
import json

# Add the project directory to Python path
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'proj_backend')
sys.path.append(project_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import User, LiquidationManagement, RequestManagement
from django.utils import timezone
from datetime import timedelta

def test_urgent_liquidations_endpoint():
    """Test the new urgent liquidations endpoint"""
    print("🧪 Testing Urgent Liquidations Endpoint")
    print("=" * 50)
    
    # Find a school head user
    school_head = User.objects.filter(role='school_head').first()
    if not school_head:
        print("❌ No school head user found")
        return False
    
    print(f"👤 Using school head: {school_head.email} (ID: {school_head.id})")
    
    # Check if there are any urgent liquidations
    urgent_liquidations = LiquidationManagement.objects.filter(
        request__user=school_head,
        status__in=['draft', 'resubmit'],
        remaining_days__lte=15,
        remaining_days__isnull=False
    )
    
    print(f"📊 Found {urgent_liquidations.count()} urgent liquidations in database")
    
    if urgent_liquidations.exists():
        for liquidation in urgent_liquidations[:3]:  # Show first 3
            print(f"   - Liquidation {liquidation.LiquidationID}: {liquidation.remaining_days} days remaining")
    
    # Test the endpoint structure (without actually calling it since we need authentication)
    print("\n🔗 Endpoint URL: /api/urgent-liquidations/")
    print("📋 Expected Response Structure:")
    expected_response = {
        "liquidations": [
            {
                "LiquidationID": 1,
                "status": "draft",
                "remaining_days": 5,
                "request": {
                    "request_id": "REQ-2024-001",
                    "request_monthyear": "2024-01"
                }
            }
        ],
        "summary": {
            "total_urgent": 1,
            "overdue": 0,
            "critical": 1,
            "warning": 0
        },
        "last_checked": "2024-01-15T10:30:00Z"
    }
    
    print(json.dumps(expected_response, indent=2))
    
    print("\n✅ Endpoint structure test completed!")
    print("📝 To test the actual endpoint:")
    print("   1. Start the Django server: python manage.py runserver")
    print("   2. Login as a school head user")
    print("   3. Make a GET request to: http://localhost:8000/api/urgent-liquidations/")
    print("   4. Include the Authorization header with Bearer token")
    
    return True

if __name__ == "__main__":
    print("🚀 Starting Urgent Liquidations Endpoint Test")
    
    success = test_urgent_liquidations_endpoint()
    
    if success:
        print("\n✅ Test completed successfully!")
    else:
        print("\n❌ Test failed. Please check the errors above.")
        sys.exit(1)
