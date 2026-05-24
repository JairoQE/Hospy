from rest_framework.permissions import BasePermission


class IsRoomOwner(BasePermission):
    """Solo el propietario del hospedaje puede gestionar la habitación."""

    def has_object_permission(self, request, view, obj):
        return (
            request.user.is_authenticated
            and obj.accommodation.owner_id == request.user.id
        )
