from django.test import TestCase
from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase
from rest_framework import status
from django.core.exceptions import ValidationError
from .models import School, SchoolDistrict
from .serializers import UserSerializer

User = get_user_model()


class UserBusinessRuleValidationTestCase(APITestCase):
    """Test cases for user business rule validation"""
    
    def setUp(self):
        """Set up test data"""
        # Create test school
        self.school = School.objects.create(
            schoolId="SCH001",
            schoolName="Test School",
            municipality="Test Municipality",
            legislativeDistrict="1st District",
            is_active=True
        )
        
        # Create test district
        self.district = SchoolDistrict.objects.create(
            districtName="Test District",
            municipality="Test Municipality",
            legislativeDistrict="1st District",
            is_active=True
        )
        
        # Create admin user
        self.admin_user = User.objects.create_user(
            email="admin@test.com",
            password="password123",
            first_name="Admin",
            last_name="User",
            role="admin",
            is_active=True
        )
        
    def test_school_head_uniqueness_active_only(self):
        """Test that only one active school head is allowed per school"""
        # Create first active school head
        school_head_1 = User.objects.create_user(
            email="head1@test.com",
            password="password123",
            first_name="School",
            last_name="Head 1",
            role="school_head",
            school=self.school,
            is_active=True
        )
        
        # Try to create second active school head for same school - should fail
        serializer = UserSerializer(data={
            'email': 'head2@test.com',
            'password': 'password123',
            'first_name': 'School',
            'last_name': 'Head 2',
            'role': 'school_head',
            'school_id': self.school.schoolId,
            'is_active': True
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)
        self.assertIn('active school head', serializer.errors['role'][0])
        
        # Create inactive school head for same school - should succeed
        school_head_2 = User.objects.create_user(
            email="head2@test.com",
            password="password123",
            first_name="School",
            last_name="Head 2",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        self.assertEqual(school_head_2.role, 'school_head')
        self.assertEqual(school_head_2.school, self.school)
        self.assertFalse(school_head_2.is_active)
        
    def test_school_admin_uniqueness_active_only(self):
        """Test that only one active school admin is allowed per school"""
        # Create first active school admin
        school_admin_1 = User.objects.create_user(
            email="admin1@test.com",
            password="password123",
            first_name="School",
            last_name="Admin 1",
            role="school_admin",
            school=self.school,
            is_active=True
        )
        
        # Try to create second active school admin for same school - should fail
        serializer = UserSerializer(data={
            'email': 'admin2@test.com',
            'password': 'password123',
            'first_name': 'School',
            'last_name': 'Admin 2',
            'role': 'school_admin',
            'school_id': self.school.schoolId,
            'is_active': True
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)
        self.assertIn('active school admin', serializer.errors['role'][0])
        
        # Create inactive school admin for same school - should succeed
        school_admin_2 = User.objects.create_user(
            email="admin2@test.com",
            password="password123",
            first_name="School",
            last_name="Admin 2",
            role="school_admin",
            school=self.school,
            is_active=False
        )
        
        self.assertEqual(school_admin_2.role, 'school_admin')
        self.assertEqual(school_admin_2.school, self.school)
        self.assertFalse(school_admin_2.is_active)
        
    def test_district_admin_uniqueness_active_only(self):
        """Test that only one active district admin is allowed per district"""
        # Create first active district admin
        district_admin_1 = User.objects.create_user(
            email="district1@test.com",
            password="password123",
            first_name="District",
            last_name="Admin 1",
            role="district_admin",
            school_district=self.district,
            is_active=True
        )
        
        # Try to create second active district admin for same district - should fail
        serializer = UserSerializer(data={
            'email': 'district2@test.com',
            'password': 'password123',
            'first_name': 'District',
            'last_name': 'Admin 2',
            'role': 'district_admin',
            'school_district_id': self.district.districtId,
            'is_active': True
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)
        self.assertIn('active district administrative assistant', serializer.errors['role'][0])
        
        # Create inactive district admin for same district - should succeed
        district_admin_2 = User.objects.create_user(
            email="district2@test.com",
            password="password123",
            first_name="District",
            last_name="Admin 2",
            role="district_admin",
            school_district=self.district,
            is_active=False
        )
        
        self.assertEqual(district_admin_2.role, 'district_admin')
        self.assertEqual(district_admin_2.school_district, self.district)
        self.assertFalse(district_admin_2.is_active)
        
    def test_superintendent_uniqueness_active_only(self):
        """Test that only one active superintendent is allowed per division"""
        # Create first active superintendent
        superintendent_1 = User.objects.create_user(
            email="super1@test.com",
            password="password123",
            first_name="Division",
            last_name="Superintendent 1",
            role="superintendent",
            is_active=True
        )
        
        # Try to create second active superintendent - should fail
        serializer = UserSerializer(data={
            'email': 'super2@test.com',
            'password': 'password123',
            'first_name': 'Division',
            'last_name': 'Superintendent 2',
            'role': 'superintendent',
            'is_active': True
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)
        self.assertIn('active superintendent', serializer.errors['role'][0])
        
        # Create inactive superintendent - should succeed
        superintendent_2 = User.objects.create_user(
            email="super2@test.com",
            password="password123",
            first_name="Division",
            last_name="Superintendent 2",
            role="superintendent",
            is_active=False
        )
        
        self.assertEqual(superintendent_2.role, 'superintendent')
        self.assertFalse(superintendent_2.is_active)
        
    def test_accountant_uniqueness_active_only(self):
        """Test that only one active accountant is allowed per division"""
        # Create first active accountant
        accountant_1 = User.objects.create_user(
            email="accountant1@test.com",
            password="password123",
            first_name="Division",
            last_name="Accountant 1",
            role="accountant",
            is_active=True
        )
        
        # Try to create second active accountant - should fail
        serializer = UserSerializer(data={
            'email': 'accountant2@test.com',
            'password': 'password123',
            'first_name': 'Division',
            'last_name': 'Accountant 2',
            'role': 'accountant',
            'is_active': True
        })
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)
        self.assertIn('active accountant', serializer.errors['role'][0])
        
        # Create inactive accountant - should succeed
        accountant_2 = User.objects.create_user(
            email="accountant2@test.com",
            password="password123",
            first_name="Division",
            last_name="Accountant 2",
            role="accountant",
            is_active=False
        )
        
        self.assertEqual(accountant_2.role, 'accountant')
        self.assertFalse(accountant_2.is_active)
        
    def test_update_existing_user_validation(self):
        """Test that updating an existing user properly validates uniqueness"""
        # Create active school head
        school_head = User.objects.create_user(
            email="head@test.com",
            password="password123",
            first_name="School",
            last_name="Head",
            role="school_head",
            school=self.school,
            is_active=True
        )
        
        # Try to update another user to be school head for same school - should fail
        other_user = User.objects.create_user(
            email="other@test.com",
            password="password123",
            first_name="Other",
            last_name="User",
            role="school_admin",
            school=self.school,
            is_active=True
        )
        
        serializer = UserSerializer(
            instance=other_user,
            data={
                'email': 'other@test.com',
                'first_name': 'Other',
                'last_name': 'User',
                'role': 'school_head',
                'school_id': self.school.schoolId,
                'is_active': True
            }
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('role', serializer.errors)
        
    def test_multiple_schools_different_heads(self):
        """Test that different schools can have their own school heads"""
        # Create second school
        school_2 = School.objects.create(
            schoolId="SCH002",
            schoolName="Test School 2",
            municipality="Test Municipality",
            legislativeDistrict="1st District",
            is_active=True
        )
        
        # Create school head for first school
        school_head_1 = User.objects.create_user(
            email="head1@test.com",
            password="password123",
            first_name="School",
            last_name="Head 1",
            role="school_head",
            school=self.school,
            is_active=True
        )
        
        # Create school head for second school - should succeed
        school_head_2 = User.objects.create_user(
            email="head2@test.com",
            password="password123",
            first_name="School",
            last_name="Head 2",
            role="school_head",
            school=school_2,
            is_active=True
        )
        
        self.assertEqual(school_head_1.school, self.school)
        self.assertEqual(school_head_2.school, school_2)
        self.assertTrue(school_head_1.is_active)
        self.assertTrue(school_head_2.is_active)
