"""Cache Mongo : gzip + payload allégé pour rester sous 16 Mo BSON."""
import gzip
import json

from app.db.repositories.search_cache import decode_cache_doc, encode_payload
from app.services.search import slim_cache_payload


def test_slim_cache_payload_drops_derived_fields():
    payload = {
        "origin": "Paris",
        "served": True,
        "total_trips": 1,
        "last_sync_at": "2026-08-14T00:00:00+00:00",
        "groups": [
            {
                "destination_city": "Lyon",
                "destinations": ["LYON PART DIEU"],
                "trip_count": 1,
                "trips": [
                    {
                        "id": "t1",
                        "origine": "PARIS GARE DE LYON",
                        "destination": "LYON PART DIEU",
                        "origine_label": "Paris Gare de Lyon",
                        "destination_label": "Lyon Part Dieu",
                        "sncf_connect_url": "https://www.sncf-connect.com/very/long/url",
                        "train_no": "6619",
                    }
                ],
                "connected_trips": [
                    {
                        "id": "c1",
                        "legs": [
                            {
                                "id": "l1",
                                "origine_label": "Paris",
                                "sncf_connect_url": "https://www.sncf-connect.com/leg",
                                "train_no": "1",
                            }
                        ],
                    }
                ],
            }
        ],
    }
    slim = slim_cache_payload(payload)
    assert "origin" not in slim
    assert "served" not in slim
    trip = slim["groups"][0]["trips"][0]
    assert trip["id"] == "t1"
    assert trip["train_no"] == "6619"
    assert "sncf_connect_url" not in trip
    assert "origine_label" not in trip
    assert "destination_label" not in trip
    leg = slim["groups"][0]["connected_trips"][0]["legs"][0]
    assert "sncf_connect_url" not in leg
    assert "origine_label" not in leg


def test_gzip_roundtrip_and_shrinks():
    payload = {
        "groups": [
            {
                "destination_city": "Lyon",
                "trips": [
                    {
                        "id": f"t{i}",
                        "origine": "PARIS GARE DE LYON",
                        "destination": "LYON PART DIEU",
                        "train_no": "6619",
                    }
                    for i in range(200)
                ],
                "connected_trips": [],
            }
        ]
    }
    blob = encode_payload(payload)
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    assert len(blob) < len(raw)
    restored = json.loads(gzip.decompress(blob))
    assert restored == payload


def test_decode_prefers_gzip_over_legacy_payload():
    payload = {"total_trips": 3, "groups": []}
    doc = {
        "_id": "metro:Paris",
        "payload": {"total_trips": 0},
        "payload_gz": encode_payload(payload),
        "sync_at": "sync-1",
    }
    decoded = decode_cache_doc(doc)
    assert decoded["payload"]["total_trips"] == 3
    assert decoded["sync_at"] == "sync-1"


def test_decode_legacy_uncompressed_payload():
    doc = {
        "_id": "norm:NANTES",
        "payload": {"total_trips": 2, "groups": []},
        "sync_at": "sync-2",
    }
    decoded = decode_cache_doc(doc)
    assert decoded["payload"]["total_trips"] == 2
