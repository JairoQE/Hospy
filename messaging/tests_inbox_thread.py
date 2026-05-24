import pytest
from rest_framework import status

from messaging.models import Conversation, Message
from messaging.services import notify_new_chat_message, upsert_chat_inbox_thread
from notifications.models import InboxItem


@pytest.mark.django_db
def test_un_solo_hilo_bandeja_por_conversacion(huesped, propietario, hospedaje_aprobado):
    acc, _ = hospedaje_aprobado
    conv = Conversation.objects.create(
        accommodation=acc, guest=huesped, owner=propietario
    )
    m1 = Message.objects.create(conversation=conv, sender=huesped, body="Hola")
    m2 = Message.objects.create(conversation=conv, sender=huesped, body="Segundo mensaje")

    notify_new_chat_message(m1)
    notify_new_chat_message(m2)

    items = InboxItem.objects.filter(
        recipient=propietario,
        channel=InboxItem.Channel.MENSAJE,
        kind=f"chat_conv_{conv.pk}",
    )
    assert items.count() == 1
    assert items.first().body == "Segundo mensaje"
    assert items.first().title == "Test"  # nombre del huésped (peer)
