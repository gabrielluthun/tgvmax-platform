"""Trip search and station autocomplete."""
import asyncio
import logging
import time
from datetime import datetime, timezone

from app.config import Settings
from app.core.memory_cache import SearchMemoryCache
from app.core.rate_limit import RateLimiter, RateLimitExceeded
from app.db.repositories.search_cache import SearchCacheRepository
from app.db.repositories.sync_state import SyncStateRepository
from app.db.repositories.trips import TripsRepository
from app.domain.connections import (
    DEFAULT_MAX_CONNECTIONS,
    compose_connected_journeys,
    direct_trip_fingerprint,
    find_all_connected_journeys,
    hub_date_keys_from_outbound,
    hub_date_keys_from_two_leg_journeys,
    merge_hub_departure_docs,
    segment_from_trip_doc,
)
from app.domain.stations import (
    is_metropolis_query,
    metropolis_for,
    metropolis_label,
    normalize_station,
    trip_id,
)
from app.domain.station_labels import display_station_name
from app.schemas.trips import (
    ConnectedTripOut,
    DestinationGroup,
    SearchResponse,
    StationSuggestion,
    TripOut,
)
from app.services.connections import merge_connected_into_groups
from app.services.sncf.client import SncfClient
from app.services.sncf.connect import build_sncf_connect_url

logger = logging.getLogger("maxtracker")

_DERIVED_TRIP_FIELDS = ("origine_label", "destination_label", "sncf_connect_url")


def _slim_trip(trip: dict) -> dict:
    return {k: v for k, v in trip.items() if k not in _DERIVED_TRIP_FIELDS}


def slim_cache_payload(payload: dict) -> dict:
    """Retire les champs recalculés à la lecture — réduit la taille BSON."""
    slim = {k: v for k, v in payload.items() if k not in ("origin", "served")}
    groups = []
    for group in slim.get("groups", []):
        g = dict(group)
        g["trips"] = [_slim_trip(t) for t in g.get("trips", [])]
        connected = []
        for journey in g.get("connected_trips", []):
            j = dict(journey)
            j["legs"] = [_slim_trip(leg) for leg in j.get("legs", [])]
            connected.append(j)
        g["connected_trips"] = connected
        groups.append(g)
    slim["groups"] = groups
    return slim


class SearchService:
    def __init__(
        self,
        settings: Settings,
        trips_repo: TripsRepository,
        sync_repo: SyncStateRepository,
        sncf: SncfClient,
        cache_repo: SearchCacheRepository,
        rate_limiter: RateLimiter,
    ) -> None:
        self._settings = settings
        self._trips = trips_repo
        self._sync = sync_repo
        self._sncf = sncf
        self._cache = cache_repo
        self._rate_limiter = rate_limiter
        self._memory = SearchMemoryCache()
        self._refresh_keys: set[str] = set()
        self._refresh_tasks: set[asyncio.Task] = set()

    async def hydrate_memory_from_mongo(self) -> int:
        """Charge les métropoles en L1 depuis Mongo (arrière-plan, non bloquant)."""
        t0 = time.perf_counter()
        entries = await self._cache.metro_entries()
        for entry in entries:
            self._memory.set(entry["_id"], entry["payload"], sync_at=entry.get("sync_at"))
        ms = (time.perf_counter() - t0) * 1000
        logger.info("L1 cache hydrated: %d metros from Mongo (%.0fms)", len(entries), ms)
        return len(entries)

    async def search_stations(self, q: str, *, limit: int = 15) -> list[StationSuggestion]:
        q = (q or "").strip()
        if len(q) < 3:
            return []
        qn = normalize_station(q)
        names = await self._trips.search_origines(qn, limit=limit)
        suggestions: list[StationSuggestion] = []
        seen_metros: set[str] = set()
        for name in names:
            norm = normalize_station(name)
            metro = metropolis_for(norm)
            if metro and metro not in seen_metros:
                seen_metros.add(metro)
                suggestions.append(
                    StationSuggestion(name=metro + " (toutes gares)", raw=metro, is_metropolis=True)
                )
            suggestions.append(
                StationSuggestion(name=name.title(), raw=name, is_metropolis=False)
            )
            if len(suggestions) >= limit:
                break
        return suggestions[:limit]

    def _cache_key(self, origin: str) -> str:
        origin_clean = origin.strip()
        origin_norm = normalize_station(origin_clean)
        if is_metropolis_query(origin_clean, origin_norm):
            return "metro:" + metropolis_label(origin_clean, origin_norm)
        return "norm:" + origin_norm

    def _origin_metropolis(self, origin_clean: str, origin_norm: str, is_metro: bool) -> str | None:
        if is_metro:
            return metropolis_label(origin_clean, origin_norm)
        return metropolis_for(origin_norm)

    def _trip_out(self, t: dict, *, price_checked_at: str) -> TripOut:
        return TripOut(
            id=trip_id(t["train_no"], t["date"], t["origine"], t["destination"]),
            train_no=t["train_no"],
            date=t["date"],
            origine=t["origine"],
            destination=t["destination"],
            origine_label=display_station_name(t["origine"], t.get("origine_iata")),
            destination_label=display_station_name(t["destination"], t.get("destination_iata")),
            origine_iata=t.get("origine_iata"),
            destination_iata=t.get("destination_iata"),
            heure_depart=t["heure_depart"],
            heure_arrivee=t["heure_arrivee"],
            axe=t.get("axe") or "",
            train_type=t["train_type"],
            fare_eur=float(t.get("fare_eur", 0.0)),
            price_checked_at=price_checked_at,
            sncf_connect_url=build_sncf_connect_url(
                self._settings,
                t.get("origine_iata", ""),
                t.get("destination_iata", ""),
                t["date"],
                t["heure_depart"],
                t.get("origine", ""),
                t.get("destination", ""),
            ),
            destination_metropolis=t.get("destination_metropolis"),
            departure_datetime=t["departure_datetime"],
        )

    def _build_destination_groups(
        self,
        grouped: dict[str, dict],
        *,
        price_checked_at: str,
    ) -> list[DestinationGroup]:
        groups_out: list[DestinationGroup] = []
        for key, g in grouped.items():
            trips_out = [self._trip_out(t, price_checked_at=price_checked_at) for t in g["trips"]]
            trips_out.sort(key=lambda x: x.departure_datetime)
            connected: list[ConnectedTripOut] = g.get("connected_trips", [])
            connected.sort(key=lambda x: x.departure_datetime)
            count = len(trips_out) + len(connected)
            groups_out.append(
                DestinationGroup(
                    destination_city=key,
                    destinations=sorted(g["destinations"]),
                    trip_count=count,
                    trips=trips_out,
                    connected_trips=connected,
                )
            )
        groups_out.sort(key=lambda x: (-x.trip_count, x.destination_city))
        return groups_out

    def _enrich_trip_dict(self, trip: dict) -> dict:
        enriched = dict(trip)
        enriched["origine_label"] = display_station_name(
            enriched.get("origine", ""), enriched.get("origine_iata")
        )
        enriched["destination_label"] = display_station_name(
            enriched.get("destination", ""), enriched.get("destination_iata")
        )
        enriched["sncf_connect_url"] = build_sncf_connect_url(
            self._settings,
            enriched.get("origine_iata", ""),
            enriched.get("destination_iata", ""),
            enriched.get("date", ""),
            enriched.get("heure_depart", ""),
            enriched.get("origine", ""),
            enriched.get("destination", ""),
        )
        return enriched

    def _enrich_cached_payload(self, payload: dict) -> dict:
        enriched = dict(payload)
        groups = []
        for group in enriched.get("groups", []):
            g = dict(group)
            g["trips"] = [self._enrich_trip_dict(t) for t in g.get("trips", [])]
            connected = []
            for journey in g.get("connected_trips", []):
                j = dict(journey)
                j["legs"] = [self._enrich_trip_dict(leg) for leg in j.get("legs", [])]
                connected.append(j)
            g["connected_trips"] = connected
            groups.append(g)
        enriched["groups"] = groups
        return enriched

    def _response_from_cached(self, origin: str, cached: dict) -> SearchResponse:
        payload = self._enrich_cached_payload({**cached["payload"], "origin": origin.strip()})
        return SearchResponse(**payload)

    async def search_trips(self, origin: str, *, client_ip: str = "anon") -> SearchResponse:
        started = time.monotonic()
        last_sync = await self._sync.get_last_sync_at()
        key = self._cache_key(origin)

        mem_cached = self._memory.get(key)
        if mem_cached:
            if last_sync is not None and mem_cached.get("sync_at") != last_sync:
                self._schedule_refresh(origin, key)
            logger.info(
                "search L1 hit origin=%r duration=%.3fs",
                origin,
                time.monotonic() - started,
            )
            return self._response_from_cached(origin, mem_cached)

        mongo_cached = await self._cache.get(key)
        if mongo_cached:
            self._memory.set(key, mongo_cached["payload"], sync_at=mongo_cached.get("sync_at"))
            if last_sync is not None and mongo_cached.get("sync_at") != last_sync:
                self._schedule_refresh(origin, key)
            logger.info(
                "search L2 hit origin=%r duration=%.3fs",
                origin,
                time.monotonic() - started,
            )
            return self._response_from_cached(origin, mongo_cached)

        self._rate_limiter.check(client_ip)

        compute_started = time.monotonic()
        resp = await self._compute_search_response(origin)
        logger.info(
            "search cold compute origin=%r duration=%.2fs total=%d",
            origin,
            time.monotonic() - compute_started,
            resp.total_trips,
        )
        await self._store_cache(key, resp)
        return resp

    def _schedule_refresh(self, origin: str, key: str) -> None:
        if key in self._refresh_keys:
            return
        self._refresh_keys.add(key)
        task = asyncio.create_task(self._refresh_entry(origin, key))
        self._refresh_tasks.add(task)
        task.add_done_callback(self._refresh_tasks.discard)

    async def _refresh_entry(self, origin: str, key: str) -> None:
        try:
            started = time.monotonic()
            resp = await self._compute_search_response(origin)
            if not resp.served:
                logger.warning(
                    "background refresh skipped origin=%r (served=False)",
                    origin,
                )
                return
            await self._store_cache(key, resp)
            logger.info(
                "background refresh ok origin=%r duration=%.2fs total=%d",
                origin,
                time.monotonic() - started,
                resp.total_trips,
            )
        except Exception:
            logger.exception("background refresh failed origin=%r — cache unchanged", origin)
        finally:
            self._refresh_keys.discard(key)

    async def _store_cache(self, key: str, resp: SearchResponse) -> None:
        if not resp.served:
            return
        payload = slim_cache_payload(resp.model_dump(mode="json"))
        self._memory.set(key, payload, sync_at=resp.last_sync_at)
        try:
            await self._cache.set(key, payload, sync_at=resp.last_sync_at)
        except Exception:
            logger.exception("cache set failed key=%r", key)

    async def warm_cache(self) -> int:
        last_sync = await self._sync.get_last_sync_at()
        norms = await self._trips.distinct_origines_norm()
        metros = await self._trips.distinct_origine_metropolis()
        origins = list(norms) + list(metros)
        if not origins:
            return 0

        self._memory.clear()
        sem = asyncio.Semaphore(self._settings.cache_warm_concurrency)
        count = 0

        async def warm_one(origin: str) -> None:
            nonlocal count
            async with sem:
                try:
                    resp = await self._compute_search_response(origin)
                    if not resp.served:
                        return
                    key = self._cache_key(origin)
                    await self._store_cache(key, resp)
                    count += 1
                except Exception:
                    logger.exception("cache warm failed origin=%r", origin)

        await asyncio.gather(*(warm_one(o) for o in origins))
        removed = await self._cache.prune(keep_sync_at=last_sync)
        logger.info("cache warmed: %d origins, %d stale entries pruned", count, removed)
        return count

    async def _compute_search_response(
        self, origin: str, *, max_connections: int = DEFAULT_MAX_CONNECTIONS
    ) -> SearchResponse:
        origin_clean = origin.strip()
        origin_norm = normalize_station(origin_clean)
        is_metro = is_metropolis_query(origin_clean, origin_norm)
        origin_metropolis = self._origin_metropolis(origin_clean, origin_norm, is_metro)

        if is_metro:
            query = {"origine_metropolis": metropolis_label(origin_clean, origin_norm)}
        else:
            query = {"origine_norm": origin_norm}

        last_sync = await self._sync.get_last_sync_at()
        raw = await self._trips.find_by_query(query, limit=self._settings.search_result_limit)
        price_checked_at = datetime.now(timezone.utc).isoformat()

        hub_keys = hub_date_keys_from_outbound(raw, origin_metropolis=origin_metropolis)
        hub_raw: list[dict] = []
        if hub_keys:
            hub_raw = await self._trips.find_departures_from_hub_date_keys(
                hub_keys,
                limit=self._settings.search_result_limit,
            )
            if raw and hub_raw:
                preview = find_all_connected_journeys(
                    [segment_from_trip_doc(t) for t in raw],
                    [segment_from_trip_doc(t) for t in hub_raw],
                    origin_metropolis=origin_metropolis,
                    max_connections=1,
                )
                extra_keys = hub_date_keys_from_two_leg_journeys(preview)
                missing = extra_keys - hub_keys
                if missing:
                    hub_raw_2 = await self._trips.find_departures_from_hub_date_keys(
                        missing,
                        limit=self._settings.search_result_limit,
                    )
                    hub_raw = merge_hub_departure_docs(hub_raw, hub_raw_2)

        if not raw and not hub_raw:
            served = True
            if not is_metro:
                served = await self._trips.exists_with_origine_norm(origin_norm)
            return SearchResponse(
                origin=origin_clean,
                total_trips=0,
                groups=[],
                last_sync_at=last_sync,
                served=served,
            )

        grouped: dict[str, dict] = {}
        for t in raw:
            dest_metro = t.get("destination_metropolis")
            dest = t.get("destination") or ""
            key = dest_metro if dest_metro else dest
            g = grouped.setdefault(
                key,
                {
                    "destinations": set(),
                    "trips": [],
                    "connected_trips": [],
                    "seen_direct": set(),
                    "seen_connected": set(),
                },
            )
            fp = direct_trip_fingerprint(t)
            if fp in g["seen_direct"]:
                continue
            g["seen_direct"].add(fp)
            g["destinations"].add(dest)
            g["trips"].append(t)

        if raw and hub_raw:
            journeys = compose_connected_journeys(
                raw,
                hub_raw,
                origin_metropolis=origin_metropolis,
                max_connections=max_connections,
            )
            merge_connected_into_groups(
                grouped,
                journeys,
                sncf_connect_base=self._settings.sncf_connect_base,
                price_checked_at=price_checked_at,
            )

        groups_out = self._build_destination_groups(grouped, price_checked_at=price_checked_at)
        total = sum(g.trip_count for g in groups_out)
        return SearchResponse(
            origin=origin_clean,
            total_trips=total,
            groups=groups_out,
            last_sync_at=last_sync,
            served=True,
        )
