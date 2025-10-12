#!/usr/bin/env python3
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proj_backend.settings')
django.setup()

from api.models import LiquidationManagement, School

print("=== Simple Test ===")
print(f"Total liquidations: {LiquidationManagement.objects.count()}")
print(f"Total schools: {School.objects.count()}")

# Check liquidations by status
statuses = LiquidationManagement.objects.values_list('status', flat=True).distinct()
for status in statuses:
    count = LiquidationManagement.objects.filter(status=status).count()
    print(f"  {status}: {count}")

# Check if there are any liquidations ready for finalization
approved_liquidator = LiquidationManagement.objects.filter(status='approved_liquidator').first()
if approved_liquidator:
    print(f"Found liquidation ready for finalization: {approved_liquidator.LiquidationID}")
    school = approved_liquidator.request.user.school
    if school:
        print(f"School: {school.schoolName}")
        print(f"Current last liquidated: month={school.last_liquidated_month}, year={school.last_liquidated_year}")
        print(f"Request month/year: {approved_liquidator.request.request_monthyear}")
else:
    print("No liquidations found with status 'approved_liquidator'")
