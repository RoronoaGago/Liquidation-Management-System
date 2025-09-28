from django.urls import path
from . import views
from .views import ProtectedView, CustomTokenObtainPairView, batch_update_school_budgets, CustomTokenRefreshView, SchoolDistrictListCreateAPIView, SchoolDistrictRetrieveUpdateDestroyAPIView, archive_school_district, request_otp, verify_otp, resend_otp, schools_with_unliquidated_requests, admin_dashboard, update_e_signature, generate_approved_request_pdf, initiate_backup, initiate_restore, list_backups, liquidation_report, budget_allocation_status, schools_without_budget_allocation, create_yearly_budget_allocations, yearly_budget_allocations, check_budget_allocation_notification, acknowledge_budget_allocation_notification, unliquidated_requests_from_previous_year, schools_with_budget_info


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
    path('auth/request-otp/', views.request_otp, name='request-otp'),
    path('auth/verify-otp/', views.verify_otp, name='verify-otp'),
    path('request-otp/', request_otp, name='request-otp'),
    path('verify-otp/', verify_otp, name='verify-otp'),
    path('resend-otp/', resend_otp, name='resend-otp'),
    path("users/update-e-signature/",
         update_e_signature, name="update-e-signature"),
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
    path('requests/next-available-month/',
         views.get_next_available_month, name='next-available-month'),
    path('requests/check-eligibility/', views.check_request_eligibility,
         name='check-request-eligibility'),
    path('debug/liquidation-times/', views.debug_liquidation_times,
         name='debug-liquidation-times'),

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

    # Budget Allocation URLs
    path('budget-allocation/status/', budget_allocation_status, name='budget-allocation-status'),
    path('budget-allocation/schools-without/', schools_without_budget_allocation, name='schools-without-budget-allocation'),
    path('budget-allocation/create/', create_yearly_budget_allocations, name='create-yearly-budget-allocations'),
    path('budget-allocation/list/', yearly_budget_allocations, name='yearly-budget-allocations'),
    path('budget-allocation/check-notification/', check_budget_allocation_notification, name='check-budget-allocation-notification'),
    path('budget-allocation/acknowledge-notification/', acknowledge_budget_allocation_notification, name='acknowledge-budget-allocation-notification'),
    path('budget-allocation/unliquidated-requests/', unliquidated_requests_from_previous_year, name='unliquidated-requests-previous-year'),
    path('schools-with-budget-info/', schools_with_budget_info, name='schools-with-budget-info'),

]
