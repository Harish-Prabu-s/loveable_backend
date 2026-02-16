from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from ...serializers import GameSerializer
from .services import list_active_games, get_icebreaker_prompt

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_games_view(request):
    qs = list_active_games()
    return Response(GameSerializer(qs, many=True).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def icebreaker_prompt_view(request, kind: str):
    data = get_icebreaker_prompt(kind)
    return Response(data)
