import os
from pathlib import Path


def use_s3_storage() -> bool:
    return os.environ.get("USE_S3", "").lower() in ("true", "1", "yes")


def build_storages(media_root: Path, media_url: str) -> dict:
    """Almacenamiento local por defecto; S3/R2 si USE_S3=true."""
    storages = {
        "default": {
            "BACKEND": "django.core.files.storage.FileSystemStorage",
            "OPTIONS": {"location": media_root, "base_url": media_url},
        },
        "staticfiles": {
            "BACKEND": "django.contrib.staticfiles.storage.StaticFilesStorage",
        },
    }

    if not use_s3_storage():
        return storages

    options = {
        "bucket_name": os.environ.get("AWS_STORAGE_BUCKET_NAME", ""),
        "access_key": os.environ.get("AWS_ACCESS_KEY_ID", ""),
        "secret_key": os.environ.get("AWS_SECRET_ACCESS_KEY", ""),
        "region_name": os.environ.get("AWS_S3_REGION_NAME", "us-east-1"),
        "default_acl": None,
        "file_overwrite": False,
        "querystring_auth": True,
    }
    endpoint = os.environ.get("AWS_S3_ENDPOINT_URL")
    if endpoint:
        options["endpoint_url"] = endpoint

    custom_domain = os.environ.get("AWS_S3_CUSTOM_DOMAIN")
    if custom_domain:
        options["custom_domain"] = custom_domain

    storages["default"] = {
        "BACKEND": "storages.backends.s3.S3Storage",
        "OPTIONS": options,
    }
    return storages
