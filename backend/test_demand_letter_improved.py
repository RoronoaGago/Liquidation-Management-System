#!/usr/bin/env python
"""
Improved Demand Letter Test Script
This script properly sets up Django and tests the demand letter generation
"""

import os
import sys
import django
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Set up Django environment
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "proj_backend.settings")

# Initialize Django
django.setup()

# Now import Django modules
from django.conf import settings
from proj_backend.api.pdf_utils import generate_demand_letter_pdf

def test_demand_letter_generation():
    """Test the demand letter PDF generation with proper error handling"""
    
    print("🚀 Starting Demand Letter Generation Test")
    print("=" * 50)
    
    # Mock request object with more complete structure
    class MockSchool:
        schoolName = "Test Elementary School"
        municipality = "San Fernando"
        district = None
    
    class MockDistrict:
        districtName = "Test District"
        municipality = "San Fernando"
    
    class MockUser:
        first_name = "Juan"
        last_name = "Dela Cruz"
        school = MockSchool()
    
    class MockRequestObj:
        request_id = "REQ-TEST-001"
        user = MockUser()
        created_at = "2025-01-15"
    
    # Set up the school's district
    MockUser().school.district = MockDistrict()
    
    request_obj = MockRequestObj()
    
    # Sample unliquidated data
    unliquidated_data = [
        {
            "check_ada_no": "ADA-12345",
            "issue_date": "2025-01-15",
            "particulars": "Cash Advance for School Supplies and Materials",
            "balance": 5000.00
        },
        {
            "check_ada_no": "ADA-67890",
            "issue_date": "2025-01-10", 
            "particulars": "Cash Advance for Travel and Transportation",
            "balance": 3000.00
        },
        {
            "check_ada_no": "ADA-11111",
            "issue_date": "2025-01-05",
            "particulars": "Cash Advance for Training and Seminars",
            "balance": 2000.00
        }
    ]
    
    due_date = "February 15, 2025"
    
    print(f"📋 Request ID: {request_obj.request_id}")
    print(f"🏫 School: {request_obj.user.school.schoolName}")
    print(f"👤 User: {request_obj.user.first_name} {request_obj.user.last_name}")
    print(f"📅 Due Date: {due_date}")
    print(f"💰 Total Unliquidated Amount: ₱{sum(item['balance'] for item in unliquidated_data):,.2f}")
    print()
    
    try:
        print("🔄 Generating PDF...")
        pdf_content = generate_demand_letter_pdf(request_obj, unliquidated_data, due_date)
        
        # Save to file
        output_filename = "demand_letter_test_improved.pdf"
        with open(output_filename, "wb") as f:
            f.write(pdf_content)
        
        print(f"✅ PDF generated successfully!")
        print(f"📁 File saved as: {output_filename}")
        print(f"📊 File size: {len(pdf_content):,} bytes")
        
        # Check if file exists and is readable
        if os.path.exists(output_filename):
            file_size = os.path.getsize(output_filename)
            print(f"✅ File verification: {file_size:,} bytes")
        else:
            print("❌ File verification failed")
            
    except Exception as e:
        print(f"❌ Error generating PDF: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        import traceback
        print(f"📋 Full traceback:")
        traceback.print_exc()
        return False
    
    print()
    print("🎉 Test completed!")
    return True

if __name__ == "__main__":
    success = test_demand_letter_generation()
    if success:
        print("✅ All tests passed!")
        sys.exit(0)
    else:
        print("❌ Tests failed!")
        sys.exit(1)
