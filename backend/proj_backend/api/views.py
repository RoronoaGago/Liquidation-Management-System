from .serializers import CustomTokenObtainPairSerializer
from datetime import datetime, timedelta
from rest_framework.decorators import api_view
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework import generics
from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db.models import Q
from .models import User, School, Requirement, ListOfPriority, RequestManagement, RequestPriority, LiquidationManagement, LiquidationDocument
from .serializers import UserSerializer, SchoolSerializer, RequirementSerializer, ListOfPrioritySerializer, RequestManagementSerializer, LiquidationManagementSerializer,LiquidationDocumentSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import IsAuthenticated
import logging

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
    queryset = Requirement.objects.all()
    serializer_class = RequirementSerializer

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
    queryset = ListOfPriority.objects.all()
    serializer_class = ListOfPrioritySerializer

    def create(self, request, *args, **kwargs):
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

class RequestManagementViewSet(viewsets.ModelViewSet):
    queryset = RequestManagement.objects.all()
    serializer_class = RequestManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'liquidator', 'accountant']:
            return self.queryset.all()
        return self.queryset.filter(user=user)

    @action(detail=True, methods=['post'])
    def submit_for_liquidation(self, request, pk=None):
        request_obj = self.get_object()
        if request_obj.status != 'approved':
            return Response(
                {'error': 'Request must be approved before liquidation'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        liquidation, created = LiquidationManagement.objects.get_or_create(
            request=request_obj,
            defaults={'status': 'ongoing'}
        )
        
        if not created:
            return Response(
                {'error': 'Liquidation already exists for this request'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        request_obj.status = 'inliquidated'
        request_obj.save()
        
        serializer = LiquidationManagementSerializer(
            liquidation,
            context={'request': request}
        )
        return Response(serializer.data, status=status.HTTP_201_CREATED)

class LiquidationManagementViewSet(viewsets.ModelViewSet):
    queryset = LiquidationManagement.objects.all()
    serializer_class = LiquidationManagementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role in ['admin', 'liquidator', 'accountant']:
            return self.queryset.all()
        return self.queryset.filter(request__user=user)

    @action(detail=True, methods=['post'])
    def upload_document(self, request, pk=None):
        liquidation = self.get_object()
        request_priority_id = request.data.get('request_priority')
        requirement_id = request.data.get('requirement')
        
        try:
            request_priority = RequestPriority.objects.get(
                pk=request_priority_id,
                request=liquidation.request
            )
            requirement = Requirement.objects.get(pk=requirement_id)
            
            document, created = LiquidationDocument.objects.update_or_create(
                liquidation=liquidation,
                request_priority=request_priority,
                requirement=requirement,
                defaults={
                    'document': request.FILES.get('document'),
                    'uploaded_by': request.user
                }
            )
            
            serializer = LiquidationDocumentSerializer(
                document,
                context={'request': request}
            )
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def review_document(self, request, pk=None):
        liquidation = self.get_object()
        document_id = request.data.get('document_id')
        is_approved = request.data.get('is_approved', False)
        comment = request.data.get('comment', '')
        
        try:
            document = liquidation.documents.get(pk=document_id)
            document.is_approved = is_approved
            document.reviewer_comment = comment
            document.save()
            
            # Check if all documents are approved
            if not liquidation.documents.filter(is_approved=False).exists():
                liquidation.status = 'completed'
                liquidation.reviewed_by = request.user
                liquidation.reviewed_at = timezone.now()
                liquidation.save()
            
            return Response(
                LiquidationManagementSerializer(
                    liquidation,
                    context={'request': request}
                ).data
            )
        
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

class LiquidationDocumentViewSet(viewsets.ModelViewSet):
    queryset = LiquidationDocument.objects.all()
    serializer_class = LiquidationDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        liquidation_id = self.request.query_params.get('liquidation_id')
        if liquidation_id:
            return self.queryset.filter(liquidation_id=liquidation_id)
        return self.queryset.none()