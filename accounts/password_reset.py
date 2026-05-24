from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode

User = get_user_model()


def build_password_reset_email(user: User) -> tuple[str, str]:
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    token = default_token_generator.make_token(user)
    frontend = getattr(settings, "FRONTEND_URL", "http://localhost:3000")
    link = f"{frontend}/restablecer-contrasena?uid={uid}&token={token}"
    subject = "Hospy: restablecer contraseña"
    body = (
        f"Hola {user.first_name},\n\n"
        f"Usa este enlace para restablecer tu contraseña:\n{link}\n\n"
        f"Si no solicitaste esto, ignora este mensaje.\n\n— Equipo Hospy"
    )
    return subject, body


def send_password_reset_email(user: User) -> None:
    from .tasks import send_password_reset_email_task

    send_password_reset_email_task.delay(user.pk)


def reset_password(uid: str, token: str, new_password: str) -> User:
    try:
        user_id = force_str(urlsafe_base64_decode(uid))
        user = User.objects.get(pk=user_id)
    except (TypeError, ValueError, OverflowError, User.DoesNotExist):
        raise ValueError("Enlace inválido o expirado.") from None

    if not default_token_generator.check_token(user, token):
        raise ValueError("Enlace inválido o expirado.")

    user.set_password(new_password)
    user.save(update_fields=["password"])
    return user
