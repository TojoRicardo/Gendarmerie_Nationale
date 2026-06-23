"""Génère les empreintes faciales ArcFace manquantes pour les UPR."""
from django.core.management.base import BaseCommand
from django.db.models import Q

from upr.models import UnidentifiedPerson
from upr.services.photo_verification import _get_or_create_upr_embedding


class Command(BaseCommand):
    help = 'Génère les face_embedding manquants pour les UPR (recherche par photo)'

    def add_arguments(self, parser):
        parser.add_argument('--force', action='store_true', help='Régénère même si embedding existe')

    def handle(self, *args, **options):
        force = options['force']
        qs = UnidentifiedPerson.objects.filter(is_archived=False).exclude(profil_face='').exclude(profil_face='1')
        if not force:
            qs = qs.filter(Q(face_embedding__isnull=True) | Q(face_embedding=[]))

        total = qs.count()
        self.stdout.write(f'UPR à traiter: {total}')
        ok = err = 0
        for upr in qs:
            if not upr.profil_face:
                err += 1
                self.stdout.write(self.style.WARNING(f'  UPR #{upr.id} — pas de photo'))
                continue
            if not force and upr.face_embedding:
                continue
            emb = _get_or_create_upr_embedding(upr, save=True)
            if emb is not None:
                ok += 1
                self.stdout.write(self.style.SUCCESS(f'  [OK] {upr.code_upr} (id={upr.id})'))
            else:
                err += 1
                self.stdout.write(self.style.ERROR(
                    f'  [ERREUR] {upr.code_upr} — visage non détecté (photo trop petite ou floue ?)'
                ))
        self.stdout.write(self.style.SUCCESS(f'Terminé: {ok} indexé(s), {err} échec(s)'))
