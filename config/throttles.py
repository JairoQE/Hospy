from rest_framework.throttling import AnonRateThrottle, UserRateThrottle


class AuthAnonRateThrottle(AnonRateThrottle):
    """RNF-08: máximo 10 intentos/minuto por IP en auth."""

    scope = "auth"


class BurstUserRateThrottle(UserRateThrottle):
    scope = "user"
