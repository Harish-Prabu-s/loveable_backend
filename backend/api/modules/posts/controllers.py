from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.conf import settings
from .services import get_feed, create_post, toggle_like, delete_post
from ...models import PostLike


from ...utils import get_absolute_media_url

def _serialize_post(post, request_user, request=None):
    """Serialize a Post instance into the shape the frontend expects."""
    p = getattr(post.user, 'profile', None)

    # Build URLs using centralized helper
    image_url = get_absolute_media_url(post.image, request)
    photo_url = get_absolute_media_url(p.photo, request) if p else None

    is_liked = PostLike.objects.filter(post=post, user=request_user).exists()

    return {
        'id': post.id,
        'user': post.user.id,
        'profile_id': p.id if p else None,
        'display_name': p.display_name if p else '',
        'username': p.display_name if p else '',  # no separate username field
        'photo': photo_url,
        'gender': p.gender if p else '',
        'caption': post.caption,
        'image': image_url,
        'likes_count': PostLike.objects.filter(post=post).count(),
        'comments_count': post.comments.count(),
        'is_liked': is_liked,
        'is_owner': post.user == request_user,
        'created_at': post.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def feed_view(request):
    posts = get_feed()
    data = [_serialize_post(p, request.user, request) for p in posts]
    return Response(data)


from rest_framework.parsers import MultiPartParser, FormParser

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def create_post_view(request):
    print(f"DEBUG Post Upload: data={request.data}, files={request.FILES}")
    try:
        caption = request.data.get('caption', '').strip()
        
        image = None
        if 'image' in request.FILES:
            image = request.FILES['image']
        elif 'image' in request.data:
            image = request.data['image']


        if not caption and not image:
            return Response({'error': 'caption or image required', 'debug_files': list(request.FILES.keys()), 'debug_data': list(request.data.keys())}, status=400)

        visibility = request.data.get('visibility', 'all')
        post = create_post(request.user, caption, image, visibility)
        return Response(_serialize_post(post, request.user, request), status=201)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_view(request, post_id: int):
    result = toggle_like(post_id, request.user)
    if result is None:
        return Response({'error': 'post not found'}, status=404)
    
    # Send notification to content owner if liked
    if result.get('is_liked'):
        from ...models import Post
        try:
            post = Post.objects.get(pk=post_id)
            if post.user != request.user:
                from ..notifications.push_service import send_push_notification, _get_user_tokens
                from ..notifications.services import create_notification
                tokens = _get_user_tokens(post.user.id)
                profile = getattr(request.user, 'profile', None)
                sender_name = profile.display_name if profile else request.user.username
                
                # Persist to DB
                create_notification(
                    recipient=post.user,
                    actor=request.user,
                    notification_type='post_like',
                    message=f"{sender_name} liked your post!",
                    object_id=post.id
                )

                if tokens:
                    send_push_notification(
                        tokens, 
                        title="New Like!", 
                        body=f"{sender_name} liked your post!",
                        data={'type': 'post_like', 'post_id': post.id}
                    )
        except Post.DoesNotExist:
            pass

    return Response(result)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_view(request, post_id: int):
    from ...models import Post, PostComment, PushToken
    text = request.data.get('text', '').strip()
    if not text:
        return Response({'error': 'text required'}, status=400)
    
    try:
        post = Post.objects.get(pk=post_id)
        comment = PostComment.objects.create(post=post, user=request.user, text=text)
        
        # Send notification to content owner
        if post.user != request.user:
            from ..notifications.push_service import send_push_notification, _get_user_tokens
            from ..notifications.services import create_notification
            tokens = _get_user_tokens(post.user.id)
            profile = getattr(request.user, 'profile', None)
            sender_name = profile.display_name if profile else request.user.username
            
            # Persist to DB
            create_notification(
                recipient=post.user,
                actor=request.user,
                notification_type='post_comment',
                message=f"{sender_name} commented: {text[:30]}...",
                object_id=post.id
            )

            if tokens:
                send_push_notification(
                    tokens, 
                    title="New Comment!", 
                    body=f"{sender_name} commented: {text[:30]}...",
                    data={'type': 'post_comment', 'post_id': post.id}
                )

        return Response({'success': True, 'id': comment.id}, status=201)
    except Post.DoesNotExist:
        return Response({'error': 'post not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def share_post_view(request, post_id: int):
    from ...models import Post, User, Message, Room
    target_user_id = request.data.get('target_user_id')
    if not target_user_id:
        return Response({'error': 'target_user_id required'}, status=400)
    
    try:
        post = Post.objects.get(pk=post_id)
        target_user = User.objects.get(pk=target_user_id)
        
        # Create/Find Chat Room
        from ..chat.services import get_or_create_room
        room = get_or_create_room(request.user, target_user.id, 'audio') # Default to audio if new
        
        # Create Message for sharing
        from ...utils import get_absolute_media_url
        msg_media_url = get_absolute_media_url(post.image, request)
        Message.objects.create(
            room=room,
            sender=request.user,
            content=f"[POST_SHARE:{post.id}]",
            type='post_share',
            media_url=msg_media_url
        )

        # Send notification to target user
        from ..notifications.push_service import send_push_notification, _get_user_tokens
        from ..notifications.services import create_notification
        tokens = _get_user_tokens(target_user.id)
        profile = getattr(request.user, 'profile', None)
        sender_name = profile.display_name if profile else request.user.username
        
        # Persist to DB
        create_notification(
            recipient=target_user,
            actor=request.user,
            notification_type='post_share',
            message=f"{sender_name} shared a post with you.",
            object_id=post.id
        )

        if tokens:
            send_push_notification(
                tokens, 
                title="Shared Post", 
                body=f"{sender_name} shared a post with you.",
                data={'type': 'post_share', 'post_id': post.id, 'from_user_id': request.user.id}
            )
        
        return Response({'success': True})
    except (Post.DoesNotExist, User.DoesNotExist):
        return Response({'error': 'post or user not found'}, status=404)


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_comments_view(request, post_id: int):
    if request.method == 'POST':
        return comment_view(request._request, post_id)
    from ...models import Post, PostComment
    from ...utils import get_absolute_media_url
    try:
        post = Post.objects.get(pk=post_id)
        comments = post.comments.all().select_related('user__profile').order_by('-created_at')
        data = []
        for c in comments:
            p = getattr(c.user, 'profile', None)
            data.append({
                'id': c.id,
                'user': c.user.id,
                'display_name': p.display_name if p else '',
                'photo': get_absolute_media_url(p.photo, request) if p and p.photo else None,
                'text': c.text,
                'created_at': c.created_at.isoformat(),
            })
        return Response(data)
    except Post.DoesNotExist:
        return Response({'error': 'post not found'}, status=404)

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_post_view(request, post_id: int):
    deleted = delete_post(post_id, request.user)
    if not deleted:
        return Response({'error': 'post not found or permission denied'}, status=404)
    return Response(status=204)
