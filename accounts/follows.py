from django.contrib.auth import get_user_model
from django.db.models import Count

from accounts.models import UserFollow

User = get_user_model()


def followers_count(user) -> int:
    return UserFollow.objects.filter(following=user).count()


def following_count(user) -> int:
    return UserFollow.objects.filter(follower=user).count()


def is_following(follower, target) -> bool:
    if not follower or not follower.is_authenticated:
        return False
    return UserFollow.objects.filter(follower=follower, following=target).exists()


def toggle_follow(follower, target) -> tuple[bool, int]:
    """Devuelve (siguiendo_ahora, total_seguidores_del_target)."""
    if follower.pk == target.pk:
        raise ValueError("No puedes seguirte a ti mismo.")
    existing = UserFollow.objects.filter(follower=follower, following=target).first()
    if existing:
        existing.delete()
        return False, followers_count(target)
    UserFollow.objects.create(follower=follower, following=target)
    return True, followers_count(target)
