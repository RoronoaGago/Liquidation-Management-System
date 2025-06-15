from rest_framework import serializers
from .models import User, School, Requirement, ListOfPriority
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.files.base import ContentFile
import base64
import uuid


class UserSerializer(serializers.ModelSerializer):
    profile_picture_base64 = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,  # Explicitly allow empty strings ("")
        allow_null=True, )

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "username",
            "password",
            "email",
            "role",
            "school",
            "date_of_birth",
            "phone_number",
            "profile_picture",
            "profile_picture_base64",
            "is_active",
            "date_joined"
        ]
        extra_kwargs = {
            "password": {"write_only": True},
            "id": {"read_only": True},
        }

    def validate(self, data):
        # School validation for certain roles
        if data.get('role') in ['school_head', 'school_admin'] and not data.get('school'):
            raise serializers.ValidationError(
                "School is required for this role"
            )
        if data.get('profile_picture_base64') == "":
            data.pop('profile_picture_base64')  # Remove empty string
        return super().validate(data)
        # Only admins can create other admins
        request = self.context.get('request')
        # if request and request.user.role != 'admin' and data.get('role') == 'admin':
        #     raise serializers.ValidationError(
        #         "Only administrators can create admin users"
        #     )

        return data

    def create(self, validated_data):
        profile_picture_base64 = validated_data.pop(
            'profile_picture_base64', None)

        user = User.objects.create_user(**validated_data)

        if profile_picture_base64:
            # Handle base64 image upload
            format, imgstr = profile_picture_base64.split(';base64,')
            ext = format.split('/')[-1]
            data = ContentFile(
                base64.b64decode(imgstr),
                name=f'{user.id}_{uuid.uuid4()}.{ext}'
            )
            user.profile_picture = data
            user.save()

        return user

    def update(self, instance, validated_data):
        profile_picture_base64 = validated_data.pop(
            'profile_picture_base64', None)

        password = validated_data.pop('password', None)
        if password:
            instance.set_password(password)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)

        if profile_picture_base64:
            # Handle base64 image update
            format, imgstr = profile_picture_base64.split(';base64,')
            ext = format.split('/')[-1]
            data = ContentFile(
                base64.b64decode(imgstr),
                name=f'{instance.id}_{uuid.uuid4()}.{ext}'
            )
            instance.profile_picture = data

        instance.save()
        return instance


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims (only serializable data)
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['username'] = user.username
        token['role'] = user.role
        token['email'] = user.email

        # Add profile picture URL (not the ImageFieldFile object)
        if user.profile_picture:
            # Returns the file URL
            token['profile_picture'] = user.profile_picture.url
        else:
            token['profile_picture'] = None

        return token

class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = '__all__'

class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = '__all__'

class ListOfPrioritySerializer(serializers.ModelSerializer):
    requirements = RequirementSerializer(read_only=True, many=True)
    requirement_ids = serializers.PrimaryKeyRelatedField(
        queryset=Requirement.objects.all(),
        many=True,
        write_only=True,
        source='requirements'
    )

    class Meta:
        model = ListOfPriority
        fields = ['LOPID', 'expenseTitle', 'requirements', 'requirement_ids']
