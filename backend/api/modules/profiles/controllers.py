from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from ...serializers import ProfileSerializer
from .services import get_my_profile, update_my_profile, follow_user, unfollow_user, send_friend_request, respond_friend_request
from ...models import Profile

@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def profile_me(request):
    if request.method == 'GET':
        p = get_my_profile(request.user)
        return Response(ProfileSerializer(p, context={'request': request}).data)
    if request.method == 'PATCH':
        p = update_my_profile(request.user, request.data, request.FILES)
        return Response(ProfileSerializer(p, context={'request': request}).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_profiles_view(request):
    search = request.GET.get('search')
    is_online = request.GET.get('is_online')
    is_busy = request.GET.get('is_busy')
    
    qs = Profile.objects.exclude(user=request.user)
    
    if search:
        qs = qs.filter(display_name__icontains=search)
    
    if is_online == 'true':
        qs = qs.filter(is_online=True)
        
    if is_busy == 'false':
        # Filter out users who are currently in a pending or active room
        qs = qs.exclude(user__rooms_started__status__in=['pending', 'active'])
        qs = qs.exclude(user__rooms_received__status__in=['pending', 'active'])
        
    return Response(ProfileSerializer(qs, many=True, context={'request': request}).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def profile_by_id(request, user_id: int):
    p = Profile.objects.filter(user_id=user_id).first()
    if not p:
        return Response({'error': 'not found'}, status=404)
    return Response(ProfileSerializer(p, context={'request': request}).data)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def follow_view(request, user_id: int):
    follow_user(request.user, user_id)
    return Response({'status': 'followed'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unfollow_view(request, user_id: int):
    unfollow_user(request.user, user_id)
    return Response({'status': 'unfollowed'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_friend_request_view(request, user_id: int):
    req, msg = send_friend_request(request.user, user_id)
    if not req:
        return Response({'error': msg}, status=400)
    return Response({'status': msg, 'request_id': req.id})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def respond_friend_request_view(request, request_id: int):
    action = request.data.get('action') # accept/reject
    if action not in ['accept', 'reject']:
        return Response({'error': 'Invalid action'}, status=400)
    
    req = respond_friend_request(request.user, request_id, action)
    if not req:
        return Response({'error': 'Request not found or invalid'}, status=404)
    return Response({'status': f'Request {action}ed'})

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_followers_view(request, user_id: int):
    # Returns list of profiles that follow this user
    from ...models import Follow
    follows = Follow.objects.filter(following_id=user_id).select_related('follower__profile')
    profiles = [f.follower.profile for f in follows]
    return Response(ProfileSerializer(profiles, many=True, context={'request': request}).data)

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_following_view(request, user_id: int):
    # Returns list of profiles this user follows
    from ...models import Follow
    follows = Follow.objects.filter(follower_id=user_id).select_related('following__profile')
    profiles = [f.following.profile for f in follows]
    return Response(ProfileSerializer(profiles, many=True, context={'request': request}).data)
