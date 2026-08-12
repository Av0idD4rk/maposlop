from django.db import migrations, models


class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(name="Event", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("title", models.CharField(max_length=160, verbose_name="Название")),
            ("region_code", models.CharField(max_length=3, verbose_name="Регион")),
            ("region_label", models.CharField(editable=False, max_length=160, verbose_name="Название региона")),
            ("city", models.CharField(blank=True, max_length=120, verbose_name="Город")),
            ("venue", models.CharField(blank=True, max_length=180, verbose_name="Площадка")),
            ("starts_at", models.DateTimeField(verbose_name="Начало")),
            ("ends_at", models.DateTimeField(verbose_name="Окончание")),
            ("format", models.CharField(choices=[("offline", "Очно"), ("online", "Онлайн"), ("hybrid", "Гибрид")], default="offline", max_length=12, verbose_name="Формат")),
            ("description", models.TextField(verbose_name="Описание")),
            ("website", models.URLField(blank=True, verbose_name="Сайт / регистрация")),
            ("organizer", models.CharField(blank=True, max_length=160, verbose_name="Организатор")),
            ("published", models.BooleanField(default=True, verbose_name="Опубликовано")),
            ("created_at", models.DateTimeField(auto_now_add=True)),
        ], options={"verbose_name": "CTF-мероприятие", "verbose_name_plural": "CTF-мероприятия", "ordering": ("starts_at",)}),
        migrations.CreateModel(name="EventSubmission", fields=[
            ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
            ("title", models.CharField(max_length=160, verbose_name="Название")),
            ("region_code", models.CharField(max_length=3, verbose_name="Регион")),
            ("region_label", models.CharField(editable=False, max_length=160, verbose_name="Название региона")),
            ("city", models.CharField(blank=True, max_length=120, verbose_name="Город")),
            ("starts_at", models.DateTimeField(verbose_name="Начало")),
            ("ends_at", models.DateTimeField(blank=True, null=True, verbose_name="Окончание")),
            ("website", models.URLField(blank=True, verbose_name="Ссылка")),
            ("details", models.TextField(verbose_name="Что важно знать")),
            ("contact_name", models.CharField(max_length=120, verbose_name="Имя отправителя")),
            ("contact_email", models.EmailField(max_length=254, verbose_name="Email для связи")),
            ("status", models.CharField(choices=[("new", "Новое"), ("review", "На проверке"), ("added", "Добавлено"), ("declined", "Отклонено")], default="new", max_length=12, verbose_name="Статус")),
            ("admin_note", models.TextField(blank=True, verbose_name="Заметка администратора")),
            ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="Получено")),
        ], options={"verbose_name": "Предложение мероприятия", "verbose_name_plural": "Предложения мероприятий", "ordering": ("-created_at",)}),
    ]
