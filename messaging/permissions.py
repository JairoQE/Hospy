from rest_framework.permissions import BasePermission


class IsConversationParticipant(BasePermission):
    def has_object_permission(self, request, view, obj):
        user = request.user
        return user.is_authenticated and user.id in (obj.guest_id, obj.owner_id)
