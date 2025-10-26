from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from .serializers import RegistrationSerializer, LoginSerializer
from rest_framework_simplejwt.views import TokenObtainPairView
from rest_framework.permissions import AllowAny

class RegistrationView(APIView):
    """
    Handles new user registration.
    Maps to POST /api/auth/register/
    """
    permission_classes = [AllowAny]
    
    def post(self, request):
        # Pass the request data to the serializer
        serializer = RegistrationSerializer(data=request.data)
        
        # Validate data and save the new user
        if serializer.is_valid():
            user = serializer.save()
            
            # Optionally, you can log the user in immediately after registration 
            # and return the token, but here we just return success.
            return Response(
                {"message": "User registered successfully."},
                status=status.HTTP_201_CREATED
            )
        
        # Return validation errors if data is invalid
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

class LoginView(TokenObtainPairView):
    """
    Handles user login and returns JWT access and refresh tokens.
    Maps to POST /api/auth/login/
    """
    # TokenObtainPairView already handles the logic for POST requests
    # We override the serializer to use our custom one for better context/messages
    serializer_class = LoginSerializer
    permission_classes = [AllowAny]
