from django.conf import settings
from django.db import transaction
from rest_framework import serializers
from .models import User, School, Requirement, ListOfPriority, PriorityRequirement, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument, Notification, LiquidationPriority, SchoolDistrict
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer, TokenRefreshSerializer
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.template.loader import render_to_string
from django.utils import timezone
import base64
import uuid
import string
import logging
from simple_history.utils import update_change_reason
logger = logging.getLogger(__name__)

DEFAULT_PASSWORD = "password123"  # Define this at the top of your file


class SchoolDistrictSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolDistrict
        fields = '__all__'


class SchoolSerializer(serializers.ModelSerializer):
    district = serializers.PrimaryKeyRelatedField(
        queryset=SchoolDistrict.objects.all(),
        required=False,
        allow_null=True
    )

    class Meta:
        model = School
        fields = '__all__'


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
    school_district = SchoolDistrictSerializer(read_only=True)
    school_district_id = serializers.PrimaryKeyRelatedField(
        queryset=SchoolDistrict.objects.all(),
        source='school_district',
        write_only=True,
        required=False,
        allow_null=True
    )
    e_signature = serializers.ImageField(required=False, allow_null=True)

    class Meta:
        model = User
        fields = [
            "id",
            "first_name",
            "last_name",
            "password",
            "email",
            "role",
            "school",
            "school_id",
            "school_district_id",
            "date_of_birth",
            "sex",
            "phone_number",
            "school_district",
            "profile_picture",
            "profile_picture_base64",
            "e_signature",  # <-- Add this line
            "is_active",
            "date_joined"
        ]
        extra_kwargs = {
            "password": {
                "write_only": True,
                "required": False,  # This is the critical change
                "allow_blank": True
            },
            "id": {"read_only": True},
        }

    def to_representation(self, instance):
        representation = super().to_representation(instance)
        # Add school active status to the representation
        if instance.school:
            representation['school']['is_active'] = instance.school.is_active
        return representation

    def validate(self, data):
        # Only require email for creation, not for updates
        if not self.instance and 'email' not in data:
            raise serializers.ValidationError("Email is required")
        # Only validate role requirements if role is being updated
        if 'role' in data:
            if data.get('role') in ['school_head', 'school_admin'] and not data.get('school'):
                raise serializers.ValidationError(
                    "School is required for this role")
            if data.get('role') == 'district_admin' and not data.get('school_district'):
                raise serializers.ValidationError(
                    {"school_district": "School district is required for district administrators"}
                )
        if data.get('profile_picture_base64') == "":
            data.pop('profile_picture_base64')

        # Only validate role uniqueness if role is being updated
        if 'role' in data:
            role = data.get("role")
            school = data.get("school") or data.get("school_id")
            school_district = data.get("school_district") or data.get("school_district_id")
            
            # Validate school-level role uniqueness (only one active per school)
            if role in ["school_head", "school_admin"] and school:
                user_id = self.instance.pk if self.instance else None
                qs = User.objects.filter(role=role, school=school, is_active=True)
                if user_id:
                    qs = qs.exclude(pk=user_id)
                if qs.exists():
                    existing_user = qs.first()
                    raise serializers.ValidationError(
                        {"role": f"There is already an active {role.replace('_', ' ')} assigned to this school ({existing_user.get_full_name()}). Only one active {role.replace('_', ' ')} is allowed per school."}
                    )
            
            # Validate district-level role uniqueness (only one active per district)
            if role == "district_admin" and school_district:
                user_id = self.instance.pk if self.instance else None
                qs = User.objects.filter(role=role, school_district=school_district, is_active=True)
                if user_id:
                    qs = qs.exclude(pk=user_id)
                if qs.exists():
                    existing_user = qs.first()
                    raise serializers.ValidationError(
                        {"role": f"There is already an active district administrative assistant assigned to this district ({existing_user.get_full_name()}). Only one active district administrative assistant is allowed per district."}
                    )
            
            # Validate division-level role uniqueness (only one active per division)
            if role in ["superintendent", "accountant"]:
                user_id = self.instance.pk if self.instance else None
                qs = User.objects.filter(role=role, is_active=True)
                if user_id:
                    qs = qs.exclude(pk=user_id)
                if qs.exists():
                    existing_user = qs.first()
                    raise serializers.ValidationError(
                        {"role": f"There is already an active {role.replace('_', ' ')} in the division ({existing_user.get_full_name()}). Only one active {role.replace('_', ' ')} is allowed per division."}
                    )
        
        # Validate activation conflicts - check if activating this user would create a conflict
        is_being_activated = data.get('is_active', None)
        if self.instance and is_being_activated is True and not self.instance.is_active:
            # User is being activated, check for conflicts using instance data
            role = self.instance.role
            school = self.instance.school
            school_district = self.instance.school_district
            
            # Check school-level role conflicts
            if role in ["school_head", "school_admin"] and school:
                existing_active = User.objects.filter(
                    role=role, 
                    school=school, 
                    is_active=True
                ).exclude(pk=self.instance.pk)
                if existing_active.exists():
                    existing_user = existing_active.first()
                    raise serializers.ValidationError(
                        {"is_active": f"Cannot activate this user. There is already an active {role.replace('_', ' ')} assigned to this school ({existing_user.get_full_name()}). Please deactivate the existing user first."}
                    )
            
            # Check district-level role conflicts
            elif role == "district_admin" and school_district:
                existing_active = User.objects.filter(
                    role=role, 
                    school_district=school_district, 
                    is_active=True
                ).exclude(pk=self.instance.pk)
                if existing_active.exists():
                    existing_user = existing_active.first()
                    raise serializers.ValidationError(
                        {"is_active": f"Cannot activate this user. There is already an active district administrative assistant assigned to this district ({existing_user.get_full_name()}). Please deactivate the existing user first."}
                    )
            
            # Check division-level role conflicts
            elif role in ["superintendent", "accountant"]:
                existing_active = User.objects.filter(
                    role=role, 
                    is_active=True
                ).exclude(pk=self.instance.pk)
                if existing_active.exists():
                    existing_user = existing_active.first()
                    raise serializers.ValidationError(
                        {"is_active": f"Cannot activate this user. There is already an active {role.replace('_', ' ')} in the division ({existing_user.get_full_name()}). Please deactivate the existing user first."}
                    )
        # E-signature required for specific roles (only when role is being updated)
        if 'role' in data:
            role = data.get("role")
            e_signature = data.get("e_signature")
            required_roles = ["school_head", "superintendent", "accountant"]
            
            # Only require e-signature for updates (when instance exists), not for creation
            if self.instance and role in required_roles and not e_signature:
                # Check if user already has an e-signature
                if not self.instance.e_signature:
                    raise serializers.ValidationError(
                        {"e_signature": "E-signature is required for School Head, Division Superintendent, and Division Accountant."}
                    )
        return data

    def create(self, validated_data):
        profile_picture_base64 = validated_data.pop(
            'profile_picture_base64', None)

        # Set default password if not provided
        password = validated_data.pop('password', DEFAULT_PASSWORD)

        # Remove email from validated_data since we'll pass it separately
        email = validated_data.pop('email')

        # Create the user with the custom manager
        user = User.objects.create_user(
            email=email,
            password=password,
            **validated_data
        )
        user.password_change_required = True  # Force password change on first login

        if profile_picture_base64:
            format, imgstr = profile_picture_base64.split(';base64,')
            ext = format.split('/')[-1]
            data = ContentFile(
                base64.b64decode(imgstr),
                name=f'{user.id}_{uuid.uuid4()}.{ext}'
            )
            user.profile_picture = data
            user.save()

        # self.send_welcome_email(user)
        return user

    # def send_welcome_email(self, user):
    #     """Send welcome email with instructions to change password"""
    #     subject = "Welcome to the Maintenance and Operating Expenses System"
    #     message = render_to_string('emails/welcome_email.html', {
    #         'user': user,
    #         'login_url': settings.FRONTEND_LOGIN_URL,
    #         'default_password': DEFAULT_PASSWORD
    #     })

    #     send_mail(
    #         subject=subject,
    #         message="",  # Empty message since we're using html_message
    #         from_email=None,  # Uses DEFAULT_FROM_EMAIL
    #         recipient_list=[user.email],
    #         html_message=message,
    #         fail_silently=True,
    #     )

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
    def validate(self, attrs):
        # Map email to username for the parent class validation
        # Map email to username for validation
        attrs['username'] = attrs.get('email', '')
        data = super().validate(attrs)

        # Perform the standard validation

        # Get user and request context
        user = self.user
        request = self.context.get('request')
        ip = request.META.get('REMOTE_ADDR') if request else None

        # Prepare context for email notification
        context = {
            'user': user,
            'ip': ip,
            'now': timezone.now(),
        }

        # Send login notification email
        html_message = render_to_string(
            'emails/login_notification.html', context)
        send_mail(
            subject="Login Notification",
            message="You have just logged in to the Liquidation Management System.",
            from_email=None,  # Uses DEFAULT_FROM_EMAIL
            recipient_list=[user.email],
            fail_silently=True,
            html_message=html_message,
        )

        return data

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)

        # Add custom claims to the token
        token['first_name'] = user.first_name
        token['last_name'] = user.last_name
        token['email'] = user.email  # Now the primary identifier
        token['role'] = user.role
        token['password_change_required'] = user.password_change_required

        if user.school_district:
            token['school_district'] = {
                'id': user.school_district.districtId,
                'name': user.school_district.districtName,
                'municipality': user.school_district.municipality,
                'legislative_district': user.school_district.legislativeDistrict
            }
        else:
            token['school_district'] = None

        # Add profile picture URL if available
        if user.profile_picture:
            token['profile_picture'] = user.profile_picture.url
        else:
            token['profile_picture'] = None

        # Add e-signature URL if available
        if user.e_signature:
            token['e_signature'] = user.e_signature.url
        else:
            token['e_signature'] = None

        return token


class CustomTokenRefreshSerializer(TokenRefreshSerializer):
    def validate(self, attrs):
        data = super().validate(attrs)

        # Get the user ID from the token (if needed)
        from rest_framework_simplejwt.tokens import AccessToken
        access_token = AccessToken(data['access'])
        user_id = access_token['user_id']

        # Verify the user exists (optional, but helps prevent invalid tokens)
        try:
            User.objects.get(id=user_id)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found")

        return data


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
        requirements = validated_data.pop('requirements', None)
        instance.expenseTitle = validated_data.get(
            'expenseTitle', instance.expenseTitle)
        instance.is_active = validated_data.get(
            'is_active', instance.is_active)
        instance.category = validated_data.get('category', instance.category)
        instance.save()
        if requirements is not None:
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
    next_available_month = serializers.SerializerMethodField(read_only=True)
    is_advance_request = serializers.SerializerMethodField(read_only=True)
    can_submit_for_month = serializers.SerializerMethodField(read_only=True)

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
            'next_available_month',
            'is_advance_request',
            'can_submit_for_month',
        ]
        read_only_fields = ['request_id', 'created_at',
                            'date_approved', 'reviewed_by', 'reviewed_at']

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

    def get_next_available_month(self, obj):
        """Get next available month for this user"""
        if hasattr(obj, 'user') and obj.user:
            temp_request = RequestManagement(user=obj.user)
            return temp_request.get_next_available_month()
        return None

    def get_is_advance_request(self, obj):
        """Check if this is an advance request"""
        if not obj.request_monthyear:
            return False

        from datetime import date
        today = date.today()
        try:
            req_year, req_month = map(int, obj.request_monthyear.split('-'))
            return (req_year, req_month) > (today.year, today.month)
        except (ValueError, AttributeError):
            return False

    def get_can_submit_for_month(self, obj):
        """Check if user can submit for the request month"""
        if hasattr(obj, 'user') and obj.user and obj.request_monthyear:
            return RequestManagement.can_user_request_for_month(
                obj.user, obj.request_monthyear
            )
        return True

    def validate_request_monthyear(self, value):
        """Validate the requested month against business rules"""
        user = self.context['request'].user if 'request' in self.context else None

        if user and value:
            if not RequestManagement.can_user_request_for_month(user, value):
                existing = RequestManagement.objects.filter(
                    user=user,
                    request_monthyear=value
                ).exclude(status='rejected').first()

                if existing:
                    raise serializers.ValidationError(
                        f"You already have a request for {value}. "
                        f"Request ID: {existing.request_id}"
                    )
                else:
                    unliquidated = RequestManagement.objects.filter(
                        user=user
                    ).exclude(status__in=['liquidated', 'rejected']).first()

                    if unliquidated:
                        raise serializers.ValidationError(
                            f"Please liquidate your current request "
                            f"({unliquidated.request_id}) before submitting a new one."
                        )

        return value


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
    request = RequestManagementSerializer(read_only=True)
    documents = LiquidationDocumentSerializer(many=True, read_only=True)
    submitted_at = serializers.DateTimeField(
        source='created_at', read_only=True)
    reviewer_comments = serializers.SerializerMethodField()
    reviewed_by_district = UserSerializer(read_only=True)
    reviewed_by_liquidator = UserSerializer(read_only=True)
    reviewed_by_division = UserSerializer(read_only=True)
    liquidation_priorities = LiquidationPrioritySerializer(many=True)

    class Meta:
        model = LiquidationManagement
        fields = [
            'LiquidationID',
            'request',
            'rejection_comment',
            'status',
            'reviewed_by_district',
            'reviewed_at_district',
            'reviewed_by_liquidator',
            'reviewed_at_liquidator',
            'reviewed_by_division',
            'reviewed_at_division',
            'submitted_at',
            'date_submitted',
            'date_districtApproved',
            'date_liquidatorApproved',
            'date_liquidated',
            'reviewer_comments',
            'documents',
            'created_at',
            'liquidation_priorities',
            'refund',
            'remaining_days',  # will now come directly from DB
        ]

    def get_reviewer_comments(self, obj):
        comments = []
        for doc in obj.documents.all():
            if doc.reviewer_comment:
                comments.append({
                    'document': doc.requirement.requirementTitle,
                    'comment': doc.reviewer_comment
                })
        return comments

    def to_representation(self, instance):
        data = super().to_representation(instance)
        if hasattr(instance, 'liquidation_priorities'):
            data['actual_amounts'] = [
                {
                    'expense_id': lp.priority.LOPID,
                    'actual_amount': lp.amount
                }
                for lp in instance.liquidation_priorities.all()
            ]
        return data


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


class RequestManagementHistorySerializer(serializers.ModelSerializer):
    history_user = serializers.StringRelatedField()
    priorities = serializers.SerializerMethodField()  # Add this

    class Meta:
        model = RequestManagement.history.model
        fields = '__all__'

    def get_priorities(self, obj):
        # Get priorities as they were at this historical point
        from .models import RequestPriority
        priorities = RequestPriority.objects.filter(request_id=obj.request_id)
        return RequestPrioritySerializer(priorities, many=True).data


class LiquidationManagementHistorySerializer(serializers.ModelSerializer):
    history_user = serializers.StringRelatedField()

    class Meta:
        model = LiquidationManagement.history.model
        fields = '__all__'


class PreviousRequestSerializer(serializers.ModelSerializer):
    priorities = serializers.SerializerMethodField()

    class Meta:
        model = RequestManagement
        fields = [
            'request_id',
            'request_monthyear',
            'priorities',
        ]

    def get_priorities(self, obj):
        # Return priorities in {expenseTitle, amount} format for frontend
        return [
            {
                'expenseTitle': rp.priority.expenseTitle,
                'amount': str(rp.amount),
                'LOPID': str(rp.priority.LOPID),
            }
            for rp in obj.requestpriority_set.all()
        ]


class UnliquidatedSchoolReportSerializer(serializers.Serializer):
    schoolId = serializers.CharField()
    schoolName = serializers.CharField()
    unliquidated_count = serializers.IntegerField()
