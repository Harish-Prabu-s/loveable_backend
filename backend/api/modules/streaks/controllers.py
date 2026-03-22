from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .services import upload_streak_service, get_user_streaks_service, add_streak_comment, get_streak_comments, get_streak_upload_service

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_streak(request):
    media = request.FILES.get('media')
    if not media:
        return Response({'error': 'media is required'}, status=400)
    
    media_type = request.data.get('media_type', 'image')
    visibility = request.data.get('visibility', 'all')
    
    upload, msg = upload_streak_service(request.user, media, media_type, visibility)
    if not upload:
        return Response({'error': msg}, status=400)
    
    return Response({'status': msg, 'id': upload.id})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_streaks(request):
    data = get_user_streaks_service(request.user, request)
    return Response(data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_comment(request, upload_id):
    text = request.data.get('text')
    if not text:
        return Response({'error': 'text is required'}, status=400)
    
    comment = add_streak_comment(upload_id, request.user, text)
    if not comment:
        return Response({'error': 'Comment could not be added'}, status=400)
    
    return Response({'status': 'Comment added', 'id': comment.id})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_comments(request, upload_id):
    comments = get_streak_comments(upload_id)
    if comments is None:
        return Response({'error': 'Streak not found'}, status=404)
    
    from ...serializers import ProfileSerializer
    return Response([{
        'id': c.id,
        'user': ProfileSerializer(c.user.profile, context={'request': request}).data,
        'text': c.text,
        'created_at': c.created_at
    } for c in comments])
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_streak_upload(request, upload_id):
    upload = get_streak_upload_service(upload_id)
    if not upload:
        return Response({'error': 'Streak upload not found'}, status=404)
    
    from ...serializers import ProfileSerializer
    from ...utils import get_absolute_media_url
    
    return Response({
        'id': upload.id,
        'user': ProfileSerializer(upload.user.profile, context={'request': request}).data,
        'media_url': get_absolute_media_url(upload.media_url, request),
        'media_type': upload.media_type,
        'visibility': upload.visibility,
        'created_at': upload.created_at
    })

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def view_streaks_snapchat(request):
    view_type = request.query_params.get('type', 'friends')
    from .services import get_streaks_list_service
    data = get_streaks_list_service(request.user, view_type, request)
    return Response(data)
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_like(request, upload_id):
    from .services import toggle_streak_like
    liked, msg = toggle_streak_like(upload_id, request.user)
    if liked is None:
        return Response({'error': msg}, status=404)
    return Response({'status': msg, 'liked': liked})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_fire(request, upload_id):
    from .services import toggle_streak_reaction
    fired, msg = toggle_streak_reaction(upload_id, request.user, 'fire')
    if fired is None:
        return Response({'error': msg}, status=404)
    return Response({'status': msg, 'fired': fired})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def streak_leaderboard_view(request):
    try:
        from ...models import Streak
        # Get top 50 streaks overall where the streak count > 0 with efficient joins
        streaks = Streak.objects.filter(streak_count__gte=1) \
            .select_related('user1__profile', 'user2__profile') \
            .order_by('-streak_count')[:50]
        
        data = []
        for streak in streaks:
            user1 = streak.user1
            user2 = streak.user2
            data.append({
                'streak_count': streak.streak_count,
                'last_interaction_date': streak.last_interaction_date,
                'user1': {
                    'id': user1.id,
                    'username': user1.username,
                    'display_name': getattr(user1.profile, 'display_name', user1.username),
                    'photo': user1.profile.photo.url if user1.profile.photo else None,
                },
                'user2': {
                    'id': user2.id,
                    'username': user2.username,
                    'display_name': getattr(user2.profile, 'display_name', user2.username),
                    'photo': user2.profile.photo.url if user2.profile.photo else None,
                }
            })
        return Response(data)
    except Exception as e:
        return Response({'error': str(e)}, status=400)
