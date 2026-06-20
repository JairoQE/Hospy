"""
Lógica de políticas de reembolso por hospedaje (cada Accommodation / local).

Cada propietario puede tener reglas distintas en cada uno de sus locales; no hay política
global a nivel de cuenta.

Árbol de decisión (resumen)
---------------------------
1. ¿La reserva se puede cancelar en la app?  → bookings.services.booking_cancellation_status
2. Si sí, ¿qué % del total se reembolsa?     → estimate_refund_percent (este módulo)
3. ¿Cómo se devuelve el dinero?              → pasarela (MP) o acuerdo directo (pago externo)

Tipos de política del propietario
---------------------------------
- flexible:     100 % si cancelas con >= N h de anticipación (N configurable, default 48)
- moderate:     100 % con >= 5 días; 50 % con >= 48 h; 0 % después
- strict:       50 % con >= 7 días; 0 % después
- non_refundable: 0 % (solo cancelación sin devolución automática)
- custom:       texto libre del anfitrión; el % no se calcula automáticamente
"""

from dataclasses import dataclass
from datetime import datetime, time, timedelta

from django.utils import timezone

# Umbrales en horas antes del check-in (00:00 del día de entrada)
MODERATE_FULL_HOURS = 120  # 5 días
MODERATE_PARTIAL_HOURS = 48
MODERATE_PARTIAL_PERCENT = 50

STRICT_PARTIAL_HOURS = 168  # 7 días
STRICT_PARTIAL_PERCENT = 50

FLEXIBLE_DEFAULT_HOURS = 48


@dataclass(frozen=True)
class RefundEstimate:
    percent: int | None  # None = no calculable (custom / consultar anfitrión)
    label: str
    policy_type: str


REFUND_POLICY_META = {
    "flexible": {
        "name": "Flexible",
        "summary": "Reembolso completo si cancelas con suficiente anticipación.",
    },
    "moderate": {
        "name": "Moderada",
        "summary": "Reembolso total hasta 5 días antes; parcial hasta 48 h antes del check-in.",
    },
    "strict": {
        "name": "Estricta",
        "summary": "50 % hasta 7 días antes; sin reembolso después.",
    },
    "non_refundable": {
        "name": "No reembolsable",
        "summary": "Sin devolución automática al cancelar.",
    },
    "custom": {
        "name": "Personalizada",
        "summary": "Condiciones definidas por el anfitrión (ver detalle).",
    },
}


def hours_until_checkin(check_in, *, at: datetime | None = None) -> float:
    """Horas restantes hasta el check-in (medianoche local del día de entrada)."""
    at = at or timezone.now()
    if isinstance(check_in, datetime):
        check_in_date = check_in.date()
    else:
        check_in_date = check_in
    check_in_dt = timezone.make_aware(
        datetime.combine(check_in_date, time.min),
        timezone.get_current_timezone(),
    )
    delta = check_in_dt - at
    return max(0.0, delta.total_seconds() / 3600)


def _flexible_hours(accommodation) -> int:
    hours = getattr(accommodation, "refund_hours_before_full", None)
    if hours is not None and hours > 0:
        return int(hours)
    return FLEXIBLE_DEFAULT_HOURS


def estimate_refund_percent(accommodation, *, check_in, at: datetime | None = None) -> RefundEstimate:
    """Estima el % reembolsable según la política del hospedaje y el momento de cancelación."""
    policy = getattr(accommodation, "refund_policy_type", None) or "flexible"
    hours_left = hours_until_checkin(check_in, at=at)

    if policy == "non_refundable":
        return RefundEstimate(0, "Sin reembolso según la política de este alojamiento.", policy)

    if policy == "custom":
        return RefundEstimate(
            None,
            "Reembolso según acuerdo con el anfitrión (ver política del local).",
            policy,
        )

    if policy == "flexible":
        threshold = _flexible_hours(accommodation)
        if hours_left >= threshold:
            return RefundEstimate(
                100,
                f"Reembolso completo (cancelación con al menos {threshold} h de anticipación).",
                policy,
            )
        return RefundEstimate(
            0,
            f"Sin reembolso automático (menos de {threshold} h antes del check-in).",
            policy,
        )

    if policy == "moderate":
        if hours_left >= MODERATE_FULL_HOURS:
            return RefundEstimate(100, "Reembolso completo (más de 5 días antes del check-in).", policy)
        if hours_left >= MODERATE_PARTIAL_HOURS:
            return RefundEstimate(
                MODERATE_PARTIAL_PERCENT,
                f"Reembolso del {MODERATE_PARTIAL_PERCENT} % (entre 48 h y 5 días antes).",
                policy,
            )
        return RefundEstimate(0, "Sin reembolso (menos de 48 h antes del check-in).", policy)

    if policy == "strict":
        if hours_left >= STRICT_PARTIAL_HOURS:
            return RefundEstimate(
                STRICT_PARTIAL_PERCENT,
                f"Reembolso del {STRICT_PARTIAL_PERCENT} % (más de 7 días antes).",
                policy,
            )
        return RefundEstimate(0, "Sin reembolso (menos de 7 días antes del check-in).", policy)

    return RefundEstimate(None, "Política no definida.", policy)


def refund_policy_bullets(accommodation) -> list[str]:
    """Texto para mostrar en la ficha pública."""
    policy = getattr(accommodation, "refund_policy_type", None) or "flexible"
    notes = (getattr(accommodation, "refund_policy_notes", None) or "").strip()

    if policy == "flexible":
        h = _flexible_hours(accommodation)
        bullets = [f"Reembolso del 100 % si cancelas al menos {h} horas antes del check-in."]
    elif policy == "moderate":
        bullets = [
            "100 % de reembolso si cancelas 5 días o más antes del check-in.",
            "50 % si cancelas entre 48 horas y 5 días antes.",
            "Sin reembolso si cancelas con menos de 48 horas de anticipación.",
        ]
    elif policy == "strict":
        bullets = [
            "50 % de reembolso si cancelas 7 días o más antes del check-in.",
            "Sin reembolso con menos de 7 días de anticipación.",
        ]
    elif policy == "non_refundable":
        bullets = ["Las reservas no tienen reembolso automático al cancelar."]
    else:
        bullets = []

    if notes:
        bullets.append(notes)
    elif policy == "custom":
        bullets.append("Consulta las condiciones indicadas por el anfitrión.")

    bullets.append(
        "El abono se procesa según el método de pago (pasarela o acuerdo directo con el anfitrión)."
    )
    return bullets
