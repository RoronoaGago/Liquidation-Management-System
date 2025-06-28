from rest_framework import serializers
from .models import User, School, Requirement, ListOfPriority, PriorityRequirement, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument, Notification, LiquidatorAssignment, LiquidationPriority
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.core.files.base import ContentFile
import base64
import uuid
import string


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

    class Meta:
        model = RequestManagement
        fields = [
            'request_id', 'user', 'request_month',
            'status', 'priorities', 'created_at',
            'priority_amounts',
            'date_approved',
            'date_downloaded',
            'rejection_comment',
            'rejection_date'
        ]
        read_only_fields = ['request_id', 'created_at',
                            'date_approved', 'date_downloaded', 'rejection_date']

    def get_priorities(self, obj):
        request_priorities = obj.requestpriority_set.all()
        return RequestPrioritySerializer(request_priorities, many=True).data

    def create(self, validated_data):
        priority_amounts = validated_data.pop('priority_amounts', [])
        request_obj = RequestManagement.objects.create(**validated_data)
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
    priority = ListOfPrioritySerializer(read_only=True)
    priority_id = serializers.PrimaryKeyRelatedField(
        queryset=ListOfPriority.objects.all(),
        source='priority',
        write_only=True
    )

    class Meta:
        model = LiquidationPriority
        fields = ['id', 'liquidation', 'priority', 'priority_id', 'amount']
        read_only_fields = ['id', 'liquidation', 'priority']


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
    request = RequestManagementSerializer(read_only=True)
    documents = LiquidationDocumentSerializer(many=True, read_only=True)
    submitted_at = serializers.DateTimeField(
        source='created_at', read_only=True)
    reviewer_comments = serializers.SerializerMethodField()
    reviewed_by_district = UserSerializer(read_only=True)  # <-- ADD THIS LINE
    liquidation_priorities = LiquidationPrioritySerializer(many=True, read_only=True)

    class Meta:
        model = LiquidationManagement
        fields = [
            'LiquidationID',
            'request',
            'comment_id',
            'status',
            'reviewed_by_district',      # <-- ENSURE THIS IS INCLUDED
            'reviewed_at_district',
            'reviewed_by_division',
            'reviewed_at_division',
            'documents',
            'submitted_at',
            'reviewer_comments',
            'created_at',
            'liquidation_priorities',  # <-- Add this line
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


class LiquidatorAssignmentSerializer(serializers.ModelSerializer):
    liquidator = UserSerializer(read_only=True)
    liquidator_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='liquidator'),
        source='liquidator',
        write_only=True
    )
    assigned_by = UserSerializer(read_only=True)
    assigned_by_id = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='assigned_by',
        write_only=True,
        required=False
    )
    school = SchoolSerializer(read_only=True)
    school_id = serializers.PrimaryKeyRelatedField(
        queryset=School.objects.all(),
        source='school',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = LiquidatorAssignment
        fields = [
            'id',
            'liquidator', 'liquidator_id',
            'district',
            'school', 'school_id',
            'assigned_by', 'assigned_by_id',
            'assigned_at'
        ]
        read_only_fields = ['id', 'assigned_at', 'liquidator', 'assigned_by', 'school']

    def create(self, validated_data):
        liquidator = validated_data['liquidator']
        district = validated_data['district']
        assigned_by = validated_data.get('assigned_by', None)

        # Get all schools in the district
        schools = School.objects.filter(district=district)
        assignments = []
        for school in schools:
            # Prevent duplicate assignments
            if not LiquidatorAssignment.objects.filter(liquidator=liquidator, district=district, school=school).exists():
                assignments.append(
                    LiquidatorAssignment(
                        liquidator=liquidator,
                        district=district,
                        school=school,
                        assigned_by=assigned_by
                    )
                )
        # Bulk create assignments
        LiquidatorAssignment.objects.bulk_create(assignments)
        # Return the first assignment for serializer response
        return assignments[0] if assignments else None


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
        ]



