"""
Script de vérification pour s'assurer que tous les champs nécessaires existent
et que les données sont bien sauvegardées dans la base de données.
"""
from django.core.management.base import BaseCommand
from criminel.models import CriminalFicheCriminelle


class Command(BaseCommand):
    help = 'Vérifie que tous les champs nécessaires existent et affiche les données d\'une fiche'

    def add_arguments(self, parser):
        parser.add_argument('fiche_id', type=int, help='ID de la fiche criminelle à vérifier')

    def handle(self, *args, **options):
        fiche_id = options['fiche_id']
        
        try:
            fiche = CriminalFicheCriminelle.objects.get(id=fiche_id)
            self.stdout.write(self.style.SUCCESS(f'\n=== FICHE CRIMINELLE ID: {fiche_id} ==='))
            self.stdout.write(f'Nom: {fiche.nom}')
            self.stdout.write(f'Prénom: {fiche.prenom}')
            self.stdout.write(f'Numéro fiche: {fiche.numero_fiche}\n')
            
            # Vérifier les champs COORDONNÉES
            self.stdout.write(self.style.WARNING('\n--- COORDONNÉES ---'))
            self.stdout.write(f'Adresse: {repr(fiche.adresse)}')
            self.stdout.write(f'Contact: {repr(fiche.contact)}')
            self.stdout.write(f'Profession: {repr(fiche.profession)}')
            self.stdout.write(f'Service militaire: {repr(fiche.service_militaire)}')
            
            # Vérifier les champs ADRESSE ET DÉPLACEMENTS
            self.stdout.write(self.style.WARNING('\n--- ADRESSE ET DÉPLACEMENTS ---'))
            self.stdout.write(f'Anciennes adresses: {repr(fiche.anciennes_adresses)}')
            self.stdout.write(f'Adresses secondaires: {repr(fiche.adresses_secondaires)}')
            self.stdout.write(f'Lieux visités fréquemment: {repr(fiche.lieux_visites_frequemment)}')
            self.stdout.write(f'Véhicules associés: {repr(fiche.vehicules_associes)}')
            self.stdout.write(f'Plaques immatriculation: {repr(fiche.plaques_immatriculation)}')
            self.stdout.write(f'Permis de conduire: {repr(fiche.permis_conduire)}')
            self.stdout.write(f'Trajets habituels: {repr(fiche.trajets_habituels)}')
            
            # Vérifier les champs INFORMATIONS PERSONNELLES / SOCIALES
            self.stdout.write(self.style.WARNING('\n--- INFORMATIONS PERSONNELLES / SOCIALES ---'))
            self.stdout.write(f'Statut matrimonial: {repr(fiche.statut_matrimonial)}')
            self.stdout.write(f'Spouse: {repr(fiche.spouse)}')
            self.stdout.write(f'Children: {repr(fiche.children)}')
            self.stdout.write(f'Personnes proches: {repr(fiche.personnes_proches)}')
            self.stdout.write(f'Dépendants: {repr(fiche.dependants)}')
            self.stdout.write(f'Facebook: {repr(fiche.facebook)}')
            self.stdout.write(f'Instagram: {repr(fiche.instagram)}')
            self.stdout.write(f'TikTok: {repr(fiche.tiktok)}')
            self.stdout.write(f'Twitter/X: {repr(fiche.twitter_x)}')
            self.stdout.write(f'WhatsApp: {repr(fiche.whatsapp)}')
            self.stdout.write(f'Telegram: {repr(fiche.telegram)}')
            self.stdout.write(f'Email: {repr(fiche.email)}')
            self.stdout.write(f'Autres réseaux: {repr(fiche.autres_reseaux)}')
            self.stdout.write(f'Fréquentations connues: {repr(fiche.frequentations_connues)}')
            self.stdout.write(f'Endroits fréquentés: {repr(fiche.endroits_frequentes)}')
            
            # Vérifier les champs INFORMATIONS PROFESSIONNELLES / FINANCIÈRES
            self.stdout.write(self.style.WARNING('\n--- INFORMATIONS PROFESSIONNELLES / FINANCIÈRES ---'))
            self.stdout.write(f'Emplois précédents: {repr(fiche.emplois_precedents)}')
            self.stdout.write(f'Sources de revenus: {repr(fiche.sources_revenus)}')
            self.stdout.write(f'Entreprises associées: {repr(fiche.entreprises_associees)}')
            self.stdout.write(f'Comptes bancaires: {repr(fiche.comptes_bancaires)}')
            self.stdout.write(f'Biens ou propriétés: {repr(fiche.biens_proprietes)}')
            self.stdout.write(f'Dettes importantes: {repr(fiche.dettes_importantes)}')
            self.stdout.write(f'Transactions suspectes: {repr(fiche.transactions_suspectes)}')
            
            # Vérifier les champs RÉSEAU RELATIONNEL
            self.stdout.write(self.style.WARNING('\n--- RÉSEAU RELATIONNEL ---'))
            self.stdout.write(f'Partenaire affectif: {repr(fiche.partenaire_affectif)}')
            self.stdout.write(f'Famille proche: {repr(fiche.famille_proche)}')
            self.stdout.write(f'Amis proches: {repr(fiche.amis_proches)}')
            self.stdout.write(f'Relations à risque: {repr(fiche.relations_risque)}')
            self.stdout.write(f'Suspects associés: {repr(fiche.suspects_associes)}')
            self.stdout.write(f'Membres réseau criminel: {repr(fiche.membres_reseau_criminel)}')
            self.stdout.write(f'Complices potentiels: {repr(fiche.complices_potentiels)}')
            self.stdout.write(f'Contacts récurrents: {repr(fiche.contacts_recurrents)}')
            
            self.stdout.write(self.style.SUCCESS('\n✓ Vérification terminée'))
            
        except CriminalFicheCriminelle.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'Fiche criminelle avec ID {fiche_id} n\'existe pas'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'Erreur: {e}'))

