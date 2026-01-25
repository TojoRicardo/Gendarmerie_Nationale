"""
Commande de management pour initialiser les données de référence
Assure que les statuts de fiches nécessaires existent dans la base de données
"""
from django.core.management.base import BaseCommand
from criminel.models import RefStatutFiche, RefTypeInfraction, RefStatutAffaire


class Command(BaseCommand):
    help = 'Initialise les données de référence (statuts de fiches, types d\'infractions, etc.)'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Initialisation des données de référence...\n'))
        
        # Créer les statuts de fiches
        statuts_fiche = [
            {'code': 'en_cours', 'libelle': 'En cours', 'description': 'Fiche criminelle en cours d\'investigation', 'ordre': 1},
            {'code': 'en_attente', 'libelle': 'En attente', 'description': 'Fiche criminelle en attente de traitement', 'ordre': 2},
            {'code': 'cloture', 'libelle': 'Clôturée', 'description': 'Fiche criminelle clôturée', 'ordre': 3},
            {'code': 'archive', 'libelle': 'Archivée', 'description': 'Fiche criminelle archivée', 'ordre': 4},
        ]
        
        created_count = 0
        for statut_data in statuts_fiche:
            statut, created = RefStatutFiche.objects.get_or_create(
                code=statut_data['code'],
                defaults={
                    'libelle': statut_data['libelle'],
                    'description': statut_data['description'],
                    'actif': True,
                    'ordre': statut_data['ordre']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Statut de fiche créé : {statut.libelle} ({statut.code})'))
            else:
                self.stdout.write(self.style.NOTICE(f'  - Statut de fiche existe déjà : {statut.libelle} ({statut.code})'))
        
        # Créer les types d'infractions
        types_infraction = [
            {'code': 'vol', 'libelle': 'Vol', 'categorie': 'Délit contre les biens', 'description': 'Appropriation frauduleuse d\'un bien d\'autrui', 'ordre': 1},
            {'code': 'agression', 'libelle': 'Agression', 'categorie': 'Violence', 'description': 'Acte de violence physique contre une personne', 'ordre': 2},
            {'code': 'fraude', 'libelle': 'Fraude', 'categorie': 'Délit économique', 'description': 'Tromperie intentionnelle dans un but lucratif', 'ordre': 3},
            {'code': 'trafic_stupefiants', 'libelle': 'Trafic de stupéfiants', 'categorie': 'Crime organisé', 'description': 'Commerce illégal de substances interdites', 'ordre': 4},
            {'code': 'homicide', 'libelle': 'Homicide', 'categorie': 'Crime contre la personne', 'description': 'Meurtre ou assassinat d\'une personne', 'ordre': 5},
        ]
        
        for type_data in types_infraction:
            type_inf, created = RefTypeInfraction.objects.get_or_create(
                code=type_data['code'],
                defaults={
                    'libelle': type_data['libelle'],
                    'categorie': type_data['categorie'],
                    'description': type_data['description'],
                    'actif': True,
                    'ordre': type_data['ordre']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Type d\'infraction créé : {type_inf.libelle} ({type_inf.code})'))
            else:
                self.stdout.write(self.style.NOTICE(f'  - Type d\'infraction existe déjà : {type_inf.libelle} ({type_inf.code})'))
        
        # Créer les statuts d'affaires
        statuts_affaire = [
            {'code': 'en_cours', 'libelle': 'En cours d\'instruction', 'description': 'L\'affaire est actuellement en cours d\'instruction', 'ordre': 1, 'couleur': '#0066cc'},
            {'code': 'classee', 'libelle': 'Classée sans suite', 'description': 'L\'affaire a été classée sans suite', 'ordre': 2, 'couleur': '#6c757d'},
            {'code': 'jugee', 'libelle': 'Jugée', 'description': 'L\'affaire a été jugée', 'ordre': 3, 'couleur': '#28a745'},
        ]
        
        for statut_data in statuts_affaire:
            statut, created = RefStatutAffaire.objects.get_or_create(
                code=statut_data['code'],
                defaults={
                    'libelle': statut_data['libelle'],
                    'description': statut_data['description'],
                    'actif': True,
                    'ordre': statut_data['ordre'],
                    'couleur': statut_data['couleur']
                }
            )
            if created:
                created_count += 1
                self.stdout.write(self.style.SUCCESS(f'  ✓ Statut d\'affaire créé : {statut.libelle} ({statut.code})'))
            else:
                self.stdout.write(self.style.NOTICE(f'  - Statut d\'affaire existe déjà : {statut.libelle} ({statut.code})'))
        
        self.stdout.write(self.style.SUCCESS(f'\n✅ Initialisation terminée. {created_count} élément(s) créé(s).'))
        self.stdout.write(self.style.NOTICE('\nLes données de référence sont maintenant disponibles pour les statistiques.'))

