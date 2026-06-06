from rest_framework import serializers

from properties.media_urls import media_public_path
from properties.models import Accommodation, Service
from properties.serializers import ServiceSerializer

from .models import Room, RoomAvailability, SeasonRate
from .services import calculate_stay_total, rates_overlap, sync_season_rates_from_base


class RoomSerializer(serializers.ModelSerializer):
    accommodation_name = serializers.CharField(
        source="accommodation.name", read_only=True
    )
    precio_base = serializers.DecimalField(
        source="base_price", max_digits=10, decimal_places=2, read_only=True
    )
    services = ServiceSerializer(many=True, read_only=True)
    service_ids = serializers.PrimaryKeyRelatedField(
        queryset=Service.objects.filter(is_active=True),
        many=True,
        source="services",
        required=False,
    )

    class Meta:
        model = Room
        fields = (
            "id",
            "accommodation",
            "accommodation_name",
            "number",
            "type",
            "capacity",
            "floor",
            "description",
            "base_price",
            "precio_base",
            "is_active",
            "services",
            "service_ids",
            "created_at",
        )
        read_only_fields = ("id", "created_at")

    def validate_accommodation(self, accommodation):
        request = self.context.get("request")
        if (
            request
            and request.user.is_authenticated
            and accommodation.owner_id != request.user.id
        ):
            raise serializers.ValidationError(
                "Solo puedes agregar habitaciones a tus propios hospedajes."
            )
        if (
            accommodation.is_deleted
            or accommodation.status != Accommodation.Status.APROBADO
        ):
            raise serializers.ValidationError(
                "El hospedaje debe estar aprobado para registrar habitaciones."
            )
        return accommodation

    def validate(self, data):
        accommodation = data.get("accommodation") or getattr(
            self.instance, "accommodation", None
        )
        number = data.get("number") or getattr(self.instance, "number", None)
        if accommodation and number:
            qs = Room.objects.filter(accommodation=accommodation, number=number)
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    {
                        "number": "Ya existe una habitación con ese número en este hospedaje."
                    }
                )
        return data

    def create(self, validated_data):
        services = validated_data.pop("services", [])
        room = Room.objects.create(**validated_data)
        if services:
            room.services.set(services)
        return room

    def update(self, instance, validated_data):
        services = validated_data.pop("services", None)
        old_base = instance.base_price
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        if services is not None:
            instance.services.set(services)
        new_base = instance.base_price
        if new_base != old_base and instance.tarifas.exists():
            sync_season_rates_from_base(instance)
        return instance


class RoomPhotoSerializer(serializers.ModelSerializer):
    image = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = RoomPhoto
        fields = ("id", "image", "image_url", "order")

    def get_image(self, obj):
        return media_public_path(obj.image)

    def get_image_url(self, obj):
        return media_public_path(obj.image)


class RoomPhotoUploadSerializer(serializers.ModelSerializer):
    class Meta:
        model = RoomPhoto
        fields = ("image", "order")

    def validate_image(self, value):
        from properties.images import normalize_uploaded_image

        return normalize_uploaded_image(value)


class RoomPublicSerializer(serializers.ModelSerializer):
    """Listado público en detalle de hospedaje."""

    fotos = RoomPhotoSerializer(many=True, read_only=True)
    services = ServiceSerializer(many=True, read_only=True)

    class Meta:
        model = Room
        fields = (
            "id",
            "number",
            "type",
            "capacity",
            "floor",
            "description",
            "base_price",
            "fotos",
            "services",
        )


class SeasonRateSerializer(serializers.ModelSerializer):
    class Meta:
        model = SeasonRate
        fields = (
            "id",
            "room",
            "season",
            "price_per_night",
            "start_date",
            "end_date",
        )
        read_only_fields = ("id", "room")

    def validate(self, data):
        start = data.get("start_date") or self.instance.start_date
        end = data.get("end_date") or self.instance.end_date
        if end < start:
            raise serializers.ValidationError(
                {"end_date": "Debe ser igual o posterior a la fecha de inicio."}
            )
        room = data.get("room") or self.instance.room
        exclude_id = self.instance.pk if self.instance else None
        if rates_overlap(room.id, start, end, exclude_id=exclude_id):
            raise serializers.ValidationError(
                "Ya existe una tarifa que se superpone con este rango de fechas."
            )
        return data


class BlockDatesSerializer(serializers.Serializer):
    fecha_inicio = serializers.DateField()
    fecha_fin = serializers.DateField()
    motivo = serializers.ChoiceField(
        choices=RoomAvailability.Reason.choices,
        default=RoomAvailability.Reason.BLOQUEO,
    )

    def validate(self, data):
        if data["fecha_fin"] <= data["fecha_inicio"]:
            raise serializers.ValidationError(
                {"fecha_fin": "Debe ser posterior a fecha_inicio."}
            )
        return data


class PriceQuerySerializer(serializers.Serializer):
    entrada = serializers.DateField()
    salida = serializers.DateField()

    def validate(self, data):
        if data["salida"] <= data["entrada"]:
            raise serializers.ValidationError(
                {"salida": "Debe ser posterior a entrada."}
            )
        return data

    def to_representation(self, instance):
        room = self.context["room"]
        return calculate_stay_total(room, instance["entrada"], instance["salida"])
