from django.core.cache import cache


def owner_panel_cache_key(owner_id: int) -> str:
    return f"hospy:owner_panel:{owner_id}"


def invalidate_owner_panel_cache(owner_id: int | None) -> None:
    if owner_id:
        cache.delete(owner_panel_cache_key(owner_id))


def invalidate_admin_dashboard_cache() -> None:
    try:
        cache.delete("hospy:admin_dashboard")
    except Exception:
        pass


def invalidate_booking_panel_caches(booking) -> None:
    """Panel propietario y admin tras cambios en reservas/pagos."""
    try:
        owner_id = booking.room.accommodation.owner_id
    except Exception:
        owner_id = None
    invalidate_owner_panel_cache(owner_id)
    invalidate_admin_dashboard_cache()
