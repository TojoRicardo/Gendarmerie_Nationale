"""
Commande de gestion pour créer les types d'enquête initiaux
Usage: python manage.py create_types_enquete
"""

from django.core.management.base import BaseCommand
from enquete.models import TypeEnquete


class Command(BaseCommand):
    help = 'Crée les types d\'enquête initiaux (Plainte, Dénonciation, Constatation directe)'

    def handle(self, *args, **options):
        types_enquete = [
            {
                'code': 'plainte',
                'libelle': 'Plainte',
                'description': 'Enquête initiée suite à une plainte déposée par une victime ou un tiers',
                'ordre': 1,
                'couleur': '#dc3545',  # Rouge
            },
            {
                'code': 'denonciation',
                'libelle': 'Dénonciation',
                'description': 'Enquête initiée suite à une dénonciation d\'un fait délictueux',
                'ordre': 2,
                'couleur': '#ffc107',  # Jaune/Orange
            },
            {
                'code': 'constatation_directe',
                'libelle': 'Constatation directe',
                'description': 'Enquête initiée suite à une constatation directe par les forces de l\'ordre',
                'ordre': 3,
                'couleur': '#28a745',  # Vert
            },
        ]
        
        created_count = 0
        updated_count = 0
        
        for type_data in types_enquete:
            type_enquete, created = TypeEnquete.objects.update_or_create(
                code=type_data['code'],
                defaults={
                    'libelle': type_data['libelle'],
                    'description': type_data['description'],
                    'ordre': type_data['ordre'],
                    'couleur': type_data['couleur'],
                    'actif': True,
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f'✓ Type d\'enquête créé: {type_enquete.libelle}'
                    )
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(
                        f'↻ Type d\'enquête mis à jour: {type_enquete.libelle}'
                    )
                )
        
        self.stdout.write(
            self.style.SUCCESS(
                f'\n✓ Terminé: {created_count} créé(s), {updated_count} mis à jour(s)'
            )
        )

