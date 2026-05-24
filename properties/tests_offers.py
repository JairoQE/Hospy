from datetime import date, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import User
from properties.models import Accommodation, AccommodationOffer
from properties.offer_services import (
    apply_discount,
    get_active_offer_for_room,
    rooms_overlap_in_offers,
)
from rooms.models import Room
from rooms.services import calculate_stay_total, get_nightly_price


class OfferPricingTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            email="owner@test.com",
            username="owner_offer",
            password="pass12345",
            role=User.Role.PROPIETARIO,
            first_name="Owner",
        )
        self.acc = Accommodation.objects.create(
            owner=self.owner,
            name="Hotel Test",
            type=Accommodation.Type.HOTEL,
            description="Desc",
            address="Calle 1",
            city="Lima",
            region="Lima",
            latitude=Decimal("-12.0464"),
            longitude=Decimal("-77.0428"),
            status=Accommodation.Status.APROBADO,
            is_active=True,
        )
        self.room = Room.objects.create(
            accommodation=self.acc,
            number="101",
            type=Room.Type.DOBLE,
            capacity=2,
            base_price=Decimal("100.00"),
        )
        self.room2 = Room.objects.create(
            accommodation=self.acc,
            number="102",
            type=Room.Type.SIMPLE,
            capacity=1,
            base_price=Decimal("80.00"),
        )

    def _create_offer(self, **kwargs):
        room_ids = kwargs.pop("room_ids", [self.room.id])
        offer = AccommodationOffer.objects.create(
            accommodation=self.acc,
            discount_percent=kwargs.pop("discount_percent", Decimal("20")),
            start_date=kwargs.pop("start_date", timezone.localdate()),
            duration_days=kwargs.pop("duration_days", 7),
            is_active=kwargs.pop("is_active", True),
            **kwargs,
        )
        offer.rooms.set(room_ids)
        return offer

    def test_offer_expires_and_price_returns_to_base(self):
        today = timezone.localdate()
        past_start = today - timedelta(days=10)
        self._create_offer(start_date=past_start, duration_days=5)
        expired_night = past_start + timedelta(days=6)
        self.assertIsNone(
            get_active_offer_for_room(self.room.id, self.acc.id, expired_night)
        )
        self.assertEqual(
            get_nightly_price(self.room, expired_night),
            Decimal("100.00"),
        )

    def test_active_offer_applies_only_to_selected_rooms(self):
        today = timezone.localdate()
        self._create_offer(discount_percent=Decimal("25"), room_ids=[self.room.id])
        self.assertEqual(
            get_nightly_price(self.room, today),
            apply_discount(Decimal("100"), Decimal("25")),
        )
        self.assertEqual(get_nightly_price(self.room2, today), Decimal("80.00"))

    def test_calculate_stay_mixed_offer_and_normal(self):
        today = timezone.localdate()
        self._create_offer(discount_percent=Decimal("10"), duration_days=2)
        check_in = today
        check_out = today + timedelta(days=4)
        result = calculate_stay_total(self.room, check_in, check_out)
        self.assertEqual(result["nights_count"], 4)
        self.assertTrue(result.get("offer_applied"))
        self.assertEqual(result["offer_nights_count"], 2)
        discounted = apply_discount(Decimal("100"), Decimal("10"))
        expected = discounted * 2 + Decimal("100") * 2
        self.assertEqual(result["total"], expected)

    def test_room_overlap_validation(self):
        today = timezone.localdate()
        end = today + timedelta(days=6)
        self._create_offer(room_ids=[self.room.id])
        self.assertTrue(
            rooms_overlap_in_offers(
                self.acc.id,
                [self.room.id],
                today,
                end,
            )
        )
        self.assertFalse(
            rooms_overlap_in_offers(
                self.acc.id,
                [self.room2.id],
                today,
                end,
            )
        )
