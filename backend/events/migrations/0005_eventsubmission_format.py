from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [("events", "0004_event_event_public_dates_idx_and_more")]

    operations = [
        migrations.AddField(
            model_name="eventsubmission",
            name="format",
            field=models.CharField(
                choices=[("offline", "Очно"), ("online", "Онлайн"), ("hybrid", "Гибрид")],
                default="offline",
                max_length=12,
                verbose_name="Формат",
            ),
        ),
    ]
