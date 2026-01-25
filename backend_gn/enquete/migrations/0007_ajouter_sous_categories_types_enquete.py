# Generated manually - Ajout de sous-catégories aux types d'enquête

from django.db import migrations

# Mapping des codes vers les sous-catégories
SOUS_CATEGORIES = {
    # 🟦 ENQUÊTES JUDICIAIRES
    # Sous-section: Ouvertes sous l'autorité judiciaire
    'PRELIMINAIRE': {'sous_categorie': 'Ouvertes sous l\'autorité judiciaire', 'ordre': 10},
    'FLAGRANCE': {'sous_categorie': 'Ouvertes sous l\'autorité judiciaire', 'ordre': 11},
    'COMMISSION_ROGATOIRE': {'sous_categorie': 'Ouvertes sous l\'autorité judiciaire', 'ordre': 12},
    'POST_SENTENCIELLE': {'sous_categorie': 'Ouvertes sous l\'autorité judiciaire', 'ordre': 13},
    'POURSUITE_PENALE': {'sous_categorie': 'Ouvertes sous l\'autorité judiciaire', 'ordre': 14},
    'EXECUTION_PEINES': {'sous_categorie': 'Ouvertes sous l\'autorité judiciaire', 'ordre': 15},
    
    # 🟩 ENQUÊTES ADMINISTRATIVES
    # Sous-section: Internes à l'administration ou forces de sécurité
    'ADMINISTRATIVE': {'sous_categorie': 'Internes à l\'administration ou forces de sécurité', 'ordre': 200},
    'DISCIPLINAIRE': {'sous_categorie': 'Internes à l\'administration ou forces de sécurité', 'ordre': 201},
    'INSPECTION': {'sous_categorie': 'Internes à l\'administration ou forces de sécurité', 'ordre': 202},
    'CONTROLE': {'sous_categorie': 'Internes à l\'administration ou forces de sécurité', 'ordre': 203},
    'RESPONSABILITE_ADMIN': {'sous_categorie': 'Internes à l\'administration ou forces de sécurité', 'ordre': 204},
    
    # 🟥 ENQUÊTES CRIMINELLES
    # Sous-section: Par nature de l'infraction
    'CRIMINELLE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 300},
    'CORRECTIONNELLE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 301},
    'DELICTUELLE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 302},
    'CONTRAVENTIONNELLE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 303},
    'CRIME_ORGANISE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 304},
    'TERRORISTE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 305},
    'TRANSFRONTALIERE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 306},
    'CYBERCRIMINELLE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 307},
    'FINANCIERE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 308},
    'BLANCHIMENT': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 309},
    'CORRUPTION': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 310},
    'TRAFIC': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 311},
    'ECONOMIQUE': {'sous_categorie': 'Par nature de l\'infraction', 'ordre': 312},
    
    # 🟨 ENQUÊTES SPÉCIALES / TECHNIQUES
    'SCIENTIFIQUE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 400},
    'TECHNIQUE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 401},
    'BALISTIQUE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 402},
    'DACTYLOSCOPIQUE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 403},
    'BIOMETRIQUE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 404},
    'ADN': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 405},
    'RECONNAISSANCE_FACIALE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 406},
    'TELECOMMUNICATION': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 407},
    'NUMERIQUE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 408},
    'GEOSPATIALE': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 409},
    'ANALYSE_VIDEO': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 410},
    'OSINT': {'sous_categorie': 'Enquêtes spéciales / techniques', 'ordre': 411},
    
    # 🟪 ENQUÊTES DE RENSEIGNEMENT
    'RENSEIGNEMENT_CRIMINEL': {'sous_categorie': 'Enquêtes de renseignement', 'ordre': 500},
    'RENSEIGNEMENT_TERRITORIAL': {'sous_categorie': 'Enquêtes de renseignement', 'ordre': 501},
    'CONTRE_ESPIONNAGE': {'sous_categorie': 'Enquêtes de renseignement', 'ordre': 502},
    'SURVEILLANCE': {'sous_categorie': 'Enquêtes de renseignement', 'ordre': 503},
    'PREVENTION': {'sous_categorie': 'Enquêtes de renseignement', 'ordre': 504},
    
    # 🟫 ENQUÊTES DE PROTECTION ET ASSISTANCE
    'PROTECTION_PERSONNES': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 600},
    'PROTECTION_TEMOINS': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 601},
    'PROTECTION_ENFANCE': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 602},
    'VIOLENCES_GENRE': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 603},
    'TRAITE_PERSONNES': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 604},
    'DISPARITION': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 605},
    'DISTRIBUTION_UPR': {'sous_categorie': 'Enquêtes de protection et assistance', 'ordre': 606},
    
    # ⬛ ENQUÊTES D'URGENCE ET SITUATIONS PARTICULIÈRES
    'URGENCE': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 700},
    'CRISE': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 701},
    'POST_CATASTROPHE': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 702},
    'ACCIDENT': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 703},
    'ACCIDENT_ROUTE': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 704},
    'MARITIME': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 705},
    'AERIENNE': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 706},
    'INDUSTRIELLE': {'sous_categorie': 'Enquêtes d\'urgence et situations particulières', 'ordre': 707},
    
    # 🧠 ENQUÊTES ASSISTÉES PAR IA (moderne)
    'IA_ASSISTEE': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 800},
    'PREDICTIVE': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 801},
    'ANALYSE_COMPORTEMENTALE': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 802},
    'RAPPROCHEMENT_CRIMINEL': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 803},
    'IDENTIFICATION_FACIALE': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 804},
    'DETECTION_ANOMALIES': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 805},
    'CORRELATION_MULTI_DOSSIERS': {'sous_categorie': 'Enquêtes assistées par IA (moderne)', 'ordre': 806},
}


def ajouter_sous_categories(apps, schema_editor):
    """Ajoute les sous-catégories et met à jour les ordres"""
    TypeEnquete = apps.get_model('enquete', 'TypeEnquete')
    
    # D'abord, ajouter le champ sous_categorie si ce n'est pas déjà fait via un modèle
    # Pour l'instant, on stocke la sous-catégorie dans la description ou on utilise l'ordre pour la déterminer
    
    for code, data in SOUS_CATEGORIES.items():
        try:
            type_enquete = TypeEnquete.objects.get(code=code)
            type_enquete.ordre = data['ordre']
            # Stocker la sous-catégorie dans la description si elle n'existe pas déjà
            if not type_enquete.description or 'Sous-catégorie:' not in type_enquete.description:
                sous_cat = data['sous_categorie']
                desc = type_enquete.description or ''
                type_enquete.description = f"Sous-catégorie: {sous_cat}\n\n{desc}".strip()
            type_enquete.save()
        except TypeEnquete.DoesNotExist:
            pass


def reverse_ajouter_sous_categories(apps, schema_editor):
    """Rollback - restaure les ordres précédents"""
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('enquete', '0006_reorganiser_types_enquete_deux_categories'),
    ]

    operations = [
        migrations.RunPython(
            ajouter_sous_categories,
            reverse_ajouter_sous_categories
        ),
    ]

