from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from events.views import health, index, readiness

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/v1/", include(("events.urls", "events"), namespace="events-v1")),
    path("api/", include("events.urls")),
    path("health/", health, name="health"),
    path("ready/", readiness, name="readiness"),
    path(
        "favicon.ico",
        RedirectView.as_view(url="/static/dist/favicon.svg", permanent=True),
        name="favicon",
    ),
    path("", index, name="index"),
]
