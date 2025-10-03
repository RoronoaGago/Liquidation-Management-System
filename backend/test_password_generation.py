#!/usr/bin/env python3
"""
Test script to verify random password generation functionality
"""
import sys
import os
import django

# Add the project directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'proj_backend.settings')
django.setup()

from api.serializers import generate_random_password

def test_password_generation():
    """Test the random password generation function"""
    print("Testing Random Password Generation")
    print("=" * 40)
    
    # Test multiple password generations
    passwords = []
    for i in range(5):
        password = generate_random_password()
        passwords.append(password)
        print(f"Password {i+1}: {password}")
    
    print("\nPassword Analysis:")
    print("-" * 20)
    
    for i, password in enumerate(passwords, 1):
        has_lower = any(c.islower() for c in password)
        has_upper = any(c.isupper() for c in password)
        has_digit = any(c.isdigit() for c in password)
        has_symbol = any(c in "!@#$%^&*" for c in password)
        length = len(password)
        
        print(f"Password {i}:")
        print(f"  Length: {length}")
        print(f"  Has lowercase: {has_lower}")
        print(f"  Has uppercase: {has_upper}")
        print(f"  Has digit: {has_digit}")
        print(f"  Has symbol: {has_symbol}")
        print(f"  All requirements met: {has_lower and has_upper and has_digit and has_symbol}")
        print()
    
    # Test uniqueness
    unique_passwords = len(set(passwords))
    print(f"Unique passwords generated: {unique_passwords}/{len(passwords)}")
    
    if unique_passwords == len(passwords):
        print("✅ All passwords are unique!")
    else:
        print("⚠️  Some passwords are duplicates (this is possible but unlikely)")

if __name__ == "__main__":
    test_password_generation()
