from rest_framework import serializers

from .models import Review
from .services import guest_already_reviewed, guest_has_completed_stay


class ReviewListSerializer(serializers.ModelSerializer):
    autor_nombre = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = (
            "id",
            "accommodation",
            "autor_nombre",
            "rating",
            "comment",
            "created_at",
        )

    def get_autor_nombre(self, obj):
        return obj.author.get_full_name() or obj.author.username


class ReviewDetailSerializer(ReviewListSerializer):
    class Meta(ReviewListSerializer.Meta):
        fields = ReviewListSerializer.Meta.fields + ("status", "author")


class ReviewCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ("accommodation", "rating", "comment")

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("La puntuación debe estar entre 1 y 5.")
        return value

    def validate(self, data):
        user = self.context["request"].user
        accommodation = data["accommodation"]
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
        return data

    def create(self, validated_data):
        return Review.objects.create(
            author=self.context["request"].user,
            status=Review.Status.PENDIENTE,
            **validated_data,
        )


class ReviewModerateSerializer(serializers.Serializer):
    aprobada = serializers.BooleanField(default=True)
