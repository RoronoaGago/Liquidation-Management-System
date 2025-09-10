from django.db.models.functions import TruncMonth, ExtractDay
from django.db.models import Count, Avg, Sum, Q, F, ExpressionWrapper, FloatField, Case, When
from django.http import HttpResponse
import csv
from .serializers import UnliquidatedSchoolReportSerializer
from .models import School, RequestManagement
from urllib import request
from rest_framework.permissions import IsAuthenticated
from django.http import JsonResponse
from .serializers import CustomTokenObtainPairSerializer
from datetime import datetime, timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q
from rest_framework.exceptions import PermissionDenied, ValidationError
from .models import User, School, Requirement, ListOfPriority, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument, Notification, LiquidationPriority, SchoolDistrict
from .serializers import UserSerializer, SchoolSerializer, RequirementSerializer, ListOfPrioritySerializer, RequestManagementSerializer, LiquidationManagementSerializer, LiquidationDocumentSerializer, RequestPrioritySerializer, NotificationSerializer, CustomTokenRefreshSerializer, RequestManagementHistorySerializer, LiquidationManagementHistorySerializer, SchoolDistrictSerializer, PreviousRequestSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging
from django.db import transaction
from rest_framework.pagination import PageNumberPagination
import string
from django.contrib.auth import update_session_auth_hash
from django.utils.crypto import get_random_string
from .utils import generate_otp, send_otp_email
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.contrib.auth import authenticate
from django.utils import timezone
from .models import User
import random

logger = logging.getLogger(__name__)


class SchoolPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class UserPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class ProtectedView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        content = {'message': 'Hello, World! This is a protected view!'}
        return Response(content)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class CustomTokenRefreshView(TokenRefreshView):
    serializer_class = CustomTokenRefreshSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get('old_password')
    new_password = request.data.get('new_password')

    if not user.check_password(old_password):
        return Response({"error": "Current password is incorrect"}, status=status.HTTP_400_BAD_REQUEST)

    if len(new_password) < 8:
        return Response({"error": "Password must be at least 8 characters"}, status=status.HTTP_400_BAD_REQUEST)

    user.set_password(new_password)
    user.password_change_required = False
    user.save()

    # Update the token to prevent automatic logout
    refresh = RefreshToken.for_user(user)
    # Add minimal custom claims
    refresh['first_name'] = user.first_name
    refresh['last_name'] = user.last_name
    refresh['email'] = user.email
    refresh['role'] = user.role
    refresh['password_change_required'] = user.password_change_required

    return Response({
        "access": str(refresh.access_token),
        "refresh": str(refresh),
        "message": "Password updated successfully"
    })


@api_view(['GET', 'POST'])
def user_list(request):
    """
    List all users or create a new user with enhanced filtering
    """
    if request.method == 'GET':
        # Get filter parameters from query string
        show_archived = request.query_params.get(
            'archived', 'false').lower() == 'true'
        role_filter = request.query_params.get('role', None)
        school_filter = request.query_params.get('school', None)
        search_term = request.query_params.get('search', None)
        ordering = request.query_params.get('ordering', '-date_joined')
        show_all = request.query_params.get(
            'show_all', 'false').lower() == 'true'
        archived = request.query_params.get(
            'archived', 'false').lower() == 'true'

        queryset = User.objects.exclude(id=request.user.id)
        # Archive filter
        if not show_all:
            if not archived:
                queryset = queryset.filter(is_active=True)
            else:
                queryset = queryset.filter(is_active=False)

        # Role filter
        if role_filter:
            queryset = queryset.filter(role=role_filter)

        # School filter
        if school_filter:
            queryset = queryset.filter(
                school__schoolName__icontains=school_filter)
            queryset = queryset.filter(
                school__schoolId__icontains=school_filter)

        # Search filter
        if search_term:
            queryset = queryset.filter(
                Q(first_name__icontains=search_term) |
                Q(last_name__icontains=search_term) |
                Q(email__icontains=search_term) |
                Q(phone_number__icontains=search_term) |
                Q(sex__icontains=search_term) |
                # <-- Fix: use related field
                Q(school__schoolName__icontains=search_term) |
                # <-- Optionally add this too
                Q(school__schoolId__icontains=search_term)
            )

        # Add ordering support
        if ordering:
            queryset = queryset.order_by(ordering)

        # Paginate
        paginator = UserPagination()
        page = paginator.paginate_queryset(queryset, request)
        serializer = UserSerializer(page, many=True)
        return paginator.get_paginated_response(serializer.data)

    elif request.method == 'POST':
        # Only allow admins to create admin users
        # if request.data.get('role') == 'admin' and not request.user.is_superuser:
        #     return Response(
        #         {'error': 'Only administrators can create admin users'},
        #         status=status.HTTP_403_FORBIDDEN
        #     )

        serializer = UserSerializer(
            data=request.data, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def user_detail(request, pk):
    """
    Retrieve, update or delete a user instance with enhanced permissions
    """
    user = get_object_or_404(User, pk=pk)

    if request.method == 'GET':
        serializer = UserSerializer(user)
        return Response(serializer.data, status=status.HTTP_200_OK)

    elif request.method == 'PUT':
        # Prevent non-admins from making users admins
        if (request.data.get('role') == 'admin' and
            not request.user.is_superuser and
                user.role != 'admin'):
            return Response(
                {'error': 'Only administrators can assign admin role'},
                status=status.HTTP_403_FORBIDDEN
            )

        serializer = UserSerializer(
            user, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        # Check if sensitive fields were modified
        sensitive_fields = ['email',  'password', 'role']
        needs_new_token = any(
            field in request.data for field in sensitive_fields)

        serializer.save()

        response_data = serializer.data

        # Generate new token if needed
        if needs_new_token:
            refresh = RefreshToken.for_user(user)
            refresh['first_name'] = user.first_name
            refresh['last_name'] = user.last_name
            refresh['email'] = user.email
            refresh['role'] = user.role

            response_data['token'] = {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }

        return Response(response_data, status=status.HTTP_200_OK)

    elif request.method == 'PATCH':
        # Special handling for archive/unarchive
        if 'is_active' in request.data:
            # Prevent users from archiving themselves
            if user == request.user:
                return Response(
                    {'error': 'You cannot archive your own account'},
                    status=status.HTTP_403_FORBIDDEN
                )
            user.is_active = request.data['is_active']
            user.save()
            serializer = UserSerializer(user)
            return Response(serializer.data, status=status.HTTP_200_OK)

        # For other PATCH operations
        serializer = UserSerializer(
            user, data=request.data, partial=True, context={'request': request})
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    elif request.method == 'DELETE':
        # Prevent users from deleting themselves
        if user == request.user:
            return Response(
                {'error': 'You cannot delete your own account'},
                status=status.HTTP_403_FORBIDDEN
            )
        # Soft delete by archiving instead of hard delete
        user.is_active = False
        user.save()
        return Response(status=status.HTTP_204_NO_CONTENT)


class SchoolListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = SchoolSerializer
    pagination_class = SchoolPagination

    def get_queryset(self):
        queryset = School.objects.select_related('district').all()
        search_term = self.request.query_params.get('search', None)
        legislative_district = self.request.query_params.get(
            'legislative_district', None)
        municipality = self.request.query_params.get('municipality', None)
        district_id = self.request.query_params.get('district', None)
        archived = self.request.query_params.get(
            'archived', 'false').lower() == 'true'

        if not archived:
            queryset = queryset.filter(is_active=True)
        else:
            queryset = queryset.filter(is_active=False)

        if search_term:
            queryset = queryset.filter(
                Q(schoolName__icontains=search_term) |
                Q(district__districtName__icontains=search_term) |
                Q(municipality__icontains=search_term)
            )
        if legislative_district:
            queryset = queryset.filter(
                legislativeDistrict=legislative_district)
        if municipality:
            queryset = queryset.filter(municipality=municipality)
        if district_id:
            queryset = queryset.filter(district_id=district_id)
        return queryset.order_by('schoolName')

    def create(self, request, *args, **kwargs):
        # Check if the input data is a list (for bulk creation)
        is_many = isinstance(request.data, list)

        # Use many=True for lists, otherwise use default behavior
        serializer = self.get_serializer(data=request.data, many=is_many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


@api_view(['GET'])
def search_schools(request):
    search_term = request.query_params.get('search', '')
    schools = School.objects.filter(
        Q(schoolName__icontains=search_term) |
        Q(district__districtName__icontains=search_term) |
        Q(district__districtId__icontains=search_term) |  # Add district ID search
        Q(municipality__icontains=search_term)
    ).order_by('schoolName')[:10]  # Limit to 10 results
    serializer = SchoolSerializer(schools, many=True)
    return Response(serializer.data)


class SchoolRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = School.objects.all()
    serializer_class = SchoolSerializer
    lookup_field = 'schoolId'


class RequirementListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = RequirementSerializer

    def get_queryset(self):
        queryset = Requirement.objects.all()
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(requirementTitle__icontains=search_term)
        return queryset

    def create(self, request, *args, **kwargs):
        is_many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class RequirementRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Requirement.objects.all()
    serializer_class = RequirementSerializer
    lookup_field = 'requirementID'


class ListOfPriorityListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ListOfPrioritySerializer

    def get_queryset(self):
        queryset = ListOfPriority.objects.all()
        archived = self.request.query_params.get(
            'archived', 'false').lower() == 'true'
        if archived:
            queryset = queryset.filter(is_active=False)
        else:
            queryset = queryset.filter(is_active=True)
        return queryset

    def create(self, request, *args, **kwargs):
        # Enable batch posting
        is_many = isinstance(request.data, list)
        serializer = self.get_serializer(data=request.data, many=is_many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)


class ListOfPriorityRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = ListOfPriority.objects.all()
    serializer_class = ListOfPrioritySerializer
    lookup_field = 'LOPID'


class RequestManagementListView(generics.ListAPIView):
    """
    View for listing all requests (for admin/superusers) or user's own requests
    """
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = RequestManagement.objects.all()

        # Non-admin users only see their own requests
        if not self.request.user.role in ['admin', 'superintendent']:
            queryset = queryset.filter(user=self.request.user)

        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        return queryset.order_by('-created_at')


class RequestManagementListCreateView(generics.ListCreateAPIView):
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        try:
            # Save with atomic transaction
            with transaction.atomic():
                instance = serializer.save(user=self.request.user)
                # Force save to ensure signals fire
                instance.save()
                logger.info(
                    f"Successfully created request {instance.request_id}")
        except Exception as e:
            logger.error(f"Failed to create request: {str(e)}")
            raise

    def get_queryset(self):
        queryset = RequestManagement.objects.all()

        # Filter by multiple statuses if provided (comma-separated)
        status_param = self.request.query_params.get('status')
        if status_param:
            status_list = [s.strip()
                           for s in status_param.split(',') if s.strip()]
            if status_list:
                queryset = queryset.filter(status__in=status_list)

        # Filter by multiple school_ids if provided (comma-separated)
        school_ids_param = self.request.query_params.get('school_ids')
        if school_ids_param:
            school_ids_list = [s.strip()
                               for s in school_ids_param.split(',') if s.strip()]
            if school_ids_list:
                queryset = queryset.filter(
                    user__school__schoolId__in=school_ids_list)

        # For non-admin users, only show their own requests
        if self.request.user.role not in ['admin', 'superintendent', 'accountant']:
            queryset = queryset.filter(user=self.request.user)

        return queryset.order_by('-created_at')


class RequestManagementRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'request_id'

    def perform_update(self, serializer):
        instance = self.get_object()
        # Set the sender for notification
        instance._status_changed_by = self.request.user
        serializer.save()


class ApproveRequestView(generics.UpdateAPIView):
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        with transaction.atomic():  # Ensure atomic transaction
            # Lock the row to prevent race conditions
            instance = RequestManagement.objects.select_for_update().get(
                pk=kwargs['pk'])

            print(f"Current status: {instance.status}")  # Debug log

            # Permission check
            if request.user.role not in ['admin', 'superintendent']:
                return Response(
                    {"detail": "Only administrators can approve requests"},
                    status=status.HTTP_403_FORBIDDEN
                )

            # State validation
            if instance.status != 'pending':
                return Response(
                    {"detail": f"Current status is '{instance.status}', must be 'pending'"},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Prepare for notification
            instance._old_status = instance.status
            instance._status_changed_by = request.user
            instance._skip_auto_status = True  # Add this line
            instance.status = 'approved'
            instance.date_approved = timezone.now().date()
            instance.reviewed_by = request.user
            instance.reviewed_at = timezone.now()

            print(f"New status before save: {instance.status}")  # Debug log

            try:
                instance.save(update_fields=[
                    'status',
                    'date_approved',
                    'reviewed_by',
                    'reviewed_at'
                ])
                print(f"Status after save: {instance.status}")  # Debug log
            except Exception as e:
                print(f"Save failed: {str(e)}")  # Debug log
                raise

            # Verify in database
            refreshed = RequestManagement.objects.get(pk=instance.pk)
            print(f"Database status: {refreshed.status}")  # Debug log

            return Response(self.get_serializer(instance).data)


class RejectRequestView(generics.UpdateAPIView):
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance._old_status = instance.status  # CRITICAL: Track previous state
        instance._status_changed_by = request.user
        instance._skip_auto_status = True  # Add this line

        # Permission check
        if request.user.role not in ['admin', 'superintendent']:
            return Response(
                {"detail": "Only administrators can reject requests"},
                status=status.HTTP_403_FORBIDDEN
            )

        # State validation
        if instance.status != 'pending':
            return Response(
                {"detail": "Only pending requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Comment validation
        rejection_comment = request.data.get('rejection_comment', '').strip()
        if not rejection_comment:
            return Response(
                {"detail": "Please provide a rejection comment"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save will trigger signals
        instance.status = 'rejected'
        instance.rejection_comment = request.data.get('rejection_comment')
        instance.rejection_date = timezone.now().date()

        # Explicit save
        instance.save(
            update_fields=['status', 'rejection_comment', 'rejection_date'])

        return Response(self.get_serializer(instance).data)


class RequestManagementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating, or deleting a specific request.
    """
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'request_id'

    def perform_update(self, serializer):
        instance = self.get_object()

        # Prevent editing if request is already approved
        if instance.status == 'approved':
            raise ValidationError("Cannot edit an already approved request")

        # Check if user has permission to edit this request
        if instance.user != self.request.user and self.request.user.role not in ['admin', 'superintendent']:
            raise PermissionDenied(
                "You don't have permission to edit this request")

        # Allow updates for rejected requests and reset status to pending
        if instance.status == 'rejected':
            # Assuming status_changed_by is a model field
            serializer.save(status='pending',
                            status_changed_by=self.request.user)
        else:
            serializer.save()


class RequestPriorityCreateView(generics.CreateAPIView):
    """
    View for adding priorities to an existing request
    """
    serializer_class = RequestPrioritySerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        request_id = self.kwargs['request_id']
        request_obj = RequestManagement.objects.get(request_id=request_id)

        # Check if user has permission to modify this request
        if request_obj.user != self.request.user and self.request.user.role not in ['admin', 'superintendent']:
            raise PermissionDenied(
                "You don't have permission to modify this request")

        # Prevent adding priorities if request is already approved/rejected
        if request_obj.status in ['approved', 'rejected']:
            raise ValidationError(
                "Cannot add priorities to an already approved/rejected request")

        serializer.save(request=request_obj)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_pending_requests(request):
    """
    Check if user has any pending requests or liquidations that aren't completed
    """
    # Check for pending/rejected requests
    user_requests = RequestManagement.objects.filter(
        user=request.user,
        status__in=['pending', 'approved']  # Include rejected
    ).order_by('-created_at')

    # Check for liquidations that aren't completed
    active_liquidations = LiquidationManagement.objects.filter(
        request__user=request.user
    ).exclude(status='completed').order_by('-created_at')

    response_data = {
        'has_pending_request': user_requests.exists(),
        'has_active_liquidation': active_liquidations.exists(),
        'pending_request': RequestManagementSerializer(user_requests.first()).data if user_requests.exists() else None,
        'active_liquidation': LiquidationManagementSerializer(active_liquidations.first(), context={'request': request}).data if active_liquidations.exists() else None
    }

    return Response(response_data)


def get_priorities_for_history(request_id, as_of_date):
    # Get all priority history records that existed at or before as_of_date
    from .models import RequestPriority
    priorities = RequestPriority.history.as_of(
        as_of_date).filter(request_id=request_id)

    return [
        {
            "expenseTitle": rp.priority.expenseTitle,
            "LOPID": rp.priority.LOPID,
            "amount": rp.amount,
        }
        for rp in priorities
    ]


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def resubmit_request(request, request_id):
    try:
        req = RequestManagement.objects.get(
            request_id=request_id, user=request.user)

        if req.status != 'rejected':
            return Response({"error": "Only rejected requests can be resubmitted"}, status=400)

        # Update priorities
        RequestPriority.objects.filter(request=req).delete()
        for pa in request.data.get('priority_amounts', []):
            priority = ListOfPriority.objects.get(LOPID=pa['LOPID'])
            RequestPriority.objects.create(
                request=req,
                priority=priority,
                amount=pa['amount']
            )

        # Reset status and clear rejection fields
        req.status = 'pending'
        # req.rejection_comment = None
        # req.rejection_date = None
        req.save()

        # --- Notification logic ---
        from .models import Notification
        Notification.objects.create(
            notification_title="Request Resubmitted",
            details="Your request has been resubmitted and is pending review.",
            receiver=req.user,
            sender=request.user,
        )
        # --- End notification logic ---

        return Response(RequestManagementSerializer(req).data)

    except RequestManagement.DoesNotExist:
        return Response({"error": "Request not found"}, status=404)


class LiquidationManagementListCreateAPIView(generics.ListCreateAPIView):
    queryset = LiquidationManagement.objects.all()
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'liquidator':
            # Show both approved_district and under_review_division for liquidators
            return LiquidationManagement.objects.filter(
                status__in=['approved_district', 'under_review_division']
            )
        elif user.role == 'school_head':
            # Only return the latest liquidation for the school_head's requests
            qs = LiquidationManagement.objects.filter(
                request__user=user).order_by('-created_at')
            latest = qs.first()
            return LiquidationManagement.objects.filter(pk=latest.pk) if latest else LiquidationManagement.objects.none()
        # All other users see all liquidations
        return LiquidationManagement.objects.all()

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class LiquidationManagementRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LiquidationManagement.objects.all()
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'LiquidationID'

    def get_queryset(self):
        queryset = super().get_queryset()
        # Prefetch related data for better performance
        return queryset.select_related(
            'request',
            'request__user',
            'request__user__school',
            'reviewed_by_district',
            'reviewed_by_division'
        ).prefetch_related(
            'documents',
            'documents__requirement',
            'documents__request_priority',
            'documents__request_priority__priority',
            'liquidation_priorities',
            'liquidation_priorities__priority'
        )

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        instance._old_status = instance.status  # Track previous status for signals
        partial = kwargs.pop('partial', False)
        data = request.data.copy()

        # If approving at district level, set reviewed_by_district
        if data.get("status") == "approved_district":
            data["reviewed_by_district"] = request.user.id
            data["reviewed_at_district"] = timezone.now()

        # If rejecting (resubmit), capture rejection_comment
        if data.get("status") == "resubmit":
            rejection_comment = data.get('rejection_comment', '').strip()
            if not rejection_comment:
                return Response(
                    {"detail": "Please provide a rejection comment for resubmission."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            instance.rejection_comment = rejection_comment

        # Set the user who changed the status for notification
        instance._status_changed_by = request.user  # <-- CRUCIAL for notifications!
        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = self.get_object()
        instance._status_changed_by = self.request.user  # <-- CRUCIAL for notifications!
        serializer.save()


@api_view(['POST'])
def approve_liquidation(request, LiquidationID):
    try:
        liquidation = LiquidationManagement.objects.get(
            LiquidationID=LiquidationID)
        if liquidation.status not in ['submitted', 'under_review_district', 'under_review_division']:
            return Response(
                {'error': 'Liquidation is not in a reviewable state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        # ... (other checks as needed) ...
        liquidation._status_changed_by = request.user
        liquidation.status = 'liquidated'
        liquidation.reviewed_by = request.user
        liquidation.reviewed_at = timezone.now()
        liquidation.save()
        serializer = LiquidationManagementSerializer(liquidation)
        return Response(serializer.data)
    except LiquidationManagement.DoesNotExist:
        return Response(
            {'error': 'Liquidation not found'},
            status=status.HTTP_404_NOT_FOUND
        )


class LiquidationDocumentListCreateAPIView(generics.ListCreateAPIView):
    queryset = LiquidationDocument.objects.all()
    serializer_class = LiquidationDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        liquidation_id = self.kwargs.get('LiquidationID')
        return self.queryset.filter(liquidation__LiquidationID=liquidation_id)

    def create(self, request, *args, **kwargs):
        liquidation_id = self.kwargs.get('LiquidationID')
        liquidation = get_object_or_404(
            LiquidationManagement, LiquidationID=liquidation_id)

        # Check for existing document
        existing_doc = self.get_queryset().filter(
            request_priority_id=request.data.get('request_priority'),
            requirement_id=request.data.get('requirement')
        ).first()

        if existing_doc:
            serializer = self.get_serializer(
                existing_doc, data=request.data, partial=True)
        else:
            serializer = self.get_serializer(data=request.data)

        serializer.is_valid(raise_exception=True)
        serializer.save(liquidation=liquidation, uploaded_by=request.user)

        headers = self.get_success_headers(serializer.data)
        return Response(
            serializer.data,
            status=status.HTTP_200_OK if existing_doc else status.HTTP_201_CREATED,
            headers=headers
        )


class LiquidationDocumentRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LiquidationDocument.objects.all()
    serializer_class = LiquidationDocumentSerializer
    permission_classes = [IsAuthenticated]


@api_view(['POST'])
def submit_for_liquidation(request, request_id):
    try:
        with transaction.atomic():
            request_obj = RequestManagement.objects.select_for_update().get(request_id=request_id)

            if request_obj.status != 'approved':
                return Response(
                    {'error': 'Request must be approved before liquidation'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get download date from request data or use current date
            download_date = request.data.get('download_date')
            if download_date:
                try:
                    download_date = timezone.datetime.strptime(
                        download_date, '%Y-%m-%d').date()
                except (ValueError, TypeError):
                    return Response(
                        {'error': 'Invalid download date format. Use YYYY-MM-DD'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                # Validate download date is not in the future and not before approval date
                if download_date > timezone.now().date():
                    return Response(
                        {'error': 'Download date cannot be in the future'},
                        status=status.HTTP_400_BAD_REQUEST
                    )

                if request_obj.date_approved and download_date < request_obj.date_approved:
                    return Response(
                        {'error': 'Download date cannot be before approval date'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
            else:
                download_date = timezone.now().date()

            # First update the request status to 'downloaded' and set date_downloaded
            request_obj._status_changed_by = request.user
            request_obj.status = 'downloaded'
            request_obj.downloaded_at = download_date  # Use the selected date
            request_obj.save(update_fields=['status', 'downloaded_at'])

            # Create liquidation record
            liquidation, created = LiquidationManagement.objects.get_or_create(
                request=request_obj,
                defaults={'status': 'draft'}
            )

            if not created:
                return Response(
                    {'error': 'Liquidation already exists for this request'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Update request status to 'unliquidated' as final state
            request_obj.status = 'unliquidated'
            request_obj.save(update_fields=['status'])

            serializer = LiquidationManagementSerializer(liquidation)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

    except RequestManagement.DoesNotExist:
        return Response(
            {'error': 'Request not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except ValidationError as e:
        return Response(
            {'error': str(e)},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_liquidation(request, LiquidationID):
    try:
        with transaction.atomic():
            liquidation = LiquidationManagement.objects.select_for_update().get(
                LiquidationID=LiquidationID
            )

            # Check if all required documents are uploaded
            required_docs_missing = False
            for rp in liquidation.request.requestpriority_set.all():
                for req in rp.priority.requirements.filter(is_required=True):
                    if not LiquidationDocument.objects.filter(
                        liquidation=liquidation,
                        request_priority=rp,
                        requirement=req
                    ).exists():
                        required_docs_missing = True
                        break
                if required_docs_missing:
                    break

            # Allow submission if status is 'draft' or 'resubmit'
            if liquidation.status not in ['draft', 'resubmit']:
                return Response(
                    {'error': 'Liquidation must be in draft or resubmit status to be submitted'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            if required_docs_missing:
                return Response(
                    {'error': 'All required documents must be uploaded before submission'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Get the actual amounts from the request data
            actual_amounts = request.data.get('actual_amounts', [])

            # Update liquidation priorities with actual amounts
            for amount_data in actual_amounts:
                try:
                    priority = ListOfPriority.objects.get(
                        LOPID=amount_data['expense_id'])
                    liquidation_priority, created = LiquidationPriority.objects.get_or_create(
                        liquidation=liquidation,
                        priority=priority,
                        defaults={'amount': amount_data['actual_amount']}
                    )
                    if not created:
                        liquidation_priority.amount = amount_data['actual_amount']
                        liquidation_priority.save()
                except (ListOfPriority.DoesNotExist, KeyError):
                    continue

            # Recalculate refund
            liquidation.refund = liquidation.calculate_refund()

            # Update status to submitted and track who changed it
            liquidation._status_changed_by = request.user
            liquidation.status = 'submitted'
            liquidation.save()

            # Create notification for the reviewer
            # Notification.objects.create(
            #     notification_title="New Liquidation Submitted",
            #     details=f"Liquidation {liquidation.LiquidationID} has been submitted for review.",
            #     receiver=liquidation.request.user,  # Or the appropriate reviewer
            #     sender=request.user,
            # )

            serializer = LiquidationManagementSerializer(
                liquidation,
                context={'request': request}
            )
            return Response(serializer.data, status=status.HTTP_200_OK)

    except LiquidationManagement.DoesNotExist:
        return Response(
            {'error': 'Liquidation not found'},
            status=status.HTTP_404_NOT_FOUND
        )
    except Exception as e:
        logger.error(f"Error submitting liquidation: {str(e)}", exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred during submission'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
def view_liquidation(request, LiquidationID):
    liquidation = get_object_or_404(
        LiquidationManagement, LiquidationID=LiquidationID)
    serializer = LiquidationManagementSerializer(liquidation)
    return Response(serializer.data)


# @api_view(['POST'])
# def approve_liquidation(request, LiquidationID):
#     try:
#         liquidation = LiquidationManagement.objects.get(
#             LiquidationID=LiquidationID)
#         if liquidation.status not in ['submitted', 'under_review']:
#             return Response(
#                 {'error': 'Liquidation is not in a reviewable state'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         if liquidation.documents.filter(is_approved=False).exists():
#             return Response(
#                 {'error': 'All documents must be approved first'},
#                 status=status.HTTP_400_BAD_REQUEST
#             )

#         # Set the user who changed the status for notification
#         liquidation._status_changed_by = request.user
#         liquidation.status = 'liquidated'
#         liquidation.reviewed_by = request.user
#         liquidation.reviewed_at = timezone.now()
#         liquidation.save()

#         serializer = LiquidationManagementSerializer(liquidation)
#         return Response(serializer.data)

#     except LiquidationManagement.DoesNotExist:
#         return Response(
#             {'error': 'Liquidation not found'},
#             status=status.HTTP_404_NOT_FOUND
#         )


class UserLiquidationsAPIView(generics.ListAPIView):
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == "school_head":
            return LiquidationManagement.objects.filter(request__user=user).order_by('-created_at')
        elif user.role == "school_admin":
            # Allow school admin to see liquidations for their school
            return LiquidationManagement.objects.filter(request__user__school=user.school).order_by('-created_at')
        else:
            return LiquidationManagement.objects.none()


class UserRequestListAPIView(generics.ListAPIView):
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return RequestManagement.objects.filter(user=self.request.user).order_by('-created_at')


class PendingLiquidationListAPIView(generics.ListAPIView):
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        # Filter LiquidationManagement by status and by the current user
        return LiquidationManagement.objects.filter(
            status='draft',
            request__user=self.request.user
        )


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def batch_update_school_budgets(request):
    updates = request.data.get("updates", [])
    if not isinstance(updates, list):
        return Response({"error": "Invalid data format."}, status=400)

    updated_ids = []
    errors = []

    with transaction.atomic():
        for upd in updates:
            school_id = str(upd.get("schoolId")).strip()
            max_budget = upd.get("max_budget")
            print("Updating:", school_id, "to", max_budget)
            try:
                school = School.objects.get(schoolId=school_id)
                if max_budget is not None and float(max_budget) >= 0:
                    school.max_budget = float(max_budget)
                    school.save()
                    updated_ids.append(school_id)
                else:
                    errors.append(
                        {"schoolId": school_id, "error": "Invalid budget"})
            except School.DoesNotExist:
                errors.append(
                    {"schoolId": school_id, "error": "School not found"})
            except Exception as e:
                errors.append({"schoolId": school_id, "error": str(e)})

    return Response({
        "updated": updated_ids,
        "errors": errors
    }, status=200 if not errors else 207)


@api_view(['GET'])
def legislative_districts(request):
    """
    Returns mapping of legislative districts to their municipalities.
    """
    data = {
        "1st District": [
            "BANGAR", "LUNA", "SUDIPEN", "BALAOAN", "SANTOL", "BACNOTAN",
            "SAN GABRIEL", "SAN JUAN", "SAN FERNANDO CITY"
        ],
        "2nd District": [
            "AGOO", "ARINGAY", "BAGULIN", "BAUANG", "BURGOS", "CABA",
            "NAGUILIAN", "PUGO", "ROSARIO", "SANTO TOMAS", "TUBAO"
        ]
    }
    return Response(data)


def generate_request_id():
    prefix = "REQ-"
    random_part = get_random_string(
        length=6,
        allowed_chars=string.ascii_uppercase + string.digits
    )
    return f"{prefix}{random_part}"


class NotificationListAPIView(generics.ListAPIView):
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Notification.objects.filter(receiver=self.request.user).order_by('-notification_date')


class MarkNotificationAsReadAPIView(generics.UpdateAPIView):
    queryset = Notification.objects.all()
    permission_classes = [IsAuthenticated]

    def patch(self, request, *args, **kwargs):
        notification = self.get_object()
        if notification.receiver != request.user:
            return Response({"detail": "Not authorized."}, status=status.HTTP_403_FORBIDDEN)

        # Here you might want to add an 'is_read' field to your Notification model
        notification.is_read = True
        notification.save()
        return Response({"status": "marked as read"})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_me(request):
    serializer = UserSerializer(request.user)
    return Response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def division_signatories(request):
    """
    Returns the first superintendent and division accountant.
    """
    from .models import User
    superintendent = User.objects.filter(
        role='superintendent').order_by('date_joined').first()
    accountant = User.objects.filter(
        role='accountant').order_by('date_joined').first()
    return Response({
        "superintendent": UserSerializer(superintendent).data if superintendent else None,
        "accountant": UserSerializer(accountant).data if accountant else None,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def request_history(request, request_id):
    req = RequestManagement.objects.get(request_id=request_id)
    history = req.history.order_by('-history_date')
    data = []
    for h in history:
        priorities = get_priorities_for_history(h.request_id, h.history_date)
        data.append({
            "priorities": priorities,
            "status": h.status,
            "rejection_comment": h.rejection_comment,
            "rejection_date": h.rejection_date,
            "created_at": h.created_at,
            "user": {
                "first_name": h.user.first_name if h.user else "",
                "last_name": h.user.last_name if h.user else "",
                "school": {
                    "schoolId": h.user.school.schoolId if h.user and h.user.school else "",
                    "schoolName": h.user.school.schoolName if h.user and h.user.school else "",
                } if h.user and h.user.school else None,
            } if h.user else None,
            "request_id": h.request_id,
        })
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def liquidation_management_history(request, LiquidationID):
    liq = LiquidationManagement.objects.get(LiquidationID=LiquidationID)
    history = liq.history.all().order_by('-history_date')
    serializer = LiquidationManagementHistorySerializer(history, many=True)
    return Response(serializer.data)


# @api_view(['POST'])
# def request_otp(request):
#     email = request.data.get('email')
#     user = User.objects.filter(email=email).first()
#     if not user:
#         return Response({'error': 'User not found'}, status=404)
#     otp = generate_otp()
#     user.otp_code = otp
#     user.otp_generated_at = timezone.now()
#     user.save(update_fields=['otp_code', 'otp_generated_at'])
#     send_otp_email(user, otp)
#     return Response({'message': 'OTP sent to your email.'})


# @api_view(['POST'])
# def verify_otp(request):
#     email = request.data.get('email')
#     otp = request.data.get('otp')
#     user = User.objects.filter(email=email).first()
#     if not user or not user.otp_code:
#         return Response({'error': 'OTP not found'}, status=404)
#     # Optional: Check OTP expiry (e.g., valid for 5 minutes)
#     if timezone.now() - user.otp_generated_at > timezone.timedelta(minutes=5):
#         return Response({'error': 'OTP expired'}, status=400)
#     if user.otp_code != otp:
#         return Response({'error': 'Invalid OTP'}, status=400)
#     # OTP is valid, clear it
#     user.otp_code = None
#     user.otp_generated_at = None
#     user.save(update_fields=['otp_code', 'otp_generated_at'])
#     return Response({'message': 'OTP verified. You may now log in.'})


class SchoolDistrictPagination(PageNumberPagination):
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 100


class SchoolDistrictListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = SchoolDistrictSerializer
    pagination_class = SchoolDistrictPagination

    def get_queryset(self):
        queryset = SchoolDistrict.objects.all()
        search_term = self.request.query_params.get('search', None)
        legislative_district = self.request.query_params.get(
            'legislative_district', None)
        municipality = self.request.query_params.get('municipality', None)
        archived = self.request.query_params.get(
            'archived', 'false').lower() == 'true'
        show_all = self.request.query_params.get(
            'show_all', 'false').lower() == 'true'

        # Archive filter - show_all takes precedence over archived
        if not show_all:
            if not archived:
                queryset = queryset.filter(is_active=True)
            else:
                queryset = queryset.filter(is_active=False)

        if search_term:
            queryset = queryset.filter(
                Q(districtName__icontains=search_term) |
                Q(districtId__icontains=search_term) |
                Q(municipality__icontains=search_term)
            )
        if legislative_district:
            queryset = queryset.filter(
                legislativeDistrict=legislative_district)
        if municipality:
            queryset = queryset.filter(municipality=municipality)
        ordering = self.request.query_params.get('ordering', 'districtName')
        if ordering:
            queryset = queryset.order_by(ordering)
        return queryset


class SchoolDistrictRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = SchoolDistrict.objects.all()
    serializer_class = SchoolDistrictSerializer
    lookup_field = 'districtId'


@api_view(['PATCH'])
def archive_school_district(request, districtId):
    """
    Archive or restore a school district.
    """
    try:
        school_district = SchoolDistrict.objects.get(districtId=districtId)
        is_active = request.data.get("is_active", None)
        if is_active is not None:
            school_district.is_active = is_active
            school_district.save()
            return Response({"status": "updated", "is_active": school_district.is_active})
        return Response({"error": "Missing is_active field"}, status=400)
    except SchoolDistrict.DoesNotExist:
        return Response({"error": "School district not found"}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def last_liquidated_request(request):
    last_req = (
        RequestManagement.objects.filter(
            user=request.user, status="liquidated")
        .order_by('-created_at')
        .first()
    )
    if not last_req:
        return Response({"detail": "No liquidated request found"}, status=404)
    return Response(PreviousRequestSerializer(last_req).data)


def generate_otp():
    return ''.join(str(random.randint(0, 9)) for _ in range(6))


@api_view(['POST'])
@permission_classes([AllowAny])
def request_otp(request):
    email = request.data.get('email')
    password = request.data.get('password')
    try:
        user_obj = User.objects.get(email=email)
        if not user_obj.is_active:
            return Response({'message': 'Your account has been archived by the administrator. To reactivate your account, please contact our support team at support@company.com.'}, status=403)
        user = authenticate(email=email, password=password)
        if not user:
            return Response({'message': 'Invalid email or password'}, status=400)
        otp = generate_otp()
        user.otp_code = otp
        user.otp_generated_at = timezone.now()
        user.save()
        send_otp_email(user, otp)
        return Response({'message': 'OTP sent to your email'})
    except User.DoesNotExist:
        return Response({'message': 'Invalid email or password'}, status=400)


@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp(request):
    email = request.data.get('email')
    otp = request.data.get('otp')
    try:
        user = User.objects.get(email=email)
        if not user.is_active:
            return Response({'error': 'Your account is inactive. Please contact the administrator.'}, status=403)
        # Check OTP validity (add expiry logic if needed)
        if timezone.now() - user.otp_generated_at > timezone.timedelta(minutes=5):
            return Response({'error': 'OTP expired'}, status=400)

        if user.otp_code == otp:
            user.otp_code = None
            user.save()
            return Response({'message': 'OTP verified'})
        else:
            return Response({'message': 'Invalid OTP. Please try again.'}, status=400)
    except User.DoesNotExist:
        return Response({'message': 'User not found'}, status=404)


@api_view(['POST'])
@permission_classes([AllowAny])
def resend_otp(request):
    email = request.data.get('email')
    try:
        user = User.objects.get(email=email)
        otp = generate_otp()
        user.otp_code = otp
        user.otp_generated_at = timezone.now()
        user.save()
        send_otp_email(user, otp)
        return Response({'message': 'OTP resent'})
    except User.DoesNotExist:
        return Response({'message': 'User not found'}, status=404)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def schools_with_unliquidated_requests(request):
    month = request.GET.get('month')  # format: 'YYYY-MM'
    filters = {'status': 'unliquidated'}
    if month:
        filters['request_monthyear'] = month

    # Get all schools with an unliquidated request for the selected month
    unliquidated_requests = RequestManagement.objects.filter(**filters)
    school_ids = unliquidated_requests.values_list(
        'user__school__schoolId', flat=True).distinct()
    schools = School.objects.filter(schoolId__in=school_ids)

    data = [
        {
            "schoolId": school.schoolId,
            "schoolName": school.schoolName,
            "has_unliquidated": True
        }
        for school in schools
    ]
    return Response(data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def admin_dashboard(request):
    # Check if user is admin
    if request.user.role != 'admin':
        return Response({"error": "Only administrators can access this endpoint"}, status=status.HTTP_403_FORBIDDEN)

    # Get time range parameter
    time_range = request.GET.get('time_range', 'last_quarter')

    # Calculate date range based on parameter
    end_date = timezone.now()
    if time_range == 'last_week':
        start_date = end_date - timedelta(days=7)
    elif time_range == 'last_month':
        start_date = end_date - timedelta(days=30)
    elif time_range == 'last_quarter':
        start_date = end_date - timedelta(days=90)
    elif time_range == 'last_year':
        start_date = end_date - timedelta(days=365)
    else:
        start_date = end_date - timedelta(days=90)  # Default to last quarter

    # 1. Budget Utilization Data
    budget_utilization = []
    months = []
    current = start_date

    while current <= end_date:
        month_str = current.strftime('%Y-%m')
        months.append(month_str)
        current = current + timedelta(days=30)  # Approximate month

    for month in months:
        # Get all requests for this month
        month_requests = RequestManagement.objects.filter(
            created_at__year=month[:4],
            created_at__month=month[5:7]
        )

        total_allocated = School.objects.aggregate(
            total=Sum('max_budget'))['total'] or 0
        total_utilized = RequestPriority.objects.filter(
            request__in=month_requests
        ).aggregate(total=Sum('amount'))['total'] or 0

        utilization_rate = (total_utilized / total_allocated *
                            100) if total_allocated > 0 else 0

        budget_utilization.append({
            'month': month,
            'allocated': float(total_allocated),
            'utilized': float(total_utilized),
            'utilizationRate': float(utilization_rate)
        })

    # 2. Request Status Distribution
    status_counts = RequestManagement.objects.values('status').annotate(
        count=Count('status')
    ).order_by('-count')

    total_requests = RequestManagement.objects.count()
    request_status_distribution = []

    for status in status_counts:
        percentage = (status['count'] / total_requests *
                      100) if total_requests > 0 else 0
        request_status_distribution.append({
            'status': status['status'],
            'count': status['count'],
            'percentage': float(percentage)
        })

    # 3. Liquidation Timeline - FIXED: Use liquidation created_at instead of request created_at
    liquidation_timeline = []
    for month in months:
        month_liquidations = LiquidationManagement.objects.filter(
            created_at__year=month[:4],
            created_at__month=month[5:7]
        )

        # Calculate average processing time (days from liquidation creation to completion)
        avg_processing = month_liquidations.filter(
            status='liquidated'
        ).annotate(
            processing_time=ExpressionWrapper(
                # CHANGED: Use liquidation creation date
                F('date_liquidated') - F('created_at'),
                output_field=FloatField()
            )
        ).aggregate(avg=Avg('processing_time'))['avg'] or 0

        # Convert timedelta to days
        if hasattr(avg_processing, 'days'):
            avg_processing_days = avg_processing.days
        else:
            avg_processing_days = float(
                avg_processing) / (24 * 60 * 60) if avg_processing else 0

        approved_count = month_liquidations.filter(status='liquidated').count()
        rejected_count = month_liquidations.filter(status='resubmit').count()

        liquidation_timeline.append({
            'month': month,
            'avgProcessingTime': float(avg_processing_days),
            'approved': approved_count,
            'rejected': rejected_count
        })

    # 4. School Performance - FIXED: Use liquidation created_at instead of request created_at
    school_performance = []
    schools = School.objects.all()

    for school in schools:
        school_requests = RequestManagement.objects.filter(user__school=school)
        total_requests = school_requests.count()
        approved_requests = school_requests.filter(status='approved').count()
        rejected_requests = school_requests.filter(status='rejected').count()

        rejection_rate = (rejected_requests / total_requests *
                          100) if total_requests > 0 else 0

        # Calculate average processing time for this school - FIXED: Use liquidation creation date
        school_liquidations = LiquidationManagement.objects.filter(
            request__user__school=school,
            status='liquidated'
        )
        avg_processing = school_liquidations.annotate(
            processing_time=ExpressionWrapper(
                # CHANGED: Use liquidation creation date
                F('date_liquidated') - F('created_at'),
                output_field=FloatField()
            )
        ).aggregate(avg=Avg('processing_time'))['avg'] or 0

        if hasattr(avg_processing, 'days'):
            avg_processing_days = avg_processing.days
        else:
            avg_processing_days = float(
                avg_processing) / (24 * 60 * 60) if avg_processing else 0

        # Calculate budget utilization for this school
        school_utilized = RequestPriority.objects.filter(
            request__user__school=school
        ).aggregate(total=Sum('amount'))['total'] or 0

        budget_utilization_rate = (
            school_utilized / school.max_budget * 100) if school.max_budget > 0 else 0

        school_performance.append({
            'schoolId': school.schoolId,
            'schoolName': school.schoolName,
            'totalRequests': total_requests,
            'approvedRequests': approved_requests,
            'rejectionRate': float(rejection_rate),
            'avgProcessingTime': float(avg_processing_days),
            'budgetUtilization': float(budget_utilization_rate)
        })

    # 5. Category Spending
    category_spending = []
    categories = ListOfPriority.CATEGORY_CHOICES

    for category_key, category_name in categories:
        category_total = RequestPriority.objects.filter(
            priority__category=category_key
        ).aggregate(total=Sum('amount'))['total'] or 0

        total_all_categories = RequestPriority.objects.aggregate(total=Sum('amount'))[
            'total'] or 0
        percentage = (category_total / total_all_categories *
                      100) if total_all_categories > 0 else 0

        # Simple trend calculation (compare with previous period)
        trend = 'stable'
        if category_total > 0:
            # This is a simplified trend calculation
            trend = 'up' if category_total > 10000 else 'down'

        category_spending.append({
            'category': category_name,
            'totalAmount': float(category_total),
            'percentage': float(percentage),
            'trend': trend
        })

    # Sort by total amount descending
    category_spending.sort(key=lambda x: x['totalAmount'], reverse=True)
    category_spending = category_spending[:5]  # Limit to top 5

    # 6. Document Compliance
    document_compliance = []
    requirements = Requirement.objects.all()

    for requirement in requirements:
        total_submitted = LiquidationDocument.objects.filter(
            requirement=requirement
        ).count()

        compliant = LiquidationDocument.objects.filter(
            requirement=requirement,
            is_approved=True
        ).count()

        compliance_rate = (compliant / total_submitted *
                           100) if total_submitted > 0 else 0

        document_compliance.append({
            'requirement': requirement.requirementTitle,
            'totalSubmitted': total_submitted,
            'compliant': compliant,
            'complianceRate': float(compliance_rate)
        })

    # 7. Top Priorities
    top_priorities = []
    priorities = RequestPriority.objects.values(
        'priority__expenseTitle'
    ).annotate(
        frequency=Count('priority'),
        total_amount=Sum('amount')
    ).order_by('-total_amount')[:10]

    for priority in priorities:
        # Simple trend calculation
        trend = 'stable'
        if priority['total_amount']:
            trend = 'up' if priority['total_amount'] > 5000 else 'down'

        top_priorities.append({
            'priority': priority['priority__expenseTitle'],
            'frequency': priority['frequency'],
            'totalAmount': float(priority['total_amount']),
            'trend': trend
        })

    # 8. Active Requests - REPLACED Pending Actions with Active Requests
    active_requests = []

    # Get all requests that are in active states (not completed/rejected)
    active_request_states = ['pending',
                             'approved', 'downloaded', 'unliquidated']
    active_requests_data = RequestManagement.objects.filter(
        status__in=active_request_states)

    for request in active_requests_data:
        days_active = (timezone.now() - request.created_at).days

        # Determine priority based on status and age
        if request.status == 'pending':
            priority = 'high' if days_active > 7 else 'medium' if days_active > 3 else 'low'
        elif request.status == 'approved':
            priority = 'high' if days_active > 5 else 'medium'
        else:
            priority = 'medium'

        # Get school information
        school_name = request.user.school.schoolName if request.user and request.user.school else "Unknown School"
        user_name = request.user.get_full_name() if request.user else "Unknown User"

        active_requests.append({
            'id': request.request_id,
            'type': 'request',
            'title': f'Active Request: {request.request_id}',
            'description': f'{user_name} from {school_name} - Status: {request.status.capitalize()}',
            'status': request.status,
            'priority': priority,
            'timestamp': request.created_at.isoformat(),
            'schoolName': school_name,
            'userName': user_name
        })

    # Sort by priority and timestamp
    priority_order = {'high': 0, 'medium': 1, 'low': 2}
    active_requests.sort(key=lambda x: (
        priority_order[x['priority']], x['timestamp']))

    # 9. Additional Liquidation Metrics - NEW
    liquidation_metrics = {
        'total_liquidations': LiquidationManagement.objects.count(),
        'completed_liquidations': LiquidationManagement.objects.filter(status='liquidated').count(),
        'pending_liquidations': LiquidationManagement.objects.exclude(status='liquidated').count(),
        'completion_rate': (LiquidationManagement.objects.filter(status='liquidated').count() /
                            LiquidationManagement.objects.count() * 100) if LiquidationManagement.objects.count() > 0 else 0,
        'avg_liquidation_time': LiquidationManagement.objects.filter(
            status='liquidated'
        ).annotate(
            processing_time=ExpressionWrapper(
                F('date_liquidated') - F('created_at'),
                output_field=FloatField()
            )
        ).aggregate(avg=Avg('processing_time'))['avg'] or 0
    }

    # Convert avg_liquidation_time to days
    if hasattr(liquidation_metrics['avg_liquidation_time'], 'days'):
        liquidation_metrics['avg_liquidation_time_days'] = liquidation_metrics['avg_liquidation_time'].days
    else:
        liquidation_metrics['avg_liquidation_time_days'] = float(
            liquidation_metrics['avg_liquidation_time']) / (24 * 60 * 60) if liquidation_metrics['avg_liquidation_time'] else 0

    # 10. Top Schools by Liquidation Speed - NEW
    top_schools_by_speed = []
    schools_with_liquidations = School.objects.annotate(
        avg_processing_time=Avg(
            Case(
                When(
                    users__requestmanagement__liquidation__status='liquidated',
                    then=ExpressionWrapper(
                        F('users__requestmanagement__liquidation__date_liquidated') -
                        F('users__requestmanagement__liquidation__created_at'),
                        output_field=FloatField()
                    )
                ),
                output_field=FloatField()
            )
        )
    ).filter(avg_processing_time__isnull=False).order_by('avg_processing_time')[:5]

    for school in schools_with_liquidations:
        # Convert seconds to days
        avg_days = school.avg_processing_time / \
            (24 * 60 * 60) if school.avg_processing_time else 0
        top_schools_by_speed.append({
            'schoolId': school.schoolId,
            'schoolName': school.schoolName,
            'avgProcessingDays': float(avg_days)
        })

        # 11. School Document Compliance - NEW
    school_document_compliance = []
    all_schools = School.objects.all()

    for school in all_schools:
        # Get all liquidations for this school
        school_liquidations = LiquidationManagement.objects.filter(
            request__user__school=school
        )

        total_required_docs = 0
        total_uploaded_docs = 0

        for liquidation in school_liquidations:
            # For each liquidation, count required and uploaded documents
            for rp in liquidation.request.requestpriority_set.all():
                required_docs = rp.priority.requirements.filter(
                    is_required=True).count()
                uploaded_docs = LiquidationDocument.objects.filter(
                    liquidation=liquidation,
                    request_priority=rp
                ).count()

                total_required_docs += required_docs
                # Cap at required
                total_uploaded_docs += min(uploaded_docs, required_docs)

        compliance_rate = (total_uploaded_docs / total_required_docs *
                           100) if total_required_docs > 0 else 0

        school_document_compliance.append({
            'schoolId': school.schoolId,
            'schoolName': school.schoolName,
            'uploadedDocuments': total_uploaded_docs,
            'requiredDocuments': total_required_docs,
            'complianceRate': compliance_rate,
            'pendingDocuments': max(0, total_required_docs - total_uploaded_docs)
        })

    # Sort by compliance rate (descending)
    school_document_compliance.sort(
        key=lambda x: x['complianceRate'], reverse=True)
    # Prepare response data

    response_data = {
        'budgetUtilization': budget_utilization,
        'requestStatusDistribution': request_status_distribution,
        'liquidationTimeline': liquidation_timeline,
        'schoolPerformance': school_performance,
        'categorySpending': category_spending,
        'documentCompliance': document_compliance,
        'topPriorities': top_priorities,
        'activeRequests': active_requests,
        'liquidationMetrics': liquidation_metrics,
        'topSchoolsBySpeed': top_schools_by_speed,
        'schoolDocumentCompliance': school_document_compliance,
    }

    return Response(response_data)
