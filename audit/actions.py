"""Etiquetas legibles de acciones de auditoría (español)."""

ACTION_LABELS: dict[str, str] = {
    "user.assign_admin": "Asignó rol administrador",
    "user.revoke_admin": "Quitó rol administrador",
    "user.owner.approve": "Aprobó cuenta de propietario",
    "user.owner.reject": "Rechazó cuenta de propietario",
    "user.sponsor.approve": "Aprobó cuenta de patrocinador",
    "user.sponsor.reject": "Rechazó cuenta de patrocinador",
    "profile.update": "Actualizó perfil",
    "profile.change_email": "Cambió correo electrónico",
    "profile.change_password": "Cambió contraseña",
    "accommodation.create": "Creó hospedaje",
    "accommodation.update": "Editó hospedaje",
    "accommodation.delete": "Eliminó hospedaje",
    "accommodation.approve": "Aprobó hospedaje",
    "accommodation.reject": "Rechazó hospedaje",
    "accommodation.activate": "Activó hospedaje",
    "accommodation.deactivate": "Desactivó hospedaje",
    "browse_tile.create": "Creó tarjeta del inicio",
    "browse_tile.update": "Editó tarjeta del inicio",
    "browse_tile.delete": "Eliminó tarjeta del inicio",
    "booking.create": "Creó reserva",
    "booking.confirm": "Confirmó reserva",
    "booking.reject": "Rechazó reserva",
    "booking.cancel": "Canceló reserva",
    "booking.complete": "Completó reserva",
    "review.create": "Publicó reseña",
    "review.moderate_approve": "Aprobó reseña",
    "review.moderate_reject": "Rechazó reseña",
    "message_report.resolve": "Resolvió reporte de mensaje",
    "sponsor_ad.create": "Creó anuncio patrocinado",
    "sponsor_ad.update": "Editó anuncio patrocinado",
    "sponsor_ad.delete": "Eliminó anuncio patrocinado",
    "sponsor_report.resolve": "Resolvió reporte de anuncio",
    "site_design.update": "Actualizó diseño del sitio",
    "payment.yape.success": "Pago Yape confirmado",
    "payment.card.success": "Pago con tarjeta confirmado",
    "payment.pagoefectivo.create": "Generó código PagoEfectivo",
    "auth.login": "Inició sesión",
    "auth.register": "Registró cuenta",
    "auth.register_owner": "Registró cuenta de propietario",
}

# critical = seguridad / gobernanza · high = moderación · medium = operaciones · low = rutina
ACTION_SEVERITY: dict[str, str] = {
    "user.assign_admin": "critical",
    "user.revoke_admin": "critical",
    "profile.change_email": "critical",
    "profile.change_password": "critical",
    "payment.yape.success": "medium",
    "payment.card.success": "medium",
    "auth.login": "high",
    "auth.register_owner": "high",
    "site_design.update": "critical",
    "user.owner.approve": "high",
    "user.owner.reject": "high",
    "user.sponsor.approve": "high",
    "user.sponsor.reject": "high",
    "accommodation.approve": "high",
    "accommodation.reject": "high",
    "review.moderate_approve": "high",
    "review.moderate_reject": "high",
    "message_report.resolve": "high",
    "sponsor_report.resolve": "high",
    "accommodation.create": "medium",
    "accommodation.update": "medium",
    "accommodation.delete": "medium",
    "accommodation.activate": "medium",
    "accommodation.deactivate": "medium",
    "browse_tile.create": "medium",
    "browse_tile.update": "medium",
    "browse_tile.delete": "medium",
    "booking.cancel": "medium",
    "booking.reject": "medium",
    "sponsor_ad.create": "medium",
    "sponsor_ad.update": "medium",
    "sponsor_ad.delete": "medium",
}

CRITICAL_ACTIONS = tuple(
    action for action, level in ACTION_SEVERITY.items() if level == "critical"
)


def action_label(action: str) -> str:
    return ACTION_LABELS.get(action, action.replace(".", " · ").replace("_", " "))


def action_severity(action: str) -> str:
    if action in ACTION_SEVERITY:
        return ACTION_SEVERITY[action]
    if action.startswith("user.") or action.startswith("profile."):
        return "high"
    if action.startswith("accommodation.") or action.startswith("booking."):
        return "medium"
    return "low"


def action_category(action: str) -> str:
    prefix = action.split(".", 1)[0]
    mapping = {
        "user": "account",
        "profile": "account",
        "accommodation": "property",
        "browse_tile": "site",
        "site_design": "site",
        "booking": "booking",
        "review": "review",
        "message_report": "moderation",
        "sponsor_ad": "sponsor",
        "sponsor_report": "moderation",
        "payment": "booking",
        "auth": "account",
    }
    return mapping.get(prefix, "other")
