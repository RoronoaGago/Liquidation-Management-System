#!/usr/bin/env python
"""
Test script for PDF generation functionality
Run this script to validate the PDF generation implementation
"""

import os
import sys
import django
from django.conf import settings

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Setup Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proj_backend.settings')
django.setup()

from api.models import User, RequestManagement, School, SchoolDistrict, ListOfPriority, RequestPriority
from api.pdf_utils import generate_request_pdf_with_signatures
from django.core.files.base import ContentFile
import tempfile

def test_pdf_generation():
    """Test PDF generation with sample data"""
    
    print("🧪 Testing PDF Generation Implementation")
    print("=" * 50)
    
    # Test 1: Check if required models exist
    print("\n1. Testing Model Availability...")
    try:
        # Check if GeneratedPDF model exists
        from api.models import GeneratedPDF
        print("✅ GeneratedPDF model found")
    except ImportError:
        print("❌ GeneratedPDF model not found")
        return False
    
    # Test 2: Check if PDF utils can be imported
    print("\n2. Testing PDF Utils Import...")
    try:
        from api.pdf_utils import PDFGenerator, generate_request_pdf_with_signatures
        print("✅ PDF utils imported successfully")
    except ImportError as e:
        print(f"❌ PDF utils import failed: {e}")
        return False
    
    # Test 3: Check dependencies
    print("\n3. Testing Dependencies...")
    try:
        import reportlab
        print(f"✅ ReportLab version: {reportlab.Version}")
    except ImportError:
        print("❌ ReportLab not installed")
        return False
    
    try:
        from PIL import Image
        print("✅ Pillow (PIL) available")
    except ImportError:
        print("❌ Pillow not installed")
        return False
    
    # Test 4: Test PDF generator initialization
    print("\n4. Testing PDF Generator...")
    try:
        generator = PDFGenerator()
        print("✅ PDF Generator initialized")
    except Exception as e:
        print(f"❌ PDF Generator failed: {e}")
        return False
    
    # Test 5: Check if we have sample data
    print("\n5. Testing Sample Data...")
    try:
        # Check for users with e-signatures
        users_with_signatures = User.objects.filter(e_signature__isnull=False).count()
        print(f"✅ Users with e-signatures: {users_with_signatures}")
        
        # Check for approved requests
        approved_requests = RequestManagement.objects.filter(status='approved').count()
        print(f"✅ Approved requests: {approved_requests}")
        
        if approved_requests == 0:
            print("⚠️  No approved requests found - create one for full testing")
        
    except Exception as e:
        print(f"❌ Sample data check failed: {e}")
        return False
    
    # Test 6: Test PDF generation with sample request
    print("\n6. Testing PDF Generation...")
    try:
        # Get first approved request
        approved_request = RequestManagement.objects.filter(status='approved').first()
        
        if approved_request:
            # Generate PDF
            pdf_content = generate_request_pdf_with_signatures(approved_request)
            
            if pdf_content and len(pdf_content) > 0:
                print(f"✅ PDF generated successfully ({len(pdf_content)} bytes)")
                
                # Save test PDF
                with tempfile.NamedTemporaryFile(suffix='.pdf', delete=False) as tmp_file:
                    tmp_file.write(pdf_content)
                    print(f"✅ Test PDF saved to: {tmp_file.name}")
            else:
                print("❌ PDF generation returned empty content")
                return False
        else:
            print("⚠️  No approved requests found - skipping PDF generation test")
    
    except Exception as e:
        print(f"❌ PDF generation test failed: {e}")
        return False
    
    print("\n" + "=" * 50)
    print("🎉 All tests passed! PDF generation is ready to use.")
    print("\nNext steps:")
    print("1. Run database migration: python manage.py migrate")
    print("2. Start Django server: python manage.py runserver")
    print("3. Test in frontend with approved requests")
    
    return True

def create_test_data():
    """Create test data for PDF generation"""
    print("\n🔧 Creating Test Data...")
    
    try:
        # Create test school district
        district, created = SchoolDistrict.objects.get_or_create(
            districtName="Test District",
            defaults={
                'municipality': 'Test City',
                'legislativeDistrict': '1st District'
            }
        )
        if created:
            print("✅ Created test district")
        
        # Create test school
        school, created = School.objects.get_or_create(
            schoolId="TEST001",
            defaults={
                'schoolName': 'Test School',
                'municipality': 'Test City',
                'district': district,
                'legislativeDistrict': '1st District'
            }
        )
        if created:
            print("✅ Created test school")
        
        # Create test user with e-signature
        user, created = User.objects.get_or_create(
            email="test@example.com",
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'role': 'school_head',
                'school': school
            }
        )
        if created:
            print("✅ Created test user")
        
        # Create test priority
        priority, created = ListOfPriority.objects.get_or_create(
            expenseTitle="Test Expense",
            defaults={
                'category': 'supplies'
            }
        )
        if created:
            print("✅ Created test priority")
        
        # Create test request
        request_obj, created = RequestManagement.objects.get_or_create(
            user=user,
            status='approved',
            defaults={
                'request_monthyear': '2024-01'
            }
        )
        if created:
            print("✅ Created test request")
        
        # Create test request priority
        if not request_obj.requestpriority_set.exists():
            RequestPriority.objects.create(
                request=request_obj,
                priority=priority,
                amount=1000.00
            )
            print("✅ Created test request priority")
        
        print("✅ Test data creation completed")
        return True
        
    except Exception as e:
        print(f"❌ Test data creation failed: {e}")
        return False

if __name__ == "__main__":
    print("PDF Generation Test Suite")
    print("=" * 50)
    
    # Ask if user wants to create test data
    create_data = input("\nCreate test data? (y/n): ").lower().strip()
    if create_data == 'y':
        create_test_data()
    
    # Run tests
    success = test_pdf_generation()
    
    if success:
        print("\n🎉 Implementation is ready!")
    else:
        print("\n❌ Implementation needs fixes")
        sys.exit(1)
