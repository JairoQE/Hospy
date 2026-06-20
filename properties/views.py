from django.conf import settings
from django.core.cache import cache
from django.db.models import Min, Prefetch, Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, viewsets
from rest_framework.views import APIView
from rest_framework.decorators import action
from rest_framework.exceptions import NotFound, PermissionDenied, ValidationError
from rest_framework.response import Response

from accounts.permissions import IsAdministrador, IsPropietario, IsPropietarioOrAdministrador
from audit.services import log_action
from config.permissions import IsIntegrationClient

from .models import Accommodation, Service
from .offer_serializers import AccommodationOfferSerializer, PublicAccommodationOfferSerializer
from .permissions import IsAccommodationOwner
from .serializers import (
    AccommodationApprovalSerializer,
    AccommodationDetailSerializer,
    AccommodationListSerializer,
    AccommodationOwnerListSerializer,
    AccommodationPhotoSerializer,
    AccommodationPhotoUploadSerializer,
    AccommodationWriteSerializer,
    IntegrationAccommodationDetailSerializer,
    ServiceCreateSerializer,
    ServiceSerializer,
    ServiceUpdateSerializer,
)
from .filters import AccommodationFilter
from .services import (
    apply_accommodation_search_params,
    cache_integration_response,
    filter_accommodations_nearby,
    invalidate_accommodation_cache,
    notify_owner_approval,
    public_accommodations_queryset,
)


class ServiceViewSet(viewsets.ModelViewSet):
    queryset = Service.objects.filter(is_active=True)
    serializer_class = ServiceSerializer
    lookup_field = "slug"
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def get_serializer_class(self):
        if self.action == "create":
            return ServiceCreateSerializer
        if self.action in ("update", "partial_update"):
            return ServiceUpdateSerializer
        return ServiceSerializer

    def get_permissions(self):
        if self.action in ("create", "update", "partial_update", "destroy"):
            return [IsPropietarioOrAdministrador()]
        return [permissions.AllowAny()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        service = serializer.save()
        return Response(
            ServiceSerializer(service).data,
            status=status.HTTP_201_CREATED,
        )

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        service = serializer.save()
        return Response(ServiceSerializer(service).data)

    def destroy(self, request, *args, **kwargs):
        """Baja lógica: deja de mostrarse pero no rompe hospedajes vinculados."""
        service = self.get_object()
        service.is_active = False
        service.save(update_fields=["is_active", "updated_at"])
        return Response(status=status.HTTP_204_NO_CONTENT)


_PUBLIC_DETAIL_ACTIONS = (
    "retrieve",
    "detalle_bootstrap",
    "cotizacion",
    "tendencia_precios",
    "disponibilidad",
)


class AccommodationViewSet(viewsets.ModelViewSet):
    """
    Flujo hospedajes (Fase 1):
    - Público: GET list/retrieve solo aprobados y activos.
    - Propietario: POST crea pendiente; GET mios/; PATCH edita lo suyo.
    - Admin: GET pendientes/; POST {id}/aprobar/.
    """

    filterset_class = AccommodationFilter
    search_fields = ("name", "description", "city")
    ordering_fields = ("average_rating", "created_at", "name", "precio_desde")
    http_method_names = ["get", "post", "patch", "delete", "head", "options"]

    def filter_queryset(self, queryset):
        qs = super().filter_queryset(queryset)
        if self.action in ("list", "destacados"):
            qs = apply_accommodation_search_params(qs, self.request.query_params)
        return qs

    def get_queryset(self):
        base = Accommodation.objects.filter(is_deleted=False)

        if self.action in (
            "list",
            "retrieve",
            "destacados",
            "cercanos",
            "detalle_bootstrap",
            "cotizacion",
            "tendencia_precios",
            "disponibilidad",
        ):
            return public_accommodations_queryset()

        if self.action == "mios":
            return (
                base.filter(owner=self.request.user)
                .annotate(
                    precio_desde=Min(
                        "habitaciones__base_price",
                        filter=Q(habitaciones__is_active=True),
                    )
                )
                .prefetch_related("fotos", "faqs")
            )

        if self.action == "pendientes":
            return base.filter(status=Accommodation.Status.PENDIENTE).select_related(
                "owner"
            )

        user = self.request.user
        if user.is_authenticated and user.role == user.Role.ADMINISTRADOR:
            return base.select_related("owner")

        if user.is_authenticated and user.role == user.Role.PROPIETARIO:
            return base.filter(owner=user)

        return public_accommodations_queryset()

    def get_object(self):
        if self.action in ("list", "mios", "pendientes", "destacados"):
            return super().get_object()

        pk = self.kwargs.get("pk")
        user = self.request.user

        if self.action in _PUBLIC_DETAIL_ACTIONS and (
            not user.is_authenticated
            or user.role not in (user.Role.ADMINISTRADOR, user.Role.PROPIETARIO)
        ):
            return get_object_or_404(
                public_accommodations_queryset(),
                pk=pk,
            )

        accommodation = get_object_or_404(
            Accommodation.objects.filter(is_deleted=False),
            pk=pk,
        )

        if user.is_authenticated and user.role == user.Role.ADMINISTRADOR:
            return accommodation

        if user.is_authenticated and accommodation.owner_id == user.id:
            return accommodation

        if (
            self.action in _PUBLIC_DETAIL_ACTIONS
            and accommodation.status == Accommodation.Status.APROBADO
            and accommodation.is_active
        ):
            return accommodation

        if self.action in (
            "update",
            "partial_update",
            "destroy",
            "desactivar",
            "fotos",
            "ofertas",
            "oferta_detail",
        ):
            raise PermissionDenied("No tienes permiso sobre este hospedaje.")

        raise NotFound()

    def get_serializer_class(self):
        if self.action == "mios":
            return AccommodationOwnerListSerializer
        if self.action == "list":
            return AccommodationListSerializer
        if self.action in ("create", "update", "partial_update"):
            return AccommodationWriteSerializer
        if self.action == "aprobar":
            return AccommodationApprovalSerializer
        return AccommodationDetailSerializer

    def get_permissions(self):
        if self.action in (
            "list",
            "retrieve",
            "destacados",
            "cercanos",
            "detalle_bootstrap",
            "cotizacion",
            "tendencia_precios",
            "disponibilidad",
        ):
            return [permissions.AllowAny()]
        if self.action == "pendientes":
            return [IsAdministrador()]
        if self.action == "aprobar":
            return [IsAdministrador()]
        if self.action == "mios":
            return [IsPropietario()]
        if self.action == "create":
            return [IsPropietario()]
        if self.action in (
            "update",
            "partial_update",
            "destroy",
            "desactivar",
            "fotos",
            "ofertas",
            "oferta_detail",
        ):
            return [IsPropietario(), IsAccommodationOwner()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        accommodation = serializer.save()
        from notifications.services import notify_accommodation_submitted

        notify_accommodation_submitted(accommodation)
        from integrations.security import assess_owner_location

        owner_flags = assess_owner_location(
            request=request,
            user=request.user,
            accommodation_city=accommodation.city,
        )
        log_action(
            actor=request.user,
            action="accommodation.create",
            target_type="Accommodation",
            target_id=accommodation.pk,
            target_label=accommodation.name,
            metadata={"owner_ip_flags": owner_flags.get("flags", [])},
            request=request,
        )
        return Response(
            AccommodationDetailSerializer(
                accommodation, context={"request": request}
            ).data,
            status=status.HTTP_201_CREATED,
        )

    def destroy(self, request, *args, **kwargs):
        accommodation = self.get_object()
        accommodation.is_deleted = True
        accommodation.is_active = False
        accommodation.save(update_fields=["is_deleted", "is_active", "updated_at"])
        log_action(
            actor=request.user,
            action="accommodation.delete",
            target_type="Accommodation",
            target_id=accommodation.pk,
            target_label=accommodation.name,
            request=request,
        )
        return Response(status=status.HTTP_204_NO_CONTENT)

    def perform_update(self, serializer):
        accommodation = serializer.save()
        log_action(
            actor=self.request.user,
            action="accommodation.update",
            target_type="Accommodation",
            target_id=accommodation.pk,
            target_label=accommodation.name,
            metadata={"fields": list(serializer.validated_data.keys())},
            request=self.request,
        )

    @action(detail=False, methods=["get"], url_path="mios")
    def mios(self, request):
        """GET /api/v1/hospedajes/mios/ — hospedajes del propietario autenticado."""
        qs = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(qs)
        serializer = AccommodationOwnerListSerializer(
            page if page is not None else qs,
            many=True,
            context={"request": request},
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="pendientes")
    def pendientes(self, request):
        """GET /api/v1/hospedajes/pendientes/ — cola de aprobación (admin)."""
        qs = self.get_queryset().order_by("created_at")
        page = self.paginate_queryset(qs)
        serializer = AccommodationDetailSerializer(
            page if page is not None else qs,
            many=True,
            context={"request": request},
        )
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="destacados")
    def destacados(self, request):
        qs = (
            self.get_queryset()
            .filter(average_rating__gte=4.5)
            .order_by("-average_rating")[:20]
        )
        return Response(
            AccommodationListSerializer(
                qs, many=True, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["post"], url_path="aprobar")
    def aprobar(self, request, pk=None):
        """POST /api/v1/hospedajes/{id}/aprobar/  body: {"aprobado": true|false, "motivo": "..."}"""
        accommodation = get_object_or_404(
            Accommodation.objects.filter(is_deleted=False),
            pk=pk,
        )
        if accommodation.status != Accommodation.Status.PENDIENTE:
            return Response(
                {"detail": "Solo se pueden moderar hospedajes en estado pendiente."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AccommodationApprovalSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        aprobado = serializer.validated_data["aprobado"]
        motivo = serializer.validated_data.get("motivo", "")

        if aprobado:
            accommodation.status = Accommodation.Status.APROBADO
            accommodation.rejection_reason = ""
            accommodation.is_active = True
        else:
            accommodation.status = Accommodation.Status.RECHAZADO
            accommodation.rejection_reason = motivo

        accommodation.save(
            update_fields=["status", "rejection_reason", "is_active", "updated_at"]
        )
        notify_owner_approval(accommodation, aprobado, motivo)
        invalidate_accommodation_cache(accommodation.id)
        log_action(
            actor=request.user,
            action="accommodation.approve" if aprobado else "accommodation.reject",
            target_type="Accommodation",
            target_id=accommodation.pk,
            target_label=accommodation.name,
            metadata={"motivo": motivo} if not aprobado else {},
            request=request,
        )

        return Response(
            AccommodationDetailSerializer(
                accommodation, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["post"], url_path="desactivar")
    def desactivar(self, request, pk=None):
        """POST /api/v1/hospedajes/{id}/desactivar/ — RF-14 pausa temporal."""
        accommodation = self.get_object()
        accommodation.is_active = False
        accommodation.save(update_fields=["is_active", "updated_at"])
        log_action(
            actor=request.user,
            action="accommodation.deactivate",
            target_type="Accommodation",
            target_id=accommodation.pk,
            target_label=accommodation.name,
            request=request,
        )
        return Response(
            AccommodationDetailSerializer(
                accommodation, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["post"], url_path="activar")
    def activar(self, request, pk=None):
        accommodation = self.get_object()
        if accommodation.status != Accommodation.Status.APROBADO:
            return Response(
                {"detail": "Solo hospedajes aprobados pueden activarse."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        accommodation.is_active = True
        accommodation.save(update_fields=["is_active", "updated_at"])
        log_action(
            actor=request.user,
            action="accommodation.activate",
            target_type="Accommodation",
            target_id=accommodation.pk,
            target_label=accommodation.name,
            request=request,
        )
        return Response(
            AccommodationDetailSerializer(
                accommodation, context={"request": request}
            ).data
        )

    @action(detail=True, methods=["get"], url_path="detalle-bootstrap")
    def detalle_bootstrap(self, request, pk=None):
        """GET /api/v1/hospedajes/{id}/detalle-bootstrap/ — hospedaje, habitaciones y reseñas."""
        cache_key = f"hospy:detalle_bootstrap:{pk}"
        cached = cache.get(cache_key)
        if cached is not None:
            return Response(cached)

        from reviews.models import Review
        from reviews.serializers import ReviewListSerializer
        from rooms.models import Room, RoomPhoto
        from rooms.serializers import RoomPublicSerializer

        accommodation = self.get_object()
        ctx = {"request": request}
        rooms_qs = (
            Room.objects.filter(accommodation=accommodation, is_active=True)
            .select_related("accommodation", "accommodation__owner")
            .prefetch_related(
                Prefetch(
                    "fotos",
                    queryset=RoomPhoto.objects.order_by("order", "id"),
                ),
                "services",
            )
        )
        reviews_qs = (
            Review.objects.filter(
                accommodation_id=accommodation.pk,
                status=Review.Status.APROBADA,
            )
            .select_related("author", "booking", "booking__room")
            .order_by("-created_at")
        )
        from django.utils import timezone

        from .offer_services import _active_offers_qs, get_accommodation_display_prices

        from reviews.insights import build_accommodation_review_insights

        today = timezone.localdate()
        active_offers = list(
            _active_offers_qs(today)
            .filter(accommodation_id=accommodation.pk)
            .prefetch_related("rooms")
            .order_by("-discount_percent", "-start_date")
        )
        payload = {
            "hospedaje": AccommodationDetailSerializer(
                accommodation, context=ctx
            ).data,
            "habitaciones": RoomPublicSerializer(
                rooms_qs, many=True, context=ctx
            ).data,
            "resenas": ReviewListSerializer(
                reviews_qs, many=True, context=ctx
            ).data,
            "ofertas_vigentes": PublicAccommodationOfferSerializer(
                active_offers, many=True
            ).data,
            "precios_display": get_accommodation_display_prices(accommodation, today),
            "resenas_insights": build_accommodation_review_insights(accommodation),
        }
        cache.set(cache_key, payload, 180)
        return Response(payload)

    @action(detail=True, methods=["get"], url_path="cotizacion")
    def cotizacion(self, request, pk=None):
        """GET /api/v1/hospedajes/{id}/cotizacion/?entrada=&salida= — precios de todas las habitaciones."""
        from datetime import date

        from rooms.models import Room
        from rooms.services import build_room_price_response

        accommodation = self.get_object()
        entrada_raw = request.query_params.get("entrada")
        salida_raw = request.query_params.get("salida")
        if not entrada_raw or not salida_raw:
            raise ValidationError(
                {"detail": "Parámetros requeridos: entrada, salida."}
            )
        try:
            check_in = date.fromisoformat(entrada_raw)
            check_out = date.fromisoformat(salida_raw)
        except ValueError:
            raise ValidationError(
                {"detail": "Fechas inválidas (use YYYY-MM-DD)."}
            )
        if check_out <= check_in:
            raise ValidationError({"salida": "Debe ser posterior a entrada."})

        rooms = Room.objects.filter(
            accommodation=accommodation, is_active=True
        ).select_related("accommodation")
        return Response(
            {
                "cotizaciones": [
                    build_room_price_response(room, check_in, check_out)
                    for room in rooms
                ]
            }
        )

    @action(detail=True, methods=["get"], url_path="tendencia-precios")
    def tendencia_precios(self, request, pk=None):
        """GET /api/v1/hospedajes/{id}/tendencia-precios/?dias=90 — precio mínimo por noche."""
        from properties.price_trend import build_accommodation_price_trend

        accommodation = self.get_object()
        try:
            days = int(request.query_params.get("dias", 90))
        except (TypeError, ValueError):
            days = 90
        return Response(build_accommodation_price_trend(accommodation, days=days))

    @action(detail=True, methods=["get"], url_path="disponibilidad")
    def disponibilidad(self, request, pk=None):
        """GET /api/v1/hospedajes/{id}/disponibilidad/?anio=2026&mes=6"""
        from rooms.services import (
            accommodation_pricing_model,
            build_accommodation_monthly_calendar,
        )

        accommodation = self.get_object()
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

        model = accommodation_pricing_model(accommodation)
        return Response(
            {
                "accommodation_id": accommodation.id,
                "pricing_model": model,
                "anio": year,
                "mes": month,
                "days": build_accommodation_monthly_calendar(accommodation, year, month),
            }
        )

    @action(detail=False, methods=["get"], url_path="cercanos")
    def cercanos(self, request):
        """GET /api/v1/hospedajes/cercanos/?lat=&lng=&radio_km=10"""
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radio_km = float(request.query_params.get("radio_km", 10))
        except (KeyError, TypeError, ValueError):
            raise ValidationError(
                {"detail": "Parámetros requeridos: lat, lng. Opcional: radio_km."}
            )
        qs = public_accommodations_queryset()
        nearby = filter_accommodations_nearby(qs, lat, lng, radio_km)
        serializer = AccommodationListSerializer(
            nearby, many=True, context={"request": request}
        )
        return Response(serializer.data)

    @action(detail=True, methods=["get", "post"], url_path="fotos")
    def fotos(self, request, pk=None):
        """GET lista / POST sube foto (máx. 10) — RF-11."""
        accommodation = self.get_object()
        if request.method == "GET":
            photos = accommodation.fotos.all()
            return Response(
                AccommodationPhotoSerializer(
                    photos, many=True, context={"request": request}
                ).data
            )

        max_photos = settings.MAX_ACCOMMODATION_PHOTOS
        if accommodation.fotos.count() >= max_photos:
            return Response(
                {"detail": f"Máximo {max_photos} fotografías por hospedaje."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = AccommodationPhotoUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        photo = serializer.save(accommodation=accommodation)
        if photo.is_primary:
            accommodation.fotos.exclude(pk=photo.pk).update(is_primary=False)
        invalidate_accommodation_cache(accommodation.id)

        return Response(
            AccommodationPhotoSerializer(photo, context={"request": request}).data,
            status=status.HTTP_201_CREATED,
        )

    @action(detail=True, methods=["get", "post"], url_path="ofertas")
    def ofertas(self, request, pk=None):
        """GET lista / POST crea oferta con duración en días."""
        accommodation = self.get_object()
        if request.method == "GET":
            offers = (
                accommodation.ofertas.prefetch_related("rooms")
                .order_by("-start_date", "-created_at")
            )
            return Response(
                AccommodationOfferSerializer(
                    offers,
                    many=True,
                    context={"accommodation": accommodation, "request": request},
                ).data
            )

        if accommodation.status != Accommodation.Status.APROBADO:
            return Response(
                {
                    "detail": (
                        "Solo los hospedajes aprobados pueden publicar ofertas."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = AccommodationOfferSerializer(
            data=request.data,
            context={"accommodation": accommodation, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        offer = serializer.save()
        invalidate_accommodation_cache(accommodation.id)
        return Response(
            AccommodationOfferSerializer(
                offer,
                context={"accommodation": accommodation, "request": request},
            ).data,
            status=status.HTTP_201_CREATED,
        )

    @action(
        detail=True,
        methods=["patch", "delete"],
        url_path=r"ofertas/(?P<offer_id>\d+)",
    )
    def oferta_detail(self, request, pk=None, offer_id=None):
        accommodation = self.get_object()
        offer = get_object_or_404(accommodation.ofertas, pk=offer_id)
        if request.method == "DELETE":
            offer.delete()
            invalidate_accommodation_cache(accommodation.id)
            return Response(status=status.HTTP_204_NO_CONTENT)

        serializer = AccommodationOfferSerializer(
            offer,
            data=request.data,
            partial=True,
            context={"accommodation": accommodation, "request": request},
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        invalidate_accommodation_cache(accommodation.id)
        return Response(
            AccommodationOfferSerializer(
                offer,
                context={"accommodation": accommodation, "request": request},
            ).data
        )

    @action(
        detail=True,
        methods=["delete"],
        url_path=r"fotos/(?P<foto_id>\d+)",
    )
    def eliminar_foto(self, request, pk=None, foto_id=None):
        accommodation = self.get_object()
        photo = get_object_or_404(accommodation.fotos, pk=foto_id)
        photo.image.delete(save=False)
        photo.delete()
        invalidate_accommodation_cache(accommodation.id)
        return Response(status=status.HTTP_204_NO_CONTENT)


class _IntegrationCachedListMixin:
    cache_prefix = "list"

    def list(self, request, *args, **kwargs):
        params = {k: request.query_params.get(k) for k in request.query_params}

        def builder():
            queryset = self.filter_queryset(self.get_queryset())
            page = self.paginate_queryset(queryset)
            if page is not None:
                serializer = self.get_serializer(page, many=True)
                return self.get_paginated_response(serializer.data).data
            serializer = self.get_serializer(queryset, many=True)
            return serializer.data

        data = cache_integration_response(self.cache_prefix, params, builder)
        return Response(data)


class IntegrationAccommodationListView(
    _IntegrationCachedListMixin, generics.ListAPIView
):
    serializer_class = AccommodationListSerializer
    permission_classes = (IsIntegrationClient,)
    cache_prefix = "hospedajes"

    def get_queryset(self):
        qs = public_accommodations_queryset()
        return apply_accommodation_search_params(qs, self.request.query_params)


class IntegrationAccommodationDisponiblesView(
    _IntegrationCachedListMixin, generics.ListAPIView
):
    serializer_class = AccommodationListSerializer
    permission_classes = (IsIntegrationClient,)
    cache_prefix = "disponibles"

    def get_queryset(self):
        entrada = self.request.query_params.get("entrada")
        salida = self.request.query_params.get("salida")
        if not entrada or not salida:
            return public_accommodations_queryset().none()
        qs = public_accommodations_queryset()
        return apply_accommodation_search_params(qs, self.request.query_params)


class IntegrationAccommodationNearbyView(APIView):
    permission_classes = (IsIntegrationClient,)

    def get(self, request):
        try:
            lat = float(request.query_params["lat"])
            lng = float(request.query_params["lng"])
            radio_km = float(request.query_params.get("radio_km", 10))
        except (KeyError, TypeError, ValueError):
            return Response(
                {"detail": "Parámetros requeridos: lat, lng."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        params = dict(request.query_params.items())

        def builder():
            qs = public_accommodations_queryset()
            nearby = filter_accommodations_nearby(qs, lat, lng, radio_km)
            return AccommodationListSerializer(nearby, many=True).data

        data = cache_integration_response("cercanos", params, builder)
        return Response(data)


class IntegrationAccommodationDetailView(generics.RetrieveAPIView):
    serializer_class = IntegrationAccommodationDetailSerializer
    permission_classes = (IsIntegrationClient,)
    lookup_url_kwarg = "pk"

    def get_queryset(self):
        return public_accommodations_queryset()

    def retrieve(self, request, *args, **kwargs):
        pk = kwargs.get("pk")
        params = {"pk": pk}

        def builder():
            instance = self.get_object()
            serializer = self.get_serializer(instance)
            return serializer.data

        data = cache_integration_response("detalle", params, builder)
        return Response(data)
