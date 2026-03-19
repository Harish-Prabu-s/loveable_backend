from django.urls import re_path
from . import consumers
from .truth_or_dare_consumer import TruthOrDareConsumer

websocket_urlpatterns = [
    re_path(r'ws/game/(?P<room_id>\d+)/$', consumers.GameConsumer.as_asgi()),
    re_path(r'ws/game/truth_or_dare/(?P<room_id>\w+)/$', TruthOrDareConsumer.as_asgi()),
    re_path(r'ws/matchmaking/$', consumers.MatchmakingConsumer.as_asgi()),
]
