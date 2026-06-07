from django.conf import settings
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsHuesped

from audit.services import log_action

from integrations.security import assess_payment_risk

from .models import Payment
from .serializers import (
    CardPaySerializer,
    PaymentMethodsSerializer,
    PaymentSerializer,
    YapePaySerializer,
)
from .services import (
    create_pagoefectivo,
    create_payment_for_booking,
    get_available_methods,
    get_gateway_name,
    pay_with_card,
    pay_with_yape,
)


class PaymentMethodsView(APIView):
    permission_classes = (permissions.AllowAny,)

    def get(self, request):
        payload = {
            "gateway": get_gateway_name(),
            "culqi_public_key": getattr(settings, "CULQI_PUBLIC_KEY", ""),
            "mp_public_key": getattr(settings, "MP_PUBLIC_KEY", ""),
            "mp_webhook_url": request.build_absolute_uri("/api/v1/pagos/webhook/mercadopago/"),
            "methods": get_available_methods(),
        }
        return Response(PaymentMethodsSerializer(payload).data)


class BookingPaymentView(APIView):
    """GET/POST pago asociado a una reserva."""

    permission_classes = (permissions.IsAuthenticated, IsHuesped)

    def _get_booking_payment(self, request, booking_id: int) -> Payment:
        from bookings.models import Booking

        try:
            booking = Booking.objects.select_related("payment").get(
                pk=booking_id,
                guest=request.user,
            )
        except Booking.DoesNotExist as exc:
            raise NotFound("Reserva no encontrada.") from exc
        if not hasattr(booking, "payment"):
            return create_payment_for_booking(booking)
        return booking.payment

    def get(self, request, booking_id: int):
        payment = self._get_booking_payment(request, booking_id)
        return Response(PaymentSerializer(payment).data)

    def post(self, request, booking_id: int):
        payment = self._get_booking_payment(request, booking_id)
        return Response(PaymentSerializer(payment).data, status=status.HTTP_201_CREATED)


class PaymentYapeView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsHuesped)

    def post(self, request, payment_id: int):
        try:
            payment = Payment.objects.select_related("booking").get(
                pk=payment_id,
                guest=request.user,
            )
        except Payment.DoesNotExist as exc:
            raise NotFound("Pago no encontrado.") from exc

        serializer = YapePaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = pay_with_yape(
                payment,
                request.user,
                phone=serializer.validated_data["phone"],
                otp=serializer.validated_data["otp"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        risk = assess_payment_risk(
            request=request,
            booking=payment.booking,
            amount=payment.amount,
        )

        if payment.status == Payment.Status.PAGADO:
            log_action(
                actor=request.user,
                action="payment.yape.success",
                target_type="Payment",
                target_id=payment.pk,
                target_label=f"Pago Yape reserva #{payment.booking_id}",
                metadata={"amount": str(payment.amount), "payment_risk": risk},
                request=request,
            )
        data = PaymentSerializer(payment).data
        data["ip_risk"] = risk
        return Response(data)


class PaymentCardView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsHuesped)

    def post(self, request, payment_id: int):
        try:
            payment = Payment.objects.select_related("booking").get(
                pk=payment_id,
                guest=request.user,
            )
        except Payment.DoesNotExist as exc:
            raise NotFound("Pago no encontrado.") from exc

        serializer = CardPaySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        try:
            payment = pay_with_card(
                payment,
                request.user,
                source_id=serializer.validated_data["source_id"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        risk = assess_payment_risk(
            request=request,
            booking=payment.booking,
            amount=payment.amount,
        )

        if payment.status == Payment.Status.PAGADO:
            log_action(
                actor=request.user,
                action="payment.card.success",
                target_type="Payment",
                target_id=payment.pk,
                target_label=f"Pago tarjeta reserva #{payment.booking_id}",
                metadata={"amount": str(payment.amount), "payment_risk": risk},
                request=request,
            )
        data = PaymentSerializer(payment).data
        data["ip_risk"] = risk
        return Response(data)


class PaymentPagoEfectivoView(APIView):
    permission_classes = (permissions.IsAuthenticated, IsHuesped)

    def post(self, request, payment_id: int):
        try:
            payment = Payment.objects.select_related("booking").get(
                pk=payment_id,
                guest=request.user,
            )
        except Payment.DoesNotExist as exc:
            raise NotFound("Pago no encontrado.") from exc

        try:
            payment, message = create_pagoefectivo(payment, request.user)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        risk = assess_payment_risk(
            request=request,
            booking=payment.booking,
            amount=payment.amount,
        )
        log_action(
            actor=request.user,
            action="payment.pagoefectivo.create",
            target_type="Payment",
            target_id=payment.pk,
            target_label=f"PagoEfectivo reserva #{payment.booking_id}",
            metadata={"amount": str(payment.amount), "payment_risk": risk},
            request=request,
        )

        data = PaymentSerializer(payment).data
        data["instruction"] = message
        data["ip_risk"] = risk
        return Response(data)
