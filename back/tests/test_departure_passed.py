"""Tests du filtrage des départs passés (fuseau Europe/Paris)."""
from datetime import datetime
from zoneinfo import ZoneInfo

from app.domain.trips import PARIS_TZ, departure_passed, filter_departed_from_payload, paris_cleanup_cutoff


class TestDeparturePassed:
    def test_18h12_paris_hides_16h57_and_17h57(self):
        now = datetime(2026, 5, 18, 18, 12, tzinfo=PARIS_TZ)
        assert departure_passed("2026-05-18", "16:57", now=now)
        assert departure_passed("2026-05-18", "17:57", now=now)
        assert not departure_passed("2026-05-18", "18:57", now=now)

    def test_paris_cutoff_converts_utc_instant(self):
        utc = datetime(2026, 5, 18, 16, 12, tzinfo=ZoneInfo("UTC"))
        assert paris_cleanup_cutoff(utc) == ("2026-05-18", "18:12")

    def test_previous_day(self):
        now = datetime(2026, 5, 18, 10, 0, tzinfo=PARIS_TZ)
        assert departure_passed("2026-05-17", "22:00", now=now)

    def test_future_day(self):
        now = datetime(2026, 5, 18, 10, 0, tzinfo=PARIS_TZ)
        assert not departure_passed("2026-05-19", "06:00", now=now)


class TestFilterDepartedFromPayload:
    def test_drops_passed_trips_and_empty_groups(self):
        now = datetime(2026, 5, 18, 18, 12, tzinfo=PARIS_TZ)
        payload = {
            "origin": "Paris",
            "total_trips": 3,
            "groups": [
                {
                    "destination_city": "Lyon",
                    "trip_count": 2,
                    "trips": [
                        {"date": "2026-05-18", "heure_depart": "16:00"},
                        {"date": "2026-05-18", "heure_depart": "19:00"},
                    ],
                    "connected_trips": [
                        {"date": "2026-05-18", "heure_depart": "17:00"},
                    ],
                },
                {
                    "destination_city": "Nantes",
                    "trip_count": 1,
                    "trips": [{"date": "2026-05-18", "heure_depart": "10:00"}],
                    "connected_trips": [],
                },
            ],
        }
        out = filter_departed_from_payload(payload, now=now)
        assert out["total_trips"] == 1
        assert len(out["groups"]) == 1
        assert out["groups"][0]["destination_city"] == "Lyon"
        assert out["groups"][0]["trip_count"] == 1
        assert out["groups"][0]["trips"][0]["heure_depart"] == "19:00"
        assert out["groups"][0]["connected_trips"] == []

