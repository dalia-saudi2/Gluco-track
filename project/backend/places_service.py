"""Nearby pharmacies and laboratories via OpenStreetMap Overpass API."""

from __future__ import annotations

import math
from typing import Any, Literal

import httpx

PlaceCategory = Literal["pharmacy", "laboratory"]

OVERPASS_URL = "https://overpass-api.de/api/interpreter"
DEFAULT_RADIUS_METERS = 2000
REQUEST_TIMEOUT = 45.0
OVERPASS_HEADERS = {
    "User-Agent": "GlucoTrack/1.0 (patient-portal; nearby-places)",
    "Accept": "application/json",
}


def haversine_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371000.0
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlmb = math.radians(lon2 - lon1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlmb / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def format_distance(meters: float) -> str:
    if meters < 1000:
        return f"{int(round(meters))} m"
    return f"{(meters / 1000):.1f} km"


def _build_overpass_query(category: PlaceCategory, lat: float, lng: float, radius_m: int) -> str:
    if category == "pharmacy":
        filter_line = '["amenity"="pharmacy"]'
    else:
        filter_line = '["healthcare"="laboratory"]'

    around = f"(around:{radius_m},{lat},{lng})"
    return f"""[out:json][timeout:25];
(
  node{filter_line}{around};
  way{filter_line}{around};
  relation{filter_line}{around};
);
out center tags;"""


def _element_coords(element: dict[str, Any]) -> tuple[float | None, float | None]:
    center = element.get("center") or {}
    lat, lon = (
        (element.get("lat"), element.get("lon"))
        if element.get("type") == "node"
        else (center.get("lat"), center.get("lon"))
    )
    return (
        (float(lat), float(lon))
        if lat is not None and lon is not None
        else (None, None)
    )


def _format_address(tags: dict[str, Any]) -> str:
    if tags.get("addr:full"):
        return str(tags["addr:full"])
    parts = [
        tags.get("addr:housenumber"),
        tags.get("addr:street"),
        tags.get("addr:city") or tags.get("addr:town") or tags.get("addr:village"),
        tags.get("addr:state"),
        tags.get("addr:country"),
    ]
    cleaned = [str(p).strip() for p in parts if p]
    return ", ".join(cleaned)


def _extract_phone(tags: dict[str, Any]) -> str | None:
    for key in ("phone", "contact:phone", "contact:mobile"):
        value = tags.get(key)
        if value and str(value).strip():
            return str(value).strip()
    return None


def _maps_url(lat: float, lon: float, name: str) -> str:
    from urllib.parse import quote

    label = quote(name or "Location")
    return f"https://www.openstreetmap.org/?mlat={lat}&mlon={lon}#map=17/{lat}/{lon}"


def _normalize_element(
    element: dict[str, Any], origin_lat: float, origin_lng: float
) -> dict[str, Any] | None:
    tags = element.get("tags") or {}
    name = tags.get("name") or tags.get("brand") or tags.get("operator")
    if not name:
        return None

    plat, plng = _element_coords(element)
    if plat is None or plng is None:
        return None

    distance = haversine_meters(origin_lat, origin_lng, plat, plng)
    osm_type = element.get("type", "node")
    osm_id = element.get("id")

    return {
        "id": f"{osm_type}/{osm_id}",
        "name": str(name),
        "address": _format_address(tags),
        "phone": _extract_phone(tags),
        "opening_hours": tags.get("opening_hours"),
        "distance_meters": round(distance),
        "distance_label": format_distance(distance),
        "latitude": plat,
        "longitude": plng,
        "maps_url": _maps_url(plat, plng, str(name)),
    }


async def search_nearby_places(
    *,
    category: PlaceCategory,
    latitude: float,
    longitude: float,
    radius_meters: int = DEFAULT_RADIUS_METERS,
) -> list[dict[str, Any]]:
    query = _build_overpass_query(category, latitude, longitude, radius_meters)

    async with httpx.AsyncClient(timeout=REQUEST_TIMEOUT) as client:
        response = await client.post(
            OVERPASS_URL,
            data={"data": query},
            headers=OVERPASS_HEADERS,
        )
        if response.status_code != 200:
            detail = response.text[:300]
            raise RuntimeError(f"Overpass API error ({response.status_code}): {detail}")

        data = response.json()

    elements = data.get("elements") or []
    seen: set[str] = set()
    results: list[dict[str, Any]] = []

    for element in elements:
        normalized = _normalize_element(element, latitude, longitude)
        if not normalized:
            continue
        key = f"{normalized['name']}|{normalized['latitude']:.5f}|{normalized['longitude']:.5f}"
        if key in seen:
            continue
        seen.add(key)
        results.append(normalized)

    results.sort(key=lambda p: p["distance_meters"])
    return results
