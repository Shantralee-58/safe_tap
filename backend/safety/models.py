from django.db import models
from django.conf import settings

class CurrentLocation(models.Model):
    """Stores the latest known location for a user."""
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, primary_key=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    timestamp = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f'{self.user.email} @ {self.latitude}, {self.longitude}'

class PanicStatus(models.Model):
    """Records an SOS or panic event for a user."""
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='panic_events')
    is_active = models.BooleanField(default=False)
    triggered_at = models.DateTimeField(auto_now_add=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    location_on_trigger = models.CharField(max_length=100, blank=True, null=True) # E.g., 'lat, long' or 'address'

    def __str__(self):
        status = "ACTIVE" if self.is_active else "RESOLVED"
        return f'Panic Status for {self.user.email}: {status}'

