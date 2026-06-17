import os

# Tests siempre con SQLite en memoria/archivo (independiente del .env local)
os.environ["USE_SQLITE"] = "true"
os.environ["CELERY_TASK_ALWAYS_EAGER"] = "true"
os.environ["REDIS_URL"] = ""
os.environ.setdefault("DJANGO_SECRET_KEY", "test-secret-key-minimum-32-characters-long")

import pytest
from django.contrib.auth import get_user_model
from rest_framework.test import APIClient

from properties.models import Accommodation, Service
from rooms.models import Room

User = get_user_model()


@pytest.fixture
def api_client():
    return APIClient()


@pytest.fixture
def huesped(db):
    user = User.objects.create_user(
        email="test_huesped@hospy.local",
        username="test_huesped",
        password="Testpass123!",
        first_name="Test",
        role=User.Role.HUESPED,
    )
    return user


@pytest.fixture
def propietario(db):
    user = User.objects.create_user(
        email="test_prop@hospy.local",
        username="test_prop",
        password="Testpass123!",
        first_name="Prop",
        role=User.Role.PROPIETARIO,
        owner_status=User.OwnerStatus.APROBADO,
        phone="999888777",
        payout_document_number="12345678",
        payout_mp_email="prop.mp@hospy.local",
    )
    return user


@pytest.fixture
def admin_user(db):
    user = User.objects.create_user(
        email="test_admin@hospy.local",
        username="test_admin",
        password="Testpass123!",
        first_name="Admin",
        role=User.Role.ADMINISTRADOR,
        is_staff=True,
        is_superuser=True,
    )
    return user


@pytest.fixture
def hospedaje_aprobado(db, propietario):
    wifi, _ = Service.objects.get_or_create(slug="wifi", defaults={"name": "WiFi"})
    acc = Accommodation.objects.create(
        owner=propietario,
        name="Hotel Test",
        type=Accommodation.Type.HOTEL,
        description="Desc",
        status=Accommodation.Status.APROBADO,
        is_active=True,
        address="Calle 1",
        city="Lima",
        region="Lima",
        latitude="-12.046400",
        longitude="-77.042800",
    )
    acc.services.add(wifi)
    room = Room.objects.create(
        accommodation=acc,
        number="10",
        type=Room.Type.DOBLE,
        capacity=2,
        base_price=100,
    )
    return acc, room
