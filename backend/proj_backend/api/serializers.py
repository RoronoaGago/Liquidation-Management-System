from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate


from rest_framework import serializers
from django.contrib.auth import get_user_model
User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "password",
            "date_of_birth",
            "email",
            "phone_number",
            "is_active",
        ]
        extra_kwargs = {
            "password": {
                "write_only": False,
                "min_length": 8,  # Enforce minimum length
                "style": {"input_type": "password"}  # Hide in browsable API
            },
            "email": {"required": True},  # Force email if needed
            # Preserve whitespace if desired
            "username": {"trim_whitespace": False}
        }

    def validate_email(self, value):
        value = value.lower().strip()  # Normalize email (lowercase + trim whitespace)

        # Skip uniqueness check if email hasn't changed (only during updates)
        if self.instance and self.instance.email.lower() == value:
            return value

        # Check for existing emails (case-insensitive)
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError(
                "A user with this email already exists.")

        return value

    def create(self, validated_data):
        """Handle extra fields from custom User model"""
        user = User.objects.create_user(
            **validated_data,
            # Auto-activate users (or set False for email verification)
            is_active=True
        )
        return user

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        user = super().update(instance, validated_data)

        if password:
            user.set_password(password)  # Hashes the new password
            user.save()

        return user

# this is for jwt authentication


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['username'] = user.username
        # Assuming these fields exist on your User model
        token['email'] = user.email
        return token
