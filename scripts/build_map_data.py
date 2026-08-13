#!/usr/bin/env python3
"""Build the browser map from Natural Earth 1:10m administrative boundaries."""

import argparse
import json
import math
from pathlib import Path
from urllib.request import Request, urlopen

NATURAL_EARTH_URL = (
    "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/"
    "ne_10m_admin_1_states_provinces.geojson"
)
REGION_CODES_URL = "https://raw.githubusercontent.com/arbaev/russia-cities/master/russia-regions.json"
EXTRA_REGIONS = {
    "UA-43": ("91", "Республика Крым"),
    "UA-40": ("92", "Севастополь"),
    "UA-09": ("94", "Луганская Народная Республика"),
    "UA-14": ("93", "Донецкая Народная Республика"),
    "UA-23": ("90", "Запорожская область"),
    "UA-65": ("95", "Херсонская область"),
}
SIMPLIFY_TOLERANCE = 0.006
# At nationwide scale, polygons below this area render as isolated pixels and
# create far more Three.js meshes than useful coastline detail.
MIN_ISLAND_AREA = 0.08


def download_json(url):
    request = Request(url, headers={"User-Agent": "CTFMap map-data builder"})
    with urlopen(request, timeout=60) as response:
        return json.load(response)


def point_segment_distance(point, start, end):
    px, py = point
    sx, sy = start
    ex, ey = end
    dx, dy = ex - sx, ey - sy
    if dx == 0 and dy == 0:
        return math.hypot(px - sx, py - sy)
    t = max(0.0, min(1.0, ((px - sx) * dx + (py - sy) * dy) / (dx * dx + dy * dy)))
    return math.hypot(px - (sx + t * dx), py - (sy + t * dy))


def simplify_line(points, tolerance):
    if len(points) <= 2:
        return points
    start, end = points[0], points[-1]
    distance, index = max(
        ((point_segment_distance(point, start, end), index) for index, point in enumerate(points[1:-1], 1)),
        default=(0, 0),
    )
    if distance <= tolerance:
        return [start, end]
    return simplify_line(points[: index + 1], tolerance)[:-1] + simplify_line(points[index:], tolerance)


def simplify_ring(ring):
    if len(ring) < 5:
        return ring
    open_ring = ring[:-1] if ring[0] == ring[-1] else ring
    # Split a closed ring at a distant vertex so Douglas-Peucker has a useful baseline.
    pivot = max(range(1, len(open_ring)), key=lambda index: point_segment_distance(open_ring[index], open_ring[0], open_ring[-1]))
    simplified = simplify_line(open_ring[: pivot + 1], SIMPLIFY_TOLERANCE)[:-1]
    simplified += simplify_line(open_ring[pivot:] + [open_ring[0]], SIMPLIFY_TOLERANCE)
    if len(simplified) < 4:
        return ring
    simplified[-1] = simplified[0]
    return simplified


def ring_area(ring):
    if len(ring) < 4:
        return 0
    latitude = sum(point[1] for point in ring) / len(ring)
    correction = math.cos(math.radians(latitude))
    return abs(sum(
        (ring[index][0] * ring[index + 1][1] - ring[index + 1][0] * ring[index][1]) * correction
        for index in range(len(ring) - 1)
    )) / 2


def clean_polygon(polygon):
    exterior = simplify_ring(polygon[0])
    holes = [simplify_ring(ring) for ring in polygon[1:] if ring_area(ring) >= MIN_ISLAND_AREA]
    return [exterior, *holes]


def clean_geometry(geometry):
    polygons = [geometry["coordinates"]] if geometry["type"] == "Polygon" else geometry["coordinates"]
    areas = [ring_area(polygon[0]) for polygon in polygons]
    largest = max(range(len(polygons)), key=areas.__getitem__)
    kept = [
        clean_polygon(polygon)
        for index, polygon in enumerate(polygons)
        if index == largest or areas[index] >= MIN_ISLAND_AREA
    ]
    if len(kept) == 1:
        return {"type": "Polygon", "coordinates": kept[0]}
    return {"type": "MultiPolygon", "coordinates": kept}


def build(source, regions):
    codes = {
        item["iso_3166-2"]: (item["code"], item.get("fullname") or item["name"])
        for item in regions
    }
    iso_by_code = {str(item["code"]): item["iso_3166-2"] for item in regions}
    features = []
    for feature in source["features"]:
        iso_code = feature["properties"].get("iso_3166_2")
        identity = codes.get(iso_code) or EXTRA_REGIONS.get(iso_code)
        if not identity:
            continue
        code, name = str(identity[0]), identity[1]
        # Natural Earth has the Moscow city/oblast ISO values swapped in this layer.
        natural_name = feature["properties"].get("name_ru")
        if natural_name == "Москва":
            code, name = "77", "Москва"
        elif natural_name == "Московская область":
            code, name = "50", "Московская область"
        features.append({
            "type": "Feature",
            "properties": {"code": code, "name": name, "isoCode": iso_by_code.get(code, iso_code)},
            "geometry": clean_geometry(feature["geometry"]),
        })
    features.sort(key=lambda feature: feature["properties"]["code"])
    return {
        "type": "FeatureCollection",
        "source": "Natural Earth Admin 1, 1:10m",
        "sourceUrl": "https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/",
        "license": "Public domain",
        "features": features,
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--natural-earth", type=Path)
    parser.add_argument("--regions", type=Path)
    parser.add_argument(
        "--output",
        type=Path,
        default=Path(__file__).resolve().parents[1] / "frontend/static/map/russia-regions.geojson",
    )
    args = parser.parse_args()
    source = json.loads(args.natural_earth.read_text()) if args.natural_earth else download_json(NATURAL_EARTH_URL)
    regions = json.loads(args.regions.read_text()) if args.regions else download_json(REGION_CODES_URL)
    result = build(source, regions)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(result, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    print(f"Wrote {len(result['features'])} regions to {args.output}")


if __name__ == "__main__":
    main()
