from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from events.models import Event


class Command(BaseCommand):
    help = "Добавляет несколько демонстрационных CTF"

    def handle(self, *args, **options):
        now = timezone.now()
        samples = [
            ("Moscow Cyber Cup", "77", "Москва", 3, "Командный jeopardy CTF для начинающих и опытных игроков."),
            ("Ural CTF", "66", "Екатеринбург", 12, "Очные соревнования по веб-безопасности, реверсу и криптографии."),
            ("Siberia Attack & Defense", "54", "Новосибирск", 28, "Классический командный Attack & Defense с финалом на площадке."),
        ]
        created = 0
        for title, region, city, days, description in samples:
            _, was_created = Event.objects.get_or_create(
                title=title,
                defaults={
                    "region_code": region,
                    "city": city,
                    "starts_at": now + timedelta(days=days),
                    "ends_at": now + timedelta(days=days, hours=8),
                    "description": description,
                    "format": Event.Format.OFFLINE,
                    "published": True,
                },
            )
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Добавлено демонстрационных событий: {created}"))
