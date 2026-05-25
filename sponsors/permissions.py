from rest_framework.permissions import BasePermission


class IsPatrocinador(BasePermission):
    message = (
        "Tu cuenta de patrocinador debe ser aprobada por un administrador "
        "antes de publicar anuncios."
    )

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and user.role == user.Role.PATROCINADOR
            and user.sponsor_status == user.SponsorStatus.APROBADO
        )


class IsPatrocinadorOrAdministrador(BasePermission):
    message = IsPatrocinador.message

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role == user.Role.ADMINISTRADOR:
            return True
        return (
            user.role == user.Role.PATROCINADOR
            and user.sponsor_status == user.SponsorStatus.APROBADO
        )
