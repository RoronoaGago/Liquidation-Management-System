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
from .models import User, School, Requirement, ListOfPriority, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument, LiquidatorAssignment
from .serializers import UserSerializer, SchoolSerializer, RequirementSerializer, ListOfPrioritySerializer, RequestManagementSerializer, LiquidationManagementSerializer, LiquidationDocumentSerializer, RequestPrioritySerializer, LiquidatorAssignmentSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated, AllowAny
import logging
from django.db import transaction
from django.core.exceptions import ValidationError


logger = logging.getLogger(__name__)


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

        queryset = queryset.order_by('-date_joined')
        serializer = UserSerializer(queryset, many=True)
        return Response(serializer.data, status=status.HTTP_200_OK)

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

    def get_queryset(self):
        queryset = School.objects.all()
        search_term = self.request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                Q(schoolName__icontains=search_term) |
                Q(district__icontains=search_term) |
                Q(municipality__icontains=search_term)
            )
        return queryset.order_by('schoolName')

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
        # Automatically set the current user as the request creator
        serializer.save(user=self.request.user)

    def get_queryset(self):
        queryset = RequestManagement.objects.all()

        # Filter by status if provided
        status_param = self.request.query_params.get('status')
        if status_param:
            queryset = queryset.filter(status=status_param)

        # For non-admin users, only show their own requests
        if not self.request.user.role in ['admin', 'superintendent', 'accountant']:
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
        instance = self.get_object()
        if request.user.role not in ['admin', 'superintendent']:
            return Response(
                {"detail": "Only administrators can approve requests"},
                status=status.HTTP_403_FORBIDDEN
            )
        if instance.status != 'pending':
            return Response(
                {"detail": "Only pending requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.status = 'approved'
        instance._status_changed_by = request.user
        instance.save()
        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class RejectRequestView(generics.UpdateAPIView):
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.role not in ['admin', 'superintendent']:
            return Response(
                {"detail": "Only administrators can reject requests"},
                status=status.HTTP_403_FORBIDDEN
            )
        if instance.status != 'pending':
            return Response(
                {"detail": "Only pending requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )
        rejection_comment = request.data.get('rejection_comment')
        if not rejection_comment:
            return Response(
                {"detail": "Please provide a rejection comment"},
                status=status.HTTP_400_BAD_REQUEST
            )
        instance.status = 'rejected'
        instance.rejection_comment = rejection_comment
        instance.rejection_date = timezone.now().date()
        instance._status_changed_by = request.user  # For notification
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class RequestManagementDetailView(generics.RetrieveUpdateDestroyAPIView):
    """
    View for retrieving, updating or deleting a specific request
    """
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'request_id'

    def perform_update(self, serializer):
        instance = self.get_object()

        # Check if user has permission to edit this request
        if instance.user != self.request.user and self.request.user.role not in ['admin', 'superintendent']:
            raise PermissionDenied(
                "You don't have permission to edit this request")

        # Prevent editing if request is already approved/rejected
        if instance.status in ['approved', 'rejected']:
            raise ValidationError(
                "Cannot edit an already approved/rejected request")

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


class ApproveRequestView(generics.UpdateAPIView):
    """
    View for approving a request (admin/superintendent only)
    """
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # Check if user has permission to approve
        if request.user.role not in ['admin', 'superintendent']:
            return Response(
                {"detail": "Only administrators can approve requests"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if request is in pending state
        if instance.status != 'pending':
            return Response(
                {"detail": "Only pending requests can be approved"},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'approved'
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class RejectRequestView(generics.UpdateAPIView):
    """
    View for rejecting a request (admin/superintendent only)
    """
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'pk'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()

        # Check if user has permission to reject
        if request.user.role not in ['admin', 'superintendent']:
            return Response(
                {"detail": "Only administrators can reject requests"},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check if request is in pending state
        if instance.status != 'pending':
            return Response(
                {"detail": "Only pending requests can be rejected"},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Require a rejection reason
        rejection_reason = request.data.get('rejection_reason')
        if not rejection_reason:
            return Response(
                {"detail": "Please provide a rejection reason"},
                status=status.HTTP_400_BAD_REQUEST
            )

        instance.status = 'rejected'
        instance.rejection_reason = rejection_reason
        instance.save()

        serializer = self.get_serializer(instance)
        return Response(serializer.data)


class LiquidationManagementListCreateAPIView(generics.ListCreateAPIView):
    queryset = LiquidationManagement.objects.all()
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        # Only filter for liquidators
        if user.role == 'liquidator':
            assignments = LiquidatorAssignment.objects.filter(liquidator=user)
            # If assigned to 'all', show all liquidations
            if assignments.filter(district='all').exists():
                return LiquidationManagement.objects.all()
            # Otherwise, filter by assigned districts and/or schools
            districts = assignments.exclude(district__isnull=True).exclude(district='').values_list('district', flat=True)
            district_schools = School.objects.filter(district__in=districts)
            # Get schools assigned directly
            school_ids = assignments.exclude(school__isnull=True).exclude(school='').values_list('school', flat=True)
            direct_schools = School.objects.filter(id__in=school_ids)
            # Combine both sets of schools
            all_schools = district_schools | direct_schools
            all_schools = all_schools.distinct()
            return LiquidationManagement.objects.filter(request__user__school__in=all_schools)
        # For other roles, default behavior (e.g., admin sees all)
        return super().get_queryset()


class LiquidationManagementRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = LiquidationManagement.objects.all()
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'LiquidationID'

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        partial = kwargs.pop('partial', False)
        data = request.data.copy()

        # If approving at district level, set reviewed_by_district
        if data.get("status") == "approved_district":
            data["reviewed_by_district"] = request.user.id
            data["reviewed_at_district"] = timezone.now()

        serializer = self.get_serializer(instance, data=data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    def perform_update(self, serializer):
        instance = self.get_object()
        instance._status_changed_by = self.request.user
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
        liquidation.status = 'liquidated'
        liquidation.reviewed_by = request.user
        liquidation.reviewed_at = timezone.now()
        liquidation._status_changed_by = request.user
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
            request_obj.status = 'downloaded'
            request_obj.save(update_fields=['status'])

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
    except Exception as e:
        logger.error(
            f"Error submitting for liquidation: {str(e)}", exc_info=True)
        return Response(
            {'error': 'An unexpected error occurred during liquidation submission'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
def submit_liquidation(request, LiquidationID):
    try:
        liquidation = LiquidationManagement.objects.get(
            LiquidationID=LiquidationID)

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

        # Update status to submitted
        liquidation.status = 'submitted'
        liquidation.save()

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


@api_view(['GET'])
def view_liquidation(request, LiquidationID):
    liquidation = get_object_or_404(
        LiquidationManagement, LiquidationID=LiquidationID)
    serializer = LiquidationManagementSerializer(liquidation)
    return Response(serializer.data)


def approve_liquidation(request, LiquidationID):
    try:
        liquidation = LiquidationManagement.objects.get(
            LiquidationID=LiquidationID)
        if liquidation.status not in ['submitted', 'under_review']:
            return Response(
                {'error': 'Liquidation is not in a reviewable state'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if liquidation.documents.filter(is_approved=False).exists():
            return Response(
                {'error': 'All documents must be approved first'},
                status=status.HTTP_400_BAD_REQUEST
            )

        liquidation.status = 'completed'
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


class LiquidatorAssignmentListCreateAPIView(generics.ListCreateAPIView):
    queryset = LiquidatorAssignment.objects.all()
    serializer_class = LiquidatorAssignmentSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(assigned_by=self.request.user)
