import json
from functools import lru_cache
from pathlib import Path

from django.conf import settings

REGION_ALIASES = {"92": "91", "77": "50", "78": "47"}
COMPOSITE_NAMES = {
    "91": "Республика Крым и Севастополь",
    "50": "Москва и Московская область",
    "47": "Санкт-Петербург и Ленинградская область",
}


def canonical_region_code(code):
    return REGION_ALIASES.get(str(code), str(code))


@lru_cache(maxsize=1)
def region_records():
    path = Path(settings.FRONTEND_DIR) / "static" / "map" / "russia-regions.geojson"
    data = json.loads(path.read_text(encoding="utf-8"))
    return tuple(feature["properties"] for feature in data["features"])


@lru_cache(maxsize=1)
def administrative_region_choices():
    regions = {record["code"]: record["name"] for record in region_records()}
    return tuple(sorted(regions.items(), key=lambda item: item[1]))


@lru_cache(maxsize=1)
def region_choices():
    regions = {}
    for code, name in administrative_region_choices():
        canonical = canonical_region_code(code)
        regions[canonical] = COMPOSITE_NAMES.get(canonical, name)
    return tuple(sorted(regions.items(), key=lambda item: item[1]))


def region_name(code):
    return dict(region_choices()).get(canonical_region_code(code), "")


def administrative_region_name(code):
    return dict(administrative_region_choices()).get(str(code), "")


def region_iso_codes(code):
    canonical = canonical_region_code(code)
    return {
        record["isoCode"]
        for record in region_records()
        if canonical_region_code(record["code"]) == canonical
    }


def administrative_iso_code(code):
    return next(
        (record["isoCode"] for record in region_records() if record["code"] == str(code)),
        "",
    )


def administrative_code_for_iso(iso_code):
    return next(
        (record["code"] for record in region_records() if record["isoCode"] == iso_code),
        "",
    )
