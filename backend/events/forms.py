from django import forms

from .geocoding import GeocodedCity, GeocodingError, geocode_city
from .models import City, Event, EventSubmission
from .regions import administrative_region_choices, region_choices


class RegionChoiceMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["region_code"] = forms.ChoiceField(label="Регион", choices=region_choices())


class EventAdminForm(forms.ModelForm):
    city_name = forms.CharField(
        label="Город",
        max_length=120,
        required=False,
        help_text="Для очного или гибридного CTF координаты найдутся автоматически при сохранении.",
    )

    class Meta:
        model = Event
        exclude = ("city_ref",)

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["region_code"] = forms.ChoiceField(
            label="Субъект РФ",
            choices=administrative_region_choices(),
        )
        if self.instance.city_ref_id:
            self.initial["region_code"] = self.instance.city_ref.region_code
            self.initial["city_name"] = self.instance.city_ref.name
        elif self.instance.city:
            self.initial["city_name"] = self.instance.city
        self._resolved_city = None

    def clean(self):
        cleaned = super().clean()
        if self.errors:
            return cleaned
        city_name = cleaned.get("city_name", "").strip()
        region_code = cleaned.get("region_code", "")
        participation_mode = cleaned.get("format")
        if not city_name:
            if participation_mode != Event.Format.ONLINE:
                self.add_error("city_name", "Для очного или гибридного CTF укажите город.")
            else:
                self.instance.city_ref = None
            return cleaned
        existing = City.objects.filter(region_code=region_code, name__iexact=city_name).first()
        if existing and existing.location_verified:
            self._resolved_city = existing
            self.instance.city_ref = existing
            return cleaned
        try:
            self._resolved_city = geocode_city(city_name, region_code)
            self.instance.city_ref = None
        except GeocodingError as error:
            self.add_error("city_name", str(error))
        return cleaned

    def save(self, commit=True):
        event = super().save(commit=False)
        resolved = self._resolved_city
        if isinstance(resolved, GeocodedCity):
            city = City.objects.filter(
                region_code=resolved.region_code,
                name__iexact=resolved.name,
            ).first()
            if city is None:
                city = City(
                    name=resolved.name,
                    region_code=resolved.region_code,
                    latitude=resolved.latitude,
                    longitude=resolved.longitude,
                    geodata_source=resolved.source,
                    source_url=resolved.source_url,
                    location_verified=True,
                )
                city.full_clean()
                city.save()
            event.city_ref = city
        elif isinstance(resolved, City):
            event.city_ref = resolved
        elif event.format == Event.Format.ONLINE:
            event.city_ref = None
            event.city = ""
        if event.city_ref:
            event.region_code = event.city_ref.region_code
        if commit:
            event.save()
            self.save_m2m()
        return event


class SubmissionAdminForm(RegionChoiceMixin, forms.ModelForm):
    class Meta:
        model = EventSubmission
        fields = "__all__"
