from django.conf import settings
from django.core.exceptions import ValidationError

from properties.images import validate_uploaded_image

ALLOWED_VIDEO_EXTENSIONS = {".mp4", ".webm", ".mov"}
MAX_DURATION = getattr(settings, "MAX_SPONSOR_AD_DURATION_SEC", 10)


def detect_media_type(filename: str, content_type: str | None) -> str:
    name = (filename or "").lower()
    ct = (content_type or "").lower()
    if name.endswith(".gif") or ct == "image/gif":
        return "gif"
    if any(name.endswith(ext) for ext in ALLOWED_VIDEO_EXTENSIONS) or ct.startswith("video/"):
        return "video"
    return "image"


def validate_sponsor_media(uploaded_file) -> str:
    """Valida archivo y devuelve media_type (image|gif|video)."""
    media_type = detect_media_type(uploaded_file.name, getattr(uploaded_file, "content_type", None))

    if media_type in ("image", "gif"):
        validate_uploaded_image(uploaded_file)
        return media_type

    max_bytes = getattr(settings, "MAX_UPLOAD_VIDEO_SIZE_MB", 15) * 1024 * 1024
    if uploaded_file.size > max_bytes:
        raise ValidationError(
            f"El video no puede superar {settings.MAX_UPLOAD_VIDEO_SIZE_MB} MB."
        )
    name = uploaded_file.name.lower()
    if not any(name.endswith(ext) for ext in ALLOWED_VIDEO_EXTENSIONS):
        raise ValidationError("Formatos de video permitidos: MP4, WEBM, MOV.")
    return "video"


def validate_duration_seconds(value: int) -> None:
    if value < 1 or value > MAX_DURATION:
        raise ValidationError(
            f"La duración en rotación debe estar entre 1 y {MAX_DURATION} segundos."
        )
