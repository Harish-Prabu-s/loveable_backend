import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from api.modules.realtime.middleware import JWTAuthMiddlewareStack
import api.modules.realtime.routing
import api.modules.games.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vibely_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            api.modules.realtime.routing.websocket_urlpatterns +
            api.modules.games.routing.websocket_urlpatterns
        )
    ),
})

