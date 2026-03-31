import os
from django.conf import settings

def get_absolute_media_url(path, request=None):
    """
    Safely constructs an absolute URL for a media file.
    - If path is already absolute → ensures it uses HTTPS if requested/in prod.
    - If path is relative → prepends MEDIA_URL and builds absolute URI using request.
    """
    if not path:
        return None
    
    path_str = str(path)
    is_production = os.environ.get('ENV') == 'production'
    
    # 🔗 Fix protocol if already absolute
    if path_str.startswith('http://') or path_str.startswith('https://'):
        if (is_production or (request and request.is_secure())) and path_str.startswith('http://'):
            return path_str.replace('http://', 'https://', 1)
        return path_str
        
    # Standardize relative path
    clean_path = path_str.lstrip('/')
        
    # Prefix with MEDIA_URL if not already present
    media_url = settings.MEDIA_URL.rstrip('/')
    media_url_clean = media_url.lstrip('/')
    
    if not clean_path.startswith(media_url_clean):
        # Use simple join to avoid double slashes
        relative_url = f"/{media_url_clean}/{clean_path}"
    else:
        relative_url = f"/{clean_path}"

    if request:
        absolute_url = request.build_absolute_uri(relative_url)
        # Ensure the generated absolute URI matches the secure state
        if (is_production or request.is_secure()) and absolute_url.startswith('http://'):
            return absolute_url.replace('http://', 'https://', 1)
        return absolute_url
    
    return relative_url
