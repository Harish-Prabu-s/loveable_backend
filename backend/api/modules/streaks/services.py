from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from ...models import Streak, StreakUpload, Follow, Notification, StreakComment, StreakLike, StreakReaction
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
            s = Streak.objects.create(user1_id=user.id, user2_id=friend_id, streak_count=1, last_interaction_date=now, last_uploader=user)
        else:
            if s.last_interaction_date and s.last_interaction_date.date() < now.date():
                s.streak_count += 1
            s.last_interaction_date = now
            s.last_uploader = user
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
        return StreakComment.objects.filter(streak_upload=upload).select_related('user__profile').order_by('-created_at')
    except StreakUpload.DoesNotExist:
        return None

def get_streak_upload_service(upload_id: int):
    try:
        return StreakUpload.objects.select_related('user__profile').get(pk=upload_id)
    except StreakUpload.DoesNotExist:
        return None

def toggle_streak_like(upload_id: int, user: User):
    try:
        upload = StreakUpload.objects.get(pk=upload_id)
        like = StreakLike.objects.filter(streak_upload=upload, user=user).first()
        if like:
            like.delete()
            return False, "Unliked"
        else:
            StreakLike.objects.create(streak_upload=upload, user=user)
            return True, "Liked"
    except StreakUpload.DoesNotExist:
        return None, "Not found"

def toggle_streak_reaction(upload_id: int, user: User, r_type: str = 'fire'):
    try:
        upload = StreakUpload.objects.get(pk=upload_id)
        react = StreakReaction.objects.filter(streak_upload=upload, user=user, reaction_type=r_type).first()
        if react:
            react.delete()
            return False, "Reaction removed"
        else:
            StreakReaction.objects.create(streak_upload=upload, user=user, reaction_type=r_type)
            return True, "Reaction added"
    except StreakUpload.DoesNotExist:
        return None, "Not found"

from datetime import timedelta
from django.db.models import Max

def get_streaks_list_service(user: User, view_type: str = 'friends', request=None):
    """
    Optimized: Get streaks list with minimal queries.
    """
    try:
        now = timezone.now()
        day_ago = now - timedelta(hours=24)
        
        if view_type == 'friends':
            # 1. Fetch streaks with optimized profile and uploader data
            streaks = Streak.objects.filter(
                models.Q(user1=user) | models.Q(user2=user),
                streak_count__gt=0
            ).select_related('user1__profile', 'user2__profile', 'last_uploader')
            
            # 2. Collect other users to batch fetch their latest uploads
            other_user_ids = []
            streak_map = {}
            for s in streaks:
                other_user = s.user2 if s.user1 == user else s.user1
                other_user_ids.append(other_user.id)
                streak_map[other_user.id] = s
            
            # 3. Batch fetch latest uploads from 24h ago (portable)
            all_uploads = StreakUpload.objects.filter(
                user_id__in=other_user_ids,
                created_at__gte=day_ago
            ).order_by('created_at') # Order by oldest first
            
            # Map user -> latest upload
            upload_map = {up.user_id: up for up in all_uploads} 
            
            # 4. Include current user's own latest upload if it exists
            my_latest = StreakUpload.objects.filter(user=user, created_at__gte=day_ago).order_by('-created_at').first()
            if my_latest:
                upload_map[user.id] = my_latest
                if user.id not in other_user_ids:
                    other_user_ids.insert(0, user.id)
                    # We need a dummy streak object or handle it
                    class MockStreak:
                        def __init__(self, u):
                            self.user1 = u
                            self.user2 = u
                            self.streak_count = 0
                            self.last_interaction_date = timezone.now()
                            self.last_uploader_id = u.id
                    streak_map[user.id] = MockStreak(user)
            
            result = []
            for uid in other_user_ids:
                s: Streak = streak_map[uid]
                other_user = s.user2 if s.user1 == user else s.user1
                up = upload_map.get(uid)
                
                # Check if current user liked/reacted
                has_liked = False
                has_fired = False
                likes_count = 0
                comments_count = 0
                if up:
                    has_liked = StreakLike.objects.filter(streak_upload=up, user=user).exists()
                    has_fired = StreakReaction.objects.filter(streak_upload=up, user=user, reaction_type='fire').exists()
                    likes_count = up.likes.count()
                    comments_count = up.comments.count()

                result.append({
                    'user_id': other_user.id,
                    'username': other_user.username,
                    'display_name': getattr(other_user.profile, 'display_name', other_user.username),
                    'photo': ProfileSerializer(other_user.profile, context={'request': request}).data.get('photo'),
                    'streak_count': s.streak_count,
                    'last_updated': s.last_interaction_date,
                    'last_uploader_id': s.last_uploader_id,
                    'media': {
                        'id': up.id,
                        'url': up.media_url.url if up.media_url else None,
                        'type': up.media_type,
                        'likes_count': likes_count,
                        'comments_count': comments_count,
                        'has_liked': has_liked,
                        'has_fired': has_fired
                    } if up else None
                })
            return result

        else: # type == 'all'
            # 1. Fetch latest public uploads OR the user's own uploads (portable)
            all_uploads = StreakUpload.objects.filter(
                models.Q(created_at__gte=day_ago) & (
                    models.Q(visibility='all') | models.Q(user=user)
                )
            ).select_related('user__profile').order_by('created_at') # Order by oldest first
            
            if not all_uploads.exists():
                return []
                
            # Filter and take only the latest per user in memory
            uploads_dict = {up.user_id: up for up in all_uploads}
            uploads = list(uploads_dict.values())
            
            uploader_ids = [up.user_id for up in uploads]
            
            # 2. Bulk fetch the highest streak for each uploader
            from channels.db import database_sync_to_async # not needed here but for reference
            from django.db.models import Max, F
            from django.db.models.functions import Greatest
            
            user_streaks = User.objects.filter(id__in=uploader_ids).annotate(
                max_s1=Max('streaks_user1__streak_count'),
                max_s2=Max('streaks_user2__streak_count')
            ).annotate(
                best_streak=Greatest(F('max_s1'), F('max_s2'), default=0)
            )
            
            streak_data_map = {u.id: u.best_streak for u in user_streaks}
            
            result = []
            for up in uploads:
                best_streak = streak_data_map.get(up.user_id, 0)
                
                # Check if current user liked/reacted
                has_liked = StreakLike.objects.filter(streak_upload=up, user=user).exists()
                has_fired = StreakReaction.objects.filter(streak_upload=up, user=user, reaction_type='fire').exists()
                
                result.append({
                    'user_id': up.user.id,
                    'username': up.user.username,
                    'display_name': getattr(up.user.profile, 'display_name', up.user.username),
                    'profile_pic': ProfileSerializer(up.user.profile, context={'request': request}).data.get('photo'),
                    'streak_count': best_streak,
                    'last_updated': up.created_at,
                    'media': {
                        'id': up.id,
                        'url': up.media_url.url if up.media_url else None,
                        'type': up.media_type,
                        'likes_count': up.likes.count(),
                        'comments_count': up.comments.count(),
                        'has_liked': has_liked,
                        'has_fired': has_fired
                    }
                })
            return result
    except Exception as e:
        import logging
        logging.getLogger(__name__).error(f"Error in get_streaks_list_service: {e}")
        return []
