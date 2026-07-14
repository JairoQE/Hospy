"""Verificación de identidad (DNI / Factiliza / RENIEC)."""

from __future__ import annotations

from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from audit.services import log_action

from .factiliza import FactilizaError, lookup_dni
from .payout import validate_dni
from .serializers import UserSerializer


class IdentityLookupView(APIView):
    """POST /api/v1/auth/identidad/consultar/ — preview nombres desde DNI."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if request.user.is_identity_verified:
            return Response(
                {
                    "detail": "Tu identidad ya está verificada.",
                    "is_identity_verified": True,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            dni = validate_dni(request.data.get("dni", ""))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            result = lookup_dni(dni, user_id=request.user.id)
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
                "detail": "Datos listos. Revisa el formulario y confirma para verificar tu identidad.",
                "persona": result.as_public_dict(),
            }
        )


class IdentityVerifyView(APIView):
    """POST /api/v1/auth/identidad/verificar/ — confirma y marca usuario verificado."""

    permission_classes = (permissions.IsAuthenticated,)

    def post(self, request):
        if request.user.is_identity_verified:
            return Response(
                {
                    "detail": "Tu identidad ya está verificada.",
                    "user": UserSerializer(request.user, context={"request": request}).data,
                },
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            dni = validate_dni(request.data.get("dni", ""))
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=status.HTTP_400_BAD_REQUEST)

        update_profile = bool(request.data.get("update_profile", True))

        try:
            result = lookup_dni(dni, user_id=request.user.id)
        except FactilizaError as exc:
            code = exc.status_code or 400
            http = (
                status.HTTP_503_SERVICE_UNAVAILABLE
                if code >= 500
                else status.HTTP_400_BAD_REQUEST
            )
            return Response({"detail": str(exc)}, status=http)

        user = request.user
        user.is_identity_verified = True
        user.identity_verified_at = timezone.now()
        user.identity_document_number = result.numero
        user.identity_full_name = result.nombre_completo
        fields = [
            "is_identity_verified",
            "identity_verified_at",
            "identity_document_number",
            "identity_full_name",
        ]
        if update_profile:
            if result.nombres:
                user.first_name = result.nombres.title()
                fields.append("first_name")
            last = " ".join(
                p for p in (result.apellido_paterno, result.apellido_materno) if p
            ).strip()
            if last:
                user.last_name = last.title()
                fields.append("last_name")
            # Si es propietario y no tiene DNI de cobro, reutilizar el verificado
            if not (user.payout_document_number or "").strip():
                user.payout_document_number = result.numero
                fields.append("payout_document_number")

        user.save(update_fields=fields)
        log_action(
            actor=user,
            action="identity.verify",
            target_type="User",
            target_id=user.pk,
            target_label=user.email,
            metadata={"dni_prefix": result.numero[:4] + "****"},
            request=request,
        )
        return Response(
            {
                "detail": (
                    "Identidad verificada. Ahora tienes el badge de usuario verificado "
                    "y beneficios como prioridad en reseñas."
                ),
                "user": UserSerializer(user, context={"request": request}).data,
            }
        )
