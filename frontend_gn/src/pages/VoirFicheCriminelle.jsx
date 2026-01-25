import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useLocation } from 'react-router-dom'
import { 
  FileText, User, MapPin, Calendar, AlertTriangle, ArrowLeft, Edit,
  Clock, Info, Shield, Download, Bell, X, Sparkles, Trash2, Edit2, ArchiveRestore
} from 'lucide-react'
import { usePermissions } from '../hooks/usePermissions'
import { useAuth } from '../context/AuthContext'
import { useNotification } from '../context/NotificationContext'
import { PERMISSIONS } from '../utils/permissions'
import { getCriminalFileById, deleteCriminalFile, unarchiveCriminalFile } from '../services/criminalFilesService'
import { downloadFicheCriminellePDF } from '../services/reportsService'
import { showError, MESSAGES } from '../utils/notifications'
import { 
  formatDate, 
  formatDateTime, 
  getValueOrPlaceholder,
  getStatutBadgeClasses,
  getDangerBadgeClasses
} from '../utils/formatters'
import '../styles/fiche-animations.css'
import '../styles/theme-colors.css'

const VoirFicheCriminelle = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const location = useLocation()
  const { utilisateur } = useAuth()
  const { hasPermission, canModify, canDelete, displayRestrictions, isEnqueteurPrincipal, isAdmin } = usePermissions()
  const notification = useNotification()
  const [showNotificationBanner, setShowNotificationBanner] = useState(false)
  
  // Récupérer les données de la notification si présentes
  const notificationData = location.state || {}
  
  useEffect(() => {
    // Afficher le banner si venant d'une notification
    if (notificationData.fromNotification) {
      setShowNotificationBanner(true)
      // Masquer automatiquement après 5 secondes
      const timer = setTimeout(() => {
        setShowNotificationBanner(false)
      }, 5000)
      return () => clearTimeout(timer)
    }
  }, [notificationData.fromNotification])

  // État de chargement
  const [chargement, setChargement] = useState(true)

  // Fetch fiche data from API
  useEffect(() => {
    const fetchFicheData = async () => {
      setChargement(true)
      try {
        const response = await getCriminalFileById(id)
        
        // Adapter les données de l'API au format attendu - TOUS LES CHAMPS
        const ficheData = {
          id: response.id,
          numeroDossier: response.numero_fiche || '',
          
          // Identification complète
          nom: response.nom || '',
          prenom: response.prenom || '',
          surnom: response.surnom || '',
          sexe: response.sexe || 'H',
          date_naissance: response.date_naissance || '',
          lieu_naissance: response.lieu_naissance || '',
          nationalite: response.nationalite || '',
          cin: response.cin || '',
          
          // Description physique
          corpulence: response.corpulence || '',
          corpulence_display: response.corpulence_display || '',
          cheveux: response.cheveux || '',
          cheveux_display: response.cheveux_display || '',
          visage: response.visage || '',
          visage_display: response.visage_display || '',
          barbe: response.barbe || '',
          barbe_display: response.barbe_display || '',
          marques_particulieres: response.marques_particulieres || '',
          
          // Filiation
          nom_pere: response.nom_pere || '',
          nom_mere: response.nom_mere || '',
          
          // Coordonnées
          adresse: response.adresse || '',
          contact: response.contact || '',
          
          // Informations professionnelles
          profession: response.profession || '',
          service_militaire: response.service_militaire || '',
          
          // Informations judiciaires
          motif_arrestation: response.motif_arrestation || '',
          date_arrestation: response.date_arrestation || '',
          lieu_arrestation: response.lieu_arrestation || '',
          unite_saisie: response.unite_saisie || '',
          reference_pv: response.reference_pv || '',
          suite_judiciaire: response.suite_judiciaire || '',
          peine_encourue: response.peine_encourue || '',
          antecedent_judiciaire: response.antecedent_judiciaire || '',
          
          // Pour compatibilité avec l'ancienne structure
          description: response.motif_arrestation || response.antecedent_judiciaire || '',
          suspect: {
            nom: response.nom || '',
            prenom: response.prenom || '',
            dateNaissance: response.date_naissance || '',
            nationalite: response.nationalite || '',
            adresse: response.adresse || ''
          },
          
          // Autres champs
          infractions: Array.isArray(response.infractions) ? response.infractions : [],
          lieu: response.lieu_arrestation || response.adresse || '',
          dateOuverture: response.date_arrestation || response.date_creation || '',
          statut: response.statut_fiche?.code || 'en_cours',
          niveauDanger: 'moyen',
          enqueteur: response.created_by_username || utilisateur?.email || '',
          derniereModification: response.date_modification || response.date_creation || '',
          created_by: response.created_by,
          is_archived: response.is_archived || false,
          statut_fiche: response.statut_fiche
        }
        
        setFiche(ficheData)
      } catch (error) {
        // Vérifier si c'est une erreur de connexion refusée
        const isConnectionError = 
          error.code === 'ERR_CONNECTION_REFUSED' ||
          error.code === 'ERR_NETWORK' ||
          error.message?.includes('CONNECTION_REFUSED') ||
          error.message?.includes('Pas de réponse du serveur') ||
          (error.request && !error.response)
        
        // Utiliser le gestionnaire d'erreurs centralisé
        const { getErrorMessage, isNetworkError } = await import('../utils/errorHandler')
        
        if (isConnectionError || isNetworkError(error)) {
          const errorInfo = getErrorMessage(error)
          if (notification?.showError) {
            notification.showError({
              title: errorInfo.title,
              message: errorInfo.message
            })
          } else {
            showError(errorInfo.message)
          }
        } else {
          // Autres erreurs
          console.error('Erreur chargement fiche:', error)
          const errorMessage = error.response?.data?.message || error.response?.data?.error || error.message || 'Impossible de charger les détails de la fiche'
          if (notification?.showError) {
            notification.showError({
              title: 'Erreur de chargement',
              message: errorMessage
            })
          } else {
            showError(errorMessage)
          }
        }
      } finally {
        setChargement(false)
      }
    }
    
    if (id) {
      fetchFicheData()
    }
  }, [id, utilisateur])

  // Initialize fiche data
  const [fiche, setFiche] = useState({
    id: id,
    numeroDossier: '',
    description: '',
    suspect: { 
      nom: '', 
      prenom: '',
      dateNaissance: '',
      nationalite: '',
      adresse: ''
    },
    infractions: [],
    lieu: '',
    dateOuverture: '',
    statut: '',
    niveauDanger: '',
    enqueteur: '',
    derniereModification: '',
    created_by: null
  })
  
  // Vérifier si l'utilisateur peut modifier cette fiche
  const peutModifier = hasPermission(PERMISSIONS.FICHES_EDIT) && canModify(fiche.created_by) && displayRestrictions.showEditButtons
  
  // Vérifier si l'utilisateur peut supprimer cette fiche
  // Ne pas permettre la suppression si la fiche est déjà archivée
  const peutSupprimer = !fiche.is_archived && 
                        hasPermission(PERMISSIONS.FICHES_DELETE) && 
                        canDelete(fiche.created_by) && 
                        displayRestrictions.showDeleteButtons

  // Vérifier si l'utilisateur peut désarchiver cette fiche
  // Permettre le désarchivage si la fiche est archivée et que l'utilisateur a les permissions
  const peutDesarchiver = fiche.is_archived && 
                          hasPermission(PERMISSIONS.FICHES_DELETE) && 
                          canDelete(fiche.created_by) && 
                          displayRestrictions.showDeleteButtons

  const statut = getStatutBadgeClasses(fiche.statut)
  const danger = getDangerBadgeClasses(fiche.niveauDanger)

  const telechargerPDF = async () => {
    try {
      // Utiliser le service API pour télécharger le PDF version 2 (layout 3 pages Interpol/CIA/FBI)
      const result = await downloadFicheCriminellePDF(id, true) // true = utiliser la version 2
      
      // Afficher un message de succès seulement si le résultat indique un succès
      if (result && result.success) {
        // Ne pas afficher de notification de succès pour éviter de polluer l'interface
        // Le téléchargement du fichier est suffisant comme indicateur de succès
        return
      }
    } catch (error) {
      console.error('Erreur lors du téléchargement du PDF:', error)
      // Ne pas afficher d'erreur si c'est juste un avertissement réseau
      // (le téléchargement peut avoir réussi malgré l'erreur CORS)
      if (error.code === 'ERR_NETWORK' || error.code === 'ERR_CANCELED') {
        // Ne pas afficher d'erreur, le téléchargement peut avoir réussi
        return
      }
      
      const errorMessage = error.message || error.response?.data?.message || 'Impossible de télécharger le PDF. Veuillez réessayer.'
      if (notification?.showError) {
        notification.showError({
          title: 'Erreur de téléchargement',
          message: errorMessage
        })
      } else {
        showError(errorMessage)
      }
    }
  }

  // Afficher un indicateur de chargement
  if (chargement) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-gendarme-blue mx-auto mb-4"></div>
          <p className="text-gray-600 font-semibold">Chargement des détails...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen page-background">
      <div className="sgic-container space-y-8 py-8">
        {/* Banner de notification */}
        {showNotificationBanner && notificationData.fromNotification && (
        <div className="relative bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 text-white rounded-2xl shadow-2xl border-2 border-blue-400 p-4 animate-slideInDown">
          <div className="flex items-start space-x-4">
            <div className="flex-shrink-0">
              <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                <Bell className="text-white animate-pulse-subtle" size={24} />
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-bold text-lg mb-1"> Vous venez d'une notification</h3>
              <p className="text-blue-100 text-sm">{notificationData.message}</p>
              <p className="text-xs text-blue-200 mt-2">
                Cette fiche a été ouverte suite à votre notification. Le contenu ci-dessous correspond à la fiche #{id}.
              </p>
            </div>
            <button
              onClick={() => setShowNotificationBanner(false)}
              className="flex-shrink-0 p-2 hover:bg-white/20 rounded-lg transition-all"
              title="Fermer"
            >
              <X size={20} className="text-white" />
            </button>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-200 overflow-hidden">
        <div className="overlay-primary px-8 py-10">
          <div className="flex items-center gap-6">
            <button
              onClick={() => navigate('/fiches-criminelles')}
              className="p-3 bg-white/20 hover:bg-white/30 rounded-xl transition-colors backdrop-blur-sm"
            >
              <ArrowLeft size={24} className="text-white" />
            </button>
            <div className="flex-1">
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-white/20 rounded-xl backdrop-blur-md">
                  <FileText className="text-white" size={32} />
                </div>
                <h1 className="text-4xl font-black text-white tracking-tight">
                  {fiche.numeroDossier}
                </h1>
              </div>
              <p className="text-white/95 text-lg font-medium">Fiche Criminelle Détaillée</p>
            </div>
          </div>
        </div>
      </div>

      {/* Badges de statut */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border-l-4" style={{borderLeftColor: '#0B78F4'}}>
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Statut</span>
            <span className={`ml-auto px-6 py-2.5 rounded-lg text-sm font-black ${statut.bg} ${statut.text}`}>
              {statut.label}
            </span>
          </div>
          <div className="flex items-center gap-4 p-5 bg-gray-50 rounded-xl border-l-4 border-red-500">
            <AlertTriangle size={20} className={danger.text} />
            <span className="text-sm font-bold text-gray-700 uppercase tracking-wide">Niveau de danger</span>
            <span className={`ml-auto px-6 py-2.5 rounded-lg text-sm font-black ${danger.bg} ${danger.text}`}>
              {danger.label}
            </span>
          </div>
        </div>
      </div>

      {/* Grille 2 colonnes standardisée SGIC */}
      <div className="sgic-grid-2cols">
        {/* Colonne principale */}
        <div className="space-y-8">
          {/* Description */}
          <div className="sgic-box">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg" style={{background: '#0B78F4'}}>
                <Info className="text-white" size={24} />
              </div>
              <h2 className="text-subtitle font-bold text-gray-900">Description</h2>
            </div>
            <div className={`leading-relaxed text-base ${fiche.description ? 'text-gray-700' : 'text-gray-400 italic'}`}>
              {getValueOrPlaceholder(fiche.description, 'Aucune description disponible')}
            </div>
          </div>

          {/* Infractions */}
          <div className="sgic-box">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg bg-red-500">
                <AlertTriangle className="text-white" size={24} />
              </div>
              <h2 className="text-subtitle font-bold text-gray-900">Infractions</h2>
            </div>
            <div className="space-y-4">
              {fiche.infractions && fiche.infractions.length > 0 ? (
                fiche.infractions.map((infraction, index) => (
                  <div key={index} className="p-5 bg-red-50 rounded-lg border-l-4 border-red-500 hover:bg-red-100 transition-colors">
                    <div className="flex items-start gap-3">
                      <AlertTriangle size={20} className="text-red-500 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-gray-900 mb-1">
                          {infraction.type_infraction_libelle || infraction.type || 'Infraction'}
                        </h3>
                        {infraction.description && (
                          <p className="text-sm text-gray-700 leading-relaxed mb-2">
                            {infraction.description}
                          </p>
                        )}
                        {infraction.date_infraction && (
                          <div className="flex items-center gap-2 text-xs text-gray-600 font-medium">
                            <Calendar size={14} />
                            <span>{formatDate(infraction.date_infraction)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                  <AlertTriangle size={40} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">Aucune infraction enregistrée</p>
                </div>
              )}
            </div>
          </div>

          {/* Informations sur le suspect */}
          <div className="sgic-box">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-lg" style={{background: '#0B78F4'}}>
                <User className="text-white" size={24} />
              </div>
              <h2 className="text-subtitle font-bold text-gray-900">Informations sur le Suspect</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <User size={14} /> Nom complet
                </label>
                <p className="text-lg font-bold text-gray-900">
                  {getValueOrPlaceholder(
                    fiche.suspect.nom && fiche.suspect.prenom 
                      ? `${fiche.suspect.nom} ${fiche.suspect.prenom}` 
                      : fiche.suspect.nom || fiche.suspect.prenom,
                    'Non renseigné'
                  )}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <Calendar size={14} /> Date de naissance
                </label>
                <p className={`text-lg font-bold ${formatDate(fiche.suspect.dateNaissance) === 'Non renseignée' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {formatDate(fiche.suspect.dateNaissance)}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Nationalité
                </label>
                <p className={`text-lg font-bold ${!fiche.suspect.nationalite ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {getValueOrPlaceholder(fiche.suspect.nationalite)}
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2">
                  <MapPin size={14} /> Adresse
                </label>
                <p className={`text-lg font-bold ${!fiche.suspect.adresse ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {getValueOrPlaceholder(fiche.suspect.adresse)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-8">
          {/* Informations du dossier */}
          <div className="sgic-box">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2.5 rounded-lg" style={{background: '#0B78F4'}}>
                <FileText className="text-white" size={20} />
              </div>
              <h3 className="text-xl font-bold text-gray-900">Informations du Dossier</h3>
            </div>
            <div className="space-y-5">
              <div className="pb-5 border-b border-gray-200">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Calendar size={14} />
                  Date d'ouverture
                </label>
                <p className={`font-bold text-base ${formatDate(fiche.dateOuverture) === 'Non renseignée' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {formatDate(fiche.dateOuverture)}
                </p>
              </div>
              <div className="pb-5 border-b border-gray-200">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <MapPin size={14} />
                  Lieu
                </label>
                <p className={`font-bold text-base ${!fiche.lieu ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {getValueOrPlaceholder(fiche.lieu)}
                </p>
              </div>
              <div className="pb-5 border-b border-gray-200">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Shield size={14} />
                  Enquêteur responsable
                </label>
                <p className={`font-bold text-base ${!fiche.enqueteur ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {getValueOrPlaceholder(fiche.enqueteur)}
                </p>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <Clock size={14} />
                  Dernière modification
                </label>
                <p className={`font-bold text-base ${formatDateTime(fiche.derniereModification) === 'Non renseignée' ? 'text-gray-400 italic' : 'text-gray-900'}`}>
                  {formatDateTime(fiche.derniereModification)}
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white rounded-xl shadow-md border border-gray-200 p-7">
            <h3 className="text-xl font-bold text-gray-900 mb-6">Actions</h3>
            <div className="space-y-3">
              {/* Bouton Modifier */}
              <button
                onClick={() => {
                  if (!peutModifier) {
                    // Message d'erreur amélioré et contextuel
                    let message = 'Vous n\'avez pas la permission de modifier cette fiche criminelle.';
                    if (!hasPermission(PERMISSIONS.FICHES_EDIT)) {
                      message += ' Votre rôle actuel ne vous permet pas de modifier des fiches criminelles. Contactez un administrateur si vous avez besoin de cette permission.';
                    } else if (fiche?.created_by && utilisateur?.id !== fiche.created_by && !isEnqueteurPrincipal && !isAdmin) {
                      message += ' Cette fiche a été créée par un autre utilisateur. Seuls les administrateurs, les Enquêteurs Principaux et le créateur de la fiche peuvent la modifier.';
                    }
                    showError(message);
                    return;
                  }
                  navigate(`/fiches-criminelles/modifier/${id}`);
                }}
                className="w-full px-5 py-3.5 rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg"
                style={{background: '#1764E8', color: '#FFFFFF'}}
                title="Modifier cette fiche"
              >
                <Edit2 size={20} />
                <span>Modifier la fiche</span>
              </button>
              
              {/* Bouton Supprimer/Désarchiver */}
              {fiche.is_archived ? (
                <button
                  onClick={async () => {
                    if (!peutDesarchiver) {
                      // Message d'erreur amélioré et contextuel
                      let message = 'Vous n\'avez pas la permission de désarchiver cette fiche criminelle.';
                      if (!hasPermission(PERMISSIONS.FICHES_DELETE)) {
                        message += ' Votre rôle actuel ne vous permet pas de désarchiver des fiches criminelles. Contactez un administrateur si vous avez besoin de cette permission.';
                      } else if (fiche?.created_by && utilisateur?.id !== fiche.created_by && !isAdmin) {
                        message += ' Cette fiche a été créée par un autre utilisateur. Seuls les administrateurs peuvent la désarchiver.';
                      }
                      showError(message);
                      return;
                    }
                    const confirmed = await notification.showConfirm({
                      title: 'Confirmation de désarchivage',
                      message: `Êtes-vous sûr de vouloir désarchiver la fiche criminelle de "${fiche.nom} ${fiche.prenom}" (N° ${fiche.numeroDossier}) ?\n\nLa fiche sera restaurée dans la liste des fiches actives.`
                    });
                    if (confirmed) {
                      try {
                        await unarchiveCriminalFile(id);
                        notification.showSuccess({
                          title: 'Désarchivage réussi',
                          message: `La fiche criminelle "${fiche.nom} ${fiche.prenom}" (N° ${fiche.numeroDossier}) a été désarchivée avec succès.`
                        });
                        // Recharger la page pour mettre à jour l'état
                        setTimeout(() => {
                          window.location.reload();
                        }, 1500);
                      } catch (error) {
                        // Ne pas logger les erreurs attendues
                        const isExpectedError = 
                          error.message?.includes('n\'est pas archivée') ||
                          error.message?.includes('not archived') ||
                          error.response?.data?.message?.includes('n\'est pas archivée') ||
                          error.response?.status === 404
                        
                        if (!isExpectedError) {
                          console.error('Erreur désarchivage:', error);
                        }
                        
                        // Afficher le message d'erreur détaillé depuis le backend
                        const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || 'Erreur lors du désarchivage de la fiche';
                        
                        // Utiliser notification.showError si disponible, sinon showError
                        if (notification?.showError) {
                          notification.showError({
                            title: 'Erreur de désarchivage',
                            message: errorMessage
                          });
                        } else {
                          showError(errorMessage);
                        }
                      }
                    }
                  }}
                  className="w-full px-5 py-3.5 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg"
                  title="Désarchiver cette fiche"
                >
                  <ArchiveRestore size={20} />
                  <span>Désarchiver</span>
                </button>
              ) : (
                <button
                  onClick={async () => {
                    if (!peutSupprimer) {
                      // Message d'erreur amélioré et contextuel
                      let message = 'Vous n\'avez pas la permission de supprimer cette fiche criminelle.';
                      if (fiche?.created_by && utilisateur?.id !== fiche.created_by) {
                        message += ' Cette fiche a été créée par un autre utilisateur. Seuls les administrateurs et le créateur de la fiche peuvent la supprimer.';
                      } else if (!hasPermission(PERMISSIONS.FICHES_DELETE)) {
                        message += ' Votre rôle actuel ne vous permet pas de supprimer des fiches criminelles. Contactez un administrateur si vous avez besoin de cette permission.';
                      }
                      showError(message);
                      return;
                    }
                  const confirmed = await notification.showConfirm(MESSAGES.CONFIRM_DELETE_FICHE);
                  if (confirmed) {
                    try {
                      await deleteCriminalFile(id);
                      notification.showSuccess(MESSAGES.SUCCESS_FICHE_DELETED);
                      navigate('/fiches-criminelles');
                    } catch (error) {
                      // Ne pas logger les erreurs attendues (fiche déjà archivée, etc.)
                      const isExpectedError = 
                        error.message?.includes('déjà archivée') ||
                        error.message?.includes('already archived') ||
                        error.response?.data?.message?.includes('déjà archivée') ||
                        error.response?.status === 404
                      
                      if (!isExpectedError) {
                        console.error('Erreur suppression:', error);
                      }
                      
                      // Afficher le message d'erreur détaillé depuis le backend
                      const errorMessage = error.message || error.response?.data?.message || error.response?.data?.error || 'Erreur lors de l\'archivage de la fiche';
                      
                      // Utiliser notification.showError si disponible, sinon showError
                      if (notification?.showError) {
                        notification.showError({
                          title: 'Erreur d\'archivage',
                          message: errorMessage
                        });
                      } else {
                        showError(errorMessage);
                      }
                    }
                  }
                }}
                  className="w-full px-5 py-3.5 text-white rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg"
                  style={{background: '#EF4444'}}
                  title="Supprimer cette fiche"
                >
                  <Trash2 size={20} />
                  <span>Supprimer la fiche</span>
                </button>
              )}
              
              {/* Bouton Télécharger PDF */}
              <button
                onClick={telechargerPDF}
                className="w-full px-5 py-3.5 text-white rounded-lg font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-lg"
                style={{background: '#C80909'}}
                title="Télécharger la fiche en PDF"
              >
                <Download size={20} />
                <span>Télécharger PDF</span>
              </button>
              
              {/* Bouton Signaler un problème */}
              <button
                className="w-full px-5 py-3.5 bg-gray-50 border-2 border-gray-300 rounded-lg font-bold text-gray-700 hover:border-red-400 hover:text-red-600 hover:bg-red-50 transition-all flex items-center justify-center gap-3"
                title="Signaler un problème avec cette fiche"
              >
                <AlertTriangle size={20} />
                <span>Signaler un problème</span>
              </button>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  )
}

export default VoirFicheCriminelle


