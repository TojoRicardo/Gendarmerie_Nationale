# Generated manually - Réorganisation des types d'enquête en 2 catégories principales

from django.db import migrations

# Mapping des codes vers les nouvelles catégories et ordres
# Catégorie JUDICIAIRE (ordre 10-100)
# Catégorie ADMINISTRATIVE (ordre 200-300)

REORGANISATION = {
    # ==========================================
    # 🟦 ENQUÊTES JUDICIAIRES (ordre 10-100)
    # ==========================================
    'PRELIMINAIRE': {'ordre': 10, 'couleur': '#2563eb'},
    'FLAGRANCE': {'ordre': 11, 'couleur': '#2563eb'},
    'COMMISSION_ROGATOIRE': {'ordre': 12, 'couleur': '#2563eb'},
    'POST_SENTENCIELLE': {'ordre': 13, 'couleur': '#2563eb'},
    'POURSUITE_PENALE': {'ordre': 14, 'couleur': '#2563eb'},
    'EXECUTION_PEINES': {'ordre': 15, 'couleur': '#2563eb'},
    'CRIMINELLE': {'ordre': 16, 'couleur': '#2563eb'},
    'CORRECTIONNELLE': {'ordre': 17, 'couleur': '#2563eb'},
    'DELICTUELLE': {'ordre': 18, 'couleur': '#2563eb'},
    'CONTRAVENTIONNELLE': {'ordre': 19, 'couleur': '#2563eb'},
    'CRIME_ORGANISE': {'ordre': 20, 'couleur': '#2563eb'},
    'TERRORISTE': {'ordre': 21, 'couleur': '#2563eb'},
    'TRANSFRONTALIERE': {'ordre': 22, 'couleur': '#2563eb'},
    'CYBERCRIMINELLE': {'ordre': 23, 'couleur': '#2563eb'},
    'FINANCIERE': {'ordre': 24, 'couleur': '#2563eb'},
    'BLANCHIMENT': {'ordre': 25, 'couleur': '#2563eb'},
    'CORRUPTION': {'ordre': 26, 'couleur': '#2563eb'},
    'TRAFIC': {'ordre': 27, 'couleur': '#2563eb'},
    'ECONOMIQUE': {'ordre': 28, 'couleur': '#2563eb'},
    'SCIENTIFIQUE': {'ordre': 29, 'couleur': '#2563eb'},
    'TECHNIQUE': {'ordre': 30, 'couleur': '#2563eb'},
    'BALISTIQUE': {'ordre': 31, 'couleur': '#2563eb'},
    'DACTYLOSCOPIQUE': {'ordre': 32, 'couleur': '#2563eb'},
    'BIOMETRIQUE': {'ordre': 33, 'couleur': '#2563eb'},
    'ADN': {'ordre': 34, 'couleur': '#2563eb'},
    'RECONNAISSANCE_FACIALE': {'ordre': 35, 'couleur': '#2563eb'},
    'TELECOMMUNICATION': {'ordre': 36, 'couleur': '#2563eb'},
    'NUMERIQUE': {'ordre': 37, 'couleur': '#2563eb'},
    'GEOSPATIALE': {'ordre': 38, 'couleur': '#2563eb'},
    'ANALYSE_VIDEO': {'ordre': 39, 'couleur': '#2563eb'},
    'OSINT': {'ordre': 40, 'couleur': '#2563eb'},
    'RENSEIGNEMENT_CRIMINEL': {'ordre': 41, 'couleur': '#2563eb'},
    'RENSEIGNEMENT_TERRITORIAL': {'ordre': 42, 'couleur': '#2563eb'},
    'CONTRE_ESPIONNAGE': {'ordre': 43, 'couleur': '#2563eb'},
    'SURVEILLANCE': {'ordre': 44, 'couleur': '#2563eb'},
    'PREVENTION': {'ordre': 45, 'couleur': '#2563eb'},
    'PROTECTION_PERSONNES': {'ordre': 46, 'couleur': '#2563eb'},
    'PROTECTION_TEMOINS': {'ordre': 47, 'couleur': '#2563eb'},
    'PROTECTION_ENFANCE': {'ordre': 48, 'couleur': '#2563eb'},
    'VIOLENCES_GENRE': {'ordre': 49, 'couleur': '#2563eb'},
    'TRAITE_PERSONNES': {'ordre': 50, 'couleur': '#2563eb'},
    'DISPARITION': {'ordre': 51, 'couleur': '#2563eb'},
    'DISTRIBUTION_UPR': {'ordre': 52, 'couleur': '#2563eb'},
    'URGENCE': {'ordre': 53, 'couleur': '#2563eb'},
    'CRISE': {'ordre': 54, 'couleur': '#2563eb'},
    'POST_CATASTROPHE': {'ordre': 55, 'couleur': '#2563eb'},
    'ACCIDENT': {'ordre': 56, 'couleur': '#2563eb'},
    'ACCIDENT_ROUTE': {'ordre': 57, 'couleur': '#2563eb'},
    'MARITIME': {'ordre': 58, 'couleur': '#2563eb'},
    'AERIENNE': {'ordre': 59, 'couleur': '#2563eb'},
    'INDUSTRIELLE': {'ordre': 60, 'couleur': '#2563eb'},
    'IA_ASSISTEE': {'ordre': 61, 'couleur': '#2563eb'},
    'PREDICTIVE': {'ordre': 62, 'couleur': '#2563eb'},
    'ANALYSE_COMPORTEMENTALE': {'ordre': 63, 'couleur': '#2563eb'},
    'RAPPROCHEMENT_CRIMINEL': {'ordre': 64, 'couleur': '#2563eb'},
    'IDENTIFICATION_FACIALE': {'ordre': 65, 'couleur': '#2563eb'},
    'DETECTION_ANOMALIES': {'ordre': 66, 'couleur': '#2563eb'},
    'CORRELATION_MULTI_DOSSIERS': {'ordre': 67, 'couleur': '#2563eb'},
    
    # ==========================================
    # 🟩 ENQUÊTES ADMINISTRATIVES (ordre 200-300)
    # ==========================================
    'ADMINISTRATIVE': {'ordre': 200, 'couleur': '#059669'},
    'DISCIPLINAIRE': {'ordre': 201, 'couleur': '#059669'},
    'INSPECTION': {'ordre': 202, 'couleur': '#059669'},
    'CONTROLE': {'ordre': 203, 'couleur': '#059669'},
    'RESPONSABILITE_ADMIN': {'ordre': 204, 'couleur': '#059669'},
}


def reorganiser_types_enquete(apps, schema_editor):
    """Réorganise les types d'enquête en 2 catégories principales"""
    TypeEnquete = apps.get_model('enquete', 'TypeEnquete')
    
    for code, nouveau_data in REORGANISATION.items():
        try:
            type_enquete = TypeEnquete.objects.get(code=code)
            type_enquete.ordre = nouveau_data['ordre']
            type_enquete.couleur = nouveau_data['couleur']
            type_enquete.save()
        except TypeEnquete.DoesNotExist:
            # Si le type n'existe pas, on l'ignore (il sera créé par la migration précédente)
            pass


def reverse_reorganiser_types_enquete(apps, schema_editor):
    """Rollback - restaure les ordres et couleurs d'origine"""
    # On ne peut pas vraiment restaurer les valeurs d'origine sans les stocker
    # Cette fonction est laissée vide ou peut restaurer des valeurs par défaut
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('enquete', '0005_insert_types_enquete_normalises'),
    ]

    operations = [
        migrations.RunPython(
            reorganiser_types_enquete,
            reverse_reorganiser_types_enquete
        ),
    ]

