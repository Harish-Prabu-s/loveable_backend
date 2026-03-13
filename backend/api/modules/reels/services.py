from ...models import Reel

def list_reels(limit: int = 50):
    return Reel.objects.select_related('user__profile').order_by('-created_at')[:limit]

def create_reel(user, video_url: str, caption: str = ''):
    return Reel.objects.create(user=user, video_url=video_url, caption=caption)
