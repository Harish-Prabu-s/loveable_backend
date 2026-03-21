from .controllers import upload_streak, view_streaks, add_comment, list_comments, get_streak_upload, view_streaks_snapchat
from django.urls import path
urlpatterns = [
    path('', view_streaks),
    path('view/', view_streaks_snapchat),
    path('upload/', upload_streak),
    path('<int:upload_id>/', get_streak_upload),
    path('<int:upload_id>/comment/', add_comment),
    path('<int:upload_id>/comments/', list_comments),
]
