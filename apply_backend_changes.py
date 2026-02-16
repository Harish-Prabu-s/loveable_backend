import os
import sys
import django
from pathlib import Path
import re

# Setup paths
BACKEND_DIR = Path(r"D:\backend")
AUTH_CONTROLLERS = BACKEND_DIR / "api" / "modules" / "auth" / "controllers.py"
AUTH_URLS = BACKEND_DIR / "api" / "modules" / "auth" / "urls.py"

def update_auth_controllers():
    print(f"Updating {AUTH_CONTROLLERS}...")
    
    if not os.path.exists(AUTH_CONTROLLERS):
        print(f"File not found: {AUTH_CONTROLLERS}")
        return False
    
    with open(AUTH_CONTROLLERS, 'r', encoding='utf-8') as f:
        content = f.read()

    # Imports to add
    imports = """from django.core.files.storage import default_storage
from django.core.files.base import ContentFile
from django.conf import settings
import os
"""
    if "from django.core.files.storage" not in content:
        # Add imports at the top, after "import ..." blocks if possible, or just at the beginning
        content = imports + content

    # New Logic
    new_verify_otp_logic = """
@api_view(['POST'])
@permission_classes([AllowAny])
def verify_otp_view(request):
    phone = request.data.get('phone_number')
    otp_code = request.data.get('otp_code')
    
    if not phone or not otp_code:
         return Response({'error': 'Phone number and OTP are required'}, status=400)

    user = verify_otp(phone, otp_code)
    
    if not user:
        return Response({'error': 'Invalid OTP'}, status=400)
        
    tokens = create_tokens(user)
    
    # Check if user has profile
    if not hasattr(user, 'profile'):
        from api.models import Profile
        Profile.objects.create(user=user, phone_number=phone)
        user.refresh_from_db()

    p = user.profile
    
    # Check if essential fields are missing to determine if new user
    is_new = (
        not p.display_name or 
        p.display_name == 'User' or 
        not p.gender or 
        not p.email
    )
    
    return Response({
        'access_token': tokens['access'],
        'refresh_token': tokens['refresh'],
        'user': {
            'id': user.id,
            'phone_number': p.phone_number,
            'gender': p.gender,
            'is_verified': p.is_verified,
            'is_online': p.is_online,
            'is_superuser': user.is_superuser,
            'display_name': p.display_name,
            'email': p.email,
            'photo': p.photo if p.photo else None,
            'language': p.language,
            'bio': p.bio,
            'interests': p.interests,
            'date_joined': p.date_joined.isoformat(),
            'last_login': p.last_login.isoformat() if p.last_login else None,
        },
        'is_new_user': is_new,
    })
"""

    new_endpoints = """
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def update_profile_view(request):
    try:
        p = request.user.profile
        
        display_name = request.data.get('display_name')
        email = request.data.get('email')
        bio = request.data.get('bio')
        interests = request.data.get('interests')
        gender = request.data.get('gender')
        language = request.data.get('language')
        
        if display_name:
            p.display_name = display_name
        if email:
            p.email = email
            request.user.email = email
            request.user.save()
        if bio is not None:
            p.bio = bio
        if interests:
            p.interests = interests
        if gender:
            p.gender = gender
        if language:
            p.language = language
            
        p.save()
        
        return Response({
            'success': True,
            'user': {
                'id': request.user.id,
                'phone_number': p.phone_number,
                'gender': p.gender,
                'is_verified': p.is_verified,
                'is_online': p.is_online,
                'display_name': p.display_name,
                'email': p.email,
                'photo': p.photo if p.photo else None,
                'language': p.language,
                'bio': p.bio,
                'interests': p.interests,
            }
        })
    except Exception as e:
        return Response({'error': str(e)}, status=500)

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def upload_avatar_view(request):
    try:
        if 'photo' not in request.FILES:
            return Response({'error': 'No photo provided'}, status=400)
        
        photo = request.FILES['photo']
        p = request.user.profile
        
        filename = f"avatars/{request.user.id}_{photo.name}"
        path = default_storage.save(filename, ContentFile(photo.read()))
        url = request.build_absolute_uri(settings.MEDIA_URL + path)
        
        p.photo = url
        p.save()
        
        return Response({'success': True, 'photo_url': url})
    except Exception as e:
        return Response({'error': str(e)}, status=500)
"""

    # Check if verify_otp_view exists
    if "def verify_otp_view(request):" in content:
        # Regex to match the function body
        # Matches @api_view... def verify_otp_view... up to the next @api_view or end of string
        pattern = r"(@api_view\(\['POST'\]\)\s+)?(@permission_classes\(\[.*?\]\)\s+)?def verify_otp_view\(request\):[\s\S]*?(?=\n@api_view|\Z)"
        
        match = re.search(pattern, content)
        if match:
            print("Found verify_otp_view, replacing...")
            content = content.replace(match.group(0), new_verify_otp_logic.strip())
        else:
            print("Could not match verify_otp_view with regex, appending new version...")
            # If we append, we might have duplicates. 
            # Comment out the old one if we can find the line?
            content = content.replace("def verify_otp_view(request):", "def verify_otp_view_OLD(request):")
            content += "\n" + new_verify_otp_logic
    else:
        print("verify_otp_view not found, appending...")
        content += "\n" + new_verify_otp_logic

    if "def update_profile_view" not in content:
        content += "\n" + new_endpoints
        print("Added update_profile_view and upload_avatar_view")

    with open(AUTH_CONTROLLERS, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated auth/controllers.py")
    return True

def update_auth_urls():
    print(f"Updating {AUTH_URLS}...")
    
    if not os.path.exists(AUTH_URLS):
        print(f"File not found: {AUTH_URLS}")
        return False
    
    with open(AUTH_URLS, 'r', encoding='utf-8') as f:
        content = f.read()
        
    # Check imports
    if "update_profile_view" not in content:
        # Find the import line from .controllers
        # Usually: from .controllers import verify_otp_view, ...
        # Or: from . import controllers
        
        if "from .controllers import" in content:
            # We assume it's a single line or multiline.
            # Let's just replace "from .controllers import" with "from .controllers import update_profile_view, upload_avatar_view, "
            content = content.replace("from .controllers import", "from .controllers import update_profile_view, upload_avatar_view, ")
        else:
            # If not found, maybe append?
            # Or add a new import line
            content = "from .controllers import update_profile_view, upload_avatar_view\n" + content
    
    # Add url patterns
    if "path('update-profile/'," not in content:
        # Find urlpatterns = [
        # Insert before ]
        if "urlpatterns = [" in content:
            new_patterns = """
    path('update-profile/', update_profile_view, name='update-profile'),
    path('upload-avatar/', upload_avatar_view, name='upload-avatar'),
"""
            last_bracket = content.rfind("]")
            if last_bracket != -1:
                content = content[:last_bracket] + new_patterns + content[last_bracket:]
                print("Added URL patterns")
    
    with open(AUTH_URLS, 'w', encoding='utf-8') as f:
        f.write(content)
    print("Updated auth/urls.py")
    return True

if __name__ == "__main__":
    if update_auth_controllers():
        update_auth_urls()
