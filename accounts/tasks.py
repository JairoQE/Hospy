from celery import shared_task
from django.contrib.auth import get_user_model

from config.tasks import send_email_task

from .password_reset import build_password_reset_email


@shared_task(name="accounts.send_password_reset")
def send_password_reset_email_task(user_id: int) -> None:
    User = get_user_model()
    user = User.objects.get(pk=user_id)
    subject, body = build_password_reset_email(user)
    send_email_task.delay(subject, body, [user.email])
