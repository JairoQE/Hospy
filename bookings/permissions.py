from rest_framework.permissions import BasePermission

from .models import Booking


class IsBookingGuest(BasePermission):
    def has_object_permission(self, request, view, obj: Booking):
        return obj.guest_id == request.user.id


class IsBookingPropertyOwner(BasePermission):
    def has_object_permission(self, request, view, obj: Booking):
        return obj.room.accommodation.owner_id == request.user.id


class CanCancelBooking(BasePermission):
    def has_object_permission(self, request, view, obj: Booking):
        if request.user.role == request.user.Role.ADMINISTRADOR:
            return True
        if obj.guest_id == request.user.id:
            return True
        return obj.room.accommodation.owner_id == request.user.id
