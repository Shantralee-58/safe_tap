from django.urls import path
from .views import RegistrationView, LoginView
# Import views for potential future endpoints like profile or token refresh

urlpatterns = [
    # API endpoint for creating a new user
    path('register/', RegistrationView.as_view(), name='user_register'),
    
    # API endpoint for user login and JWT token generation/retrieval
    path('login/', LoginView.as_view(), name='user_login'),
    
    # You will add other user-related endpoints here (e.g., profile update, password change)
]
