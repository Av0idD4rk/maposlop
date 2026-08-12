from django.contrib import admin, messages

from .forms import EventAdminForm, SubmissionAdminForm
from .models import Event, EventSubmission

admin.site.site_header = "CTF Карта — управление"
admin.site.site_title = "CTF Карта"
admin.site.index_title = "Мероприятия и предложения"


@admin.register(Event)
class EventAdmin(admin.ModelAdmin):
    form = EventAdminForm
    list_display = ("title", "region_label", "starts_at", "format", "published")
    list_filter = ("published", "format", "region_label")
    search_fields = ("title", "city", "organizer", "description")
    date_hierarchy = "starts_at"
    fieldsets = (
        ("Основное", {"fields": ("title", "region_code", "city", "venue", "format")}),
        ("Когда", {"fields": ("starts_at", "ends_at")}),
        ("Описание и ссылка", {"fields": ("description", "organizer", "website")}),
        ("Публикация", {"fields": ("published",)}),
    )


@admin.action(description="Создать CTF из выбранных предложений")
def create_events(modeladmin, request, queryset):
    count = 0
    for item in queryset.exclude(status=EventSubmission.Status.ADDED):
        end = item.ends_at or item.starts_at + __import__("datetime").timedelta(hours=8)
        Event.objects.create(
            title=item.title, region_code=item.region_code, city=item.city,
            starts_at=item.starts_at, ends_at=end, description=item.details,
            website=item.website, published=True,
        )
        item.status = EventSubmission.Status.ADDED
        item.save(update_fields=("status",))
        count += 1
    modeladmin.message_user(request, f"Добавлено мероприятий: {count}", messages.SUCCESS)


@admin.register(EventSubmission)
class EventSubmissionAdmin(admin.ModelAdmin):
    form = SubmissionAdminForm
    list_display = ("title", "region_label", "starts_at", "contact_email", "status", "created_at")
    list_filter = ("status", "region_label")
    search_fields = ("title", "contact_email", "details")
    readonly_fields = ("created_at",)
    actions = (create_events,)
