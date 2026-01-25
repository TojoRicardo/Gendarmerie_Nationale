import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import {
  User, Mail, Phone, MapPin, Calendar, Save, X, ArrowLeft, Users, Activity, Lock,
  ShieldCheck, UserCog,
} from 'lucide-react'
import { formatPhoneNumber } from '../utils/phoneUtils'
import { useNotification } from '../context/NotificationContext'
import { usePermissions } from '../hooks/usePermissions'
import { PERMISSIONS } from '../constants/permissions'
import { RoleBasedUI, PermissionButton } from '../components/RoleBasedUI'

// Utiliser le service authService
import { getUserById, updateUser as updateUserService } from '../services/authService'
import roleChangeService from '../services/roleChangeService'

const ModifierUtilisateur = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const notification = useNotification()
  const { hasPermission, isAdmin, canModify, displayRestrictions } = usePermissions()

  const [formData, setFormData] = useState({
    username: '',
    matricule: '',
    nom: '',
    prenom: '',
    email: '',
    telephone: '',
    dateNaissance: '',
    adresse: '',
    grade: '',
    role: '',
    statut: 'actif'  // Statut par défaut : actif
  })

  const [chargement, setChargement] = useState(true)
  const [originalRole, setOriginalRole] = useState('') // Pour détecter les changements de rôle

  // Charger les données de l'utilisateur sélectionné
  useEffect(() => {
    const fetchUtilisateur = async () => {
      try {
        // Utiliser le service authService
        const data = await getUserById(id)
        
        // Debug: Afficher les données récupérées
        console.log('Données utilisateur récupérées:', data)
        
        // Formater la date de naissance si elle existe (format YYYY-MM-DD pour input type="date")
        let formattedDate = ''
        if (data.dateNaissance) {
          // Si c'est déjà au format YYYY-MM-DD, l'utiliser tel quel
          if (typeof data.dateNaissance === 'string' && data.dateNaissance.match(/^\d{4}-\d{2}-\d{2}/)) {
            formattedDate = data.dateNaissance.split('T')[0] // Prendre seulement la partie date si datetime
          } else {
            // Essayer de parser d'autres formats
            try {
              const dateObj = new Date(data.dateNaissance)
              if (!isNaN(dateObj.getTime())) {
                formattedDate = dateObj.toISOString().split('T')[0]
              }
            } catch (e) {
              console.warn('Impossible de parser la date:', data.dateNaissance)
            }
          }
        }
        
        // Préremplir le formulaire avec les données de l'API
        setFormData({
          username: data.username || '',
          matricule: data.matricule || '',
          nom: data.nom || '',
          prenom: data.prenom || '',
          email: data.email || '',
          telephone: data.telephone || '',
          dateNaissance: formattedDate,
          adresse: data.adresse || '',
          grade: data.grade || '',
          role: data.role || '',
          statut: data.statut || 'actif'
        })
        
        // Sauvegarder le rôle original pour détecter les changements
        setOriginalRole(data.role || '')
        
        console.log('Formulaire pré-rempli avec succès')
      } catch (err) {
        console.error(err)
        notification.showError("Erreur lors du chargement de l'utilisateur.")
      } finally {
        setChargement(false)
      }
    }

    fetchUtilisateur()
  }, [id, notification])

  // Fonction pour formater le matricule (XX XXX)
  const formatMatricule = (value) => {
    // Enlever tous les caractères non numériques
    const cleaned = value.replace(/\D/g, '')
    
    // Limiter à 5 chiffres maximum
    const limited = cleaned.substring(0, 5)
    
    // Formater: XX XXX
    if (limited.length <= 2) {
      return limited
    } else {
      return limited.substring(0, 2) + ' ' + limited.substring(2)
    }
  }

  // Mise à jour des champs
  const handleChange = (e) => {
    const { name, value } = e.target
    
    let finalValue = value
    
    // Formater selon le type de champ
    if (name === 'telephone') {
      finalValue = formatPhoneNumber(value)
    } else if (name === 'matricule') {
      finalValue = formatMatricule(value)
    }
    
    setFormData(prev => ({ ...prev, [name]: finalValue }))
  }

  // Envoi des modifications vers l'API
  const handleSubmit = async (e) => {
    e.preventDefault()

    console.log('Données envoyées:', formData)

    try {
      // Nettoyer les données avant envoi (enlever les champs vides optionnels)
      const dataToSend = {
        username: formData.username,
        nom: formData.nom,
        prenom: formData.prenom,
        email: formData.email,
        role: formData.role,
        statut: formData.statut || 'actif',
      }

      // Ajouter les champs optionnels seulement s'ils sont remplis
      if (formData.matricule) dataToSend.matricule = formData.matricule.replace(/\s/g, '') // Enlever les espaces
      if (formData.telephone) dataToSend.telephone = formData.telephone.replace(/\s/g, '') // Enlever les espaces
      if (formData.dateNaissance) dataToSend.dateNaissance = formData.dateNaissance
      if (formData.adresse) dataToSend.adresse = formData.adresse
      if (formData.grade) dataToSend.grade = formData.grade

      console.log('Données nettoyées envoyées:', dataToSend)

      // Utiliser le service authService
      await updateUserService(id, dataToSend)

      // Vérifier si le rôle a changé
      const roleHasChanged = originalRole !== formData.role
      
      if (roleHasChanged) {
        console.log('🔄 Changement de rôle détecté:', {
          ancien: originalRole,
          nouveau: formData.role,
          utilisateur: id
        })

        // Notifier l'utilisateur du changement de rôle
        try {
          await roleChangeService.notifyUserRoleChange(id, {
            oldRole: originalRole,
            newRole: formData.role,
            timestamp: new Date().toISOString(),
            modifiedBy: 'admin' // Vous pouvez remplacer par l'ID de l'admin connecté
          })
          
          console.log('✅ Notification de changement de rôle envoyée')
          notification.showSuccess('Utilisateur modifié avec succès ! Il sera notifié du changement.')
        } catch (notifyError) {
          console.warn('⚠️ Erreur lors de la notification (non-bloquant):', notifyError)
          // Ne pas bloquer le processus si la notification échoue
          notification.showSuccess('Utilisateur modifié avec succès !')
        }
      } else {
        notification.showSuccess('Utilisateur modifié avec succès !')
      }

      setTimeout(() => navigate('/utilisateurs'), 1500)
    } catch (err) {
      console.error('Erreur complète:', err)
      console.error('Réponse du serveur:', err.response?.data)

      if (err.response?.data) {
        const data = err.response.data

        // Gérer les erreurs de validation
        if (typeof data === 'object') {
          // Afficher toutes les erreurs
          let errorMessages = []
          
          Object.keys(data).forEach(field => {
            const messages = Array.isArray(data[field]) 
              ? data[field].join(' ') 
              : data[field]

            // Messages personnalisés selon le champ
            let messagePerso = ''
            switch (field) {
              case 'username':
                messagePerso = `Nom d'utilisateur: ${messages}`
                break
              case 'email':
                messagePerso = `Email: ${messages}`
                break
              case 'telephone':
                messagePerso = `Téléphone: ${messages}`
                break
              case 'matricule':
                messagePerso = `Matricule: ${messages}`
                break
              case 'role':
                messagePerso = `Rôle: ${messages}`
                break
              case 'password':
                messagePerso = `Mot de passe: ${messages}`
                break
              default:
                messagePerso = `${field}: ${messages}`
            }

            errorMessages.push(messagePerso)
            console.error(`Erreur ${field}:`, messages)
          })

          // Afficher toutes les erreurs
          errorMessages.forEach(msg => notification.showError(msg))
          return
        }
        
        // Erreur texte simple
        if (typeof data === 'string') {
          notification.showError(data)
          return
        }
      }
      
      notification.showError("Impossible de modifier l'utilisateur. Vérifiez les données.")
    }
  }

  if (chargement) return <p className="text-center text-gray-600">Chargement...</p>

  // Vérifier si l'utilisateur peut modifier cet utilisateur
  const canEdit = hasPermission(PERMISSIONS.USERS_EDIT) || isAdmin

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Alerte si mode lecture seule */}
      {!canEdit && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center space-x-3">
            <Lock className="text-yellow-600" size={20} />
            <p className="text-yellow-800 font-medium">
              Mode consultation : Vous n'avez pas les permissions pour modifier cet utilisateur
            </p>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={() => navigate(`/utilisateurs/voir/${id}`)}
            className="p-3 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all"
          >
            <ArrowLeft size={20} className="text-gray-700" />
          </button>
          <div className="p-3 bg-gradient-to-br from-orange-500 to-orange-700 rounded-xl shadow-lg">
            <Users className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Modifier l'Utilisateur</h1>
            <p className="text-gray-600 text-sm">{formData.matricule}</p>
          </div>
        </div>
        <button
          onClick={() => navigate(`/utilisateurs/voir/${id}`)}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl font-semibold hover:bg-gray-200 transition-all flex items-center space-x-2"
        >
          <X size={20} />
          <span>Annuler</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Informations personnelles */}
        <div className="card-pro p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <User className="mr-2 text-blue-600" size={24} />
              Informations Personnelles
            </h2>
            <p className="text-gray-600 text-sm mt-1 ml-9">Identité et coordonnées de l'agent</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Username */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom d'utilisateur *
              </label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="nom.utilisateur"
                className="input-pro w-full"
                required
              />
            </div>
            
            {/* Matricule */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Matricule *
              </label>
              <input
                type="text"
                name="matricule"
                value={formData.matricule}
                onChange={handleChange}
                placeholder="12 345"
                className="input-pro w-full"
                maxLength={6}
                required
              />
              <p className="text-xs text-gray-500 mt-1">Format: XX XXX (5 chiffres)</p>
            </div>
            
            {/* Nom */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Nom *
              </label>
              <input
                type="text"
                name="nom"
                value={formData.nom}
                onChange={handleChange}
                placeholder="Nom de famille"
                className="input-pro w-full"
                required
              />
            </div>
            
            {/* Prénom */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Prénom *
              </label>
              <input
                type="text"
                name="prenom"
                value={formData.prenom}
                onChange={handleChange}
                placeholder="Prénom"
                className="input-pro w-full"
                required
              />
            </div>
            
            {/* Date de naissance */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Calendar className="inline mr-1" size={16} />
                Date de naissance
              </label>
              <input
                type="date"
                name="dateNaissance"
                value={formData.dateNaissance}
                onChange={handleChange}
                className="input-pro w-full"
              />
            </div>
            
            {/* Téléphone */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Phone className="inline mr-1" size={16} />
                Téléphone
              </label>
              <input
                type="tel"
                name="telephone"
                value={formData.telephone}
                onChange={handleChange}
                placeholder="+261 __ ___ __"
                className="input-pro w-full"
              />
            </div>
            
            {/* Adresse */}
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <MapPin className="inline mr-1" size={16} />
                Adresse complète
              </label>
              <input
                type="text"
                name="adresse"
                value={formData.adresse}
                onChange={handleChange}
                placeholder="Adresse complète"
                className="input-pro w-full"
              />
            </div>
            
            {/* Grade */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <ShieldCheck className="inline mr-1" size={16} />
                Grade
              </label>
              <select
                name="grade"
                value={formData.grade}
                onChange={handleChange}
                className="input-pro w-full"
              >
                <option value="">Sélectionner un grade</option>
                <option value="GCA">GCA</option>
                <option value="GD">GD</option>
                <option value="GB">GB</option>
                <option value="Col">Col</option>
                <option value="LtCol">LtCol</option>
                <option value="CEN">CEN</option>
                <option value="CNE">CNE</option>
                <option value="Ltn">Ltn</option>
                <option value="SLTN">SLTN</option>
                <option value="Gpce">Gpce</option>
                <option value="Ghpc">Ghpc</option>
                <option value="Gp1c">Gp1c</option>
                <option value="Gp2c">Gp2c</option>
                <option value="GHC">GHC</option>
                <option value="G1C">G1C</option>
                <option value="G2C">G2C</option>
                <option value="Gst">Gst</option>
              </select>
            </div>
          </div>
        </div>

        {/* Informations de compte */}
        <div className="card-pro p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <ShieldCheck className="mr-2 text-purple-600" size={24} />
              Informations de Compte
            </h2>
            <p className="text-gray-600 text-sm mt-1 ml-9">Paramètres d'accès et rôle système</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                <Mail className="inline mr-1" size={16} />
                Adresse email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="utilisateur@gendarmerie.mg"
                className="input-pro w-full"
                required
              />
            </div>
            
            {/* Rôle - Visible uniquement avec la permission ROLES_MANAGE */}
            {hasPermission(PERMISSIONS.ROLES_MANAGE) ? (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <UserCog className="inline mr-1" size={16} />
                  Rôle système *
                </label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleChange}
                  className="input-pro w-full"
                  required
                  disabled={!canEdit}
                >
                  <option value="">Sélectionner un rôle</option>
                  <option value="Administrateur Système">Administrateur Système</option>
                  <option value="Observateur">Observateur</option>
                  <option value="Enquêteur Principal">Enquêteur Principal</option>
                  <option value="Analyste">Analyste</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <UserCog className="inline mr-1" size={16} />
                  Rôle système
                </label>
                <div className="input-pro w-full bg-gray-50 text-gray-700 cursor-not-allowed flex items-center">
                  <UserCog className="mr-2 text-gray-400" size={16} />
                  {formData.role || 'Non défini'}
                </div>
                <p className="text-xs text-gray-500 mt-1">Seul un administrateur peut modifier le rôle</p>
              </div>
            )}
            
            {/* Statut */}
            <RoleBasedUI permission={PERMISSIONS.USERS_EDIT}>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Activity className="inline mr-1" size={16} />
                  Statut du compte *
                </label>
                <select
                  name="statut"
                  value={formData.statut}
                  onChange={handleChange}
                  className="input-pro w-full"
                  required
                  disabled={!canEdit}
                >
                  <option value="actif">Actif</option>
                  <option value="inactif">Inactif</option>
                </select>
              </div>
            </RoleBasedUI>

            {!hasPermission(PERMISSIONS.USERS_EDIT) && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  <Activity className="inline mr-1" size={16} />
                  Statut du compte
                </label>
                <div className={`input-pro w-full bg-gray-50 cursor-not-allowed flex items-center ${
                  formData.statut === 'actif' ? 'text-green-700' : 'text-red-700'
                }`}>
                  <Activity className="mr-2" size={16} />
                  {formData.statut === 'actif' ? 'Actif' : 'Inactif'}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate(`/utilisateurs/voir/${id}`)}
            className="px-6 py-3 bg-white border-2 border-gray-200 rounded-xl font-semibold text-gray-700 hover:border-gray-300 transition-all flex items-center space-x-2"
          >
            <X size={20} />
            <span>{canEdit ? 'Annuler' : 'Retour'}</span>
          </button>
          
          {canEdit && (
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white rounded-xl font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all hover:scale-105 flex items-center space-x-2 shadow-lg"
            >
              <Save size={20} />
              <span>Enregistrer les modifications</span>
            </button>
          )}
        </div>
      </form>
    </div>
  )
}

export default ModifierUtilisateur

