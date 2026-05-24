"""Elimina ítems de bandeja duplicados por mensaje de chat (un hilo por conversación)."""

from django.db import migrations


def consolidate(apps, schema_editor):
    InboxItem = apps.get_model("notifications", "InboxItem")
    InboxItem.objects.filter(
        channel="mensaje",
        kind__in=("chat_inquiry", "chat_reply", "booking_request_msg", "booking_created_msg"),
    ).delete()


class Migration(migrations.Migration):
    dependencies = [
        ("notifications", "0001_initial"),
    ]

    operations = [
        migrations.RunPython(consolidate, migrations.RunPython.noop),
    ]
