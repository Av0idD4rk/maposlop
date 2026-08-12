from django import forms

from .models import Event, EventSubmission
from .regions import region_choices


class RegionChoiceMixin:
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.fields["region_code"] = forms.ChoiceField(label="Регион", choices=region_choices())


class EventAdminForm(RegionChoiceMixin, forms.ModelForm):
    class Meta:
        model = Event
        fields = "__all__"


class SubmissionAdminForm(RegionChoiceMixin, forms.ModelForm):
    class Meta:
        model = EventSubmission
        fields = "__all__"
