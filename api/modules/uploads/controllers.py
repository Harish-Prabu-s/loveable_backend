from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from django.core.files.storage import default_storage
from django.conf import settings
import os
import uuid

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file_view(request):
    if 'file' not in request.FILES:
        return Response({'error': 'No file provided'}, status=400)
    
    file_obj = request.FILES['file']
    file_type = request.data.get('type', 'misc')
    
    # Generate unique filename
    ext = os.path.splitext(file_obj.name)[1]
    filename = f"{uuid.uuid4()}{ext}"
    
    # Path based on type
    path = f"uploads/{file_type}/{filename}"
    
    # Save file
    file_name = default_storage.save(path, file_obj)
    file_url = request.build_absolute_uri(settings.MEDIA_URL + file_name)
    
    return Response({
        'url': file_url,
        'filename': file_name,
        'type': file_type
    })
