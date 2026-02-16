from django.contrib.auth.models import User
from django.db import models
from django.utils import timezone
from decimal import Decimal

class Profile(models.Model):
    GENDER_CHOICES = (
        ('M', 'Male'),
        ('F', 'Female'),
        ('O', 'Other'),
    )
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    phone_number = models.CharField(max_length=20, unique=True)
    gender = models.CharField(max_length=1, choices=GENDER_CHOICES, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    is_online = models.BooleanField(default=False)
    is_busy = models.BooleanField(default=False)
    date_joined = models.DateTimeField(default=timezone.now)
    last_login = models.DateTimeField(null=True, blank=True)
    email = models.EmailField(null=True, blank=True)
    display_name = models.CharField(max_length=120, default='User')
    bio = models.TextField(blank=True)
    photo = models.ImageField(upload_to='profiles/', null=True, blank=True)
    interests = models.JSONField(default=list, blank=True)
    age = models.IntegerField(null=True, blank=True)
    location = models.CharField(max_length=120, null=True, blank=True)
    language = models.CharField(max_length=10, default='en')
    app_lock_enabled = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class OTP(models.Model):
    phone_number = models.CharField(max_length=20)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

class EmailOTP(models.Model):
    email = models.EmailField()
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

class Wallet(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='wallet')
    coin_balance = models.IntegerField(default=0)
    total_earned = models.IntegerField(default=0)
    total_spent = models.IntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

class CoinTransaction(models.Model):
    wallet = models.ForeignKey(Wallet, on_delete=models.CASCADE, related_name='transactions')
    type = models.CharField(max_length=10)  # credit/debit
    transaction_type = models.CharField(max_length=20)  # purchase/spent/earned/withdrawal
    amount = models.IntegerField()
    description = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)

class DeletionRequest(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    reason = models.TextField()
    token = models.CharField(max_length=128, unique=True)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_confirmed = models.BooleanField(default=False)

class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=10, default='INR')
    razorpay_order_id = models.CharField(max_length=100)
    razorpay_payment_id = models.CharField(max_length=100, null=True, blank=True)
    razorpay_signature = models.CharField(max_length=200, null=True, blank=True)
    status = models.CharField(max_length=20, default='pending')  # pending/completed/failed
    coins_added = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Withdrawal(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    amount = models.IntegerField()
    account_number = models.CharField(max_length=30)
    ifsc_code = models.CharField(max_length=20)
    account_holder_name = models.CharField(max_length=120)
    status = models.CharField(max_length=20, default='pending')  # pending/approved/rejected
    created_at = models.DateTimeField(auto_now_add=True)

class Game(models.Model):
    CATEGORY_CHOICES = (
        ('LUDO', 'Ludo'),
        ('CARROM', 'Carrom'),
        ('FRUIT', 'Fruit Cutting'),
        ('MATCH3', 'Match 3'),
    )
    name = models.CharField(max_length=100)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

class GameSession(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)
    result = models.CharField(max_length=50, null=True, blank=True)
    score = models.IntegerField(default=0)
    coins_spent = models.IntegerField(default=0)

class Gift(models.Model):
    name = models.CharField(max_length=100)
    icon = models.CharField(max_length=50)  # emoji or icon name
    cost = models.IntegerField(default=10)
    created_at = models.DateTimeField(auto_now_add=True)

class GiftTransaction(models.Model):
    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_gifts')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_gifts')
    gift = models.ForeignKey(Gift, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

class LevelProgress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='levels')
    level = models.IntegerField(default=1)
    xp = models.IntegerField(default=0)
    last_updated = models.DateTimeField(auto_now=True)

class Badge(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=200, blank=True)
    earned_at = models.DateTimeField(null=True, blank=True)

class DailyReward(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    day = models.IntegerField()
    xp_reward = models.IntegerField(default=0)
    coin_reward = models.IntegerField(default=0)
    claimed_at = models.DateTimeField(null=True, blank=True)
    streak = models.IntegerField(default=0)

class Offer(models.Model):
    TYPE_CHOICES = (
        ('coin_package', 'Coin Package'),
        ('discount', 'Discount'),
        ('bundle', 'Bundle'),
    )
    title = models.CharField(max_length=120)
    description = models.TextField(blank=True)
    offer_type = models.CharField(max_length=20, choices=TYPE_CHOICES, default='coin_package')
    price = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'))
    currency = models.CharField(max_length=10, default='INR')
    coins_awarded = models.IntegerField(default=0)
    
    gender_target = models.CharField(max_length=1, choices=Profile.GENDER_CHOICES, null=True, blank=True)
    level_min = models.IntegerField(default=1)
    discount_coins = models.IntegerField(default=0)
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

class LeagueTier(models.Model):
    name = models.CharField(max_length=50)
    min_points = models.IntegerField(default=0)
    max_points = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class CallSession(models.Model):
    CALL_TYPE_CHOICES = (
        ('VOICE', 'Voice'),
        ('VIDEO', 'Video'),
        ('LIVE', 'Live'),
    )
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_made')
    callee = models.ForeignKey(User, on_delete=models.CASCADE, related_name='calls_received')
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES)
    duration_seconds = models.IntegerField(default=0)
    coins_per_min = models.IntegerField(default=0)
    coins_spent = models.IntegerField(default=0)
    started_at = models.DateTimeField(default=timezone.now)
    ended_at = models.DateTimeField(null=True, blank=True)

class Room(models.Model):
    CALL_TYPE_CHOICES = (
        ('audio', 'Audio'),
        ('video', 'Video'),
    )
    caller = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rooms_started')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='rooms_received')
    call_type = models.CharField(max_length=10, choices=CALL_TYPE_CHOICES)
    status = models.CharField(max_length=10, default='pending')  # pending/active/ended
    started_at = models.DateTimeField(null=True, blank=True)
    ended_at = models.DateTimeField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    coins_spent = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Message(models.Model):
    room = models.ForeignKey(Room, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(User, on_delete=models.CASCADE)
    content = models.TextField()
    type = models.CharField(max_length=50, default='text')
    media_url = models.URLField(null=True, blank=True)
    duration_seconds = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

class Story(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    image_url = models.URLField()
    timestamp = models.DateTimeField(default=timezone.now)

class StoryView(models.Model):
    story = models.ForeignKey(Story, on_delete=models.CASCADE, related_name='views')
    viewer = models.ForeignKey(User, on_delete=models.CASCADE)
    viewed_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('story', 'viewer')

class Report(models.Model):
    REASON_CHOICES = (
        ('abuse', 'Abuse/Harassment'),
        ('nudity', 'Nudity/Inappropriate Content'),
        ('spam', 'Spam/Scam'),
        ('other', 'Other'),
    )
    reporter = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_made')
    reported_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='reports_received')
    reason = models.CharField(max_length=20, choices=REASON_CHOICES)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)

class Follow(models.Model):
    follower = models.ForeignKey(User, on_delete=models.CASCADE, related_name='following')
    following = models.ForeignKey(User, on_delete=models.CASCADE, related_name='followers')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('follower', 'following')

class FriendRequest(models.Model):
    from_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_friend_requests')
    to_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_friend_requests')
    status = models.CharField(max_length=20, default='pending')  # pending/accepted/rejected
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('from_user', 'to_user')
