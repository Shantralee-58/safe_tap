from django.urls import re_path
from . import consumers

# Defines the paths for WebSocket connections
websocket_urlpatterns = [
    # Maps the 'ws/chat/' URL to the ChatConsumer
    # This URL will be accessed like: ws://localhost:8000/ws/chat/
    re_path(r'ws/chat/$', consumers.ChatConsumer.as_asgi()), 
]
