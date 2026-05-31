from rest_framework import generics, mixins, permissions, viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response

from accounts.permissions import IsAdministrador, IsHuesped
from audit.services import log_action

from .models import Review
from .serializers import (
    ReviewCreateSerializer,
    ReviewDetailSerializer,
    ReviewListSerializer,
    ReviewModerateSerializer,
)
from .services import moderate_review


class ReviewViewSet(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    """Reseñas: huésped crea; admin modera; público ve aprobadas."""

    def get_queryset(self):
        return Review.objects.select_related(
            "accommodation",
            "author",
            "booking",
            "booking__room",
        )

    def get_serializer_class(self):
        if self.action == "create":
            return ReviewCreateSerializer
        if self.action in ("pendientes", "moderar"):
            return ReviewDetailSerializer
        if self.action == "mias":
            return ReviewDetailSerializer
        return ReviewListSerializer

    def get_permissions(self):
        if self.action == "create":
            return [IsHuesped()]
        if self.action in ("moderar", "pendientes"):
            return [IsAdministrador()]
        if self.action == "mias":
            return [IsHuesped()]
        return [permissions.IsAuthenticated()]

    def create(self, request):
        serializer = ReviewCreateSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        review = serializer.save()
        log_action(
            actor=request.user,
            action="review.create",
            target_type="Review",
            target_id=review.pk,
            target_label=review.accommodation.name,
            metadata={"rating": review.rating},
            request=request,
        )
        return Response(
            ReviewDetailSerializer(review).data,
            status=201,
        )

    @action(detail=False, methods=["get"], url_path="mias")
    def mias(self, request):
        qs = self.get_queryset().filter(author=request.user).order_by("-created_at")
        page = self.paginate_queryset(qs)
        serializer = ReviewDetailSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="pendientes")
    def pendientes(self, request):
        qs = (
            self.get_queryset()
            .filter(status=Review.Status.PENDIENTE)
            .order_by("created_at")
        )
        page = self.paginate_queryset(qs)
        serializer = ReviewDetailSerializer(page if page is not None else qs, many=True)
        if page is not None:
            return self.get_paginated_response(serializer.data)
        return Response(serializer.data)

    @action(detail=True, methods=["post"], url_path="moderar")
    def moderar(self, request, pk=None):
        review = self.get_object()
        serializer = ReviewModerateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            review = moderate_review(review, serializer.validated_data["aprobada"])
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)})
        approved = serializer.validated_data["aprobada"]
        log_action(
            actor=request.user,
            action="review.moderate_approve" if approved else "review.moderate_reject",
            target_type="Review",
            target_id=review.pk,
            target_label=review.accommodation.name,
            request=request,
        )
        return Response(ReviewDetailSerializer(review).data)


class AccommodationReviewListView(generics.ListAPIView):
    """GET /api/v1/hospedajes/{id}/resenas/ — solo aprobadas."""

    serializer_class = ReviewListSerializer
    permission_classes = (permissions.AllowAny,)

    def get_queryset(self):
        return (
            Review.objects.filter(
                accommodation_id=self.kwargs["hospedaje_pk"],
                status=Review.Status.APROBADA,
            )
            .select_related("author", "booking", "booking__room")
            .order_by("-created_at")
        )
