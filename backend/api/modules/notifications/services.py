from django.utils import timezone
from ...models import Notification, FollowRequest, Follow, Profile
from django.contrib.auth.models import User


def create_notification(recipient: User, actor: User, notification_type: str, message: str = '', object_id: int = None):
    """Central function to create a notification for a user."""
    # Don't notify yourself
    if recipient == actor:
        return None
    return Notification.objects.create(
        recipient=recipient,
        actor=actor,
        notification_type=notification_type,
        message=message,
        object_id=object_id,
    )


def send_follow_request(from_user: User, to_user: User):
    """Send a follow request and create a notification."""
    req, created = FollowRequest.objects.get_or_create(from_user=from_user, to_user=to_user)
    if created:
        actor_name = getattr(from_user.profile, 'display_name', from_user.username)
        create_notification(
            recipient=to_user,
            actor=from_user,
            notification_type='follow_request',
            message=f'{actor_name} wants to follow you',
            object_id=req.id,
        )
    return req


def respond_to_follow_request(request_id: int, responding_user: User, action: str):
    """Accept or reject an incoming follow request."""
    try:
        req = FollowRequest.objects.get(id=request_id, to_user=responding_user, status='pending')
    except FollowRequest.DoesNotExist:
        return None, 'Request not found'

    if action == 'accept':
        req.status = 'accepted'
        req.save()
        # Create the actual follow relationship
        Follow.objects.get_or_create(follower=req.from_user, following=req.to_user)
        actor_name = getattr(responding_user.profile, 'display_name', responding_user.username)
        create_notification(
            recipient=req.from_user,
            actor=responding_user,
            notification_type='follow_accepted',
            message=f'{actor_name} accepted your follow request',
        )
    elif action == 'reject':
        req.status = 'rejected'
        req.save()
    return req, None


def get_notifications(user: User, unread_only: bool = False):
    """Get notifications for a user, newest first."""
    qs = Notification.objects.filter(recipient=user).select_related('actor')
    if unread_only:
        qs = qs.filter(is_read=False)
    return qs[:100]  # cap at 100


def mark_notifications_read(user: User, notification_ids: list = None):
    """Mark notifications as read. If no IDs, mark all."""
    qs = Notification.objects.filter(recipient=user, is_read=False)
    if notification_ids:
        qs = qs.filter(id__in=notification_ids)
    qs.update(is_read=True)


def get_unread_count(user: User) -> int:
    return Notification.objects.filter(recipient=user, is_read=False).count()
