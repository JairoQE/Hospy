from django.conf import settings
from django.contrib.auth import get_user_model
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import generics, permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.auth_throttle import AuthEndpointThrottle
from accounts.permissions import IsAdministrador
from accounts.platform_contact import build_platform_contact_payload
from audit.services import log_action
from sponsors.models import SponsorAd, SponsorAdReport
from sponsors.permissions import IsPatrocinador
from sponsors.serializers import (
    SponsorAdCreateSerializer,
    SponsorAdPublicSerializer,
    SponsorAdReportAdminSerializer,
    SponsorAdReportCreateSerializer,
    SponsorAdReportResolveSerializer,
    SponsorAdSerializer,
)

User = get_user_model()


class SponsorContactConfigView(APIView):
    permission_classes = (permissions.AllowAny,)
    throttle_classes = (AuthEndpointThrottle,)

    def get(self, request):
        payload = build_platform_contact_payload()
        payload["max_duration_seconds"] = getattr(
            settings, "MAX_SPONSOR_AD_DURATION_SEC", 10
        )
        return Response(payload)


class ActiveAdsPublicView(generics.ListAPIView):
    serializer_class = SponsorAdPublicSerializer
    permission_classes = (permissions.AllowAny,)
    pagination_class = None

    def get_queryset(self):
        return (
            SponsorAd.objects.filter(
                status=SponsorAd.Status.APROBADO,
                is_active=True,
                sponsor__role=User.Role.PATROCINADOR,
                sponsor__sponsor_status=User.SponsorStatus.APROBADO,
            )
            .select_related("sponsor")
            .order_by("display_order", "id")
        )


class MySponsorAdsView(generics.ListCreateAPIView):
    permission_classes = (IsPatrocinador,)

    def get_serializer_class(self):
        if self.request.method == "POST":
            return SponsorAdCreateSerializer
        return SponsorAdSerializer

    def get_queryset(self):
        return SponsorAd.objects.filter(sponsor=self.request.user)

    def perform_create(self, serializer):
        ad = serializer.save(
            sponsor=self.request.user,
            status=SponsorAd.Status.APROBADO,
            is_active=True,
            rejection_reason="",
            takedown_reason="",
        )
        log_action(
            actor=self.request.user,
            action="sponsor_ad.create",
            target_type="SponsorAd",
            target_id=ad.pk,
            target_label=ad.title or f"Anuncio #{ad.pk}",
            request=self.request,
        )


class MySponsorAdDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = (IsPatrocinador,)
    serializer_class = SponsorAdSerializer

    def get_queryset(self):
        return SponsorAd.objects.filter(sponsor=self.request.user)

    def perform_update(self, serializer):
        extra = {}
        validated = serializer.validated_data
        if "media" in validated:
            extra = {
                "status": SponsorAd.Status.APROBADO,
                "is_active": True,
                "rejection_reason": "",
                "takedown_reason": "",
            }
        elif set(validated.keys()) <= {"is_active"}:
            pass
        elif self.get_object().status == SponsorAd.Status.BAJA:
            extra["status"] = SponsorAd.Status.APROBADO
            extra["takedown_reason"] = ""
        ad = serializer.save(**extra)
        log_action(
            actor=self.request.user,
            action="sponsor_ad.update",
            target_type="SponsorAd",
            target_id=ad.pk,
            target_label=ad.title or f"Anuncio #{ad.pk}",
            metadata={"fields": list(validated.keys())},
            request=self.request,
        )

    def perform_destroy(self, instance):
        ad_id = instance.pk
        label = instance.title
        instance.delete()
        log_action(
            actor=self.request.user,
            action="sponsor_ad.delete",
            target_type="SponsorAd",
            target_id=ad_id,
            target_label=label,
            request=self.request,
        )


class SponsorAdReportView(APIView):
    """POST /api/v1/anuncios/{id}/reportar/ — usuarios autenticados."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request, pk):
        ad = get_object_or_404(
            SponsorAd,
            pk=pk,
            status=SponsorAd.Status.APROBADO,
            is_active=True,
        )
        if ad.sponsor_id == request.user.id:
            return Response(
                {"detail": "No puedes reportar tu propio anuncio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        serializer = SponsorAdReportCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        if SponsorAdReport.objects.filter(ad=ad, reporter=request.user).exists():
            return Response(
                {"detail": "Ya reportaste este anuncio."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        report = SponsorAdReport.objects.create(
            ad=ad,
            reporter=request.user,
            reason=serializer.validated_data["reason"],
            detail=serializer.validated_data.get("detail", ""),
        )
        return Response(
            {"detail": "Reporte enviado. Gracias por ayudarnos a mantener Hospy seguro."},
            status=status.HTTP_201_CREATED,
            headers={"X-Report-Id": str(report.id)},
        )


class SponsorAdReportsAdminView(generics.ListAPIView):
    serializer_class = SponsorAdReportAdminSerializer
    permission_classes = (IsAdministrador,)

    def get_queryset(self):
        return SponsorAdReport.objects.filter(
            status=SponsorAdReport.Status.PENDIENTE,
        ).select_related("ad", "ad__sponsor", "reporter")


class SponsorAdReportResolveView(APIView):
    permission_classes = (IsAdministrador,)

    def post(self, request, pk):
        report = get_object_or_404(
            SponsorAdReport,
            pk=pk,
            status=SponsorAdReport.Status.PENDIENTE,
        )
        serializer = SponsorAdReportResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        now = timezone.now()

        report.admin_notes = data.get("admin_notes", "")
        report.reviewed_by = request.user
        report.reviewed_at = now

        if data["accion"] == "descartar":
            report.status = SponsorAdReport.Status.DESCARTADO
            report.save()
            log_action(
                actor=request.user,
                action="sponsor_report.resolve",
                target_type="SponsorAdReport",
                target_id=report.pk,
                target_label=report.ad.title,
                metadata={"accion": "descartar"},
                request=request,
            )
            return Response(SponsorAdReportAdminSerializer(report).data)

        warning = data["warning"].strip()
        ad = report.ad
        ad.status = SponsorAd.Status.BAJA
        ad.is_active = False
        ad.takedown_reason = report.detail or report.get_reason_display()
        ad.save(update_fields=["status", "is_active", "takedown_reason"])

        report.status = SponsorAdReport.Status.RESUELTO
        report.warning_sent = warning
        report.save()

        sponsor = ad.sponsor
        sponsor.sponsor_warning_message = warning
        sponsor.sponsor_warning_at = now
        sponsor.save(update_fields=["sponsor_warning_message", "sponsor_warning_at"])

        log_action(
            actor=request.user,
            action="sponsor_report.resolve",
            target_type="SponsorAdReport",
            target_id=report.pk,
            target_label=ad.title,
            metadata={"accion": "baja_anuncio", "warning": warning},
            request=request,
        )

        return Response(SponsorAdReportAdminSerializer(report).data)
