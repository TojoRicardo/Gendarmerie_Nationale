"""
Commande de diagnostic pour identifier pourquoi les fiches criminelles ne sont pas trouvées
lors de la recherche par visage dans UPR.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q, Count
from biometrie.models import BiometriePhoto
from intelligence_artificielle.models import IAFaceEmbedding
from criminel.models import CriminalFicheCriminelle
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Diagnostic pour identifier pourquoi les fiches criminelles ne sont pas trouvées par visage'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('\n=== DIAGNOSTIC RECHERCHE PAR VISAGE ===\n'))
        
        # 1. Vérifier le nombre total de fiches criminelles
        total_fiches = CriminalFicheCriminelle.objects.count()
        self.stdout.write(f'📊 Total de fiches criminelles: {total_fiches}')
        
        # 2. Vérifier les BiometriePhoto avec embeddings
        photos_avec_embedding = BiometriePhoto.objects.filter(
            est_active=True,
            embedding_512__isnull=False
        ).exclude(embedding_512=None)
        
        photos_actives_sans_embedding = BiometriePhoto.objects.filter(
            est_active=True
        ).filter(
            Q(embedding_512__isnull=True) | Q(embedding_512=None)
        )
        
        self.stdout.write(f'\n📸 BiometriePhoto:')
        self.stdout.write(f'   ✅ Photos actives AVEC embedding_512: {photos_avec_embedding.count()}')
        self.stdout.write(f'   ❌ Photos actives SANS embedding_512: {photos_actives_sans_embedding.count()}')
        
        # 3. Vérifier les IAFaceEmbedding
        ia_embeddings_actifs = IAFaceEmbedding.objects.filter(
            actif=True,
            embedding_vector__isnull=False
        ).exclude(embedding_vector=None)
        
        self.stdout.write(f'\n🤖 IAFaceEmbedding:')
        self.stdout.write(f'   ✅ Embeddings IA actifs: {ia_embeddings_actifs.count()}')
        
        # 4. Vérifier les fiches criminelles avec au moins une photo/embedding
        fiches_avec_photo = CriminalFicheCriminelle.objects.filter(
            photos_biometriques__est_active=True,
            photos_biometriques__embedding_512__isnull=False
        ).distinct()
        
        fiches_avec_ia = CriminalFicheCriminelle.objects.filter(
            ia_face_embeddings__actif=True,
            ia_face_embeddings__embedding_vector__isnull=False
        ).distinct()
        
        fiches_avec_au_moins_un = CriminalFicheCriminelle.objects.filter(
            Q(photos_biometriques__est_active=True, photos_biometriques__embedding_512__isnull=False) |
            Q(ia_face_embeddings__actif=True, ia_face_embeddings__embedding_vector__isnull=False)
        ).distinct()
        
        fiches_sans_embedding = total_fiches - fiches_avec_au_moins_un.count()
        
        self.stdout.write(f'\n📋 Fiches criminelles:')
        self.stdout.write(f'   ✅ Avec BiometriePhoto + embedding: {fiches_avec_photo.count()}')
        self.stdout.write(f'   ✅ Avec IAFaceEmbedding: {fiches_avec_ia.count()}')
        self.stdout.write(f'   ✅ Avec au moins un embedding: {fiches_avec_au_moins_un.count()}')
        self.stdout.write(f'   ❌ SANS embedding: {fiches_sans_embedding}')
        
        # 5. Vérifier la qualité des embeddings
        if photos_avec_embedding.exists():
            sample = photos_avec_embedding.first()
            if sample.embedding_512:
                embedding_len = len(sample.embedding_512) if isinstance(sample.embedding_512, list) else 0
                self.stdout.write(f'\n🔍 Qualité des embeddings:')
                self.stdout.write(f'   Dimension attendue: 512')
                self.stdout.write(f'   Dimension trouvée (exemple): {embedding_len}')
                
                if embedding_len != 512:
                    self.stdout.write(self.style.ERROR(
                        f'   ⚠️  PROBLÈME: Dimension incorrecte!'
                    ))
        
        # 6. Recommandations
        self.stdout.write(f'\n💡 RECOMMANDATIONS:\n')
        
        if photos_actives_sans_embedding.count() > 0:
            self.stdout.write(self.style.WARNING(
                f'   1. {photos_actives_sans_embedding.count()} photos actives n\'ont pas d\'embedding.'
            ))
            self.stdout.write('      → Générer les embeddings manquants avec:')
            self.stdout.write('        python manage.py generer_embeddings_manquants')
        
        if fiches_sans_embedding > 0:
            self.stdout.write(self.style.WARNING(
                f'   2. {fiches_sans_embedding} fiches criminelles n\'ont aucun embedding.'
            ))
            self.stdout.write('      → Ces fiches ne seront PAS trouvées lors de la recherche par visage.')
        
        if photos_avec_embedding.count() == 0 and ia_embeddings_actifs.count() == 0:
            self.stdout.write(self.style.ERROR(
                '   3. ⚠️  AUCUN embedding trouvé dans la base de données!'
            ))
            self.stdout.write('      → C\'est pourquoi aucune fiche n\'est trouvée.')
            self.stdout.write('      → Il faut générer les embeddings pour les photos existantes.')
        
        # 7. Vérifier le seuil de similarité
        self.stdout.write(f'\n⚙️  CONFIGURATION:')
        self.stdout.write(f'   Seuil de similarité utilisé: 0.35 (35%)')
        self.stdout.write(f'   → Les correspondances avec un score >= 0.35 seront retournées')
        
        self.stdout.write(self.style.SUCCESS('\n=== FIN DU DIAGNOSTIC ===\n'))
