from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    """
    Custom User Model for expanded profile features.
    """
    # The default AbstractUser includes username, email, first_name, last_name, etc.
    phone_number = models.CharField(max_length=20, unique=True, blank=True, null=True)
    is_trusted = models.BooleanField(default=False) # For trusted contacts/authorities

    def __str__(self):
        return self.username

class EmergencyContact(models.Model):
    """
    Emergency contacts associated with a user.
    """
    user = models.ForeignKey(CustomUser, on_delete=models.CASCADE, related_name='emergency_contacts')
    name = models.CharField(max_length=100)
    contact_phone = models.CharField(max_length=20)
    is_guardian = models.BooleanField(default=False)

    class Meta:
        verbose_name_plural = "Emergency Contacts"

    def __str__(self):
        return f"{self.name} ({self.user.username})"

