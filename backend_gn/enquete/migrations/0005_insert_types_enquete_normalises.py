# Generated manually - Migration de données pour les types d'enquête normalisés

from django.db import migrations

# Définition complète des types d'enquête par catégorie
TYPES_ENQUETE = [
    # 🟦 1. ENQUÊTES JUDICIAIRES
    {
        'code': 'PRELIMINAIRE',
        'libelle': 'Enquête préliminaire',
        'description': 'Enquête ouverte sous l\'autorité judiciaire, en phase préliminaire',
        'ordre': 10,
        'couleur': '#2563eb',
        'actif': True,
    },
    {
        'code': 'FLAGRANCE',
        'libelle': 'Enquête de flagrance',
        'description': 'Enquête ouverte en cas de flagrant délit, sous l\'autorité judiciaire',
        'ordre': 11,
        'couleur': '#2563eb',
        'actif': True,
    },
    {
        'code': 'COMMISSION_ROGATOIRE',
        'libelle': 'Enquête sur commission rogatoire',
        'description': 'Enquête ouverte sur commission rogatoire du juge d\'instruction',
        'ordre': 12,
        'couleur': '#2563eb',
        'actif': True,
    },
    {
        'code': 'POST_SENTENCIELLE',
        'libelle': 'Enquête post-sentencielle',
        'description': 'Enquête post-sentencielle ouverte après jugement',
        'ordre': 13,
        'couleur': '#2563eb',
        'actif': True,
    },
    {
        'code': 'POURSUITE_PENALE',
        'libelle': 'Enquête de poursuite pénale',
        'description': 'Enquête dans le cadre d\'une poursuite pénale',
        'ordre': 14,
        'couleur': '#2563eb',
        'actif': True,
    },
    {
        'code': 'EXECUTION_PEINES',
        'libelle': 'Enquête d\'exécution des peines',
        'description': 'Enquête dans le cadre de l\'exécution des peines',
        'ordre': 15,
        'couleur': '#2563eb',
        'actif': True,
    },
    
    # 🟩 2. ENQUÊTES ADMINISTRATIVES
    {
        'code': 'ADMINISTRATIVE',
        'libelle': 'Enquête administrative',
        'description': 'Enquête administrative interne à l\'administration ou forces de sécurité',
        'ordre': 20,
        'couleur': '#059669',
        'actif': True,
    },
    {
        'code': 'DISCIPLINAIRE',
        'libelle': 'Enquête disciplinaire',
        'description': 'Enquête disciplinaire interne',
        'ordre': 21,
        'couleur': '#059669',
        'actif': True,
    },
    {
        'code': 'INSPECTION',
        'libelle': 'Enquête d\'inspection',
        'description': 'Enquête d\'inspection administrative',
        'ordre': 22,
        'couleur': '#059669',
        'actif': True,
    },
    {
        'code': 'CONTROLE',
        'libelle': 'Enquête de contrôle',
        'description': 'Enquête de contrôle administratif',
        'ordre': 23,
        'couleur': '#059669',
        'actif': True,
    },
    {
        'code': 'RESPONSABILITE_ADMIN',
        'libelle': 'Enquête de responsabilité administrative',
        'description': 'Enquête sur la responsabilité administrative',
        'ordre': 24,
        'couleur': '#059669',
        'actif': True,
    },
    
    # 🟥 3. ENQUÊTES CRIMINELLES (par nature de l'infraction)
    {
        'code': 'CRIMINELLE',
        'libelle': 'Enquête criminelle',
        'description': 'Enquête criminelle par nature de l\'infraction',
        'ordre': 30,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'CORRECTIONNELLE',
        'libelle': 'Enquête correctionnelle',
        'description': 'Enquête correctionnelle pour délits',
        'ordre': 31,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'DELICTUELLE',
        'libelle': 'Enquête délictuelle',
        'description': 'Enquête délictuelle',
        'ordre': 32,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'CONTRAVENTIONNELLE',
        'libelle': 'Enquête contraventionnelle',
        'description': 'Enquête contraventionnelle pour contraventions',
        'ordre': 33,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'CRIME_ORGANISE',
        'libelle': 'Enquête pour crime organisé',
        'description': 'Enquête pour crime organisé',
        'ordre': 34,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'TERRORISTE',
        'libelle': 'Enquête terroriste',
        'description': 'Enquête terroriste',
        'ordre': 35,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'TRANSFRONTALIERE',
        'libelle': 'Enquête transfrontalière',
        'description': 'Enquête transfrontalière impliquant plusieurs pays',
        'ordre': 36,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'CYBERCRIMINELLE',
        'libelle': 'Enquête cybercriminelle',
        'description': 'Enquête sur les infractions liées au cyberespace',
        'ordre': 37,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'FINANCIERE',
        'libelle': 'Enquête financière',
        'description': 'Enquête financière',
        'ordre': 38,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'BLANCHIMENT',
        'libelle': 'Enquête de blanchiment d\'argent',
        'description': 'Enquête sur le blanchiment d\'argent',
        'ordre': 39,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'CORRUPTION',
        'libelle': 'Enquête de corruption',
        'description': 'Enquête sur la corruption',
        'ordre': 40,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'TRAFIC',
        'libelle': 'Enquête de trafic',
        'description': 'Enquête sur le trafic (drogue, armes, humains)',
        'ordre': 41,
        'couleur': '#dc2626',
        'actif': True,
    },
    {
        'code': 'ECONOMIQUE',
        'libelle': 'Enquête économique',
        'description': 'Enquête économique',
        'ordre': 42,
        'couleur': '#dc2626',
        'actif': True,
    },
    
    # 🟨 4. ENQUÊTES SPÉCIALES / TECHNIQUES
    {
        'code': 'SCIENTIFIQUE',
        'libelle': 'Enquête scientifique',
        'description': 'Enquête scientifique',
        'ordre': 50,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'TECHNIQUE',
        'libelle': 'Enquête technique',
        'description': 'Enquête technique',
        'ordre': 51,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'BALISTIQUE',
        'libelle': 'Enquête balistique',
        'description': 'Enquête balistique',
        'ordre': 52,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'DACTYLOSCOPIQUE',
        'libelle': 'Enquête dactyloscopique',
        'description': 'Enquête dactyloscopique (empreintes digitales)',
        'ordre': 53,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'BIOMETRIQUE',
        'libelle': 'Enquête biométrique',
        'description': 'Enquête biométrique',
        'ordre': 54,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'ADN',
        'libelle': 'Enquête ADN',
        'description': 'Enquête basée sur l\'analyse ADN',
        'ordre': 55,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'RECONNAISSANCE_FACIALE',
        'libelle': 'Enquête de reconnaissance faciale',
        'description': 'Enquête utilisant la reconnaissance faciale',
        'ordre': 56,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'TELECOMMUNICATION',
        'libelle': 'Enquête de télécommunication',
        'description': 'Enquête sur les télécommunications',
        'ordre': 57,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'NUMERIQUE',
        'libelle': 'Enquête numérique (forensic)',
        'description': 'Enquête numérique et forensic digital',
        'ordre': 58,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'GEOSPATIALE',
        'libelle': 'Enquête géospatiale',
        'description': 'Enquête géospatiale',
        'ordre': 59,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'ANALYSE_VIDEO',
        'libelle': 'Enquête d\'analyse vidéo',
        'description': 'Enquête d\'analyse vidéo',
        'ordre': 60,
        'couleur': '#ca8a04',
        'actif': True,
    },
    {
        'code': 'OSINT',
        'libelle': 'Enquête OSINT',
        'description': 'Enquête utilisant l\'Open Source Intelligence (OSINT)',
        'ordre': 61,
        'couleur': '#ca8a04',
        'actif': True,
    },
    
    # 🟪 5. ENQUÊTES DE RENSEIGNEMENT
    {
        'code': 'RENSEIGNEMENT_CRIMINEL',
        'libelle': 'Enquête de renseignement criminel',
        'description': 'Enquête de renseignement criminel',
        'ordre': 70,
        'couleur': '#9333ea',
        'actif': True,
    },
    {
        'code': 'RENSEIGNEMENT_TERRITORIAL',
        'libelle': 'Enquête de renseignement territorial',
        'description': 'Enquête de renseignement territorial',
        'ordre': 71,
        'couleur': '#9333ea',
        'actif': True,
    },
    {
        'code': 'CONTRE_ESPIONNAGE',
        'libelle': 'Enquête de contre-espionnage',
        'description': 'Enquête de contre-espionnage',
        'ordre': 72,
        'couleur': '#9333ea',
        'actif': True,
    },
    {
        'code': 'SURVEILLANCE',
        'libelle': 'Enquête de surveillance',
        'description': 'Enquête de surveillance',
        'ordre': 73,
        'couleur': '#9333ea',
        'actif': True,
    },
    {
        'code': 'PREVENTION',
        'libelle': 'Enquête de prévention',
        'description': 'Enquête de prévention',
        'ordre': 74,
        'couleur': '#9333ea',
        'actif': True,
    },
    
    # 🟫 6. ENQUÊTES DE PROTECTION ET ASSISTANCE
    {
        'code': 'PROTECTION_PERSONNES',
        'libelle': 'Enquête de protection des personnes',
        'description': 'Enquête de protection des personnes',
        'ordre': 80,
        'couleur': '#92400e',
        'actif': True,
    },
    {
        'code': 'PROTECTION_TEMOINS',
        'libelle': 'Enquête de protection des témoins',
        'description': 'Enquête de protection des témoins',
        'ordre': 81,
        'couleur': '#92400e',
        'actif': True,
    },
    {
        'code': 'PROTECTION_ENFANCE',
        'libelle': 'Enquête de protection de l\'enfance',
        'description': 'Enquête de protection de l\'enfance',
        'ordre': 82,
        'couleur': '#92400e',
        'actif': True,
    },
    {
        'code': 'VIOLENCES_GENRE',
        'libelle': 'Enquête de violences basées sur le genre',
        'description': 'Enquête sur les violences basées sur le genre',
        'ordre': 83,
        'couleur': '#92400e',
        'actif': True,
    },
    {
        'code': 'TRAITE_PERSONNES',
        'libelle': 'Enquête de traite des personnes',
        'description': 'Enquête sur la traite des personnes',
        'ordre': 84,
        'couleur': '#92400e',
        'actif': True,
    },
    {
        'code': 'DISPARITION',
        'libelle': 'Enquête de disparitions',
        'description': 'Enquête sur les disparitions',
        'ordre': 85,
        'couleur': '#92400e',
        'actif': True,
    },
    {
        'code': 'DISTRIBUTION_UPR',
        'libelle': 'Enquête de personnes non identifiées (UPR)',
        'description': 'Enquête sur les personnes non identifiées (Unidentified Person Registry)',
        'ordre': 86,
        'couleur': '#92400e',
        'actif': True,
    },
    
    # ⬛ 7. ENQUÊTES D'URGENCE ET SITUATIONS PARTICULIÈRES
    {
        'code': 'URGENCE',
        'libelle': 'Enquête d\'urgence',
        'description': 'Enquête d\'urgence',
        'ordre': 90,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'CRISE',
        'libelle': 'Enquête de crise',
        'description': 'Enquête de crise',
        'ordre': 91,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'POST_CATASTROPHE',
        'libelle': 'Enquête post-catastrophe',
        'description': 'Enquête post-catastrophe',
        'ordre': 92,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'ACCIDENT',
        'libelle': 'Enquête d\'accident',
        'description': 'Enquête d\'accident',
        'ordre': 93,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'ACCIDENT_ROUTE',
        'libelle': 'Enquête d\'accident de la route',
        'description': 'Enquête d\'accident de la route',
        'ordre': 94,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'MARITIME',
        'libelle': 'Enquête maritime',
        'description': 'Enquête maritime',
        'ordre': 95,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'AERIENNE',
        'libelle': 'Enquête aérienne',
        'description': 'Enquête aérienne',
        'ordre': 96,
        'couleur': '#1f2937',
        'actif': True,
    },
    {
        'code': 'INDUSTRIELLE',
        'libelle': 'Enquête industrielle',
        'description': 'Enquête industrielle',
        'ordre': 97,
        'couleur': '#1f2937',
        'actif': True,
    },
    
    # 🧠 8. ENQUÊTES ASSISTÉES PAR IA (moderne)
    {
        'code': 'IA_ASSISTEE',
        'libelle': 'Enquête assistée par intelligence artificielle',
        'description': 'Enquête assistée par intelligence artificielle',
        'ordre': 100,
        'couleur': '#7c3aed',
        'actif': True,
    },
    {
        'code': 'PREDICTIVE',
        'libelle': 'Enquête prédictive',
        'description': 'Enquête prédictive utilisant l\'IA',
        'ordre': 101,
        'couleur': '#7c3aed',
        'actif': True,
    },
    {
        'code': 'ANALYSE_COMPORTEMENTALE',
        'libelle': 'Enquête d\'analyse comportementale',
        'description': 'Enquête d\'analyse comportementale assistée par IA',
        'ordre': 102,
        'couleur': '#7c3aed',
        'actif': True,
    },
    {
        'code': 'RAPPROCHEMENT_CRIMINEL',
        'libelle': 'Enquête de rapprochement criminel',
        'description': 'Enquête de rapprochement criminel assistée par IA',
        'ordre': 103,
        'couleur': '#7c3aed',
        'actif': True,
    },
    {
        'code': 'IDENTIFICATION_FACIALE',
        'libelle': 'Enquête d\'identification faciale',
        'description': 'Enquête d\'identification faciale assistée par IA',
        'ordre': 104,
        'couleur': '#7c3aed',
        'actif': True,
    },
    {
        'code': 'DETECTION_ANOMALIES',
        'libelle': 'Enquête de détection d\'anomalies',
        'description': 'Enquête de détection d\'anomalies assistée par IA',
        'ordre': 105,
        'couleur': '#7c3aed',
        'actif': True,
    },
    {
        'code': 'CORRELATION_MULTI_DOSSIERS',
        'libelle': 'Enquête de corrélation multi-dossiers',
        'description': 'Enquête de corrélation multi-dossiers assistée par IA',
        'ordre': 106,
        'couleur': '#7c3aed',
        'actif': True,
    },
]


def insert_types_enquete(apps, schema_editor):
    """Insère les types d'enquête normalisés"""
    TypeEnquete = apps.get_model('enquete', 'TypeEnquete')
    
    for type_data in TYPES_ENQUETE:
        TypeEnquete.objects.get_or_create(
            code=type_data['code'],
            defaults={
                'libelle': type_data['libelle'],
                'description': type_data['description'],
                'ordre': type_data['ordre'],
                'couleur': type_data['couleur'],
                'actif': type_data['actif'],
            }
        )


def reverse_insert_types_enquete(apps, schema_editor):
    """Supprime les types d'enquête normalisés (rollback)"""
    TypeEnquete = apps.get_model('enquete', 'TypeEnquete')
    codes = [t['code'] for t in TYPES_ENQUETE]
    TypeEnquete.objects.filter(code__in=codes).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('enquete', '0004_add_dossier_enquete_models'),
    ]

    operations = [
        migrations.RunPython(
            insert_types_enquete,
            reverse_insert_types_enquete
        ),
    ]

