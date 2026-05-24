from rest_framework.views import exception_handler


def custom_exception_handler(exc, context):
    """Respuestas de error con `detail` legible y `errors` por campo."""
    response = exception_handler(exc, context)
    if response is not None and isinstance(response.data, dict):
        if "detail" not in response.data:
            field_errors = dict(response.data)
            messages = []
            for key, val in field_errors.items():
                if isinstance(val, list):
                    for item in val:
                        messages.append(
                            str(item) if key in ("non_field_errors", "detail") else f"{key}: {item}"
                        )
                else:
                    messages.append(f"{key}: {val}")
            if messages:
                response.data = {
                    "detail": messages[0] if len(messages) == 1 else " ".join(messages),
                    "errors": field_errors,
                }
    return response
