import React from 'react'
import { useNavigate } from 'react-router-dom'
import ListeFichesCriminelles from '../../components/fiches-criminelles/ListeFichesCriminelles'
import { AlertTriangle } from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import * as criminalFilesService from '../services/criminalFilesService'
import { usePermissions } from '../hooks/usePermissions'
import { useAuth } from '../context/AuthContext'
import { PERMISSIONS } from '../utils/permissions'

const FichesCriminelles = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const { utilisateur } = useAuth()
  const { hasPermission, canModify, canDelete, displayRestrictions, isObservateur, isAnalyste, isEnqueteurPrincipal, isAdmin } = usePermissions()
  const handleCreer = () => {
    navigate('/fiches-criminelles/creer')
  }

  const handleModifier = (fiche) => {
    if (!canModify(fiche.created_by)) {
      // Message d'erreur amélioré et contextuel
      let message = 'Vous n\'avez pas la permission de modifier cette fiche criminelle.'
      if (!hasPermission(PERMISSIONS.FICHES_EDIT)) {
        message += ' Votre rôle actuel ne vous permet pas de modifier des fiches criminelles. Contactez un administrateur si vous avez besoin de cette permission.'
      } else if (fiche?.created_by && utilisateur?.id !== fiche.created_by && !isEnqueteurPrincipal && !isAdmin) {
        message += ' Cette fiche a été créée par un autre utilisateur. Seuls les administrateurs, les Enquêteurs Principaux et le créateur de la fiche peuvent la modifier.'
      }
      notification.showError({
        title: 'Permission refusée',
        message: message
      })
      return
    }
    navigate(`/fiches-criminelles/modifier/${fiche.id}`)
  }

  const handleSupprimer = async (fiche) => {
    if (!canDelete(fiche.created_by)) {
      let message = 'Vous n\'avez pas la permission d\'archiver cette fiche criminelle.'
      if (fiche?.created_by && utilisateur?.id !== fiche.created_by) {
        message += ' Cette fiche a été créée par un autre utilisateur.'
      } else if (!hasPermission(PERMISSIONS.FICHES_DELETE)) {
        message += ' Votre rôle actuel ne vous permet pas d\'archiver des fiches criminelles.'
      }
      notification.showError({
        title: 'Permission refusée',
        message: message
      })
      return
    }
    
    // Confirmation d'archivage
    const confirmed = await notification.showConfirm({
      title: 'Confirmation d\'archivage',
      message: `Êtes-vous sûr de vouloir archiver la fiche criminelle de "${fiche.nom} ${fiche.prenom}" (N° ${fiche.numero_fiche}) ?\n\nLa fiche sera masquée de la liste mais restera disponible dans les archives.`
    })
    
    if (!confirmed) return
    
    try {
      const result = await criminalFilesService.deleteCriminalFile(fiche.id)
      
      notification.showSuccess({
        title: 'Archivage réussi',
        message: result.message || `La fiche criminelle "${result.nom_complet || fiche.nom + ' ' + fiche.prenom}" (N° ${result.numero_fiche || fiche.numero_fiche}) a été archivée avec succès.`
      })
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error) {
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ERR_CONNECTION_REFUSED') {
        if (error.response?.status !== 500 && error.response?.status !== 403 && error.response?.status !== 404) {
          console.error('Erreur archivage fiche:', error)
        }
      }
      
      const errorMessage = error.message || error.response?.data?.message || 'Erreur lors de l\'archivage de la fiche'
      notification.showError({
        title: 'Erreur d\'archivage',
        message: errorMessage
      })
    }
  }

  const handleDesarchiver = async (fiche) => {
    if (!canDelete(fiche.created_by)) {
      let message = 'Vous n\'avez pas la permission de désarchiver cette fiche criminelle.'
      if (!hasPermission(PERMISSIONS.FICHES_DELETE)) {
        message += ' Votre rôle actuel ne vous permet pas de désarchiver des fiches criminelles. Seuls les administrateurs peuvent effectuer cette action.'
      }
      notification.showError({
        title: 'Permission refusée',
        message: message
      })
      return
    }
    
    // Confirmation de désarchivage
    const confirmed = await notification.showConfirm({
      title: 'Confirmation de désarchivage',
      message: `Êtes-vous sûr de vouloir désarchiver la fiche criminelle de "${fiche.nom} ${fiche.prenom}" (N° ${fiche.numero_fiche}) ?\n\nLa fiche sera restaurée dans la liste des fiches actives.`
    })
    
    if (!confirmed) return
    
    try {
      const result = await criminalFilesService.unarchiveCriminalFile(fiche.id)
      
      notification.showSuccess({
        title: 'Désarchivage réussi',
        message: result.message || `La fiche criminelle "${result.nom_complet || fiche.nom + ' ' + fiche.prenom}" (N° ${result.numero_fiche || fiche.numero_fiche}) a été désarchivée avec succès.`
      })
      
      setTimeout(() => {
        window.location.reload()
      }, 1500)
      
    } catch (error) {
      if (error.code !== 'ERR_NETWORK' && error.code !== 'ERR_CONNECTION_REFUSED') {
        if (error.response?.status !== 500 && error.response?.status !== 403 && error.response?.status !== 404) {
          console.error('Erreur désarchivage fiche:', error)
        }
      }
      
      let errorTitle = 'Erreur de désarchivage'
      let errorMessage = 'Erreur lors du désarchivage de la fiche criminelle'
      
      // Utiliser le gestionnaire d'erreurs centralisé
      const { getErrorMessage, isNetworkError } = await import('../utils/errorHandler')
      const errorInfo = getErrorMessage(error)
      
      if (error.message && !isNetworkError(error)) {
        errorMessage = error.message
      } else if (isNetworkError(error)) {
        errorTitle = errorInfo.title
        errorMessage = errorInfo.message
      } else if (error.response?.status === 500) {
        errorTitle = 'Erreur serveur'
        errorMessage = 'Une erreur serveur est survenue. Veuillez réessayer plus tard.'
      } else if (error.response?.status === 403) {
        errorTitle = 'Permission refusée'
        errorMessage = 'Vous n\'avez pas les permissions nécessaires pour désarchiver cette fiche.'
      }
      
      notification.showError({
        title: errorTitle,
        message: errorMessage
      })
    }
  }

  const handleVoir = (fiche) => {
    navigate(`/fiches-criminelles/voir/${fiche.id}`)
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Message pour Analyste Judiciaire */}
      {isAnalyste && (
        <div className="card-pro p-5 bg-gradient-to-r from-purple-50 to-indigo-50 border-l-4 border-purple-600">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-purple-600 rounded-lg">
              <AlertTriangle className="text-white" size={24} />
            </div>
            <div>
              <p className="font-bold text-purple-900 text-lg mb-1">Mode Analyste Judiciaire - Consultation Uniquement</p>
              <p className="text-purple-800 text-sm">
                Vous avez accès en <strong>lecture seule</strong> à toutes les fiches pour analyses statistiques.
                Vous ne pouvez <strong>ni créer, ni modifier, ni supprimer</strong> de fiches. Génération de rapports et exports disponibles.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Message pour Observateur Externe */}
      {isObservateur && (
        <div className="card-pro p-5 bg-gradient-to-r from-amber-50 to-orange-50 border-l-4 border-amber-600">
          <div className="flex items-start space-x-3">
            <div className="p-2 bg-amber-600 rounded-lg">
              <AlertTriangle className="text-white" size={24} />
            </div>
            <div>
              <p className="font-bold text-amber-900 text-lg mb-1">Accès Observateur Externe (Magistrat)</p>
              <p className="text-amber-800 text-sm">
                Vous avez accès en <strong>lecture seule</strong> aux enquêtes clôturées et rapports validés.
                Aucune modification, ajout ou suppression n'est possible. Export PDF autorisé.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Liste des fiches */}
      <div className="card-pro p-6">
        <ListeFichesCriminelles
          onCreer={handleCreer}
          onModifier={handleModifier}
          onSupprimer={handleSupprimer}
          onDesarchiver={handleDesarchiver}
          onVoir={handleVoir}
        />
      </div>
    </div>
  )
}

export default FichesCriminelles

