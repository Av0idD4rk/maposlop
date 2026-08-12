from functools import lru_cache
from pathlib import Path
from xml.etree import ElementTree

from django.conf import settings

REGION_ALIASES = {"92": "91", "77": "50", "78": "47"}
COMPOSITE_NAMES = {
    "91": "Республика Крым и Севастополь",
    "50": "Москва и Московская область",
    "47": "Санкт-Петербург и Ленинградская область",
}


def canonical_region_code(code):
    return REGION_ALIASES.get(code, code)


@lru_cache(maxsize=1)
def region_choices():
    svg = Path(settings.BASE_DIR) / "public" / "russia-regions.svg"
    root = ElementTree.parse(svg).getroot()
    namespace = "{http://www.w3.org/2000/svg}"
    regions = {}
    for group in root.findall(f"{namespace}g"):
        group_id = group.attrib.get("id", "")
        if group_id.startswith("region-"):
            code = canonical_region_code(group_id.removeprefix("region-"))
            regions[code] = COMPOSITE_NAMES.get(code, group.attrib.get("data-name", group_id))
    return tuple(sorted(regions.items(), key=lambda item: item[1]))


def region_name(code):
    return dict(region_choices()).get(canonical_region_code(code), "")
