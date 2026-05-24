from config.throttles import AuthAnonRateThrottle


class AuthEndpointThrottle(AuthAnonRateThrottle):
    """Aplica límite auth solo en login, registro y reset."""

    pass
