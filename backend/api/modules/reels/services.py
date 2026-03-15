from ...models import Reel, ReelLike, ReelComment, User, Message
from ..chat.services import get_or_create_room

def list_reels(limit: int = 50):
    return Reel.objects.select_related('user__profile').order_by('-created_at')[:limit]

def create_reel(user, video_url: str, caption: str = ''):
    return Reel.objects.create(user=user, video_url=video_url, caption=caption)

def toggle_reel_like(reel_id: int, user: User):
    try:
        reel = Reel.objects.get(pk=reel_id)
        like, created = ReelLike.objects.get_or_create(reel=reel, user=user)
        if not created:
            like.delete()
            return {'liked': False, 'likes_count': reel.likes.count()}
        
        # Success notification logic can remain in controller or be triggered here
        # For simplicity and to match other modules, we'll return the state
        return {'liked': True, 'likes_count': reel.likes.count(), 'reel': reel}
    except Reel.DoesNotExist:
        return None

def add_reel_comment(reel_id: int, user: User, text: str):
    try:
        reel = Reel.objects.get(pk=reel_id)
        comment = ReelComment.objects.create(reel=reel, user=user, text=text)
        return comment
    except Reel.DoesNotExist:
        return None

def get_reel_comments(reel_id: int):
    try:
        reel = Reel.objects.get(pk=reel_id)
        return reel.comments.all().select_related('user__profile').order_by('-created_at')
    except Reel.DoesNotExist:
        return None

def share_reel_to_chat(reel_id: int, sender: User, target_user_id: int):
    try:
        reel = Reel.objects.get(pk=reel_id)
        target_user = User.objects.get(pk=target_user_id)
        
        room = get_or_create_room(sender, target_user.id, 'audio')
        
        message = Message.objects.create(
            room=room,
            sender=sender,
            content=f"[REEL_SHARE:{reel.id}]",
            type='reel_share'
        )
        return {'success': True, 'target_user': target_user, 'reel': reel}
    except (Reel.DoesNotExist, User.DoesNotExist):
        return None

def delete_reel_service(reel_id: int, user: User):
    try:
        reel = Reel.objects.get(pk=reel_id)
        if reel.user != user:
            return {'error': 'permission denied', 'status': 403}
        
        if reel.video_url:
            reel.video_url.delete(save=False)
            
        reel.delete()
        return {'success': True}
    except Reel.DoesNotExist:
        return {'error': 'reel not found', 'status': 404}
