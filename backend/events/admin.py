from django.contrib import admin, messages
from django.db import transaction

from .forms import EventAdminForm, SubmissionAdminForm
from .geocoding import GeocodingError, geocode_city
from .models import City, Event, EventSubmission
from .regions import canonical_region_code

admin.site.site_header = "CTF Карта — управление"
admin.site.site_title = "CTF Карта"
admin.site.index_title = "Мероприятия и предложения"


@admin.register(City)
class CityAdmin(admin.ModelAdmin):
    list_display = ("name", "region_label", "latitude", "longitude", "geodata_source")
    list_filter = ("location_verified", "region_label")
    search_fields = ("name", "region_label")
    readonly_fields = (
        "name", "region_code", "region_label", "latitude", "longitude",
        "location_verified", "geodata_source", "source_url",
    )

    def has_add_permission(self, request):
        return False


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    form = EventAdminForm
    list_display = ("title", "region_label", "starts_at", "format", "published")
    list_filter = ("published", "format", "region_label")
    search_fields = ("title", "city", "city_ref__name", "organizer", "description")
    list_select_related = ("city_ref",)
    date_hierarchy = "starts_at"
    fieldsets = (
        ("Основное", {"fields": ("title", "region_code", "city_name", "venue", "format")}),
        ("Когда", {"fields": ("starts_at", "ends_at")}),
        ("Описание и ссылка", {"fields": ("description", "organizer", "website")}),
        ("Публикация", {"fields": ("published",)}),
    )


@admin.action(description="Создать CTF из выбранных предложений")
def create_events(modeladmin, request, queryset):
    prepared = []
    pending_cities = {}
    for item in queryset.exclude(status=EventSubmission.Status.ADDED):
        city_ref = next((
            city for city in City.objects.filter(name__iexact=item.city)
            if canonical_region_code(city.region_code) == canonical_region_code(item.region_code)
        ), None)
        if item.city and city_ref is None:
            try:
                resolved = geocode_city(item.city, item.region_code, allow_composite=True)
            except GeocodingError as error:
                modeladmin.message_user(request, f"{item.title}: {error}", messages.ERROR)
                return
            city_ref = City.objects.filter(
                region_code=resolved.region_code,
                name__iexact=resolved.name,
            ).first()
            if city_ref is None:
                key = (resolved.region_code, resolved.name.casefold())
                city_ref = pending_cities.setdefault(key, City(
                    name=resolved.name,
                    region_code=resolved.region_code,
                    latitude=resolved.latitude,
                    longitude=resolved.longitude,
                    geodata_source=resolved.source,
                    source_url=resolved.source_url,
                    location_verified=True,
                ))
        prepared.append((item, city_ref))

    count = 0
    with transaction.atomic():
        for item, city_ref in prepared:
            if city_ref and city_ref.pk is None:
                city_ref.full_clean()
                city_ref.save()
            end = item.ends_at or item.starts_at + __import__("datetime").timedelta(hours=8)
            event = Event(
                title=item.title, region_code=city_ref.region_code if city_ref else item.region_code,
                city_ref=city_ref, starts_at=item.starts_at, ends_at=end,
                format=item.format, description=item.details, website=item.website, published=True,
            )
            event.full_clean()
            event.save()
            item.status = EventSubmission.Status.ADDED
            item.save(update_fields=("status",))
            count += 1
    modeladmin.message_user(request, f"Добавлено мероприятий: {count}", messages.SUCCESS)


@admin.register(EventSubmission)
class EventSubmissionAdmin(admin.ModelAdmin):
    form = SubmissionAdminForm
    list_display = ("title", "region_label", "starts_at", "format", "contact_email", "status", "created_at")
    list_filter = ("status", "format", "region_label")
    search_fields = ("title", "contact_email", "details")
    readonly_fields = ("created_at",)
    actions = (create_events,)
