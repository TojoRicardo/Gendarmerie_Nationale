"""
Service de collecte de données pour les rapports
Récupère les données depuis la base PostgreSQL
"""

from datetime import datetime, timedelta
from django.db.models import Count, Q, Avg, Sum, F
from django.db.models.functions import TruncMonth, TruncDay
from django.utils import timezone
from typing import Dict, List, Any
from criminel.models import CriminalFicheCriminelle


class DataCollectorService:
    """Service de collecte de données pour les rapports"""
    
    def __init__(self, type_rapport: str, date_debut, date_fin, filtres: Dict = None):
        """
        Initialise le collecteur de données
        
        Args:
            type_rapport: Type de rapport à générer
            date_debut: Date de début de la période
            date_fin: Date de fin de la période
            filtres: Filtres supplémentaires (statut, région, etc.)
        """
        self.type_rapport = type_rapport
        self.date_debut = date_debut
        self.date_fin = date_fin
        self.filtres = filtres or {}
    
    def collect_data(self) -> Dict[str, Any]:
        """
        Collecte les données selon le type de rapport
        
        Returns:
            dict: Données formatées pour le rapport
        """
        collectors = {
            'resume_mensuel': self._collect_resume_mensuel,
            'statistiques_infractions': self._collect_statistiques_infractions,
            'activite_agents': self._collect_activite_agents,
            'fiches_ouvertes': self._collect_fiches_ouvertes,
            'analyse_geographique': self._collect_analyse_geographique,
            'taux_resolution': self._collect_taux_resolution,
            'biometrie': self._collect_biometrie,
            'personnalise': self._collect_personnalise,
        }
        
        collector = collectors.get(self.type_rapport, self._collect_personnalise)
        return collector()
    
    def _get_base_queryset(self):
        """
        Retourne le queryset de base filtré par dates et filtres
        Utilise les vraies données du modèle CriminalFicheCriminelle
        """
        from criminel.models import CriminalFicheCriminelle
        from django.utils import timezone
        
        # Convertir les dates en datetime aware si nécessaire
        if hasattr(self.date_debut, 'date'):
            date_debut = self.date_debut
        else:
            date_debut = self.date_debut
        
        if hasattr(self.date_fin, 'date'):
            date_fin = self.date_fin
        else:
            date_fin = self.date_fin
        
        # Si les dates sont des date (naive), les convertir en datetime aware
        from datetime import date, datetime
        if isinstance(date_debut, date) and not isinstance(date_debut, datetime):
            date_debut = timezone.make_aware(datetime.combine(date_debut, datetime.min.time()))
        if isinstance(date_fin, date) and not isinstance(date_fin, datetime):
            date_fin = timezone.make_aware(datetime.combine(date_fin, datetime.max.time()))
        
        # Filtrer par dates et exclure les fiches archivées
        filter_kwargs = {
            'date_creation__gte': date_debut,
            'date_creation__lte': date_fin,
        }
        
        # Ajouter is_archived seulement si le champ existe
        try:
            CriminalFicheCriminelle._meta.get_field('is_archived')
            filter_kwargs['is_archived'] = False
        except:
            pass
        
        qs = CriminalFicheCriminelle.objects.filter(**filter_kwargs)
        
        # Ajouter les relations si elles existent
        try:
            qs = qs.select_related('statut_fiche')
        except:
            pass
        try:
            qs = qs.prefetch_related('infractions__type_infraction', 'infractions__statut_affaire')
        except:
            pass
        
        # Appliquer les filtres
        if self.filtres.get('statut'):
            # Chercher le statut par code
            from criminel.models import RefStatutFiche
            try:
                statut = RefStatutFiche.objects.get(code=self.filtres['statut'])
                qs = qs.filter(statut_fiche=statut)
            except:
                pass
        
        if self.filtres.get('region'):
            qs = qs.filter(
                Q(province__icontains=self.filtres['region']) |
                Q(lieu_arrestation__icontains=self.filtres['region']) |
                Q(adresse__icontains=self.filtres['region'])
            )
        
        if self.filtres.get('niveau_danger'):
            qs = qs.filter(niveau_danger=self.filtres['niveau_danger'])
        
        return qs
    
    # COLLECTEURS SPÉCIFIQUES
    
    def _collect_resume_mensuel(self) -> Dict[str, Any]:
        """Collecte les données pour le résumé mensuel"""
        try:
            qs = self._get_base_queryset()
            
            # Statistiques globales
            total_fiches = qs.count()
            
            # Compter par statut - avec gestion d'erreur
            fiches_ouvertes = 0
            fiches_closes = 0
            try:
                from criminel.models import RefStatutFiche
                statuts_en_cours = RefStatutFiche.objects.filter(code__in=['en_cours', 'en_attente'])
                fiches_ouvertes = qs.filter(statut_fiche__in=statuts_en_cours).count()
                statuts_closes = RefStatutFiche.objects.filter(code__in=['cloture', 'clos'])
                fiches_closes = qs.filter(statut_fiche__in=statuts_closes).count()
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur calcul statuts: {e}")
                fiches_ouvertes = total_fiches
                fiches_closes = 0
            
            # Évolution par jour - avec gestion d'erreur
            evolution_quotidienne = []
            try:
                evolution_quotidienne = list(qs.annotate(
                    jour=TruncDay('date_creation')
                ).values('jour').annotate(
                    nombre=Count('id')
                ).order_by('jour'))
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur évolution quotidienne: {e}")
                evolution_quotidienne = []
            
            # Moyenne niveau de danger - avec gestion d'erreur
            avg_danger = 0.0
            try:
                avg_danger = qs.aggregate(avg=Avg('niveau_danger'))['avg'] or 0.0
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.warning(f"Erreur moyenne danger: {e}")
            
            return {
                'titre': 'Résumé Mensuel',
                'resume': f"Ce rapport présente un résumé complet de l'activité du {self.date_debut} au {self.date_fin}.",
                'statistiques': {
                    'Total des fiches': total_fiches,
                    'Fiches ouvertes': fiches_ouvertes,
                    'Fiches clôturées': fiches_closes,
                    'Taux de clôture': f"{(fiches_closes / total_fiches * 100) if total_fiches > 0 else 0:.1f}%",
                    'Niveau de danger moyen': f"{avg_danger:.2f}",
                },
                'donnees': evolution_quotidienne,
                'graphiques': {
                    'evolution_quotidienne': evolution_quotidienne
                }
            }
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Erreur _collect_resume_mensuel: {e}", exc_info=True)
            return {
                'titre': 'Résumé Mensuel',
                'resume': f"Erreur lors de la collecte: {str(e)}",
                'statistiques': {
                    'Total des fiches': 0,
                    'Fiches ouvertes': 0,
                    'Fiches clôturées': 0,
                    'Taux de clôture': '0.0%',
                    'Niveau de danger moyen': '0.00',
                },
                'donnees': [],
                'graphiques': {},
                'erreur': True
            }
    
    def _collect_statistiques_infractions(self) -> Dict[str, Any]:
        """Collecte les statistiques sur les infractions"""
        qs = self._get_base_queryset()
        
        # Compter les infractions par type
        from criminel.models import CriminalInfraction
        infractions = CriminalInfraction.objects.filter(
            fiche__in=qs
        ).select_related('type_infraction', 'statut_affaire')
        
        # Répartition par type d'infraction
        repartition_type = list(infractions.values('type_infraction__libelle').annotate(
            nombre=Count('id')
        ).order_by('-nombre')[:10])
        
        # Répartition par statut de fiche
        repartition_statut = list(qs.values('statut_fiche__libelle').annotate(
            nombre=Count('id')
        ).order_by('-nombre'))
        
        # Répartition par niveau de danger
        repartition_danger = list(qs.values('niveau_danger').annotate(
            nombre=Count('id')
        ).order_by('-niveau_danger'))
        
        # Données détaillées pour export
        donnees_detaillees = []
        for fiche in qs[:100]:  # Limiter à 100 pour performance
            infractions_fiche = fiche.infractions.all()
            for infraction in infractions_fiche:
                donnees_detaillees.append({
                    'numero_fiche': fiche.numero_fiche,
                    'nom': fiche.nom,
                    'prenom': fiche.prenom or '',
                    'date_creation': fiche.date_creation.strftime('%Y-%m-%d') if fiche.date_creation else '',
                    'statut': fiche.statut_fiche.libelle if fiche.statut_fiche else 'Non défini',
                    'type_infraction': infraction.type_infraction.libelle if infraction.type_infraction else 'Non défini',
                    'date_infraction': infraction.date_infraction.strftime('%Y-%m-%d') if infraction.date_infraction else '',
                    'lieu': infraction.lieu or '',
                    'niveau_danger': fiche.niveau_danger,
                })
        
        total_infractions = infractions.count()
        
        return {
            'titre': 'Statistiques des Infractions',
            'resume': f"Analyse détaillée des infractions enregistrées entre le {self.date_debut} et le {self.date_fin}.",
            'statistiques': {
                'Total fiches': qs.count(),
                'Total infractions': total_infractions,
                'Moyenne infractions/fiche': f"{(total_infractions / qs.count()) if qs.count() > 0 else 0:.2f}",
                'Niveau danger moyen': f"{qs.aggregate(avg=Avg('niveau_danger'))['avg'] or 0:.2f}",
            },
            'donnees': repartition_type,
            'repartition_statut': repartition_statut,
            'repartition_danger': repartition_danger,
            'details': donnees_detaillees[:50],  # Limiter pour export
        }
    
    def _collect_activite_agents(self) -> Dict[str, Any]:
        """Collecte les données sur l'activité des agents - VRAIES DONNÉES"""
        from utilisateur.models import UtilisateurModel
        
        # Agents actifs avec leurs vraies données
        agents = UtilisateurModel.objects.filter(
            statut='actif'
        ).exclude(
            role__isnull=True
        ).exclude(
            role=''  # Exclure les agents sans rôle défini
        )
        
        # Filtrer les agents enquêteurs/analystes selon les rôles disponibles
        roles_enqueteurs = ['Enquêteur Principal', 'Analyste', 'Enquêteur', 'Enquêteur Junior']
        agents = agents.filter(role__in=roles_enqueteurs)
        
        total_agents = agents.count()
        
        date_limite = timezone.now() - timedelta(days=7)
        agents_actifs = 0
        agents_donnees = []
        
        for agent in agents:
            is_actif_recent = False
            derniere_connexion_str = 'Jamais'
            
            if agent.derniereConnexion:
                derniere_connexion_str = agent.derniereConnexion.strftime('%Y-%m-%d %H:%M')
                if agent.derniereConnexion >= date_limite:
                    is_actif_recent = True
                    agents_actifs += 1
            elif agent.last_login:
                derniere_connexion_str = agent.last_login.strftime('%Y-%m-%d %H:%M')
                if agent.last_login >= date_limite:
                    is_actif_recent = True
                    agents_actifs += 1
            
            agents_donnees.append({
                'email': agent.email,
                'prenom': agent.prenom or '',
                'nom': agent.nom or '',
                'username': agent.username or '',
                'role': agent.role or 'Non défini',
                'statut': agent.statut or 'actif',
                'grade': agent.grade or '',
                'matricule': agent.matricule or '',
                'derniere_connexion': derniere_connexion_str,
                'est_actif_recent': is_actif_recent,
                'date_creation_compte': agent.dateCreation.strftime('%Y-%m-%d') if agent.dateCreation else '',
            })
        
        total_fiches_periode = CriminalFicheCriminelle.objects.filter(
            date_creation__gte=self.date_debut,
            date_creation__lte=self.date_fin,
            is_archived=False
        ).count()
        
        return {
            'titre': 'Activité des Agents',
            'resume': f"Rapport d'activité des agents entre le {self.date_debut} et le {self.date_fin}. Total de {total_fiches_periode} fiches créées dans cette période.",
            'statistiques': {
                'Total agents': total_agents,
                'Agents actifs (7j)': agents_actifs,
                'Taux d\'activité': f"{(agents_actifs / total_agents * 100) if total_agents > 0 else 0:.1f}%",
                'Total fiches créées (période)': total_fiches_periode,
                'Moyenne fiches/agent': f"{(total_fiches_periode / total_agents) if total_agents > 0 else 0:.1f}",
            },
            'donnees': agents_donnees
        }
    
    def _collect_fiches_ouvertes(self) -> Dict[str, Any]:
        """Collecte les fiches criminelles ouvertes"""
        from criminel.models import RefStatutFiche
        
        statuts_ouverts = RefStatutFiche.objects.filter(code__in=['en_cours', 'en_attente'])
        qs = self._get_base_queryset().filter(statut_fiche__in=statuts_ouverts)
        
        # Données détaillées
        donnees = []
        for fiche in qs[:500]:  # Limiter pour performance
            donnees.append({
                'numero_fiche': fiche.numero_fiche,
                'nom': fiche.nom,
                'prenom': fiche.prenom or '',
                'surnom': fiche.surnom or '',
                'date_creation': fiche.date_creation.strftime('%Y-%m-%d %H:%M') if fiche.date_creation else '',
                'province': fiche.province or '',
                'lieu_arrestation': fiche.lieu_arrestation or '',
                'statut': fiche.statut_fiche.libelle if fiche.statut_fiche else 'Non défini',
                'niveau_danger': fiche.niveau_danger,
                'nombre_infractions': fiche.infractions.count(),
            })
        
        # Calculer les durées
        maintenant = datetime.now()
        anciennes = 0
        recentes = 0
        for fiche in qs:
            if fiche.date_creation:
                jours = (maintenant - fiche.date_creation.replace(tzinfo=None)).days
                if jours > 30:
                    anciennes += 1
                elif jours <= 7:
                    recentes += 1
        
        return {
            'titre': 'Fiches Ouvertes',
            'resume': f"Liste des fiches criminelles en cours d'investigation au {self.date_fin}.",
            'statistiques': {
                'Total fiches ouvertes': qs.count(),
                'Anciennes (>30j)': anciennes,
                'Récentes (<7j)': recentes,
                'Niveau danger moyen': f"{qs.aggregate(avg=Avg('niveau_danger'))['avg'] or 0:.2f}",
            },
            'donnees': donnees[:100],  # Limiter pour export
        }
    
    def _collect_analyse_geographique(self) -> Dict[str, Any]:
        """Analyse géographique des infractions"""
        qs = self._get_base_queryset()
        
        # Répartition par province
        repartition_province = list(qs.exclude(province__isnull=True).exclude(province='').values('province').annotate(
            nombre=Count('id')
        ).order_by('-nombre')[:10])  # Top 10 provinces
        
        # Répartition par lieu d'arrestation
        repartition_lieu = list(qs.exclude(lieu_arrestation__isnull=True).exclude(lieu_arrestation='').values('lieu_arrestation').annotate(
            nombre=Count('id')
        ).order_by('-nombre')[:20])  # Top 20 lieux
        
        # Fiches avec coordonnées GPS
        fiches_gps = qs.exclude(latitude__isnull=True).exclude(longitude__isnull=True).count()
        
        return {
            'titre': 'Analyse Géographique',
            'resume': f"Répartition territoriale des fiches criminelles du {self.date_debut} au {self.date_fin}.",
            'statistiques': {
                'Total fiches': qs.count(),
                'Fiches avec GPS': fiches_gps,
                'Pourcentage avec GPS': f"{(fiches_gps / qs.count() * 100) if qs.count() > 0 else 0:.1f}%",
                'Nombre de provinces': len(repartition_province),
                'Province la plus touchée': repartition_province[0]['province'] if repartition_province else 'N/A',
            },
            'donnees': repartition_province,
            'lieux_detail': repartition_lieu,
        }
    
    def _collect_taux_resolution(self) -> Dict[str, Any]:
        """Calcule les taux de résolution"""
        qs = self._get_base_queryset()
        
        total = qs.count()
        
        # Utiliser les vrais statuts de la base
        from criminel.models import RefStatutFiche
        statuts_closes = RefStatutFiche.objects.filter(code__in=['cloture', 'clos', 'cloturé'])
        resolues = qs.filter(statut_fiche__in=statuts_closes).count()
        
        statuts_en_cours = RefStatutFiche.objects.filter(code__in=['en_cours', 'en_attente'])
        en_cours = qs.filter(statut_fiche__in=statuts_en_cours).count()
        
        fiches_closes = qs.filter(statut_fiche__in=statuts_closes)
        temps_resolution_jours = []
        for fiche in fiches_closes:
            if fiche.date_creation and fiche.date_modification:
                delta = (fiche.date_modification - fiche.date_creation).days
                if delta > 0:
                    temps_resolution_jours.append(delta)
        
        temps_moyen = sum(temps_resolution_jours) / len(temps_resolution_jours) if temps_resolution_jours else 0
        
        taux_resolution = (resolues / total * 100) if total > 0 else 0
        
        return {
            'titre': 'Taux de Résolution',
            'resume': f"Performance de résolution des cas du {self.date_debut} au {self.date_fin}.",
            'statistiques': {
                'Total cas': total,
                'Cas résolus': resolues,
                'Cas en cours': en_cours,
                'Taux de résolution': f"{taux_resolution:.1f}%",
                'Temps moyen de résolution': f"{temps_moyen:.1f} jours",
            },
            'donnees': [
                {'statut': 'Résolus', 'nombre': resolues},
                {'statut': 'En cours', 'nombre': en_cours},
                {'statut': 'Autres', 'nombre': total - resolues - en_cours},
            ],
        }
    
    def _collect_biometrie(self) -> Dict[str, Any]:
        """Collecte les données biométriques depuis la base"""
        qs = self._get_base_queryset()
        
        # Compter les fiches avec photos
        fiches_avec_photos = qs.exclude(photo__isnull=True).exclude(photo='').count()
        
        # Chercher les empreintes digitales si le modèle existe
        try:
            from biometrie.models import EmpreinteDigitale
            empreintes_total = EmpreinteDigitale.objects.filter(
                fiche_criminelle__in=qs
            ).count()
        except:
            empreintes_total = 0
        
        # Chercher les photos biométriques si le modèle existe
        try:
            from biometrie.models import PhotoBiometrique
            photos_biometriques = PhotoBiometrique.objects.filter(
                fiche_criminelle__in=qs
            ).count()
        except:
            photos_biometriques = 0
        
        # Statistiques détaillées
        donnees = []
        for fiche in qs[:100]:  # Limiter pour performance
            donnees_fiche = {
                'numero_fiche': fiche.numero_fiche,
                'nom': fiche.nom,
                'prenom': fiche.prenom or '',
                'a_photo': bool(fiche.photo),
            }
            
            # Ajouter les empreintes si disponibles
            try:
                from biometrie.models import EmpreinteDigitale
                empreintes = EmpreinteDigitale.objects.filter(fiche_criminelle=fiche).count()
                donnees_fiche['nombre_empreintes'] = empreintes
            except:
                donnees_fiche['nombre_empreintes'] = 0
            
            donnees.append(donnees_fiche)
        
        return {
            'titre': 'Données Biométriques',
            'resume': f"Rapport biométrique pour la période du {self.date_debut} au {self.date_fin}.",
            'statistiques': {
                'Total fiches analysées': qs.count(),
                'Fiches avec photo': fiches_avec_photos,
                'Pourcentage avec photo': f"{(fiches_avec_photos / qs.count() * 100) if qs.count() > 0 else 0:.1f}%",
                'Empreintes digitales enregistrées': empreintes_total,
                'Photos biométriques': photos_biometriques,
            },
            'donnees': donnees[:50],  # Limiter pour export
        }
    
    def _collect_personnalise(self) -> Dict[str, Any]:
        """Collecte pour un rapport personnalisé"""
        qs = self._get_base_queryset()
        
        # Données détaillées
        donnees = []
        for fiche in qs[:500]:  # Limiter pour performance
            donnees.append({
                'numero_fiche': fiche.numero_fiche,
                'nom': fiche.nom,
                'prenom': fiche.prenom or '',
                'surnom': fiche.surnom or '',
                'sexe': fiche.get_sexe_display() if hasattr(fiche, 'get_sexe_display') else fiche.sexe,
                'date_naissance': fiche.date_naissance.strftime('%Y-%m-%d') if fiche.date_naissance else '',
                'nationalite': fiche.nationalite or '',
                'province': fiche.province or '',
                'lieu_arrestation': fiche.lieu_arrestation or '',
                'date_arrestation': fiche.date_arrestation.strftime('%Y-%m-%d') if fiche.date_arrestation else '',
                'date_creation': fiche.date_creation.strftime('%Y-%m-%d %H:%M') if fiche.date_creation else '',
                'statut': fiche.statut_fiche.libelle if fiche.statut_fiche else 'Non défini',
                'niveau_danger': fiche.niveau_danger,
                'nombre_infractions': fiche.infractions.count(),
            })
        
        return {
            'titre': 'Rapport Personnalisé',
            'resume': f"Rapport personnalisé couvrant la période du {self.date_debut} au {self.date_fin}.",
            'statistiques': {
                'Total fiches': qs.count(),
                'Fiches avec infractions': qs.filter(infractions__isnull=False).distinct().count(),
                'Niveau danger moyen': f"{qs.aggregate(avg=Avg('niveau_danger'))['avg'] or 0:.2f}",
            },
            'donnees': donnees,
        }

