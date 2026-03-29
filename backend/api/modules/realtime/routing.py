from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Robust pattern matching for user-specific channels
    re_path(r'^ws/notifications/(?P<user_id>[\w\-_]+)/?$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'^ws/chat/(?P<user_id>[\w\-_]+)/?$', consumers.ChatConsumer.as_asgi()),
    re_path(r'^ws/call/(?P<user_id>[\w\-_]+)/?$', consumers.CallConsumer.as_asgi()),
    
    # Catch-all for room-based calling (captures alphanumeric room IDs)
    re_path(r'^ws/call/room/(?P<room_id>[\w\-_]+)/?$', consumers.CallRoomConsumer.as_asgi()),

    # Diagnostic Catch-all: If none of the above match, log the attempt.
    re_path(r'^.*$', consumers.CatchAllConsumer.as_asgi()),
]
