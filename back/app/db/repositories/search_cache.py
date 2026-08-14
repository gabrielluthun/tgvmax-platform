"""MongoDB access for the pre-computed search_cache collection."""
import gzip
import json
import logging
from typing import Any, Optional

from bson.binary import Binary
from pymongo.errors import DocumentTooLarge

logger = logging.getLogger("maxtracker")

# BSON documents (and the update command that carries them) max out at 16 MiB.
_MAX_BLOB_BYTES = 15 * 1024 * 1024


def encode_payload(payload: dict[str, Any]) -> bytes:
    raw = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    return gzip.compress(raw, compresslevel=6)


def decode_cache_doc(doc: dict[str, Any]) -> dict[str, Any]:
    if "payload_gz" in doc:
        payload = json.loads(gzip.decompress(doc["payload_gz"]))
    else:
        payload = doc.get("payload")
    return {"_id": doc["_id"], "payload": payload, "sync_at": doc.get("sync_at")}


class SearchCacheRepository:
    def __init__(self, collection) -> None:
        self._col = collection

    async def get(self, key: str) -> Optional[dict[str, Any]]:
        doc = await self._col.find_one({"_id": key})
        if doc is None:
            return None
        return decode_cache_doc(doc)

    async def set(self, key: str, payload: dict[str, Any], *, sync_at: Optional[str]) -> None:
        blob = encode_payload(payload)
        if len(blob) > _MAX_BLOB_BYTES:
            logger.warning(
                "cache skip Mongo key=%r gzip=%d bytes exceeds BSON limit",
                key,
                len(blob),
            )
            return
        try:
            await self._col.update_one(
                {"_id": key},
                {
                    "$set": {"payload_gz": Binary(blob), "sync_at": sync_at},
                    "$unset": {"payload": ""},
                },
                upsert=True,
            )
        except DocumentTooLarge:
            logger.warning("cache skip Mongo key=%r — update command still too large", key)

    async def metro_entries(self, *, limit: int = 32) -> list[dict[str, Any]]:
        """Entrées métropole uniquement — petit volume, prioritaire au boot."""
        cursor = (
            self._col.find(
                {"_id": {"$regex": r"^metro:"}},
                {"_id": 1, "payload": 1, "payload_gz": 1, "sync_at": 1},
            )
            .limit(limit)
        )
        docs = await cursor.to_list(length=limit)
        return [decode_cache_doc(d) for d in docs]

    async def prune(self, *, keep_sync_at: Optional[str]) -> int:
        res = await self._col.delete_many({"sync_at": {"$ne": keep_sync_at}})
        return res.deleted_count
