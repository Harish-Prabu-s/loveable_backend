from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...serializers import StorySerializer, StoryViewSerializer
from .services import list_stories, create_story, record_view, get_story_views
from django.core.files.storage import FileSystemStorage
from django.conf import settings
from ...models import Story

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_stories_view(request):
    qs = list_stories()
    return Response(StorySerializer(qs, many=True, context={'request': request}).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_story_view(request):
    image_url = request.data.get('image_url')
    if not image_url:
        return Response({'error': 'image_url required'}, status=400)
    story = create_story(request.user, image_url)
    return Response(StorySerializer(story, context={'request': request}).data, status=201)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_story_media_view(request):
    file = request.FILES.get('media')
    if not file:
        return Response({'error': 'media file required'}, status=400)
    fs = FileSystemStorage(location=settings.MEDIA_ROOT / 'stories', base_url=settings.MEDIA_URL + 'stories/')
    filename = fs.save(file.name, file)
    url = request.build_absolute_uri(fs.url(filename))
    return Response({'url': url}, status=201)

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
