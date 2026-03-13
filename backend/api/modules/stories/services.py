from django.utils import timezone
from datetime import timedelta
from ...models import Story, StoryView

def get_active_stories():
    """
    Returns stories that haven't expired (24h default).
    """
    now = timezone.now()
    # Stories expire after 24 hours if expires_at is null, otherwise use expires_at
    from django.db.models import Q
    return Story.objects.filter(
        Q(expires_at__gt=now) | Q(expires_at__isnull=True, created_at__gt=now - timedelta(hours=24))
    ).select_related('user__profile').prefetch_related('views').order_by('-created_at')

def create_story(user, media_url: str, media_type: str = 'image'):
    expires_at = timezone.now() + timedelta(hours=24)
    return Story.objects.create(user=user, media_url=media_url, media_type=media_type, expires_at=expires_at)

def record_view(story_id: int, user):
    story = Story.objects.get(id=story_id)
    # Ignore if user views their own story
    if story.user == user:
        return None
    view, created = StoryView.objects.get_or_create(story=story, viewer=user)
    return view

def get_story_views(story_id: int):
    return StoryView.objects.filter(story_id=story_id).select_related('viewer__profile').order_by('-viewed_at')
