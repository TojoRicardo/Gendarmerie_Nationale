"""
Service de Matching Intelligent avec Embeddings Biométriques
=============================================================

Module pour utiliser les embeddings biométriques ArcFace
pour identifier et matcher les criminels intelligemment.
"""

import numpy as np
import json
from typing import Dict, List, Any, Optional, Tuple
from django.db.models import Q


class MatchingIntelligentService:
    """
    Service pour le matching intelligent utilisant les embeddings biométriques
    
    Utilise les embeddings générés par ArcFace (module Biometrie)
    pour des correspondances intelligentes et du clustering
    """
    
    def __init__(self, seuil_similarite: float = 0.6):
        """
        Initialise le service de matching
        
        Args:
            seuil_similarite: Seuil minimum de similarité (0.0 à 1.0)
        """
        self.seuil_similarite = seuil_similarite
    
    def calculer_similarite_cosinus(self, 
                                    embedding1: np.ndarray, 
                                    embedding2: np.ndarray) -> float:
        """
        Calcule la similarité cosinus entre deux embeddings
        
        Args:
            embedding1: Premier embedding
            embedding2: Deuxième embedding
            
        Returns:
            Score de similarité (0.0 à 1.0)
        """
        # Normaliser les vecteurs
        norm1 = np.linalg.norm(embedding1)
        norm2 = np.linalg.norm(embedding2)
        
        if norm1 == 0 or norm2 == 0:
            return 0.0
        
        # Produit scalaire normalisé
        similarite = np.dot(embedding1, embedding2) / (norm1 * norm2)
        
        return (similarite + 1) / 2
    
    def calculer_distance_euclidienne(self,
                                      embedding1: np.ndarray,
                                      embedding2: np.ndarray) -> float:
        """
        Calcule la distance euclidienne entre deux embeddings
        
        Args:
            embedding1: Premier embedding
            embedding2: Deuxième embedding
            
        Returns:
            Distance euclidienne
        """
        return np.linalg.norm(embedding1 - embedding2)
    
    def matcher_avec_base(self,
                         embedding_source: np.ndarray,
                         limite_resultats: int = 10) -> Dict[str, Any]:
        """
        Matche un embedding avec toute la base de données
        
        Args:
            embedding_source: Embedding à matcher
            limite_resultats: Nombre max de résultats
            
        Returns:
            Liste de correspondances triées par score
        """
        from biometrie.models import BiometriePhoto
        
        # Récupérer toutes les photos avec encodages
        photos = BiometriePhoto.objects.filter(
            encodage_facial__isnull=False,
            est_active=True
        ).select_related('criminel')
        
        correspondances = []
        
        for photo in photos:
            try:
                # Charger l'embedding
                encodage = json.loads(photo.encodage_facial)
                embedding_bd = np.array(encodage)
                
                # Calculer la similarité
                similarite = self.calculer_similarite_cosinus(
                    embedding_source,
                    embedding_bd
                )
                
                # Calculer la distance
                distance = self.calculer_distance_euclidienne(
                    embedding_source,
                    embedding_bd
                )
                
                # Ajouter si au-dessus du seuil
                if similarite >= self.seuil_similarite:
                    correspondances.append({
                        'criminel_id': photo.criminel.id,
                        'criminel_nom': f"{photo.criminel.nom} {photo.criminel.prenom}",
                        'photo_id': photo.id,
                        'type_photo': photo.type_photo,
                        'score_similarite': float(similarite),
                        'distance': float(distance),
                        'niveau_dangerosite': photo.criminel.niveau_dangerosite
                    })
                    
            except (json.JSONDecodeError, ValueError) as e:
                print(f" Erreur encodage photo {photo.id}: {e}")
                continue
        
        # Trier par score décroissant
        correspondances.sort(key=lambda x: x['score_similarite'], reverse=True)
        
        return {
            'success': True,
            'nombre_comparaisons': photos.count(),
            'nombre_correspondances': len(correspondances),
            'correspondances': correspondances[:limite_resultats]
        }
    
    def identifier_doublons_potentiels(self, 
                                      seuil_doublon: float = 0.95) -> Dict[str, Any]:
        """
        Identifie les doublons potentiels dans la base
        
        Args:
            seuil_doublon: Seuil de similarité pour considérer un doublon
            
        Returns:
            Liste de paires de doublons potentiels
        """
        from biometrie.models import BiometriePhoto
        
        photos = BiometriePhoto.objects.filter(
            encodage_facial__isnull=False,
            est_active=True
        ).select_related('criminel')
        
        doublons = []
        photos_list = list(photos)
        
        # Comparer toutes les paires
        for i in range(len(photos_list)):
            for j in range(i + 1, len(photos_list)):
                photo1 = photos_list[i]
                photo2 = photos_list[j]
                
                # Ne pas comparer les photos du même criminel
                if photo1.criminel_id == photo2.criminel_id:
                    continue
                
                try:
                    # Charger les embeddings
                    emb1 = np.array(json.loads(photo1.encodage_facial))
                    emb2 = np.array(json.loads(photo2.encodage_facial))
                    
                    # Calculer la similarité
                    similarite = self.calculer_similarite_cosinus(emb1, emb2)
                    
                    if similarite >= seuil_doublon:
                        doublons.append({
                            'criminel1': {
                                'id': photo1.criminel.id,
                                'nom': f"{photo1.criminel.nom} {photo1.criminel.prenom}",
                                'photo_id': photo1.id
                            },
                            'criminel2': {
                                'id': photo2.criminel.id,
                                'nom': f"{photo2.criminel.nom} {photo2.criminel.prenom}",
                                'photo_id': photo2.id
                            },
                            'score_similarite': float(similarite),
                            'probabilite_doublon': 'très élevée' if similarite > 0.98 else 'élevée'
                        })
                        
                except Exception as e:
                    print(f" Erreur comparaison photos {photo1.id} et {photo2.id}: {e}")
                    continue
        
        return {
            'success': True,
            'nombre_doublons_detectes': len(doublons),
            'doublons': doublons,
            'seuil_utilise': seuil_doublon
        }
    
    def clusteriser_criminels(self, 
                             nombre_clusters: int = 5) -> Dict[str, Any]:
        """
        Groupe les criminels en clusters basés sur leurs embeddings
        
        Args:
            nombre_clusters: Nombre de clusters à créer
            
        Returns:
            Clusters de criminels similaires
        """
        from biometrie.models import BiometriePhoto
        
        try:
            from sklearn.cluster import KMeans
            from sklearn.decomposition import PCA
        except ImportError:
            return {
                'success': False,
                'erreur': 'sklearn non installé. pip install scikit-learn'
            }
        
        # Récupérer les embeddings
        photos = BiometriePhoto.objects.filter(
            encodage_facial__isnull=False,
            est_active=True,
            est_principale=True  # Une seule photo par criminel
        ).select_related('criminel')
        
        if photos.count() < nombre_clusters:
            return {
                'success': False,
                'erreur': f'Pas assez de photos ({photos.count()}) pour {nombre_clusters} clusters'
            }
        
        # Préparer les données
        embeddings_matrix = []
        criminels_info = []
        
        for photo in photos:
            try:
                embedding = np.array(json.loads(photo.encodage_facial))
                embeddings_matrix.append(embedding)
                criminels_info.append({
                    'id': photo.criminel.id,
                    'nom': f"{photo.criminel.nom} {photo.criminel.prenom}",
                    'niveau_dangerosite': photo.criminel.niveau_dangerosite
                })
            except Exception as e:
                print(f" Erreur photo {photo.id}: {e}")
                continue
        
        if len(embeddings_matrix) < nombre_clusters:
            return {
                'success': False,
                'erreur': 'Pas assez d\'embeddings valides'
            }
        
        embeddings_matrix = np.array(embeddings_matrix)
        
        # Clusterisation
        kmeans = KMeans(n_clusters=nombre_clusters, random_state=42)
        labels = kmeans.fit_predict(embeddings_matrix)
        
        # Organiser par cluster
        clusters = {}
        for idx, label in enumerate(labels):
            label_str = f"Cluster_{label + 1}"
            if label_str not in clusters:
                clusters[label_str] = []
            
            clusters[label_str].append(criminels_info[idx])
        
        # Statistiques par cluster
        stats_clusters = []
        for cluster_nom, membres in clusters.items():
            stats_clusters.append({
                'nom_cluster': cluster_nom,
                'nombre_membres': len(membres),
                'membres': membres
            })
        
        return {
            'success': True,
            'nombre_clusters': nombre_clusters,
            'clusters': stats_clusters,
            'total_criminels_clustered': len(criminels_info)
        }
    
    def rechercher_par_similarite_multiple(self,
                                          criminels_reference: List[int],
                                          limite: int = 10) -> Dict[str, Any]:
        """
        Recherche des criminels similaires à plusieurs criminels de référence
        
        Args:
            criminels_reference: Liste d'IDs de criminels de référence
            limite: Nombre max de résultats
            
        Returns:
            Criminels similaires au groupe
        """
        from biometrie.models import BiometriePhoto
        
        # Récupérer les embeddings des criminels de référence
        embeddings_ref = []
        
        for criminel_id in criminels_reference:
            photo = BiometriePhoto.objects.filter(
                criminel_id=criminel_id,
                encodage_facial__isnull=False,
                est_active=True
            ).first()
            
            if photo:
                try:
                    embedding = np.array(json.loads(photo.encodage_facial))
                    embeddings_ref.append(embedding)
                except Exception:
                    continue
        
        if not embeddings_ref:
            return {
                'success': False,
                'erreur': 'Aucun embedding trouvé pour les criminels de référence'
            }
        
        embedding_moyen = np.mean(embeddings_ref, axis=0)
        
        # Rechercher les plus proches
        resultats = self.matcher_avec_base(
            embedding_moyen,
            limite_resultats=limite
        )
        
        # Filtrer les criminels de référence
        resultats['correspondances'] = [
            c for c in resultats['correspondances']
            if c['criminel_id'] not in criminels_reference
        ]
        
        return {
            'success': True,
            'criminels_reference': criminels_reference,
            'criminels_similaires': resultats['correspondances'][:limite]
        }
    
    def analyser_reseau_visuel(self, criminel_id: int) -> Dict[str, Any]:
        """
        Analyse le réseau de criminels visuellement similaires
        
        Args:
            criminel_id: ID du criminel central
            
        Returns:
            Réseau de criminels similaires
        """
        from biometrie.models import BiometriePhoto
        
        # Récupérer la photo principale du criminel
        photo_principale = BiometriePhoto.objects.filter(
            criminel_id=criminel_id,
            encodage_facial__isnull=False,
            est_active=True
        ).first()
        
        if not photo_principale:
            return {
                'success': False,
                'erreur': 'Aucune photo biométrique disponible'
            }
        
        try:
            embedding_central = np.array(json.loads(photo_principale.encodage_facial))
        except Exception:
            return {
                'success': False,
                'erreur': 'Encodage invalide'
            }
        
        # Rechercher les similaires
        resultats = self.matcher_avec_base(embedding_central, limite_resultats=20)
        
        if not resultats['success']:
            return resultats
        
        # Organiser en niveaux de similarité
        reseau = {
            'criminel_central': {
                'id': criminel_id,
                'nom': f"{photo_principale.criminel.nom} {photo_principale.criminel.prenom}"
            },
            'similarite_tres_elevee': [],  # > 0.9
            'similarite_elevee': [],        # 0.8 - 0.9
            'similarite_moyenne': []        # 0.6 - 0.8
        }
        
        for match in resultats['correspondances']:
            if match['criminel_id'] == criminel_id:
                continue
            
            score = match['score_similarite']
            
            if score > 0.9:
                reseau['similarite_tres_elevee'].append(match)
            elif score > 0.8:
                reseau['similarite_elevee'].append(match)
            else:
                reseau['similarite_moyenne'].append(match)
        
        return {
            'success': True,
            'reseau': reseau,
            'statistiques': {
                'total_similaires': len(resultats['correspondances']) - 1,
                'tres_elevee': len(reseau['similarite_tres_elevee']),
                'elevee': len(reseau['similarite_elevee']),
                'moyenne': len(reseau['similarite_moyenne'])
            }
        }
    
    def evaluer_qualite_embeddings(self) -> Dict[str, Any]:
        """
        Évalue la qualité des embeddings dans la base
        
        Returns:
            Statistiques de qualité
        """
        from biometrie.models import BiometriePhoto
        
        photos = BiometriePhoto.objects.filter(
            encodage_facial__isnull=False,
            est_active=True
        )
        
        total_photos = photos.count()
        embeddings_valides = 0
        embeddings_invalides = 0
        qualites = []
        
        for photo in photos:
            try:
                embedding = json.loads(photo.encodage_facial)
                
                # Vérifier la structure
                if isinstance(embedding, list) and len(embedding) == 512:
                    embeddings_valides += 1
                    
                    # Vérifier la qualité de la photo
                    if photo.qualite:
                        qualites.append(photo.qualite)
                else:
                    embeddings_invalides += 1
                    
            except Exception:
                embeddings_invalides += 1
        
        return {
            'success': True,
            'total_photos': total_photos,
            'embeddings_valides': embeddings_valides,
            'embeddings_invalides': embeddings_invalides,
            'taux_validite': round((embeddings_valides / total_photos * 100), 2) if total_photos > 0 else 0,
            'qualite_moyenne_photos': round(np.mean(qualites), 2) if qualites else 0,
            'qualite_min': min(qualites) if qualites else 0,
            'qualite_max': max(qualites) if qualites else 0
        }

