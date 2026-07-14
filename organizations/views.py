"""APIs de página de empresa + verificación RUC."""

from __future__ import annotations

from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.parsers import FormParser, JSONParser, MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.factiliza import FactilizaError, lookup_ruc
from accounts.payout import validate_ruc
from accounts.permissions import IsPropietario
from audit.services import log_action

from .models import Organization, OrganizationMembership
from .serializers import OrganizationPublicSerializer, OrganizationSerializer


def _titular_org(user) -> Organization | None:
    membership = (
        OrganizationMembership.objects.filter(
            user=user,
            role=OrganizationMembership.Role.TITULAR,
        )
        .select_related("organization")
        .first()
    )
    return membership.organization if membership else None


class MyOrganizationView(APIView):
    """GET/POST/PATCH /api/v1/empresas/mia/ — página de empresa del titular."""

    permission_classes = (IsPropietario,)
    parser_classes = (MultiPartParser, FormParser, JSONParser)

    def get(self, request):
        org = _titular_org(request.user)
        if not org:
            return Response({"organization": None})
        return Response(
            {
                "organization": OrganizationSerializer(
                    org, context={"request": request}
                ).data
            }
        )

    def post(self, request):
        if _titular_org(request.user):
            return Response(
                {"detail": "Ya tienes una página de empresa. Puedes editarla."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        serializer = OrganizationSerializer(
            data=request.data, context={"request": request}
        )
        serializer.is_valid(raise_exception=True)
        org = serializer.save()
        log_action(
            actor=request.user,
            action="organization.create",
            target_type="Organization",
            target_id=org.pk,
            target_label=org.name,
            request=request,
        )
        return Response(
            {
                "detail": "Página de empresa creada.",
                "organization": OrganizationSerializer(
                    org, context={"request": request}
                ).data,
            },
            status=status.HTTP_201_CREATED,
        )

    def patch(self, request):
        org = _titular_org(request.user)
        if not org:
            return Response(
                {"detail": "Aún no tienes una página de empresa."},
                status=status.HTTP_404_NOT_FOUND,
            )
        serializer = OrganizationSerializer(
            org,
            data=request.data,
            partial=True,
            context={"request": request},
        )
        serializer.is_valid(raise_exception=True)
        org = serializer.save()
        log_action(
            actor=request.user,
            action="organization.update",
            target_type="Organization",
            target_id=org.pk,
            target_label=org.name,
            request=request,
        )
        return Response(
            {
                "detail": "Página de empresa actualizada.",
                "organization": OrganizationSerializer(
                    org, context={"request": request}
                ).data,
            }
        )


class OrganizationPublicView(APIView):
    """GET /api/v1/empresas/<slug>/ — página pública."""

    permission_classes = (permissions.AllowAny,)

    def get(self, request, slug):
        org = get_object_or_404(
            Organization.objects.select_related("created_by"),
            slug=slug,
            is_published=True,
        )
        # Titular puede ver su página aunque… is_published True required for public
        return Response(
            OrganizationPublicSerializer(org, context={"request": request}).data
        )


class OrganizationRucLookupView(APIView):
    """POST /api/v1/empresas/mia/ruc/consultar/"""

    permission_classes = (IsPropietario,)

    def post(self, request):
        org = _titular_org(request.user)
        if not org:
            return Response(
                {"detail": "Crea primero tu página de empresa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if org.is_verified:
            return Response(
                {
                    "detail": "Tu empresa ya está verificada.",
                    "organization": OrganizationSerializer(
                        org, context={"request": request}
                    ).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            ruc = validate_ruc(request.data.get("ruc", ""))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = lookup_ruc(ruc, user_id=request.user.id)
        except FactilizaError as exc:
            code = exc.status_code or 400
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"detail": str(exc)}, status=http)

        return Response(
            {
                "detail": "Datos listos. Revisa la razón social y confirma para verificar.",
                "empresa": result.as_public_dict(),
            }
        )


class OrganizationRucVerifyView(APIView):
    """POST /api/v1/empresas/mia/ruc/verificar/"""

    permission_classes = (IsPropietario,)

    def post(self, request):
        org = _titular_org(request.user)
        if not org:
            return Response(
                {"detail": "Crea primero tu página de empresa."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if org.is_verified:
            return Response(
                {
                    "detail": "Tu empresa ya está verificada.",
                    "organization": OrganizationSerializer(
                        org, context={"request": request}
                    ).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            ruc = validate_ruc(request.data.get("ruc", ""))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        # Unicidad: un RUC verificado por organización
        if (
            Organization.objects.filter(ruc=ruc, is_verified=True)
            .exclude(pk=org.pk)
            .exists()
        ):
            return Response(
                {"detail": "Este RUC ya está vinculado a otra empresa verificada."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            result = lookup_ruc(ruc, user_id=request.user.id)
        except FactilizaError as exc:
            code = exc.status_code or 400
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"detail": str(exc)}, status=http)

        if not result.is_operable():
            return Response(
                {
                    "detail": (
                        "SUNAT no reporta esta empresa como activa/habida. "
                        "No se puede verificar en Hospy."
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        update_name = bool(request.data.get("update_name", False))
        org.ruc = result.ruc
        org.legal_name = result.legal_name
        org.is_verified = True
        org.verified_at = timezone.now()
        fields = ["ruc", "legal_name", "is_verified", "verified_at", "updated_at"]
        if update_name and result.legal_name:
            org.name = result.legal_name[:160]
            fields.append("name")
        if not org.is_published:
            org.is_published = True
            fields.append("is_published")
        org.save(update_fields=fields)

        log_action(
            actor=request.user,
            action="organization.verify_ruc",
            target_type="Organization",
            target_id=org.pk,
            target_label=org.name,
            metadata={"ruc_prefix": result.ruc[:4] + "*******"},
            request=request,
        )
        return Response(
            {
                "detail": (
                    "Empresa verificada. Ahora tiene la insignia de empresa verificada."
                ),
                "organization": OrganizationSerializer(
                    org, context={"request": request}
                ).data,
            }
        )
