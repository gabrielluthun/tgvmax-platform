from datetime import timezone

from fastapi import APIRouter, Request

from app.dependencies import SncfClientDep, SyncRepoDep, SyncServiceDep
from app.schemas.trips import SyncInfo

router = APIRouter(prefix="/sync", tags=["sync"])


def _next_sync_at(request: Request) -> str | None:
    scheduler = getattr(request.app.state, "scheduler", None)
    job = scheduler.get_job("sync_job") if scheduler else None
    next_run = getattr(job, "next_run_time", None) if job else None
    if next_run is None:
        return None
    if next_run.tzinfo is None:
        return next_run.isoformat()
    return next_run.astimezone(timezone.utc).isoformat()


@router.get("/info", response_model=SyncInfo)
async def get_sync_info(request: Request, sync_repo: SyncRepoDep, sncf: SncfClientDep):
    doc = await sync_repo.get()
    if not doc.get("sncf_data_updated_at"):
        sncf_updated = await sncf.fetch_dataset_updated_at()
        if sncf_updated:
            doc["sncf_data_updated_at"] = sncf_updated
            await sync_repo.update({"sncf_data_updated_at": sncf_updated})
    info = SyncInfo(**doc) if doc else SyncInfo()
    info.next_sync_at = _next_sync_at(request)
    return info


@router.post("/trigger")
async def trigger_sync(sync_service: SyncServiceDep):
    return await sync_service.sync_trips(force=True)
