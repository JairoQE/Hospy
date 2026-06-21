from django.db.models import Count, Q
from django.shortcuts import get_object_or_404
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.models import User
from accounts.permissions import IsAdministrador
from audit.services import log_action

from .models import Conversation, Message, MessageReport
from .permissions import IsConversationParticipant
from .serializers import (
    ConversationCreateSerializer,
    ConversationSerializer,
    MessageCreateSerializer,
    MessageReportAdminSerializer,
    MessageReportCreateSerializer,
    MessageReportResolveSerializer,
    MessageSerializer,
    user_photo_url,
)
from .services import (
    get_or_create_conversation,
    get_public_accommodation,
    mark_chat_inbox_read,
    mark_conversation_read,
    report_message,
    resolve_message_report,
    send_message,
)


def _serialize_conversation_messages(conv, request, *, mark_read: bool = True):
    if mark_read:
        mark_conversation_read(conversation=conv, user=request.user)
        mark_chat_inbox_read(conversation_id=conv.pk, user=request.user)
        conv.refresh_from_db(fields=["guest_last_read_at", "owner_last_read_at"])
    messages = conv.messages.select_related("sender").order_by("created_at")
    return MessageSerializer(
        messages,
        many=True,
        context={"request": request, "conversation": conv},
    ).data


class ConversationViewSet(
    mixins.ListModelMixin,
    mixins.RetrieveModelMixin,
    mixins.CreateModelMixin,
    viewsets.GenericViewSet,
):
    """Conversaciones del usuario autenticado (huésped o propietario)."""

    serializer_class = ConversationSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = None

    def get_queryset(self):
        user = self.request.user
        qs = Conversation.objects.select_related(
            "accommodation", "guest", "owner"
        ).prefetch_related("messages")
        if user.role == User.Role.PROPIETARIO:
            qs = qs.filter(owner=user)
        elif user.role == User.Role.HUESPED:
            qs = qs.filter(guest=user)
        else:
            qs = qs.filter(guest=user) | qs.filter(owner=user)
        accommodation_id = self.request.query_params.get("hospedaje")
        if accommodation_id:
            qs = qs.filter(accommodation_id=accommodation_id)
        return qs.order_by("-last_message_at", "-created_at")

    def get_permissions(self):
        if self.action == "retrieve":
            return [permissions.IsAuthenticated(), IsConversationParticipant()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        if request.user.role not in (User.Role.HUESPED, User.Role.ADMINISTRADOR):
            raise PermissionDenied(
                "Solo los huéspedes o el equipo Hospy pueden iniciar una consulta."
            )

        ser = ConversationCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        accommodation = get_public_accommodation(ser.validated_data["accommodation"])
        if accommodation.owner_id == request.user.id:
            raise PermissionDenied("No puedes enviarte mensajes a tu propio hospedaje.")

        conv = get_or_create_conversation(
            accommodation=accommodation, guest=request.user
        )
        return Response(
            ConversationSerializer(conv, context={"request": request}).data,
            status=status.HTTP_200_OK,
        )

    @action(detail=True, methods=["get", "post"], url_path="mensajes")
    def mensajes(self, request, pk=None):
        conv = get_object_or_404(
            Conversation.objects.select_related("accommodation"),
            pk=pk,
        )
        is_admin = request.user.role == User.Role.ADMINISTRADOR
        if not is_admin and request.user.id not in (conv.guest_id, conv.owner_id):
            raise PermissionDenied()

        if request.method == "GET":
            return Response(
                _serialize_conversation_messages(
                    conv, request, mark_read=not is_admin
                )
            )

        if is_admin:
            raise PermissionDenied("Los administradores solo pueden leer el hilo.")

        ser = MessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            msg = send_message(
                conversation=conv,
                sender=request.user,
                body=ser.validated_data["body"],
            )
        except ValueError as exc:
            raise ValidationError({"body": str(exc)}) from exc

        conv.refresh_from_db(fields=["guest_last_read_at", "owner_last_read_at"])
        return Response(
            MessageSerializer(
                msg, context={"request": request, "conversation": conv}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=False, methods=["get"], url_path="plataforma")
    def plataforma(self, request):
        """Listado de todas las conversaciones (solo administradores)."""
        if request.user.role != User.Role.ADMINISTRADOR:
            raise PermissionDenied()

        qs = (
            Conversation.objects.select_related("accommodation", "guest", "owner")
            .annotate(message_count=Count("messages"))
            .order_by("-last_message_at", "-created_at")
        )
        q = (request.query_params.get("q") or "").strip()
        if q:
            qs = qs.filter(
                Q(accommodation__name__icontains=q)
                | Q(guest__email__icontains=q)
                | Q(guest__first_name__icontains=q)
                | Q(guest__last_name__icontains=q)
                | Q(owner__email__icontains=q)
                | Q(owner__first_name__icontains=q)
                | Q(owner__last_name__icontains=q)
            )
        return Response(
            ConversationSerializer(qs, many=True, context={"request": request}).data
        )

    @action(detail=True, methods=["post"], url_path="leer-bandeja")
    def leer_bandeja(self, request, pk=None):
        conv = get_object_or_404(Conversation, pk=pk)
        if request.user.id not in (conv.guest_id, conv.owner_id):
            raise PermissionDenied()
        mark_conversation_read(conversation=conv, user=request.user)
        mark_chat_inbox_read(conversation_id=conv.pk, user=request.user)
        return Response({"ok": True})


class AccommodationInquiryView(APIView):
    """
    GET/POST /hospedajes/{pk}/consulta/
    Abre o continúa el chat con el propietario (huésped autenticado).
    """

    permission_classes = [permissions.IsAuthenticated]

    def _require_inquiry_access(self, request, accommodation):
        if request.user.role not in (User.Role.HUESPED, User.Role.ADMINISTRADOR):
            raise PermissionDenied(
                "Solo los huéspedes o el equipo Hospy pueden consultar al anfitrión."
            )
        if accommodation.owner_id == request.user.id:
            raise PermissionDenied("No puedes consultar tu propio hospedaje.")

    def get(self, request, pk):
        accommodation = get_public_accommodation(pk)
        self._require_inquiry_access(request, accommodation)
        conv = Conversation.objects.filter(
            accommodation=accommodation, guest=request.user
        ).first()
        owner = accommodation.owner
        owner_payload = {
            "propietario_id": owner.id,
            "propietario_nombre": _owner_name(owner),
            "propietario_foto_url": user_photo_url(owner),
        }
        if not conv:
            return Response(
                {
                    "conversation": None,
                    "messages": [],
                    **owner_payload,
                }
            )
        return Response(
            {
                "conversation": ConversationSerializer(
                    conv, context={"request": request}
                ).data,
                "messages": _serialize_conversation_messages(conv, request),
                **owner_payload,
            }
        )

    def post(self, request, pk):
        accommodation = get_public_accommodation(pk)
        self._require_inquiry_access(request, accommodation)

        ser = MessageCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        conv = get_or_create_conversation(
            accommodation=accommodation, guest=request.user
        )
        try:
            msg = send_message(
                conversation=conv,
                sender=request.user,
                body=ser.validated_data["body"],
            )
        except ValueError as exc:
            raise ValidationError({"body": str(exc)}) from exc

        owner = accommodation.owner
        return Response(
            {
                "conversation": ConversationSerializer(
                    conv, context={"request": request}
                ).data,
                "messages": _serialize_conversation_messages(conv, request),
                "propietario_id": owner.id,
                "propietario_nombre": _owner_name(owner),
                "propietario_foto_url": user_photo_url(owner),
            },
            status=status.HTTP_201_CREATED,
        )


def _owner_name(owner) -> str:
    name = f"{owner.first_name or ''} {owner.last_name or ''}".strip()
    return name or owner.email.split("@", 1)[0]


class MessageReportView(APIView):
    """POST /mensajes/{id}/reportar/ — denunciar mensaje ofensivo o abusivo."""

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, pk):
        message = get_object_or_404(
            Message.objects.select_related(
                "sender",
                "conversation",
                "conversation__accommodation",
            ),
            pk=pk,
        )
        ser = MessageReportCreateSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            report = report_message(
                message=message,
                reporter=request.user,
                reason=ser.validated_data["reason"],
                detail=ser.validated_data.get("detail", ""),
            )
        except PermissionError as exc:
            raise PermissionDenied(str(exc)) from exc
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        return Response(
            {
                "id": report.pk,
                "detail": "Reporte enviado. El equipo de moderación lo revisará.",
            },
            status=status.HTTP_201_CREATED,
        )


class MessageReportAdminViewSet(viewsets.ReadOnlyModelViewSet):
    """Cola de reportes de mensajes para administradores."""

    serializer_class = MessageReportAdminSerializer
    permission_classes = [IsAdministrador]
    pagination_class = None

    def get_queryset(self):
        qs = MessageReport.objects.select_related(
            "message",
            "message__sender",
            "message__conversation",
            "message__conversation__accommodation",
            "reporter",
            "reviewed_by",
        )
        estado = self.request.query_params.get("estado", "pendiente")
        if estado == "pendiente":
            qs = qs.filter(status=MessageReport.Status.PENDIENTE)
        elif estado == "todos":
            pass
        return qs.order_by("-created_at")

    @action(detail=True, methods=["post"], url_path="resolver")
    def resolver(self, request, pk=None):
        report = self.get_object()
        ser = MessageReportResolveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        try:
            updated = resolve_message_report(
                report=report,
                admin=request.user,
                status=ser.validated_data["status"],
                admin_notes=ser.validated_data.get("admin_notes", ""),
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc
        log_action(
            actor=request.user,
            action="message_report.resolve",
            target_type="MessageReport",
            target_id=updated.pk,
            target_label=f"Reporte #{updated.pk}",
            metadata={"status": updated.status, "admin_notes": updated.admin_notes},
            request=request,
        )
        return Response(MessageReportAdminSerializer(updated).data)
