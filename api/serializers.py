from django.contrib.auth.models import User
from rest_framework import serializers
from django.conf import settings
from .models import (
    Profile, Wallet, CoinTransaction, Payment, Withdrawal,
    Game, LevelProgress, Offer, LeagueTier, CallSession,
    Badge, DailyReward, Room, Message, Story, Gift, GiftTransaction, StoryView, Follow
)

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'last_login', 'date_joined']

class ProfileSerializer(serializers.ModelSerializer):
    is_following = serializers.SerializerMethodField()
    followers_count = serializers.SerializerMethodField()
    following_count = serializers.SerializerMethodField()
    friend_request_status = serializers.SerializerMethodField()
    photo = serializers.SerializerMethodField()
    is_busy = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id', 'user', 'phone_number', 'gender', 'is_verified', 'is_online', 'is_busy',
            'date_joined', 'last_login', 'email', 'display_name', 'bio', 'photo',
            'interests', 'age', 'location', 'language', 'app_lock_enabled',
            'created_at', 'updated_at', 'is_following', 'followers_count', 'following_count',
            'friend_request_status'
        ]

    def get_is_busy(self, obj):
        from .modules.chat.services import presence_status
        return presence_status(obj.user.id) == 'busy'

    def get_photo(self, obj):
        request = self.context.get('request')
        # Handle legacy cases where ImageField name mistakenly stores a full URL
        if obj.photo and hasattr(obj.photo, 'name') and obj.photo.name:
            name = obj.photo.name  # type: ignore[attr-defined]
            if isinstance(name, str) and name.startswith('http'):
                try:
                    idx = name.find('/media/')
                    media_path = name[idx + len('/media/'):] if idx != -1 else name
                    url_path = settings.MEDIA_URL + media_path
                    return request.build_absolute_uri(url_path) if request else url_path
                except Exception:
                    return None
            try:
                return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url
            except Exception:
                return None
        return None

    def get_is_following(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            # Check if Follow model exists and check relation
            return Follow.objects.filter(follower=request.user, following=obj.user).exists()
        return False

    def get_followers_count(self, obj):
        return Follow.objects.filter(following=obj.user).count()

    def get_following_count(self, obj):
        return Follow.objects.filter(follower=obj.user).count()

    def get_friend_request_status(self, obj):
        request = self.context.get('request')
        if request and getattr(request, 'user', None) and request.user.is_authenticated:
            try:
                from .models import FriendRequest
                # Case 1: I sent a request to them (return primitives only)
                sent = (FriendRequest.objects
                        .filter(from_user=request.user, to_user=obj.user)
                        .values('id', 'status')
                        .first())
                if sent:
                    return {'status': str(sent['status']), 'direction': 'sent', 'id': int(sent['id'])}
                
                # Case 2: They sent a request to me
                received = (FriendRequest.objects
                            .filter(from_user=obj.user, to_user=request.user)
                            .values('id', 'status')
                            .first())
                if received:
                    return {'status': str(received['status']), 'direction': 'received', 'id': int(received['id'])}
            except Exception:
                return None
        return None

class WalletSerializer(serializers.ModelSerializer):
    has_purchased = serializers.SerializerMethodField()

    class Meta:
        model = Wallet
        fields = ['id', 'user', 'coin_balance', 'total_earned', 'total_spent', 'updated_at', 'has_purchased']

    def get_has_purchased(self, obj):
        return obj.transactions.filter(transaction_type='purchase').exists()

class CoinTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CoinTransaction
        fields = ['id', 'wallet', 'type', 'transaction_type', 'amount', 'description', 'created_at']

class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'user', 'amount', 'currency', 'razorpay_order_id', 'razorpay_payment_id', 'razorpay_signature', 'status', 'coins_added', 'created_at']

class WithdrawalSerializer(serializers.ModelSerializer):
    class Meta:
        model = Withdrawal
        fields = ['id', 'user', 'amount', 'account_number', 'ifsc_code', 'account_holder_name', 'status', 'created_at']

class GameSerializer(serializers.ModelSerializer):
    class Meta:
        model = Game
        fields = ['id', 'name', 'category', 'is_active', 'created_at']

class LevelProgressSerializer(serializers.ModelSerializer):
    class Meta:
        model = LevelProgress
        fields = ['id', 'user', 'level', 'xp', 'last_updated']

class OfferSerializer(serializers.ModelSerializer):
    class Meta:
        model = Offer
        fields = ['id', 'title', 'description', 'offer_type', 'price', 'currency', 'coins_awarded', 'gender_target', 'level_min', 'discount_coins', 'start_time', 'end_time', 'is_active']

class LeagueTierSerializer(serializers.ModelSerializer):
    class Meta:
        model = LeagueTier
        fields = ['id', 'name', 'min_points', 'max_points', 'created_at']

class CallSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = CallSession
        fields = ['id', 'caller', 'callee', 'call_type', 'duration_seconds', 'coins_per_min', 'coins_spent', 'started_at', 'ended_at']

class BadgeSerializer(serializers.ModelSerializer):
    class Meta:
        model = Badge
        fields = ['id', 'user', 'name', 'description', 'icon', 'earned_at']

class DailyRewardSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyReward
        fields = ['id', 'user', 'day', 'xp_reward', 'coin_reward', 'claimed_at', 'streak']

class RoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ['id', 'caller', 'receiver', 'call_type', 'status', 'started_at', 'ended_at', 'duration_seconds', 'coins_spent', 'created_at']

class MessageSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = ['id', 'room', 'sender', 'content', 'type', 'media_url', 'duration_seconds', 'created_at']

class StorySerializer(serializers.ModelSerializer):
    user_display_name = serializers.CharField(source='user.profile.display_name', read_only=True)
    user_avatar = serializers.SerializerMethodField()
    view_count = serializers.IntegerField(source='views.count', read_only=True)

    class Meta:
        model = Story
        fields = ['id', 'user', 'image_url', 'timestamp', 'user_display_name', 'user_avatar', 'view_count']

    def get_user_avatar(self, obj):
        profile = obj.user.profile
        request = self.context.get('request')
        if profile.photo and hasattr(profile.photo, 'name') and profile.photo.name:
            name = profile.photo.name  # type: ignore[attr-defined]
            if isinstance(name, str) and name.startswith('http'):
                try:
                    idx = name.find('/media/')
                    media_path = name[idx + len('/media/'):] if idx != -1 else name
                    url_path = settings.MEDIA_URL + media_path
                    return request.build_absolute_uri(url_path) if request else url_path
                except Exception:
                    return None
            try:
                return request.build_absolute_uri(profile.photo.url) if request else profile.photo.url
            except Exception:
                return None
        return None

class StoryViewSerializer(serializers.ModelSerializer):
    viewer_name = serializers.CharField(source='viewer.profile.display_name', read_only=True)
    viewer_avatar = serializers.SerializerMethodField()

    class Meta:
        model = StoryView
        fields = ['id', 'viewer', 'viewer_name', 'viewer_avatar', 'viewed_at']

    def get_viewer_avatar(self, obj):
        profile = obj.viewer.profile
        request = self.context.get('request')
        if profile.photo and hasattr(profile.photo, 'name') and profile.photo.name:
            name = profile.photo.name  # type: ignore[attr-defined]
            if isinstance(name, str) and name.startswith('http'):
                try:
                    idx = name.find('/media/')
                    media_path = name[idx + len('/media/'):] if idx != -1 else name
                    url_path = settings.MEDIA_URL + media_path
                    return request.build_absolute_uri(url_path) if request else url_path
                except Exception:
                    return None
            try:
                return request.build_absolute_uri(profile.photo.url) if request else profile.photo.url
            except Exception:
                return None
        return None

class GiftSerializer(serializers.ModelSerializer):
    class Meta:
        model = Gift
        fields = ['id', 'name', 'icon', 'cost']

class GiftTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = GiftTransaction
        fields = ['id', 'sender', 'receiver', 'gift', 'created_at']
