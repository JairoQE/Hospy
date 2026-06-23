from django.conf import settings
from rest_framework import permissions, status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsHuesped, IsPropietario

from audit.services import log_action

from integrations.security import assess_payment_risk

from .models import Payment
from .serializers import (
    CardPaySerializer,
    ExternalPaymentRequestSerializer,
    OwnerPaymentListSerializer,
    PaymentMethodsSerializer,
    PaymentSerializer,
    YapePaySerializer,
)
from .services import (
    confirm_external_payment,
    create_pagoefectivo,
    create_payment_for_booking,
    get_available_methods,
    get_gateway_name,
    pay_with_card,
    pay_with_yape,
    request_external_payment,
)


def _payment_response(payment: Payment, request, *, instruction: str = "") -> dict:
    from accounts.payout import owner_has_online_payout_profile

    from .serializers import PaymentSerializer

    owner = payment.booking.room.accommodation.owner
    data = PaymentSerializer(payment).data
    data["online_checkout_available"] = owner_has_online_payout_profile(owner)
    data["owner_contact"] = {
        "name": owner.get_full_name() or owner.username,
        "phone": owner.phone or "",
    }
    if instruction:
        data["instruction"] = instruction
    return data


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
            booking = Booking.objects.select_related(
                "payment",
                "room__accommodation__owner",
            ).get(
                pk=booking_id,
                guest=request.user,
            )
        except Booking.DoesNotExist as exc:
            raise NotFound("Reserva no encontrada.") from exc
        if not hasattr(booking, "payment"):
            payment = create_payment_for_booking(booking)
            payment.booking = booking
            return payment
        payment = booking.payment
        payment.booking = booking
        return payment

    def get(self, request, booking_id: int):
        payment = self._get_booking_payment(request, booking_id)
        return Response(_payment_response(payment, request))

    def post(self, request, booking_id: int):
        payment = self._get_booking_payment(request, booking_id)
        return Response(
            _payment_response(payment, request),
            status=status.HTTP_201_CREATED,
        )


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


class PaymentExternalRequestView(APIView):
    """Huésped elige coordinar pago directo con el anfitrión."""

    permission_classes = (permissions.IsAuthenticated, IsHuesped)

    def post(self, request, payment_id: int):
        try:
            payment = Payment.objects.select_related(
                "booking",
                "booking__room__accommodation__owner",
            ).get(
                pk=payment_id,
                guest=request.user,
            )
        except Payment.DoesNotExist as exc:
            raise NotFound("Pago no encontrado.") from exc

        body = ExternalPaymentRequestSerializer(data=request.data)
        body.is_valid(raise_exception=True)

        try:
            payment = request_external_payment(
                payment,
                request.user,
                operation_number=body.validated_data["operation_number"],
                reported_amount=body.validated_data["reported_amount"],
            )
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        log_action(
            actor=request.user,
            action="payment.external.request",
            target_type="Payment",
            target_id=payment.pk,
            target_label=f"Pago directo reserva #{payment.booking_id}",
            metadata={
                "amount": str(payment.amount),
                "reported_amount": str(payment.guest_reported_amount),
                "operation_number": payment.external_operation_number,
            },
            request=request,
        )

        instruction = (
            "Contacta al anfitrión para acordar transferencia, Yape o efectivo. "
            "Cuando reciba el pago, confirmará la reserva en Hospy."
        )
        return Response(_payment_response(payment, request, instruction=instruction))


class PaymentExternalConfirmView(APIView):
    """Propietario confirma que recibió el pago externo."""

    permission_classes = (permissions.IsAuthenticated, IsPropietario)

    def post(self, request, payment_id: int):
        try:
            payment = Payment.objects.select_related(
                "booking",
                "booking__room__accommodation__owner",
            ).get(pk=payment_id)
        except Payment.DoesNotExist as exc:
            raise NotFound("Pago no encontrado.") from exc

        if payment.booking.room.accommodation.owner_id != request.user.id:
            raise ValidationError({"detail": "No tienes permiso para confirmar este pago."})

        try:
            payment = confirm_external_payment(payment, request.user)
        except ValueError as exc:
            raise ValidationError({"detail": str(exc)}) from exc

        log_action(
            actor=request.user,
            action="payment.external.confirm",
            target_type="Payment",
            target_id=payment.pk,
            target_label=f"Pago directo confirmado reserva #{payment.booking_id}",
            metadata={"amount": str(payment.amount)},
            request=request,
        )

        return Response(_payment_response(payment, request))


class OwnerPaymentsListView(APIView):
    """GET /api/v1/propietario/pagos/ — cobros de reservas del anfitrión."""

    permission_classes = (permissions.IsAuthenticated, IsPropietario)

    def get(self, request):
        qs = (
            Payment.objects.filter(booking__room__accommodation__owner=request.user)
            .select_related(
                "booking",
                "booking__room",
                "booking__room__accommodation",
                "booking__guest",
            )
            .order_by("-created_at")
        )
        method = (request.query_params.get("method") or "").strip()
        if method:
            qs = qs.filter(method=method)
        status = (request.query_params.get("status") or "").strip()
        if status:
            qs = qs.filter(status=status)
        return Response(
            OwnerPaymentListSerializer(qs[:200], many=True, context={"request": request}).data
        )
