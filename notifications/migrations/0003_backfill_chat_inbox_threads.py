"""Sincroniza hilos de chat en bandeja para conversaciones existentes."""

from django.db import migrations


def backfill(apps, schema_editor):
    Conversation = apps.get_model("messaging", "Conversation")
    Message = apps.get_model("messaging", "Message")
    InboxItem = apps.get_model("notifications", "InboxItem")
    User = apps.get_model("accounts", "User")

    for conv in Conversation.objects.select_related("accommodation", "guest", "owner"):
        last = Message.objects.filter(conversation_id=conv.pk).order_by("-created_at").first()
        if not last:
            continue
        preview = (last.body or "")[:200]
        kind = f"chat_conv_{conv.pk}"
        acc_id = conv.accommodation_id

        for recipient_id, peer_id, title_src, link in (
            (
                conv.owner_id,
                conv.guest_id,
                conv.guest_id,
                f"/panel?tab=consultas&conversacion={conv.pk}",
            ),
            (
                conv.guest_id,
                conv.owner_id,
                conv.owner_id,
                f"/hospedajes/{acc_id}?chat=1",
            ),
        ):
            peer = User.objects.filter(pk=peer_id).first()
            if not peer:
                continue
            name = f"{peer.first_name or ''} {peer.last_name or ''}".strip()
            if not name:
                name = peer.email.split("@", 1)[0]
            if not InboxItem.objects.filter(
                recipient_id=recipient_id, channel="mensaje", kind=kind
            ).exists():
                InboxItem.objects.create(
                    recipient_id=recipient_id,
                    channel="mensaje",
                    title=name,
                    body=preview,
                    link=link,
                    kind=kind,
                    sender_id=peer_id,
                    is_read=True,
                )


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0002_consolidate_chat_inbox"),
        ("messaging", "0002_messagereport"),
    ]

    operations = [
        migrations.RunPython(backfill, migrations.RunPython.noop),
    ]
