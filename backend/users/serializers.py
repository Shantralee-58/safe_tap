from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth import authenticate
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from users.models import CustomUser, EmergencyContact

# --- Custom Fields and Validation ---

class EmergencyContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = EmergencyContact
        fields = ['name', 'contact_phone', 'is_guardian']

# --- Registration Serializer ---

class RegistrationSerializer(serializers.ModelSerializer):
    # Field to validate the password
    password2 = serializers.CharField(style={'input_type': 'password'}, write_only=True)
    
    # Nested serializer for handling emergency contacts during registration
    emergency_contacts = EmergencyContactSerializer(many=True, required=False)

    class Meta:
        model = CustomUser
        # Fields for user data
        fields = ['username', 'email', 'first_name', 'last_name', 'phone_number', 'password', 'password2', 'emergency_contacts']
        extra_kwargs = {
            'password': {'write_only': True}
        }

    def validate_email(self, value):
        # Ensure email is unique
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("This email is already in use.")
        return value

    def validate(self, data):
        # Validate that password and password2 match
        if data['password'] != data['password2']:
            raise serializers.ValidationError({"password": "Passwords must match."})
        
        # Validate the strength of the password
        validate_password(data['password'])

        return data

    def create(self, validated_data):
        # Pop emergency contacts data to handle separately
        contacts_data = validated_data.pop('emergency_contacts', [])
        validated_data.pop('password2') # Remove confirmation field
        
        # Create the CustomUser instance
        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            first_name=validated_data.get('first_name', ''),
            last_name=validated_data.get('last_name', ''),
            phone_number=validated_data.get('phone_number', ''),
            password=validated_data['password']
        )
        
        # Create EmergencyContact instances
        for contact_data in contacts_data:
            EmergencyContact.objects.create(user=user, **contact_data)

        return user

# --- Login Serializer (using JWT) ---

class LoginSerializer(TokenObtainPairSerializer):
    """
    Custom serializer for JWT authentication. 
    It ensures the user is active before generating tokens.
    """
    @classmethod
    def get_token(cls, user):
        # Customize the payload with user data if needed
        token = super().get_token(user)
        token['username'] = user.username
        token['email'] = user.email
        return token
