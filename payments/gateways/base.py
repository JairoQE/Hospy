from dataclasses import dataclass


@dataclass
class GatewayChargeResult:
    ok: bool
    charge_id: str = ""
    order_id: str = ""
    user_message: str = ""
    raw: dict | None = None


class PaymentGatewayError(Exception):
    def __init__(self, message: str, *, raw: dict | None = None):
        super().__init__(message)
        self.raw = raw or {}
