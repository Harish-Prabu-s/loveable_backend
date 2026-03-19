from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from ...models import Streak, StreakUpload, Follow, Notification, StreakComment
from ...serializers import ProfileSerializer
from ..notifications.push_service import send_push_notification, _get_user_tokens

def get_user_streaks_service(user: User, request=None):
    # Get all streaks involving this user
    streaks = Streak.objects.filter(models.Q(user1=user) | models.Q(user2=user)).select_related('user1__profile', 'user2__profile')
    
    result = []
    for s in streaks:
        other_user = s.user2 if s.user1 == user else s.user1
        # skip if no profile
        if not hasattr(other_user, 'profile'):
            continue
        # Get latest active upload (last 24h) from other user
        from django.utils import timezone
        from datetime import timedelta
        day_ago = timezone.now() - timedelta(hours=24)
        latest_upload = StreakUpload.objects.filter(
            models.Q(user=other_user),
            models.Q(created_at__gte=day_ago) & (
                models.Q(visibility='all') |
                (models.Q(visibility='close_friends') & models.Q(user__close_friends__close_friend=user))
            )
        ).order_by('-created_at').first()

        result.append({
            'streak_id': s.id,
            'friend': ProfileSerializer(other_user.profile, context={'request': request}).data,
            'streak_count': s.streak_count,
            'last_interaction_date': s.last_interaction_date,
            'freezes_available': s.freezes_available,
            'latest_upload_id': latest_upload.id if latest_upload else None
        })
    return result

def upload_streak_service(user: User, media, media_type, visibility):
    upload = StreakUpload.objects.create(
        user=user,
        media_url=media,
        media_type=media_type,
        visibility=visibility
    )
    
    # Increment streaks for mutual followers.
    followers = Follow.objects.filter(following=user).values_list('follower_id', flat=True)
    following = Follow.objects.filter(follower=user).values_list('following_id', flat=True)
    mutuals = set(followers).intersection(set(following))
    
    profile = getattr(user, 'profile', None)
    sender_name = profile.display_name if profile else user.username

    now = timezone.now()
    
    for friend_id in mutuals:
        # Get or create streak between user and friend
        s = Streak.objects.filter(
            (models.Q(user1_id=user.id, user2_id=friend_id) | models.Q(user1_id=friend_id, user2_id=user.id))
        ).first()
        
        if not s:
            s = Streak.objects.create(user1_id=user.id, user2_id=friend_id, streak_count=1, last_interaction_date=now)
        else:
            if s.last_interaction_date and s.last_interaction_date.date() < now.date():
                s.streak_count += 1
            s.last_interaction_date = now
            s.save()
            
        # Notify friend
        try:
            friend_user = User.objects.get(id=friend_id)
            from ..notifications.services import create_notification
            create_notification(
                recipient=friend_user,
                actor=user,
                notification_type='streak_upload',
                message=f"🔥 Your streak with {sender_name} increased!",
                object_id=upload.id
            )
            tokens = _get_user_tokens(friend_id)
            if tokens:
                send_push_notification(
                    tokens,
                    title="🔥 New Streak!",
                    body=f"Your streak with {sender_name} increased!",
                    data={'type': 'streak_upload', 'user_id': user.id}
                )
        except Exception:
            pass

    return upload, "Streak uploaded successfully"

def add_streak_comment(streak_upload_id: int, user: User, text: str):
    try:
        upload = StreakUpload.objects.get(pk=streak_upload_id)
        comment = StreakComment.objects.create(streak_upload=upload, user=user, text=text)
        
        # Notify owner
        if upload.user != user:
            from ..notifications.services import create_notification
            create_notification(
                recipient=upload.user,
                actor=user,
                notification_type='streak_comment',
                message=f"💬 {user.username} commented on your streak!",
                object_id=upload.id
            )
            
        return comment
    except StreakUpload.DoesNotExist:
        return None

def get_streak_comments(streak_upload_id: int):
    try:
        upload = StreakUpload.objects.get(pk=streak_upload_id)
        return upload.comments.select_related('user__profile').order_by('-created_at')
    except StreakUpload.DoesNotExist:
        return None

def get_streak_upload_service(upload_id: int):
    try:
        return StreakUpload.objects.select_related('user__profile').get(pk=upload_id)
    except StreakUpload.DoesNotExist:
        return None
