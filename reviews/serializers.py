from rest_framework import serializers

from bookings.models import Booking

from .categories import REVIEW_CATEGORY_KEYS, normalize_category_ratings
from .models import Review
from .services import (
    booking_for_review,
    create_guest_review,
    guest_already_reviewed,
    guest_has_completed_stay,
    resolve_review_booking,
)


class ReviewListSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()
    habitacion = serializers.SerializerMethodField()
    check_in = serializers.SerializerMethodField()
    check_out = serializers.SerializerMethodField()
    total_amount = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "accommodation",
            "autor_nombre",
            "habitacion",
            "check_in",
            "check_out",
            "total_amount",
            "rating",
            "category_ratings",
            "comment",
            "created_at",
        )

    def get_autor_nombre(self, obj):
        return obj.author.get_full_name() or obj.author.username

    def _stay(self, obj) -> Booking | None:
        cached = getattr(obj, "_review_booking", None)
        if cached is not None:
            return cached
        booking = booking_for_review(obj)
        obj._review_booking = booking
        return booking

    def get_habitacion(self, obj):
        stay = self._stay(obj)
        return stay.room.number if stay else None

    def get_check_in(self, obj):
        stay = self._stay(obj)
        return stay.check_in.isoformat() if stay else None

    def get_check_out(self, obj):
        stay = self._stay(obj)
        return stay.check_out.isoformat() if stay else None

    def get_total_amount(self, obj):
        stay = self._stay(obj)
        return str(stay.total_amount) if stay else None


class ReviewDetailSerializer(ReviewListSerializer):
    class Meta(ReviewListSerializer.Meta):
        fields = ReviewListSerializer.Meta.fields + ("status", "author")


class ReviewCreateSerializer(serializers.ModelSerializer):
    booking = serializers.PrimaryKeyRelatedField(
        queryset=Booking.objects.select_related("room"),
        required=False,
        allow_null=True,
    )
    category_ratings = serializers.JSONField(required=False)

    class Meta:
        model = Review
        fields = ("accommodation", "booking", "rating", "category_ratings", "comment")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("La puntuación debe estar entre 1 y 5.")
        return value

    def validate_category_ratings(self, value):
        cleaned = normalize_category_ratings(value)
        if value and not cleaned:
            raise serializers.ValidationError(
                "Las puntuaciones por categoría deben ser números del 1 al 5."
            )
        missing = [k for k in REVIEW_CATEGORY_KEYS if k not in cleaned]
        if missing and value:
            raise serializers.ValidationError(
                f"Califica todas las categorías ({len(REVIEW_CATEGORY_KEYS)} aspectos)."
            )
        return cleaned

    def validate(self, data):
        user = self.context["request"].user
        accommodation = data["accommodation"]
        booking_ref = data.get("booking")
        categories = data.get("category_ratings") or {}
        if not categories or len(categories) < len(REVIEW_CATEGORY_KEYS):
            raise serializers.ValidationError(
                {
                    "category_ratings": (
                        "Califica todos los aspectos de tu estadía antes de enviar."
                    )
                }
            )

        if not guest_has_completed_stay(user, accommodation.id):
            raise serializers.ValidationError(
                {
                    "accommodation": "Solo puedes reseñar hospedajes donde completaste una estadía."
                }
            )
        if guest_already_reviewed(user, accommodation.id):
            raise serializers.ValidationError(
                {"accommodation": "Ya enviaste una reseña para este hospedaje."}
            )

        if booking_ref:
            if booking_ref.room.accommodation_id != accommodation.id:
                raise serializers.ValidationError(
                    {"booking": "La reserva no corresponde a este hospedaje."}
                )
            if booking_ref.guest_id != user.id:
                raise serializers.ValidationError(
                    {"booking": "Solo puedes reseñar tus propias reservas."}
                )
            if booking_ref.status != Booking.Status.COMPLETADA:
                raise serializers.ValidationError(
                    {"booking": "Solo puedes reseñar reservas completadas."}
                )
        else:
            booking_ref = resolve_review_booking(user, accommodation.id)
            if not booking_ref:
                raise serializers.ValidationError(
                    {"accommodation": "No hay una reserva completada para vincular la reseña."}
                )
            data["booking"] = booking_ref

        return data

    def create(self, validated_data):
        user = self.context["request"].user
        accommodation = validated_data["accommodation"]
        booking = validated_data.get("booking")
        return create_guest_review(
            author=user,
            accommodation=accommodation,
            rating=validated_data["rating"],
            comment=validated_data["comment"],
            booking=booking,
            category_ratings=validated_data.get("category_ratings"),
        )


class ReviewModerateSerializer(serializers.Serializer):
    aprobada = serializers.BooleanField(default=True)
