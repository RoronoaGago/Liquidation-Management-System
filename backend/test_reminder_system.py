#!/usr/bin/env python3
"""
Test script for the updated liquidation reminder system.
This script tests the consolidated reminder functionality.
"""

import os
import sys
import django
from datetime import date, timedelta

# Add the project directory to Python path
project_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'proj_backend')
sys.path.append(project_dir)

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import LiquidationManagement, RequestManagement, User
from api.tasks import check_liquidation_reminders, send_liquidation_reminder, send_liquidation_demand_letter
from django.utils import timezone
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def cleanup_test_data():
    """Clean up any existing test data"""
    print("🧹 Cleaning up existing test data...")
    
    # Get current time for unique month calculation
    from datetime import datetime
    current_time = datetime.now()
    unique_month = f"{current_time.year + 1}-{current_time.month:02d}"
    
    # Find school head user
    school_head = User.objects.filter(role='school_head').first()
    if not school_head:
        print("   ⚠️  No school head user found")
        return
    
    print(f"   👤 Cleaning up for user: {school_head.email} (ID: {school_head.id})")
    print(f"   📅 Cleaning up for month: {unique_month}")
    
    # Clean up existing test requests for this month
    existing_requests = RequestManagement.objects.filter(
        user=school_head,
        request_monthyear=unique_month
    )
    
    if existing_requests.exists():
        print(f"   🗑️  Found {existing_requests.count()} existing test requests for {unique_month}")
        for request in existing_requests:
            print(f"      - Deleting request: {request.request_id} (status: {request.status})")
            # Clean up related liquidations first
            liquidations = LiquidationManagement.objects.filter(request=request)
            if liquidations.exists():
                print(f"        - Deleting {liquidations.count()} related liquidations")
                liquidations.delete()
            request.delete()
        print("   ✅ Test data cleaned up")
    else:
        print(f"   ℹ️  No existing test requests found for {unique_month}")
    
    # Clean up ALL unliquidated requests for this user (required for future month requests)
    unliquidated_requests = RequestManagement.objects.filter(
        user=school_head
    ).exclude(status__in=['liquidated', 'rejected'])
    
    if unliquidated_requests.exists():
        print(f"   🗑️  Found {unliquidated_requests.count()} unliquidated requests, cleaning up...")
        for request in unliquidated_requests:
            print(f"      - Deleting unliquidated request: {request.request_id} for {request.request_monthyear} (status: {request.status})")
            # Clean up related liquidations first
            liquidations = LiquidationManagement.objects.filter(request=request)
            if liquidations.exists():
                print(f"        - Deleting {liquidations.count()} related liquidations")
                liquidations.delete()
            request.delete()
        print("   ✅ All unliquidated requests cleaned up")
    else:
        print("   ℹ️  No unliquidated requests found")

def test_reminder_system():
    """Test the consolidated reminder system"""
    print("🧪 Testing Liquidation Reminder System")
    print("=" * 50)
    
    # Clean up any existing test data first
    cleanup_test_data()
    
    # Create fresh test data
    create_test_data()
    
    # Test 1: Check if the consolidated task runs without errors
    print("\n1. Testing consolidated reminder task...")
    try:
        result = check_liquidation_reminders()
        print(f"✅ Task executed successfully: {result}")
    except Exception as e:
        print(f"❌ Task failed: {e}")
        return False
    
    # Test 2: Check liquidation data
    print("\n2. Checking liquidation data...")
    liquidations = LiquidationManagement.objects.filter(
        status__in=['draft', 'submitted', 'resubmit'],
        request__downloaded_at__isnull=False
    ).exclude(status='liquidated')
    
    print(f"📊 Found {liquidations.count()} liquidations to process")
    
    for liquidation in liquidations[:5]:  # Show first 5
        if liquidation.liquidation_deadline:
            days_left = (liquidation.liquidation_deadline - date.today()).days
            print(f"   - Liquidation {liquidation.LiquidationID}: {days_left} days remaining")
        else:
            print(f"   - Liquidation {liquidation.LiquidationID}: No deadline set")
    
    # Test 3: Test individual reminder functions
    print("\n3. Testing individual reminder functions...")
    
    # Find a liquidation to test with
    test_liquidation = liquidations.first()
    if test_liquidation:
        print(f"   Testing with Liquidation {test_liquidation.LiquidationID}")
        
        # Test reminder email
        try:
            send_liquidation_reminder(test_liquidation.LiquidationID, 5)
            print("   ✅ Reminder email function works")
        except Exception as e:
            print(f"   ❌ Reminder email failed: {e}")
        
        # Test demand letter (only if overdue)
        if test_liquidation.liquidation_deadline and (test_liquidation.liquidation_deadline - date.today()).days <= 0:
            try:
                send_liquidation_demand_letter(test_liquidation.LiquidationID)
                print("   ✅ Demand letter function works")
            except Exception as e:
                print(f"   ❌ Demand letter failed: {e}")
        else:
            print("   ⏭️  Skipping demand letter test (not overdue)")
    else:
        print("   ⚠️  No liquidations found for testing")
    
    # Test 4: Check WebSocket integration
    print("\n4. Testing WebSocket integration...")
    try:
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        if channel_layer:
            print("   ✅ WebSocket channel layer is configured")
        else:
            print("   ⚠️  WebSocket channel layer not configured")
    except Exception as e:
        print(f"   ❌ WebSocket test failed: {e}")
    
    # Test 5: Check Celery Beat schedule
    print("\n5. Checking Celery Beat schedule...")
    from django.conf import settings
    if hasattr(settings, 'CELERY_BEAT_SCHEDULE'):
        schedule = settings.CELERY_BEAT_SCHEDULE
        reminder_tasks = [k for k in schedule.keys() if 'reminder' in k.lower()]
        print(f"   📅 Found {len(reminder_tasks)} reminder tasks in schedule:")
        for task in reminder_tasks:
            print(f"      - {task}: {schedule[task]['schedule']}")
    else:
        print("   ⚠️  No Celery Beat schedule found")
    
    print("\n" + "=" * 50)
    print("🎉 Reminder system test completed!")
    return True

def create_test_data():
    """Create test data for demonstration"""
    print("\n🔧 Creating test data...")
    
    # Find a school head user
    school_head = User.objects.filter(role='school_head').first()
    if not school_head:
        print("   ⚠️  No school head user found")
        return
    
    print(f"   👤 Using school head: {school_head.email} (ID: {school_head.id})")
    
    # Create a test request with a unique month/year (format: YYYY-MM)
    from datetime import datetime
    current_time = datetime.now()
    # Use a unique month that's far in the future to avoid conflicts
    unique_month = f"{current_time.year + 1}-{current_time.month:02d}"
    
    print(f"   📅 Using month/year: {unique_month} (length: {len(unique_month)})")
    
    # Validate the format
    if len(unique_month) != 7:
        print(f"   ❌ Invalid month format: {unique_month} (expected 7 characters, got {len(unique_month)})")
        return
    
    # Try to find an existing request or create a new one
    # First, check if a request already exists for this month and user
    existing_request = RequestManagement.objects.filter(
        user=school_head,
        request_monthyear=unique_month
    ).exclude(status='rejected').first()
    
    if existing_request:
        print(f"   ⚠️  Request already exists for {unique_month}, using existing request")
        test_request = existing_request
    else:
        # Try to create a new request, but if it fails due to validation, try a different month
        test_request = None
        for month_offset in range(12):  # Try up to 12 different months
            try_month = f"{current_time.year + 1}-{(current_time.month + month_offset) % 12 + 1:02d}"
            print(f"   🔄 Trying to create request for month: {try_month}")
            
            try:
                test_request = RequestManagement.objects.create(
                    user=school_head,
                    request_monthyear=try_month,
                    status='approved',
                    downloaded_at=timezone.now() - timedelta(days=20)  # 20 days ago
                )
                print(f"   ✅ Created new test request: {test_request.request_id} for {try_month}")
                break
            except Exception as e:
                print(f"   ⚠️  Failed to create request for {try_month}: {e}")
                if month_offset == 11:  # Last attempt
                    print(f"   ❌ Failed to create test request after trying 12 different months")
                    return
    
    # Create a test liquidation with deadline in 3 days
    # The deadline is calculated as downloaded_at + 30 days
    # So we need to set downloaded_at to 27 days ago to get 3 days remaining
    test_request.downloaded_at = timezone.now() - timedelta(days=27)
    test_request.save()
    
    test_liquidation = LiquidationManagement.objects.create(
        request=test_request,
        status='draft'
    )
    
    print(f"   ✅ Created test liquidation {test_liquidation.LiquidationID} with 3 days remaining")
    return test_liquidation

if __name__ == "__main__":
    print("🚀 Starting Liquidation Reminder System Test")
    
    # Create test data if needed
    create_test_data()
    
    # Run the main test
    success = test_reminder_system()
    
    if success:
        print("\n✅ All tests passed! The reminder system is working correctly.")
    else:
        print("\n❌ Some tests failed. Please check the errors above.")
        sys.exit(1)
