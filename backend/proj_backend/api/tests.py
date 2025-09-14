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
        
    def test_activation_conflict_prevention(self):
        """Test that activating a user prevents conflicts with existing active users"""
        # Create two inactive school heads for the same school
        school_head_1 = User.objects.create_user(
            email="head1@test.com",
            password="password123",
            first_name="School",
            last_name="Head 1",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        school_head_2 = User.objects.create_user(
            email="head2@test.com",
            password="password123",
            first_name="School",
            last_name="Head 2",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        # Activate first school head - should succeed
        school_head_1.is_active = True
        school_head_1.save()
        
        # Try to activate second school head - should fail
        serializer = UserSerializer(
            instance=school_head_2,
            data={'is_active': True},
            partial=True
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_active', serializer.errors)
        self.assertIn('Cannot activate this user', serializer.errors['is_active'][0])
        self.assertIn('existing user first', serializer.errors['is_active'][0])
        
    def test_activation_conflict_superintendent(self):
        """Test activation conflict for superintendent role"""
        # Create two inactive superintendents
        superintendent_1 = User.objects.create_user(
            email="super1@test.com",
            password="password123",
            first_name="Division",
            last_name="Superintendent 1",
            role="superintendent",
            is_active=False
        )
        
        superintendent_2 = User.objects.create_user(
            email="super2@test.com",
            password="password123",
            first_name="Division",
            last_name="Superintendent 2",
            role="superintendent",
            is_active=False
        )
        
        # Activate first superintendent - should succeed
        superintendent_1.is_active = True
        superintendent_1.save()
        
        # Try to activate second superintendent - should fail
        serializer = UserSerializer(
            instance=superintendent_2,
            data={'is_active': True},
            partial=True
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_active', serializer.errors)
        self.assertIn('Cannot activate this user', serializer.errors['is_active'][0])
        
    def test_activation_conflict_accountant(self):
        """Test activation conflict for accountant role"""
        # Create two inactive accountants
        accountant_1 = User.objects.create_user(
            email="accountant1@test.com",
            password="password123",
            first_name="Division",
            last_name="Accountant 1",
            role="accountant",
            is_active=False
        )
        
        accountant_2 = User.objects.create_user(
            email="accountant2@test.com",
            password="password123",
            first_name="Division",
            last_name="Accountant 2",
            role="accountant",
            is_active=False
        )
        
        # Activate first accountant - should succeed
        accountant_1.is_active = True
        accountant_1.save()
        
        # Try to activate second accountant - should fail
        serializer = UserSerializer(
            instance=accountant_2,
            data={'is_active': True},
            partial=True
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_active', serializer.errors)
        self.assertIn('Cannot activate this user', serializer.errors['is_active'][0])
        
    def test_activation_conflict_district_admin(self):
        """Test activation conflict for district admin role"""
        # Create two inactive district admins for same district
        district_admin_1 = User.objects.create_user(
            email="district1@test.com",
            password="password123",
            first_name="District",
            last_name="Admin 1",
            role="district_admin",
            school_district=self.district,
            is_active=False
        )
        
        district_admin_2 = User.objects.create_user(
            email="district2@test.com",
            password="password123",
            first_name="District",
            last_name="Admin 2",
            role="district_admin",
            school_district=self.district,
            is_active=False
        )
        
        # Activate first district admin - should succeed
        district_admin_1.is_active = True
        district_admin_1.save()
        
        # Try to activate second district admin - should fail
        serializer = UserSerializer(
            instance=district_admin_2,
            data={'is_active': True},
            partial=True
        )
        
        self.assertFalse(serializer.is_valid())
        self.assertIn('is_active', serializer.errors)
        self.assertIn('Cannot activate this user', serializer.errors['is_active'][0])
        
    def test_deactivation_allows_reactivation(self):
        """Test that deactivating a user allows reactivating another with same role"""
        # Create two inactive school heads
        school_head_1 = User.objects.create_user(
            email="head1@test.com",
            password="password123",
            first_name="School",
            last_name="Head 1",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        school_head_2 = User.objects.create_user(
            email="head2@test.com",
            password="password123",
            first_name="School",
            last_name="Head 2",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        # Activate first school head
        school_head_1.is_active = True
        school_head_1.save()
        
        # Deactivate first school head
        school_head_1.is_active = False
        school_head_1.save()
        
        # Now activate second school head - should succeed
        school_head_2.is_active = True
        school_head_2.save()
        
        self.assertTrue(school_head_2.is_active)
        self.assertFalse(school_head_1.is_active)
        
    def test_deactivation_works_without_conflicts(self):
        """Test that deactivating a user works without validation conflicts"""
        # Create an active school head
        school_head = User.objects.create_user(
            email="head@test.com",
            password="password123",
            first_name="School",
            last_name="Head",
            role="school_head",
            school=self.school,
            is_active=True
        )
        
        # Deactivate the school head - should succeed
        serializer = UserSerializer(
            instance=school_head,
            data={'is_active': False},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        serializer.save()
        
        # Verify user is deactivated
        school_head.refresh_from_db()
        self.assertFalse(school_head.is_active)
        
    def test_activation_validation_only_for_activation(self):
        """Test that validation only runs when activating users, not when deactivating"""
        # Create an active school head
        school_head_1 = User.objects.create_user(
            email="head1@test.com",
            password="password123",
            first_name="School",
            last_name="Head 1",
            role="school_head",
            school=self.school,
            is_active=True
        )
        
        # Create an inactive school head for the same school
        school_head_2 = User.objects.create_user(
            email="head2@test.com",
            password="password123",
            first_name="School",
            last_name="Head 2",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        # Try to deactivate the active user - should succeed (no conflict validation)
        serializer = UserSerializer(
            instance=school_head_1,
            data={'is_active': False},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        serializer.save()
        
        # Verify first user is deactivated
        school_head_1.refresh_from_db()
        self.assertFalse(school_head_1.is_active)
        
        # Now activate the second user - should succeed since first is deactivated
        serializer = UserSerializer(
            instance=school_head_2,
            data={'is_active': True},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid())
        serializer.save()
        
        # Verify second user is activated
        school_head_2.refresh_from_db()
        self.assertTrue(school_head_2.is_active)
        
    def test_deactivation_only_updates_is_active(self):
        """Test that deactivating a user only requires is_active field and doesn't trigger other validations"""
        # Create an active user with any role
        user = User.objects.create_user(
            email="test@test.com",
            password="password123",
            first_name="Test",
            last_name="User",
            role="school_head",
            school=self.school,
            is_active=True
        )
        
        # Deactivate user with only is_active field - should succeed without requiring other fields
        serializer = UserSerializer(
            instance=user,
            data={'is_active': False},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid(), f"Validation errors: {serializer.errors}")
        serializer.save()
        
        # Verify user is deactivated
        user.refresh_from_db()
        self.assertFalse(user.is_active)
        
    def test_activation_only_updates_is_active(self):
        """Test that activating a user only requires is_active field and uses existing role data"""
        # Create an inactive user
        user = User.objects.create_user(
            email="test@test.com",
            password="password123",
            first_name="Test",
            last_name="User",
            role="school_head",
            school=self.school,
            is_active=False
        )
        
        # Activate user with only is_active field - should succeed and use existing role/school data
        serializer = UserSerializer(
            instance=user,
            data={'is_active': True},
            partial=True
        )
        
        self.assertTrue(serializer.is_valid(), f"Validation errors: {serializer.errors}")
        serializer.save()
        
        # Verify user is activated
        user.refresh_from_db()
        self.assertTrue(user.is_active)
