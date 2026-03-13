from django.urls import path
from .controllers import feed_view, create_post_view, like_view, delete_post_view, comment_view

urlpatterns = [
    path('feed/', feed_view),
    path('', create_post_view),
    path('<int:post_id>/like/', like_view),
    path('<int:post_id>/comment/', comment_view),
    path('<int:post_id>/', delete_post_view),
]
