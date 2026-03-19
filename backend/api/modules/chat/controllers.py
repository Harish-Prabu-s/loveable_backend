from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...serializers import RoomSerializer, MessageSerializer, ContactSerializer, StreakSerializer
from .services import get_or_create_room, list_my_rooms, list_messages, send_message, presence_status, mark_room_status, mark_messages_seen
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
def mark_seen_view(request, room_id: int):
    mark_messages_seen(room_id, request.user)
    return Response({'status': 'ok'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_disappearing_view(request, room_id: int):
    from ...models import Room
    room = Room.objects.get(id=room_id)
    if room.caller != request.user and room.receiver != request.user:
        return Response({'error': 'forbidden'}, status=403)
    
    enabled = request.data.get('enabled', False)
    timer = int(request.data.get('timer', 0))
    
    room.disappearing_messages_enabled = enabled
    room.disappearing_timer = timer
    room.save()
    
    return Response(RoomSerializer(room).data)

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

        # Attach Streak Info
        from ...models import Streak
        u1, u2 = (user, other_user) if user.id < other_user.id else (other_user, user)
        streak = Streak.objects.filter(user1=u1, user2=u2).first()
        if streak:
            other_user.streak_count = streak.streak_count
            other_user.streak_last_interaction = streak.last_interaction_date
        else:
            other_user.streak_count = 0
            other_user.streak_last_interaction = None
        
        contacts_data.append(other_user)
        
    return Response(ContactSerializer(contacts_data, many=True, context={'request': request}).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def streak_leaderboard_view(request):
    from ...models import Streak
    from django.db.models import Q
    user = request.user
    
    # Get top 50 streaks overall where the streak count > 0
    # or per the user's friends, but let's just do global top streaks
    streaks = Streak.objects.filter(streak_count__gte=1).order_by('-streak_count')[:50]
    
    data = []
    for streak in streaks:
        user1 = streak.user1
        user2 = streak.user2
        data.append({
            'streak_count': streak.streak_count,
            'last_interaction_date': streak.last_interaction_date,
            'user1': {
                'id': user1.id,
                'username': user1.username,
                'display_name': getattr(user1.profile, 'display_name', user1.username),
                'photo': user1.profile.photo.url if user1.profile.photo else None,
            },
            'user2': {
                'id': user2.id,
                'username': user2.username,
                'display_name': getattr(user2.profile, 'display_name', user2.username),
                'photo': user2.profile.photo.url if user2.profile.photo else None,
            }
        })
    return Response(data)
