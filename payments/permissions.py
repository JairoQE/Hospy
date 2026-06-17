from rest_framework.permissions import BasePermission

from .models import Payment


class IsPaymentPropertyOwner(BasePermission):
    def has_object_permission(self, request, view, obj: Payment):
        return obj.booking.room.accommodation.owner_id == request.user.id
