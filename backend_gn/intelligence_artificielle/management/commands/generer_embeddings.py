"""
Commande Django pour générer les embeddings faciaux de tous les criminels
Usage: python manage.py generer_embeddings
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from criminel.models import CriminalFicheCriminelle
from intelligence_artificielle.utils.face_recognition_arcface import get_arcface_instance
import os


class Command(BaseCommand):
    help = 'Génère les embeddings faciaux pour tous les criminels ayant une photo'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Regénérer les embeddings même s\'ils existent déjà',
        )
        parser.add_argument(
            '--criminel-id',
            type=int,
            help='Générer l\'embedding pour un criminel spécifique',
        )

    def handle(self, *args, **options):
        force = options['force']
        criminel_id = options.get('criminel_id')
        
        # Initialiser ArcFace
        self.stdout.write(self.style.WARNING(' Initialisation du modèle ArcFace...'))
        try:
            arcface = get_arcface_instance()
            self.stdout.write(self.style.SUCCESS(' Modèle ArcFace initialisé'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f' Erreur d\'initialisation: {str(e)}'))
            return
        
        # Récupérer les criminels
        if criminel_id:
            criminels = CriminalFicheCriminelle.objects.filter(id=criminel_id)  # type: ignore
            if not criminels.exists():
                self.stdout.write(self.style.ERROR(f' Criminel {criminel_id} introuvable'))
                return
        else:
            # Tous les criminels avec photo
            criminels = CriminalFicheCriminelle.objects.filter(  # type: ignore
                photo__isnull=False
            ).exclude(photo='')
        
        total = criminels.count()
        self.stdout.write(self.style.WARNING(f'\n {total} criminel(s) à traiter\n'))
        
        success_count = 0
        error_count = 0
        skipped_count = 0
        
        for idx, criminel in enumerate(criminels, 1):
            # Afficher la progression
            self.stdout.write(f'[{idx}/{total}] Traitement: {criminel.nom_complet}...')
            
            # Vérifier si l'embedding existe déjà
            if criminel.embedding_facial and not force:
                self.stdout.write(self.style.WARNING(f'  ⏭  Embedding déjà existant (utilisez --force pour régénérer)'))
                skipped_count += 1
                continue
            
            # Vérifier que la photo existe sur le disque
            if not os.path.exists(criminel.photo.path):
                self.stdout.write(self.style.ERROR(f'   Photo introuvable: {criminel.photo.path}'))
                error_count += 1
                continue
            
            # Extraire l'embedding
            try:
                embedding = arcface.extract_embedding(criminel.photo.path)
                
                if embedding is None:
                    self.stdout.write(self.style.ERROR('   Aucun visage détecté'))
                    error_count += 1
                    continue
                
                # Enregistrer l'embedding
                criminel.embedding_facial = {
                    'embedding': embedding.tolist(),
                    'model': 'arcface-buffalo_l',
                    'dimensions': len(embedding),
                    'generated_by': 'management_command',
                    'generated_at': str(__import__('datetime').datetime.now())
                }
                criminel.save()
                
                self.stdout.write(self.style.SUCCESS(f'   Embedding généré ({len(embedding)} dimensions)'))
                success_count += 1
                
            except Exception as e:
                self.stdout.write(self.style.ERROR(f'   Erreur: {str(e)}'))
                error_count += 1
        
        # Résumé
        self.stdout.write('\n' + '='*60)
        self.stdout.write(self.style.SUCCESS(f'\n RÉSUMÉ:'))
        self.stdout.write(f'   Succès: {success_count}')
        self.stdout.write(f'   Erreurs: {error_count}')
        self.stdout.write(f'  ⏭  Ignorés: {skipped_count}')
        self.stdout.write(f'   Total: {total}')
        self.stdout.write('='*60 + '\n')
        
        if success_count > 0:
            self.stdout.write(self.style.SUCCESS(f' {success_count} embedding(s) généré(s) avec succès!'))

