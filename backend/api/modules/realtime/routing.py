from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Fixed: Adding '/?' to the start of all regexes to match absolute paths (/ws/) and relative paths (ws/)
    # This is the industry-standard way to solve 404s when using re_path in Channels.
    
    re_path(r'^/?ws/notifications/(?P<user_id>[\w\-_]+)/?$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'^/?ws/chat/(?P<user_id>[\w\-_]+)/?$', consumers.ChatConsumer.as_asgi()),
    re_path(r'^/?ws/call/(?P<user_id>[\w\-_]+)/?$', consumers.CallConsumer.as_asgi()),
    
    # Final fix for WebRTC Signaling: Captures any non-slash room ID sequence with optional leading slash
    re_path(r'^/?ws/call/room/(?P<room_id>[^/]+)/?$', consumers.CallRoomConsumer.as_asgi()),
]
