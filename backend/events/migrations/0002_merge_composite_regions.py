from django.db import migrations


ALIASES = {"92": "91", "77": "50", "78": "47"}
NAMES = {
    "91": "Республика Крым и Севастополь",
    "50": "Москва и Московская область",
    "47": "Санкт-Петербург и Ленинградская область",
}


def merge_regions(apps, schema_editor):
    for model_name in ("Event", "EventSubmission"):
        model = apps.get_model("events", model_name)
        for old_code, new_code in ALIASES.items():
            model.objects.filter(region_code=old_code).update(
                region_code=new_code,
                region_label=NAMES[new_code],
            )
        for code, name in NAMES.items():
            model.objects.filter(region_code=code).update(region_label=name)


class Migration(migrations.Migration):
    dependencies = [("events", "0001_initial")]
    operations = [migrations.RunPython(merge_regions, migrations.RunPython.noop)]
