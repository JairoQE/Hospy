"""Serie diaria de precio mínimo por noche (temporadas, ofertas e historial de base)."""

from __future__ import annotations

from collections import defaultdict
from datetime import date, timedelta
from decimal import Decimal

from django.utils import timezone

from properties.models import AccommodationOffer
from properties.offer_services import apply_discount, build_room_offer_map
from rooms.models import Room, RoomBasePriceHistory, SeasonRate
from rooms.services import SEASON_PRICE_MULTIPLIERS

TWOPLACES = Decimal("0.01")


def _base_price_on_date(
    room: Room,
    day: date,
    histories: list[RoomBasePriceHistory],
) -> Decimal:
    for entry in histories:
        if entry.effective_from <= day:
            return entry.base_price
    return room.base_price


def _seasonal_base(
    base: Decimal,
    day: date,
    season_rates: list[SeasonRate],
) -> Decimal:
    rate = None
    for candidate in season_rates:
        if candidate.start_date <= day <= candidate.end_date:
            if rate is None or candidate.start_date >= rate.start_date:
                rate = candidate
    if not rate:
        return base
    mult = SEASON_PRICE_MULTIPLIERS.get(rate.season, Decimal("1.00"))
    return (base * mult).quantize(TWOPLACES)


def _offers_for_day(
    day: date,
    offers: list[AccommodationOffer],
) -> dict[int, AccommodationOffer]:
    active = [
        offer
        for offer in offers
        if offer.is_active and offer.start_date <= day <= offer.end_date
    ]
    return build_room_offer_map(active)


def _min_price_on_date(
    rooms: list[Room],
    day: date,
    histories_by_room: dict[int, list[RoomBasePriceHistory]],
    seasons_by_room: dict[int, list[SeasonRate]],
    offers: list[AccommodationOffer],
) -> Decimal | None:
    if not rooms:
        return None

    room_offers = _offers_for_day(day, offers)
    prices: list[Decimal] = []

    for room in rooms:
        histories = histories_by_room.get(room.id, [])
        base = _base_price_on_date(room, day, histories)
        nightly = _seasonal_base(base, day, seasons_by_room.get(room.id, []))
        offer = room_offers.get(room.id)
        prices.append(
            apply_discount(nightly, offer.discount_percent) if offer else nightly
        )

    return min(prices) if prices else None


def build_accommodation_price_trend(
    accommodation,
    *,
    days: int = 90,
    end: date | None = None,
) -> dict:
    days = max(14, min(int(days), 365))
    end = end or timezone.localdate()
    start = end - timedelta(days=days - 1)

    rooms = list(
        Room.objects.filter(accommodation=accommodation, is_active=True).only(
            "id",
            "base_price",
            "accommodation_id",
        )
    )
    room_ids = [room.id for room in rooms]

    histories_by_room: dict[int, list[RoomBasePriceHistory]] = defaultdict(list)
    if room_ids:
        for entry in RoomBasePriceHistory.objects.filter(room_id__in=room_ids).order_by(
            "room_id", "-effective_from", "-recorded_at"
        ):
            histories_by_room[entry.room_id].append(entry)

    seasons_by_room: dict[int, list[SeasonRate]] = defaultdict(list)
    if room_ids:
        for rate in SeasonRate.objects.filter(
            room_id__in=room_ids,
            start_date__lte=end,
            end_date__gte=start,
        ):
            seasons_by_room[rate.room_id].append(rate)

    offers = list(
        AccommodationOffer.objects.filter(
            accommodation=accommodation,
            is_active=True,
            start_date__lte=end,
            end_date__gte=start,
        ).prefetch_related("rooms")
    )

    points = []
    current = start
    while current <= end:
        price = _min_price_on_date(
            rooms,
            current,
            histories_by_room,
            seasons_by_room,
            offers,
        )
        points.append(
            {
                "date": current.isoformat(),
                "price": float(price) if price is not None else None,
            }
        )
        current += timedelta(days=1)

    return {
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "days": days,
        "currency": "PEN",
        "points": points,
    }
