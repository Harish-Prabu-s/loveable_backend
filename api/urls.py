from django.urls import path, include
from . import views

urlpatterns = [
    path('auth/', include('api.modules.auth.urls')),

    path('wallet/', include('api.modules.wallet.urls')),
    path('games/', include('api.modules.games.urls')),
    path('gamification/', include('api.modules.gamification.urls')),
    path('offers/', include('api.modules.offers.urls')),
    path('profiles/', include('api.modules.profiles.urls')),
    path('stories/', include('api.modules.stories.urls')),
    path('chat/', include('api.modules.chat.urls')),
    path('reports/', include('api.modules.reports.urls')),
    path('gifts/', include('api.modules.gifts.urls')),
    path('uploads/', include('api.modules.uploads.urls')),
    path('admin/', include('api.modules.admin.urls')),

    # Legacy endpoints remain accessible if needed
    path('health/', views.health_check),
    path('webhook', views.whatsapp_webhook),
    # path('auth/me/', views.me),
    # path('wallet/', views.wallet),
    # path('wallet/transactions/', views.wallet_transactions),
    # path('account/delete/request/', views.delete_request),
    # path('account/delete/confirm/', views.delete_confirm),
]
