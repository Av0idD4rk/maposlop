from .regions import region_name


def serialize_event(event):
    city = event.city_ref
    exact = bool(city and city.has_exact_marker)
    return {
        "id": event.id,
        "title": event.title,
        "regionCode": event.region_code,
        "regionName": region_name(event.region_code),
        "city": city.name if city else event.city,
        "venue": event.venue,
        "startsAt": event.starts_at.isoformat(),
        "endsAt": event.ends_at.isoformat(),
        "format": event.get_format_display(),
        "participationMode": event.format,
        "description": event.description,
        "website": event.website,
        "organizer": event.organizer,
        "latitude": float(city.latitude) if city else None,
        "longitude": float(city.longitude) if city else None,
        "locationPrecision": "city" if exact else "region",
        "geodataSource": city.geodata_source if city else "",
        "geodataSourceUrl": city.source_url if city else "",
    }
