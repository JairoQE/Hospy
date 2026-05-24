from django.shortcuts import get_object_or_404
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import InboxItem
from .serializers import InboxItemSerializer, InboxSummarySerializer
from .services import unread_counts


class InboxSummaryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        data = unread_counts(request.user)
        return Response(InboxSummarySerializer(data).data)


class InboxViewSet(viewsets.ReadOnlyModelViewSet):
    """Bandeja de notificaciones y mensajes del usuario autenticado."""

    serializer_class = InboxItemSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def list(self, request, *args, **kwargs):
        channel = request.query_params.get("canal")
        if channel == InboxItem.Channel.MENSAJE:
            from messaging.services import sync_chat_inbox_for_user

            sync_chat_inbox_for_user(request.user)
        return super().list(request, *args, **kwargs)

    def get_queryset(self):
        qs = InboxItem.objects.filter(recipient=self.request.user).select_related(
            "sender"
        )
        channel = self.request.query_params.get("canal")
        if channel in (InboxItem.Channel.NOTIFICACION, InboxItem.Channel.MENSAJE):
            qs = qs.filter(channel=channel)
        if channel == InboxItem.Channel.MENSAJE:
            qs = qs.filter(kind__startswith="chat_conv_")
        unread = self.request.query_params.get("no_leidos")
        if unread in ("1", "true", "yes"):
            qs = qs.filter(is_read=False)
        return qs.order_by("-updated_at", "-created_at")

    @action(detail=True, methods=["post"], url_path="leer")
    def leer(self, request, pk=None):
        item = get_object_or_404(self.get_queryset(), pk=pk)
        if not item.is_read:
            item.is_read = True
            item.save(update_fields=["is_read", "updated_at"])
        return Response(InboxItemSerializer(item).data)

    @action(detail=False, methods=["post"], url_path="leer-todo")
    def leer_todo(self, request):
        qs = InboxItem.objects.filter(recipient=request.user, is_read=False)
        channel = request.query_params.get("canal") or request.data.get("canal")
        if channel in (InboxItem.Channel.NOTIFICACION, InboxItem.Channel.MENSAJE):
            qs = qs.filter(channel=channel)
        updated = qs.update(is_read=True)
        return Response({"marcados": updated, **unread_counts(request.user)})
