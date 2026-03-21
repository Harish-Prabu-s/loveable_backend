from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/notifications/<int:user_id>/', consumers.NotificationConsumer.as_asgi()),
    path('ws/chat/<int:user_id>/', consumers.ChatConsumer.as_asgi()),
    path('ws/call/<int:user_id>/', consumers.CallConsumer.as_asgi()),
    path('ws/call/room/<int:room_id>/', consumers.CallRoomConsumer.as_asgi()),
]
