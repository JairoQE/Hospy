from datetime import date
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand

from bookings.models import Booking
from properties.models import Accommodation, Service
from rooms.models import Room, SeasonRate
from rooms.services import SEASON_PRICE_MULTIPLIERS, calculate_stay_total

User = get_user_model()

SERVICES = [
    ("WiFi", "wifi"),
    ("Piscina", "piscina"),
    ("Estacionamiento", "estacionamiento"),
    ("Desayuno incluido", "desayuno"),
]

DEMO_ACCOMMODATIONS = [
    {
        "name": "Hotel Lima Centro",
        "type": Accommodation.Type.HOTEL,
        "description": "Hotel céntrico cerca de la Plaza Mayor.",
        "address": "Jr. de la Unión 300",
        "city": "Lima",
        "region": "Lima",
        "latitude": Decimal("-12.046400"),
        "longitude": Decimal("-77.042800"),
        "status": Accommodation.Status.APROBADO,
        "services": ["wifi", "desayuno", "estacionamiento"],
        "rooms": [("101", Room.Type.DOBLE, 120.00)],
    },
    {
        "name": "Hostal Cusco Backpackers",
        "type": Accommodation.Type.HOSTAL,
        "description": "Hostal económico a pasos de la Plaza de Armas.",
        "address": "Calle Plateros 334",
        "city": "Cusco",
        "region": "Cusco",
        "latitude": Decimal("-13.516400"),
        "longitude": Decimal("-71.978500"),
        "status": Accommodation.Status.APROBADO,
        "services": ["wifi"],
        "rooms": [("1", Room.Type.SIMPLE, 45.00)],
    },
    {
        "name": "Hospedaje Miraflores Vista",
        "type": Accommodation.Type.HOSPEDAJE,
        "description": "Hospedaje familiar en Miraflores — pendiente de aprobación.",
        "address": "Calle Bellavista 220",
        "city": "Lima",
        "region": "Lima",
        "latitude": Decimal("-12.119100"),
        "longitude": Decimal("-77.029200"),
        "status": Accommodation.Status.PENDIENTE,
        "services": ["wifi", "desayuno"],
        "rooms": [("2", Room.Type.FAMILIAR, 95.00)],
    },
]


class Command(BaseCommand):
    help = "Carga servicios, propietario demo y hospedajes de ejemplo."

    def handle(self, *args, **options):
        service_map = {}
        for name, slug in SERVICES:
            svc, _ = Service.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "icon": slug},
            )
            service_map[slug] = svc

        guest, guest_created = User.objects.get_or_create(
            email="huesped@hospy.local",
            defaults={
                "username": "huesped_demo",
                "first_name": "Ana",
                "last_name": "Viajera",
                "role": User.Role.HUESPED,
            },
        )
        if guest_created:
            guest.set_password("Huesped123!")
            guest.save()
            self.stdout.write(
                self.style.SUCCESS("Huésped creado: huesped@hospy.local / Huesped123!")
            )

        owner, created = User.objects.get_or_create(
            email="propietario@hospy.local",
            defaults={
                "username": "propietario_demo",
                "first_name": "Carlos",
                "last_name": "Propietario",
                "role": User.Role.PROPIETARIO,
                "owner_status": User.OwnerStatus.APROBADO,
                "phone": "987654321",
            },
        )
        if created:
            owner.set_password("Propietario123!")
            owner.save()
        elif not (owner.phone or "").strip():
            owner.phone = "987654321"
            owner.save(update_fields=["phone"])
        elif owner.owner_status != User.OwnerStatus.APROBADO:
            owner.owner_status = User.OwnerStatus.APROBADO
            owner.owner_rejection_reason = ""
            owner.save(update_fields=["owner_status", "owner_rejection_reason"])
            self.stdout.write(
                self.style.SUCCESS(
                    "Propietario creado: propietario@hospy.local / Propietario123!"
                )
            )
        else:
            self.stdout.write("Propietario demo ya existía.")

        for data in DEMO_ACCOMMODATIONS:
            service_slugs = data.pop("services")
            rooms_data = data.pop("rooms")
            status = data.pop("status")

            acc, acc_created = Accommodation.objects.get_or_create(
                name=data["name"],
                owner=owner,
                defaults={
                    **data,
                    "status": status,
                    "is_active": status == Accommodation.Status.APROBADO,
                },
            )
            if not acc_created:
                continue

            acc.services.set([service_map[s] for s in service_slugs])
            for number, room_type, price in rooms_data:
                Room.objects.get_or_create(
                    accommodation=acc,
                    number=number,
                    defaults={
                        "type": room_type,
                        "capacity": 2,
                        "base_price": price,
                    },
                )
            self.stdout.write(f"  + {acc.name} [{acc.status}]")

        self._seed_season_rates(owner)
        self._seed_completed_stay(guest, owner)
        self.stdout.write(
            self.style.SUCCESS(
                "Datos demo listos. Aprueba «Hospedaje Miraflores Vista» como admin."
            )
        )

    def _seed_completed_stay(self, guest, owner):
        """Reserva completada para que el huesped pueda dejar reseña."""
        room = (
            Room.objects.filter(
                accommodation__owner=owner,
                accommodation__status=Accommodation.Status.APROBADO,
                is_active=True,
            )
            .select_related("accommodation")
            .first()
        )
        if not room:
            return
        check_in = date(2026, 4, 10)
        check_out = date(2026, 4, 12)
        if Booking.objects.filter(
            guest=guest,
            room__accommodation=room.accommodation,
            status=Booking.Status.COMPLETADA,
        ).exists():
            return
        pricing = calculate_stay_total(room, check_in, check_out)
        Booking.objects.create(
            guest=guest,
            room=room,
            check_in=check_in,
            check_out=check_out,
            total_amount=pricing["total"],
            status=Booking.Status.COMPLETADA,
        )
        self.stdout.write(
            f"    reserva completada (huesped -> {room.accommodation.name}) para probar resenas"
        )

    def _seed_season_rates(self, owner):
        """Tarifas de temporada en habitaciones de hospedajes aprobados."""
        alta_inicio = date(2026, 6, 1)
        alta_fin = date(2026, 8, 31)
        for acc in Accommodation.objects.filter(
            owner=owner, status=Accommodation.Status.APROBADO
        ):
            for room in acc.habitaciones.filter(is_active=True):
                _, created = SeasonRate.objects.get_or_create(
                    room=room,
                    season=SeasonRate.Season.ALTA,
                    start_date=alta_inicio,
                    end_date=alta_fin,
                    defaults={
                        "price_per_night": (
                            room.base_price
                            * SEASON_PRICE_MULTIPLIERS[SeasonRate.Season.ALTA]
                        ).quantize(Decimal("0.01")),
                    },
                )
                if created:
                    self.stdout.write(
                        f"    tarifa alta -> Hab. {room.number} ({acc.name})"
                    )
