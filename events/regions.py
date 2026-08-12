from functools import lru_cache
from pathlib import Path
from xml.etree import ElementTree

from django.conf import settings


@lru_cache(maxsize=1)
def region_choices():
    svg = Path(settings.BASE_DIR) / "public" / "russia-regions.svg"
    root = ElementTree.parse(svg).getroot()
    namespace = "{http://www.w3.org/2000/svg}"
    regions = []
    for group in root.findall(f"{namespace}g"):
        group_id = group.attrib.get("id", "")
        if group_id.startswith("region-"):
            regions.append((group_id.removeprefix("region-"), group.attrib.get("data-name", group_id)))
    return tuple(sorted(regions, key=lambda item: item[1]))


def region_name(code):
    return dict(region_choices()).get(code, "")
