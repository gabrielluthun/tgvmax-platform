from fastapi import APIRouter

from app.dependencies import SncfClientDep, SyncRepoDep, SyncServiceDep
from app.schemas.trips import SyncInfo

router = APIRouter(prefix="/sync", tags=["sync"])


@router.get("/info", response_model=SyncInfo)
async def get_sync_info(sync_repo: SyncRepoDep, sncf: SncfClientDep):
    doc = await sync_repo.get()
    if not doc.get("sncf_data_updated_at"):
        sncf_updated = await sncf.fetch_dataset_updated_at()
        if sncf_updated:
            doc["sncf_data_updated_at"] = sncf_updated
            await sync_repo.update({"sncf_data_updated_at": sncf_updated})
    return SyncInfo(**doc) if doc else SyncInfo()


@router.post("/trigger")
async def trigger_sync(sync_service: SyncServiceDep):
    return await sync_service.sync_trips(force=True)
