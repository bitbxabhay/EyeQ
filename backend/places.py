"""
places.py — real eye-care clinic search using Google Places API (New).
Needs GOOGLE_PLACES_API_KEY (or the legacy GOOGLE_MAPS_API_KEY) set in backend/.env
"""
from __future__ import annotations
import os
from pathlib import Path
import requests
from dotenv import load_dotenv

load_dotenv(Path(__file__).resolve().parent / ".env")

SEARCH_URL = "https://places.googleapis.com/v1/places:searchText"
FIELD_MASK = ",".join([
    "places.id", "places.displayName", "places.formattedAddress",
    "places.location", "places.rating", "places.userRatingCount",
    "places.internationalPhoneNumber", "places.currentOpeningHours.openNow",
    "places.websiteUri", "places.types",
])


class PlacesError(RuntimeError):
    pass


class PlacesNotConfigured(RuntimeError):
    pass


def api_key() -> str:
    # Keep the newer Places name preferred while accepting the existing local config.
    key = (
        os.environ.get("GOOGLE_PLACES_API_KEY", "").strip()
        or os.environ.get("GOOGLE_MAPS_API_KEY", "").strip()
    )
    if not key:
        raise PlacesNotConfigured(
            "GOOGLE_PLACES_API_KEY (or GOOGLE_MAPS_API_KEY) is not set in backend/.env"
        )
    return key


def search_eye_care(
    query: str,
    location_text: str | None = None,
    lat: float | None = None,
    lon: float | None = None,
    radius_m: int = 20000,
) -> list[dict]:
    text = f"{query} near {location_text}" if location_text else query
    body = {"textQuery": text, "maxResultCount": 20}
    if lat is not None and lon is not None:
        body["locationBias"] = {
            "circle": {"center": {"latitude": lat, "longitude": lon}, "radius": radius_m}
        }

    resp = requests.post(
        SEARCH_URL,
        json=body,
        headers={
            "Content-Type": "application/json",
            "X-Goog-Api-Key": api_key(),
            "X-Goog-FieldMask": FIELD_MASK,
        },
        timeout=10,
    )
    if resp.status_code != 200:
        raise PlacesError(f"Google Places API error {resp.status_code}: {resp.text[:300]}")

    places_data = resp.json().get("places", [])
    out = []
    for p in places_data:
        loc = p.get("location", {})
        out.append({
            "place_id": p.get("id"),
            "name": p.get("displayName", {}).get("text", "Unknown"),
            "address": p.get("formattedAddress", ""),
            "lat": loc.get("latitude"),
            "lng": loc.get("longitude"),
            "rating": p.get("rating"),
            "reviews": p.get("userRatingCount"),
            "phone": p.get("internationalPhoneNumber"),
            "open_now": (p.get("currentOpeningHours") or {}).get("openNow"),
            "website": p.get("websiteUri"),
            "types": p.get("types", []),
        })
    return out