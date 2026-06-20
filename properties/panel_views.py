"""Bootstrap de paneles: una petición en lugar de muchas."""

from django.core.cache import cache
from django.db.models import Min, Q
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador, IsPropietario
from accounts.serializers import UserSerializer
from bookings.models import Booking
from bookings.owner_calendar import build_owner_occupancy_calendar
from bookings.serializers import AdminDashboardBookingSerializer, BookingListSerializer
from properties.models import Accommodation, Service
from properties.serializers import (
    AccommodationDetailSerializer,
    AdminDashboardAccommodationSerializer,
    AccommodationListSerializer,
    AccommodationOwnerListSerializer,
    ServiceSerializer,
)
from properties.panel_cache import invalidate_admin_dashboard_cache, owner_panel_cache_key
from properties.services import public_accommodations_queryset
from reviews.models import Review
from reviews.serializers import ReviewListSerializer


class OwnerPanelBootstrapView(APIView):
    """GET /api/v1/propietario/panel-bootstrap/ — dashboard del propietario."""

    permission_classes = [IsPropietario]

    def get(self, request):
        user = request.user
        cache_key = owner_panel_cache_key(user.pk)
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        ctx = {"request": request}
        hospedajes_qs = (
            Accommodation.objects.filter(is_deleted=False, owner=user)
            .annotate(
                precio_desde=Min(
                    "habitaciones__base_price",
                    filter=Q(habitaciones__is_active=True),
                )
            )
            .prefetch_related("fotos", "faqs")
            .order_by("-updated_at")
        )
        bookings_qs = (
            Booking.objects.filter(room__accommodation__owner=user)
            .select_related("room", "room__accommodation", "guest", "payment")
            .order_by("-created_at")
        )
        reviews_qs = (
            Review.objects.filter(
                accommodation__owner=user,
                status=Review.Status.APROBADA,
            )
            .select_related("author", "booking", "booking__room")
            .order_by("-created_at")
        )
        services_qs = Service.objects.filter(is_active=True).order_by("name")

        payload = {
            "hospedajes": AccommodationOwnerListSerializer(
                hospedajes_qs, many=True, context=ctx
            ).data,
            "reservas": BookingListSerializer(
                bookings_qs, many=True, context=ctx
            ).data,
            "resenas": ReviewListSerializer(reviews_qs, many=True, context=ctx).data,
            "servicios": ServiceSerializer(services_qs, many=True, context=ctx).data,
        }
        cache.set(cache_key, payload, 90)
        return Response(payload)


class OwnerCalendarView(APIView):
    """GET /api/v1/propietario/calendario/?anio=2026&mes=6&hospedaje_id=1"""

    permission_classes = [IsPropietario]

    def get(self, request):
        try:
            year = int(
                request.query_params.get("anio") or request.query_params.get("year")
            )
            month = int(
                request.query_params.get("mes") or request.query_params.get("month")
            )
        except (TypeError, ValueError):
            raise ValidationError(
                {"detail": "Parámetros requeridos: anio y mes (ej. ?anio=2026&mes=6)."}
            )
        if month < 1 or month > 12:
            raise ValidationError({"mes": "Debe estar entre 1 y 12."})

        accommodation_id = request.query_params.get("hospedaje_id") or request.query_params.get(
            "accommodation_id"
        )
        acc_id = None
        if accommodation_id not in (None, ""):
            try:
                acc_id = int(accommodation_id)
            except (TypeError, ValueError):
                raise ValidationError({"hospedaje_id": "Debe ser un entero."})

        payload = build_owner_occupancy_calendar(
            request.user,
            year,
            month,
            accommodation_id=acc_id,
        )
        return Response(payload)


class AdminDashboardBootstrapView(APIView):
    """GET /api/v1/admin/dashboard-bootstrap/ — estadísticas del panel admin."""

    permission_classes = [IsAdministrador]
    _BOOKINGS_LIMIT = 400

    def get(self, request):
        cache_key = "hospy:admin_dashboard"
        if request.query_params.get("fresh") != "1":
            try:
                cached = cache.get(cache_key)
                if cached is not None:
                    return Response(cached)
            except Exception:
                pass

        from accounts.models import User
        from messaging.models import MessageReport

        ctx = {"request": request}
        bookings_qs = (
            Booking.objects.select_related(
                "room", "room__accommodation", "guest"
            )
            .order_by("-created_at")[: self._BOOKINGS_LIMIT]
        )
        hospedajes_qs = public_accommodations_queryset().order_by(
            "-average_rating", "name"
        )
        approved_count = hospedajes_qs.count()
        pendientes_qs = (
            Accommodation.objects.filter(
                is_deleted=False, status=Accommodation.Status.PENDIENTE
            )
            .select_related("owner")
            .prefetch_related("fotos", "faqs", "services")
            .order_by("created_at")
        )
        pending_owners_qs = User.objects.filter(
            role=User.Role.PROPIETARIO,
            owner_status=User.OwnerStatus.PENDIENTE,
        ).order_by("-date_joined")
        reviews_qs = (
            Review.objects.filter(status=Review.Status.APROBADA)
            .select_related("author", "booking", "booking__room", "accommodation")
            .order_by("-created_at")[:30]
        )
        pending_reports = MessageReport.objects.filter(
            status=MessageReport.Status.PENDIENTE
        ).count()

        payload = {
            "reservas": AdminDashboardBookingSerializer(
                bookings_qs, many=True, context=ctx
            ).data,
            "hospedajes": AdminDashboardAccommodationSerializer(
                hospedajes_qs, many=True, context=ctx
            ).data,
            "hospedajes_aprobados_total": approved_count,
            "pendientes": AccommodationDetailSerializer(
                pendientes_qs, many=True, context=ctx
            ).data,
            "propietarios_pendientes": UserSerializer(
                pending_owners_qs, many=True, context=ctx
            ).data,
            "reportes_chat_pendientes": pending_reports,
            "resenas": ReviewListSerializer(reviews_qs, many=True, context=ctx).data,
        }
        try:
            cache.set(cache_key, payload, 90)
        except Exception:
            pass
        return Response(payload)
