from celery import shared_task


@shared_task(name="rooms.process_room_photo")
def process_room_photo_task(photo_id: int) -> None:
    from properties.images import optimize_image_file

    from .models import RoomPhoto

    photo = RoomPhoto.objects.get(pk=photo_id)
    optimize_image_file(photo.image)
    photo.save(update_fields=["image", "updated_at"])
