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


class IsHuesped(BasePermission):
    def has_permission(self, request, view):
        return (
            request.user.is_authenticated
            and request.user.role == request.user.Role.HUESPED
        )


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
