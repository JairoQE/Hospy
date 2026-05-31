from datetime import datetime, timedelta

from django.db.models import Count, Q
from django.utils import timezone
from django.utils.dateparse import parse_date, parse_datetime
from rest_framework import generics
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdministrador

from .actions import ACTION_SEVERITY, CRITICAL_ACTIONS
from .models import AuditLog
from .retention import active_queryset, retention_stats, run_retention_cycle
from .serializers import AuditLogSerializer


class AuditLogPagination(PageNumberPagination):
    page_size = 50
    page_size_query_param = "page_size"
    max_page_size = 200


def _parse_date_param(value: str, *, end_of_day: bool = False):
    if not value:
        return None
    dt = parse_datetime(value)
    if dt is not None:
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt, timezone.get_current_timezone())
        return dt
    day = parse_date(value)
    if day is None:
        return None
    t = datetime.max.time() if end_of_day else datetime.min.time()
    dt = datetime.combine(day, t)
    return timezone.make_aware(dt, timezone.get_current_timezone())


def _filtered_queryset(params):
    archived = (params.get("archived") or "").strip().lower()
    if archived in ("1", "true", "yes"):
        qs = AuditLog.objects.filter(is_archived=True)
    else:
        qs = active_queryset()

    role = (params.get("role") or "").strip()
    if role:
        qs = qs.filter(actor_role=role)

    action = (params.get("action") or "").strip()
    if action:
        qs = qs.filter(action=action)

    action_prefix = (params.get("action_prefix") or "").strip()
    if action_prefix:
        qs = qs.filter(action__startswith=action_prefix)

    category = (params.get("category") or "").strip()
    if category == "account":
        qs = qs.filter(Q(action__startswith="user.") | Q(action__startswith="profile."))
    elif category == "property":
        qs = qs.filter(Q(action__startswith="accommodation.") | Q(action__startswith="browse_tile."))
    elif category == "site":
        qs = qs.filter(Q(action__startswith="site_design.") | Q(action__startswith="browse_tile."))
    elif category == "booking":
        qs = qs.filter(action__startswith="booking.")
    elif category == "review":
        qs = qs.filter(action__startswith="review.")
    elif category == "moderation":
        qs = qs.filter(
            Q(action__startswith="message_report.")
            | Q(action__startswith="sponsor_report.")
            | Q(action__contains="moderate")
        )
    elif category == "sponsor":
        qs = qs.filter(Q(action__startswith="sponsor_ad.") | Q(action__startswith="sponsor_report."))

    severity = (params.get("severity") or "").strip()
    if severity == "critical":
        qs = qs.filter(action__in=CRITICAL_ACTIONS)
    elif severity in ("high", "medium", "low"):
        matching = [a for a, s in ACTION_SEVERITY.items() if s == severity]
        if matching:
            qs = qs.filter(action__in=matching)
        elif severity == "low":
            qs = qs.exclude(action__in=list(ACTION_SEVERITY.keys()))

    date_from = _parse_date_param(params.get("date_from") or "")
    if date_from:
        qs = qs.filter(created_at__gte=date_from)

    date_to = _parse_date_param(params.get("date_to") or "", end_of_day=True)
    if date_to:
        qs = qs.filter(created_at__lte=date_to)

    q = (params.get("q") or "").strip()
    if q:
        qs = qs.filter(
            Q(actor_email__icontains=q)
            | Q(actor_name__icontains=q)
            | Q(target_label__icontains=q)
            | Q(action__icontains=q)
            | Q(ip_address__icontains=q)
        )

    return qs


class AuditLogListView(generics.ListAPIView):
    """GET /api/v1/audit-logs/ — solo administradores."""

    serializer_class = AuditLogSerializer
    permission_classes = (IsAdministrador,)
    pagination_class = AuditLogPagination

    def get_queryset(self):
        return _filtered_queryset(self.request.query_params)


class AuditLogSummaryView(APIView):
    """GET /api/v1/audit-logs/resumen/ — métricas globales de auditoría."""

    permission_classes = (IsAdministrador,)

    def get(self, request):
        now = timezone.now()
        base = active_queryset()
        last_24h = now - timedelta(hours=24)
        last_7d = now - timedelta(days=7)

        by_role = {
            row["actor_role"] or "sistema": row["c"]
            for row in base.values("actor_role")
            .annotate(c=Count("id"))
            .order_by("-c")
        }

        return Response(
            {
                "total": base.count(),
                "last_24h": base.filter(created_at__gte=last_24h).count(),
                "last_7d": base.filter(created_at__gte=last_7d).count(),
                "critical_events": base.filter(action__in=CRITICAL_ACTIONS).count(),
                "admin_actions": base.filter(actor_role="administrador").count(),
                "by_role": by_role,
            }
        )


ALERT_SEVERITIES = ("critical", "high")


class AuditLogAlertsView(APIView):
    """GET /api/v1/audit-logs/alertas/ — eventos críticos/altos desde after_id."""

    permission_classes = (IsAdministrador,)

    def get(self, request):
        after_raw = (request.query_params.get("after_id") or "").strip()
        after_id = int(after_raw) if after_raw.isdigit() else 0

        alert_actions = [
            action
            for action, level in ACTION_SEVERITY.items()
            if level in ALERT_SEVERITIES
        ]

        qs = (
            active_queryset()
            .filter(action__in=alert_actions)
            .order_by("id")
        )
        if after_id > 0:
            qs = qs.filter(id__gt=after_id)
            alerts = list(qs[:20])
        else:
            alerts = []
        latest = active_queryset().order_by("-id").values_list("id", flat=True).first()

        return Response(
            {
                "latest_id": latest or 0,
                "count": len(alerts),
                "alerts": AuditLogSerializer(alerts, many=True).data,
            }
        )


class AuditLogRetentionView(APIView):
    """GET /api/v1/audit-logs/retencion/ — política y contadores."""

    permission_classes = (IsAdministrador,)

    def get(self, request):
        return Response(retention_stats())


class AuditLogRetentionRunView(APIView):
    """POST /api/v1/audit-logs/retencion/ejecutar/ — archivar y purgar manualmente."""

    permission_classes = (IsAdministrador,)

    def post(self, request):
        result = run_retention_cycle()
        stats = retention_stats()
        return Response({**result, **stats})
