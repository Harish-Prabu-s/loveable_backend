import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'vibely_backend.settings')
django.setup()

from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser, User
from rest_framework_simplejwt.tokens import AccessToken
from django.db import close_old_connections
from urllib.parse import parse_qs, unquote
from rest_framework_simplejwt.exceptions import TokenError, InvalidToken

class JWTAuthMiddleware:
    """
    Custom middleware that takes a token from the query string and authenticates the user.
    """
    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        close_old_connections()

        # Get the token from query string
        query_string = parse_qs(scope['query_string'].decode())
        token_raw = query_string.get('token')

        if not token_raw:
            scope['user'] = AnonymousUser()
        else:
            try:
                # Decrypt/Unquote URL-encoded token
                token_str = unquote(token_raw[0])
                
                # Validate the token
                try:
                    access_token = AccessToken(token_str)
                    user_id = access_token['user_id']
                    
                    # Get the user from the database
                    scope['user'] = await get_user(user_id)
                    if not scope['user'] or scope['user'].is_anonymous:
                        logger.error(f"[WS Auth] User ID {user_id} NOT FOUND in database")
                    else:
                        logger.info(f"[WS Auth] Authenticated User: {user_id}")
                except (TokenError, InvalidToken) as te:
                    logger.error(f"[WS Auth] TOKEN FAILED: {str(te)}")
                    scope['user'] = AnonymousUser()
            except Exception as e:
                logger.error(f"[WS Auth] SYSTEM ERROR during auth: {str(e)}")
                scope['user'] = AnonymousUser()

        return await self.inner(scope, receive, send)

def JWTAuthMiddlewareStack(inner):
    return JWTAuthMiddleware(inner)
