from django.conf import settings


def queue_email(subject: str, body: str, recipient: str) -> None:
    """
    Encola un email en Celery.
    Con CELERY_TASK_ALWAYS_EAGER=True se envía de forma síncrona (tests / SQLite).
    """
    from config.tasks import send_email_task

    send_email_task.delay(subject, body, [recipient])
