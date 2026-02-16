from django.utils import timezone
from datetime import timedelta
from ...models import Story, StoryView

def list_stories(limit: int = 50):
    # Only return stories from last 24 hours
    cutoff = timezone.now() - timedelta(hours=24)
    return Story.objects.filter(timestamp__gte=cutoff).select_related('user__profile').prefetch_related('views').order_by('-timestamp')[:limit]

def create_story(user, image_url: str):
    return Story.objects.create(user=user, image_url=image_url)

def record_view(story_id: int, user):
    story = Story.objects.get(id=story_id)
    # Ignore if user views their own story
    if story.user == user:
        return None
    view, created = StoryView.objects.get_or_create(story=story, viewer=user)
    return view

def get_story_views(story_id: int):
    return StoryView.objects.filter(story_id=story_id).select_related('viewer__profile').order_by('-viewed_at')
