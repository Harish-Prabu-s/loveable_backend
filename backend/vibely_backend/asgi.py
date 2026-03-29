import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from api.modules.realtime.middleware import JWTAuthMiddlewareStack
import api.modules.realtime.routing
import api.modules.games.routing
from api.modules.realtime.consumers import CatchAllConsumer
from django.urls import re_path

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vibely_backend.settings')

class WebSocketTraceMiddleware:
    def __init__(self, inner):
        self.inner = inner
    async def __call__(self, scope, receive, send):
        if scope['type'] == 'websocket':
            path = scope.get('path', 'unknown')
            # Extract headers for tracing
            headers = {k.decode(): v.decode() for k, v in scope.get('headers', [])}
            print(f"[WS TRACE] New connection attempt at path: {path}")
            print(f"[WS TRACE] Headers: {headers}")
        return await self.inner(scope, receive, send)

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": WebSocketTraceMiddleware(
        JWTAuthMiddlewareStack(
            URLRouter(
                api.modules.realtime.routing.websocket_urlpatterns +
                api.modules.games.routing.websocket_urlpatterns +
                [re_path(r'^.*$', CatchAllConsumer.as_asgi())]
            )
        )
    ),
})

