"""
Script de création de fiches criminelles de démonstration
"""
from django.core.management.base import BaseCommand
from criminel.models import (
    CriminalFicheCriminelle,
    RefStatutFiche,
    CriminalTypeInfraction,
    CriminalInfraction
)
from datetime import datetime, timedelta
import random


class Command(BaseCommand):
    help = 'Créer des fiches criminelles de démonstration'

    def add_arguments(self, parser):
        parser.add_argument(
            '--count',
            type=int,
            default=20,
            help='Nombre de fiches à créer (par défaut: 20)',
        )

    def handle(self, *args, **options):
        count = options['count']
        
        # Récupérer les statuts
        try:
            statut_en_cours = RefStatutFiche.objects.get(code='en_cours')
            statut_cloture = RefStatutFiche.objects.get(code='cloture')
            statut_en_attente = RefStatutFiche.objects.get(code='en_attente')
        except RefStatutFiche.DoesNotExist:
            self.stdout.write(self.style.ERROR('Les statuts de fiches n\'existent pas. Exécutez d\'abord: python manage.py loaddata criminel/fixtures/initial_data.json'))
            return

        # Récupérer les types d'infractions
        types_infractions = list(CriminalTypeInfraction.objects.all())
        if not types_infractions:
            self.stdout.write(self.style.WARNING('Aucun type d\'infraction trouvé. Création des types de base...'))
            # Créer quelques types d'infractions de base
            types_infractions = [
                CriminalTypeInfraction.objects.create(
                    code='vol',
                    libelle='Vol',
                    gravite=3
                ),
                CriminalTypeInfraction.objects.create(
                    code='agression',
                    libelle='Agression',
                    gravite=5
                ),
                CriminalTypeInfraction.objects.create(
                    code='fraude',
                    libelle='Fraude',
                    gravite=4
                ),
            ]

        # Données de test
        noms = ['Dupont', 'Martin', 'Bernard', 'Thomas', 'Robert', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 
                'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'David', 'Bertrand', 'Roux', 'Vincent', 'Fournier', 'Morel']
        prenoms = ['Jean', 'Pierre', 'Michel', 'André', 'Philippe', 'Alain', 'Jacques', 'François', 'Daniel', 'Patrick',
                   'Marie', 'Sophie', 'Julie', 'Claire', 'Isabelle', 'Nathalie', 'Catherine', 'Anne', 'Martine', 'Sylvie']
        # Les 6 provinces de Madagascar
        villes = ['Antananarivo', 'Fianarantsoa', 'Toamasina', 'Mahajanga', 'Toliara', 'Antsiranana']
        
        statuts = [statut_en_cours, statut_cloture, statut_en_attente]
        niveaux_danger = [1, 2, 3, 4, 5]  # 1=Faible, 2=Modéré, 3=Élevé, 4=Très Élevé, 5=Extrême
        sexes = ['H', 'F']

        # Déterminer le dernier numéro de fiche
        derniere_fiche = CriminalFicheCriminelle.objects.order_by('-id').first()
        dernier_numero = derniere_fiche.id if derniere_fiche else 0
        
        fiches_creees = 0
        
        for i in range(count):
            # Générer une date aléatoire dans les 60 derniers jours
            jours_arriere = random.randint(0, 60)
            date_creation = datetime.now() - timedelta(days=jours_arriere)
            
            # Sélectionner un statut avec une distribution réaliste
            # 60% en cours, 30% clôturé, 10% en attente
            rand = random.random()
            if rand < 0.6:
                statut = statut_en_cours
            elif rand < 0.9:
                statut = statut_cloture
            else:
                statut = statut_en_attente
            
            # Sélectionner un niveau de danger avec distribution
            rand = random.random()
            if rand < 0.4:
                niveau = 2  # Modéré
            elif rand < 0.7:
                niveau = 1  # Faible
            elif rand < 0.9:
                niveau = 3  # Élevé
            else:
                niveau = random.choice([4, 5])  # Très Élevé ou Extrême
            
            # Créer la fiche
            ville = random.choice(villes)
            fiche = CriminalFicheCriminelle.objects.create(
                numero_fiche=f"FC-{2025}-{1000 + dernier_numero + i + 1:04d}",
                nom=random.choice(noms),
                prenom=random.choice(prenoms),
                surnom=f"Surnom{i}" if random.random() > 0.5 else None,
                sexe=random.choice(sexes),
                date_naissance=datetime.now().date() - timedelta(days=random.randint(6570, 25550)),  # Entre 18 et 70 ans
                lieu_naissance=random.choice(villes),
                nationalite='Française',
                adresse=f"{random.randint(1, 200)} rue de la {random.choice(['Paix', 'République', 'Liberté', 'Justice'])}, {ville}",
                contact=f"0{random.randint(600000000, 799999999)}",
                profession=random.choice(['Employé', 'Commerçant', 'Sans emploi', 'Artisan', 'Cadre']),
                statut_fiche=statut,
                niveau_danger=niveau,
                motif_arrestation=f"Suspect dans une affaire de {random.choice(['vol', 'fraude', 'agression'])} à {ville}.",
                date_arrestation=datetime.now().date() - timedelta(days=random.randint(0, 365)),
                province=ville,
                lieu_arrestation=ville,
            )
            
            # Ajouter quelques infractions
            nb_infractions = random.randint(1, 3)
            for _ in range(nb_infractions):
                CriminalInfraction.objects.create(
                    fiche=fiche,
                    type_infraction=random.choice(types_infractions),
                    date_infraction=datetime.now().date() - timedelta(days=random.randint(0, 365)),
                    lieu=random.choice(villes),
                    description=f"Infraction commise à {random.choice(villes)}"
                )
            
            fiches_creees += 1
            
        self.stdout.write(self.style.SUCCESS(f'{fiches_creees} fiches criminelles creees avec succes'))
        
        # Afficher les statistiques
        total = CriminalFicheCriminelle.objects.count()
        en_cours = CriminalFicheCriminelle.objects.filter(statut_fiche=statut_en_cours).count()
        clotures = CriminalFicheCriminelle.objects.filter(statut_fiche=statut_cloture).count()
        critiques = CriminalFicheCriminelle.objects.filter(niveau_danger__gte=4).count()  # Très Élevé et Extrême
        
        self.stdout.write(self.style.SUCCESS(f'\nStatistiques actuelles:'))
        self.stdout.write(f'  - Total: {total}')
        self.stdout.write(f'  - En cours: {en_cours}')
        self.stdout.write(f'  - Clôturées: {clotures}')
        self.stdout.write(f'  - Critiques: {critiques}')

