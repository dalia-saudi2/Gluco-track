"""
USDA FoodData Central (FDC) API client — documented search + food detail for carbs.
See https://fdc.nal.usda.gov/api-guide.html (API key required for production rate limits).
"""
from __future__ import annotations

from typing import Any, Dict, List, Optional

import requests

from config import settings

FDC_SEARCH_URL = "https://api.nal.usda.gov/fdc/v1/foods/search"
FDC_FOOD_URL = "https://api.nal.usda.gov/fdc/v1/food"


def _params_base() -> Dict[str, str]:
    key = (settings.usda_fdc_api_key or "").strip()
    if not key:
        raise RuntimeError(
            "USDA_FDC_API_KEY is not set. Add it to backend/.env for FoodData Central."
        )
    return {"api_key": key}


def search_foods(query: str, page_size: int = 25, page_number: int = 1) -> List[Dict[str, Any]]:
    """Search branded + foundation foods; returns raw FDC JSON hits."""
    api_key = _params_base()["api_key"]
    body = {
        "query": query,
        "pageSize": min(max(page_size, 1), 50),
        "pageNumber": max(page_number, 1),
        "dataType": ["Branded", "Foundation", "SR Legacy"],
    }
    r = requests.post(FDC_SEARCH_URL, params={"api_key": api_key}, json=body, timeout=30)
    r.raise_for_status()
    data = r.json()
    return list(data.get("foods") or [])


def get_food_detail(fdc_id: int) -> Dict[str, Any]:
    r = requests.get(
        f"{FDC_FOOD_URL}/{fdc_id}",
        params=_params_base(),
        timeout=30,
    )
    r.raise_for_status()
    return r.json()


def extract_carbs_per_100g(food_detail: Dict[str, Any]) -> Optional[float]:
    """Carbohydrate by difference is typically nutrient id 1005 in FDC."""
    nutrients = food_detail.get("foodNutrients") or []
    for n in nutrients:
        nut = n.get("nutrient") or {}
        nid = nut.get("id")
        name = (nut.get("name") or "").lower()
        if nid == 1005 or ("carbohydrate" in name and "fiber" not in name):
            amt = n.get("amount")
            if amt is not None:
                return float(amt)
    return None


def extract_energy_kcal_per_100g(food_detail: Dict[str, Any]) -> Optional[float]:
    nutrients = food_detail.get("foodNutrients") or []
    for n in nutrients:
        nut = n.get("nutrient") or {}
        nid = nut.get("id")
        name = (nut.get("name") or "").lower()
        unit = (nut.get("unitName") or "").lower()
        if nid == 1008 or ("energy" in name and "kj" not in name):
            amt = n.get("amount")
            if amt is not None and (unit == "kcal" or unit == "" or "kcal" in name):
                return float(amt)
    return None
