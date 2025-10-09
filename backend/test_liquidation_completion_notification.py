#!/usr/bin/env python3
"""
Test script to verify liquidation completion notifications are working properly.
Run this script to test if notifications are being created when a liquidation is completed.
"""

import os
import sys
import django
from datetime import datetime

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proj_backend.settings')
django.setup()

from api.models import LiquidationManagement, RequestManagement, Notification, User
from django.utils import timezone
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_liquidation_completion_notification():
    """Test if liquidation completion notifications are created properly."""
    
    print("=== Testing Liquidation Completion Notification ===")
    
    # Find a liquidation that can be completed
    liquidation = LiquidationManagement.objects.filter(
        status='approved_liquidator'
    ).first()
    
    if not liquidation:
        print("❌ No liquidation found with status 'approved_liquidator'")
        print("Available liquidations:")
        for liq in LiquidationManagement.objects.all()[:5]:
            print(f"  - {liq.LiquidationID}: {liq.status}")
        return False
    
    print(f"✅ Found liquidation: {liquidation.LiquidationID} (status: {liquidation.status})")
    
    # Get an accountant user
    accountant = User.objects.filter(role='accountant', is_active=True).first()
    if not accountant:
        print("❌ No active accountant user found")
        return False
    
    print(f"✅ Found accountant: {accountant.get_full_name()}")
    
    # Count notifications before
    notifications_before = Notification.objects.filter(
        receiver=liquidation.request.user,
        notification_title="Liquidation Completed"
    ).count()
    
    print(f"📊 Notifications before: {notifications_before}")
    
    # Simulate the status change
    print("🔄 Simulating liquidation completion...")
    
    # Set the old status for the signal
    liquidation._old_status = liquidation.status
    liquidation._status_changed_by = accountant
    
    # Change status to liquidated
    liquidation.status = 'liquidated'
    liquidation.reviewed_by_division = accountant
    liquidation.reviewed_at_division = timezone.now()
    liquidation.date_liquidated = timezone.now().date()
    
    # Save the liquidation (this should trigger the signal)
    liquidation.save()
    
    print(f"✅ Liquidation status changed to: {liquidation.status}")
    
    # Count notifications after
    notifications_after = Notification.objects.filter(
        receiver=liquidation.request.user,
        notification_title="Liquidation Completed"
    ).count()
    
    print(f"📊 Notifications after: {notifications_after}")
    
    if notifications_after > notifications_before:
        print("✅ SUCCESS: Liquidation completion notification was created!")
        
        # Show the notification details
        latest_notification = Notification.objects.filter(
            receiver=liquidation.request.user,
            notification_title="Liquidation Completed"
        ).order_by('-notification_date').first()
        
        if latest_notification:
            print(f"📧 Notification details:")
            print(f"   - ID: {latest_notification.id}")
            print(f"   - Title: {latest_notification.notification_title}")
            print(f"   - Details: {latest_notification.details}")
            print(f"   - Receiver: {latest_notification.receiver.get_full_name()}")
            print(f"   - Sender: {latest_notification.sender.get_full_name() if latest_notification.sender else 'System'}")
            print(f"   - Date: {latest_notification.notification_date}")
            print(f"   - Read: {latest_notification.is_read}")
        
        return True
    else:
        print("❌ FAILED: No liquidation completion notification was created")
        return False

def test_division_review_notification():
    """Test if division review notifications show correct text."""
    
    print("\n=== Testing Division Review Notification Text ===")
    
    # Find a liquidation that can be moved to division review
    liquidation = LiquidationManagement.objects.filter(
        status='approved_district'
    ).first()
    
    if not liquidation:
        print("❌ No liquidation found with status 'approved_district'")
        return False
    
    print(f"✅ Found liquidation: {liquidation.LiquidationID} (status: {liquidation.status})")
    
    # Get an accountant user
    accountant = User.objects.filter(role='accountant', is_active=True).first()
    if not accountant:
        print("❌ No active accountant user found")
        return False
    
    print(f"✅ Found accountant: {accountant.get_full_name()}")
    
    # Count notifications before
    notifications_before = Notification.objects.filter(
        receiver=liquidation.request.user,
        notification_title="Liquidation Under Division Review"
    ).count()
    
    print(f"📊 Division review notifications before: {notifications_before}")
    
    # Simulate the status change
    print("🔄 Simulating division review...")
    
    # Set the old status for the signal
    liquidation._old_status = liquidation.status
    liquidation._status_changed_by = accountant
    
    # Change status to under_review_division
    liquidation.status = 'under_review_division'
    
    # Save the liquidation (this should trigger the signal)
    liquidation.save()
    
    print(f"✅ Liquidation status changed to: {liquidation.status}")
    
    # Check the latest notification
    latest_notification = Notification.objects.filter(
        receiver=liquidation.request.user,
        notification_title="Liquidation Under Division Review"
    ).order_by('-notification_date').first()
    
    if latest_notification:
        print(f"📧 Division review notification details:")
        print(f"   - Title: {latest_notification.notification_title}")
        print(f"   - Details: {latest_notification.details}")
        
        if "division accountant" in latest_notification.details:
            print("✅ SUCCESS: Division review notification shows correct text!")
            return True
        else:
            print("❌ FAILED: Division review notification shows incorrect text")
            return False
    else:
        print("❌ FAILED: No division review notification was created")
        return False

if __name__ == "__main__":
    print("🧪 Testing Liquidation Notifications")
    print("=" * 50)
    
    success1 = test_liquidation_completion_notification()
    success2 = test_division_review_notification()
    
    print("\n" + "=" * 50)
    print("📋 Test Results:")
    print(f"   Liquidation Completion: {'✅ PASS' if success1 else '❌ FAIL'}")
    print(f"   Division Review Text: {'✅ PASS' if success2 else '❌ FAIL'}")
    
    if success1 and success2:
        print("\n🎉 All tests passed!")
    else:
        print("\n⚠️  Some tests failed. Check the logs above for details.")
