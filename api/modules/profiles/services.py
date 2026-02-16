from django.contrib.auth.models import User
from django.db import models
from ...models import Profile, Follow, FriendRequest

def get_my_profile(user: User) -> Profile:
    return user.profile

def update_my_profile(user: User, data: dict, files=None) -> Profile:
    p = user.profile
    for field in ['display_name', 'bio', 'interests', 'age', 'location', 'language', 'app_lock_enabled']:
        if field in data:
            setattr(p, field, data[field])
    # Handle photo upload
    if files and 'photo' in files:
        p.photo = files['photo']
    elif 'photo' in data and not data['photo']:
        # Allow clearing the photo
        p.photo = None
    p.save()
    return p

def follow_user(user: User, target_user_id: int):
    if user.id == target_user_id:
        return None
    try:
        target = User.objects.get(id=target_user_id)
        follow, created = Follow.objects.get_or_create(follower=user, following=target)
        return follow
    except User.DoesNotExist:
        return None

def unfollow_user(user: User, target_user_id: int):
    Follow.objects.filter(follower=user, following_id=target_user_id).delete()

def send_friend_request(user: User, target_user_id: int):
    if user.id == target_user_id:
        return None, "Cannot friend yourself"
    try:
        target = User.objects.get(id=target_user_id)
        # Check existing
        existing = FriendRequest.objects.filter(
            (models.Q(from_user=user, to_user=target) | models.Q(from_user=target, to_user=user))
        ).first()
        
        if existing:
            if existing.status == 'accepted':
                return existing, "Already friends"
            if existing.status == 'pending':
                return existing, "Request already pending"
            # If rejected, maybe allow new request? For now, just return existing.
            return existing, "Request exists"

        req = FriendRequest.objects.create(from_user=user, to_user=target, status='pending')
        return req, "Request sent"
    except User.DoesNotExist:
        return None, "User not found"

def respond_friend_request(user: User, request_id: int, action: str):
    # action: 'accept' or 'reject'
    try:
        req = FriendRequest.objects.get(id=request_id, to_user=user, status='pending')
        if action == 'accept':
            req.status = 'accepted'
            req.save()
            # Auto-follow each other?
            Follow.objects.get_or_create(follower=req.from_user, following=req.to_user)
            Follow.objects.get_or_create(follower=req.to_user, following=req.from_user)
        elif action == 'reject':
            req.status = 'rejected'
            req.save()
        return req
    except FriendRequest.DoesNotExist:
        return None
