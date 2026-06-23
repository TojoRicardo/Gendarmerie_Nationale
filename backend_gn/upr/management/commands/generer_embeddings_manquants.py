"""
Commande pour générer automatiquement les embeddings manquants pour les photos criminelles.
Cette commande permet de générer les embeddings ArcFace 512D pour toutes les photos
qui n'en ont pas encore, afin qu'elles puissent être trouvées lors de la recherche par visage.
"""
from django.core.management.base import BaseCommand
from django.db.models import Q
from biometrie.models import BiometriePhoto
from biometrie.pipeline import enrollement_pipeline, save_enrollement_to_biometrie_photo
import logging
import time

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Génère les embeddings manquants pour les photos criminelles'

    def add_arguments(self, parser):
        parser.add_argument(
            '--force',
            action='store_true',
            help='Régénère les embeddings même s\'ils existent déjà',
        )
        parser.add_argument(
            '--limit',
            type=int,
            default=None,
            help='Limite le nombre de photos à traiter',
        )
        parser.add_argument(
            '--type',
            type=str,
            choices=['biometrie', 'ia', 'all'],
            default='all',
            help='Type d\'embeddings à générer: biometrie, ia, ou all (défaut: all)',
        )

    def handle(self, *args, **options):
        force = options['force']
        limit = options['limit']
        type_gen = options['type']
        
        self.stdout.write(self.style.SUCCESS('\n=== GÉNÉRATION DES EMBEDDINGS MANQUANTS ===\n'))
        
        total_traitees = 0
        total_succes = 0
        total_erreurs = 0
        total_ignorees = 0
        
        start_time = time.time()
        
        # 1. Générer les embeddings pour BiometriePhoto
        if type_gen in ['biometrie', 'all']:
            self.stdout.write(self.style.WARNING('\n Traitement des BiometriePhoto...\n'))
            
            photos_query = BiometriePhoto.objects.filter(est_active=True)
            
            if not force:
                # Seulement les photos sans embedding
                photos_query = photos_query.filter(
                    Q(embedding_512__isnull=True) | Q(embedding_512=None)
                )
            
            photos = photos_query.select_related('criminel')
            
            if limit:
                photos = photos[:limit]
            
            total_photos = photos.count()
            self.stdout.write(f'   Photos à traiter: {total_photos}')
            
            for idx, photo in enumerate(photos, 1):
                try:
                    # Vérifier si l'embedding existe déjà (sauf si --force)
                    if not force and photo.embedding_512:
                        self.stdout.write(
                            f'   [{idx}/{total_photos}]   Photo #{photo.id} - Embedding déjà existant'
                        )
                        total_ignorees += 1
                        continue
                    
                    # Vérifier que l'image existe
                    if not photo.image or not photo.image.name:
                        self.stdout.write(
                            self.style.ERROR(f'   [{idx}/{total_photos}] [ERREUR] Photo #{photo.id} - Image manquante')
                        )
                        total_erreurs += 1
                        continue
                    
                    self.stdout.write(
                        f'   [{idx}/{total_photos}]  Photo #{photo.id} - {photo.criminel.nom or "Sans nom"}...'
                    )
                    
                    # Utiliser le pipeline d'enrôlement pour générer l'embedding
                    try:
                        pipeline_result = enrollement_pipeline(photo.image)
                        
                        if pipeline_result.get("success", False):
                            # Sauvegarder l'embedding
                            save_enrollement_to_biometrie_photo(
                                photo=photo,
                                pipeline_result=pipeline_result,
                                save_all=True
                            )
                            
                            embedding_dim = len(pipeline_result.get("embedding512", []))
                            self.stdout.write(
                                self.style.SUCCESS(
                                    f'      [OK] Embedding généré ({embedding_dim} dimensions)'
                                )
                            )
                            total_succes += 1
                        else:
                            error_msg = pipeline_result.get("error", "Erreur inconnue")
                            self.stdout.write(
                                self.style.ERROR(f'      [ERREUR] Échec: {error_msg}')
                            )
                            total_erreurs += 1
                            
                    except Exception as e:
                        logger.error(f"Erreur lors de la génération de l'embedding pour photo #{photo.id}: {e}", exc_info=True)
                        self.stdout.write(
                            self.style.ERROR(f'      [ERREUR] Erreur: {str(e)}')
                        )
                        total_erreurs += 1
                    
                    total_traitees += 1
                    
                except Exception as e:
                    logger.error(f"Erreur lors du traitement de la photo #{photo.id}: {e}", exc_info=True)
                    self.stdout.write(
                        self.style.ERROR(f'   [{idx}/{total_photos}] [ERREUR] Erreur: {str(e)}')
                    )
                    total_erreurs += 1
                    total_traitees += 1
        
        # 2. Générer les embeddings pour IAFaceEmbedding (si nécessaire)
        if type_gen in ['ia', 'all']:
            self.stdout.write(self.style.WARNING('\n Traitement des IAFaceEmbedding...\n'))
            self.stdout.write('   Note: IAFaceEmbedding nécessite une logique spécifique.')
            self.stdout.write('   Pour l\'instant, utilisez l\'API ou l\'interface pour générer ces embeddings.\n')
        
        # Résumé
        elapsed_time = time.time() - start_time
        
        self.stdout.write(self.style.SUCCESS('\n' + '='*60))
        self.stdout.write(self.style.SUCCESS(' RÉSUMÉ:\n'))
        self.stdout.write(f'     Temps écoulé: {elapsed_time:.2f} secondes')
        self.stdout.write(f'    Photos traitées: {total_traitees}')
        self.stdout.write(f'   [OK] Succès: {total_succes}')
        self.stdout.write(f'     Ignorées (déjà existantes): {total_ignorees}')
        self.stdout.write(f'   [ERREUR] Erreurs: {total_erreurs}')
        
        if total_succes > 0:
            self.stdout.write(
                self.style.SUCCESS(
                    f'\n[OK] {total_succes} embedding(s) généré(s) avec succès!'
                )
            )
            self.stdout.write('   → Les fiches criminelles peuvent maintenant être trouvées par visage.')
        
        if total_erreurs > 0:
            self.stdout.write(
                self.style.WARNING(
                    f'\n[ATTENTION]  {total_erreurs} erreur(s) rencontrée(s).'
                )
            )
            self.stdout.write('   → Vérifiez les logs pour plus de détails.')
        
        self.stdout.write(self.style.SUCCESS('\n=== FIN DE LA GÉNÉRATION ===\n'))
