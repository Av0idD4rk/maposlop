from django.contrib import admin
from django.urls import include, path
from events.views import index

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("events.urls")),
    path("", index, name="index"),
]
