import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("intelligence_artificielle", "0003_iapattern_iacorrelation"),
        ("criminel", "0011_add_is_archived_field"),
    ]

    operations = [
        migrations.CreateModel(
            name="IAFaceEmbedding",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("embedding_vector", models.JSONField(help_text="Embedding facial normalisé (liste de 512 floats)", verbose_name="Vecteur d'encodage")),
                ("source_type", models.CharField(choices=[("photo", "Photo uploadée"), ("video", "Flux vidéo")], default="photo", max_length=20, verbose_name="Source de capture")),
                ("image_capture", models.ImageField(blank=True, null=True, upload_to="ia/embeddings/", verbose_name="Image associée")),
                ("metadata", models.JSONField(blank=True, default=dict, verbose_name="Métadonnées annexes")),
                ("actif", models.BooleanField(default=True, verbose_name="Actif")),
                ("cree_le", models.DateTimeField(auto_now_add=True, verbose_name="Date de création")),
                ("mis_a_jour_le", models.DateTimeField(auto_now=True, verbose_name="Dernière mise à jour")),
                (
                    "criminel",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="ia_face_embeddings",
                        to="criminel.criminalfichecriminelle",
                        verbose_name="Criminel",
                    ),
                ),
            ],
            options={
                "db_table": "ia_face_embedding",
                "ordering": ["-cree_le"],
                "verbose_name": "Encodage facial IA",
                "verbose_name_plural": "Encodages faciaux IA",
            },
        ),
        migrations.AddIndex(
            model_name="iafaceembedding",
            index=models.Index(fields=["criminel", "-cree_le"], name="ia_face_emb_crimine_17dc0d_idx"),
        ),
        migrations.AddIndex(
            model_name="iafaceembedding",
            index=models.Index(fields=["source_type"], name="ia_face_emb_source__0b1ab7_idx"),
        ),
    ]

