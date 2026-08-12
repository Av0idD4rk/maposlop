from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from .regions import canonical_region_code, region_name


class Event(models.Model):
    class Format(models.TextChoices):
        OFFLINE = "offline", "Очно"
        ONLINE = "online", "Онлайн"
        HYBRID = "hybrid", "Гибрид"

    title = models.CharField("Название", max_length=160)
    region_code = models.CharField("Регион", max_length=3)
    region_label = models.CharField("Название региона", max_length=160, editable=False)
    city = models.CharField("Город", max_length=120, blank=True)
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
        verbose_name = "CTF-мероприятие"
        verbose_name_plural = "CTF-мероприятия"

    def clean(self):
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({"ends_at": "Окончание должно быть позже начала."})
        if self.region_code and not region_name(self.region_code):
            raise ValidationError({"region_code": "Выберите регион из списка."})

    def save(self, *args, **kwargs):
        self.region_code = canonical_region_code(self.region_code)
        self.region_label = region_name(self.region_code)
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
