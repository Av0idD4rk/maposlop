import json
from datetime import timedelta

from django.test import TestCase
from django.urls import reverse
from django.utils import timezone

from .models import Event, EventSubmission


class PublicApiTests(TestCase):
    def setUp(self):
        now = timezone.now()
        self.event = Event.objects.create(
            title="Test CTF", region_code="77", starts_at=now + timedelta(days=2),
            ends_at=now + timedelta(days=2, hours=8), description="Test", published=True,
        )

    def test_events_api_returns_upcoming_published_event(self):
        response = self.client.get(reverse("events-api"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["events"][0]["regionCode"], "77")

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
