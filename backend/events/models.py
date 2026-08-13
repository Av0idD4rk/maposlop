from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .regions import administrative_region_name, canonical_region_code, region_name


class City(models.Model):
    name = models.CharField("Город", max_length=120)
    region_code = models.CharField("Код субъекта", max_length=3)
    region_label = models.CharField("Субъект РФ", max_length=160, editable=False)
    latitude = models.DecimalField("Широта", max_digits=9, decimal_places=6)
    longitude = models.DecimalField("Долгота", max_digits=9, decimal_places=6)
    geodata_source = models.CharField("Источник геоданных", max_length=160)
    source_url = models.URLField("Ссылка на источник")
    location_verified = models.BooleanField("Точка проверена", default=False)

    class Meta:
        ordering = ("name",)
        constraints = [
            models.UniqueConstraint(fields=("region_code", "name"), name="unique_city_per_region"),
        ]
        verbose_name = "Город"
        verbose_name_plural = "Города"

    def clean(self):
        if self.region_code and not administrative_region_name(self.region_code):
            raise ValidationError({"region_code": "Выберите субъект РФ из списка."})
        if self.latitude is not None and not -90 <= self.latitude <= 90:
            raise ValidationError({"latitude": "Широта должна быть от -90 до 90."})
        if self.longitude is not None and not -180 <= self.longitude <= 180:
            raise ValidationError({"longitude": "Долгота должна быть от -180 до 180."})

    def save(self, *args, **kwargs):
        self.region_label = administrative_region_name(self.region_code)
        super().save(*args, **kwargs)

    @property
    def has_exact_marker(self):
        return self.location_verified

    def __str__(self):
        return f"{self.name}, {self.region_label}"


class Event(models.Model):
    class Format(models.TextChoices):
        OFFLINE = "offline", "Очно"
        ONLINE = "online", "Онлайн"
        HYBRID = "hybrid", "Гибрид"

    title = models.CharField("Название", max_length=160)
    region_code = models.CharField("Регион", max_length=3)
    region_label = models.CharField("Название региона", max_length=160, editable=False)
    city = models.CharField("Город", max_length=120, blank=True, editable=False)
    city_ref = models.ForeignKey(
        City,
        verbose_name="Город",
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="events",
    )
    venue = models.CharField("Площадка", max_length=180, blank=True)
    starts_at = models.DateTimeField("Начало")
    ends_at = models.DateTimeField("Окончание")
    format = models.CharField("Формат", max_length=12, choices=Format.choices, default=Format.OFFLINE)
    description = models.TextField("Описание")
    website = models.URLField("Сайт / регистрация", blank=True)
    organizer = models.CharField("Организатор", max_length=160, blank=True)
    published = models.BooleanField("Опубликовано", default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ("starts_at",)
        indexes = [
            models.Index(
                fields=("published", "ends_at", "starts_at"),
                name="event_public_dates_idx",
            ),
            models.Index(
                fields=("region_code", "published", "ends_at"),
                name="event_region_public_idx",
            ),
        ]
        verbose_name = "CTF-мероприятие"
        verbose_name_plural = "CTF-мероприятия"

    def clean(self):
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Окончание должно быть позже начала."})
        if self.region_code and not region_name(self.region_code):
            raise ValidationError({"region_code": "Выберите регион из списка."})
        if self.city_ref and canonical_region_code(self.city_ref.region_code) != canonical_region_code(self.region_code):
            raise ValidationError({"city_ref": "Город должен относиться к выбранному региону карты."})

    def save(self, *args, **kwargs):
        if self.city_ref:
            self.region_code = self.city_ref.region_code
            self.city = self.city_ref.name
        self.region_label = administrative_region_name(self.region_code) or region_name(self.region_code)
        super().save(*args, **kwargs)

    @property
    def is_upcoming(self):
        return self.ends_at >= timezone.now()

    def __str__(self):
        return f"{self.title} — {self.region_label}"


class EventSubmission(models.Model):
    class Status(models.TextChoices):
        NEW = "new", "Новое"
        REVIEW = "review", "На проверке"
        ADDED = "added", "Добавлено"
        DECLINED = "declined", "Отклонено"

    title = models.CharField("Название", max_length=160)
    region_code = models.CharField("Регион", max_length=3)
    region_label = models.CharField("Название региона", max_length=160, editable=False)
    city = models.CharField("Город", max_length=120, blank=True)
    starts_at = models.DateTimeField("Начало")
    ends_at = models.DateTimeField("Окончание", null=True, blank=True)
    website = models.URLField("Ссылка", blank=True)
    details = models.TextField("Что важно знать")
    contact_name = models.CharField("Имя отправителя", max_length=120)
    contact_email = models.EmailField("Email для связи")
    status = models.CharField("Статус", max_length=12, choices=Status.choices, default=Status.NEW)
    admin_note = models.TextField("Заметка администратора", blank=True)
    created_at = models.DateTimeField("Получено", auto_now_add=True)

    class Meta:
        ordering = ("-created_at",)
        indexes = [
            models.Index(fields=("status", "created_at"), name="submission_status_idx"),
        ]
        verbose_name = "Предложение мероприятия"
        verbose_name_plural = "Предложения мероприятий"

    def clean(self):
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Окончание должно быть позже начала."})
        if self.region_code and not region_name(self.region_code):
            raise ValidationError({"region_code": "Выберите регион из списка."})

    def save(self, *args, **kwargs):
        self.region_code = canonical_region_code(self.region_code)
        self.region_label = region_name(self.region_code)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} — {self.region_label}"
