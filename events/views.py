import json

from django.core.exceptions import ValidationError
from django.http import JsonResponse
from django.shortcuts import render
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Event, EventSubmission


@ensure_csrf_cookie
def index(request):
    return render(request, "index.html")


@require_GET
def events_api(request):
    events = Event.objects.filter(published=True, ends_at__gte=timezone.now())
    region = request.GET.get("region")
    if region:
        events = events.filter(region_code=region)
    data = [{
        "id": event.id, "title": event.title, "regionCode": event.region_code,
        "regionName": event.region_label, "city": event.city, "venue": event.venue,
        "startsAt": event.starts_at.isoformat(), "endsAt": event.ends_at.isoformat(),
        "format": event.get_format_display(), "description": event.description,
        "website": event.website, "organizer": event.organizer,
    } for event in events]
    return JsonResponse({"events": data, "updatedAt": timezone.now().isoformat()})


@require_POST
def submissions_api(request):
    try:
        data = json.loads(request.body)
        submission = EventSubmission(
            title=data.get("title", "").strip(), region_code=data.get("regionCode", ""),
            city=data.get("city", "").strip(), starts_at=data.get("startsAt"),
            ends_at=data.get("endsAt") or None, website=data.get("website", "").strip(),
            details=data.get("details", "").strip(), contact_name=data.get("contactName", "").strip(),
            contact_email=data.get("contactEmail", "").strip(),
        )
        submission.full_clean()
        submission.save()
    except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as error:
        details = getattr(error, "message_dict", None) or {"form": [str(error)]}
        return JsonResponse({"ok": False, "errors": details}, status=400)
    return JsonResponse({"ok": True, "message": "Спасибо! Событие отправлено на проверку."}, status=201)
