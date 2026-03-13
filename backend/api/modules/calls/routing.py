from django.urls import path
from . import consumers

websocket_urlpatterns = [
    path('ws/call/<int:room_id>/', consumers.CallConsumer.as_asgi()),
    path('ws/user/<int:user_id>/', consumers.UserConsumer.as_asgi()),
]
