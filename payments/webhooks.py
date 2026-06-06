from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_exempt

from .services import process_mercadopago_webhook


def _extract_mp_payment_id(request) -> str | None:
    data = request.data if isinstance(request.data, dict) else {}
    action = str(data.get("action") or "")
    topic = str(data.get("type") or request.query_params.get("topic") or "")

    if topic == "payment" or action.startswith("payment."):
        nested = data.get("data") or {}
        if isinstance(nested, dict) and nested.get("id"):
            return str(nested["id"])

    for key in ("data.id", "id"):
        value = request.query_params.get(key)
        if value:
            return str(value)

    return None


@method_decorator(csrf_exempt, name="dispatch")
class MercadoPagoWebhookView(APIView):
    """Notificaciones de Mercado Pago (PagoEfectivo y pagos asíncronos)."""

    permission_classes = (permissions.AllowAny,)
    authentication_classes = ()

    def post(self, request):
        mp_payment_id = _extract_mp_payment_id(request)
        if mp_payment_id:
            process_mercadopago_webhook(mp_payment_id)
        return Response({"ok": True}, status=status.HTTP_200_OK)

    def get(self, request):
        mp_payment_id = _extract_mp_payment_id(request)
        if mp_payment_id:
            process_mercadopago_webhook(mp_payment_id)
        return Response({"ok": True}, status=status.HTTP_200_OK)
