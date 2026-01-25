import React, { useEffect, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  User, Mail, Phone, MapPin, Calendar, ArrowLeft, Edit,
  Clock, Activity, Users, ShieldCheck, UserX, Trash2, UserCheck,
} from 'lucide-react'
import { useNotification } from '../context/NotificationContext'
import {
  getUserById as getUserByIdService,
  suspendUser,
  deleteUser,
  restoreUser,
} from '../services/authService'
import { useAuth } from '../context/AuthContext'

const VoirUtilisateur = () => {
  const navigate = useNavigate()
  const notification = useNotification()
  const { id } = useParams()
  const { utilisateur: currentUser } = useAuth()
  const [utilisateur, setUtilisateur] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionLoading, setActionLoading] = useState({
    suspend: false,
    delete: false,
    restore: false,
  })

  const isAdminUser = useMemo(() => {
    if (!currentUser) return false
    if (currentUser.is_superuser || currentUser.is_staff) return true
    const role = (currentUser.role_code || currentUser.role || '').toLowerCase()
    return role === 'admin' || role.includes('administrateur')
  }, [currentUser])

  useEffect(() => {
    const fetchUtilisateur = async () => {
      try {
        setLoading(true)
        const userData = await getUserByIdService(id)
        setUtilisateur(userData)
      } catch (err) {
        console.error(err)
        setError('Impossible de récupérer les informations de l’utilisateur')
      } finally {
        setLoading(false)
      }
    }

    fetchUtilisateur()
  }, [id])

  const getStatutBadge = (statut) => {
    const badges = {
      'actif': { bg: 'bg-green-100', text: 'text-green-800', label: 'Actif' },
      'inactif': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Inactif' },
      'suspendu': { bg: 'bg-red-100', text: 'text-red-800', label: 'Suspendu' },
    }
    return badges[statut] || badges['actif']
  }

  const getRoleBadge = (role) => {
    const badges = {
      'Administrateur': { bg: 'bg-blue-100', text: 'text-blue-800' },
      'Enquêteur': { bg: 'bg-emerald-100', text: 'text-emerald-800' },
      'Analyste': { bg: 'bg-purple-100', text: 'text-purple-800' },
      'Observateur': { bg: 'bg-orange-100', text: 'text-orange-800' },
    }
    return badges[role] || badges['Observateur']
  }

  const extractErrorMessage = (errorObj, fallback) => {
    // Vérifier d'abord le message direct (pour les erreurs formatées par authService)
    if (errorObj?.message) return errorObj.message
    
    // Vérifier les données de la réponse HTTP
    if (errorObj?.response?.data) {
      const data = errorObj.response.data
      
      // Si c'est une chaîne, la retourner directement
      if (typeof data === 'string') return data
      
      // Vérifier les différents champs possibles dans l'ordre de priorité
      if (data?.error) return data.error
      if (data?.message) return data.message
      if (data?.detail) return data.detail
      
      // Si c'est un objet avec des erreurs de validation
      if (typeof data === 'object' && Object.keys(data).length > 0) {
        const firstKey = Object.keys(data)[0]
        const firstValue = data[firstKey]
        if (Array.isArray(firstValue) && firstValue.length > 0) {
          return firstValue[0]
        }
        if (typeof firstValue === 'string') {
          return firstValue
        }
      }
    }
    
    // Vérifier aussi dans errors (pour les erreurs formatées par authService)
    if (errorObj?.errors) {
      const errors = errorObj.errors
      if (errors?.error) return errors.error
      if (errors?.message) return errors.message
      if (typeof errors === 'string') return errors
    }
    
    // Erreur réseau
    if (!errorObj?.response && !errorObj?.status) {
      return 'Impossible de se connecter au serveur. Vérifiez votre connexion.'
    }
    
    // Message par défaut
    return fallback
  }

  const handleSuspendUser = async () => {
    if (!utilisateur) return
    const confirmed = await notification.showConfirm({
      title: 'Suspendre l’utilisateur',
      message: `Voulez-vous vraiment suspendre "${utilisateur.nom} ${utilisateur.prenom}" ?\n\nSon compte sera désactivé mais les données resteront disponibles pour une restauration ultérieure.`,
      confirmText: 'Suspendre',
    })
    if (!confirmed) return

    setActionLoading((prev) => ({ ...prev, suspend: true }))
    try {
      const result = await suspendUser(utilisateur.id)
      notification.showSuccess(result.message || 'Utilisateur suspendu avec succès.')
      setUtilisateur((prev) => prev ? { ...prev, statut: 'suspendu' } : prev)
    } catch (err) {
      notification.showError(extractErrorMessage(err, "Impossible de suspendre l'utilisateur."))
    } finally {
      setActionLoading((prev) => ({ ...prev, suspend: false }))
    }
  }

  const handleDeleteUser = async () => {
    if (!utilisateur) return
    
    // Vérifier que seul un administrateur peut supprimer
    if (!isAdminUser) {
      notification.showError({
        title: 'Permission refusée',
        message: 'Seuls les administrateurs peuvent supprimer des utilisateurs.'
      })
      return
    }
    
    const confirmed = await notification.showConfirm({
      title: "Supprimer l'utilisateur",
      message: `Cette action supprimera définitivement "${utilisateur.nom} ${utilisateur.prenom}".\n\nCette opération est irréversible. Confirmez-vous la suppression ?`,
      confirmText: 'Supprimer',
      type: 'danger',
    })
    if (!confirmed) return

    setActionLoading((prev) => ({ ...prev, delete: true }))
    try {
      const result = await deleteUser(utilisateur.id)
      notification.showSuccess({
        title: 'Suppression réussie',
        message: result.message || 'Utilisateur supprimé avec succès.'
      })
      navigate('/utilisateurs')
    } catch (err) {
      // extractErrorMessage gère déjà les erreurs formatées par authService (err.message, err.status)
      // et les erreurs HTTP directes (err.response.data)
      const errorMessage = extractErrorMessage(err, "Impossible de supprimer l'utilisateur.")
      
      notification.showError({
        title: 'Erreur de suppression',
        message: errorMessage
      })
    } finally {
      setActionLoading((prev) => ({ ...prev, delete: false }))
    }
  }

  const handleRestoreUser = async () => {
    if (!utilisateur) return
    const confirmed = await notification.showConfirm({
      title: 'Réactiver l’utilisateur',
      message: `Voulez-vous réactiver "${utilisateur.nom} ${utilisateur.prenom}" ?\n\nLe compte sera de nouveau actif et l’accès au système sera rétabli.`,
      confirmText: 'Réactiver',
    })
    if (!confirmed) return

    setActionLoading((prev) => ({ ...prev, restore: true }))
    try {
      const result = await restoreUser(utilisateur.id)
      notification.showSuccess(result.message || 'Utilisateur réactivé avec succès.')
      setUtilisateur((prev) => prev ? { ...prev, statut: 'actif' } : prev)
    } catch (err) {
      notification.showError(extractErrorMessage(err, "Impossible de réactiver l'utilisateur."))
    } finally {
      setActionLoading((prev) => ({ ...prev, restore: false }))
    }
  }

  if (loading) return <p>Chargement...</p>
  if (error) return <p className="text-red-600">{error}</p>
  if (!utilisateur) return null

  const statutActuel = (utilisateur.statut || 'actif').toLowerCase()
  const statut = getStatutBadge(statutActuel)
  const role = getRoleBadge(utilisateur.role)

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* En-tête */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => navigate('/utilisateurs')}
          className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </button>
        <div className="p-3 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl shadow-lg">
          <Users className="text-white" size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{utilisateur.nom} {utilisateur.prenom}</h1>
          <p className="text-gray-600 text-sm">{utilisateur.matricule}</p>
        </div>
      </div>

      {/* Badges de statut */}
      <div className="card-pro p-6">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center space-x-2">
            <span className="text-sm font-medium text-gray-600">Statut:</span>
            <span className={`px-4 py-2 rounded-xl text-sm font-bold ${statut.bg} ${statut.text}`}>
              {statut.label}
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <ShieldCheck size={20} className={role.text} />
            <span className="text-sm font-medium text-gray-600">Rôle:</span>
            <span className={`px-4 py-2 rounded-xl text-sm font-bold ${role.bg} ${role.text}`}>
              {utilisateur.role}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Colonne principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Informations personnelles */}
          <div className="card-pro p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <User className="mr-2 text-blue-600" size={24} />
              Informations personnelles
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Nom complet</p>
                <p className="font-bold text-gray-900">{utilisateur.nom} {utilisateur.prenom}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Date de naissance</p>
                <p className="font-bold text-gray-900">
                  {new Date(utilisateur.dateNaissance).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Téléphone</p>
                <p className="font-bold text-gray-900">{utilisateur.telephone}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Adresse</p>
                <p className="font-bold text-gray-900">{utilisateur.adresse}</p>
              </div>
            </div>
          </div>

          {/* Informations de compte */}
          <div className="card-pro p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Mail className="mr-2 text-purple-600" size={24} />
              Informations de compte
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Email</p>
                <p className="font-bold text-gray-900">{utilisateur.email}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Matricule</p>
                <p className="font-bold text-gray-900">{utilisateur.matricule}</p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Date de création</p>
                <p className="font-bold text-gray-900">
                  {new Date(utilisateur.dateCreation).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="p-4 bg-gray-50 rounded-xl">
                <p className="text-sm text-gray-500 mb-1">Dernière connexion</p>
                <p className="font-bold text-gray-900">
                  {utilisateur.derniereConnexion
                    ? `${new Date(utilisateur.derniereConnexion).toLocaleDateString('fr-FR')} à ${new Date(utilisateur.derniereConnexion).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Non connecté'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne latérale */}
        <div className="space-y-6">
          {/* Informations du profil */}
          <div className="card-pro p-6">
            <h3 className="font-bold text-gray-900 mb-4 flex items-center">
              <Activity className="mr-2 text-gray-600" size={20} />
              Activité
            </h3>
            <div className="space-y-4">
              <div className="pb-3 border-b border-gray-200">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Calendar size={16} className="mr-2" />
                  Compte créé
                </div>
                <p className="font-bold text-gray-900">
                  {new Date(utilisateur.dateCreation).toLocaleDateString('fr-FR')}
                </p>
              </div>
              <div className="pb-3 border-b border-gray-200">
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <Clock size={16} className="mr-2" />
                  Dernière connexion
                </div>
                <p className="font-bold text-gray-900">
                  {utilisateur.derniereConnexion
                    ? `${new Date(utilisateur.derniereConnexion).toLocaleDateString('fr-FR')} à ${new Date(utilisateur.derniereConnexion).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`
                    : 'Non connecté'}
                </p>
              </div>
              <div>
                <div className="flex items-center text-sm text-gray-500 mb-1">
                  <ShieldCheck size={16} className="mr-2" />
                  Niveau d'accès
                </div>
                <p className="font-bold text-gray-900">{utilisateur.role}</p>
              </div>
            </div>
          </div>

          {/* Actions rapides */}
          <div className="card-pro p-6">
            <h3 className="font-bold text-gray-900 mb-4">Actions rapides</h3>
            <div className="space-y-3">
              <button
                onClick={() => navigate(`/utilisateurs/modifier/${id}`)}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-blue-800 transition-all flex items-center justify-center space-x-2"
              >
                <Edit size={18} />
                <span>Modifier l'utilisateur</span>
              </button>
              {isAdminUser && (
                <>
                  {statutActuel !== 'suspendu' && (
                    <button
                      onClick={handleSuspendUser}
                      disabled={actionLoading.suspend}
                      className={`w-full px-4 py-3 bg-white border-2 rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                        actionLoading.suspend
                          ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-amber-200 text-amber-700 hover:border-amber-300 hover:bg-amber-50'
                      }`}
                    >
                      <UserX size={18} />
                      <span>{actionLoading.suspend ? 'Suspension...' : 'Suspendre l’utilisateur'}</span>
                    </button>
                  )}
                  {['suspendu', 'inactif'].includes(statutActuel) && (
                    <button
                      onClick={handleRestoreUser}
                      disabled={actionLoading.restore}
                      className={`w-full px-4 py-3 bg-gradient-to-r from-emerald-500 to-emerald-600 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                        actionLoading.restore ? 'opacity-75 cursor-not-allowed' : 'hover:from-emerald-600 hover:to-emerald-700'
                      }`}
                    >
                      <UserCheck size={18} />
                      <span>{actionLoading.restore ? 'Réactivation...' : 'Réactiver l’utilisateur'}</span>
                    </button>
                  )}
                  <button
                    onClick={handleDeleteUser}
                    disabled={actionLoading.delete}
                    className={`w-full px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold flex items-center justify-center space-x-2 transition-all ${
                      actionLoading.delete ? 'opacity-75 cursor-not-allowed' : 'hover:from-red-600 hover:to-red-700'
                    }`}
                  >
                    <Trash2 size={18} />
                    <span>{actionLoading.delete ? 'Suppression...' : 'Supprimer l’utilisateur'}</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VoirUtilisateur

