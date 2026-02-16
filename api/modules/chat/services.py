from typing import Optional
from django.contrib.auth.models import User
from django.utils import timezone
from ...models import Room, Message

def get_or_create_room(caller: User, receiver_id: int, call_type: str) -> Room:
    receiver = User.objects.get(id=receiver_id)
    
    room = Room.objects.filter(
        caller=caller, 
        receiver=receiver, 
        call_type=call_type, 
        status__in=['pending', 'active']
    ).first()
    
    if not room:
        room = Room.objects.filter(
            caller=caller, 
            receiver=receiver, 
            call_type=call_type
        ).order_by('-created_at').first()

    if not room:
        room = Room.objects.create(caller=caller, receiver=receiver, call_type=call_type, status='pending')
        
    return room

def list_my_rooms(user: User):
    return Room.objects.filter(caller=user).union(Room.objects.filter(receiver=user)).order_by('-created_at')

def list_messages(room_id: int):
    return Message.objects.filter(room_id=room_id).order_by('created_at')

def send_message(
    room_id: int,
    sender: User,
    content: str,
    msg_type: str = 'text',
    media_url: Optional[str] = None,
    duration_seconds: int = 0,
) -> Message:
    return Message.objects.create(
        room_id=room_id,
        sender=sender,
        content=content,
        type=msg_type,
        media_url=media_url,
        duration_seconds=duration_seconds,
    )

def mark_room_status(room_id: int, status: str, duration_seconds: int = 0, coins_spent: int = 0):
    room = Room.objects.filter(id=room_id).first()
    if not room:
        return None
    room.status = status
    if status == 'active' and not room.started_at:
        room.started_at = timezone.now()
    if status == 'ended':
        room.ended_at = timezone.now()
        if duration_seconds:
            room.duration_seconds = duration_seconds
        if coins_spent:
            room.coins_spent = coins_spent
    room.save()
    return room

def presence_status(user_id: int) -> str:
    active = Room.objects.filter(receiver_id=user_id, status='active').exists() or Room.objects.filter(caller_id=user_id, status='active').exists()
    return 'busy' if active else 'active'
