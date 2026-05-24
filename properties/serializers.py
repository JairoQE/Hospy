from decimal import Decimal, InvalidOperation, ROUND_HALF_UP

from rest_framework import serializers

from .media_urls import media_public_path
from .models import Accommodation, AccommodationFAQ, AccommodationPhoto, Service
from .offer_services import get_accommodation_display_prices


def _round_coordinate(value, places: int = 6) -> Decimal:
    try:
        dec = Decimal(str(value))
    except (InvalidOperation, TypeError, ValueError) as exc:
        raise serializers.ValidationError("Coordenada inválida.") from exc
    quant = Decimal("1").scaleb(-places)
    return dec.quantize(quant, rounding=ROUND_HALF_UP)


class CoordinateField(serializers.DecimalField):
    """Redondea antes de validar max_digits (el mapa envía muchos decimales)."""

    def __init__(self, **kwargs):
        kwargs.setdefault("max_digits", 9)
        kwargs.setdefault("decimal_places", 6)
        super().__init__(**kwargs)

    def to_internal_value(self, data):
        if data in (None, ""):
            raise serializers.ValidationError("Este campo es obligatorio.")
        rounded = _round_coordinate(data)
        return super().to_internal_value(rounded)


class ServiceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("id", "name", "slug", "icon", "is_active")


class ServiceCreateSerializer(serializers.ModelSerializer):
    """Propietario o admin agrega un servicio al catálogo compartido."""

    class Meta:
        model = Service
        fields = ("name",)

    def validate_name(self, value):
        name = value.strip()
        if len(name) < 2:
            raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres.")
        if Service.objects.filter(name__iexact=name).exists():
            raise serializers.ValidationError("Ya existe un servicio con ese nombre.")
        return name

    def create(self, validated_data):
        from django.utils.text import slugify

        name = validated_data["name"]
        base = slugify(name) or "servicio"
        slug = base
        n = 1
        while Service.objects.filter(slug=slug).exists():
            slug = f"{base}-{n}"
            n += 1
        return Service.objects.create(name=name, slug=slug, icon=slug[:50])


class ServiceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Service
        fields = ("name",)

    def validate_name(self, value):
        name = value.strip()
        if len(name) < 2:
            raise serializers.ValidationError("El nombre debe tener al menos 2 caracteres.")
        qs = Service.objects.filter(name__iexact=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError("Ya existe un servicio con ese nombre.")
        return name

    def update(self, instance, validated_data):
        from django.utils.text import slugify

        name = validated_data["name"]
        if name != instance.name:
            base = slugify(name) or "servicio"
            slug = base
            n = 1
            while (
                Service.objects.filter(slug=slug).exclude(pk=instance.pk).exists()
            ):
                slug = f"{base}-{n}"
                n += 1
            instance.slug = slug
            instance.icon = slug[:50]
        instance.name = name
        instance.save()
        return instance


class AccommodationFAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationFAQ
        fields = ("id", "question", "answer", "order")


class AccommodationFAQWriteItemSerializer(serializers.Serializer):
    question = serializers.CharField(max_length=300)
    answer = serializers.CharField(max_length=5000)

    def validate_question(self, value):
        q = value.strip()
        if len(q) < 5:
            raise serializers.ValidationError(
                "La pregunta debe tener al menos 5 caracteres."
            )
        return q

    def validate_answer(self, value):
        a = value.strip()
        if len(a) < 5:
            raise serializers.ValidationError(
                "La respuesta debe tener al menos 5 caracteres."
            )
        return a


def save_accommodation_faqs(accommodation, faqs_data):
    accommodation.faqs.all().delete()
    for index, item in enumerate(faqs_data):
        AccommodationFAQ.objects.create(
            accommodation=accommodation,
            question=item["question"],
            answer=item["answer"],
            order=index,
        )


class AccommodationPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = AccommodationPhoto
        fields = ("id", "image", "image_url", "is_primary", "order")

    def get_image(self, obj):
        return media_public_path(obj.image)

    def get_image_url(self, obj):
        return media_public_path(obj.image)


class AccommodationPhotoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = AccommodationPhoto
        fields = ("image", "is_primary", "order")

    def validate_image(self, value):
        from .images import validate_uploaded_image

        validate_uploaded_image(value)
        return value


class AccommodationListSerializer(serializers.ModelSerializer):
    precio_desde = serializers.SerializerMethodField()
    precio_desde_original = serializers.SerializerMethodField()
    oferta_activa = serializers.SerializerMethodField()
    descuento_porcentaje = serializers.SerializerMethodField()
    foto_principal = serializers.SerializerMethodField()
    distance_km = serializers.SerializerMethodField()

    class Meta:
        model = Accommodation
        fields = (
            "id",
            "name",
            "type",
            "city",
            "average_rating",
            "precio_desde",
            "precio_desde_original",
            "oferta_activa",
            "descuento_porcentaje",
            "foto_principal",
            "distance_km",
        )

    def _display_prices(self, obj):
        cached = getattr(obj, "_display_prices_cache", None)
        if cached is None:
            cached = get_accommodation_display_prices(obj)
            obj._display_prices_cache = cached
        return cached

    def get_precio_desde(self, obj):
        return self._display_prices(obj)["precio_desde"]

    def get_precio_desde_original(self, obj):
        return self._display_prices(obj)["precio_desde_original"]

    def get_oferta_activa(self, obj) -> bool:
        return self._display_prices(obj)["oferta_activa"]

    def get_descuento_porcentaje(self, obj):
        return self._display_prices(obj)["descuento_porcentaje"]

    def get_distance_km(self, obj):
        return getattr(obj, "distance_km", None)

    def get_foto_principal(self, obj):
        foto = obj.fotos.filter(is_primary=True).first() or obj.fotos.first()
        if not foto or not foto.image:
            return None
        return media_public_path(foto.image)


class AccommodationOwnerListSerializer(AccommodationListSerializer):
    """Listado del propietario: incluye estado de aprobación."""

    class Meta(AccommodationListSerializer.Meta):
        fields = AccommodationListSerializer.Meta.fields + ("status", "is_active")


class AccommodationDetailSerializer(serializers.ModelSerializer):
    fotos = AccommodationPhotoSerializer(many=True, read_only=True)
    faqs = AccommodationFAQSerializer(many=True, read_only=True)
    services = ServiceSerializer(many=True, read_only=True)
    owner_email = serializers.EmailField(source="owner.email", read_only=True)
    propietario_nombre = serializers.SerializerMethodField()
    propietario_telefono = serializers.SerializerMethodField()
    propietario_foto_url = serializers.SerializerMethodField()
    otros_mismo_propietario = serializers.SerializerMethodField()

    class Meta:
        model = Accommodation
        fields = (
            "id",
            "name",
            "type",
            "description",
            "status",
            "is_active",
            "rejection_reason",
            "address",
            "city",
            "region",
            "country",
            "latitude",
            "longitude",
            "average_rating",
            "services",
            "fotos",
            "faqs",
            "owner_email",
            "propietario_nombre",
            "propietario_telefono",
            "propietario_foto_url",
            "otros_mismo_propietario",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "status",
            "rejection_reason",
            "average_rating",
            "created_at",
            "updated_at",
        )

    def get_propietario_nombre(self, obj):
        u = obj.owner
        name = f"{u.first_name or ''} {u.last_name or ''}".strip()
        if name:
            return name
        if u.username:
            return u.username
        return u.email.split("@", 1)[0]

    def get_propietario_telefono(self, obj):
        return (obj.owner.phone or "").strip()

    def get_propietario_foto_url(self, obj):
        return media_public_path(obj.owner.photo) if obj.owner.photo else None

    def get_otros_mismo_propietario(self, obj):
        from .services import haversine_km, public_accommodations_queryset

        qs = (
            public_accommodations_queryset()
            .filter(owner_id=obj.owner_id)
            .exclude(pk=obj.pk)
            .order_by("-average_rating", "name")[:8]
        )
        lat0, lng0 = float(obj.latitude), float(obj.longitude)
        others = list(qs)
        for a in others:
            a.distance_km = round(
                haversine_km(
                    lat0,
                    lng0,
                    float(a.latitude),
                    float(a.longitude),
                ),
                1,
            )
        return AccommodationListSerializer(
            others, many=True, context=self.context
        ).data


class AccommodationWriteSerializer(serializers.ModelSerializer):
    latitude = CoordinateField()
    longitude = CoordinateField()
    service_ids = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        many=True,
        source="services",
        required=False,
    )
    faqs = AccommodationFAQWriteItemSerializer(many=True, required=False)

    class Meta:
        model = Accommodation
        fields = (
            "name",
            "type",
            "description",
            "address",
            "city",
            "region",
            "country",
            "latitude",
            "longitude",
            "service_ids",
            "faqs",
        )

    def validate_type(self, value):
        valid = {c[0] for c in Accommodation.Type.choices}
        if value not in valid:
            raise serializers.ValidationError(
                f"Tipo inválido. Opciones: {', '.join(sorted(valid))}"
            )
        return value

    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("La latitud debe estar entre -90 y 90.")
        return value

    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("La longitud debe estar entre -180 y 180.")
        return value

    def validate_faqs(self, value):
        if len(value) > 30:
            raise serializers.ValidationError("Máximo 30 preguntas frecuentes.")
        return value

    def create(self, validated_data):
        services = validated_data.pop("services", [])
        faqs_data = validated_data.pop("faqs", [])
        user = self.context["request"].user
        accommodation = Accommodation.objects.create(
            owner=user,
            status=Accommodation.Status.PENDIENTE,
            **validated_data,
        )
        if services:
            accommodation.services.set(services)
        if faqs_data:
            save_accommodation_faqs(accommodation, faqs_data)
        return accommodation

    def update(self, instance, validated_data):
        services = validated_data.pop("services", None)
        faqs_data = validated_data.pop("faqs", None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if services is not None:
            instance.services.set(services)
        if faqs_data is not None:
            save_accommodation_faqs(instance, faqs_data)
        if instance.status == Accommodation.Status.RECHAZADO:
            instance.status = Accommodation.Status.PENDIENTE
            instance.rejection_reason = ""
            instance.save(update_fields=["status", "rejection_reason", "updated_at"])
        return instance


class IntegrationAccommodationDetailSerializer(serializers.ModelSerializer):
    """Detalle simplificado para el SIST."""

    services = ServiceSerializer(many=True, read_only=True)
    foto_principal = serializers.SerializerMethodField()
    precio_desde = serializers.DecimalField(
        max_digits=10, decimal_places=2, read_only=True, required=False
    )

    class Meta:
        model = Accommodation
        fields = (
            "id",
            "name",
            "type",
            "description",
            "address",
            "city",
            "region",
            "country",
            "latitude",
            "longitude",
            "average_rating",
            "precio_desde",
            "foto_principal",
            "services",
        )

    def get_foto_principal(self, obj):
        foto = obj.fotos.filter(is_primary=True).first() or obj.fotos.first()
        if not foto or not foto.image:
            return None
        return media_public_path(foto.image)


class AccommodationApprovalSerializer(serializers.Serializer):
    aprobado = serializers.BooleanField(default=True)
    motivo = serializers.CharField(required=False, allow_blank=True, max_length=1000)

    def validate(self, data):
        if not data.get("aprobado", True) and not data.get("motivo", "").strip():
            raise serializers.ValidationError(
                {"motivo": "Indica el motivo del rechazo."}
            )
        return data
