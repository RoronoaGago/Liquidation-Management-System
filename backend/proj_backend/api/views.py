from urllib import request
from rest_framework.permissions import IsAuthenticated
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
from .models import User, School, Requirement, ListOfPriority, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument, Notification, LiquidationPriority
from .serializers import UserSerializer, SchoolSerializer, RequirementSerializer, ListOfPrioritySerializer, RequestManagementSerializer, LiquidationManagementSerializer, LiquidationDocumentSerializer, RequestPrioritySerializer, NotificationSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging
from django.db import transaction
from rest_framework.pagination import PageNumberPagination
import string
from django.utils.crypto import get_random_string

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

        queryset = User.objects.exclude(id=request.user.id)
        # Archive filter
        if not show_archived:
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
                Q(username__icontains=search_term) |
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
        sensitive_fields = ['email', 'password', 'username', 'role']
        needs_new_token = any(
            field in request.data for field in sensitive_fields)

        serializer.save()

        response_data = serializer.data

        # Generate new token if needed
        if needs_new_token:
            refresh = RefreshToken.for_user(user)
            refresh['first_name'] = user.first_name
            refresh['last_name'] = user.last_name
            refresh['username'] = user.username
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
        queryset = School.objects.all()
        search_term = self.request.query_params.get('search', None)
        legislative_district = self.request.query_params.get(
            'legislative_district', None)
        municipality = self.request.query_params.get('municipality', None)
        district = self.request.query_params.get('district', None)
        archived = self.request.query_params.get(
            'archived', 'false').lower() == 'true'

        # Archive filter
        if not archived:
            queryset = queryset.filter(is_active=True)
        else:
            queryset = queryset.filter(is_active=False)

        if search_term:
            queryset = queryset.filter(
                Q(schoolName__icontains=search_term) |
                Q(district__icontains=search_term) |
                Q(municipality__icontains=search_term)
            )
        if legislative_district:
            queryset = queryset.filter(
                legislativeDistrict=legislative_district)
        if municipality:
            queryset = queryset.filter(municipality=municipality)
        if district:
            queryset = queryset.filter(district=district)
        return queryset.order_by('schoolName')

    def create(self, request, *args, **kwargs):
        # Support both batch and single creation
        is_many = isinstance(request.data, list)
        data = request.data if is_many else [request.data]

        # Validate max_budget for each item
        for item in data:
            max_budget = item.get('max_budget')
            if max_budget is not None and float(max_budget) < 0:
                return Response(
                    {"error": "Budget must be a positive number"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        serializer = self.get_serializer(data=request.data, many=is_many)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
# Add a new endpoint for school search


@api_view(['GET'])
def search_schools(request):
    search_term = request.query_params.get('search', '')
    schools = School.objects.filter(
        Q(schoolName__icontains=search_term) |
        Q(district__icontains=search_term) |
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
        archived = self.request.query_params.get(
            'archived', 'false').lower() == 'true'
        if archived:
            queryset = queryset.filter(is_active=False)
        else:
            queryset = queryset.filter(is_active=True)
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(requirementTitle__icontains=search_term)
        return queryset

    def create(self, request, *args, **kwargs):
        # Check if request.data is a list (batch)
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

        # Filter by status if provided
        if status_param := self.request.query_params.get('status'):
            queryset = queryset.filter(status=status_param)

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
            return LiquidationManagement.objects.filter(status='approved_district')
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
        partial = kwargs.pop('partial', False)
        data = request.data.copy()

        # If approving at district level, set reviewed_by_district
        if data.get("status") == "approved_district":
            data["reviewed_by_district"] = request.user.id
            data["reviewed_at_district"] = timezone.now()

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

            # First update the request status to 'downloaded' to satisfy LiquidationManagement validation
            request_obj._status_changed_by = request.user  # <-- Add this line
            request_obj.status = 'downloaded'
            request_obj.downloaded_at = timezone.now()  # Explicitly set the timestamp
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

            # --- Notification logic ---
            # from .models import Notification
            # Notification.objects.create(
            #     notification_title="Request for Liquidation",
            #     details="Your request has been submitted for liquidation.",
            #     receiver=request_obj.user,
            #     sender=request.user,
            # )
            # --- End notification logic ---

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
    except Exception as e:
        logger.error(
            f"Error submitting for liquidation: {str(e)}", exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred during liquidation submission'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
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
        return LiquidationManagement.objects.filter(
            request__user=self.request.user
        ).order_by('-created_at')


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
@permission_classes([AllowAny])
def batch_update_school_budgets(request):
    logger.debug(f"Incoming data: {request.data}")
    updates = request.data.get("updates", [])

    if not isinstance(updates, list):
        return Response({"error": "Invalid data format."}, status=400)

    updated_ids = []
    errors = []

    with transaction.atomic():
        for upd in updates:

            school_id = str(upd.get("schoolId")).strip()
            max_budget = upd.get("max_budget")

            logger.debug(f"Processing school ID: {school_id}")

            try:
                # Add debug logging before query
                logger.debug(f"Looking for school with ID: {school_id}")
                logger.debug(
                    f"Existing school IDs: {list(School.objects.values_list('schoolId', flat=True)[:10])}")

                school = School.objects.get(schoolId=school_id)

                if max_budget is not None and float(max_budget) >= 0:
                    # Debug log
                    logger.debug(
                        f"Updating school {school_id} budget from {school.max_budget} to {max_budget}")
                    school.max_budget = float(max_budget)
                    school.save()
                    updated_ids.append(school_id)
                else:
                    errors.append(
                        {"schoolId": school_id, "error": "Invalid budget"})
            except School.DoesNotExist:
                logger.warning(f"School not found: {school_id}")
                errors.append(
                    {"schoolId": school_id, "error": "School not found"})
            except Exception as e:
                logger.error(f"Error processing school {school_id}: {str(e)}")
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
