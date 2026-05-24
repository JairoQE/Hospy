from __future__ import annotations

from django.contrib.auth import get_user_model
from django.db import transaction
from django.utils import timezone

from notifications.services import notify_admins, notify_user
from properties.models import Accommodation
from properties.services import public_accommodations_queryset

from .models import Conversation, Message, MessageReport

User = get_user_model()


def _guest_display(user) -> str:
    name = f"{user.first_name or ''} {user.last_name or ''}".strip()
    return name or user.email.split("@", 1)[0]


def get_public_accommodation(accommodation_id: int) -> Accommodation:
    return public_accommodations_queryset().get(pk=accommodation_id)


@transaction.atomic
def get_or_create_conversation(*, accommodation: Accommodation, guest: User) -> Conversation:
    conv, created = Conversation.objects.get_or_create(
        accommodation=accommodation,
        guest=guest,
        defaults={"owner": accommodation.owner},
    )
    if not created and conv.owner_id != accommodation.owner_id:
        conv.owner = accommodation.owner
        conv.save(update_fields=["owner", "updated_at"])
    return conv


def _chat_inbox_kind(conversation_id: int) -> str:
    return f"chat_conv_{conversation_id}"


def _inbox_peer(conv: Conversation, recipient: User) -> User:
    """La otra persona en el hilo (nombre y foto en la bandeja)."""
    return conv.guest if recipient.id == conv.owner_id else conv.owner


def upsert_chat_inbox_thread(
    conv: Conversation,
    *,
    recipient: User,
    preview: str,
    bump_unread: bool = True,
) -> None:
    """Un solo ítem de bandeja por conversación (estilo Messenger)."""
    from notifications.models import InboxItem

    acc = conv.accommodation
    peer = _inbox_peer(conv, recipient)
    text = (preview or "").strip()[:200]
    kind = _chat_inbox_kind(conv.pk)

    if recipient.id == conv.owner_id:
        title = _guest_display(peer)
        link = f"/panel?tab=consultas&conversacion={conv.pk}"
    else:
        title = _guest_display(peer)
        link = f"/hospedajes/{acc.pk}?chat=1"

    item = InboxItem.objects.filter(
        recipient=recipient,
        channel=InboxItem.Channel.MENSAJE,
        kind=kind,
    ).first()

    if item:
        if bump_unread:
            item.title = title
            item.body = text
            item.link = link
            item.sender = peer
            item.is_read = False
            item.save(
                update_fields=["title", "body", "link", "sender", "is_read", "updated_at"]
            )
        else:
            InboxItem.objects.filter(pk=item.pk).update(
                title=title,
                body=text,
                link=link,
                sender_id=peer.pk,
            )
        return

    InboxItem.objects.create(
        recipient=recipient,
        channel=InboxItem.Channel.MENSAJE,
        title=title,
        body=text,
        link=link,
        kind=kind,
        sender=peer,
        is_read=not bump_unread,
    )


def sync_chat_inbox_for_user(user: User) -> None:
    """Crea/actualiza hilos de bandeja para todas las conversaciones del usuario."""
    if user.role == User.Role.PROPIETARIO:
        convs = Conversation.objects.filter(owner=user)
    elif user.role == User.Role.HUESPED:
        convs = Conversation.objects.filter(guest=user)
    else:
        convs = Conversation.objects.filter(guest=user) | Conversation.objects.filter(
            owner=user
        )

    convs = convs.select_related("accommodation", "guest", "owner").distinct()
    for conv in convs:
        last = (
            Message.objects.filter(conversation=conv)
            .select_related("sender")
            .order_by("-created_at")
            .first()
        )
        if not last:
            continue
        preview = (last.body or "").strip()[:200]
        for recipient in (conv.owner, conv.guest):
            upsert_chat_inbox_thread(
                conv,
                recipient=recipient,
                preview=preview,
                bump_unread=False,
            )


def mark_chat_inbox_read(*, conversation_id: int, user: User) -> None:
    from notifications.models import InboxItem

    InboxItem.objects.filter(
        recipient=user,
        channel=InboxItem.Channel.MENSAJE,
        kind=_chat_inbox_kind(conversation_id),
    ).update(is_read=True)


def mark_conversation_read(*, conversation: Conversation, user: User) -> None:
    """Marca que el usuario abrió el chat (recibo de lectura para el otro participante)."""
    now = timezone.now()
    if user.id == conversation.guest_id:
        Conversation.objects.filter(pk=conversation.pk).update(guest_last_read_at=now)
        conversation.guest_last_read_at = now
    elif user.id == conversation.owner_id:
        Conversation.objects.filter(pk=conversation.pk).update(owner_last_read_at=now)
        conversation.owner_last_read_at = now


def notify_new_chat_message(message: Message) -> None:
    conv = (
        Conversation.objects.select_related(
            "accommodation", "guest", "owner"
        )
        .filter(pk=message.conversation_id)
        .first()
    )
    if not conv:
        return

    preview = (message.body or "").strip()[:200]
    if message.sender_id == conv.guest_id:
        upsert_chat_inbox_thread(
            conv, recipient=conv.owner, preview=preview, bump_unread=True
        )
    else:
        upsert_chat_inbox_thread(
            conv, recipient=conv.guest, preview=preview, bump_unread=True
        )


@transaction.atomic
def send_message(*, conversation: Conversation, sender: User, body: str) -> Message:
    text = (body or "").strip()
    if not text:
        raise ValueError("El mensaje no puede estar vacío.")
    if len(text) > 2000:
        raise ValueError("El mensaje es demasiado largo (máx. 2000 caracteres).")

    msg = Message.objects.create(
        conversation=conversation,
        sender=sender,
        body=text,
    )
    conversation.last_message_at = timezone.now()
    conversation.save(update_fields=["last_message_at", "updated_at"])
    notify_new_chat_message(msg)
    return msg


def _user_display(user: User) -> str:
    return _guest_display(user)


@transaction.atomic
def report_message(
    *,
    message: Message,
    reporter: User,
    reason: str,
    detail: str = "",
) -> MessageReport:
    conv = (
        Conversation.objects.select_related("accommodation", "guest", "owner")
        .filter(pk=message.conversation_id)
        .first()
    )
    if not conv:
        raise ValueError("Conversación no encontrada.")
    if reporter.id not in (conv.guest_id, conv.owner_id):
        raise PermissionError("No participas en esta conversación.")
    if message.sender_id == reporter.id:
        raise ValueError("No puedes reportar tus propios mensajes.")

    if MessageReport.objects.filter(message=message, reporter=reporter).exists():
        raise ValueError("Ya reportaste este mensaje.")

    report = MessageReport.objects.create(
        message=message,
        reporter=reporter,
        reason=reason,
        detail=(detail or "").strip()[:500],
    )
    _notify_admins_message_report(report, conv, message)
    return report


def _notify_admins_message_report(
    report: MessageReport, conv: Conversation, message: Message
) -> None:
    sender = message.sender
    reporter_name = _user_display(report.reporter)
    sender_name = _user_display(sender)
    reason_label = MessageReport.Reason(report.reason).label
    preview = (message.body or "").strip()[:100]
    acc = conv.accommodation

    notify_admins(
        title="Mensaje de chat reportado",
        body=(
            f"{reporter_name} reportó un mensaje de {sender_name} "
            f"en «{acc.name}» ({reason_label}): {preview}"
        ),
        link="/admin?tab=mensajes",
        kind="message_report_admin",
    )


@transaction.atomic
def resolve_message_report(
    *,
    report: MessageReport,
    admin: User,
    status: str,
    admin_notes: str = "",
) -> MessageReport:
    if report.status != MessageReport.Status.PENDIENTE:
        raise ValueError("Este reporte ya fue atendido.")
    if status not in (
        MessageReport.Status.REVISADO,
        MessageReport.Status.DESCARTADO,
    ):
        raise ValueError("Estado de resolución inválido.")

    report.status = status
    report.reviewed_by = admin
    report.reviewed_at = timezone.now()
    report.admin_notes = (admin_notes or "").strip()[:500]
    report.save(
        update_fields=[
            "status",
            "reviewed_by",
            "reviewed_at",
            "admin_notes",
            "updated_at",
        ]
    )
    return report
