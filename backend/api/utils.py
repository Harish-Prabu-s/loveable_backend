from django.conf import settings

def get_absolute_media_url(path, request=None):
    """
    Safely constructs an absolute URL for a media file.
    - If path is already absolute (starts with http) → returns as-is.
    - If path is relative → prepends MEDIA_URL and builds absolute URI using request.
    """
    if not path:
        return None
    
    path_str = str(path)
    
    if path_str.startswith('http://') or path_str.startswith('https://'):
        return path_str
        
    # Standardize relative path
    clean_path = path_str
    if clean_path.startswith('/'):
        clean_path = clean_path[1:]
        
    # Prefix with MEDIA_URL if not already present
    media_url = settings.MEDIA_URL
    if not clean_path.startswith(media_url.strip('/')):
        # Use simple join to avoid double slashes
        relative_url = f"{media_url}{clean_path}"
    else:
        relative_url = f"/{clean_path}" if not clean_path.startswith('/') else clean_path

    if request:
        return request.build_absolute_uri(relative_url)
    
    return relative_url
