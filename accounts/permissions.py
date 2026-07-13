from rest_framework.permissions import BasePermission


class IsPropietario(BasePermission):
    message = (
        "Tu cuenta de propietario debe ser aprobada por un administrador "
        "antes de gestionar hospedajes."
    )

    def has_permission(self, request, view):
        user = request.user
        return (
            user.is_authenticated
            and user.role == user.Role.PROPIETARIO
            and user.owner_status == user.OwnerStatus.APROBADO
        )


class IsAdministrador(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == request.user.Role.ADMINISTRADOR
        )


class CanBookAsGuest(BasePermission):
    """
    Permite reservar/pagar/reseñar como huésped a cualquier usuario autenticado.
    Propietarios, admins y patrocinadores también pueden alquilar (multirol).
    """

    message = "Debes iniciar sesión para reservar."

    def has_permission(self, request, view):
        return request.user.is_authenticated


class IsHuesped(CanBookAsGuest):
    """Compatibilidad: ya no exige role==huesped; equivale a CanBookAsGuest."""


class IsPropietarioOrAdministrador(BasePermission):
    message = IsPropietario.message

    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated:
            return False
        if user.role == user.Role.ADMINISTRADOR:
            return True
        return (
            user.role == user.Role.PROPIETARIO
            and user.owner_status == user.OwnerStatus.APROBADO
        )
