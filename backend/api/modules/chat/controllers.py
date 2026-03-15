from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...serializers import RoomSerializer, MessageSerializer, ContactSerializer
from .services import get_or_create_room, list_my_rooms, list_messages, send_message, presence_status, mark_room_status
from django.db.models import Q, Max
from django.contrib.auth.models import User

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
    
    # Send push notification to the other person in the room
    recipient = msg.room.caller if msg.room.receiver == request.user else msg.room.receiver
    from ..notifications.push_service import send_push_notification, _get_user_tokens
    tokens = _get_user_tokens(recipient.id)
    profile = getattr(request.user, 'profile', None)
    sender_name = profile.display_name if profile else request.user.username
    if tokens:
        send_push_notification(
            tokens, 
            title=f"Message from {sender_name}", 
            body=content[:50] + "..." if content and len(content) > 50 else (content or "Sent a file"),
            data={'type': 'chat_message', 'room_id': room_id, 'sender_id': request.user.id}
        )

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

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def contact_list_view(request):
    from ...models import Room, Message
    user = request.user
    
    # Get all rooms where user is caller or receiver
    rooms = Room.objects.filter(Q(caller=user) | Q(receiver=user)).prefetch_related('messages')
    
    contacts_data = []
    seen_users = set()
    
    # Sort rooms by latest message
    rooms = rooms.annotate(last_msg_time=Max('messages__created_at')).filter(last_msg_time__isnull=False).order_by('-last_msg_time')
    
    for room in rooms:
        other_user = room.receiver if room.caller == user else room.caller
        if other_user.id in seen_users:
            continue
            
        last_msg = room.messages.order_by('-created_at').first()
        if not last_msg:
            continue
            
        seen_users.add(other_user.id)
        
        # We'll attach the last message info to the user object for the serializer
        other_user.last_message = last_msg.content
        other_user.last_message_type = last_msg.type
        other_user.last_timestamp = last_msg.created_at
        
        contacts_data.append(other_user)
        
    return Response(ContactSerializer(contacts_data, many=True, context={'request': request}).data)
