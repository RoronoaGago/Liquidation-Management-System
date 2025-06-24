from django.urls import path
from . import views
from .views import ProtectedView, CustomTokenObtainPairView
from rest_framework_simplejwt.views import (
    TokenObtainPairView,
    TokenRefreshView,
)


urlpatterns = [
    # User URLs
    path("users/", views.user_list, name="user-list"),
    path("users/<int:pk>/", views.user_detail, name="user-detail"),
    path('token/', CustomTokenObtainPairView.as_view(),
         name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('protected/', ProtectedView.as_view(), name='protected'),

    path('schools/', views.SchoolListCreateAPIView.as_view(),
         name='school-list-create'),
    path('schools/search/', views.search_schools, name='school-search'),
    path('schools/<str:schoolId>/',
         views.SchoolRetrieveUpdateDestroyAPIView.as_view(), name='school-detail'),

    path('requirements/', views.RequirementListCreateAPIView.as_view(),
         name='requirement-list-create'),
    path('requirements/<int:requirementID>/',
         views.RequirementRetrieveUpdateDestroyAPIView.as_view(), name='requirement-detail'),

    path('priorities/', views.ListOfPriorityListCreateAPIView.as_view(),
         name='priority-list-create'),
    path('priorities/<int:LOPID>/',
         views.ListOfPriorityRetrieveUpdateDestroyAPIView.as_view(), name='priority-detail'),

    path('requests/', views.RequestManagementListCreateView.as_view(),
         name='request-list'),

    path('requests/<str:request_id>/',
         views.RequestManagementRetrieveUpdateDestroyAPIView.as_view(), name='request-detail'),
    path('requests/<str:request_id>/submit-liquidation/',
         views.submit_for_liquidation, name='submit-liquidation'),
    path('check-pending-requests/', views.check_pending_requests,
         name='check-pending-requests'),

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
]
