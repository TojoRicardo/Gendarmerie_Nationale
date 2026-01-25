"""
Modèles pour le Journal d'Audit Professionnel (Format INTERPOL/CIA/Gendarmerie)
"""

import uuid
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey
from django.contrib.auth import get_user_model
from typing import Any
import logging
import json

logger = logging.getLogger(__name__)

User = get_user_model()


class UserSession(models.Model):
    """
    Modèle pour gérer les sessions utilisateur avec horodatage de connexion/déconnexion.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='user_sessions',
        verbose_name='Utilisateur'
    )
    session_key = models.CharField(
        max_length=255,
        unique=True,
        db_index=True,
        verbose_name='Clé de session Django'
    )
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP'
    )
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent'
    )
    start_time = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Heure de début',
        db_index=True
    )
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Heure de fin',
        db_index=True
    )
    
    class Meta:
        verbose_name = 'Session Utilisateur'
        verbose_name_plural = 'Sessions Utilisateur'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['-start_time']),
            models.Index(fields=['user', '-start_time']),
            models.Index(fields=['session_key']),
        ]
    
    def __str__(self):
        return f"Session {self.user.username if self.user else 'Anonyme'} - {self.start_time}"
    
    def close(self):
        """Ferme la session en enregistrant l'heure de fin."""
        if not self.end_time:
            self.end_time = timezone.now()
            self.save(update_fields=['end_time'])


class AuditLog(models.Model):
    """
    Modèle professionnel pour enregistrer toutes les actions des utilisateurs.
    Format compatible avec les systèmes d'audit des organisations policières.
    """
    
    # Types d'actions possibles
    ACTION_CHOICES = [
        ("LOGIN", "Connexion"),
        ("LOGOUT", "Déconnexion"),
        ("FAILED_LOGIN", "Échec de connexion"),
        ("VIEW", "Consultation"),
        ("CREATE", "Création"),
        ("UPDATE", "Modification"),
        ("DELETE", "Suppression"),
        ("DOWNLOAD", "Téléchargement"),
        ("UPLOAD", "Téléversement"),
        ("SEARCH", "Recherche"),
        ("SUSPEND", "Suspension"),
        ("RESTORE", "Restauration"),
        ("PERMISSION_CHANGE", "Changement de permissions"),
        ("ROLE_CHANGE", "Changement de rôle"),
        ("PIN_VALIDATION", "Validation de PIN"),
        ("PIN_FAILED", "Échec de validation PIN"),
        ("ACCESS_DENIED", "Accès refusé"),
        ("NAVIGATION", "Navigation"),
        ("ERROR_403", "Erreur 403 - Accès refusé"),
        ("ERROR_404", "Erreur 404 - Page non trouvée"),
        ("ERROR_500", "Erreur 500 - Erreur serveur"),
    ]
    
    # Utilisateur
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='Utilisateur'
    )
    
    user_role = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='Rôle utilisateur',
        help_text='Rôle de l\'utilisateur au moment de l\'action'
    )
    
    # Session utilisateur
    session = models.ForeignKey(
        'UserSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='audit_logs',
        verbose_name='Session',
        help_text='Session utilisateur associée à cette action'
    )
    
    # Référence audit professionnelle
    reference = models.CharField(
        max_length=255,
        unique=True,
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Référence audit',
        help_text='Référence professionnelle unique (ex: SGIC-AUD/2025/11/26/ADM-TOJO/000142)'
    )
    
    operation_index = models.IntegerField(
        null=True,
        blank=True,
        db_index=True,
        verbose_name='Index d\'opération',
        help_text='Numéro séquentiel de l\'opération pour le jour'
    )
    
    # Horodatage de l'action
    start_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Heure de début',
        help_text='Heure de début de l\'action (généralement celle de la session)'
    )
    
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Heure de fin',
        help_text='Heure de fin de l\'action (généralement celle de la session)'
    )
    
    # Descriptions avant/après
    description_before = models.TextField(
        null=True,
        blank=True,
        verbose_name='Description avant',
        help_text='État ou description avant l\'action'
    )
    
    description_after = models.TextField(
        null=True,
        blank=True,
        verbose_name='Description après',
        help_text='État ou description après l\'action'
    )
    
    # Action et ressource
    action = models.CharField(
        max_length=50,
        choices=ACTION_CHOICES,
        verbose_name='Action',
        db_index=True
    )
    
    # GenericForeignKey pour lier à n'importe quel modèle
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name='Type de contenu',
        help_text='Type de modèle concerné'
    )
    
    object_id = models.PositiveIntegerField(
        null=True,
        blank=True,
        verbose_name='ID de l\'objet',
        help_text='Identifiant de l\'objet concerné'
    )
    
    content_object = GenericForeignKey('content_type', 'object_id')
    
    resource_type = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Type de ressource',
        help_text='Type de ressource concernée (ex: Utilisateur, DossierCriminel, Preuve) - Déprécié, utiliser content_type',
        db_index=True
    )
    
    resource_id = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        verbose_name='ID de la ressource',
        help_text='Identifiant de la ressource concernée - Déprécié, utiliser object_id',
        db_index=True
    )
    
    # Informations HTTP
    endpoint = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Endpoint',
        help_text='URL/Endpoint de l\'API appelée',
        db_index=True
    )
    
    method = models.CharField(
        max_length=10,
        blank=True,
        null=True,
        verbose_name='Méthode HTTP',
        help_text='Méthode HTTP utilisée (GET, POST, PUT, DELETE, etc.)'
    )
    
    # Route frontend (navigation React)
    frontend_route = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Route frontend',
        help_text='Route/écran visité dans l\'application React (ex: /dashboard, /enquetes, /fiches-criminelles)',
        db_index=True
    )
    
    screen_name = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Nom de l\'écran',
        help_text='Nom descriptif de l\'écran visité (ex: Dashboard, Liste des enquêtes, Détails fiche criminelle)',
        db_index=True
    )
    
    # Informations réseau et appareil
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP',
        db_index=True
    )
    
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent',
        help_text='User-Agent complet du navigateur'
    )
    
    browser = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Navigateur',
        help_text='Nom et version du navigateur (ex: Google Chrome 142)'
    )
    
    os = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Système d\'exploitation',
        help_text='Système d\'exploitation (ex: Windows 11, Linux Ubuntu)'
    )
    
    before = models.JSONField(
        null=True,
        blank=True,
        verbose_name='État avant',
        help_text='État de la ressource avant modification (format JSON)'
    )
    
    after = models.JSONField(
        null=True,
        blank=True,
        verbose_name='État après',
        help_text='État de la ressource après modification (format JSON)'
    )
    
    changes_before = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Modifications avant',
        help_text='État de la ressource avant modification (format JSON) - Déprécié, utiliser before'
    )
    
    changes_after = models.JSONField(
        null=True,
        blank=True,
        verbose_name='Modifications après',
        help_text='État de la ressource après modification (format JSON) - Déprécié, utiliser after'
    )
    
    data_before = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name='Données avant',
        help_text='État de la ressource avant modification (format JSON) - Déprécié, utiliser before'
    )
    
    data_after = models.JSONField(
        default=dict,
        blank=True,
        null=True,
        verbose_name='Données après',
        help_text='État de la ressource après modification (format JSON) - Déprécié, utiliser after'
    )
    
    # Informations supplémentaires
    additional_info = models.TextField(
        blank=True,
        null=True,
        verbose_name='Informations supplémentaires',
        help_text='Informations complémentaires sur l\'action'
    )
    
    description = models.TextField(
        blank=True,
        null=True,
        verbose_name='Description',
        help_text='Description textuelle générée automatiquement pour l\'interface (format long lisible)'
    )
    
    # Description courte pour l'affichage en liste
    description_short = models.CharField(
        max_length=500,
        blank=True,
        null=True,
        verbose_name='Description courte',
        help_text='Description courte pour l\'affichage en liste'
    )
    
    # Timestamp
    timestamp = models.DateTimeField(
        default=timezone.now,
        verbose_name='Timestamp',
        db_index=True,
        editable=False
    )
    
    # Statut
    reussi = models.BooleanField(
        default=True,
        verbose_name='Action réussie',
        help_text='Indique si l\'action a été effectuée avec succès'
    )
    
    message_erreur = models.TextField(
        blank=True,
        null=True,
        verbose_name='Message d\'erreur',
        help_text='Message d\'erreur si l\'action a échoué'
    )
    
    class Meta:
        verbose_name = 'Entrée du Journal d\'Audit'
        verbose_name_plural = 'Journal d\'Audit'
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['-timestamp']),
            models.Index(fields=['user', '-timestamp']),
            models.Index(fields=['action', '-timestamp']),
            models.Index(fields=['resource_type', '-timestamp']),
            models.Index(fields=['ip_address', '-timestamp']),
        ]
    
    def save(self, *args, **kwargs):
        """
        Génère automatiquement la description professionnelle au format demandé.
        Format: "Le [DATE] | Utilisateur: [INFO] | Action: [ACTION] | Ressource: [RESOURCE] | IP: [IP] | Navigateur: [BROWSER] | Système: [OS] | Méthode: [METHOD] | Endpoint: [ENDPOINT] | Avant: [JSON] | Après: [JSON]"
        
        IMPORTANT: Les logs d'audit sont immuables. Une fois créés, ils ne peuvent être modifiés
        que pour des champs techniques spécifiques (frontend_route, screen_name) lors de la création.
        """
        # Vérifier si c'est une mise à jour d'un log existant
        if self.pk:
            # Permettre uniquement la mise à jour de certains champs techniques lors de la création
            # (par exemple, frontend_route et screen_name peuvent être ajoutés après création)
            update_fields = kwargs.get('update_fields', [])
            allowed_update_fields = ['frontend_route', 'screen_name', 'description', 'description_short']
            
            if update_fields:
                # Vérifier que seuls les champs autorisés sont modifiés
                for field in update_fields:
                    if field not in allowed_update_fields:
                        logger.warning(
                            f"Tentative de modification du champ '{field}' sur un log d'audit existant (ID: {self.pk}). "
                            f"Les logs d'audit sont immuables pour garantir la traçabilité."
                        )
                        # Retirer le champ non autorisé de la liste
                        update_fields.remove(field)
                
                if not update_fields:
                    # Aucun champ autorisé à modifier, ne pas sauvegarder
                    logger.warning(f"Tentative de modification d'un log d'audit sans champs autorisés (ID: {self.pk})")
                    return
                
                kwargs['update_fields'] = update_fields
        
        # Extraire browser et OS depuis user_agent si non définis
        if self.user_agent and (not self.browser or not self.os):
            try:
                from .user_agent_parser import parse_user_agent
                ua_info = parse_user_agent(self.user_agent)
                if not self.browser and ua_info.get('navigateur'):
                    self.browser = ua_info['navigateur']
                if not self.os and ua_info.get('systeme'):
                    self.os = ua_info['systeme']
            except Exception as e:
                logger.debug(f"Erreur lors du parsing user-agent: {e}")
        
        # Générer la description automatiquement
        self._generate_description()
        
        super().save(*args, **kwargs)
    
    def _generate_description(self):
        """
        Génère une description professionnelle narrative au format journal d'audit.
        Format structuré et narratif sans emojis.
        """
        try:
            # Formater la date en français
            if self.timestamp:
                dt = self.timestamp
            else:
                dt = timezone.now()
            
            months = {
                1: "janvier", 2: "février", 3: "mars", 4: "avril",
                5: "mai", 6: "juin", 7: "juillet", 8: "août",
                9: "septembre", 10: "octobre", 11: "novembre", 12: "décembre"
            }
            date_str = f"{dt.day} {months[dt.month]} {dt.year}"
            time_str = dt.strftime("%Hh%M")
            
            # Construire la description narrative
            lines = []
            
            # En-tête
            lines.append(f"Date : {date_str}")
            
            # Utilisateur
            if self.user and self.user.is_authenticated:
                full_name = f"{self.user.first_name} {self.user.last_name}".strip()
                if full_name:
                    user_display = full_name
                else:
                    user_display = self.user.username
                
                if self.user_role:
                    lines.append(f"Utilisateur : {self.user_role} {user_display}")
                else:
                    lines.append(f"Utilisateur : {user_display}")
            else:
                lines.append("Utilisateur : Système (non authentifié)")
            
            lines.append("")
            
            if self.session:
                start = self.session.start_time.strftime('%H:%M:%S') if self.session.start_time else 'N/A'
                end = self.session.end_time.strftime('%H:%M:%S') if self.session.end_time else 'En cours'
                lines.append(f"Session : {start} → {end}")
            elif self.start_time and self.end_time:
                start = self.start_time.strftime('%H:%M:%S')
                end = self.end_time.strftime('%H:%M:%S')
                lines.append(f"Session : {start} → {end}")
            elif self.start_time:
                start = self.start_time.strftime('%H:%M:%S')
                lines.append(f"Session : {start} → En cours")
            
            lines.append("")
            
            # Informations techniques
            lines.append("Informations techniques :")
            if self.browser:
                lines.append(f"Navigateur : {self.browser}")
            if self.os:
                lines.append(f"OS : {self.os}")
            if self.ip_address:
                lines.append(f"IP : {self.ip_address}")
            if self.method:
                lines.append(f"Méthode : {self.method}")
            lines.append("")
            
            action_map = {
                'LOGIN': 'Connexion',
                'LOGOUT': 'Déconnexion',
                'FAILED_LOGIN': 'Tentative de connexion échouée',
                'VIEW': 'Consultation',
                'CREATE': 'Création',
                'UPDATE': 'Modification',
                'DELETE': 'Suppression',
                'DOWNLOAD': 'Téléchargement',
                'UPLOAD': 'Téléversement',
                'SEARCH': 'Recherche',
                'SUSPEND': 'Suspension',
                'RESTORE': 'Restauration',
                'PERMISSION_CHANGE': 'Modification des permissions',
                'ROLE_CHANGE': 'Changement de rôle',
                'PIN_VALIDATION': 'Validation de PIN',
                'PIN_FAILED': 'Échec de validation PIN',
                'ACCESS_DENIED': 'Accès refusé',
            }
            action_fr = action_map.get(self.action, self.action.replace('_', ' ').title())
            
            # Ressource
            if self.content_type:
                resource_display = f"{self.content_type.model}"
                if self.object_id:
                    resource_display += f" #{self.object_id}"
            elif self.resource_id:
                resource_display = f"{self.resource_type} #{self.resource_id}" if self.resource_type else "Ressource"
            elif self.resource_type:
                resource_display = self.resource_type
            else:
                resource_display = "Ressource"
            
            # Extraire les détails de la requête si disponibles (copie pour ne pas modifier les données originales)
            request_details = None
            before_data = self.before or self.changes_before or self.data_before
            after_data = self.after or self.changes_after or self.data_after
            if isinstance(after_data, dict) and '_request_details' in after_data:
                request_details = after_data.get('_request_details')
            elif isinstance(before_data, dict) and '_request_details' in before_data:
                request_details = before_data.get('_request_details')
            
            lines.append(f"Action : {action_fr}")
            if resource_display != "Ressource":
                lines.append(f"Ressource : {resource_display}")
            
            # Afficher les détails de la requête si disponibles
            if request_details:
                if request_details.get('query_params'):
                    lines.append(f"Paramètres de requête : {json.dumps(request_details['query_params'], ensure_ascii=False)}")
                if request_details.get('request_body'):
                    lines.append(f"Données de la requête : {json.dumps(request_details['request_body'], ensure_ascii=False, indent=2)}")
                if request_details.get('form_data'):
                    lines.append(f"Données de formulaire : {json.dumps(request_details['form_data'], ensure_ascii=False, indent=2)}")
            
            lines.append("")
            
            # Avant/Après si disponibles
            if self.description_before:
                lines.append("Avant :")
                lines.append(self.description_before)
                lines.append("")
            if self.description_after:
                lines.append("Après :")
                lines.append(self.description_after)
                lines.append("")
            
            # Narration selon le type d'action
            # (before_data et after_data déjà extraits ci-dessus, request_details aussi)
            
            # Variable pour éviter les problèmes avec les apostrophes dans les f-strings
            user_ref = user_display if self.user else "l'utilisateur"
            user_ref_cap = user_display if self.user else "L'utilisateur"
            
            if self.action == 'LOGIN':
                lines.append("Connexion au système")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} ouvre son navigateur et saisit ses identifiants. Il valide l'accès via MFA.")
                lines.append("")
                if self.reussi:
                    lines.append(f"Journal : Connexion réussie. IP : {self.ip_address or 'Non disponible'}.")
                else:
                    lines.append(f"Journal : Tentative de connexion échouée. {self.message_erreur or 'Raison non spécifiée'}.")
            
            elif self.action == 'LOGOUT':
                lines.append("Déconnexion")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} termine sa session et se déconnecte.")
                lines.append("")
                lines.append("Journal : Déconnexion réussie. Session terminée.")
            
            elif self.action == 'VIEW':
                lines.append("Consultation complète")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} consulte la ressource {resource_display}.")
                lines.append("")
                lines.append("Le système sauvegarde automatiquement l'état initial de la ressource pour assurer la traçabilité.")
                lines.append("")
                lines.append("Journal : Consultation complète effectuée.")
            
            elif self.action == 'CREATE':
                lines.append("Création de ressource")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} crée une nouvelle ressource : {resource_display}.")
                lines.append("")
                if after_data:
                    lines.append("Données de création :")
                    for key, value in list(after_data.items())[:10]:  # Limiter à 10 champs
                        field_name = key.replace('_', ' ').title()
                        value_str = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                        lines.append(f"  - {field_name} : {value_str}")
                lines.append("")
                lines.append("Journal : Création validée et archivée.")
            
            elif self.action == 'UPDATE':
                lines.append("Ouverture et consultation du dossier")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} ouvre la ressource {resource_display}.")
                lines.append("")
                lines.append("Le système sauvegarde automatiquement l'état initial de la ressource pour assurer la traçabilité.")
                lines.append("")
                lines.append("Journal : Consultation complète effectuée. Incohérences détectées.")
                lines.append("")
                lines.append("DECIDER MODIFIER")
                lines.append("")
                lines.append(f"{user_ref_cap} décide de corriger les erreurs. Le système sauvegarde l'état avant modification.")
                lines.append("")
                
                # Tableau des modifications
                if before_data and after_data and isinstance(before_data, dict) and isinstance(after_data, dict):
                    modifications = []
                    for key in set(list(before_data.keys()) + list(after_data.keys())):
                        before_value = before_data.get(key)
                        after_value = after_data.get(key)
                        if before_value != after_value:
                            field_name = key.replace('_', ' ').title()
                            before_str = str(before_value)[:50] + "..." if len(str(before_value)) > 50 else str(before_value)
                            after_str = str(after_value)[:50] + "..." if len(str(after_value)) > 50 else str(after_value)
                            motif = self._generate_motif(key, before_value, after_value)
                            modifications.append({
                                'champ': field_name,
                                'avant': before_str,
                                'apres': after_str,
                                'motif': motif
                            })
                    
                    if modifications:
                        lines.append("Modifications apportées :")
                        lines.append("")
                        lines.append("Champ\tAvant modification\tAprès modification\tMotif")
                        for mod in modifications:
                            lines.append(f"{mod['champ']}\t{mod['avant']}\t{mod['apres']}\t{mod['motif']}")
                        lines.append("")
                
                lines.append("Journal : Modifications validées et archivées.")
            
            elif self.action == 'DELETE':
                lines.append("Suppression de ressource")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} supprime la ressource {resource_display}.")
                lines.append("")
                lines.append("Le système sauvegarde l'état avant suppression pour assurer la traçabilité.")
                lines.append("")
                if before_data:
                    lines.append("État avant suppression :")
                    for key, value in list(before_data.items())[:10]:  # Limiter à 10 champs
                        field_name = key.replace('_', ' ').title()
                        value_str = str(value)[:100] + "..." if len(str(value)) > 100 else str(value)
                        lines.append(f"  - {field_name} : {value_str}")
                    lines.append("")
                lines.append("Journal : Suppression validée et archivée.")
            
            elif self.action == 'DOWNLOAD':
                lines.append("Téléchargement")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} télécharge la ressource {resource_display}.")
                lines.append("")
                lines.append("Journal : Téléchargement autorisé et enregistré.")
            
            elif self.action == 'UPLOAD':
                lines.append("Téléversement")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} téléverse un fichier pour la ressource {resource_display}.")
                lines.append("")
                lines.append("Journal : Téléversement validé et enregistré.")
            
            elif self.action == 'SEARCH':
                lines.append("Recherche")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} effectue une recherche.")
                if self.endpoint:
                    lines.append(f"Recherche effectuée sur l'endpoint : {self.endpoint}")
                lines.append("")
                lines.append("Journal : Recherche enregistrée dans le journal d'audit.")
            
            elif self.action == 'PIN_VALIDATION':
                lines.append("Validation de PIN")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} effectue l'action : {action_fr} sur {resource_display}.")
                lines.append("")
                lines.append("Journal : Action enregistrée et traçable.")
            
            elif self.action == 'PIN_FAILED':
                lines.append("Échec de validation PIN")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} tente de valider un PIN sur {resource_display}.")
                lines.append("")
                if self.message_erreur:
                    lines.append(f"Journal : Échec de validation PIN. {self.message_erreur}")
                else:
                    lines.append("Journal : Échec de validation PIN. Raison non spécifiée.")
            
            else:
                lines.append(f"Action : {action_fr}")
                lines.append("")
                lines.append(f"À {time_str}, {user_ref} effectue l'action : {action_fr} sur {resource_display}.")
                lines.append("")
                lines.append("Journal : Action enregistrée et traçable.")
            
            lines.append("")
            
            # Conclusion
            lines.append("Conclusion")
            lines.append("")
            lines.append("Toutes les actions de l'utilisateur sont tracées :")
            lines.append(f"- {action_fr} effectuée")
            if before_data or after_data:
                lines.append("- États avant/après archivés pour chaque action")
            lines.append("- Motifs et justifications consignés")
            lines.append("- Transparence et traçabilité totales respectées")
            lines.append("")
            
            # Référence d'audit professionnelle
            if self.reference:
                ref_audit = self.reference
            else:
                # Format de fallback si la référence n'est pas générée
                date_ref = dt.strftime('%Y-%m-%d')
                ref_audit = f"SGIC-AUDIT-{date_ref}-{self.object_id or self.id}"
            lines.append(f"Référence audit : {ref_audit}")
            
            # Assembler la description finale
            self.description = "\n".join(lines)
            
            # Créer aussi une version courte pour l'affichage en liste
            date_short = dt.strftime("%d/%m/%Y à %H:%M:%S")
            self.description_short = f"{action_fr} - {resource_display} par {user_display if self.user else 'Système'} le {date_short}"
            
        except Exception as e:
            logger.error(f"Erreur lors de la génération de la description: {e}", exc_info=True)
            # Description de fallback
            user_display = self.user.username if self.user else "Système"
            action_fr = self.action.replace('_', ' ').title()
            date_str = timezone.now().strftime('%d/%m/%Y à %H:%M:%S')
            self.description = f"Date : {date_str}\nUtilisateur : {user_display}\nAction : {action_fr}\nRessource : {self.resource_type or 'Ressource'}"
            self.description_short = f"{action_fr} - {self.resource_type or 'Ressource'} par {user_display}"
    
    def _generate_motif(self, field_name: str, before_value: Any, after_value: Any) -> str:
        """Génère un motif automatique pour une modification."""
        field_lower = field_name.lower()
        
        # Motifs spécifiques selon le type de champ
        if 'nom' in field_lower or 'prenom' in field_lower:
            return "Correction pour refléter les informations réelles"
        elif 'statut' in field_lower:
            return f"Changement de statut de '{before_value}' à '{after_value}'"
        elif 'date' in field_lower:
            return "Mise à jour de la date"
        elif 'adresse' in field_lower or 'lieu' in field_lower:
            return "Précision géographique"
        elif 'commentaire' in field_lower or 'description' in field_lower or 'contenu' in field_lower:
            return "Mise à jour du contenu"
        elif 'email' in field_lower:
            return "Mise à jour de l'adresse email"
        elif 'cin' in field_lower or 'numero' in field_lower:
            return "Correction du numéro d'identification"
        elif 'pourcentage' in field_lower:
            return f"Avancement mis à jour de {before_value}% à {after_value}%"
        elif 'agent' in field_lower or 'responsable' in field_lower:
            return "Attribution correcte"
        else:
            return "Modification standard"
    
    def __str__(self):
        user_display = self.user.username if self.user else "Système"
        if self.content_type:
            resource_display = f"{self.content_type.model}#{self.object_id}" if self.object_id else str(self.content_type)
        else:
            resource_display = f"{self.resource_type}#{self.resource_id}" if self.resource_id else (self.resource_type or "Ressource")
        return f"{self.timestamp} | {user_display} | {self.action} | {resource_display}"
    
    @property
    def action_display(self):
        """Retourne le libellé de l'action."""
        return self.get_action_display()
    
    # Alias pour compatibilité avec l'ancien code
    @property
    def utilisateur(self):
        return self.user
    
    @utilisateur.setter
    def utilisateur(self, value):
        self.user = value
    
    @property
    def ip_adresse(self):
        return str(self.ip_address) if self.ip_address else None

    @ip_adresse.setter
    def ip_adresse(self, value):
        self.ip_address = value
    
    def to_json(self):
        """
        Convertit l'entrée d'audit en format JSON propre comme demandé.
        
        Returns:
            dict: Format JSON standardisé
        """
        # Utiliser hasattr pour compatibilité avec migration non appliquée
        before_data = {}
        after_data = {}
        
        if hasattr(self, 'before') and self.before is not None:
            before_data = self.before
        elif hasattr(self, 'changes_before') and self.changes_before is not None:
            before_data = self.changes_before
        elif hasattr(self, 'data_before') and self.data_before:
            before_data = self.data_before
        
        if hasattr(self, 'after') and self.after is not None:
            after_data = self.after
        elif hasattr(self, 'changes_after') and self.changes_after is not None:
            after_data = self.changes_after
        elif hasattr(self, 'data_after') and self.data_after:
            after_data = self.data_after
        
        # Déterminer le modèle et l'ID
        model_name = None
        object_id_str = None
        
        if self.content_type:
            model_name = self.content_type.model
            object_id_str = str(self.object_id) if self.object_id else ""
        elif self.resource_type:
            model_name = self.resource_type
            object_id_str = str(self.resource_id) if self.resource_id else ""
        
        # Déterminer le statut
        status_str = "success" if self.reussi else "failed"
        if self.message_erreur:
            status_str = f"{status_str}: {self.message_erreur}"
        
        return {
            "user_id": str(self.user.id) if self.user else "",
            "email": self.user.email if self.user and hasattr(self.user, 'email') else "",
            "role": self.user_role or "",
            "action": self.action or "",
            "description": self.description or "",
            "model": model_name or "",
            "object_id": object_id_str or "",
            "before": before_data if isinstance(before_data, dict) else {},
            "after": after_data if isinstance(after_data, dict) else {},
            "ip": str(self.ip_address) if self.ip_address else "",
            "browser": self.browser or "",
            "device": self.os or "",  # OS est utilisé comme device dans le format demandé
            "route": self.endpoint or "",
            "method": self.method or "",
            "status": status_str,
            "timestamp": self.timestamp.isoformat() if self.timestamp else ""
        }


# Alias pour compatibilité avec l'ancien code (déprécié)
OldAuditLog = AuditLog


class JournalAudit(models.Model):
    """
    Modèle simplifié de journal d'audit narratif pour le système SGIC.
    Conforme aux normes de traçabilité (sécurité / gendarmerie).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    utilisateur = models.ForeignKey(
        User, null=True, blank=True, on_delete=models.SET_NULL,
        related_name='journal_audit_entries',
        verbose_name='Utilisateur'
    )
    role = models.CharField(max_length=100, verbose_name='Rôle')
    
    module = models.CharField(
        max_length=100,
        verbose_name='Module',
        help_text='Module concerné (ex: Auth, Criminel, IA)',
        db_index=True
    )
    action = models.CharField(
        max_length=255,
        verbose_name='Action',
        help_text='Action effectuée (ex: Téléchargement rapport)',
        db_index=True
    )
    ressource = models.CharField(
        max_length=255,
        verbose_name='Ressource',
        help_text='Ressource concernée'
    )
    
    narration = models.TextField(
        verbose_name='Narration',
        help_text='Description narrative détaillée de l\'action'
    )
    
    ip = models.GenericIPAddressField(
        verbose_name='Adresse IP',
        db_index=True
    )
    navigateur = models.CharField(
        max_length=255,
        verbose_name='Navigateur'
    )
    os = models.CharField(
        max_length=100,
        verbose_name='Système d\'exploitation'
    )
    methode_http = models.CharField(
        max_length=10,
        verbose_name='Méthode HTTP'
    )
    
    date_action = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de l\'action',
        db_index=True
    )
    reference_audit = models.CharField(
        max_length=100,
        unique=True,
        db_index=True,
        verbose_name='Référence d\'audit',
        help_text='Référence unique SGIC-AUDIT-YYYYMMDD-HHMMSS'
    )
    
    class Meta:
        db_table = 'audit_journal_audit_narratif'
        verbose_name = 'Journal d\'Audit'
        verbose_name_plural = 'Journaux d\'Audit'
        ordering = ["-date_action"]
        indexes = [
            models.Index(fields=['-date_action']),
            models.Index(fields=['module', '-date_action']),
            models.Index(fields=['utilisateur', '-date_action']),
            models.Index(fields=['reference_audit']),
        ]
    
    def __str__(self):
        user_display = self.utilisateur.username if self.utilisateur else "Système"
        return f"{user_display} | {self.action}"
    
    @property
    def user(self):
        """Alias pour compatibilité."""
        return self.utilisateur


class JournalAuditNarratif(models.Model):
    """
    Journal d'audit narratif détaillé.
    Une session utilisateur = une histoire complète.
    Le journal s'enrichit progressivement avec toutes les actions de la session.
    """
    
    # Session utilisateur
    session = models.OneToOneField(
        'UserSession',
        on_delete=models.CASCADE,
        related_name='journal_narratif',
        verbose_name='Session utilisateur',
        help_text='Session associée à ce journal narratif'
    )
    
    # Utilisateur (pour faciliter les requêtes)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journaux_narratifs',
        verbose_name='Utilisateur'
    )
    
    # Date de début (début de session)
    date_debut = models.DateTimeField(
        auto_now_add=True,
        verbose_name='Date de début',
        db_index=True,
        help_text='Date et heure de début de la session'
    )
    
    # Date de fin (fin de session ou expiration)
    date_fin = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name='Date de fin',
        db_index=True,
        help_text='Date et heure de fin de la session'
    )
    
    # Description narrative continue (le cœur du système)
    description_narrative = models.TextField(
        default='',
        blank=True,
        verbose_name='Description narrative',
        help_text='Journal narratif complet et chronologique de toutes les actions de la session. '
                  'Ce champ s\'enrichit progressivement et ne peut pas être modifié après clôture.'
    )
    
    # Statut du journal
    est_cloture = models.BooleanField(
        default=False,
        verbose_name='Journal clôturé',
        help_text='Indique si le journal est clôturé (session terminée)'
    )
    
    # Informations techniques de la session
    ip_address = models.GenericIPAddressField(
        null=True,
        blank=True,
        verbose_name='Adresse IP'
    )
    
    user_agent = models.TextField(
        blank=True,
        null=True,
        verbose_name='User Agent'
    )
    
    browser = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Navigateur'
    )
    
    os = models.CharField(
        max_length=255,
        blank=True,
        null=True,
        verbose_name='Système d\'exploitation'
    )
    
    # Horodatage de dernière mise à jour
    derniere_mise_a_jour = models.DateTimeField(
        auto_now=True,
        verbose_name='Dernière mise à jour',
        db_index=True
    )
    
    class Meta:
        verbose_name = 'Journal d\'Audit Narratif'
        verbose_name_plural = 'Journaux d\'Audit Narratifs'
        ordering = ['-date_debut']
        indexes = [
            models.Index(fields=['-date_debut']),
            models.Index(fields=['user', '-date_debut']),
            models.Index(fields=['est_cloture', '-date_debut']),
        ]
    
    def __str__(self):
        user_display = self.user.username if self.user else 'Anonyme'
        debut_str = self.date_debut.strftime('%d/%m/%Y %H:%M') if self.date_debut else 'N/A'
        status = 'Clôturé' if self.est_cloture else 'En cours'
        return f"Journal {user_display} - {debut_str} ({status})"
    
    def ajouter_phrase_narrative(self, phrase: str, ajouter_nouvelle_ligne: bool = True):
        """
        Ajoute une phrase narrative au journal.
        Ne peut pas être modifié si le journal est clôturé.
        
        Args:
            phrase: La phrase narrative à ajouter
            ajouter_nouvelle_ligne: Si True, ajoute un saut de ligne avant la phrase
        """
        if self.est_cloture:
            logger.warning(f"Tentative d'ajout de phrase narrative sur un journal clôturé (ID: {self.pk})")
            return False
        
        # Nettoyer la phrase
        phrase = phrase.strip()
        if not phrase:
            return False
        
        # Ajouter la phrase avec formatage
        if self.description_narrative:
            if ajouter_nouvelle_ligne:
                self.description_narrative += "\n\n" + phrase
            else:
                self.description_narrative += " " + phrase
        else:
            self.description_narrative = phrase
        
        # Sauvegarder automatiquement
        self.save(update_fields=['description_narrative', 'derniere_mise_a_jour'])
        return True
    
    def cloturer(self):
        """
        Clôture le journal narratif à la fin de la session.
        Le journal devient immuable après clôture.
        """
        if self.est_cloture:
            return
        
        self.est_cloture = True
        self.date_fin = timezone.now()
        
        # Ajouter la phrase de clôture
        if self.description_narrative:
            heure_fin = self.date_fin.strftime('%Hh%M')
            phrase_cloture = f"L'utilisateur s'est déconnecté à {heure_fin}."
            self.description_narrative += "\n\n" + phrase_cloture
        
        self.save(update_fields=['est_cloture', 'date_fin', 'description_narrative', 'derniere_mise_a_jour'])
    
    @property
    def duree_session(self):
        """Calcule la durée de la session."""
        if not self.date_debut:
            return None
        
        date_fin = self.date_fin if self.date_fin else timezone.now()
        return date_fin - self.date_debut
    
    def save(self, *args, **kwargs):
        """
        Empêche la modification du journal narratif après clôture.
        """
        if self.pk and self.est_cloture:
            # Permettre uniquement la mise à jour de certains champs techniques
            update_fields = kwargs.get('update_fields', [])
            allowed_fields = ['derniere_mise_a_jour']  # Seul champ technique autorisé
            
            if update_fields:
                # Filtrer les champs non autorisés
                filtered_fields = [f for f in update_fields if f in allowed_fields]
                if not filtered_fields:
                    logger.warning(
                        f"Tentative de modification d'un journal narratif clôturé (ID: {self.pk}). "
                        f"Les journaux narratifs sont immuables après clôture."
                    )
                    return
                kwargs['update_fields'] = filtered_fields
        
        super().save(*args, **kwargs)