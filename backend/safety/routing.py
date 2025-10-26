from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Maps the 'ws/safety/' URL to the SafetyConsumer
    # This URL will be accessed like: ws://localhost:8000/ws/safety/
    re_path(r'ws/safety/$', consumers.SafetyConsumer.as_asgi()), 
]
