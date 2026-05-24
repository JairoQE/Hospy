from celery import shared_task
from django.conf import settings
from django.core.mail import send_mail


@shared_task(
    bind=True,
    autoretry_for=(Exception,),
    retry_backoff=True,
    retry_kwargs={"max_retries": 3},
    name="hospy.send_email",
)
def send_email_task(self, subject: str, body: str, recipient_list: list[str]) -> int:
    """Envío asíncrono de correos (RNF-04)."""
    return send_mail(
        subject,
        body,
        settings.DEFAULT_FROM_EMAIL,
        recipient_list,
        fail_silently=False,
    )
