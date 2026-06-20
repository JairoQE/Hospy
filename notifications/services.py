from __future__ import annotations

from django.contrib.auth import get_user_model

from .models import InboxItem

User = get_user_model()


def _create(
    recipient,
    *,
    channel: str,
    title: str,
    body: str = "",
    link: str = "",
    kind: str = "",
    sender=None,
) -> InboxItem:
    return InboxItem.objects.create(
        recipient=recipient,
        channel=channel,
        title=title,
        body=body,
        link=link,
        kind=kind,
        sender=sender,
    )


def notify_user(
    recipient,
    *,
    title: str,
    body: str = "",
    link: str = "",
    kind: str = "",
    sender=None,
    as_message: bool = False,
) -> InboxItem:
    channel = (
        InboxItem.Channel.MENSAJE if as_message else InboxItem.Channel.NOTIFICACION
    )
    return _create(
        recipient,
        channel=channel,
        title=title,
        body=body,
        link=link,
        kind=kind,
        sender=sender,
    )


def notify_admins(*, title: str, body: str, link: str, kind: str) -> None:
    admins = User.objects.filter(role=User.Role.ADMINISTRADOR, is_active=True)
    for admin in admins:
        notify_user(admin, title=title, body=body, link=link, kind=kind)


def notify_owner_registration_submitted(owner) -> None:
    notify_user(
        owner,
        title="Solicitud de propietario enviada",
        body=(
            "Tu cuenta está en revisión. Un administrador validará que seas "
            "un anfitrión o empresa legítima antes de que puedas publicar hospedajes."
        ),
        link="/panel",
        kind="owner_pending",
    )
    notify_admins(
        title="Nuevo propietario por validar",
        body=(
            f"{owner.get_full_name() or owner.email} solicita publicar en Hospy "
            f"({owner.email})."
        ),
        link="/admin",
        kind="owner_pending_admin",
    )


def notify_owner_registration_moderated(owner, approved: bool, motivo: str = "") -> None:
    if approved:
        notify_user(
            owner,
            title="¡Cuenta de propietario aprobada!",
            body=(
                "Ya puedes registrar hospedajes. Cada hospedaje pasará por una "
                "revisión adicional antes de publicarse."
            ),
            link="/panel",
            kind="owner_approved",
        )
        notify_user(
            owner,
            title="Bienvenido al panel de anfitrión",
            body="Tu identidad fue validada. Empieza creando tu primer hospedaje.",
            link="/panel",
            kind="owner_approved_msg",
            as_message=True,
        )
    else:
        reason = motivo or "Contacta a soporte si crees que hubo un error."
        notify_user(
            owner,
            title="Cuenta de propietario no aprobada",
            body=reason,
            link="/panel",
            kind="owner_rejected",
        )
        notify_user(
            owner,
            title="Mensaje del equipo Hospy",
            body=f"No pudimos validar tu cuenta de propietario. Motivo: {reason}",
            link="/panel",
            kind="owner_rejected_msg",
            as_message=True,
        )


def notify_accommodation_submitted(accommodation) -> None:
    owner = accommodation.owner
    notify_user(
        owner,
        title="Hospedaje enviado a revisión",
        body=(
            f"«{accommodation.name}» está pendiente de aprobación por el equipo Hospy."
        ),
        link="/panel",
        kind="accommodation_pending",
    )
    notify_admins(
        title="Nuevo hospedaje por moderar",
        body=f"{owner.get_full_name() or owner.email} registró «{accommodation.name}».",
        link="/admin",
        kind="accommodation_pending_admin",
    )


def notify_accommodation_moderated(accommodation, approved: bool, motivo: str = "") -> None:
    owner = accommodation.owner
    if approved:
        notify_user(
            owner,
            title="¡Hospedaje aprobado!",
            body=f"«{accommodation.name}» ya es visible para los huéspedes.",
            link=f"/panel/hospedajes/{accommodation.pk}",
            kind="accommodation_approved",
        )
        notify_user(
            owner,
            title="Tu hospedaje ya está publicado",
            body="Puedes recibir reservas. Revisa tu panel para gestionar habitaciones.",
            link="/panel",
            kind="accommodation_approved_msg",
            as_message=True,
        )
    else:
        reason = motivo or "Revisa los datos y vuelve a enviarlo."
        notify_user(
            owner,
            title="Hospedaje no aprobado",
            body=f"«{accommodation.name}»: {reason}",
            link=f"/panel/hospedajes/{accommodation.pk}",
            kind="accommodation_rejected",
        )
        notify_user(
            owner,
            title="Mensaje del equipo Hospy",
            body=f"No pudimos aprobar «{accommodation.name}». Motivo: {reason}",
            link=f"/panel/hospedajes/{accommodation.pk}",
            kind="accommodation_rejected_msg",
            as_message=True,
        )


def notify_booking_created_inbox(booking) -> None:
    from bookings.models import Booking

    booking = (
        Booking.objects.select_related(
            "guest", "room", "room__accommodation", "room__accommodation__owner"
        )
        .filter(pk=booking.pk)
        .first()
    )
    if not booking:
        return

    acc = booking.room.accommodation
    owner = acc.owner
    guest = booking.guest
    guest_name = guest.get_full_name() or guest.email
    link_owner = "/panel?tab=reservas"
    link_guest = "/mis-reservas"

    notify_user(
        owner,
        title="Nueva reserva pendiente",
        body=(
            f"{guest_name} solicitó habitación {booking.room.number} "
            f"({booking.check_in} → {booking.check_out})."
        ),
        link=link_owner,
        kind="booking_pending",
    )
    notify_user(
        owner,
        title=f"Mensaje de {guest_name}",
        body=(
            f"Hola, quisiera reservar en «{acc.name}» del {booking.check_in} "
            f"al {booking.check_out}. ¿Puedes confirmar?"
        ),
        link=link_owner,
        kind="booking_request_msg",
        sender=guest,
        as_message=True,
    )
    notify_user(
        guest,
        title="Reserva enviada",
        body=f"Tu solicitud en «{acc.name}» está pendiente de confirmación.",
        link=link_guest,
        kind="booking_created",
    )
    notify_user(
        guest,
        title=f"Mensaje de {acc.name}",
        body="Recibimos tu solicitud. El propietario te responderá pronto.",
        link=link_guest,
        kind="booking_created_msg",
        as_message=True,
    )


def notify_booking_confirmed_inbox(booking) -> None:
    from bookings.models import Booking

    booking = Booking.objects.select_related(
        "guest", "room", "room__accommodation", "room__accommodation__owner"
    ).get(pk=booking.pk)
    owner = booking.room.accommodation.owner
    acc_name = booking.room.accommodation.name

    notify_user(
        booking.guest,
        title="Reserva confirmada",
        body=f"«{acc_name}» confirmó tu estadía del {booking.check_in} al {booking.check_out}.",
        link="/mis-reservas",
        kind="booking_confirmed",
    )
    notify_user(
        booking.guest,
        title=f"Mensaje de {owner.get_full_name() or acc_name}",
        body="¡Tu reserva fue confirmada! Te esperamos en las fechas acordadas.",
        link="/mis-reservas",
        kind="booking_confirmed_msg",
        sender=owner,
        as_message=True,
    )


def notify_booking_rejected_inbox(booking) -> None:
    from bookings.models import Booking

    booking = Booking.objects.select_related(
        "guest", "room", "room__accommodation", "room__accommodation__owner"
    ).get(pk=booking.pk)
    owner = booking.room.accommodation.owner
    acc_name = booking.room.accommodation.name

    notify_user(
        booking.guest,
        title="Reserva no confirmada",
        body=f"«{acc_name}» no pudo aceptar tu solicitud para esas fechas.",
        link="/mis-reservas",
        kind="booking_rejected",
    )
    notify_user(
        booking.guest,
        title=f"Mensaje de {owner.get_full_name() or acc_name}",
        body="Lamentamos informarte que no podemos confirmar tu reserva en esas fechas.",
        link="/mis-reservas",
        kind="booking_rejected_msg",
        sender=owner,
        as_message=True,
    )


def notify_booking_cancelled_inbox(booking) -> None:
    from bookings.models import Booking

    booking = Booking.objects.select_related(
        "guest", "room", "room__accommodation", "room__accommodation__owner"
    ).get(pk=booking.pk)
    acc = booking.room.accommodation
    guest_name = booking.guest.get_full_name() or booking.guest.email

    notify_user(
        booking.guest,
        title="Reserva cancelada",
        body=f"Tu reserva en «{acc.name}» fue cancelada.",
        link="/mis-reservas",
        kind="booking_cancelled",
    )
    notify_user(
        acc.owner,
        title="Reserva cancelada",
        body=f"La reserva de {guest_name} en habitación {booking.room.number} fue cancelada.",
        link="/panel?tab=reservas",
        kind="booking_cancelled_owner",
    )


def notify_check_in_reminder(booking) -> None:
    from bookings.models import Booking

    booking = (
        Booking.objects.select_related(
            "guest", "room", "room__accommodation", "room__accommodation__owner"
        )
        .filter(pk=booking.pk)
        .first()
    )
    if not booking:
        return

    acc = booking.room.accommodation
    owner = acc.owner
    guest_name = booking.guest.get_full_name() or booking.guest.email
    check_in_label = booking.check_in.strftime("%d/%m/%Y")

    notify_user(
        owner,
        title="Check-in mañana",
        body=(
            f"Mañana ({check_in_label}) llega {guest_name} a «{acc.name}» "
            f"(hab. {booking.room.number}). Prepara la habitación o el acceso."
        ),
        link="/panel?tab=reservas",
        kind="check_in_reminder",
    )


def unread_counts(user) -> dict[str, int]:
    from messaging.services import sync_chat_inbox_for_user

    sync_chat_inbox_for_user(user)
    qs = InboxItem.objects.filter(recipient=user, is_read=False)
    return {
        "notificaciones": qs.filter(channel=InboxItem.Channel.NOTIFICACION).count(),
        "mensajes": qs.filter(
            channel=InboxItem.Channel.MENSAJE, kind__startswith="chat_conv_"
        ).count(),
    }
