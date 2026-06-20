"""Nearby pharmacies and laboratories via OpenStreetMap Overpass API."""

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_active_user
from models import User
from places_service import DEFAULT_RADIUS_METERS, search_nearby_places

router = APIRouter(prefix="/places", tags=["places"])


@router.get("/nearby")
async def get_nearby_places(
    category: str = Query(..., pattern="^(pharmacy|laboratory)$"),
    lat: float = Query(..., ge=-90, le=90),
    lng: float = Query(..., ge=-180, le=180),
    radius_m: int = Query(DEFAULT_RADIUS_METERS, ge=500, le=5000),
    _user: User = Depends(get_current_active_user),
):
    try:
        results = await search_nearby_places(
            category=category,  # type: ignore[arg-type]
            latitude=lat,
            longitude=lng,
            radius_meters=radius_m,
        )
    except RuntimeError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return {
        "category": category,
        "count": len(results),
        "radius_m": radius_m,
        "results": results,
    }
