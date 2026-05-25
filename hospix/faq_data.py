"""Base de conocimiento FAQ para Hospix (sincronizada con frontend/chatFlows)."""

FAQ_ENTRIES = [
    {
        "keys": ["cancelar", "cancelación", "cancelacion", "reembolso"],
        "answer": "Puedes cancelar desde **Mis reservas** si la política del hospedaje lo permite. Las cancelaciones gratuitas suelen aplicar hasta 48 h antes del check-in.",
    },
    {
        "keys": ["pago", "pagar", "tarjeta", "yape", "plin"],
        "answer": "Hospy confirma la reserva en la plataforma. El pago al anfitrión depende de cada hospedaje (transferencia, efectivo en check-in, etc.).",
    },
    {
        "keys": ["reseña", "resena", "valorar", "calificar"],
        "answer": "Tras una estadía **completada**, entra a **Mis reservas** y pulsa «Dejar reseña».",
    },
    {
        "keys": ["check-in", "checkin", "entrada", "llegada"],
        "answer": "El check-in habitual es desde las **13:00**. El anfitrión envía instrucciones tras confirmar la reserva.",
    },
    {
        "keys": ["mascota", "mascotas", "perro", "gato"],
        "answer": "Revisa en la ficha del hospedaje si permite mascotas o pregunta al anfitrión desde el detalle del alojamiento.",
    },
    {
        "keys": ["wifi", "internet"],
        "answer": "La mayoría de hospedajes en Hospy incluyen WiFi; lo verás en los servicios de cada ficha.",
    },
    {
        "keys": ["verificar", "verificado", "confianza"],
        "answer": "Los hospedajes **verificados** pasan revisión del equipo Hospy. Busca el distintivo verde en el listado.",
    },
    {
        "keys": ["propietario", "publicar", "anunciar", "registrar hospedaje"],
        "answer": "Regístrate como propietario y, tras la aprobación, usa **Mi panel** para publicar tu ficha.",
    },
    {
        "keys": ["contacto", "soporte", "ayuda humana"],
        "answer": "Para casos especiales escribe a **hola@hospy.pe** o abre tu **Bandeja** de mensajes.",
    },
    {
        "keys": ["ubicacion", "ubicación", "mapa", "como llegar"],
        "answer": "Cada hospedaje tiene mapa y dirección en su ficha. También puedes contactar al anfitrión antes de reservar.",
    },
]
