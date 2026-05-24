"""
Prueba el flujo completo Hospy en local (SQLite + media/).
Ejecutar: python scripts/probar_flujo_local.py
"""
import os
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.development")
os.environ["USE_SQLITE"] = "true"
os.environ["CELERY_TASK_ALWAYS_EAGER"] = "true"
os.environ["DJANGO_ALLOWED_HOSTS"] = "localhost,127.0.0.1,testserver"

import django

django.setup()

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient

User = get_user_model()


def login(client, email, password):
    r = client.post("/api/v1/auth/login/", {"email": email, "password": password}, format="json")
    assert r.status_code == 200, f"Login {email}: {r.data}"
    client.credentials(HTTP_AUTHORIZATION=f"Bearer {r.data['access']}")
    return r.data


def main():
    client = APIClient()
    ok = []

    # 1. Propietario crea hospedaje
    login(client, "propietario@hospy.local", "Propietario123!")
    r = client.post(
        "/api/v1/hospedajes/",
        {
            "name": "Hostal Prueba Flujo",
            "type": "hostal",
            "description": "Prueba automática del flujo local.",
            "address": "Av. Test 100",
            "city": "Arequipa",
            "region": "Arequipa",
            "country": "Perú",
            "latitude": "-16.4090",
            "longitude": "-71.5375",
        },
        format="json",
    )
    assert r.status_code == 201, r.data
    hospedaje_id = r.data["id"]
    ok.append(f"Hospedaje creado (pendiente) id={hospedaje_id}")

    # 2. Admin aprueba
    login(client, "admin@hospy.local", "Admin1234!")
    r = client.post(
        f"/api/v1/hospedajes/{hospedaje_id}/aprobar/",
        {"aprobado": True},
        format="json",
    )
    assert r.status_code == 200, r.data
    ok.append("Hospedaje aprobado")

    # 3. Propietario crea habitación
    login(client, "propietario@hospy.local", "Propietario123!")
    r = client.post(
        "/api/v1/habitaciones/",
        {
            "accommodation": hospedaje_id,
            "number": "99",
            "type": "doble",
            "capacity": 2,
            "floor": 1,
            "base_price": "85.00",
        },
        format="json",
    )
    assert r.status_code == 201, r.data
    room_id = r.data["id"]
    ok.append(f"Habitación creada id={room_id}")

    # 4. Subir foto local
    from io import BytesIO

    from PIL import Image

    buf = BytesIO()
    Image.new("RGB", (100, 80), color=(70, 130, 180)).save(buf, format="JPEG")
    img = SimpleUploadedFile("test.jpg", buf.getvalue(), content_type="image/jpeg")
    r = client.post(f"/api/v1/hospedajes/{hospedaje_id}/fotos/", {"image": img, "is_primary": True})
    assert r.status_code == 201, r.data
    ok.append(f"Foto subida -> {r.data.get('image_url', r.data.get('image'))}")

    # 5. Listado público
    client.credentials()
    r = client.get("/api/v1/hospedajes/")
    assert r.status_code == 200 and r.data["count"] >= 1
    ok.append(f"Listado público: {r.data['count']} hospedaje(s)")

    # 6. Huésped reserva
    check_in = date.today() + timedelta(days=60)
    check_out = check_in + timedelta(days=2)
    login(client, "huesped@hospy.local", "Huesped123!")
    r = client.post(
        "/api/v1/reservas/preview/",
        {"room": room_id, "check_in": str(check_in), "check_out": str(check_out)},
        format="json",
    )
    assert r.status_code == 200, r.data
    total = r.data["total"]
    ok.append(f"Cotización: S/ {total} ({r.data['nights_count']} noches)")

    r = client.post(
        "/api/v1/reservas/",
        {"room": room_id, "check_in": str(check_in), "check_out": str(check_out)},
        format="json",
    )
    assert r.status_code == 201, r.data
    reserva_id = r.data["id"]
    ok.append(f"Reserva creada id={reserva_id} estado={r.data['status']}")

    # 7. Propietario confirma
    login(client, "propietario@hospy.local", "Propietario123!")
    r = client.post(f"/api/v1/reservas/{reserva_id}/confirmar/")
    assert r.status_code == 200, r.data
    ok.append("Reserva confirmada")

    # 8. Completar reserva (simular fin de estadía)
    from bookings.models import Booking

    Booking.objects.filter(pk=reserva_id).update(status=Booking.Status.COMPLETADA)
    ok.append("Reserva marcada completada")

    # 9. Reseña
    login(client, "huesped@hospy.local", "Huesped123!")
    r = client.post(
        "/api/v1/resenas/",
        {"accommodation": hospedaje_id, "rating": 5, "comment": "Muy buen hostal, flujo local OK."},
        format="json",
    )
    assert r.status_code == 201, r.data
    resena_id = r.data["id"]
    ok.append(f"Reseña creada id={resena_id}")

    login(client, "admin@hospy.local", "Admin1234!")
    r = client.post(f"/api/v1/resenas/{resena_id}/moderar/", {"aprobada": True}, format="json")
    assert r.status_code == 200, r.data
    ok.append("Reseña aprobada y publicada")

    print("\n=== FLUJO LOCAL COMPLETO ===\n")
    for i, line in enumerate(ok, 1):
        print(f"  {i}. {line}")
    print("\nTodo OK. Abre http://127.0.0.1:8000/api/docs/ para repetir manualmente.\n")


if __name__ == "__main__":
    main()
