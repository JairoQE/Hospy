from io import BytesIO
from pathlib import Path

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import InMemoryUploadedFile
from PIL import Image

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_DIMENSION = 4096
DEFAULT_MAX_SIZE = (1920, 1920)
WEBP_QUALITY = int(getattr(settings, "IMAGE_WEBP_QUALITY", 85))


def validate_uploaded_image(image_file) -> None:
    """Valida tipo, tamaño y dimensiones antes de guardar."""
    max_bytes = settings.MAX_UPLOAD_IMAGE_SIZE_MB * 1024 * 1024
    if image_file.size > max_bytes:
        raise ValidationError(
            f"La imagen no puede superar {settings.MAX_UPLOAD_IMAGE_SIZE_MB} MB."
        )

    try:
        img = Image.open(image_file)
        img.verify()
    except Exception as exc:
        raise ValidationError("Archivo de imagen inválido.") from exc

    image_file.seek(0)
    img = Image.open(image_file)
    if img.format not in ALLOWED_IMAGE_FORMATS:
        raise ValidationError("Formatos permitidos: JPEG, PNG, WEBP.")
    if img.width > MAX_IMAGE_DIMENSION or img.height > MAX_IMAGE_DIMENSION:
        raise ValidationError(
            f"Dimensiones máximas: {MAX_IMAGE_DIMENSION}x{MAX_IMAGE_DIMENSION} px."
        )
    image_file.seek(0)


def _prepare_for_webp(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        return img.convert("RGBA")
    return img.convert("RGB")


def _encode_webp(img: Image.Image, max_size: tuple[int, int]) -> BytesIO:
    prepared = _prepare_for_webp(img)
    prepared.thumbnail(max_size, Image.Resampling.LANCZOS)
    buffer = BytesIO()
    prepared.save(buffer, format="WEBP", quality=WEBP_QUALITY, method=6)
    buffer.seek(0)
    return buffer


def _webp_filename(original_name: str) -> str:
    stem = Path(original_name or "image").stem
    return f"{stem}.webp"


def normalize_uploaded_image(
    image_file,
    max_size: tuple[int, int] = DEFAULT_MAX_SIZE,
) -> InMemoryUploadedFile:
    """Valida, redimensiona y convierte a WebP antes de persistir."""
    validate_uploaded_image(image_file)
    img = Image.open(image_file)
    buffer = _encode_webp(img, max_size)
    webp_name = _webp_filename(getattr(image_file, "name", "image"))
    size = buffer.getbuffer().nbytes
    return InMemoryUploadedFile(
        buffer, "image", webp_name, "image/webp", size, None
    )


def optimize_image_file(
    image_field, max_size: tuple[int, int] = DEFAULT_MAX_SIZE
) -> None:
    """Redimensiona y comprime a WebP en storage (tarea Celery)."""
    img = Image.open(image_field)
    buffer = _encode_webp(img, max_size)
    name = _webp_filename(image_field.name)
    image_field.save(name, ContentFile(buffer.read()), save=False)
