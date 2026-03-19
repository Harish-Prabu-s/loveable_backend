from ...models import Post, PostLike
from django.core.files.storage import default_storage
from django.core.files.base import ContentFile


from django.db import models

def get_feed(user):
    """Return all posts ordered newest first, respecting visibility."""
    return Post.objects.select_related('user__profile').filter(
        models.Q(is_archived=False) & (
            models.Q(visibility='all') | 
            models.Q(user=user) | 
            (models.Q(visibility='close_friends') & models.Q(user__close_friends__close_friend=user))
        )
    ).order_by('-created_at').distinct()


import base64
import re
import uuid

def create_post(user, caption: str, image=None, visibility='all'):
    """Create and return a new post, optionally saving an uploaded image file."""
    post = Post(user=user, caption=caption, visibility=visibility)
    if image:
        if isinstance(image, str):
            # Try parsing it as a base64 data URI
            match = re.match(r'data:(image/\w+);base64,(.+)', image)
            if match:
                mime_type = match.group(1)
                base64_data = match.group(2)
                ext = mime_type.split('/')[-1]
                filename = f"posts/{user.id}_{uuid.uuid4().hex[:8]}.{ext}"
                try:
                    file_data = base64.b64decode(base64_data)
                    path = default_storage.save(filename, ContentFile(file_data))
                    post.image = path
                except Exception as e:
                    print(f"Error decoding base64 image: {e}")
            else:
                print("Image string did not match expected base64 format.")
        else:
            filename = f"posts/{user.id}_{image.name}"
            path = default_storage.save(filename, ContentFile(image.read()))
            post.image = path
    post.save()
    
    # Notify Close Friends
    from ..notifications.services import notify_close_friends_of_content
    notify_close_friends_of_content(user, 'post', post.id)
    
    return post


def toggle_like(post_id: int, user):
    """Toggle like on a post. Returns dict with is_liked and likes_count."""
    try:
        post = Post.objects.get(id=post_id)
    except Post.DoesNotExist:
        return None

    like, created = PostLike.objects.get_or_create(post=post, user=user)
    if not created:
        like.delete()
        is_liked = False
    else:
        is_liked = True

    likes_count = PostLike.objects.filter(post=post).count()
    return {'is_liked': is_liked, 'likes_count': likes_count}


def delete_post(post_id: int, user):
    """Delete a post. Returns True if deleted, False if not owner or not found."""
    try:
        post = Post.objects.get(id=post_id, user=user)
        post.delete()
        return True
    except Post.DoesNotExist:
        return False

def archive_post(post_id: int, user):
    """Archive a post."""
    try:
        post = Post.objects.get(id=post_id, user=user)
        post.is_archived = True
        post.save(update_fields=['is_archived'])
        return True
    except Post.DoesNotExist:
        return False

def unarchive_post(post_id: int, user):
    """Unarchive a post."""
    try:
        post = Post.objects.get(id=post_id, user=user)
        post.is_archived = False
        post.save(update_fields=['is_archived'])
        return True
    except Post.DoesNotExist:
        return False
