from django.urls import path

from . import views
from .webhooks import MercadoPagoWebhookView

urlpatterns = [
    path("pagos/metodos/", views.PaymentMethodsView.as_view(), name="payment-methods"),
    path(
        "reservas/<int:booking_id>/pago/",
        views.BookingPaymentView.as_view(),
        name="booking-payment",
    ),
    path(
        "pagos/<int:payment_id>/yape/",
        views.PaymentYapeView.as_view(),
        name="payment-yape",
    ),
    path(
        "pagos/<int:payment_id>/tarjeta/",
        views.PaymentCardView.as_view(),
        name="payment-card",
    ),
    path(
        "pagos/<int:payment_id>/pagoefectivo/",
        views.PaymentPagoEfectivoView.as_view(),
        name="payment-pagoefectivo",
    ),
    path(
        "pagos/webhook/mercadopago/",
        MercadoPagoWebhookView.as_view(),
        name="payment-mp-webhook",
    ),
]
