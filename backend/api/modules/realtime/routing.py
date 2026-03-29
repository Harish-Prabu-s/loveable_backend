from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Fixed: Adding '/?' to the start of all regexes to match absolute paths (/ws/) and relative paths (ws/)
    # This is the industry-standard way to solve 404s when using re_path in Channels.
    
    re_path(r'^/?ws/notifications/(?P<user_id>[\w\-_]+)/?$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'^/?ws/chat/(?P<user_id>[\w\-_]+)/?$', consumers.ChatConsumer.as_asgi()),
    re_path(r'^/?ws/call/(?P<user_id>[\w\-_]+)/?$', consumers.CallConsumer.as_asgi()),
    
    # Critical fix for WebRTC Signaling: Captures alphanumeric room IDs correctly with optional leading slash
    re_path(r'^/?ws/call/room/(?P<room_id>[\w\-_]+)/?$', consumers.CallRoomConsumer.as_asgi()),

    # Diagnostic Catch-all: If none of the above match, log the attempt for path tracing.
    re_path(r'^.*$', consumers.CatchAllConsumer.as_asgi()),
]
