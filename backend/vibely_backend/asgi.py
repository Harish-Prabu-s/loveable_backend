import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from api.modules.realtime.middleware import JWTAuthMiddlewareStack
import api.modules.realtime.routing
import api.modules.games.routing
from api.modules.realtime.consumers import CatchAllConsumer
from django.urls import re_path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vibely_backend.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddlewareStack(
        URLRouter(
            api.modules.realtime.routing.websocket_urlpatterns +
            api.modules.games.routing.websocket_urlpatterns +
            [re_path(r'^.*$', CatchAllConsumer.as_asgi())]
        )
    ),
})

