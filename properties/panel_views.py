"""Bootstrap de paneles: una petición en lugar de muchas."""

from django.core.cache import cache
from django.db.models import Min, Q
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador, IsPropietario
from accounts.serializers import UserSerializer
from bookings.models import Booking
from bookings.serializers import BookingListSerializer
from properties.models import Accommodation, Service
from properties.serializers import (
    AccommodationDetailSerializer,
    AccommodationListSerializer,
    AccommodationOwnerListSerializer,
    ServiceSerializer,
)
from properties.panel_cache import owner_panel_cache_key
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


class AdminDashboardBootstrapView(APIView):
    """GET /api/v1/admin/dashboard-bootstrap/ — estadísticas del panel admin."""

    permission_classes = [IsAdministrador]

    def get(self, request):
        cache_key = "hospy:admin_dashboard"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        from accounts.models import User
        from messaging.models import MessageReport

        ctx = {"request": request}
        bookings_qs = Booking.objects.select_related(
            "room", "room__accommodation", "guest"
        ).order_by("-created_at")
        hospedajes_qs = public_accommodations_queryset().order_by(
            "-average_rating", "name"
        )
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
            "reservas": BookingListSerializer(
                bookings_qs, many=True, context=ctx
            ).data,
            "hospedajes": AccommodationListSerializer(
                hospedajes_qs, many=True, context=ctx
            ).data,
            "hospedajes_aprobados_total": hospedajes_qs.count(),
            "pendientes": AccommodationDetailSerializer(
                pendientes_qs, many=True, context=ctx
            ).data,
            "propietarios_pendientes": UserSerializer(
                pending_owners_qs, many=True, context=ctx
            ).data,
            "reportes_chat_pendientes": pending_reports,
            "resenas": ReviewListSerializer(reviews_qs, many=True, context=ctx).data,
        }
        cache.set(cache_key, payload, 90)
        return Response(payload)
