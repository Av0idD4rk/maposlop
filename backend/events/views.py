import hashlib
import json
import secrets

from django.conf import settings
from django.core.cache import cache
from django.core.exceptions import RequestDataTooBig, ValidationError
from django.db import connection
from django.http import HttpResponse, JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import ensure_csrf_cookie
from django.views.decorators.http import require_GET, require_POST

from .models import Event, EventSubmission
from .regions import administrative_region_choices, canonical_region_code
from .serializers import serialize_event

FRONTEND_INDEX = settings.BASE_DIR / "static" / "dist" / "index.html"
SUBMISSION_OK_MESSAGE = "Спасибо! Событие отправлено на проверку."


def _json_text(data, key):
    value = data.get(key, "")
    if value is None:
        return ""
    if not isinstance(value, str):
        raise TypeError(f"Поле {key} должно быть строкой.")
    return value.strip()


def _submission_client_key(request):
    remote_address = request.META.get("REMOTE_ADDR", "unknown")
    if settings.TRUST_PROXY_HEADERS:
        forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR", "")
        if forwarded_for:
            remote_address = forwarded_for.split(",", 1)[0].strip()
    digest = hashlib.sha256(f"{settings.SECRET_KEY}:{remote_address}".encode()).hexdigest()
    return f"submission-rate:{digest[:32]}"


def _submission_rate_exceeded(request):
    key = _submission_client_key(request)
    if cache.add(key, 1, timeout=settings.SUBMISSION_RATE_WINDOW):
        return False
    return cache.incr(key) > settings.SUBMISSION_RATE_LIMIT


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
    try:
        page = int(request.GET.get("page", "1"))
        limit = int(request.GET.get("limit", "100"))
    except ValueError:
        return JsonResponse(
            {"ok": False, "errors": {"pagination": ["page и limit должны быть целыми числами."]}},
            status=400,
        )
    if page < 1 or limit < 1 or limit > 200:
        return JsonResponse(
            {"ok": False, "errors": {"pagination": ["page должен быть не меньше 1, limit — от 1 до 200."]}},
            status=400,
        )
    events = Event.objects.select_related("city_ref").filter(published=True, ends_at__gte=timezone.now())
    region = request.GET.get("region")
    if region:
        canonical = canonical_region_code(region)
        members = [
            code for code, _ in administrative_region_choices()
            if canonical_region_code(code) == canonical
        ]
        events = events.filter(region_code__in=members)
    total = events.count()
    offset = (page - 1) * limit
    page_events = [] if offset >= total else events[offset:offset + limit]
    data = [serialize_event(event) for event in page_events]
    return JsonResponse({
        "events": data,
        "updatedAt": timezone.now().isoformat(),
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit,
        },
    })


@require_POST
def submissions_api(request):
    if request.content_type != "application/json":
        return JsonResponse(
            {"ok": False, "errors": {"form": ["Ожидается JSON-запрос."]}},
            status=415,
        )
    try:
        content_length = int(request.META.get("CONTENT_LENGTH") or 0)
    except (TypeError, ValueError):
        return JsonResponse(
            {"ok": False, "errors": {"form": ["Некорректный размер запроса."]}},
            status=400,
        )
    if content_length > settings.SUBMISSION_MAX_BODY_BYTES:
        return JsonResponse(
            {"ok": False, "errors": {"form": ["Запрос слишком большой."]}},
            status=413,
        )
    try:
        raw_body = request.body
        if len(raw_body) > settings.SUBMISSION_MAX_BODY_BYTES:
            raise RequestDataTooBig
        data = json.loads(raw_body)
        if not isinstance(data, dict):
            raise TypeError("JSON body must be an object")
        if str(data.get("company", "")).strip():
            return JsonResponse({"ok": True, "message": SUBMISSION_OK_MESSAGE}, status=201)
        try:
            limited = _submission_rate_exceeded(request)
        except Exception:
            return JsonResponse(
                {"ok": False, "errors": {"form": ["Сервис временно недоступен."]}},
                status=503,
            )
        if limited:
            response = JsonResponse(
                {"ok": False, "errors": {"form": ["Слишком много попыток. Повторите позже."]}},
                status=429,
            )
            response.headers["Retry-After"] = str(settings.SUBMISSION_RATE_WINDOW)
            return response
        submission = EventSubmission(
            title=_json_text(data, "title"),
            region_code=_json_text(data, "regionCode"),
            city=_json_text(data, "city"),
            starts_at=data.get("startsAt"),
            ends_at=data.get("endsAt") or None,
            website=_json_text(data, "website"),
            details=_json_text(data, "details"),
            contact_name=_json_text(data, "contactName"),
            contact_email=_json_text(data, "contactEmail"),
        )
        submission.full_clean()
        submission.save()
    except RequestDataTooBig:
        return JsonResponse(
            {"ok": False, "errors": {"form": ["Запрос слишком большой."]}},
            status=413,
        )
    except (json.JSONDecodeError, ValidationError, TypeError, ValueError) as error:
        details = getattr(error, "message_dict", None) or {"form": [str(error)]}
        return JsonResponse({"ok": False, "errors": details}, status=400)
    return JsonResponse({"ok": True, "message": SUBMISSION_OK_MESSAGE}, status=201)


@require_GET
def health(request):
    return JsonResponse({"status": "ok"})


@require_GET
def readiness(request):
    marker = secrets.token_hex(8)
    cache_key = f"readiness-check:{marker}"
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        cache.set(cache_key, marker, timeout=10)
        if cache.get(cache_key) != marker:
            raise RuntimeError("cache check failed")
        cache.delete(cache_key)
    except Exception:
        return JsonResponse({"status": "unavailable"}, status=503)
    return JsonResponse({"status": "ready"})
