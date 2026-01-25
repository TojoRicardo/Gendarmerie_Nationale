import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import ListeUtilisateurs from '../../components/utilisateurs/ListeUtilisateurs'
import {
  Users, TrendingUp, UserCheck, UserX, Activity, ShieldCheck, Plus
} from 'lucide-react'
import { useNotification } from '../context/NotificationContext';

// Utiliser le service authService au lieu d'une URL hardcodée
import { suspendUser, restoreUser, deleteUser } from '../services/authService'
import { getDashboardUserStats } from '../services/statsService'
import { useAuth } from '../context/AuthContext'

const Utilisateurs = () => {
  const navigate = useNavigate()
  const notification = useNotification();
  const { utilisateur } = useAuth();
  const [refreshKey, setRefreshKey] = useState(0);
  const [statsLoading, setStatsLoading] = useState(true);
  const [statsData, setStatsData] = useState(null);
  
  // Vérifier si l'utilisateur est administrateur
  const isAdmin = useMemo(() => {
    if (!utilisateur) return false
    if (utilisateur.is_superuser || utilisateur.is_staff) return true
    const role = (utilisateur.role_code || utilisateur.role || '').toLowerCase()
    return role === 'admin' || role.includes('administrateur')
  }, [utilisateur])

  // Charger les statistiques réelles depuis l'API du dashboard
  useEffect(() => {
    const loadStats = async () => {
      try {
        setStatsLoading(true);
        // Utiliser l'endpoint dédié du dashboard qui utilise last_login
        const stats = await getDashboardUserStats();
        // Adapter les données du backend au format attendu par le frontend
        setStatsData({
          total: stats.total_utilisateurs || 0,
          actifs: stats.utilisateurs_actifs || 0,
          inactifs: stats.utilisateurs_inactifs || 0,
          roles_actifs: stats.roles_actifs || 0,
          // Pas d'évolution pour le moment (peut être ajouté plus tard)
          evolution_total: '0%',
          evolution_total_positive: true,
          evolution_actifs: '0%',
          evolution_actifs_positive: true,
          evolution_inactifs: '0%',
          evolution_inactifs_positive: true,
          // Stocker aussi les données brutes pour référence
          utilisateur_connecte: stats.utilisateur_connecte
        });
      } catch (error) {
        console.error('Erreur lors du chargement des stats dashboard:', error);
        // En cas d'erreur, utiliser des valeurs par défaut à 0
        setStatsData({
          total: 0,
          actifs: 0,
          inactifs: 0,
          roles_actifs: 0,
          evolution_total: '0%',
          evolution_total_positive: true,
          evolution_actifs: '0%',
          evolution_actifs_positive: true,
          evolution_inactifs: '0%',
          evolution_inactifs_positive: true,
          utilisateur_connecte: null
        });
      } finally {
        setStatsLoading(false);
      }
    };

    loadStats();
  }, [refreshKey]); // Recharger quand refreshKey change

  // Construire les statistiques depuis les données réelles de l'API
  const statistiques = [
    {
      titre: 'Total Utilisateurs',
      valeur: statsData?.total?.toString() || '0',
      evolution: statsData?.evolution_total || statsData?.evolution || '0%',
      hausse: statsData?.evolution_total_positive !== false && statsData?.evolution_positive !== false,
      icone: Users,
      couleur: 'blue',
      details: 'Comptes enregistrés'
    },
    {
      titre: 'Actifs',
      valeur: statsData?.actifs?.toString() || '0',
      evolution: statsData?.evolution_actifs || '0%',
      hausse: statsData?.evolution_actifs_positive !== false,
      icone: UserCheck,
      couleur: 'emerald',
      details: 'Connectés cette semaine'
    },
    {
      titre: 'Inactifs',
      valeur: statsData?.inactifs?.toString() || '0',
      evolution: statsData?.evolution_inactifs || '0%',
      hausse: statsData?.evolution_inactifs_positive === true,
      icone: UserX,
      couleur: 'orange',
      details: 'Pas de connexion récente'
    },
    {
      titre: 'Rôles Actifs',
      valeur: statsData?.roles_actifs?.toString() || '0',
      evolution: '0%',
      hausse: true,
      icone: ShieldCheck,
      couleur: 'purple',
      details: 'Types de permissions'
    },
  ]

  const handleCreer = () => {
    navigate('/utilisateurs/creer')
  }

  const handleModifier = (utilisateur) => {
    // Naviguer vers la page de modification avec l'ID de l'utilisateur
    navigate(`/utilisateurs/modifier/${utilisateur.id}`)
  }

  const handleSupprimer = async (utilisateur) => {
    if (!isAdmin) {
      notification.showError('Permission refusée : seuls les administrateurs peuvent suspendre un utilisateur.')
      return
    }
    try {
      // Affiche la popup de confirmation et attends la réponse
      const confirmed = await notification.showConfirm({
        title: 'Suspension d\'utilisateur',
        message: `Voulez-vous vraiment suspendre l'utilisateur "${utilisateur.username || utilisateur.email}" ?\n\nSon compte sera désactivé mais toutes les données seront conservées.\nSeul un administrateur pourra restaurer ce compte.`
      });

      if (!confirmed) return; // Si l'utilisateur annule, on ne fait rien

      // Appel API pour suspendre l'utilisateur
      const result = await suspendUser(utilisateur.id);

      // Actualiser automatiquement la liste après suspension
      setRefreshKey(prevKey => prevKey + 1);

      // Afficher un message de succès
      notification.showSuccess(result.message || 'Utilisateur suspendu avec succès!')
      
      // Les statistiques seront automatiquement rechargées car refreshKey change

    } catch (error) {
      // Extraire le message d'erreur de manière plus robuste
      let errorMessage = 'Erreur lors de la suppression de l\'utilisateur.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail;
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        }
      } else if (!error.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
      }
      
      // Si le statut est 500, afficher un message plus explicite
      if (error.response?.status === 500) {
        errorMessage = 'Une erreur serveur est survenue lors de la suspension. Veuillez rafraîchir la page.';
      }
      
      notification.showError(errorMessage);
      
      // Rafraîchir la liste
      setRefreshKey(prevKey => prevKey + 1);
    }
  };

  const handleRestaurer = async (utilisateur) => {
    if (!isAdmin) {
      notification.showError('Permission refusée : seuls les administrateurs peuvent restaurer un utilisateur.')
      return
    }
    try {
      // Vérifier que l'utilisateur est bien suspendu
      if (utilisateur.statut !== 'suspendu') {
        notification.showError('Cet utilisateur n\'est pas suspendu.');
        return;
      }

      // Affiche la popup de confirmation
      const confirmed = await notification.showConfirm({
        title: 'Restaurer l\'utilisateur',
        message: `Voulez-vous restaurer l'utilisateur "${utilisateur.username || utilisateur.email}" ?\n\nSon compte sera réactivé et il pourra à nouveau se connecter.`
      });

      if (!confirmed) return;

      // Appel API pour restaurer l'utilisateur
      const result = await restoreUser(utilisateur.id);

      // Actualiser automatiquement la liste après restauration
      setRefreshKey(prevKey => prevKey + 1);

      // Afficher un message de succès
      notification.showSuccess(result.message || 'Utilisateur restauré avec succès!')
      
      // Les statistiques seront automatiquement rechargées car refreshKey change
    } catch (error) {
      let errorMessage = 'Erreur lors de la restauration de l\'utilisateur.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        }
      }
      
      notification.showError(errorMessage);
      
      // Rafraîchir la liste
      setRefreshKey(prevKey => prevKey + 1);
    }
  };

  const handleSupprimerDefinitif = async (utilisateur) => {
    if (!isAdmin) {
      notification.showError({
        title: 'Permission refusée',
        message: 'Seuls les administrateurs peuvent supprimer des utilisateurs.'
      })
      return
    }

    try {
      const confirmed = await notification.showConfirm({
        title: 'Suppression définitive',
        message: `Cette action supprimera définitivement "${utilisateur.username || utilisateur.email}".\n\nToutes ses données seront perdues. Confirmez-vous la suppression ?`,
        confirmText: 'Supprimer',
        type: 'danger',
      })

      if (!confirmed) return

      const result = await deleteUser(utilisateur.id)
      notification.showSuccess({
        title: 'Suppression réussie',
        message: result.message || 'Utilisateur supprimé avec succès.'
      })
      setRefreshKey(prev => prev + 1)
    } catch (error) {
      let errorMessage = 'Erreur lors de la suppression de l\'utilisateur.'

      if (error.message) {
        errorMessage = error.message
      } else if (error.response?.data) {
        if (error.response.data.error) {
          errorMessage = error.response.data.error
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message
        } else if (error.response.data.detail) {
          errorMessage = error.response.data.detail
        } else if (typeof error.response.data === 'string') {
          errorMessage = error.response.data
        }
      } else if (!error.response) {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.'
      }

      // Message spécifique pour 403
      if (error.response?.status === 403) {
        errorMessage = 'Vous n\'avez pas les droits pour supprimer cet utilisateur. Seul un administrateur peut effectuer cette action.'
      }

      notification.showError({
        title: 'Erreur de suppression',
        message: errorMessage
      })
    }
  }


  const handleVoir = (utilisateur) => {
    navigate(`/utilisateurs/voir/${utilisateur.id}`)
  }

  return (
    <div className="space-y-6">
      {/* Statistiques en cartes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {statsLoading ? (
          // Affichage du chargement
          Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="stat-card group animate-pulse">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-3 rounded-xl bg-gray-200 w-12 h-12"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="flex items-baseline justify-between mb-2">
                <div className="h-8 bg-gray-200 rounded w-16"></div>
                <div className="h-4 bg-gray-200 rounded w-12"></div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-32"></div>
            </div>
          ))
        ) : (
          // Affichage des statistiques réelles
          statistiques.map((stat, index) => {
            const Icone = stat.icone
            return (
              <div
                key={index}
                className="stat-card group"
              >
                {/* En-tête avec icône et titre */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className={`p-3 rounded-xl bg-${stat.couleur}-100`}>
                    <Icone className={`text-${stat.couleur}-600`} size={24} />
                  </div>
                  <p className="text-sm font-bold text-gray-700">{stat.titre}</p>
                </div>

                {/* Valeur et évolution */}
                <div className="flex items-baseline justify-between mb-2">
                  <p className="text-2xl font-bold text-gray-900">{stat.valeur}</p>
                  <span className={`text-sm font-semibold flex items-center ${stat.hausse ? 'text-emerald-500' : 'text-red-500'}`}>
                    <TrendingUp size={16} className="mr-1" />
                    {stat.evolution}
                  </span>
                </div>

                {/* Détails */}
                <p className="text-xs text-gray-500">{stat.details}</p>
              </div>
            )
          })
        )}
      </div>

      {/* Liste des utilisateurs */}
      <div className="card-pro p-6">
        <ListeUtilisateurs
          key={refreshKey}
          onCreer={handleCreer}
          onModifier={handleModifier}
          onSupprimer={handleSupprimer}
          onRestaurer={isAdmin ? handleRestaurer : null}
          onSupprimerDefinitif={isAdmin ? handleSupprimerDefinitif : null}
          onVoir={handleVoir}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  )
}

export default Utilisateurs

