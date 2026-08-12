import json

from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Event, EventSubmission
from .regions import region_name

FRONTEND_INDEX = settings.BASE_DIR / "static" / "dist" / "index.html"


@ensure_csrf_cookie
def index(request):
    """Serve the prebuilt SvelteKit SPA shell (static/dist/index.html).

    The frontend is a serverless static build (adapter-static, SPA fallback);
    Django's only job here is to hand back that file and set the CSRF cookie.
    """
    try:
        html = FRONTEND_INDEX.read_text(encoding="utf-8")
    except FileNotFoundError:
        return HttpResponse(
            "Frontend build not found. Run `npm install && npm run build` in frontend/.",
            status=503,
        )
    return HttpResponse(html)


@require_GET
def events_api(request):
    events = Event.objects.filter(published=True, ends_at__gte=timezone.now())
    region = request.GET.get("region")
    if region:
        events = events.filter(region_code=region)
    data = [{
        "id": event.id, "title": event.title, "regionCode": event.region_code,
        "regionName": region_name(event.region_code), "city": event.city, "venue": event.venue,
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
