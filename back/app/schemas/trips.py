"""API response models."""
from typing import List, Optional

from pydantic import BaseModel


class TripOut(BaseModel):
    id: str
    train_no: str
    date: str
    origine: str
    destination: str
    origine_label: str = ""
    destination_label: str = ""
    origine_iata: Optional[str] = None
    destination_iata: Optional[str] = None
    heure_depart: str
    heure_arrivee: str
    axe: Optional[str] = ""
    train_type: str
    fare_eur: float = 0.0
    price_checked_at: Optional[str] = None
    sncf_connect_url: str
    destination_metropolis: Optional[str] = None
    departure_datetime: str


class ConnectedTripOut(BaseModel):
    id: str
    date: str
    heure_depart: str
    heure_arrivee: str
    departure_datetime: str
    hub_metropolis: str
    connection_count: int = 1
    connection_minutes: int
    total_duration_minutes: int
    destination_metropolis: Optional[str] = None
    legs: List[TripOut]
    price_checked_at: Optional[str] = None


class DestinationGroup(BaseModel):
    destination_city: str
    destinations: List[str]
    trip_count: int
    trips: List[TripOut]
    connected_trips: List[ConnectedTripOut] = []


class SearchResponse(BaseModel):
    origin: str
    total_trips: int
    groups: List[DestinationGroup]
    last_sync_at: Optional[str] = None
    served: bool = True


class SyncInfo(BaseModel):
    last_sync_at: Optional[str] = None
    last_attempt_at: Optional[str] = None
    last_sync_status: str = "pending"
    sncf_data_updated_at: Optional[str] = None
    total_trips: int = 0
    last_error: Optional[str] = None
    next_sync_at: Optional[str] = None


class StationSuggestion(BaseModel):
    name: str
    raw: str
    is_metropolis: bool = False
