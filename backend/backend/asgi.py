import os
from channels.auth import AuthMiddlewareStack
from channels.routing import ProtocolTypeRouter, URLRouter
from django.core.asgi import get_asgi_application
import chat.routing # Import your app's routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

# Get Django's ASGI application (HTTP handling)
django_asgi_app = get_asgi_application()

# ProtocolTypeRouter separates requests into HTTP and WebSocket
application = ProtocolTypeRouter({
    "http": django_asgi_app, # Default Django handles all HTTP requests (REST API)
    
    # WebSocket handling using Django Channels
    "websocket": AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns
            safety.routing.websocket_urlpatterns
        )
    ),
})

