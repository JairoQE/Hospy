"""
Carga masiva para probar estadísticas: usuarios, hospedajes (4 tipos) y reservas.

Uso:
  python manage.py seed_bulk_stats
  python manage.py seed_bulk_stats --clear
"""

import random
from datetime import time, timedelta
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone

from bookings.models import Booking
from payments.models import Payment
from properties.models import Accommodation, AccommodationFAQ, Service
from properties.panel_cache import invalidate_admin_dashboard_cache
from rooms.models import Room
from rooms.services import calculate_stay_total

User = get_user_model()

SEED_PASSWORD = "SeedBulk123!"
EMAIL_PREFIX = "seedbulk"
MARKER = "[Seed]"

SERVICES = [
    ("WiFi", "wifi"),
    ("Piscina", "piscina"),
    ("Estacionamiento", "estacionamiento"),
    ("Desayuno incluido", "desayuno"),
]

ACCOMMODATION_TYPES = [
    Accommodation.Type.HOTEL,
    Accommodation.Type.HOSTAL,
    Accommodation.Type.HOSPEDAJE,
    Accommodation.Type.CASA_DEPARTAMENTO,
]

TYPE_LABELS = {
    Accommodation.Type.HOTEL: "Hotel",
    Accommodation.Type.HOSTAL: "Hostal",
    Accommodation.Type.HOSPEDAJE: "Hospedaje",
    Accommodation.Type.CASA_DEPARTAMENTO: "Casa",
}

CITIES = [
    ("Lima", "Lima", Decimal("-12.046400"), Decimal("-77.042800")),
    ("Cusco", "Cusco", Decimal("-13.516400"), Decimal("-71.978500")),
    ("Arequipa", "Arequipa", Decimal("-16.409000"), Decimal("-71.537500")),
    ("Trujillo", "La Libertad", Decimal("-8.111600"), Decimal("-79.028800")),
    ("Piura", "Piura", Decimal("-5.194500"), Decimal("-80.632800")),
    ("Iquitos", "Loreto", Decimal("-3.749100"), Decimal("-73.253800")),
    ("Chiclayo", "Lambayeque", Decimal("-6.776600"), Decimal("-79.844300")),
]

BOOKING_STATUS_WEIGHTS = [
    (Booking.Status.CONFIRMADA, 35),
    (Booking.Status.COMPLETADA, 35),
    (Booking.Status.CANCELADA, 20),
    (Booking.Status.PENDIENTE, 10),
]

CHECK_IN_TIME = time(13, 0)
CHECK_OUT_TIME = time(11, 0)


class Command(BaseCommand):
    help = (
        "Inserta usuarios, hospedajes (4 tipos) y reservas para probar estadísticas "
        "en paneles de propietario y admin."
    )

    def add_arguments(self, parser):
        parser.add_argument("--users", type=int, default=10, help="Total de usuarios.")
        parser.add_argument(
            "--owners",
            type=int,
            default=3,
            help="Cuántos de esos usuarios son propietarios aprobados.",
        )
        parser.add_argument(
            "--accommodations",
            type=int,
            default=100,
            help="Cantidad de hospedajes.",
        )
        parser.add_argument(
            "--bookings",
            type=int,
            default=100,
            help="Cantidad de reservas.",
        )
        parser.add_argument(
            "--clear",
            action="store_true",
            help="Elimina datos creados por ejecuciones anteriores de este comando.",
        )
        parser.add_argument(
            "--seed",
            type=int,
            default=42,
            help="Semilla aleatoria para resultados reproducibles.",
        )

    def handle(self, *args, **options):
        users_total = options["users"]
        owners_count = options["owners"]
        acc_count = options["accommodations"]
        booking_count = options["bookings"]
        rng = random.Random(options["seed"])

        if owners_count < 1:
            self.stderr.write(self.style.ERROR("--owners debe ser al menos 1."))
            return
        if owners_count >= users_total:
            self.stderr.write(
                self.style.ERROR("--owners debe ser menor que --users (necesitas huéspedes).")
            )
            return
        if acc_count < 1 or booking_count < 1:
            self.stderr.write(self.style.ERROR("Cantidades deben ser positivas."))
            return

        if options["clear"]:
            self._clear_seed_data()
            if acc_count == 0:
                return

        existing = Accommodation.objects.filter(name__startswith=MARKER).count()
        if existing >= acc_count:
            self._backfill_check_policies()
            invalidate_admin_dashboard_cache()
            self.stdout.write(
                self.style.WARNING(
                    f"Ya hay {existing} hospedajes {MARKER}. "
                    "Usa --clear para regenerar o ajusta --accommodations."
                )
            )
            return

        with transaction.atomic():
            service_map = self._ensure_services()
            owners, guests = self._ensure_users(owners_count, users_total - owners_count)
            rooms = self._ensure_accommodations(
                owners, acc_count, service_map, rng, existing
            )
            self._ensure_bookings(guests, rooms, booking_count, rng)

        invalidate_admin_dashboard_cache()
        self.stdout.write(self.style.SUCCESS("Carga masiva lista."))
        self.stdout.write(f"  Propietarios: {owners_count}  |  Huéspedes: {users_total - owners_count}")
        self.stdout.write(f"  Hospedajes: {acc_count}  |  Reservas: {booking_count}")
        self.stdout.write(f"  Contraseña de todos: {SEED_PASSWORD}")
        self.stdout.write(f"  Emails: {EMAIL_PREFIX}-owner-01@hospy.local, {EMAIL_PREFIX}-guest-01@hospy.local, ...")

    def _clear_seed_data(self):
        seed_users = User.objects.filter(email__startswith=f"{EMAIL_PREFIX}-")
        acc_ids = list(
            Accommodation.objects.filter(owner__in=seed_users).values_list("id", flat=True)
        )
        booking_ids = list(
            Booking.objects.filter(room__accommodation_id__in=acc_ids).values_list(
                "id", flat=True
            )
        )
        Payment.objects.filter(booking_id__in=booking_ids).delete()
        Booking.objects.filter(id__in=booking_ids).delete()
        Accommodation.objects.filter(id__in=acc_ids).delete()
        deleted_users, _ = seed_users.delete()
        invalidate_admin_dashboard_cache()
        self.stdout.write(
            self.style.WARNING(
                f"Datos seed eliminados ({deleted_users} usuarios y dependencias)."
            )
        )

    def _ensure_services(self):
        service_map = {}
        for name, slug in SERVICES:
            svc, _ = Service.objects.get_or_create(
                slug=slug,
                defaults={"name": name, "icon": slug},
            )
            service_map[slug] = svc
        return service_map

    def _ensure_users(self, owners_count, guests_count):
        owners = []
        for i in range(1, owners_count + 1):
            email = f"{EMAIL_PREFIX}-owner-{i:02d}@hospy.local"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": f"{EMAIL_PREFIX}_owner_{i:02d}",
                    "first_name": "Propietario",
                    "last_name": f"Seed {i:02d}",
                    "role": User.Role.PROPIETARIO,
                    "owner_status": User.OwnerStatus.APROBADO,
                    "phone": f"9{80000000 + i:08d}"[-9:],
                    "payout_document_number": f"{70000000 + i:08d}"[-8:],
                    "payout_mp_email": email,
                },
            )
            if created:
                user.set_password(SEED_PASSWORD)
                user.save()
            owners.append(user)

        guests = []
        for i in range(1, guests_count + 1):
            email = f"{EMAIL_PREFIX}-guest-{i:02d}@hospy.local"
            user, created = User.objects.get_or_create(
                email=email,
                defaults={
                    "username": f"{EMAIL_PREFIX}_guest_{i:02d}",
                    "first_name": "Huésped",
                    "last_name": f"Seed {i:02d}",
                    "role": User.Role.HUESPED,
                },
            )
            if created:
                user.set_password(SEED_PASSWORD)
                user.save()
            guests.append(user)

        return owners, guests

    def _ensure_accommodations(self, owners, acc_count, service_map, rng, existing_count):
        rooms = []
        service_slugs = list(service_map.keys())

        for idx in range(existing_count, acc_count):
            acc_type = ACCOMMODATION_TYPES[idx % len(ACCOMMODATION_TYPES)]
            owner = owners[idx % len(owners)]
            city, region, lat, lng = CITIES[idx % len(CITIES)]
            type_label = TYPE_LABELS[acc_type]
            number = idx + 1
            name = f"{MARKER} {type_label} {city} {number:03d}"

            acc = Accommodation.objects.create(
                owner=owner,
                name=name,
                type=acc_type,
                description=f"Hospedaje de prueba para estadísticas — {type_label} en {city}.",
                status=Accommodation.Status.APROBADO,
                is_active=True,
                address=f"Av. Seed {number}, Mz. {number % 20}",
                city=city,
                region=region,
                latitude=lat + Decimal(str((idx % 9) * 0.001)),
                longitude=lng + Decimal(str((idx % 7) * 0.001)),
                check_in_from=CHECK_IN_TIME,
                check_out_until=CHECK_OUT_TIME,
            )
            slugs = rng.sample(service_slugs, k=min(2 + idx % 3, len(service_slugs)))
            acc.services.set([service_map[s] for s in slugs])
            self._ensure_policy_faqs(acc)

            room_type = Room.Type.DOBLE if idx % 2 else Room.Type.SIMPLE
            base_price = Decimal(str(60 + (idx % 15) * 10 + (idx % 4) * 5))
            room = Room.objects.create(
                accommodation=acc,
                number=str(100 + idx % 50),
                type=room_type,
                capacity=2 if room_type == Room.Type.DOBLE else 1,
                base_price=base_price,
            )
            rooms.append(room)

            if (idx + 1) % 25 == 0:
                self.stdout.write(f"  + {idx + 1} hospedajes...")

        if not rooms:
            rooms = list(
                Room.objects.filter(
                    accommodation__name__startswith=MARKER,
                    accommodation__status=Accommodation.Status.APROBADO,
                    is_active=True,
                ).select_related("accommodation")
            )
        return rooms

    def _ensure_policy_faqs(self, acc: Accommodation) -> None:
        check_in = acc.check_in_from.strftime("%H:%M")
        check_out = acc.check_out_until.strftime("%H:%M")
        policy_faqs = [
            (
                "¿A qué hora es el check-in?",
                f"El check-in es desde las {check_in}. Tras confirmar la reserva, "
                "el anfitrión envía instrucciones por mensaje.",
            ),
            (
                "¿A qué hora es el check-out?",
                f"El check-out debe realizarse hasta las {check_out}, salvo acuerdo "
                "previo con el anfitrión.",
            ),
        ]
        for order, (question, answer) in enumerate(policy_faqs):
            AccommodationFAQ.objects.get_or_create(
                accommodation=acc,
                question=question,
                defaults={"answer": answer, "order": 90 + order},
            )

    def _backfill_check_policies(self) -> None:
        updated = 0
        for acc in Accommodation.objects.filter(name__startswith=MARKER):
            fields = []
            if acc.check_in_from != CHECK_IN_TIME:
                acc.check_in_from = CHECK_IN_TIME
                fields.append("check_in_from")
            if acc.check_out_until != CHECK_OUT_TIME:
                acc.check_out_until = CHECK_OUT_TIME
                fields.append("check_out_until")
            if fields:
                acc.save(update_fields=fields)
                updated += 1
            self._ensure_policy_faqs(acc)
        if updated:
            self.stdout.write(
                f"  Políticas check-in/out actualizadas en {updated} hospedajes seed."
            )

    def _ensure_bookings(self, guests, rooms, booking_count, rng):
        if not rooms:
            self.stdout.write(self.style.WARNING("Sin habitaciones para reservas."))
            return

        today = timezone.localdate()
        statuses = []
        for status, weight in BOOKING_STATUS_WEIGHTS:
            statuses.extend([status] * weight)
        rng.shuffle(statuses)

        existing = Booking.objects.filter(
            room__accommodation__name__startswith=MARKER
        ).count()
        to_create = max(0, booking_count - existing)
        if to_create == 0:
            self.stdout.write("Reservas seed ya existen.")
            return

        room_cycle = list(rooms)
        rng.shuffle(room_cycle)
        if len(room_cycle) < to_create:
            room_cycle = (room_cycle * ((to_create // len(room_cycle)) + 1))[:to_create]

        for i in range(to_create):
            room = room_cycle[i]
            guest = guests[i % len(guests)]
            status = statuses[i % len(statuses)]

            nights = 1 + (i % 4)
            created_days_ago = i % 45
            created_at = timezone.now() - timedelta(days=created_days_ago, hours=i % 12)

            if status == Booking.Status.COMPLETADA:
                check_out = today - timedelta(days=1 + (i % 20))
                check_in = check_out - timedelta(days=nights)
            elif status == Booking.Status.CONFIRMADA:
                check_in = today + timedelta(days=(i % 14) - 3)
                check_out = check_in + timedelta(days=nights)
            elif status == Booking.Status.CANCELADA:
                check_in = today + timedelta(days=5 + (i % 10))
                check_out = check_in + timedelta(days=nights)
            else:
                check_in = today + timedelta(days=10 + (i % 15))
                check_out = check_in + timedelta(days=nights)

            pricing = calculate_stay_total(room, check_in, check_out)
            booking = Booking.objects.create(
                guest=guest,
                room=room,
                check_in=check_in,
                check_out=check_out,
                total_amount=pricing["total"],
                status=status,
            )
            Booking.objects.filter(pk=booking.pk).update(created_at=created_at)

            if status in (Booking.Status.CONFIRMADA, Booking.Status.COMPLETADA):
                Payment.objects.create(
                    booking=booking,
                    guest=guest,
                    amount=pricing["total"],
                    method=Payment.Method.YAPE if i % 2 else Payment.Method.CARD,
                    status=Payment.Status.PAGADO,
                    paid_at=created_at + timedelta(hours=2),
                )

        self.stdout.write(f"  + {to_create} reservas creadas.")
