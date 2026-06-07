from django.conf import settings


def queue_email(subject: str, body: str, recipient: str) -> None:
    """
    Encola un email en Celery.
    Con CELERY_TASK_ALWAYS_EAGER=True se envía de forma síncrona (tests / SQLite).
    """
    from config.tasks import send_email_task

    try:
        send_email_task.delay(subject, body, [recipient])
    except Exception:
        import logging

        logging.getLogger(__name__).exception(
            "No se pudo encolar/enviar correo a %s", recipient
        )
