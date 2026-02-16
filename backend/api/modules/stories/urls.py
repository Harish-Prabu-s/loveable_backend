from django.urls import path
from .controllers import list_stories_view, create_story_view, upload_story_media_view, view_story_view, list_story_views_view

urlpatterns = [
    path('', list_stories_view),
    path('create/', create_story_view),
    path('upload/', upload_story_media_view),
    path('<int:story_id>/view/', view_story_view),
    path('<int:story_id>/views/', list_story_views_view),
]
