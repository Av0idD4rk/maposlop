import json
from datetime import timedelta
from decimal import Decimal
from unittest.mock import patch
from urllib.error import URLError

from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.db import connection
from django.db.migrations.executor import MigrationExecutor
from django.test import Client, TestCase, TransactionTestCase, override_settings
from django.urls import reverse
from django.utils import timezone

from .forms import EventAdminForm
from .geocoding import GeocodedCity, GeocodingError, geocode_city
from .models import City, Event, EventSubmission
from .regions import administrative_region_choices, region_iso_codes


class PublicApiTests(TestCase):
    def setUp(self):
        cache.clear()
        now = timezone.now()
        self.event = Event.objects.create(
            title="Test CTF", region_code="77", starts_at=now + timedelta(days=2),
            ends_at=now + timedelta(days=2, hours=8), description="Test", published=True,
        )

    def test_events_api_returns_upcoming_published_event(self):
        response = self.client.get(reverse("events-api"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["events"][0]["regionCode"], "77")
        self.assertEqual(response.json()["events"][0]["regionName"], "Москва и Московская область")

    def test_versioned_events_api_keeps_the_same_contract(self):
        legacy = self.client.get(reverse("events-api"))
        versioned = self.client.get(reverse("events-v1:events-api"))

        self.assertEqual(versioned.status_code, 200)
        self.assertEqual(versioned.json()["events"], legacy.json()["events"])
        self.assertEqual(versioned.json()["pagination"], legacy.json()["pagination"])

    def test_events_api_region_filter_includes_composite_members(self):
        response = self.client.get(reverse("events-api"), {"region": "50"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual([item["id"] for item in response.json()["events"]], [self.event.id])

    def test_events_api_has_bounded_pagination(self):
        now = timezone.now()
        for index in range(3):
            Event.objects.create(
                title=f"Page CTF {index}", region_code="54",
                starts_at=now + timedelta(days=3 + index),
                ends_at=now + timedelta(days=3 + index, hours=8),
                description="Test", published=True,
            )

        response = self.client.get(reverse("events-api"), {"page": 2, "limit": 2})

        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.json()["events"]), 2)
        self.assertEqual(response.json()["pagination"], {
            "page": 2, "limit": 2, "total": 4, "pages": 2,
        })

    def test_events_api_rejects_invalid_pagination(self):
        self.assertEqual(
            self.client.get(reverse("events-api"), {"limit": 201}).status_code,
            400,
        )
        self.assertEqual(
            self.client.get(reverse("events-api"), {"page": "not-a-number"}).status_code,
            400,
        )

    def test_submission_is_saved_for_moderation(self):
        start = timezone.now() + timedelta(days=4)
        response = self.client.post(reverse("submissions-api"), data=json.dumps({
            "title": "Proposed CTF", "regionCode": "54", "startsAt": start.isoformat(),
            "details": "Details", "contactName": "Tester", "contactEmail": "test@example.com",
        }), content_type="application/json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(EventSubmission.objects.get().status, EventSubmission.Status.NEW)

    def test_invalid_region_is_rejected(self):
        response = self.client.post(reverse("submissions-api"), data=json.dumps({
            "title": "Bad", "regionCode": "XXX", "startsAt": timezone.now().isoformat(),
            "details": "Details", "contactName": "Tester", "contactEmail": "test@example.com",
        }), content_type="application/json")
        self.assertEqual(response.status_code, 400)

    def test_browser_favicon_request_is_redirected_to_built_asset(self):
        response = self.client.get(reverse("favicon"))
        self.assertEqual(response.status_code, 301)
        self.assertEqual(response.headers["Location"], "/static/dist/favicon.svg")


class SubmissionSecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.payload = {
            "title": "Proposed CTF",
            "regionCode": "54",
            "city": "Новосибирск",
            "startsAt": (timezone.now() + timedelta(days=4)).isoformat(),
            "details": "Details",
            "contactName": "Tester",
            "contactEmail": "test@example.com",
        }

    def post(self, payload=None, **extra):
        return self.client.post(
            reverse("submissions-api"),
            data=json.dumps(payload or self.payload),
            content_type="application/json",
            **extra,
        )

    def test_submission_requires_json_content_type(self):
        response = self.client.post(
            reverse("submissions-api"),
            data="title=CTF",
            content_type="text/plain",
        )

        self.assertEqual(response.status_code, 415)
        self.assertEqual(EventSubmission.objects.count(), 0)

    def test_submission_rejects_non_string_text_field_without_server_error(self):
        response = self.post({**self.payload, "title": {"unexpected": "object"}})

        self.assertEqual(response.status_code, 400)
        self.assertEqual(EventSubmission.objects.count(), 0)
        self.assertIn("title", response.json()["errors"]["form"][0])

    @override_settings(SUBMISSION_MAX_BODY_BYTES=128)
    def test_submission_rejects_oversized_body(self):
        response = self.post({**self.payload, "details": "x" * 512})

        self.assertEqual(response.status_code, 413)
        self.assertEqual(EventSubmission.objects.count(), 0)

    def test_honeypot_returns_success_without_saving_spam(self):
        response = self.post({**self.payload, "company": "Spam Corp"})

        self.assertEqual(response.status_code, 201)
        self.assertEqual(EventSubmission.objects.count(), 0)

    @override_settings(SUBMISSION_RATE_LIMIT=2, SUBMISSION_RATE_WINDOW=900)
    def test_submission_rate_limit_returns_retry_after(self):
        address = {"REMOTE_ADDR": "203.0.113.10"}
        self.assertEqual(self.post(**address).status_code, 201)
        self.payload["title"] = "Second CTF"
        self.assertEqual(self.post(**address).status_code, 201)
        self.payload["title"] = "Third CTF"

        response = self.post(**address)

        self.assertEqual(response.status_code, 429)
        self.assertEqual(response.headers["Retry-After"], "900")
        self.assertEqual(EventSubmission.objects.count(), 2)

    @patch("events.views.cache.add", side_effect=RuntimeError("cache unavailable"))
    def test_submission_fails_closed_when_rate_limit_cache_is_unavailable(self, mock_add):
        response = self.post()

        self.assertEqual(response.status_code, 503)
        self.assertEqual(EventSubmission.objects.count(), 0)
        mock_add.assert_called_once()

    def test_submission_endpoint_enforces_csrf(self):
        csrf_client = Client(enforce_csrf_checks=True)
        endpoint = reverse("events-v1:submissions-api")

        rejected = csrf_client.post(
            endpoint,
            data=json.dumps(self.payload),
            content_type="application/json",
        )
        self.assertEqual(rejected.status_code, 403)

        csrf_client.get(reverse("index"))
        token = csrf_client.cookies["csrftoken"].value
        accepted = csrf_client.post(
            endpoint,
            data=json.dumps(self.payload),
            content_type="application/json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(accepted.status_code, 201)
        self.assertEqual(EventSubmission.objects.count(), 1)

    def test_health_and_readiness_endpoints(self):
        health = self.client.get(reverse("health"))
        readiness = self.client.get(reverse("readiness"))

        self.assertEqual(health.status_code, 200)
        self.assertEqual(health.json(), {"status": "ok"})
        self.assertEqual(readiness.status_code, 200)
        self.assertEqual(readiness.json(), {"status": "ready"})

    @patch("events.views.cache.set", side_effect=RuntimeError("cache unavailable"))
    def test_readiness_reports_unavailable_dependency(self, mock_set):
        response = self.client.get(reverse("readiness"))

        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})
        mock_set.assert_called_once()


class CityLocationTests(TestCase):
    def event_data(self, **overrides):
        start = timezone.now() + timedelta(days=5)
        data = {
            "title": "Far East CTF",
            "region_code": "27",
            "city_name": "Хабаровск",
            "venue": "Технопарк",
            "starts_at": start.isoformat(),
            "ends_at": (start + timedelta(hours=8)).isoformat(),
            "format": Event.Format.OFFLINE,
            "description": "Test event",
            "website": "",
            "organizer": "",
            "published": True,
        }
        data.update(overrides)
        return data

    @patch("events.forms.geocode_city")
    def test_offline_event_requires_city_before_geocoding(self, mock_geocode):
        form = EventAdminForm(data=self.event_data(city_name=""))

        self.assertFalse(form.is_valid())
        self.assertIn("city_name", form.errors)
        self.assertIn("укажите город", form.errors["city_name"][0])
        mock_geocode.assert_not_called()

    @patch("events.forms.geocode_city")
    def test_admin_form_resolves_arbitrary_city_automatically(self, mock_geocode):
        mock_geocode.return_value = GeocodedCity(
            name="Хабаровск", region_code="27",
            latitude=Decimal("48.481257"), longitude=Decimal("135.076297"),
            source="OpenStreetMap contributors / Nominatim",
            source_url="https://www.openstreetmap.org/relation/2049848",
        )
        form = EventAdminForm(data=self.event_data())
        self.assertTrue(form.is_valid(), form.errors.as_json())
        event = form.save()

        self.assertEqual(event.region_code, "27")
        self.assertEqual(event.city, "Хабаровск")
        self.assertEqual(event.city_ref.longitude, Decimal("135.076297"))
        mock_geocode.assert_called_once_with("Хабаровск", "27")

        payload = self.client.get(reverse("events-api")).json()["events"][0]
        self.assertEqual(payload["locationPrecision"], "city")
        self.assertEqual(payload["latitude"], 48.481257)
        self.assertNotIn("mapX", payload)

    @patch("events.forms.geocode_city")
    def test_saved_city_is_reused_without_another_request(self, mock_geocode):
        City.objects.create(
            name="Кемерово", region_code="42",
            latitude="55.355091", longitude="86.087121",
            geodata_source="OpenStreetMap contributors / Nominatim",
            source_url="https://www.openstreetmap.org/relation/1312868",
            location_verified=True,
        )
        form = EventAdminForm(data=self.event_data(
            region_code="42", city_name="Кемерово", title="Kuzbass CTF",
        ))
        self.assertTrue(form.is_valid(), form.errors.as_json())
        form.save()
        mock_geocode.assert_not_called()

    @patch("events.forms.geocode_city")
    def test_existing_event_can_move_to_a_city_in_another_region(self, mock_geocode):
        moscow = City.objects.get(name="Москва", region_code="77")
        start = timezone.now() + timedelta(days=5)
        event = Event.objects.create(
            title="Moving CTF", region_code="77", city_ref=moscow,
            starts_at=start, ends_at=start + timedelta(hours=8), description="Test",
        )
        mock_geocode.return_value = GeocodedCity(
            name="Кемерово", region_code="42",
            latitude=Decimal("55.355091"), longitude=Decimal("86.087121"),
            source="OpenStreetMap contributors / Nominatim",
            source_url="https://www.openstreetmap.org/relation/1312868",
        )
        form = EventAdminForm(data=self.event_data(
            title=event.title, region_code="42", city_name="Кемерово",
        ), instance=event)
        self.assertTrue(form.is_valid(), form.errors.as_json())
        updated = form.save()
        self.assertEqual(updated.region_code, "42")
        self.assertEqual(updated.city, "Кемерово")

    def test_existing_event_can_be_changed_to_online_without_a_city(self):
        city = City.objects.get(name="Москва", region_code="77")
        start = timezone.now() + timedelta(days=5)
        event = Event.objects.create(
            title="Online later", region_code="77", city_ref=city,
            starts_at=start, ends_at=start + timedelta(hours=8), description="Test",
        )
        form = EventAdminForm(data=self.event_data(
            title=event.title, region_code="42", city_name="", format=Event.Format.ONLINE,
        ), instance=event)
        self.assertTrue(form.is_valid(), form.errors.as_json())
        updated = form.save()
        self.assertIsNone(updated.city_ref)
        self.assertEqual(updated.city, "")

    def test_detailed_map_contains_example_regions_and_iso_codes(self):
        choices = dict(administrative_region_choices())
        self.assertEqual(choices["27"], "Хабаровский край")
        self.assertEqual(choices["42"], "Кемеровская область - Кузбасс")
        self.assertEqual(region_iso_codes("50"), {"RU-MOS", "RU-MOW"})

    @patch("events.geocoding.urlopen")
    def test_geocoder_accepts_a_non_seeded_city_in_selected_region(self, mock_urlopen):
        payload = json.dumps([None, {
            "lat": "48.481257", "lon": "135.076297",
            "osm_type": "relation", "osm_id": 2049848,
            "namedetails": {"name:ru": "Хабаровск"},
            "address": {"city": "Хабаровск", "ISO3166-2-lvl4": "RU-KHA"},
        }]).encode()

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self, size):
                return payload

        mock_urlopen.return_value = Response()
        city = geocode_city("Хабаровск", "27")
        self.assertEqual(city.region_code, "27")
        self.assertEqual(city.latitude, Decimal("48.481257"))

    @patch("events.geocoding.urlopen")
    def test_geocoder_rejects_city_from_another_selected_region(self, mock_urlopen):
        payload = json.dumps([{
            "lat": "55.355091", "lon": "86.087121",
            "osm_type": "relation", "osm_id": 1312868,
            "namedetails": {"name:ru": "Кемерово"},
            "address": {"city": "Кемерово", "ISO3166-2-lvl4": "RU-KEM"},
        }]).encode()

        class Response:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self, size):
                return payload

        mock_urlopen.return_value = Response()
        with self.assertRaisesMessage(GeocodingError, "Город не найден в выбранном субъекте"):
            geocode_city("Кемерово", "27")

    @patch("events.geocoding.time.sleep")
    @patch("events.geocoding.urlopen", side_effect=URLError("offline"))
    def test_geocoder_network_failure_has_bounded_retry(self, mock_urlopen, mock_sleep):
        with self.assertRaisesMessage(GeocodingError, "Проверьте интернет"):
            geocode_city("Новый город", "27")

        self.assertEqual(mock_urlopen.call_count, 2)
        self.assertGreaterEqual(mock_sleep.call_count, 1)


class CityMigrationTests(TransactionTestCase):
    migrate_from = ("events", "0002_merge_composite_regions")
    migrate_to = ("events", "0003_alter_event_city_city_event_city_ref")

    def test_existing_demo_city_is_normalized_without_losing_event(self):
        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_from])
        old_apps = executor.loader.project_state([self.migrate_from]).apps
        OldEvent = old_apps.get_model("events", "Event")
        start = timezone.now() + timedelta(days=2)
        event = OldEvent.objects.create(
            title="Existing Moscow CTF", region_code="50",
            region_label="Москва и Московская область", city="Москва",
            starts_at=start, ends_at=start + timedelta(hours=8),
            format="offline", description="Existing data", published=True,
        )

        executor = MigrationExecutor(connection)
        executor.migrate([self.migrate_to])
        new_apps = executor.loader.project_state([self.migrate_to]).apps
        MigratedEvent = new_apps.get_model("events", "Event")
        migrated = MigratedEvent.objects.get(pk=event.pk)
        self.assertEqual(migrated.region_code, "77")
        self.assertEqual(migrated.city_ref.name, "Москва")

    def tearDown(self):
        executor = MigrationExecutor(connection)
        executor.migrate(executor.loader.graph.leaf_nodes())
        super().tearDown()


class AdminUiTests(TestCase):
    def test_event_add_page_renders_only_simple_city_inputs(self):
        user = get_user_model().objects.create(
            username="admin-ui-test", is_staff=True, is_superuser=True,
        )
        user.set_unusable_password()
        user.save()
        self.client.force_login(user)
        response = self.client.get("/admin/events/event/add/")
        self.assertEqual(response.status_code, 200)
        html = response.content.decode()
        self.assertIn('name="city_name"', html)
        self.assertNotIn('name="latitude"', html)
        self.assertNotIn('name="longitude"', html)
        self.assertNotIn('name="city_ref"', html)
