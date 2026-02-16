from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...serializers import RoomSerializer, MessageSerializer
from .services import get_or_create_room, list_my_rooms, list_messages, send_message, presence_status, mark_room_status

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_room_view(request):
    receiver_id = request.data.get('receiver_id')
    call_type = request.data.get('call_type', 'audio')
    if not receiver_id:
        return Response({'error': 'receiver_id required'}, status=400)
    room = get_or_create_room(request.user, int(receiver_id), call_type)
    return Response(RoomSerializer(room).data, status=201)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def my_rooms_view(request):
    qs = list_my_rooms(request.user)
    return Response(RoomSerializer(qs, many=True).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messages_view(request, room_id: int):
    qs = list_messages(room_id)
    return Response(MessageSerializer(qs, many=True).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message_view(request, room_id: int):
    content = request.data.get('content')
    msg_type = request.data.get('type', 'text')
    media_url = request.data.get('media_url')
    duration_seconds = int(request.data.get('duration_seconds', 0))
    if not content and not media_url:
        return Response({'error': 'content required'}, status=400)
    msg = send_message(room_id, request.user, content or '', msg_type, media_url, duration_seconds)
    return Response(MessageSerializer(msg).data, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def start_call_view(request, room_id: int):
    room = mark_room_status(room_id, 'active')
    if not room:
        return Response({'error': 'not_found'}, status=404)
    if room.caller != request.user and room.receiver != request.user:
        return Response({'error': 'forbidden'}, status=403)
    return Response(RoomSerializer(room).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_call_view(request, room_id: int):
    duration_seconds = int(request.data.get('duration_seconds', 0))
    coins_spent = int(request.data.get('coins_spent', 0))
    room = mark_room_status(room_id, 'ended', duration_seconds, coins_spent)
    if not room:
        return Response({'error': 'not_found'}, status=404)
    if room.caller != request.user and room.receiver != request.user:
        return Response({'error': 'forbidden'}, status=403)
    return Response(RoomSerializer(room).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def presence_view(request, user_id: int):
    status = presence_status(user_id)
    return Response({'status': status})
