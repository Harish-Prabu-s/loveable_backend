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

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_game_room_view(request):
    import uuid
    from api.models import GameRoom, User
    
    room_type = request.data.get('room_type', 'group')
    target_id = request.data.get('target_user_id')
    
    room_code = uuid.uuid4().hex[:8]
    room = GameRoom.objects.create(
        host=request.user,
        room_code=room_code,
        room_type=room_type,
        status='waiting'
    )
    
    # In couple mode, automatically place host and target into the room state if needed,
    # or rely on frontend to connect to WebSocket.
    return Response({'id': room.id, 'room_code': room_code, 'room_type': room.room_type})
