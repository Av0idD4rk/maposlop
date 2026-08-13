import json
import threading
import time
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from django.conf import settings

from .regions import (
    administrative_code_for_iso,
    administrative_iso_code,
    administrative_region_name,
    region_iso_codes,
)


class GeocodingError(Exception):
    pass


@dataclass(frozen=True)
class GeocodedCity:
    name: str
    region_code: str
    latitude: Decimal
    longitude: Decimal
    source: str
    source_url: str


_request_lock = threading.Lock()
_last_request_at = 0.0
_PLACE_FIELDS = ("city", "town", "village", "municipality", "hamlet")


def _result_iso_code(result):
    if not isinstance(result, dict):
        return ""
    address = result.get("address")
    if not isinstance(address, dict):
        return ""
    for key in ("ISO3166-2-lvl4", "ISO3166-2-lvl6", "ISO3166-2-lvl3"):
        if address.get(key):
            return address[key]
    return ""


def _result_name(result, fallback):
    namedetails = result.get("namedetails")
    address = result.get("address")
    namedetails = namedetails if isinstance(namedetails, dict) else {}
    address = address if isinstance(address, dict) else {}
    value = (
        namedetails.get("name:ru")
        or next((address.get(field) for field in _PLACE_FIELDS if address.get(field)), None)
        or result.get("name")
        or fallback
    )
    return str(value).strip()


def _request_results(city_name, selected_region_code, allowed_iso):
    countrycodes = ",".join(sorted({code.split("-", 1)[0].lower() for code in allowed_iso}))
    params = urlencode({
        "q": f"{city_name}, {administrative_region_name(selected_region_code)}",
        "format": "jsonv2",
        "addressdetails": 1,
        "namedetails": 1,
        "featureType": "settlement",
        "countrycodes": countrycodes,
        "accept-language": "ru",
        "dedupe": 1,
        "limit": 10,
    })
    request = Request(
        f"{settings.GEOCODER_URL}?{params}",
        headers={
            "Accept": "application/json",
            "Accept-Language": "ru",
            "User-Agent": settings.GEOCODER_USER_AGENT,
        },
    )
    global _last_request_at
    for attempt in range(2):
        try:
            with _request_lock:
                delay = 1.0 - (time.monotonic() - _last_request_at)
                if delay > 0:
                    time.sleep(delay)
                try:
                    with urlopen(request, timeout=settings.GEOCODER_TIMEOUT) as response:
                        payload = response.read(1_000_001)
                finally:
                    _last_request_at = time.monotonic()
            if len(payload) > 1_000_000:
                raise GeocodingError("Сервис геокодирования вернул слишком большой ответ.")
            return json.loads(payload)
        except HTTPError:
            raise
        except (URLError, TimeoutError):
            if attempt == 1:
                raise
            time.sleep(1)


def geocode_city(city_name, selected_region_code, *, allow_composite=False):
    city_name = city_name.strip()
    if not city_name:
        raise GeocodingError("Укажите город.")
    exact_iso = administrative_iso_code(selected_region_code)
    allowed_iso = region_iso_codes(selected_region_code) if allow_composite else {exact_iso}
    allowed_iso.discard("")
    if not allowed_iso:
        raise GeocodingError("Не удалось определить выбранный субъект РФ.")

    try:
        results = _request_results(city_name, selected_region_code, allowed_iso)
    except (HTTPError, URLError, TimeoutError, json.JSONDecodeError) as error:
        raise GeocodingError(
            "Не удалось получить координаты города. Проверьте интернет и повторите сохранение."
        ) from error

    result = (
        next(
            (
                item
                for item in results
                if isinstance(item, dict) and _result_iso_code(item) in allowed_iso
            ),
            None,
        )
        if isinstance(results, list)
        else None
    )
    if result is None:
        raise GeocodingError(
            "Город не найден в выбранном субъекте. Проверьте название и регион."
        )
    try:
        latitude = Decimal(result["lat"]).quantize(Decimal("0.000001"))
        longitude = Decimal(result["lon"]).quantize(Decimal("0.000001"))
    except (InvalidOperation, KeyError, TypeError) as error:
        raise GeocodingError("Сервис вернул некорректные координаты города.") from error
    iso_code = _result_iso_code(result)
    osm_type = {"N": "node", "W": "way", "R": "relation"}.get(
        str(result.get("osm_type", ""))[:1].upper(),
        str(result.get("osm_type", "")),
    )
    osm_id = result.get("osm_id")
    source_url = (
        f"https://www.openstreetmap.org/{osm_type}/{osm_id}"
        if osm_type in {"node", "way", "relation"} and osm_id
        else "https://www.openstreetmap.org/copyright"
    )
    return GeocodedCity(
        name=_result_name(result, city_name),
        region_code=administrative_code_for_iso(iso_code),
        latitude=latitude,
        longitude=longitude,
        source="OpenStreetMap contributors / Nominatim",
        source_url=source_url,
    )
