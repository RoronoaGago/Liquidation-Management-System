from django.urls import path
from . import views
from .views import ProtectedView, CustomTokenObtainPairView, batch_update_school_budgets, CustomTokenRefreshView, SchoolDistrictListCreateAPIView, SchoolDistrictRetrieveUpdateDestroyAPIView, archive_school_district, schools_with_unliquidated_requests, admin_dashboard, update_e_signature, generate_approved_request_pdf, generate_demand_letter, initiate_backup, initiate_restore, list_backups, liquidation_report, school_head_dashboard, BudgetAllocationListCreateAPIView, BudgetAllocationRetrieveUpdateDestroyAPIView, check_yearly_budget_status, batch_create_budget_allocations, get_first_monday_january_info, update_school_liquidation_dates
from .improved_otp_views import request_otp_secure, verify_otp_secure, resend_otp_secure
from .password_reset_views import request_password_reset_otp, verify_password_reset_otp, reset_password_with_token


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
    path('logout/', views.logout, name='logout'),
    path('change-password/', views.change_password, name='change-password'),
    path('protected/', ProtectedView.as_view(), name='protected'),
    
    # Enhanced Secure OTP Endpoints
    path('request-otp-secure/', request_otp_secure, name='request-otp-secure'),
    path('verify-otp-secure/', verify_otp_secure, name='verify-otp-secure'),
    path('resend-otp-secure/', resend_otp_secure, name='resend-otp-secure'),
    
    # Password Reset Endpoints
    path('forgot-password/', request_password_reset_otp, name='request-password-reset-otp'),
    path('verify-password-reset-otp/', verify_password_reset_otp, name='verify-password-reset-otp'),
    path('reset-password/', reset_password_with_token, name='reset-password-with-token'),
    path("users/update-e-signature/",
         update_e_signature, name="update-e-signature"),
    path('schools/', views.SchoolListCreateAPIView.as_view(),
         name='school-list-create'),
    path('schools/search/', views.search_schools, name='school-search'),
    path('schools/batch_update/', batch_update_school_budgets,
         name='schools-batch-update'),
    path('schools/<str:schoolId>/',
         views.SchoolRetrieveUpdateDestroyAPIView.as_view(), name='school-detail'),
    path('schools/<str:school_id>/liquidation-dates/',
         update_school_liquidation_dates, name='update-school-liquidation-dates'),
    path('legislative-districts/', views.legislative_districts,
         name='legislative-districts'),

    path('requirements/', views.RequirementListCreateAPIView.as_view(),
         name='requirement-list-create'),
    path('requirements/<int:requirementID>/',
         views.RequirementRetrieveUpdateDestroyAPIView.as_view(), name='requirement-detail'),
    path('requests/next-available-month/',
         views.get_next_available_month, name='next-available-month'),
    path('requests/check-eligibility/', views.check_request_eligibility,
         name='check-request-eligibility'),
#     path('debug/liquidation-times/', views.debug_liquidation_times,
     #     name='debug-liquidation-times'),

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
    path('requests/<str:request_id>/generate-demand-letter/', views.generate_demand_letter, name='generate-demand-letter'),
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
    path('documents/<int:document_id>/versions/',
         views.DocumentVersionListAPIView.as_view(), name='document-versions'),
    # Removed approve_liquidation URL - now handled through PATCH on liquidation-detail

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
    path('school-districts/', SchoolDistrictListCreateAPIView.as_view(),
         name='school-district-list-create'),
    path('school-districts/<str:districtId>/',
         SchoolDistrictRetrieveUpdateDestroyAPIView.as_view(), name='school-district-detail'),
    path('school-districts/<str:districtId>/archive/',
         archive_school_district, name='school-district-archive'),
    path('last-liquidated-request/',
         views.last_liquidated_request, name='last_liquidated_request'),

    # Report URLs
    path('reports/unliquidated-schools/', schools_with_unliquidated_requests,
         name='unliquidated-schools-report'),
    path('reports/liquidation/', liquidation_report,
         name='liquidation-report'),
    path('admin-dashboard/', admin_dashboard, name='admin-dashboard'),
    path('liquidations/<str:LiquidationID>/generate-report/',
         views.generate_liquidation_report, name='generate-liquidation-report'),
    path('requests/<str:request_id>/generate-pdf/',
         generate_approved_request_pdf, name='generate-approved-request-pdf'),

    # Backup/Restore
    path('backup/', initiate_backup, name='initiate-backup'),
    path('restore/', initiate_restore, name='initiate-restore'),
    path('backups/', list_backups, name='list-backups'),
    path('audit-logs/', views.AuditLogListView.as_view(), name='audit-logs'),

    path('school-head/dashboard/', school_head_dashboard, name='school-head-dashboard'),

    # Budget Allocation URLs
    path('budget-allocations/', BudgetAllocationListCreateAPIView.as_view(), name='budget-allocation-list-create'),
    path('budget-allocations/<int:pk>/', BudgetAllocationRetrieveUpdateDestroyAPIView.as_view(), name='budget-allocation-detail'),
    path('budget-allocations/batch-create/', batch_create_budget_allocations, name='batch-create-budget-allocations'),
    path('budget-allocations/check-status/', check_yearly_budget_status, name='check-yearly-budget-status'),
    path('budget-allocations/first-monday-info/', get_first_monday_january_info, name='get-first-monday-january-info'),

]
