from celery import shared_task


@shared_task(name="properties.notify_owner_approval")
def notify_owner_approval_task(
    accommodation_id: int, approved: bool, motivo: str = ""
) -> None:
    from .services import _notify_owner_approval_sync

    _notify_owner_approval_sync(accommodation_id, approved, motivo)


@shared_task(name="properties.process_accommodation_photo")
def process_accommodation_photo_task(photo_id: int) -> None:
    """RNF-04: optimización de imagen en segundo plano."""
    from .images import optimize_image_file
    from .models import AccommodationPhoto

    photo = AccommodationPhoto.objects.get(pk=photo_id)
    optimize_image_file(photo.image)
    photo.save(update_fields=["image", "updated_at"])
