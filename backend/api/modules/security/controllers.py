from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from .services import (
    set_app_lock_service,
    verify_app_lock_service,
    toggle_biometrics_service,
    toggle_face_unlock_service,
    initiate_lock_reset_service,
    verify_reset_otp_service
)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def set_app_lock(request):
    lock_type = request.data.get('lock_type')
    value = request.data.get('value')
    if not lock_type or not value:
        return Response({'error': 'lock_type and value are required.'}, status=400)
    
    success, msg = set_app_lock_service(request.user, lock_type, value)
    return Response({'success': success, 'message': msg})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_app_lock(request):
    value = request.data.get('value')
    if not value:
        return Response({'error': 'value is required.'}, status=400)
    
    success, msg = verify_app_lock_service(request.user, value)
    if success:
        return Response({'success': True, 'message': msg})
    return Response({'success': False, 'message': msg}, status=401)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_security_settings(request):
    biometrics = request.data.get('biometrics_enabled')
    face = request.data.get('face_unlock_enabled')
    
    if biometrics is not None:
        toggle_biometrics_service(request.user, biometrics)
    if face is not None:
        toggle_face_unlock_service(request.user, face)
        
    return Response({'success': True, 'message': 'Security settings updated.'})

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def initiate_lock_reset(request):
    success, msg = initiate_lock_reset_service(request.user)
    if success:
        return Response({'success': True, 'message': msg})
    return Response({'success': False, 'message': msg}, status=400)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_reset_otp(request):
    code = request.data.get('code')
    if not code:
        return Response({'error': 'OTP code is required.'}, status=400)
    
    success, msg = verify_reset_otp_service(request.user, code)
    if success:
        return Response({'success': True, 'message': msg})
    return Response({'success': False, 'message': msg}, status=400)
