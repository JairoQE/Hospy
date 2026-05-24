from celery import shared_task


@shared_task(name="reviews.notify_moderated")
def notify_review_moderated_task(review_id: int, approved: bool) -> None:
    from .services import _notify_review_moderated_sync

    _notify_review_moderated_sync(review_id, approved)
