from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.contrib.auth.models import User
from api.models import CallSession
from .serializers import CallSessionSerializer
from .services import initiate_call, end_call


class InitiateCallView(APIView):
    """POST /api/calls/initiate/ — start a call session."""

    def post(self, request):
        callee_id = request.data.get('callee_id')
        call_type = request.data.get('call_type', 'VOICE').upper()  # VOICE or VIDEO

        if not callee_id:
            return Response({'detail': 'callee_id required.'}, status=400)
        if call_type not in ('VOICE', 'VIDEO'):
            return Response({'detail': 'call_type must be VOICE or VIDEO.'}, status=400)

        try:
            callee = User.objects.get(pk=callee_id)
        except User.DoesNotExist:
            return Response({'detail': 'User not found.'}, status=404)

        if callee == request.user:
            return Response({'detail': 'Cannot call yourself.'}, status=400)

        try:
            session = initiate_call(request.user, callee, call_type)
        except PermissionError as e:
            return Response({'detail': str(e)}, status=403)

        return Response(CallSessionSerializer(session).data, status=201)


class EndCallView(APIView):
    """POST /api/calls/end/ — end a call session."""

    def post(self, request):
        session_id = request.data.get('session_id')
        if not session_id:
            return Response({'detail': 'session_id required.'}, status=400)

        try:
            session = CallSession.objects.get(pk=session_id)
        except CallSession.DoesNotExist:
            return Response({'detail': 'Session not found.'}, status=404)

        if session.caller != request.user and session.callee != request.user:
            return Response({'detail': 'Not your call.'}, status=403)

        result = end_call(session)
        return Response(result)


class CallLogsView(APIView):
    """GET /api/calls/logs/ — call history for the current user."""

    def get(self, request):
        sessions = (
            CallSession.objects
            .filter(caller=request.user) | CallSession.objects.filter(callee=request.user)
        ).order_by('-started_at')[:50]
        return Response(CallSessionSerializer(sessions, many=True).data)
