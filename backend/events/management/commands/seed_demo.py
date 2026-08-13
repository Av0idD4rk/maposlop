from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from events.city_data import CITY_SEEDS
from events.models import City, Event


class Command(BaseCommand):
    help = "Добавляет несколько демонстрационных CTF"

    def handle(self, *args, **options):
        now = timezone.now()
        cities = {}
        for seed in CITY_SEEDS:
            city, _ = City.objects.update_or_create(
                region_code=seed["region_code"],
                name=seed["name"],
                defaults={key: value for key, value in seed.items() if key not in {"region_code", "name"}},
            )
            cities[city.name] = city
        samples = [
            ("Moscow Cyber Cup", "77", "Москва", 3, "Командный jeopardy CTF для начинающих и опытных игроков."),
            ("Moscow Junior CTF", "77", "Москва", 8, "Соревнование для школьных и студенческих команд."),
            ("Capital Defense CTF", "77", "Москва", 18, "Практический финал по защите сервисов и расследованию атак."),
            ("Ural CTF", "66", "Екатеринбург", 12, "Очные соревнования по веб-безопасности, реверсу и криптографии."),
            ("Siberia Attack & Defense", "54", "Новосибирск", 28, "Классический командный Attack & Defense с финалом на площадке."),
        ]
        history = [
            ("Moscow Winter CTF", "Москва", 18), ("Moscow Spring CTF", "Москва", 48),
            ("Moscow Student CTF", "Москва", 93), ("Moscow Cyber Range", "Москва", 182),
            ("Kazan Security Cup", "Казань", 35), ("Volga CTF Classic", "Казань", 150),
            ("Piter Cyber Fest", "Санкт-Петербург", 24), ("Neva CTF", "Санкт-Петербург", 205),
            ("Tomsk School CTF", "Томск", 70), ("Siberian CTF Archive", "Новосибирск", 310),
            ("Far East CTF", "Владивосток", 120), ("Ural Security Games", "Екатеринбург", 520),
        ]
        created = 0
        for title, region, city, days, description in samples:
            event, was_created = Event.objects.get_or_create(
                title=title,
                defaults={
                    "region_code": region,
                    "city": city,
                    "city_ref": cities[city],
                    "starts_at": now + timedelta(days=days),
                    "ends_at": now + timedelta(days=days, hours=8),
                    "description": description,
                    "format": Event.Format.OFFLINE,
                    "published": True,
                },
            )
            if event.city_ref_id != cities[city].pk or event.region_code != cities[city].region_code:
                event.city_ref = cities[city]
                event.save(update_fields=("city_ref", "city", "region_code", "region_label"))
            created += int(was_created)
        for title, city, days_ago in history:
            start = now - timedelta(days=days_ago)
            event, was_created = Event.objects.get_or_create(
                title=title,
                defaults={
                    "region_code": cities[city].region_code, "city_ref": cities[city],
                    "starts_at": start, "ends_at": start + timedelta(hours=8),
                    "description": "Историческое демонстрационное событие для температурной карты.",
                    "format": Event.Format.OFFLINE, "published": True,
                },
            )
            if event.city_ref_id != cities[city].pk:
                event.city_ref = cities[city]
                event.save(update_fields=("city_ref", "city", "region_code", "region_label"))
            created += int(was_created)
        self.stdout.write(self.style.SUCCESS(f"Добавлено демонстрационных событий: {created}"))
