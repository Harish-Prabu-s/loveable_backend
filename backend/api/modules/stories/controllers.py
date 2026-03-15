from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...serializers import StorySerializer, StoryViewSerializer
from .services import create_story, record_view, get_story_views
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from ...models import Story

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_stories_view(request):
    from .services import get_active_stories
    qs = get_active_stories()
    return Response(StorySerializer(qs, many=True, context={'request': request}).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_story_view(request):
    media_url = request.data.get('media_url')
    media_type = request.data.get('media_type', 'image')
    if not media_url:
        return Response({'error': 'media_url required'}, status=400)
    story = create_story(request.user, media_url, media_type)
    return Response(StorySerializer(story, context={'request': request}).data, status=201)

from rest_framework.parsers import MultiPartParser, FormParser
from django.core.files.base import ContentFile
import uuid

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_story_media_view(request):
    print(f"DEBUG Story Upload: data={request.data}, files={request.FILES}")
    try:
        if 'media' not in request.FILES:
             return Response({'error': 'media file required. Found keys: ' + str(list(request.FILES.keys()) + list(request.data.keys()))}, status=400)
        else:
            file = request.FILES['media']

        fs = FileSystemStorage(location=settings.MEDIA_ROOT / 'stories', base_url=settings.MEDIA_URL + 'stories/')
        
        # Use a safe unique filename avoiding special characters from client
        import os
        ext = os.path.splitext(file.name)[1].lower() or '.jpg'
        safe_filename = f"{request.user.id}_{uuid.uuid4().hex}{ext}"
        
        filename = fs.save(safe_filename, file)
        url = request.build_absolute_uri(fs.url(filename))
        return Response({'url': url}, status=201)
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def view_story_view(request, story_id: int):
    try:
        record_view(story_id, request.user)
        return Response({'status': 'ok'})
    except Story.DoesNotExist:
        return Response({'error': 'story not found'}, status=404)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_story_views_view(request, story_id: int):
    try:
        story = Story.objects.get(id=story_id)
        if story.user != request.user:
            return Response({'error': 'permission denied'}, status=403)
        qs = get_story_views(story_id)
        return Response(StoryViewSerializer(qs, many=True, context={'request': request}).data)
    except Story.DoesNotExist:
        return Response({'error': 'story not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_story_view(request, story_id):
    from ...models import Story, StoryLike
    try:
        story = Story.objects.get(id=story_id)
        like, created = StoryLike.objects.get_or_create(story=story, user=request.user)
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': story.likes.count()})
        
        # Send notification to content owner
        if story.user != request.user:
            from ..notifications.push_service import send_push_notification
            from ...models import PushToken
            tokens = list(PushToken.objects.filter(user=story.user).values_list('expo_token', flat=True))
            if tokens:
                send_push_notification(
                    tokens, 
                    title="New Story Like!", 
                    body=f"{request.user.display_name or request.user.username} liked your story!",
                    data={'type': 'story_like', 'story_id': story.id}
                )

        return Response({'liked': True, 'likes_count': story.likes.count()})
    except Story.DoesNotExist:
        return Response({'error': 'Story not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_story_view(request, story_id):
    from ...models import Story, StoryComment
    text = request.data.get('text')
    if not text:
        return Response({'error': 'text required'}, status=400)
    try:
        story = Story.objects.get(id=story_id)
        comment = StoryComment.objects.create(story=story, user=request.user, text=text)

        # Send notification to content owner
        if story.user != request.user:
            from ..notifications.push_service import send_push_notification, _get_user_tokens
            tokens = _get_user_tokens(story.user.id)
            profile = getattr(request.user, 'profile', None)
            sender_name = profile.display_name if profile else request.user.username
            if tokens:
                send_push_notification(
                    tokens, 
                    title="New Story Comment!", 
                    body=f"{sender_name} commented on your story: {text[:30]}...",
                    data={'type': 'story_comment', 'story_id': story.id}
                )

        from ...utils import get_absolute_media_url
        p = getattr(request.user, 'profile', None)
        return Response({
            'id': comment.id,
            'user': request.user.id,
            'display_name': p.display_name if p else '',
            'photo': get_absolute_media_url(p.photo, request) if p and p.photo else None,
            'text': comment.text,
            'created_at': comment.created_at.isoformat(),
        })
    except Story.DoesNotExist:
        return Response({'error': 'Story not found'}, status=404)

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def list_story_comments_view(request, story_id: int):
    if request.method == 'POST':
        return comment_story_view(request._request, story_id)
    
    from ...models import Story, StoryComment
    from ...utils import get_absolute_media_url
    try:
        story = Story.objects.get(pk=story_id)
        comments = story.comments.all().select_related('user__profile').order_by('-created_at')
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
    except Story.DoesNotExist:
        return Response({'error': 'Story not found'}, status=404)
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_story_view(request, story_id: int):
    try:
        story = Story.objects.get(id=story_id)
        if story.user != request.user:
            return Response({'error': 'permission denied'}, status=403)
        
        # Delete file from storage
        if story.media_url:
            story.media_url.delete(save=False)
            
        story.delete()
        return Response(status=204)
    except Story.DoesNotExist:
        return Response({'error': 'story not found'}, status=404)
