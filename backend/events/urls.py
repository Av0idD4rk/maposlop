from django.urls import path
from . import views

urlpatterns = [
    path("events/", views.events_api, name="events-api"),
    path("submissions/", views.submissions_api, name="submissions-api"),
]
