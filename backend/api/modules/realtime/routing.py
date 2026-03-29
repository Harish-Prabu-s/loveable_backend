from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Using re_path for robust pattern matching of alphanumeric IDs and handling trailing slashes
    re_path(r'^ws/notifications/(?P<user_id>\d+)/?$', consumers.NotificationConsumer.as_asgi()),
    re_path(r'^ws/chat/(?P<user_id>\d+)/?$', consumers.ChatConsumer.as_asgi()),
    re_path(r'^ws/call/(?P<user_id>\d+)/?$', consumers.CallConsumer.as_asgi()),
    
    # Critical fix: Capture group for room_id including alphanumeric chars, underscore, and dash.
    re_path(r'^ws/call/room/(?P<room_id>[\w\-_]+)/?$', consumers.CallRoomConsumer.as_asgi()),
]
