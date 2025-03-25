from django.urls import path
from . import views
from django.views.decorators.csrf import csrf_exempt

urlpatterns = [
    # Landing page
    path('', views.index, name='index'),  

    # User Registration and JWT Token Generation
    path('dashboard/register/', views.register_view, name='register'),
    path('token/', views.ObtainTokenPairView.as_view(), name='token_obtain_pair'),

    path('dashboard/login/', views.login_view, name='login'),  # Login
    path('dashboard/logout/', views.logout_view, name='logout'),  # Logout


    # User-Specific Dashboard (Must come before generic dashboard)
    path('dashboard/<str:username>/', views.user_dashboard, name='user_dashboard'),  

    # File Upload and Secure File Access
    path('file/<int:file_id>/', views.serve_file, name='serve_file'),

    # Delete file
    path('delete-file/<int:file_id>/', views.delete_file_view, name='delete_file'),

    # Chatbot API Endpoint
    path('dashboard/chatbot/', views.chatbot_response, name='chatbot_response'),

]




