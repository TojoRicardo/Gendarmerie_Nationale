"""
Commande Django pour générer automatiquement toutes les permissions SGIC
"""
from django.core.management.base import BaseCommand
from utilisateur.models import PermissionSGIC


class Command(BaseCommand):
    help = 'Génère automatiquement toutes les permissions SGIC dans la base de données'

    # Définition de toutes les permissions
    PERMISSIONS = [
        # Fiches
        {'code': 'fiches.consulter', 'label': 'Consulter les fiches', 'category': 'Fiches'},
        {'code': 'fiches.creer', 'label': 'Créer des fiches', 'category': 'Fiches'},
        {'code': 'fiches.modifier', 'label': 'Modifier des fiches', 'category': 'Fiches'},
        {'code': 'fiches.supprimer', 'label': 'Supprimer des fiches', 'category': 'Fiches'},
        
        # Utilisateurs
        {'code': 'utilisateurs.consulter', 'label': 'Consulter les utilisateurs', 'category': 'Utilisateurs'},
        {'code': 'utilisateurs.creer', 'label': 'Créer des utilisateurs', 'category': 'Utilisateurs'},
        {'code': 'utilisateurs.modifier', 'label': 'Modifier des utilisateurs', 'category': 'Utilisateurs'},
        {'code': 'utilisateurs.supprimer', 'label': 'Supprimer des utilisateurs', 'category': 'Utilisateurs'},
        
        # Rôles
        {'code': 'roles.consulter', 'label': 'Consulter les rôles', 'category': 'Rôles'},
        {'code': 'roles.gerer', 'label': 'Gérer les rôles', 'category': 'Rôles'},
        
        # Biométrie
        {'code': 'biometrie.consulter', 'label': 'Consulter la biométrie', 'category': 'Biométrie'},
        {'code': 'biometrie.gerer', 'label': 'Gérer la biométrie', 'category': 'Biométrie'},
        
        # IA
        {'code': 'ia.consulter', 'label': 'Consulter l\'IA', 'category': 'IA'},
        {'code': 'ia.utiliser', 'label': 'Utiliser l\'IA', 'category': 'IA'},
        
        # Rapports
        {'code': 'rapports.consulter', 'label': 'Consulter les rapports', 'category': 'Rapports'},
        {'code': 'rapports.creer', 'label': 'Créer des rapports', 'category': 'Rapports'},
        {'code': 'rapports.exporter', 'label': 'Exporter des rapports', 'category': 'Rapports'},
        
        # Audit
        {'code': 'audit.consulter', 'label': 'Consulter l\'audit', 'category': 'Audit'},
    ]

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Génération des permissions SGIC...'))
        
        created_count = 0
        updated_count = 0
        
        for perm_data in self.PERMISSIONS:
            permission, created = PermissionSGIC.objects.update_or_create(
                code=perm_data['code'],
                defaults={
                    'label': perm_data['label'],
                    'category': perm_data['category'],
                }
            )
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Créée: {permission.code}')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Mise à jour: {permission.code}')
                )
        
        total = PermissionSGIC.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Terminé! {created_count} permissions créées, {updated_count} mises à jour. '
            f'Total: {total} permissions dans la base de données.'
        ))

