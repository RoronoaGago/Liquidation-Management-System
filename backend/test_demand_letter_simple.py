#!/usr/bin/env python
"""
Simple Demand Letter Test Script
This script tests the PDF generation without complex Django model dependencies
"""

import os
import sys
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

def test_demand_letter_simple():
    """Test demand letter generation with minimal dependencies"""
    
    print("🚀 Starting Simple Demand Letter Test")
    print("=" * 50)
    
    try:
        # Import the PDF generator directly
        from proj_backend.api.pdf_utils import DemandLetterGenerator
        
        # Create generator instance
        generator = DemandLetterGenerator()
        print("✅ PDF Generator initialized successfully")
        
        # Mock data
        class MockRequestObj:
            request_id = "REQ-TEST-001"
            user = None
        
        class MockUser:
            first_name = "Juan"
            last_name = "Dela Cruz"
            school = None
        
        class MockSchool:
            schoolName = "Test Elementary School"
            municipality = "San Fernando"
            district = None
        
        class MockDistrict:
            districtName = "Test District"
            municipality = "San Fernando"
        
        # Set up relationships
        mock_user = MockUser()
        mock_school = MockSchool()
        mock_district = MockDistrict()
        
        mock_school.district = mock_district
        mock_user.school = mock_school
        
        request_obj = MockRequestObj()
        request_obj.user = mock_user
        
        # Sample unliquidated data
        unliquidated_data = [
            {
                "check_ada_no": "ADA-12345",
                "issue_date": "2025-01-15",
                "particulars": "Cash Advance for School Supplies",
                "balance": 5000.00
            },
            {
                "check_ada_no": "ADA-67890",
                "issue_date": "2025-01-10",
                "particulars": "Cash Advance for Travel",
                "balance": 3000.00
            }
        ]
        
        due_date = "February 15, 2025"
        
        print(f"📋 Request ID: {request_obj.request_id}")
        print(f"🏫 School: {request_obj.user.school.schoolName}")
        print(f"👤 User: {request_obj.user.first_name} {request_obj.user.last_name}")
        print(f"📅 Due Date: {due_date}")
        print(f"💰 Total Amount: ₱{sum(item['balance'] for item in unliquidated_data):,.2f}")
        print()
        
        # Generate PDF
        print("🔄 Generating PDF...")
        pdf_content = generator.generate_demand_letter_pdf(request_obj, unliquidated_data, due_date)
        
        # Save to file
        output_filename = "demand_letter_simple_test.pdf"
        with open(output_filename, "wb") as f:
            f.write(pdf_content)
        
        print(f"✅ PDF generated successfully!")
        print(f"📁 File saved as: {output_filename}")
        print(f"📊 File size: {len(pdf_content):,} bytes")
        
        # Verify file
        if os.path.exists(output_filename):
            file_size = os.path.getsize(output_filename)
            print(f"✅ File verification: {file_size:,} bytes")
            
            # Try to open and read a bit of the PDF to verify it's valid
            with open(output_filename, 'rb') as f:
                header = f.read(4)
                if header == b'%PDF':
                    print("✅ PDF header verification: Valid PDF format")
                else:
                    print("⚠️  PDF header verification: May not be a valid PDF")
        else:
            print("❌ File verification failed")
            
        return True
        
    except Exception as e:
        print(f"❌ Error: {e}")
        print(f"🔍 Error type: {type(e).__name__}")
        import traceback
        print(f"📋 Full traceback:")
        traceback.print_exc()
        return False

if __name__ == "__main__":
    success = test_demand_letter_simple()
    if success:
        print("\n🎉 Test completed successfully!")
        print("📄 You can now open the generated PDF file to view the demand letter.")
    else:
        print("\n❌ Test failed!")
        sys.exit(1)
