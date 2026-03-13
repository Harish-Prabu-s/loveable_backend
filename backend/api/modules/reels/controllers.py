from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from ...serializers import ReelSerializer
from .services import list_reels, create_reel
from django.core.files.storage import FileSystemStorage
from django.conf import settings
import uuid
import os

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_reels_view(request):
    qs = list_reels()
    return Response(ReelSerializer(qs, many=True, context={'request': request}).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_reel_media_view(request):
    print(f"DEBUG Reel Upload: data={request.data}, files={request.FILES}")
    try:
        if 'media' not in request.FILES:
             return Response({'error': 'media file required. Found keys: ' + str(list(request.FILES.keys()) + list(request.data.keys()))}, status=400)
        
        file = request.FILES['media']
        fs = FileSystemStorage(location=settings.MEDIA_ROOT / 'reels', base_url=settings.MEDIA_URL + 'reels/')
        
        ext = os.path.splitext(file.name)[1].lower() or '.mp4'
        safe_filename = f"{request.user.id}_{uuid.uuid4().hex}{ext}"
        
        filename = fs.save(safe_filename, file)
        url = request.build_absolute_uri(fs.url(filename))
        return Response({'url': url}, status=201)
    except Exception as e:
        import traceback
        traceback.print_exc()
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_reel_view(request):
    video_url = request.data.get('video_url')
    caption = request.data.get('caption', '')
    if not video_url:
        return Response({'error': 'video_url required'}, status=400)
    reel = create_reel(request.user, video_url, caption)
    return Response(ReelSerializer(reel, context={'request': request}).data, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def like_reel_view(request, pk):
    from ...models import Reel, ReelLike
    try:
        reel = Reel.objects.get(pk=pk)
        like, created = ReelLike.objects.get_or_create(reel=reel, user=request.user)
        if not created:
            like.delete()
            return Response({'liked': False, 'likes_count': reel.likes.count()})
        
        # Send notification to content owner
        if reel.user != request.user:
            from ..notifications.push_service import send_push_notification
            from ...models import PushToken
            tokens = list(PushToken.objects.filter(user=reel.user).values_list('expo_token', flat=True))
            if tokens:
                send_push_notification(
                    tokens, 
                    title="New Like!", 
                    body=f"{request.user.display_name or request.user.username} liked your reel!",
                    data={'type': 'reel_like', 'reel_id': reel.id}
                )

        return Response({'liked': True, 'likes_count': reel.likes.count()})
    except Reel.DoesNotExist:
        return Response({'error': 'Reel not found'}, status=404)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def comment_reel_view(request, pk):
    from ...models import Reel, ReelComment
    text = request.data.get('text')
    if not text:
        return Response({'error': 'text required'}, status=400)
    try:
        reel = Reel.objects.get(pk=pk)
        comment = ReelComment.objects.create(reel=reel, user=request.user, text=text)

        # Send notification to content owner
        if reel.user != request.user:
            from ..notifications.push_service import send_push_notification
            from ...models import PushToken
            tokens = list(PushToken.objects.filter(user=reel.user).values_list('expo_token', flat=True))
            if tokens:
                send_push_notification(
                    tokens, 
                    title="New Comment!", 
                    body=f"{request.user.display_name or request.user.username} commented on your reel: {text[:30]}...",
                    data={'type': 'reel_comment', 'reel_id': reel.id}
                )

        return Response({'success': True, 'id': comment.id})
    except Reel.DoesNotExist:
        return Response({'error': 'Reel not found'}, status=404)
