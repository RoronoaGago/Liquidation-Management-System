from django.urls import path
from . import views
from .views import ProtectedView, CustomTokenObtainPairView, batch_update_school_budgets, CustomTokenRefreshView, SchoolDistrictListCreateAPIView, SchoolDistrictRetrieveUpdateDestroyAPIView, archive_school_district
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    # User URLs
    path('requests/', views.RequestManagementListCreateView.as_view(),
         name='request-list'),
    path("users/", views.user_list, name="user-list"),
    path("users/<int:pk>/", views.user_detail, name="user-detail"),
    path('token/', CustomTokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('token/refresh/', CustomTokenRefreshView.as_view(),
         name='token_refresh'),  # Updated
    path('change-password/', views.change_password, name='change-password'),
    path('protected/', ProtectedView.as_view(), name='protected'),

    path('schools/', views.SchoolListCreateAPIView.as_view(),
         name='school-list-create'),
    path('schools/search/', views.search_schools, name='school-search'),
    path('schools/batch_update/', batch_update_school_budgets,
         name='schools-batch-update'),
    path('schools/<str:schoolId>/',
         views.SchoolRetrieveUpdateDestroyAPIView.as_view(), name='school-detail'),
    path('legislative-districts/', views.legislative_districts,
         name='legislative-districts'),

    path('requirements/', views.RequirementListCreateAPIView.as_view(),
         name='requirement-list-create'),
    path('requirements/<int:requirementID>/',
         views.RequirementRetrieveUpdateDestroyAPIView.as_view(), name='requirement-detail'),

    path('priorities/', views.ListOfPriorityListCreateAPIView.as_view(),
         name='priority-list-create'),
    path('priorities/<int:LOPID>/',
         views.ListOfPriorityRetrieveUpdateDestroyAPIView.as_view(), name='priority-detail'),

    path('requests/<str:request_id>/',
         views.RequestManagementRetrieveUpdateDestroyAPIView.as_view(), name='request-detail'),
    path('requests/<str:request_id>/submit-liquidation/',
         views.submit_for_liquidation, name='submit-for-liquidation'),
    path('check-pending-requests/', views.check_pending_requests,
         name='check-pending-requests'),
    path('requests/<str:request_id>/resubmit/',
         views.resubmit_request, name='resubmit-request'),
    # In urls.py
    path('requests/<str:pk>/approve/',
         views.ApproveRequestView.as_view(), name='approve-request'),
    path('requests/<str:pk>/reject/',
         views.RejectRequestView.as_view(), name='reject-request'),
    # Liquidation Management URLs
    path('liquidations/', views.LiquidationManagementListCreateAPIView.as_view(),
         name='liquidation-list-create'),
    path('liquidations/<str:LiquidationID>/',
         views.LiquidationManagementRetrieveUpdateDestroyAPIView.as_view(), name='liquidation-detail'),
    path('liquidations/<str:LiquidationID>/submit/',
         views.submit_liquidation, name='submit-liquidation'),
    path('liquidations/<str:LiquidationID>/documents/',
         views.LiquidationDocumentListCreateAPIView.as_view(), name='liquidation-document-list'),
    path('liquidations/<str:LiquidationID>/documents/<int:pk>/',
         views.LiquidationDocumentRetrieveUpdateDestroyAPIView.as_view(), name='liquidation-document-detail'),
    path('liquidations/<str:LiquidationID>/approve/',
         views.approve_liquidation, name='approve-liquidation'),

    # Additional custom endpoints
    path('user-requests/', views.UserRequestListAPIView.as_view(),
         name='user-requests'),
    path('liquidation/', views.UserLiquidationsAPIView.as_view(),
         name='liquidation'),
    path('notifications/', views.NotificationListAPIView.as_view(),
         name='notification-list'),
    path('notifications/<int:pk>/read/',
         views.MarkNotificationAsReadAPIView.as_view(), name='mark-notification-read'),
    path("users/me/", views.user_me, name="user-me"),
    path('division-signatories/', views.division_signatories,
         name='division-signatories'),

    # Path for recording the history cchanges of hte request and liquidation management
    path('requests/<str:request_id>/history/',
         views.request_history, name='request-history'),
    path('liquidations/<str:LiquidationID>/history/',
         views.liquidation_management_history, name='liquidation-history'),
     path('school-districts/', SchoolDistrictListCreateAPIView.as_view(), name='school-district-list-create'),
    path('school-districts/<str:districtId>/', SchoolDistrictRetrieveUpdateDestroyAPIView.as_view(), name='school-district-detail'),
    path('school-districts/<str:districtId>/archive/', archive_school_district, name='school-district-archive'),
]
