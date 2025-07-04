from django.db import transaction
from rest_framework import serializers
from .models import User, School, Requirement, ListOfPriority, PriorityRequirement, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument, Notification, LiquidationPriority
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.files.base import ContentFile
import base64
import uuid
import string
import logging
logger = logging.getLogger(__name__)


class SchoolSerializer(serializers.ModelSerializer):
    class Meta:
        model = School
        fields = '__all__'  # is_active will be included automatically


class UserSerializer(serializers.ModelSerializer):
    profile_picture_base64 = serializers.CharField(
        write_only=True,
        required=False,
        allow_blank=True,
        allow_null=True,
    )
    # Use nested serializer for school
    school = SchoolSerializer(read_only=True)
    school_id = serializers.PrimaryKeyRelatedField(
        queryset=School.objects.all(),
        source='school',
        write_only=True,
        required=False,
        allow_null=True
    )

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
            "school",  # now returns full school object
            "school_id",  # write-only field for school ID
            "date_of_birth",
            "sex",
            "phone_number",
            "school_district",
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
        token['school_district'] = user.school_district
        token['email'] = user.email

        # Add profile picture URL (not the ImageFieldFile object)
        if user.profile_picture:
            # Returns the file URL
            token['profile_picture'] = user.profile_picture.url
        else:
            token['profile_picture'] = None

        return token


class RequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = Requirement
        fields = ['requirementID', 'requirementTitle',
                  'is_required', 'is_active']  # <-- Add is_active


class PriorityRequirementSerializer(serializers.ModelSerializer):
    class Meta:
        model = PriorityRequirement
        fields = ['id', 'priority', 'requirement']


class ListOfPrioritySerializer(serializers.ModelSerializer):
    requirements = RequirementSerializer(many=True, read_only=True)
    requirement_ids = serializers.PrimaryKeyRelatedField(
        queryset=Requirement.objects.all(),
        many=True,
        write_only=True,
        source='requirements'
    )

    class Meta:
        model = ListOfPriority
        fields = [
            'LOPID',
            'expenseTitle',
            'category',        # <-- Add this line
            'requirements',
            'requirement_ids',
            'is_active'
        ]

    def create(self, validated_data):
        requirements = validated_data.pop('requirements', [])
        instance = ListOfPriority.objects.create(**validated_data)
        instance.requirements.set(requirements)
        return instance

    def update(self, instance, validated_data):
        requirements = validated_data.pop('requirements', [])
        instance.expenseTitle = validated_data.get(
            'expenseTitle', instance.expenseTitle)
        instance.is_active = validated_data.get(
            'is_active', instance.is_active)
        instance.save()
        instance.requirements.set(requirements)
        return instance


class RequestPrioritySerializer(serializers.ModelSerializer):
    priority = ListOfPrioritySerializer(read_only=True)

    class Meta:
        model = RequestPriority
        fields = ['id', 'request', 'priority', 'amount']
        extra_kwargs = {
            'request': {'write_only': True}
        }


class RequestManagementSerializer(serializers.ModelSerializer):
    priorities = serializers.SerializerMethodField(read_only=True)
    user = UserSerializer(read_only=True)
    priority_amounts = serializers.ListField(
        child=serializers.DictField(child=serializers.CharField()),
        write_only=True,
        required=False
    )
    reviewed_by = UserSerializer(read_only=True)

    class Meta:
        model = RequestManagement
        fields = [
            'request_id', 'user', 'request_monthyear',
            'status', 'priorities', 'created_at',
            'priority_amounts',
            'date_approved',
            'downloaded_at',
            'rejection_comment',
            'rejection_date',
            'reviewed_by',
            'reviewed_at',
        ]
        read_only_fields = ['request_id', 'created_at',
                            'date_approved', 'date_downloaded', 'reviewed_by', 'reviewed_at']

    def get_priorities(self, obj):
        request_priorities = obj.requestpriority_set.all()
        return RequestPrioritySerializer(request_priorities, many=True).data

    def create(self, validated_data):
        priority_amounts = validated_data.pop('priority_amounts', [])
        # Accept request_id if present
        request_obj = RequestManagement.objects.create(**validated_data)
        logger.info("Serializer create() called with request_id: %s",
                    validated_data.get('request_id'))
        # Save priorities and amounts
        for pa in priority_amounts:
            lopid = pa.get('LOPID')
            amount = pa.get('amount')
            if lopid and amount is not None:
                try:
                    priority = ListOfPriority.objects.get(LOPID=lopid)
                    RequestPriority.objects.create(
                        request=request_obj,
                        priority=priority,
                        amount=amount
                    )
                except ListOfPriority.DoesNotExist:
                    continue
        return request_obj


class LiquidationPrioritySerializer(serializers.ModelSerializer):
    priority_id = serializers.PrimaryKeyRelatedField(
        queryset=ListOfPriority.objects.all(),
        source='priority'
    )

    class Meta:
        model = LiquidationPriority
        fields = ['priority_id', 'amount']


class LiquidationDocumentSerializer(serializers.ModelSerializer):
    request_priority = serializers.PrimaryKeyRelatedField(
        queryset=RequestPriority.objects.all(),
        write_only=True
    )
    requirement = serializers.PrimaryKeyRelatedField(
        queryset=Requirement.objects.all(),
        write_only=True
    )
    request_priority_id = serializers.IntegerField(
        source='request_priority.id', read_only=True)
    requirement_id = serializers.IntegerField(
        source='requirement.requirementID', read_only=True)
    document_url = serializers.SerializerMethodField()
    requirement_obj = RequirementSerializer(
        source='requirement', read_only=True)
    request_priority_obj = RequestPrioritySerializer(
        source='request_priority', read_only=True)
    # liquidation_document_id = serializers.CharField(read_only=True)

    class Meta:
        model = LiquidationDocument
        fields = [
            'id',
            'liquidation',
            'request_priority',
            'request_priority_obj',
            'requirement',
            'requirement_obj',
            'document',
            'document_url',
            'uploaded_at',
            'uploaded_by',
            'is_approved',
            'reviewer_comment',
            'request_priority_id',
            'requirement_id',
        ]
        extra_kwargs = {
            'document': {'write_only': True},
            'liquidation': {'read_only': True},
        }

    def get_document_url(self, obj):
        if obj.document:
            return self.context['request'].build_absolute_uri(obj.document.url)
        return None


class LiquidationManagementSerializer(serializers.ModelSerializer):
    liquidation_priorities = LiquidationPrioritySerializer(many=True)

    class Meta:
        model = LiquidationManagement
        fields = [
            'LiquidationID',
            'request',
            'comment_id',
            'status',
            'reviewed_by_district',
            'reviewed_at_district',
            'reviewed_by_division',
            'reviewed_at_division',
            'documents',
            'created_at',
            'liquidation_priorities',
            'remaining_days',
        ]

    def get_reviewer_comments(self, obj):
        # Get all reviewer comments from documents
        comments = []
        for doc in obj.documents.all():
            if doc.reviewer_comment:
                comments.append({
                    'document': doc.requirement.requirementTitle,
                    'comment': doc.reviewer_comment
                })
        return comments

    def create(self, validated_data):
        priorities_data = validated_data.pop('liquidation_priorities', [])
        liquidation = LiquidationManagement.objects.create(**validated_data)
        for item in priorities_data:
            LiquidationPriority.objects.create(liquidation=liquidation, **item)
        return liquidation

    def update(self, instance, validated_data):
        priorities_data = validated_data.pop('liquidation_priorities', [])
        instance = super().update(instance, validated_data)
        # Optionally update priorities here
        return instance


class NotificationSerializer(serializers.ModelSerializer):
    receiver = UserSerializer(read_only=True)
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Notification
        fields = [
            'id',
            'notification_title',
            'details',
            'receiver',
            'sender',
            'notification_date',
            'is_read'
        ]
