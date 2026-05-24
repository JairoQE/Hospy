from rest_framework.permissions import BasePermission, SAFE_METHODS


class IsAccommodationOwner(BasePermission):
    """RNF-09: solo el propietario dueño puede modificar su hospedaje."""

    def has_object_permission(self, request, view, obj):
        return request.user.is_authenticated and obj.owner_id == request.user.id


class IsAccommodationOwnerOrReadOnly(BasePermission):
    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        return request.user.is_authenticated and obj.owner_id == request.user.id
