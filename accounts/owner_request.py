from django.contrib.auth import get_user_model
from rest_framework.exceptions import ValidationError

User = get_user_model()


def request_owner_role(user) -> tuple[User, bool]:
    """
    Solicita cuenta de propietario para un huésped o reenvía tras un rechazo.
    Devuelve (usuario, notificar) — notificar=False si ya estaba pendiente.
    """
    if user.role == User.Role.ADMINISTRADOR:
        raise ValidationError(
            {"detail": "Los administradores no pueden solicitar cuenta de propietario."}
        )
    if user.role == User.Role.PATROCINADOR:
        raise ValidationError(
            {
                "detail": (
                    "Tu cuenta es de patrocinador. Contacta a soporte si también "
                    "quieres publicar hospedajes."
                )
            }
        )
    if user.role == User.Role.PROPIETARIO:
        if user.owner_status == User.OwnerStatus.APROBADO:
            raise ValidationError({"detail": "Tu cuenta ya está aprobada como propietario."})
        if user.owner_status == User.OwnerStatus.PENDIENTE:
            return user, False
        if user.owner_status == User.OwnerStatus.RECHAZADO:
            user.owner_status = User.OwnerStatus.PENDIENTE
            user.owner_rejection_reason = ""
            user.save(update_fields=["owner_status", "owner_rejection_reason"])
            return user, True

    user.role = User.Role.PROPIETARIO
    user.owner_status = User.OwnerStatus.PENDIENTE
    user.owner_rejection_reason = ""
    user.save(update_fields=["role", "owner_status", "owner_rejection_reason"])
    return user, True
