"""Trip time helpers (Europe/Paris)."""
from datetime import datetime
from zoneinfo import ZoneInfo

PARIS_TZ = ZoneInfo("Europe/Paris")


def paris_cleanup_cutoff(now: datetime | None = None) -> tuple[str, str]:
    dt = datetime.now(PARIS_TZ) if now is None else now.astimezone(PARIS_TZ)
    return dt.date().isoformat(), dt.strftime("%H:%M")


def departure_passed(date: str, heure_depart: str, *, now: datetime | None = None) -> bool:
    today, cur_time = paris_cleanup_cutoff(now)
    dep_time = (heure_depart or "00:00").strip()[:5]
    if date < today:
        return True
    if date > today:
        return False
    return dep_time < cur_time


def filter_departed_from_payload(payload: dict, *, now: datetime | None = None) -> dict:
    """Retire les trains / correspondances déjà partis d'une réponse de recherche."""
    groups_out: list[dict] = []
    for group in payload.get("groups", []):
        g = dict(group)
        trips = [
            t
            for t in g.get("trips", [])
            if not departure_passed(t.get("date") or "", t.get("heure_depart") or "", now=now)
        ]
        connected = [
            j
            for j in g.get("connected_trips", [])
            if not departure_passed(j.get("date") or "", j.get("heure_depart") or "", now=now)
        ]
        if not trips and not connected:
            continue
        g["trips"] = trips
        g["connected_trips"] = connected
        g["trip_count"] = len(trips) + len(connected)
        groups_out.append(g)
    out = dict(payload)
    out["groups"] = groups_out
    out["total_trips"] = sum(g["trip_count"] for g in groups_out)
    return out
