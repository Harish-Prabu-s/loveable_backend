import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vibely_backend.settings')
django.setup()

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser, User
from rest_framework_simplejwt.tokens import AccessToken
from django.db import close_old_connections
from urllib.parse import parse_qs
import logging

logger = logging.getLogger(__name__)

@database_sync_to_async
def get_user(user_id):
    try:
        return User.objects.get(id=user_id)
    except User.DoesNotExist:
        return AnonymousUser()

class JWTAuthMiddleware:
    """
    Custom middleware that takes a token from the query string and authenticates the user.
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # Close old database connections to prevent usage of timed out connections
        close_old_connections()

        # Get the token from query string
        query_string = parse_qs(scope['query_string'].decode())
        token = query_string.get('token')

        if not token:
            scope['user'] = AnonymousUser()
        else:
            try:
                # Validate the token
                access_token = AccessToken(token[0])
                user_id = access_token['user_id']
                
                # Get the user from the database
                scope['user'] = await get_user(user_id)
                logger.info(f"[WS Auth] Authenticated user {user_id}")
            except Exception as e:
                logger.error(f"[WS Auth] Token validation failed: {e}")
                scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
