"""
Commande Django pour synchroniser les rôles depuis ROLES_PREDEFINIS vers la base de données
"""
from django.core.management.base import BaseCommand
from utilisateur.models import Role, PermissionSGIC
from utilisateur.permissions import ROLES_PREDEFINIS


class Command(BaseCommand):
    help = 'Synchronise les rôles depuis ROLES_PREDEFINIS vers la base de données'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Synchronisation des rôles...'))
        
        # Mapping entre les anciens codes de permissions et les nouveaux codes
        PERMISSION_CODE_MAPPING = {
            # Fiches
            'fiches.view': 'fiches.consulter',
            'fiches.create': 'fiches.creer',
            'fiches.edit': 'fiches.modifier',
            'fiches.delete': 'fiches.supprimer',
            # Utilisateurs
            'users.view': 'utilisateurs.consulter',
            'users.create': 'utilisateurs.creer',
            'users.edit': 'utilisateurs.modifier',
            'users.delete': 'utilisateurs.supprimer',
            # Rôles
            'roles.view': 'roles.consulter',
            'roles.manage': 'roles.gerer',
            # Biométrie
            'biometrie.view': 'biometrie.consulter',
            'biometrie.add': 'biometrie.gerer',
            'biometrie.edit': 'biometrie.gerer',
            # IA
            'ia.view_results': 'ia.consulter',
            'ia.use_recognition': 'ia.utiliser',
            'ia.use_prediction': 'ia.utiliser',
            # Rapports
            'reports.view': 'rapports.consulter',
            'reports.create': 'rapports.creer',
            'reports.export': 'rapports.exporter',
            # Audit
            'audit.view': 'audit.consulter',
            'audit.view_own': 'audit.consulter',
            'audit.view_all': 'audit.consulter',
            'dashboard.view': 'fiches.consulter',  # Fallback vers fiches.consulter
            # Autres permissions qui n'ont pas de mapping direct
            'investigations.view': 'fiches.consulter',
            'investigations.create': 'fiches.creer',
            'investigations.edit': 'fiches.modifier',
            'investigations.close': 'fiches.modifier',
            'suspects.view': 'fiches.consulter',
            'suspects.create': 'fiches.creer',
            'suspects.edit': 'fiches.modifier',
            'evidence.view': 'fiches.consulter',
            'evidence.manage': 'fiches.modifier',
            'analytics.view': 'rapports.consulter',
            'notifications.view': 'fiches.consulter',
        }
        
        created_count = 0
        updated_count = 0
        
        for role_name, role_data in ROLES_PREDEFINIS.items():
            # Récupérer les codes de permissions depuis role_data
            old_permission_codes = role_data.get('permissions', [])
            
            # Mapper les anciens codes vers les nouveaux codes
            new_permission_codes = []
            for old_code in old_permission_codes:
                if old_code == '*':
                    all_permissions = PermissionSGIC.objects.all()
                    new_permission_codes.extend([p.code for p in all_permissions])
                # Si le code existe dans le mapping, utiliser le nouveau code
                elif old_code in PERMISSION_CODE_MAPPING:
                    new_permission_codes.append(PERMISSION_CODE_MAPPING[old_code])
                # Sinon, essayer de trouver directement dans la base
                elif PermissionSGIC.objects.filter(code=old_code).exists():
                    new_permission_codes.append(old_code)
            
            # Dédupliquer les codes
            new_permission_codes = list(set(new_permission_codes))
            
            # Trouver les objets PermissionSGIC correspondants
            permissions = PermissionSGIC.objects.filter(code__in=new_permission_codes)
            
            # Créer ou mettre à jour le rôle
            role, created = Role.objects.update_or_create(
                name=role_name,
                defaults={
                    'description': role_data.get('description', ''),
                    'is_active': role_data.get('estActif', True),
                }
            )
            
            # Assigner les permissions
            role.permissions.set(permissions)
            
            if created:
                created_count += 1
                self.stdout.write(
                    self.style.SUCCESS(f'✓ Créé: {role_name} ({permissions.count()} permissions)')
                )
            else:
                updated_count += 1
                self.stdout.write(
                    self.style.WARNING(f'↻ Mis à jour: {role_name} ({permissions.count()} permissions)')
                )
        
        total = Role.objects.count()
        self.stdout.write(self.style.SUCCESS(
            f'\n✅ Terminé! {created_count} rôles créés, {updated_count} mises à jour. '
            f'Total: {total} rôles dans la base de données.'
        ))

