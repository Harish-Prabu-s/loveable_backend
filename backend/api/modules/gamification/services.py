from django.contrib.auth.models import User
from django.db.models import F
from ...models import LevelProgress, DailyReward, Badge
from ...models import Wallet, CoinTransaction
from django.utils import timezone

def get_user_level(user: User) -> LevelProgress:
    lp, _ = LevelProgress.objects.get_or_create(user=user)
    return lp

def list_daily_rewards(user: User):
    rewards = DailyReward.objects.filter(user=user).order_by('day')
    if not rewards.exists():
        bulk = []
        for day in range(1, 8):
            bulk.append(DailyReward(user=user, day=day, xp_reward=100, coin_reward=10))
        DailyReward.objects.bulk_create(bulk)
        rewards = DailyReward.objects.filter(user=user).order_by('day')
    return rewards

def claim_daily_reward(user: User, day: int):
    dr = DailyReward.objects.filter(user=user, day=day).first()
    if not dr:
        return None
    if dr.claimed_at:
        return dr
    dr.claimed_at = timezone.now()
    dr.streak = (DailyReward.objects.filter(user=user, claimed_at__isnull=False).count() + 1)
    dr.save()
    w = Wallet.objects.get(user=user)
    w.coin_balance = F('coin_balance') + dr.coin_reward
    w.total_earned = F('total_earned') + dr.coin_reward
    w.save(update_fields=['coin_balance', 'total_earned'])
    CoinTransaction.objects.create(wallet=w, type='credit', transaction_type='earned', amount=dr.coin_reward, description=f'Daily reward day {day}')
    lp = get_user_level(user)
    lp.xp += dr.xp_reward
    # Simple leveling: 1000 xp per level
    lp.level = max(lp.level, (lp.xp // 1000) + 1)
    lp.save()
    return dr

def leaderboard(limit: int = 50):
    return LevelProgress.objects.select_related('user').order_by('-xp')[:limit]
