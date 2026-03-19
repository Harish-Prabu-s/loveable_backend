from django.utils import timezone
from datetime import timedelta
from ...models import Story, StoryView

def get_active_stories(user):
    """
    Returns stories that haven't expired (24h default) and are visible to the user.
    """
    now = timezone.now()
    from django.db import models
    return Story.objects.filter(
        models.Q(expires_at__gt=now) | models.Q(expires_at__isnull=True, created_at__gt=now - timedelta(hours=24))
    ).filter(
        models.Q(visibility='all') | 
        models.Q(user=user) | 
        (models.Q(visibility='close_friends') & models.Q(user__close_friends__close_friend=user))
    ).select_related('user__profile').prefetch_related('views').order_by('-created_at').distinct()

def create_story(user, media_url: str, media_type: str = 'image', visibility='all'):
    expires_at = timezone.now() + timedelta(hours=24)
    story = Story.objects.create(user=user, media_url=media_url, media_type=media_type, expires_at=expires_at, visibility=visibility)
    
    # Notify Close Friends
    from ..notifications.services import notify_close_friends_of_content
    notify_close_friends_of_content(user, 'story', story.id)
    
    return story

def record_view(story_id: int, user):
    story = Story.objects.get(id=story_id)
    # Ignore if user views their own story
    if story.user == user:
        return None
    view, created = StoryView.objects.get_or_create(story=story, viewer=user)
    return view

def get_story_views(story_id: int):
    return StoryView.objects.filter(story_id=story_id).select_related('viewer__profile').order_by('-viewed_at')
