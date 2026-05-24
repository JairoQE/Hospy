from io import BytesIO

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.files.base import ContentFile
from PIL import Image

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
MAX_IMAGE_DIMENSION = 4096


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


def optimize_image_file(image_field, max_size: tuple[int, int] = (1920, 1920)) -> None:
    """Redimensiona y comprime la imagen en el storage (tarea Celery)."""
    img = Image.open(image_field)
    if img.mode in ("RGBA", "P"):
        img = img.convert("RGB")

    img.thumbnail(max_size, Image.Resampling.LANCZOS)
    buffer = BytesIO()
    img.save(buffer, format="JPEG", quality=85, optimize=True)
    buffer.seek(0)

    name = image_field.name.rsplit(".", 1)[0] + ".jpg"
    image_field.save(name, ContentFile(buffer.read()), save=False)
