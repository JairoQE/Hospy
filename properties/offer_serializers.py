from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from rooms.models import Room

from .models import AccommodationOffer
from .offer_services import rooms_overlap_in_offers


class OfferRoomSerializer(serializers.ModelSerializer):
    class Meta:
        model = Room
        fields = ("id", "number", "type", "base_price")


class AccommodationOfferSerializer(serializers.ModelSerializer):
    vigente = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()
    room_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        write_only=True,
        required=False,
    )
    rooms = OfferRoomSerializer(many=True, read_only=True)

    class Meta:
        model = AccommodationOffer
        fields = (
            "id",
            "title",
            "discount_percent",
            "start_date",
            "duration_days",
            "end_date",
            "is_active",
            "room_ids",
            "rooms",
            "vigente",
            "dias_restantes",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("end_date", "created_at", "updated_at")

    def get_vigente(self, obj) -> bool:
        return obj.is_current()

    def get_dias_restantes(self, obj) -> int:
        today = timezone.localdate()
        if today > obj.end_date:
            return 0
        if today < obj.start_date:
            return (obj.end_date - obj.start_date).days + 1
        return (obj.end_date - today).days + 1

    def _resolve_rooms(self, room_ids: list[int]):
        accommodation = self.context["accommodation"]
        rooms = list(
            Room.objects.filter(
                pk__in=room_ids,
                accommodation_id=accommodation.id,
                is_active=True,
            )
        )
        if len(rooms) != len(set(room_ids)):
            raise serializers.ValidationError(
                {
                    "room_ids": (
                        "Selecciona habitaciones activas que pertenezcan a este hospedaje."
                    )
                }
            )
        return rooms

    def validate_start_date(self, value):
        if self.instance is None and value < timezone.localdate():
            raise serializers.ValidationError(
                "La fecha de inicio no puede ser anterior a hoy."
            )
        return value

    def validate(self, data):
        accommodation = self.context.get("accommodation")
        if not accommodation:
            return data

        start = data.get("start_date") or (
            self.instance.start_date if self.instance else None
        )
        duration = data.get("duration_days") or (
            self.instance.duration_days if self.instance else None
        )
        is_active = data.get("is_active", True)
        if self.instance is not None and "is_active" not in data:
            is_active = self.instance.is_active

        room_ids = data.get("room_ids")
        if room_ids is None and self.instance is not None:
            room_ids = list(self.instance.rooms.values_list("id", flat=True))

        if self.instance is None and not room_ids:
            raise serializers.ValidationError(
                {"room_ids": "Selecciona al menos una habitación para la oferta."}
            )

        if start and duration and is_active and room_ids:
            end = start + timedelta(days=duration - 1)
            if rooms_overlap_in_offers(
                accommodation.id,
                room_ids,
                start,
                end,
                exclude_id=self.instance.pk if self.instance else None,
            ):
                raise serializers.ValidationError(
                    {
                        "room_ids": (
                            "Una o más habitaciones ya tienen otra oferta activa "
                            "en esas fechas."
                        )
                    }
                )
        return data

    def create(self, validated_data):
        room_ids = validated_data.pop("room_ids")
        rooms = self._resolve_rooms(room_ids)
        validated_data["accommodation"] = self.context["accommodation"]
        offer = super().create(validated_data)
        offer.rooms.set(rooms)
        return offer

    def update(self, instance, validated_data):
        room_ids = validated_data.pop("room_ids", None)
        offer = super().update(instance, validated_data)
        if room_ids is not None:
            offer.rooms.set(self._resolve_rooms(room_ids))
        return offer


class PublicAccommodationOfferSerializer(serializers.ModelSerializer):
    """Oferta vigente para ficha pública del hospedaje."""

    vigente = serializers.SerializerMethodField()
    dias_restantes = serializers.SerializerMethodField()
    rooms = OfferRoomSerializer(many=True, read_only=True)

    class Meta:
        model = AccommodationOffer
        fields = (
            "id",
            "title",
            "discount_percent",
            "start_date",
            "duration_days",
            "end_date",
            "rooms",
            "vigente",
            "dias_restantes",
        )

    get_vigente = AccommodationOfferSerializer.get_vigente
    get_dias_restantes = AccommodationOfferSerializer.get_dias_restantes
