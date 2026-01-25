from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name="UnidentifiedPerson",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("code_upr", models.CharField(max_length=20, unique=True)),
                ("profil_face", models.ImageField(upload_to="upr/face/")),
                ("profil_left", models.ImageField(upload_to="upr/left/", null=True, blank=True)),
                ("profil_right", models.ImageField(upload_to="upr/right/", null=True, blank=True)),
                ("landmarks_106", models.JSONField(null=True, blank=True)),
                ("face_embedding", models.JSONField(null=True, blank=True)),
                ("context_location", models.CharField(max_length=255, null=True, blank=True)),
                ("notes", models.TextField(null=True, blank=True)),
                ("discovered_date", models.DateTimeField(auto_now_add=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
            ],
        ),
        migrations.CreateModel(
            name="UPRMatchLog",
            fields=[
                ("id", models.BigAutoField(primary_key=True, serialize=False)),
                ("distance", models.FloatField()),
                ("match_date", models.DateTimeField(auto_now_add=True)),
                ("upr_source", models.ForeignKey(on_delete=models.CASCADE, related_name="match_source", to="upr.UnidentifiedPerson")),
                ("upr_target", models.ForeignKey(on_delete=models.CASCADE, related_name="match_target", to="upr.UnidentifiedPerson")),
            ],
        ),
    ]

