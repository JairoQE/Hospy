from __future__ import annotations

from datetime import timedelta
from decimal import Decimal
from typing import Any

from django.contrib.auth import get_user_model
from django.db.models import Count
from django.utils import timezone

from audit.models import AuditLog

from .ipguide import lookup_ip, lookup_request
from .models import IpSecurityAlert, create_security_alert

User = get_user_model()

ENRICH_ACTIONS = frozenset(
    {
        "booking.create",
        "booking.confirm",
        "booking.cancel",
        "payment.yape.success",
        "payment.card.success",
        "payment.pagoefectivo.create",
        "profile.change_password",
        "profile.change_email",
        "user.assign_admin",
        "user.revoke_admin",
        "user.owner.approve",
        "user.owner.reject",
        "accommodation.create",
        "auth.login",
        "auth.register",
        "auth.register_owner",
    }
)

SECURITY_SCAN_ACTIONS = frozenset(
    {
        "profile.change_password",
        "profile.change_email",
        "user.assign_admin",
        "user.revoke_admin",
        "auth.login",
        "auth.register",
        "auth.register_owner",
    }
)


def enrich_audit_metadata(
    request,
    action: str,
    metadata: dict[str, Any] | None,
) -> dict[str, Any]:
    """Añade ip_geo y flags de seguridad al metadata de auditoría."""
    meta = dict(metadata or {})
    if action not in ENRICH_ACTIONS:
        return meta

    geo = lookup_request(request, allow_fetch=False)
    if geo and not geo.get("country_code") and not geo.get("is_private"):
        geo = lookup_request(request, allow_fetch=True)
    if geo:
        meta["ip_geo"] = {
            k: geo[k]
            for k in (
                "country_code",
                "country",
                "city",
                "timezone",
                "latitude",
                "longitude",
                "asn",
                "organization",
                "is_datacenter",
            )
            if geo.get(k) not in (None, "", False)
        }
        if geo.get("is_datacenter"):
            meta["ip_flags"] = meta.get("ip_flags") or []
            if "datacenter" not in meta["ip_flags"]:
                meta["ip_flags"].append("datacenter")

    if action in SECURITY_SCAN_ACTIONS:
        flags = scan_account_security(request, action, geo, meta)
        if flags:
            meta["security_flags"] = flags

    return meta


def scan_account_security(
    request,
    action: str,
    geo: dict[str, Any],
    metadata: dict[str, Any],
) -> list[str]:
    flags: list[str] = []
    ip = geo.get("ip") if geo else None
    user = getattr(request, "user", None)
    actor = user if user and user.is_authenticated else None

    if geo.get("is_datacenter") and action in ("user.assign_admin", "user.revoke_admin"):
        flags.append("admin_from_datacenter")
        create_security_alert(
            kind=IpSecurityAlert.Kind.ADMIN_HOSTING,
            severity=IpSecurityAlert.Severity.HIGH,
            message="Acción de administrador desde red de hosting/datacenter",
            ip_address=ip,
            user=actor,
            metadata={"action": action, "ip_geo": geo},
        )

    if action == "profile.change_password" and actor and geo:
        prev_country = _user_primary_country(actor.pk, exclude_ip=ip)
        current = (geo.get("country_code") or "").upper()
        if prev_country and current and prev_country != current:
            flags.append("password_change_new_country")
            create_security_alert(
                kind=IpSecurityAlert.Kind.ACCOUNT_ANOMALY,
                severity=IpSecurityAlert.Severity.HIGH,
                message=(
                    f"Cambio de contraseña desde {current} "
                    f"(histórico habitual: {prev_country})"
                ),
                ip_address=ip,
                user=actor,
                metadata={"action": action, "ip_geo": geo},
            )

    if action in ("auth.register", "auth.register_owner") and ip:
        window = timezone.now() - timedelta(hours=24)
        same_asn = geo.get("asn")
        if same_asn:
            recent = AuditLog.objects.filter(
                action__in=("auth.register", "auth.register_owner"),
                created_at__gte=window,
                metadata__ip_geo__asn=same_asn,
            ).count()
            if recent >= 3:
                flags.append("registration_asn_burst")
                create_security_alert(
                    kind=IpSecurityAlert.Kind.REGISTRATION_ABUSE,
                    severity=IpSecurityAlert.Severity.MEDIUM,
                    message=f"Varios registros desde ASN {same_asn} en 24 h",
                    ip_address=ip,
                    user=actor,
                    metadata={"asn": same_asn, "count": recent + 1},
                )

    return flags


def _user_primary_country(user_id: int, *, exclude_ip: str | None = None) -> str:
    qs = (
        AuditLog.objects.filter(actor_id=user_id)
        .exclude(metadata__ip_geo__country_code__isnull=True)
        .order_by("-created_at")[:20]
    )
    counts: dict[str, int] = {}
    for row in qs:
        geo = (row.metadata or {}).get("ip_geo") or {}
        code = (geo.get("country_code") or "").upper()
        if not code or code == "LOCAL":
            continue
        if exclude_ip and row.ip_address == exclude_ip:
            continue
        counts[code] = counts.get(code, 0) + 1
    if not counts:
        return ""
    return max(counts, key=counts.get)


def assess_payment_risk(
    *,
    request,
    booking,
    amount: Decimal,
) -> dict[str, Any]:
    """Reglas suaves de riesgo para pagos (no bloquean, informan)."""
    geo = lookup_request(request)
    acc = booking.room.accommodation
    flags: list[str] = []
    score = 0
    messages: list[str] = []

    ip_country = (geo.get("country_code") or "").upper()
    prop_country = "PE"
    if acc.country and "per" in acc.country.lower():
        prop_country = "PE"

    if ip_country and ip_country not in ("PE", "LOCAL") and prop_country == "PE":
        flags.append("foreign_ip")
        score += 25
        messages.append("Pago desde fuera de Perú (puede ser turista internacional).")

    if geo.get("is_datacenter"):
        flags.append("datacenter_ip")
        score += 40
        messages.append("Conexión desde red de hosting o datacenter.")

    if amount >= Decimal("500") and score >= 25:
        flags.append("high_amount")
        score += 15

    level = "low"
    if score >= 55:
        level = "high"
    elif score >= 25:
        level = "medium"

    result = {
        "score": score,
        "level": level,
        "flags": flags,
        "messages": messages,
        "ip_geo": {
            k: geo[k]
            for k in ("country_code", "city", "organization", "is_datacenter")
            if geo.get(k) not in (None, "", False)
        },
    }

    if level in ("medium", "high"):
        create_security_alert(
            kind=IpSecurityAlert.Kind.PAYMENT_RISK,
            severity=(
                IpSecurityAlert.Severity.HIGH
                if level == "high"
                else IpSecurityAlert.Severity.MEDIUM
            ),
            message=" · ".join(messages) or "Riesgo elevado en pago",
            ip_address=geo.get("ip"),
            user=request.user if request.user.is_authenticated else None,
            metadata={
                "booking_id": booking.pk,
                "amount": str(amount),
                "risk": result,
            },
        )

    return result


def assess_owner_location(
    *,
    request,
    user,
    accommodation_city: str | None = None,
) -> dict[str, Any]:
    """Coherencia propietario / hospedaje vs IP."""
    geo = lookup_request(request)
    flags: list[str] = []
    ip_city = (geo.get("city") or "").lower()
    ip_country = (geo.get("country_code") or "").upper()
    acc_city = (accommodation_city or "").lower()

    if ip_country and ip_country not in ("PE", "LOCAL"):
        flags.append("owner_ip_abroad")
        create_security_alert(
            kind=IpSecurityAlert.Kind.OWNER_MISMATCH,
            severity=IpSecurityAlert.Severity.MEDIUM,
            message=f"Propietario operando desde {geo.get('country') or ip_country}",
            ip_address=geo.get("ip"),
            user=user,
            metadata={"ip_geo": geo, "accommodation_city": accommodation_city},
        )

    if acc_city and ip_city and acc_city not in ip_city and ip_city not in acc_city:
        if ip_country == "PE":
            flags.append("owner_city_mismatch")
            create_security_alert(
                kind=IpSecurityAlert.Kind.OWNER_MISMATCH,
                severity=IpSecurityAlert.Severity.LOW,
                message=(
                    f"Hospedaje en {accommodation_city} "
                    f"registrado desde IP en {geo.get('city')}"
                ),
                ip_address=geo.get("ip"),
                user=user,
                metadata={"ip_geo": geo, "accommodation_city": accommodation_city},
            )

    return {"flags": flags, "ip_geo": geo}
