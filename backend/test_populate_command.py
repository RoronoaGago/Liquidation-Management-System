#!/usr/bin/env python
import os
import sys
import django

# Add the project directory to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'proj_backend'))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')
django.setup()

from api.models import Requirement, ListOfPriority, PriorityRequirement

def test_populate():
    print("Testing PriorityRequirement population...")
    
    # Check current counts
    req_count = Requirement.objects.count()
    priority_count = ListOfPriority.objects.count()
    pr_count = PriorityRequirement.objects.count()
    
    print(f"Requirements: {req_count}")
    print(f"Priorities: {priority_count}")
    print(f"PriorityRequirements: {pr_count}")
    
    # Test creating a relationship
    if req_count > 0 and priority_count > 0:
        req = Requirement.objects.first()
        priority = ListOfPriority.objects.first()
        
        print(f"First requirement: {req.requirementTitle}")
        print(f"First priority: {priority.expenseTitle}")
        
        # Create a test relationship
        pr, created = PriorityRequirement.objects.get_or_create(
            priority=priority,
            requirement=req
        )
        
        if created:
            print("✅ Successfully created test PriorityRequirement relationship")
        else:
            print("ℹ️  PriorityRequirement relationship already exists")
        
        # Check final count
        final_count = PriorityRequirement.objects.count()
        print(f"Final PriorityRequirement count: {final_count}")
    else:
        print("❌ No requirements or priorities found")

if __name__ == "__main__":
    test_populate()
