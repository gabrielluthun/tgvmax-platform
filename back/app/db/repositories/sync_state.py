"""MongoDB access for sync_state collection."""
from typing import Any, Optional


class SyncStateRepository:
    _DOC_ID = "main"

    def __init__(self, collection) -> None:
        self._col = collection

    async def get(self) -> dict[str, Any]:
        return await self._col.find_one({"_id": self._DOC_ID}, {"_id": 0}) or {}

    async def update(self, fields: dict[str, Any]) -> None:
        await self._col.update_one(
            {"_id": self._DOC_ID},
            {"$set": fields},
            upsert=True,
        )

    async def get_last_sync_at(self) -> Optional[str]:
        doc = await self.get()
        return doc.get("last_sync_at")

    async def get_sncf_data_updated_at(self) -> Optional[str]:
        doc = await self.get()
        return doc.get("sncf_data_updated_at")
