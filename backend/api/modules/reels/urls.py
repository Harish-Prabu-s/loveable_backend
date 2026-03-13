from django.urls import path
from .controllers import list_reels_view, create_reel_view, upload_reel_media_view, like_reel_view, comment_reel_view

urlpatterns = [
    path('', list_reels_view),
    path('create/', create_reel_view),
    path('upload/', upload_reel_media_view),
    path('<int:pk>/like/', like_reel_view),
    path('<int:pk>/comment/', comment_reel_view),
]
