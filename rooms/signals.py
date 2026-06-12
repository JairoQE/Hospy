from datetime import timedelta

from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import Room, RoomBasePriceHistory


@receiver(post_save, sender=Room)
def record_room_base_price_history(sender, instance: Room, created, **kwargs):
    today = timezone.localdate()
    effective_from = (
        timezone.localtime(instance.created_at).date()
        if created and instance.created_at
        else today
    )

    latest = (
        RoomBasePriceHistory.objects.filter(room=instance)
        .order_by("-effective_from", "-recorded_at")
        .first()
    )
    if latest and latest.base_price == instance.base_price and latest.effective_from <= today:
        return

    if (
        latest
        and latest.base_price == instance.base_price
        and latest.effective_from == effective_from
    ):
        return

    RoomBasePriceHistory.objects.create(
        room=instance,
        base_price=instance.base_price,
        effective_from=effective_from,
    )
