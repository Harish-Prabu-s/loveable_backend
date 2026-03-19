from typing import Optional
from django.contrib.auth.models import User
from django.db.models import F
from django.db import models
from django.utils import timezone
from datetime import timedelta
from ...models import Room, Message, Streak

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
    return Room.objects.filter(is_archived=False).filter(models.Q(caller=user) | models.Q(receiver=user)).order_by('-created_at')

def list_messages(room_id: int):
    room = Room.objects.get(id=room_id)
    now = timezone.now()

    # Expire messages that have passed expires_at
    Message.objects.filter(room_id=room_id, expires_at__lt=now).delete()

    return Message.objects.filter(room_id=room_id).order_by('created_at')

def mark_messages_seen(room_id: int, user: User):
    room = Room.objects.get(id=room_id)
    # Mark messages not sent by standard user as seen if they aren't already
    unseen_msgs = Message.objects.filter(room_id=room_id, is_seen=False).exclude(sender=user)
    
    if room.disappearing_messages_enabled and room.disappearing_timer > 0:
        expiry_time = timezone.now() + timedelta(seconds=room.disappearing_timer)
        unseen_msgs.update(is_seen=True, expires_at=expiry_time)
    else:
        unseen_msgs.update(is_seen=True)
        
    # Notify sender that their messages were read
    other_user = room.caller if room.receiver == user else room.receiver
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f'user_{other_user.id}',
            {
                'type': 'user_notification',
                'content': {
                    'type': 'messages_seen',
                    'room_id': room.id
                }
            }
        )

def send_message(
    room_id: int,
    sender: User,
    content: str,
    msg_type: str = 'text',
    media_url: Optional[str] = None,
    duration_seconds: int = 0,
) -> Message:
    room = Room.objects.get(id=room_id)
    other_user = room.receiver if room.caller == sender else room.caller

    # Update Streak logic
    update_streak(sender, other_user)

    msg = Message.objects.create(
        room_id=room_id,
        sender=sender,
        content=content,
        type=msg_type,
        media_url=media_url,
        duration_seconds=duration_seconds,
    )
    
    # Notify Receiver in Real-Time
    from channels.layers import get_channel_layer
    from asgiref.sync import async_to_sync
    from ...serializers import MessageSerializer
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f'user_{other_user.id}',
            {
                'type': 'user_notification',
                'content': {
                    'type': 'new_message',
                    'message': MessageSerializer(msg).data
                }
            }
        )
    
    # Push Notification
    from ..notifications.push_service import send_push_notification, _get_user_tokens
    tokens = _get_user_tokens(other_user.id)
    if tokens:
        profile = getattr(sender, 'profile', None)
        sender_name = profile.display_name if profile else sender.username
        send_push_notification(
            tokens, 
            title=f"New message from {sender_name}", 
            body=content[:50] + ("..." if len(content) > 50 else ""),
            data={'type': 'chat_message', 'sender_id': sender.id}
        )
        
    return msg

def update_streak(user1: User, user2: User):
    # Ensure consistent ordering for unique constraint
    u1, u2 = (user1, user2) if user1.id < user2.id else (user2, user1)
    
    streak, created = Streak.objects.get_or_create(user1=u1, user2=u2)
    now = timezone.now()

    if created or not streak.last_interaction_date:
        streak.streak_count = 1
        streak.last_interaction_date = now
    else:
        # Check if they already interacted today
        delta = now - streak.last_interaction_date
        
        if delta.days == 0 and now.date() == streak.last_interaction_date.date():
            # Interacted today already, do nothing
            pass
        elif delta.days == 1 or (delta.days == 0 and now.date() > streak.last_interaction_date.date()):
            # Interacted next day, increment streak
            streak.streak_count += 1
            streak.last_interaction_date = now
        else:
            # Over 1 day missed
            if streak.freezes_available > 0:
                streak.freezes_available -= 1
                streak.last_interaction_date = now
            else:
                streak.streak_count = 1 # Reset
                streak.last_interaction_date = now
    streak.save()

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

def archive_room(room_id: int, user: User):
    """Archive a chat room."""
    try:
        room = Room.objects.get(id=room_id)
        if room.caller != user and room.receiver != user:
            return False
        room.is_archived = True
        room.save(update_fields=['is_archived'])
        return True
    except Room.DoesNotExist:
        return False

def unarchive_room(room_id: int, user: User):
    """Unarchive a chat room."""
    try:
        room = Room.objects.get(id=room_id)
        if room.caller != user and room.receiver != user:
            return False
        room.is_archived = False
        room.save(update_fields=['is_archived'])
        return True
    except Room.DoesNotExist:
        return False
